import { describe, expect, it } from 'vitest';

import type { Quote, QuoteRow } from '@/lib/types';

import {
  inspectQuoteTenderManagedSurface,
  resolveQuoteTenderManagedSectionState,
} from './quote-managed-surface-inspector';
import {
  buildTenderEditorManagedBlockMarkerKey,
  TENDER_EDITOR_MANAGED_BLOCK_META,
} from './tender-editor-managed-surface';
import {
  buildTenderEditorManagedSectionRowKey,
  getTenderEditorManagedTextBlockMarkers,
} from './tender-editor-managed-markers';

const DRAFT_PACKAGE_ID = '66666666-6666-4666-8666-666666666666';

function createQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    projectId: 'project-1',
    title: 'Tarjous',
    quoteNumber: 'T-1',
    revisionNumber: 1,
    status: 'draft',
    vatPercent: 25.5,
    notes: '',
    internalNotes: '',
    discountType: 'none',
    discountValue: 0,
    projectCosts: 0,
    deliveryCosts: 0,
    installationCosts: 0,
    travelKilometers: 0,
    travelRatePerKm: 0,
    disposalCosts: 0,
    demolitionCosts: 0,
    protectionCosts: 0,
    permitCosts: 0,
    selectedMarginPercent: 35,
    pricingMode: 'margin',
    ownerUserId: 'user-1',
    createdAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-06T08:00:00.000Z',
    ...overrides,
  };
}

function createRow(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: overrides.id ?? 'row-1',
    quoteId: 'quote-1',
    sortOrder: 0,
    mode: 'section',
    productName: 'Väliotsikko',
    quantity: 0,
    unit: 'erä',
    purchasePrice: 0,
    salesPrice: 0,
    installationPrice: 0,
    marginPercent: 0,
    regionMultiplier: 1,
    ownerUserId: 'user-1',
    createdAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-06T08:00:00.000Z',
    ...overrides,
  };
}

function buildManagedTextBlock(markerKey: string, content: string) {
  const markers = getTenderEditorManagedTextBlockMarkers(markerKey);
  return `${markers.start}\n${content}\n${markers.end}`;
}

describe('quote-managed-surface-inspector', () => {
  it('detects a clean managed quote surface from notes and section rows', () => {
    const markerKey = buildTenderEditorManagedBlockMarkerKey(DRAFT_PACKAGE_ID, 'requirements_and_quote_notes');
    const diagnostics = inspectQuoteTenderManagedSurface({
      quote: createQuote({
        notes: buildManagedTextBlock(markerKey, '### Tarjoushuomiot\nSisalto'),
      }),
      rows: [
        createRow({
          id: 'section-1',
          productName: TENDER_EDITOR_MANAGED_BLOCK_META.requirements_and_quote_notes.title,
          notes: buildTenderEditorManagedSectionRowKey(DRAFT_PACKAGE_ID, 'requirements_and_quote_notes'),
        }),
      ],
    });

    expect(diagnostics.has_tarjousaly_managed_surface).toBe(true);
    expect(diagnostics.health_status).toBe('clean');
    expect(diagnostics.managed_blocks_total).toBe(1);
    expect(diagnostics.managed_sections_total).toBe(1);
    expect(diagnostics.managed_notes_blocks_total).toBe(1);
    expect(diagnostics.unknown_marker_blocks_total).toBe(0);
    expect(diagnostics.duplicate_marker_blocks_total).toBe(0);
    expect(diagnostics.probable_drift_blocks_total).toBe(0);
    expect(diagnostics.primary_draft_package_id).toBe(DRAFT_PACKAGE_ID);
    expect(diagnostics.detected_fields).toEqual(expect.arrayContaining(['notes', 'sections']));

    const sectionState = resolveQuoteTenderManagedSectionState(
      createRow({
        id: 'section-1',
        productName: TENDER_EDITOR_MANAGED_BLOCK_META.requirements_and_quote_notes.title,
        notes: buildTenderEditorManagedSectionRowKey(DRAFT_PACKAGE_ID, 'requirements_and_quote_notes'),
      }),
      diagnostics,
    );

    expect(sectionState).toMatchObject({
      marker_key: markerKey,
      health_status: 'clean',
      label: 'Tarjousäly',
    });
  });

  it('marks duplicate, unknown, and drifting managed blocks for attention', () => {
    const driftKey = buildTenderEditorManagedBlockMarkerKey(DRAFT_PACKAGE_ID, 'requirements_and_quote_notes');
    const duplicateKey = buildTenderEditorManagedBlockMarkerKey(DRAFT_PACKAGE_ID, 'notes_for_editor');
    const unknownKey = buildTenderEditorManagedBlockMarkerKey(DRAFT_PACKAGE_ID, 'custom_block');

    const diagnostics = inspectQuoteTenderManagedSurface({
      quote: createQuote({
        notes: buildManagedTextBlock(unknownKey, 'Tuntematon lohko'),
        internalNotes: [
          buildManagedTextBlock(driftKey, 'Tarjoushuomiot vaarassa'),
          buildManagedTextBlock(duplicateKey, 'Sisainen huomio'),
        ].join('\n\n'),
      }),
      rows: [
        createRow({
          id: 'section-drift',
          productName: TENDER_EDITOR_MANAGED_BLOCK_META.requirements_and_quote_notes.title,
          notes: buildTenderEditorManagedSectionRowKey(DRAFT_PACKAGE_ID, 'requirements_and_quote_notes'),
        }),
        createRow({
          id: 'section-duplicate-a',
          productName: TENDER_EDITOR_MANAGED_BLOCK_META.notes_for_editor.title,
          notes: buildTenderEditorManagedSectionRowKey(DRAFT_PACKAGE_ID, 'notes_for_editor'),
        }),
        createRow({
          id: 'section-duplicate-b',
          productName: TENDER_EDITOR_MANAGED_BLOCK_META.notes_for_editor.title,
          notes: buildTenderEditorManagedSectionRowKey(DRAFT_PACKAGE_ID, 'notes_for_editor'),
        }),
      ],
    });

    expect(diagnostics.health_status).toBe('inconsistent');
    expect(diagnostics.managed_blocks_total).toBe(2);
    expect(diagnostics.unknown_marker_blocks_total).toBe(1);
    expect(diagnostics.duplicate_marker_blocks_total).toBe(1);
    expect(diagnostics.probable_drift_blocks_total).toBe(1);

    const driftingBlock = diagnostics.blocks.find((block) => block.marker_key === driftKey);
    const duplicateBlock = diagnostics.blocks.find((block) => block.marker_key === duplicateKey);
    const unknownBlock = diagnostics.blocks.find((block) => block.marker_key === unknownKey);

    expect(driftingBlock).toMatchObject({
      health_status: 'needs_attention',
      probable_drift: true,
      expected_text_field: 'notes',
    });
    expect(duplicateBlock).toMatchObject({
      health_status: 'inconsistent',
      duplicate_marker: true,
      section_row_count: 2,
    });
    expect(unknownBlock).toMatchObject({
      health_status: 'inconsistent',
      unknown_marker: true,
    });
  });
});