import { describe, expect, it } from 'vitest';

import { buildTenderImportResumeSupport } from './tender-import-resume';
import type {
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderEditorReconciliationPreview,
  TenderImportRegistryRepairPreview,
} from '../types/tender-editor-import';

function createPreview(payloadHash = 'cafebabe'): TenderEditorImportPreview {
  return {
    draft_item_count: 2,
    importable_item_count: 2,
    payload_hash: payloadHash,
    payload: {
      schema_version: 'tender-editor-import/v2',
      generated_at: '2026-04-05T13:05:00.000Z',
      source_draft_package_id: '66666666-6666-4666-8666-666666666666',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        draft_package_title: 'Tarjouspaketti / draft package',
        draft_package_status: 'draft',
        import_status: 'imported',
        reimport_status: 'stale',
        target_quote_title: 'Tarjouspaketti / editor import',
        target_quote_id: '61616161-6161-4616-8616-616161616161',
        target_customer_id: '12121212-1212-4212-8212-121212121212',
        target_project_id: '13131313-1313-4313-8313-131313131313',
        imported_quote_id: '61616161-6161-4616-8616-616161616161',
        will_create_placeholder_target: false,
      },
      managed_surface: {
        contract_version: 'tender-editor-managed-surface/v1',
        ownership_notice: 'Tarjousaly paivittaa vain nama hallitut lohkot.',
        blocks: [
          {
            block_id: 'requirements_and_quote_notes',
            marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
            import_group: 'requirements_and_quote_notes',
            target_kind: 'quote_notes_section',
            target_label: 'Tarjouksen notes-kentta',
            title: 'Tarjoushuomiot',
            content_md: '## Tarjoushuomiot',
            item_count: 1,
            owned_by_adapter: true,
          },
          {
            block_id: 'notes_for_editor',
            marker_key: '66666666-6666-4666-8666-666666666666:notes_for_editor',
            import_group: 'notes_for_editor',
            target_kind: 'quote_internal_notes_section',
            target_label: 'Tarjouksen internalNotes-kentta',
            title: 'Sisaiset editorihuomiot',
            content_md: '## Sisaiset editorihuomiot',
            item_count: 1,
            owned_by_adapter: true,
          },
        ],
      },
      sections: {
        quote_notes_md: '## Tarjoushuomiot',
        quote_internal_notes_md: '## Sisaiset editorihuomiot',
      },
      items: [
        {
          draft_package_item_id: '77777777-7777-4777-8777-777777777777',
          source_entity_type: 'requirement',
          source_entity_id: '44444444-4444-4444-8444-444444444444',
          item_type: 'accepted_requirement',
          import_group: 'requirements_and_quote_notes',
          target_kind: 'quote_notes_section',
          target_label: 'Tarjouksen notes-kentta',
          title: 'Mukana oleva vaatimus',
          content_md: 'Tama on hyvaksytty.',
        },
        {
          draft_package_item_id: '88888888-8888-4888-8888-888888888888',
          source_entity_type: 'review_task',
          source_entity_id: '55555555-5555-4555-8555-555555555555',
          item_type: 'review_note',
          import_group: 'notes_for_editor',
          target_kind: 'quote_internal_notes_section',
          target_label: 'Tarjouksen internalNotes-kentta',
          title: 'Avoin editor-note',
          content_md: 'Pida tama mukana editorissa.',
        },
      ],
    },
    validation: {
      is_valid: true,
      can_import: true,
      warning_count: 0,
      error_count: 0,
      issues: [],
    },
    sections: [],
  };
}

function createImportState(): TenderDraftPackageImportState {
  return {
    draft_package_id: '66666666-6666-4666-8666-666666666666',
    import_status: 'imported',
    reimport_status: 'stale',
    import_revision: 2,
    current_payload_hash: 'cafebabe',
    last_import_payload_hash: '1234abcd',
    imported_quote_id: '61616161-6161-4616-8616-616161616161',
    imported_at: '2026-04-05T13:07:00.000Z',
    target_quote_id: '61616161-6161-4616-8616-616161616161',
    target_quote_title: 'Tarjouspaketti / editor import',
    target_project_id: '13131313-1313-4313-8313-131313131313',
    target_customer_id: '12121212-1212-4212-8212-121212121212',
    can_import: true,
    can_reimport: true,
    owned_block_count: 2,
    owned_block_last_synced_at: '2026-04-05T13:07:00.000Z',
    last_drift_checked_at: '2026-04-05T13:09:00.000Z',
    ownership_registry_status: 'conflicted',
    selective_reimport_available: true,
    safe_reimport_now: false,
    manual_quote_edit_detected: true,
    conflict_block_count: 1,
    missing_in_quote_block_count: 0,
    registry_warning_count: 1,
    suggested_import_mode: 'update_existing_quote',
    latest_run: null,
  };
}

function createReimportPreview(overrides: Partial<TenderEditorReconciliationPreview> = {}): TenderEditorReconciliationPreview {
  return {
    draft_package_id: '66666666-6666-4666-8666-666666666666',
    target_quote_id: '61616161-6161-4616-8616-616161616161',
    target_quote_title: 'Tarjouspaketti / editor import',
    import_mode: 'update_existing_quote',
    reimport_status: 'stale',
    current_payload_hash: 'cafebabe',
    previous_payload_hash: '1234abcd',
    added_count: 1,
    changed_count: 1,
    removed_count: 0,
    unchanged_count: 0,
    added_blocks: 1,
    changed_blocks: 1,
    removed_blocks: 0,
    unchanged_blocks: 0,
    can_reimport: true,
    registry_status: 'conflicted',
    registry_active_block_count: 2,
    registry_last_synced_at: '2026-04-05T13:07:00.000Z',
    last_drift_checked_at: '2026-04-05T13:09:00.000Z',
    selective_reimport_available: true,
    safe_reimport_now: false,
    manual_quote_edit_detected: true,
    safe_update_block_count: 1,
    conflict_block_count: 1,
    missing_in_quote_block_count: 0,
    registry_stale_block_count: 0,
    skipped_block_count: 1,
    default_update_block_ids: ['notes_for_editor'],
    default_remove_block_ids: [],
    default_override_conflict_block_ids: [],
    warnings: [],
    blocks: [
      {
        block_id: 'requirements_and_quote_notes',
        marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
        import_group: 'requirements_and_quote_notes',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kentta',
        title: 'Tarjoushuomiot',
        change_type: 'changed',
        current_content_md: '## Tarjoushuomiot',
        previous_content_md: '## Vanha tarjoushuomio',
        quote_content_md: '## Asiakas muokkasi tata',
        quote_section_title: 'Tarjoushuomiot',
        quote_content_hash: 'quote-hash-1',
        current_item_count: 1,
        previous_item_count: 1,
        registry_entry_id: '11111111-1111-4111-8111-111111111111',
        registry_revision: 2,
        registry_last_synced_at: '2026-04-05T13:07:00.000Z',
        last_applied_content_hash: 'applied-hash-1',
        last_seen_quote_content_hash: 'quote-hash-1',
        drift_status: 'changed_in_both',
        is_conflict: true,
        can_override_conflict: true,
        ownership_source: 'registry',
        text_marker_present: true,
        section_row_present: true,
        can_select_for_update: true,
        can_select_for_removal: false,
        selected_for_update: false,
        selected_for_removal: false,
        selected_conflict_override: false,
        warnings: [],
        owned_by_adapter: true,
      },
      {
        block_id: 'notes_for_editor',
        marker_key: '66666666-6666-4666-8666-666666666666:notes_for_editor',
        import_group: 'notes_for_editor',
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kentta',
        title: 'Sisaiset editorihuomiot',
        change_type: 'added',
        current_content_md: '## Sisaiset editorihuomiot',
        previous_content_md: null,
        quote_content_md: null,
        quote_section_title: null,
        quote_content_hash: null,
        current_item_count: 1,
        previous_item_count: null,
        registry_entry_id: null,
        registry_revision: null,
        registry_last_synced_at: null,
        last_applied_content_hash: null,
        last_seen_quote_content_hash: null,
        drift_status: 'changed_in_draft',
        is_conflict: false,
        can_override_conflict: false,
        ownership_source: 'current_payload',
        text_marker_present: false,
        section_row_present: false,
        can_select_for_update: true,
        can_select_for_removal: false,
        selected_for_update: true,
        selected_for_removal: false,
        selected_conflict_override: false,
        warnings: [],
        owned_by_adapter: true,
      },
    ],
    entries: [],
    ...overrides,
  };
}

function createRun(overrides: Partial<TenderDraftPackageImportRun> = {}): TenderDraftPackageImportRun {
  return {
    id: '71717171-7171-4717-8717-717171717171',
    tender_draft_package_id: '66666666-6666-4666-8666-666666666666',
    target_quote_id: '61616161-6161-4616-8616-616161616161',
    run_type: 'reimport',
    import_mode: 'update_existing_quote',
    payload_hash: 'cafebabe',
    payload_snapshot: createPreview().payload,
    result_status: 'failed',
    summary: 'Re-import keskeytyi ennen kuin kaikki blokit ehdittiin kasitella.',
    execution_metadata: {
      run_type: 'reimport',
      selected_block_ids: ['requirements_and_quote_notes', 'notes_for_editor'],
      selected_update_block_ids: ['requirements_and_quote_notes', 'notes_for_editor'],
      selected_remove_block_ids: [],
      conflict_block_ids: ['requirements_and_quote_notes'],
      skipped_conflict_block_ids: ['requirements_and_quote_notes'],
      override_conflict_block_ids: [],
      updated_block_ids: [],
      removed_block_ids: [],
      missing_in_quote_block_ids: [],
      untouched_block_ids: [],
      affected_block_ids: [],
      orphaned_block_ids: [],
      refreshed_hash_block_ids: [],
      pruned_registry_block_ids: [],
      skipped_block_ids: ['requirements_and_quote_notes'],
      repair_action: null,
      diagnostics_summary: {
        healthy_blocks: 0,
        stale_blocks: 0,
        orphaned_registry_blocks: 0,
        missing_quote_blocks: 0,
        conflict_blocks: 1,
        drifted_quote_blocks: 0,
        drifted_draft_blocks: 0,
        total_registry_blocks: 2,
      },
      run_mode: 'protected_reimport',
      conflict_policy: 'protect_conflicts',
      summary_counts: {
        selected_blocks: 2,
        conflict_blocks: 1,
        skipped_conflicts: 1,
        updated_blocks: 0,
        removed_blocks: 0,
        missing_in_quote_blocks: 0,
        untouched_blocks: 0,
        affected_blocks: 0,
        orphaned_blocks: 0,
        refreshed_hash_blocks: 0,
        pruned_registry_blocks: 0,
        skipped_blocks: 1,
        healthy_blocks: 0,
        stale_blocks: 0,
        orphaned_registry_blocks: 0,
        drifted_quote_blocks: 0,
        drifted_draft_blocks: 0,
        total_registry_blocks: 2,
      },
    },
    created_by_user_id: '22222222-2222-4222-8222-222222222222',
    created_at: '2026-04-05T13:09:00.000Z',
    ...overrides,
  };
}

function createRepairPreview(): TenderImportRegistryRepairPreview {
  return {
    draft_package_id: '66666666-6666-4666-8666-666666666666',
    target_quote_id: '61616161-6161-4616-8616-616161616161',
    target_quote_title: 'Tarjouspaketti / editor import',
    generated_at: '2026-04-05T13:10:00.000Z',
    summary: {
      healthy_blocks: 0,
      stale_blocks: 1,
      orphaned_registry_blocks: 0,
      missing_quote_blocks: 0,
      conflict_blocks: 1,
      drifted_quote_blocks: 0,
      drifted_draft_blocks: 1,
      total_registry_blocks: 2,
    },
    actions: [
      {
        action: 'resync_registry_hashes_from_live_quote_markers',
        description: 'Resynkkaa hashit markereista.',
        eligible_block_ids: ['notes_for_editor'],
        skipped_block_ids: ['requirements_and_quote_notes'],
      },
    ],
    blocks: [],
    warnings: [],
  };
}

describe('tender-import-resume', () => {
  it('builds a narrowed resumable selection for a failed re-import', () => {
    const support = buildTenderImportResumeSupport({
      importRuns: [createRun()],
      preview: createPreview(),
      importState: createImportState(),
      reimportPreview: createReimportPreview(),
    });

    expect(support.status).toBe('resume_available');
    expect(support.can_resume).toBe(true);
    expect(support.action_kind).toBe('reimport');
    expect(support.selection).toEqual({
      update_block_ids: ['notes_for_editor'],
      remove_block_ids: [],
      override_conflict_block_ids: [],
      conflict_policy: 'protect_conflicts',
    });
    expect(support.pending_block_ids).toEqual(['notes_for_editor']);
    expect(support.blocked_block_ids).toEqual(['requirements_and_quote_notes']);
  });

  it('marks a failed re-import as stale when the payload hash has changed', () => {
    const support = buildTenderImportResumeSupport({
      importRuns: [createRun()],
      preview: createPreview('deadbeef'),
      importState: createImportState(),
      reimportPreview: createReimportPreview({ current_payload_hash: 'deadbeef' }),
    });

    expect(support.status).toBe('stale_context');
    expect(support.can_resume).toBe(false);
    expect(support.action_kind).toBeNull();
  });

  it('marks a failed re-import as already applied when no selected blocks need retrying', () => {
    const support = buildTenderImportResumeSupport({
      importRuns: [createRun({
        execution_metadata: {
          ...createRun().execution_metadata,
          selected_block_ids: ['notes_for_editor'],
          selected_update_block_ids: ['notes_for_editor'],
          conflict_block_ids: [],
          skipped_conflict_block_ids: [],
          skipped_block_ids: [],
        },
      })],
      preview: createPreview(),
      importState: createImportState(),
      reimportPreview: createReimportPreview({
        blocks: [
          {
            ...createReimportPreview().blocks[1],
            change_type: 'unchanged',
            drift_status: 'up_to_date',
            can_select_for_update: false,
          },
        ],
      }),
    });

    expect(support.status).toBe('already_applied');
    expect(support.can_resume).toBe(false);
    expect(support.settled_block_ids).toEqual(['notes_for_editor']);
  });

  it('allows resuming a failed create-new-quote run once the created quote has been recovered into import state', () => {
    const support = buildTenderImportResumeSupport({
      importRuns: [createRun({
        run_type: 'import',
        import_mode: 'create_new_quote',
        summary: 'Uuden quoten luonti epaonnistui myohassa vaiheessa.',
        execution_metadata: {
          ...createRun().execution_metadata,
          run_type: 'import',
          run_mode: 'create_new_quote',
          conflict_block_ids: [],
          skipped_conflict_block_ids: [],
          skipped_block_ids: [],
        },
      })],
      preview: createPreview(),
      importState: createImportState(),
      reimportPreview: createReimportPreview({
        blocks: [
          {
            ...createReimportPreview().blocks[0],
            change_type: 'unchanged',
            drift_status: 'up_to_date',
            is_conflict: false,
            can_select_for_update: false,
          },
          createReimportPreview().blocks[1],
        ],
      }),
    });

    expect(support.status).toBe('resume_available');
    expect(support.can_resume).toBe(true);
    expect(support.action_kind).toBe('reimport');
    expect(support.action_label).toBe('Jatka aiemmin luotuun quoteen');
    expect(support.selection).toEqual({
      update_block_ids: ['notes_for_editor'],
      remove_block_ids: [],
      override_conflict_block_ids: [],
      conflict_policy: 'protect_conflicts',
    });
    expect(support.pending_block_ids).toEqual(['notes_for_editor']);
    expect(support.settled_block_ids).toEqual(['requirements_and_quote_notes']);
  });

  it('treats a failed registry repair as safely resumable', () => {
    const support = buildTenderImportResumeSupport({
      importRuns: [createRun({
        run_type: 'registry_repair',
        summary: 'Registry repair keskeytyi ennen kuin kaikki hashit ehdittiin synkata.',
        execution_metadata: {
          ...createRun().execution_metadata,
          run_type: 'registry_repair',
          repair_action: 'resync_registry_hashes_from_live_quote_markers',
          refreshed_hash_block_ids: ['requirements_and_quote_notes'],
          skipped_block_ids: ['notes_for_editor'],
          summary_counts: {
            ...createRun().execution_metadata.summary_counts,
            refreshed_hash_blocks: 1,
          },
        },
      })],
      importState: createImportState(),
      repairPreview: createRepairPreview(),
    });

    expect(support.status).toBe('resume_available');
    expect(support.can_resume).toBe(true);
    expect(support.action_kind).toBe('registry_repair');
    expect(support.repair_action).toBe('resync_registry_hashes_from_live_quote_markers');
    expect(support.pending_block_ids).toEqual(['notes_for_editor']);
    expect(support.settled_block_ids).toEqual(['requirements_and_quote_notes']);
  });
});