import { describe, expect, it } from 'vitest';

import { buildTenderDraftPackageImportFailureRecovery } from './tender-import-failure-recovery';
import type { TenderEditorImportResult } from '../types/tender-editor-import';
import type { TenderDraftPackage } from '../types/tender-intelligence';

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
    generatedFromAnalysisJobId: null,
    generatedByUserId: '22222222-2222-4222-8222-222222222222',
    importedQuoteId: null,
    importedAt: null,
    importedByUserId: null,
    summary: 'Luonnospaketti.',
    exportPayload: {
      schema_version: 'tender-draft-package/v1',
      generated_at: '2026-04-06T10:00:00.000Z',
      generated_by_user_id: '22222222-2222-4222-8222-222222222222',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        title: 'Tarjouspaketti / draft package',
        summary: 'Luonnospaketti.',
        draft_package_status: 'draft',
      },
      accepted_requirements: [],
      selected_references: [],
      resolved_missing_items: [],
      notes_for_editor: [],
    },
    items: [],
    createdAt: '2026-04-06T10:00:00.000Z',
    updatedAt: '2026-04-06T10:00:00.000Z',
    ...overrides,
  };
}

function createAdapterResult(overrides: Partial<TenderEditorImportResult> = {}): TenderEditorImportResult {
  return {
    draft_package_id: '66666666-6666-4666-8666-666666666666',
    imported_quote_id: '61616161-6161-4616-8616-616161616161',
    imported_project_id: '13131313-1313-4313-8313-131313131313',
    imported_customer_id: '12121212-1212-4212-8212-121212121212',
    created_placeholder_target: false,
    import_mode: 'create_new_quote',
    result_status: 'created',
    payload_hash: 'cafebabe',
    import_revision: 1,
    summary: 'Luotiin uusi tarjousluonnos.',
    execution_metadata: {
      run_type: 'import',
      selected_block_ids: ['requirements_and_quote_notes'],
      selected_update_block_ids: ['requirements_and_quote_notes'],
      selected_remove_block_ids: [],
      conflict_block_ids: [],
      skipped_conflict_block_ids: [],
      override_conflict_block_ids: [],
      updated_block_ids: ['requirements_and_quote_notes'],
      removed_block_ids: [],
      missing_in_quote_block_ids: [],
      untouched_block_ids: [],
      affected_block_ids: ['requirements_and_quote_notes'],
      orphaned_block_ids: [],
      refreshed_hash_block_ids: [],
      pruned_registry_block_ids: [],
      skipped_block_ids: [],
      repair_action: null,
      diagnostics_summary: {
        healthy_blocks: 0,
        stale_blocks: 0,
        orphaned_registry_blocks: 0,
        missing_quote_blocks: 0,
        conflict_blocks: 0,
        drifted_quote_blocks: 0,
        drifted_draft_blocks: 0,
        total_registry_blocks: 1,
      },
      run_mode: 'create_new_quote',
      conflict_policy: 'protect_conflicts',
      summary_counts: {
        selected_blocks: 1,
        conflict_blocks: 0,
        skipped_conflicts: 0,
        updated_blocks: 1,
        removed_blocks: 0,
        missing_in_quote_blocks: 0,
        untouched_blocks: 0,
        affected_blocks: 1,
        orphaned_blocks: 0,
        refreshed_hash_blocks: 0,
        pruned_registry_blocks: 0,
        skipped_blocks: 0,
        healthy_blocks: 0,
        stale_blocks: 0,
        orphaned_registry_blocks: 0,
        drifted_quote_blocks: 0,
        drifted_draft_blocks: 0,
        total_registry_blocks: 1,
      },
    },
    ...overrides,
  };
}

describe('tender-import-failure-recovery', () => {
  it('preserves a newly created quote link when a later repository step fails', () => {
    const recovery = buildTenderDraftPackageImportFailureRecovery({
      draftPackage: createDraftPackage(),
      actorUserId: '22222222-2222-4222-8222-222222222222',
      adapterResult: createAdapterResult(),
      fallbackImportedAt: '2026-04-06T10:05:00.000Z',
    });

    expect(recovery.importStatePatch).toEqual({
      import_status: 'imported',
      reimport_status: 'import_failed',
      imported_quote_id: '61616161-6161-4616-8616-616161616161',
      imported_by_user_id: '22222222-2222-4222-8222-222222222222',
      imported_at: '2026-04-06T10:05:00.000Z',
    });
    expect(recovery.recoveredTargetQuoteId).toBe('61616161-6161-4616-8616-616161616161');
    expect(recovery.recoveredExecutionMetadata).toEqual(createAdapterResult().execution_metadata);
  });

  it('keeps an existing imported quote linked when a retry fails before new adapter output exists', () => {
    const recovery = buildTenderDraftPackageImportFailureRecovery({
      draftPackage: createDraftPackage({
        importStatus: 'imported',
        reimportStatus: 'stale',
        importedQuoteId: '71717171-7171-4717-8717-717171717171',
        importedAt: '2026-04-06T09:55:00.000Z',
        importedByUserId: '99999999-9999-4999-8999-999999999999',
      }),
      actorUserId: '22222222-2222-4222-8222-222222222222',
    });

    expect(recovery.importStatePatch).toEqual({
      import_status: 'imported',
      reimport_status: 'import_failed',
      imported_quote_id: '71717171-7171-4717-8717-717171717171',
      imported_by_user_id: '99999999-9999-4999-8999-999999999999',
      imported_at: '2026-04-06T09:55:00.000Z',
    });
    expect(recovery.recoveredTargetQuoteId).toBe('71717171-7171-4717-8717-717171717171');
    expect(recovery.recoveredExecutionMetadata).toBeNull();
  });

  it('marks the draft package as failed when no quote target can be recovered', () => {
    const recovery = buildTenderDraftPackageImportFailureRecovery({
      draftPackage: createDraftPackage(),
      actorUserId: '22222222-2222-4222-8222-222222222222',
    });

    expect(recovery.importStatePatch).toEqual({
      import_status: 'failed',
      reimport_status: 'import_failed',
    });
    expect(recovery.recoveredTargetQuoteId).toBeNull();
    expect(recovery.recoveredExecutionMetadata).toBeNull();
  });
});