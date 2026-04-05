import { describe, expect, it } from 'vitest';

import { buildTenderEditorImportPreview } from './tender-editor-import';
import {
  buildTenderDraftPackageImportState,
  buildTenderEditorImportPayloadHash,
  buildTenderEditorReconciliationPreview,
  resolveTenderDraftPackageReimportStatus,
} from './tender-editor-reconciliation';
import type { TenderDraftPackage } from '../types/tender-intelligence';
import type { TenderDraftPackageImportRun } from '../types/tender-editor-import';

function createDraftPackage(overrides: Partial<TenderDraftPackage> = {}): TenderDraftPackage {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    organizationId: '22222222-2222-4222-8222-222222222222',
    tenderPackageId: '11111111-1111-4111-8111-111111111111',
    title: 'Tarjouspaketti / draft package',
    status: 'draft',
    importStatus: 'not_imported',
    reimportStatus: 'never_imported',
    importRevision: 0,
    lastImportPayloadHash: null,
    generatedFromAnalysisJobId: '33333333-3333-4333-8333-333333333333',
    generatedByUserId: '22222222-2222-4222-8222-222222222222',
    importedQuoteId: null,
    importedAt: null,
    importedByUserId: null,
    summary: 'Luonnospaketti sisältää 2 riviä.',
    exportPayload: {
      schema_version: 'tender-draft-package/v1',
      generated_at: '2026-04-05T14:00:00.000Z',
      generated_by_user_id: '22222222-2222-4222-8222-222222222222',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: '33333333-3333-4333-8333-333333333333',
      metadata: {
        title: 'Tarjouspaketti / draft package',
        summary: 'Luonnospaketti sisältää 2 riviä.',
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
      {
        id: '88888888-8888-4888-8888-888888888888',
        draftPackageId: '66666666-6666-4666-8666-666666666666',
        itemType: 'review_note',
        sourceEntityType: 'review_task',
        sourceEntityId: '55555555-5555-4555-8555-555555555555',
        title: 'Pidä rajaus näkyvillä',
        contentMd: 'Tämä siirtyy internal notesiin.',
        sortOrder: 1,
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

function createPreview(draftPackage: TenderDraftPackage) {
  return buildTenderEditorImportPreview({
    draftPackage,
    packageName: 'Tarjouspaketti',
    targetQuoteId: draftPackage.importedQuoteId ?? null,
    targetQuoteTitle: draftPackage.importedQuoteId ? 'Aiemmin importoitu tarjous' : undefined,
    targetCustomerId: null,
    targetProjectId: null,
    willCreatePlaceholderTarget: !draftPackage.importedQuoteId,
    generatedAt: '2026-04-05T14:05:00.000Z',
  });
}

function createSuccessfulRun(overrides: Partial<TenderDraftPackageImportRun> = {}): TenderDraftPackageImportRun {
  return {
    id: '91919191-9191-4919-8919-919191919191',
    tender_draft_package_id: '66666666-6666-4666-8666-666666666666',
    target_quote_id: '99999999-9999-4999-8999-999999999999',
    import_mode: 'update_existing_quote',
    payload_hash: '1234abcd',
    payload_snapshot: {
      schema_version: 'tender-editor-import/v1',
      generated_at: '2026-04-05T14:01:00.000Z',
      source_draft_package_id: '66666666-6666-4666-8666-666666666666',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        draft_package_title: 'Tarjouspaketti / draft package',
        draft_package_status: 'draft',
        import_status: 'imported',
        reimport_status: 'up_to_date',
        target_quote_title: 'Aiemmin importoitu tarjous',
        target_quote_id: '99999999-9999-4999-8999-999999999999',
        target_customer_id: null,
        target_project_id: null,
        imported_quote_id: '99999999-9999-4999-8999-999999999999',
        will_create_placeholder_target: false,
      },
      sections: {
        quote_notes_md: '## Vaatimukset / tarjoushuomiot\n\n### Vanha vaatimus\n\nVanha sisältö.',
        quote_internal_notes_md: '## Notes for editor\n\n### Vanha note\n\nVanha note sisältö.',
      },
      items: [
        {
          draft_package_item_id: 'old-item',
          source_entity_type: 'requirement',
          source_entity_id: 'old-requirement',
          item_type: 'accepted_requirement',
          import_group: 'requirements_and_quote_notes',
          target_kind: 'quote_notes_section',
          target_label: 'Tarjouksen notes-kenttä',
          title: 'Vanha vaatimus',
          content_md: 'Vanha sisältö.',
        },
        {
          draft_package_item_id: '88888888-8888-4888-8888-888888888888',
          source_entity_type: 'review_task',
          source_entity_id: '55555555-5555-4555-8555-555555555555',
          item_type: 'review_note',
          import_group: 'notes_for_editor',
          target_kind: 'quote_internal_notes_section',
          target_label: 'Tarjouksen internalNotes-kenttä',
          title: 'Pidä rajaus näkyvillä',
          content_md: 'Vanha note sisältö.',
        },
      ],
    },
    result_status: 'success',
    summary: 'Aiempi import onnistui.',
    created_by_user_id: '22222222-2222-4222-8222-222222222222',
    created_at: '2026-04-05T14:01:00.000Z',
    ...overrides,
  };
}

describe('tender-editor-reconciliation', () => {
  it('builds a deterministic payload hash from the managed import surface', () => {
    const preview = createPreview(createDraftPackage());
    const sameHash = buildTenderEditorImportPayloadHash(preview.payload);
    const changedPreview = createPreview(createDraftPackage({
      items: [
        {
          ...createDraftPackage().items[0],
          contentMd: 'Muuttunut tarjoushuomio.',
        },
        createDraftPackage().items[1],
      ],
    }));

    expect(sameHash).toBe(preview.payload_hash);
    expect(buildTenderEditorImportPayloadHash(changedPreview.payload)).not.toBe(preview.payload_hash);
  });

  it('marks an imported draft package as stale and reimportable when the payload hash has changed', () => {
    const draftPackage = createDraftPackage({
      importStatus: 'imported',
      reimportStatus: 'up_to_date',
      importRevision: 1,
      lastImportPayloadHash: '1234abcd',
      importedQuoteId: '99999999-9999-4999-8999-999999999999',
      importedAt: '2026-04-05T14:01:00.000Z',
      importedByUserId: '22222222-2222-4222-8222-222222222222',
    });
    const preview = createPreview(draftPackage);
    const latestSuccessfulRun = createSuccessfulRun();
    const importState = buildTenderDraftPackageImportState({
      draftPackage,
      preview,
      latestRun: latestSuccessfulRun,
      latestSuccessfulRun,
      targetQuoteId: '99999999-9999-4999-8999-999999999999',
      targetQuoteTitle: 'Aiemmin importoitu tarjous',
      targetProjectId: '13131313-1313-4313-8313-131313131313',
      targetCustomerId: '12121212-1212-4212-8212-121212121212',
    });

    expect(resolveTenderDraftPackageReimportStatus({
      draftPackage,
      currentPayloadHash: preview.payload_hash,
      latestSuccessfulRun,
    })).toBe('stale');
    expect(importState.reimport_status).toBe('stale');
    expect(importState.can_reimport).toBe(true);
    expect(importState.suggested_import_mode).toBe('update_existing_quote');
  });

  it('builds reconciliation counts for added, changed, removed, and unchanged items', () => {
    const draftPackage = createDraftPackage({
      importStatus: 'imported',
      reimportStatus: 'stale',
      importRevision: 1,
      lastImportPayloadHash: '1234abcd',
      importedQuoteId: '99999999-9999-4999-8999-999999999999',
    });
    const preview = createPreview(draftPackage);
    const reconciliation = buildTenderEditorReconciliationPreview({
      draftPackage,
      preview,
      latestSuccessfulRun: createSuccessfulRun(),
      targetQuoteId: '99999999-9999-4999-8999-999999999999',
      targetQuoteTitle: 'Aiemmin importoitu tarjous',
      importMode: 'update_existing_quote',
    });

    expect(reconciliation.added_count).toBe(1);
    expect(reconciliation.changed_count).toBe(1);
    expect(reconciliation.removed_count).toBe(1);
    expect(reconciliation.unchanged_count).toBe(0);
    expect(reconciliation.can_reimport).toBe(true);
    expect(reconciliation.warnings).toEqual([]);
  });
});
