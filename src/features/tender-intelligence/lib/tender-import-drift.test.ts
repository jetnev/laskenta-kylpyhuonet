import { describe, expect, it } from 'vitest';

import { mapTenderImportOwnedBlockRowToDomain } from './tender-intelligence-mappers';
import { buildTenderImportOwnedBlockDriftStates } from './tender-import-drift';
import { buildTenderImportOwnedBlockAppliedContentHash } from './tender-import-ownership-registry';
import type { TenderEditorManagedBlock } from '../types/tender-editor-import';
import type { TenderImportOwnedBlockRow } from '../types/tender-intelligence-db';

const draftPackageId = '66666666-6666-4666-8666-666666666666';
const quoteId = '61616161-6161-4616-8616-616161616161';
const organizationId = '22222222-2222-4222-8222-222222222222';

function createCurrentBlock(): TenderEditorManagedBlock {
  return {
    block_id: 'requirements_and_quote_notes',
    marker_key: `${draftPackageId}:requirements_and_quote_notes`,
    import_group: 'requirements_and_quote_notes',
    target_kind: 'quote_notes_section',
    target_label: 'Tarjouksen notes-kenttä',
    title: 'Tarjoushuomiot',
    content_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nAjantasainen sisältö.',
    item_count: 1,
    owned_by_adapter: true,
  };
}

function createOwnedRow(overrides: Partial<TenderImportOwnedBlockRow> = {}): TenderImportOwnedBlockRow {
  const currentBlock = createCurrentBlock();
  const appliedContentHash = buildTenderImportOwnedBlockAppliedContentHash({
    targetField: currentBlock.target_kind,
    title: currentBlock.title,
    contentMd: currentBlock.content_md,
  });

  return {
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: organizationId,
    tender_draft_package_id: draftPackageId,
    target_quote_id: quoteId,
    import_run_id: '31313131-3131-4313-8313-313131313131',
    block_id: currentBlock.block_id,
    marker_key: currentBlock.marker_key,
    target_field: currentBlock.target_kind,
    target_section_key: `tender-editor-import:${draftPackageId}:${currentBlock.block_id}`,
    block_title: currentBlock.title,
    payload_hash: 'payload-hash-1',
    last_applied_content_hash: appliedContentHash,
    last_seen_quote_content_hash: appliedContentHash,
    drift_status: 'up_to_date',
    last_drift_checked_at: '2026-04-05T15:00:00.000Z',
    revision: 1,
    last_synced_at: '2026-04-05T15:00:00.000Z',
    is_active: true,
    created_at: '2026-04-05T15:00:00.000Z',
    updated_at: '2026-04-05T15:00:00.000Z',
    ...overrides,
  };
}

function createQuoteSnapshot(options?: { notes?: string | null; rows?: Array<{ id: string; productName: string; notes: string }>; }) {
  return {
    quote: {
      id: quoteId,
      projectId: '13131313-1313-4313-8313-131313131313',
      title: 'Aiemmin importoitu tarjous',
      quoteNumber: 'TAR-001',
      revisionNumber: 1,
      status: 'draft',
      vatPercent: 25.5,
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
      selectedMarginPercent: 30,
      pricingMode: 'margin',
      ownerUserId: organizationId,
      createdAt: '2026-04-05T15:00:00.000Z',
      updatedAt: '2026-04-05T15:00:00.000Z',
      createdByUserId: organizationId,
      updatedByUserId: organizationId,
      notes: options?.notes ?? [
        `<!-- tender-editor-import:block:${draftPackageId}:requirements_and_quote_notes:start -->`,
        '## Tarjoushuomiot',
        '',
        '### Mukana oleva vaatimus',
        '',
        'Ajantasainen sisältö.',
        `<!-- tender-editor-import:block:${draftPackageId}:requirements_and_quote_notes:end -->`,
      ].join('\n'),
      internalNotes: null,
    },
    rows: (options?.rows ?? [
      {
        id: '41414141-4141-4414-8414-414141414141',
        productName: 'Tarjoushuomiot',
        notes: `tender-editor-import:${draftPackageId}:requirements_and_quote_notes`,
      },
    ]).map((row, index) => ({
      id: row.id,
      quoteId,
      sortOrder: index,
      mode: 'section' as const,
      pricingModel: 'unit_price' as const,
      unitPricingMode: 'manual' as const,
      source: 'manual' as const,
      productName: row.productName,
      quantity: 0,
      unit: 'erä',
      purchasePrice: 0,
      salesPrice: 0,
      installationPrice: 0,
      marginPercent: 0,
      regionMultiplier: 1,
      notes: row.notes,
      manualSalesPrice: true,
      ownerUserId: organizationId,
      createdAt: '2026-04-05T15:00:00.000Z',
      updatedAt: '2026-04-05T15:00:00.000Z',
      createdByUserId: organizationId,
      updatedByUserId: organizationId,
    })),
  };
}

describe('tender-import-drift', () => {
  it('marks quote-side manual edits as conflicts before protected re-import', () => {
    const currentBlock = createCurrentBlock();
    const ownedBlock = mapTenderImportOwnedBlockRowToDomain(createOwnedRow());
    const quoteSnapshot = createQuoteSnapshot({
      notes: [
        `<!-- tender-editor-import:block:${draftPackageId}:requirements_and_quote_notes:start -->`,
        '## Tarjoushuomiot',
        '',
        '### Mukana oleva vaatimus',
        '',
        'Asiakas muokkasi tätä.',
        `<!-- tender-editor-import:block:${draftPackageId}:requirements_and_quote_notes:end -->`,
      ].join('\n'),
    });

    const [state] = buildTenderImportOwnedBlockDriftStates({
      draftPackageId,
      currentBlocks: [currentBlock],
      ownedBlocks: [ownedBlock],
      fallbackBlocks: [],
      fallbackMeta: {
        importRunId: '31313131-3131-4313-8313-313131313131',
        revision: 1,
        lastSyncedAt: '2026-04-05T15:00:00.000Z',
      },
      quote: quoteSnapshot.quote,
      rows: quoteSnapshot.rows,
    });

    expect(state.driftStatus).toBe('changed_in_quote');
    expect(state.isConflict).toBe(true);
    expect(state.manualQuoteEditDetected).toBe(true);
    expect(state.safeToUpdate).toBe(false);
  });

  it('treats orphaned registry rows as safe cleanup targets instead of live conflicts', () => {
    const ownedBlock = mapTenderImportOwnedBlockRowToDomain(createOwnedRow({
      block_id: 'selected_references',
      marker_key: `${draftPackageId}:selected_references`,
      target_section_key: `tender-editor-import:${draftPackageId}:selected_references`,
      block_title: 'Referenssiyhteenveto',
      last_applied_content_hash: buildTenderImportOwnedBlockAppliedContentHash({
        targetField: 'quote_notes_section',
        title: 'Referenssiyhteenveto',
        contentMd: 'Poistuva referenssi.',
      }),
      last_seen_quote_content_hash: buildTenderImportOwnedBlockAppliedContentHash({
        targetField: 'quote_notes_section',
        title: 'Referenssiyhteenveto',
        contentMd: 'Poistuva referenssi.',
      }),
    }));

    const [state] = buildTenderImportOwnedBlockDriftStates({
      draftPackageId,
      currentBlocks: [],
      ownedBlocks: [ownedBlock],
      fallbackBlocks: [],
      fallbackMeta: {
        importRunId: '31313131-3131-4313-8313-313131313131',
        revision: 1,
        lastSyncedAt: '2026-04-05T15:00:00.000Z',
      },
      quote: createQuoteSnapshot({ notes: null, rows: [] }).quote,
      rows: [],
    });

    expect(state.driftStatus).toBe('orphaned_registry');
    expect(state.isConflict).toBe(false);
    expect(state.safeToRemove).toBe(true);
    expect(state.manualQuoteEditDetected).toBe(false);
  });
});
