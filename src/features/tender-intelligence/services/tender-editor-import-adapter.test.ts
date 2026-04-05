import { describe, expect, it } from 'vitest';

import { buildTenderEditorImportPreview } from '../lib/tender-editor-import';
import { buildTenderEditorManagedSurfaceFromPayload } from '../lib/tender-editor-managed-surface';
import { syncTenderEditorManagedBlocks } from './tender-editor-import-adapter';
import type { TenderDraftPackage } from '../types/tender-intelligence';

function createDraftPackage(overrides: Partial<TenderDraftPackage> = {}): TenderDraftPackage {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    organizationId: '22222222-2222-4222-8222-222222222222',
    tenderPackageId: '11111111-1111-4111-8111-111111111111',
    title: 'Tarjouspaketti / draft package',
    status: 'draft',
    importStatus: 'imported',
    reimportStatus: 'stale',
    importRevision: 1,
    lastImportPayloadHash: '1234abcd',
    generatedFromAnalysisJobId: null,
    generatedByUserId: '22222222-2222-4222-8222-222222222222',
    importedQuoteId: '61616161-6161-4616-8616-616161616161',
    importedAt: '2026-04-05T13:07:00.000Z',
    importedByUserId: '22222222-2222-4222-8222-222222222222',
    summary: 'Luonnospaketti sisältää yhden vaatimuksen.',
    exportPayload: {
      schema_version: 'tender-draft-package/v1',
      generated_at: '2026-04-05T14:00:00.000Z',
      generated_by_user_id: '22222222-2222-4222-8222-222222222222',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        title: 'Tarjouspaketti / draft package',
        summary: 'Luonnospaketti sisältää yhden vaatimuksen.',
        draft_package_status: 'draft',
      },
      accepted_requirements: [],
      selected_references: [],
      resolved_missing_items: [],
      notes_for_editor: [],
    },
    items: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        draftPackageId: '66666666-6666-4666-8666-666666666666',
        itemType: 'accepted_requirement',
        sourceEntityType: 'requirement',
        sourceEntityId: '44444444-4444-4444-8444-444444444444',
        title: 'Mukana oleva vaatimus',
        contentMd: 'Tämä siirtyy tarjoushuomioihin.',
        sortOrder: 0,
        isIncluded: true,
        createdAt: '2026-04-05T14:00:00.000Z',
        updatedAt: '2026-04-05T14:00:00.000Z',
      },
    ],
    createdAt: '2026-04-05T14:00:00.000Z',
    updatedAt: '2026-04-05T14:00:00.000Z',
    ...overrides,
  };
}

describe('tender-editor-import-adapter', () => {
  it('updates only adapter-owned note blocks and preserves all other content', () => {
    const preview = buildTenderEditorImportPreview({
      draftPackage: createDraftPackage(),
      packageName: 'Tarjouspaketti',
      targetQuoteId: '61616161-6161-4616-8616-616161616161',
      targetQuoteTitle: 'Tarjouspaketti / editor import',
      targetCustomerId: '12121212-1212-4212-8212-121212121212',
      targetProjectId: '13131313-1313-4313-8313-131313131313',
      willCreatePlaceholderTarget: false,
      generatedAt: '2026-04-05T14:05:00.000Z',
    });
    const blocks = buildTenderEditorManagedSurfaceFromPayload(preview.payload).blocks;
    const existingNotes = [
      'Käyttäjän oma aloitus.',
      '<!-- tender-editor-import:quote_notes:start -->',
      'Vanha Phase 13 -kooste',
      '<!-- tender-editor-import:quote_notes:end -->',
      '<!-- tender-editor-import:block:66666666-6666-4666-8666-666666666666:selected_references:start -->',
      '## Referenssiyhteenveto\n\n### Vanhentunut referenssi\n\nPoistuva sisältö.',
      '<!-- tender-editor-import:block:66666666-6666-4666-8666-666666666666:selected_references:end -->',
      'Käyttäjän oma loppuhuomio.',
    ].join('\n\n');

    const nextNotes = syncTenderEditorManagedBlocks({
      existingValue: existingNotes,
      targetKind: 'quote_notes_section',
      currentBlocks: blocks,
      effectiveOwnedBlocks: [
        {
          persistedRow: null,
          blockId: 'requirements_and_quote_notes',
          markerKey: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
          targetField: 'quote_notes_section',
          targetSectionKey: 'tender-editor-import:66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
          blockTitle: 'Tarjoushuomiot',
          payloadHash: 'current-hash',
          revision: 1,
          lastSyncedAt: '2026-04-05T14:05:00.000Z',
          importRunId: '71717171-7171-4717-8717-717171717171',
          source: 'registry',
        },
        {
          persistedRow: null,
          blockId: 'selected_references',
          markerKey: '66666666-6666-4666-8666-666666666666:selected_references',
          targetField: 'quote_notes_section',
          targetSectionKey: 'tender-editor-import:66666666-6666-4666-8666-666666666666:selected_references',
          blockTitle: 'Referenssiyhteenveto',
          payloadHash: 'old-reference-hash',
          revision: 1,
          lastSyncedAt: '2026-04-05T14:05:00.000Z',
          importRunId: '71717171-7171-4717-8717-717171717171',
          source: 'registry',
        },
      ],
      selectedUpdateBlockIds: ['requirements_and_quote_notes'],
      selectedRemoveBlockIds: ['selected_references'],
    });

    expect(nextNotes).toContain('Käyttäjän oma aloitus.');
    expect(nextNotes).toContain('Käyttäjän oma loppuhuomio.');
    expect(nextNotes).toContain('<!-- tender-editor-import:block:66666666-6666-4666-8666-666666666666:requirements_and_quote_notes:start -->');
    expect(nextNotes).toContain('## Tarjoushuomiot');
    expect(nextNotes).not.toContain('<!-- tender-editor-import:quote_notes:start -->');
    expect(nextNotes).not.toContain('selected_references:start -->');
  });
});