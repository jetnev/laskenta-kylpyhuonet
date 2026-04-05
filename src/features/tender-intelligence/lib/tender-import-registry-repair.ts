import type {
  TenderDraftPackageImportDiagnostics,
  TenderEditorImportRunExecutionMetadata,
  TenderEditorManagedBlockId,
  TenderImportRegistryDiagnosticBlock,
  TenderImportRegistryHealthSummary,
  TenderImportRegistryRepairAction,
  TenderImportRegistryRepairPreview,
} from '../types/tender-editor-import';
import { tenderImportRegistryRepairPreviewSchema } from '../types/tender-editor-import';
import type { TenderImportOwnedBlockWriteRecord } from './tender-import-ownership-registry';

export interface TenderImportRegistryRepairPlan {
  action: TenderImportRegistryRepairAction;
  upsertRecords: TenderImportOwnedBlockWriteRecord[];
  pruneRegistryRowIds: string[];
  eligibleBlockIds: TenderEditorManagedBlockId[];
  skippedBlockIds: TenderEditorManagedBlockId[];
  resultStatus: 'updated' | 'no_changes';
  summary: string;
  executionMetadata: TenderEditorImportRunExecutionMetadata;
}

function buildSectionRowKey(markerKey: string) {
  return `tender-editor-import:${markerKey}`;
}

function buildDefaultSummaryCounts(summary: TenderImportRegistryHealthSummary) {
  return {
    selected_blocks: 0,
    conflict_blocks: summary.conflict_blocks,
    skipped_conflicts: 0,
    updated_blocks: 0,
    removed_blocks: 0,
    missing_in_quote_blocks: summary.missing_quote_blocks,
    untouched_blocks: 0,
    affected_blocks: 0,
    orphaned_blocks: 0,
    refreshed_hash_blocks: 0,
    pruned_registry_blocks: 0,
    skipped_blocks: 0,
    healthy_blocks: summary.healthy_blocks,
    stale_blocks: summary.stale_blocks,
    orphaned_registry_blocks: summary.orphaned_registry_blocks,
    drifted_quote_blocks: summary.drifted_quote_blocks,
    drifted_draft_blocks: summary.drifted_draft_blocks,
    total_registry_blocks: summary.total_registry_blocks,
  };
}

export function listTenderImportRegistryRepairActionsForBlock(block: TenderImportRegistryDiagnosticBlock) {
  const actions: TenderImportRegistryRepairAction[] = [];

  if (block.can_refresh_registry_metadata) {
    actions.push('refresh_registry_metadata');
  }

  if (block.can_mark_orphaned) {
    actions.push('mark_orphaned_registry_entries');
  }

  if (block.can_prune_inactive) {
    actions.push('prune_inactive_registry_entries');
  }

  if (block.can_resync_hashes_from_live_quote_markers) {
    actions.push('resync_registry_hashes_from_live_quote_markers');
  }

  return actions;
}

export function hasTenderImportRegistryRepairAction(
  block: TenderImportRegistryDiagnosticBlock,
  action: TenderImportRegistryRepairAction,
) {
  return listTenderImportRegistryRepairActionsForBlock(block).includes(action);
}

function buildRepairActionDescription(action: TenderImportRegistryRepairAction) {
  switch (action) {
    case 'refresh_registry_metadata':
      return 'Päivittää registryn drift- ja hash-metadatan vastaamaan nykyistä live-quote-havaintoa ilman sisältökirjoitusta.';
    case 'mark_orphaned_registry_entries':
      return 'Merkitsee turvallisesti irrallisiksi registry-rivit, joilla ei ole enää aktiivista latest payload -omistusta eikä live quote -ankkuria.';
    case 'prune_inactive_registry_entries':
      return 'Siivoaa jo inaktiiviset registry-rivit, jotka eivät enää osallistu active ownership -näkymään.';
    case 'resync_registry_hashes_from_live_quote_markers':
      return 'Päivittää registry-hashit nykyisestä live quote -markerista vain silloin, kun markerin sisältö vastaa latest payloadia eikä mitään sisältöä tarvitse kirjoittaa.';
    default:
      return action;
  }
}

export function buildTenderImportRegistryRepairPreview(options: {
  diagnostics: TenderDraftPackageImportDiagnostics;
  generatedAt?: string;
}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const blocks = options.diagnostics.blocks.map((block) => {
    const availableRepairActions = listTenderImportRegistryRepairActionsForBlock(block);
    let skipReason: string | null = null;

    if (availableRepairActions.length < 1) {
      if (block.requires_reimport) {
        skipReason = 'Vaatii re-importin tai eksplisiittisen käyttäjäpäätöksen. Phase 17 repair ei kirjoita quote-sisältöä.';
      } else if (!block.registry_entry_id && !block.latest_payload_present && (block.live_quote_marker_present || block.live_quote_section_row_present)) {
        skipReason = 'Quote sisältää managed markerin ilman registry-riviä tai latest payload -blokkia. Tämä vaihe ei adoptoi live quote -sisältöä registryyn.';
      } else {
        skipReason = 'Tälle blokille ei löytynyt turvallista metadata-only repair-toimintoa.';
      }
    }

    return {
      ...block,
      available_repair_actions: availableRepairActions,
      selected_repair_action: block.recommended_repair_action ?? null,
      skip_reason: skipReason,
    };
  });
  const actions = (['refresh_registry_metadata', 'mark_orphaned_registry_entries', 'prune_inactive_registry_entries', 'resync_registry_hashes_from_live_quote_markers'] as const).map((action) => ({
    action,
    description: buildRepairActionDescription(action),
    eligible_block_ids: blocks.filter((block) => hasTenderImportRegistryRepairAction(block, action)).map((block) => block.block_id),
    skipped_block_ids: blocks
      .filter((block) => !hasTenderImportRegistryRepairAction(block, action) && (block.repair_recommended_before_reimport || block.requires_reimport))
      .map((block) => block.block_id),
  }));
  const warnings = [...options.diagnostics.warnings];

  if (actions.every((action) => action.eligible_block_ids.length < 1)) {
    warnings.push('Registry repair preview ei löytänyt yhtään turvallista metadata-only repair-kohdetta.');
  }

  return tenderImportRegistryRepairPreviewSchema.parse({
    draft_package_id: options.diagnostics.draft_package_id,
    target_quote_id: options.diagnostics.target_quote_id ?? null,
    target_quote_title: options.diagnostics.target_quote_title ?? null,
    generated_at: generatedAt,
    summary: options.diagnostics.summary,
    actions,
    blocks,
    warnings,
  }) satisfies TenderImportRegistryRepairPreview;
}

function buildRegistryWriteRecord(block: TenderImportRegistryDiagnosticBlock, options: {
  organizationId: string;
  draftPackageId: string;
  targetQuoteId: string;
  syncedAt: string;
}) {
  return {
    organization_id: options.organizationId,
    tender_draft_package_id: options.draftPackageId,
    target_quote_id: options.targetQuoteId,
    import_run_id: null,
    block_id: block.block_id,
    marker_key: block.marker_key,
    target_field: block.target_kind,
    target_section_key: buildSectionRowKey(block.marker_key),
    block_title: block.title,
    payload_hash: block.registry_payload_hash ?? block.latest_payload_hash ?? '',
    last_applied_content_hash: block.registry_last_applied_content_hash ?? block.latest_payload_applied_content_hash ?? null,
    last_seen_quote_content_hash: block.live_quote_content_hash ?? block.registry_last_seen_quote_content_hash ?? null,
    drift_status: block.drift_status,
    last_drift_checked_at: options.syncedAt,
    revision: block.registry_revision ?? 1,
    last_synced_at: block.registry_last_synced_at ?? options.syncedAt,
    is_active: block.registry_is_active,
  } satisfies TenderImportOwnedBlockWriteRecord;
}

export function buildTenderImportRegistryDiagnosticsRefreshRecords(options: {
  organizationId: string;
  draftPackageId: string;
  targetQuoteId: string;
  diagnostics: TenderDraftPackageImportDiagnostics;
  syncedAt?: string;
}) {
  const syncedAt = options.syncedAt ?? new Date().toISOString();

  return options.diagnostics.blocks
    .filter((block) => block.registry_entry_id)
    .map((block) => buildRegistryWriteRecord(block, {
      organizationId: options.organizationId,
      draftPackageId: options.draftPackageId,
      targetQuoteId: options.targetQuoteId,
      syncedAt,
    }));
}

export function buildTenderImportRegistryDiagnosticsRefreshExecutionMetadata(options: {
  diagnostics: TenderDraftPackageImportDiagnostics;
  affectedBlockIds: TenderEditorManagedBlockId[];
  skippedBlockIds: TenderEditorManagedBlockId[];
}) {
  const summaryCounts = buildDefaultSummaryCounts(options.diagnostics.summary);

  return {
    run_type: 'diagnostics_refresh',
    selected_block_ids: [],
    selected_update_block_ids: [],
    selected_remove_block_ids: [],
    conflict_block_ids: options.diagnostics.blocks.filter((block) => block.is_conflict).map((block) => block.block_id),
    skipped_conflict_block_ids: [],
    override_conflict_block_ids: [],
    updated_block_ids: [],
    removed_block_ids: [],
    missing_in_quote_block_ids: options.diagnostics.blocks
      .filter((block) => block.diagnostic_status === 'missing_quote')
      .map((block) => block.block_id),
    untouched_block_ids: [],
    affected_block_ids: options.affectedBlockIds,
    orphaned_block_ids: options.diagnostics.blocks
      .filter((block) => block.diagnostic_status === 'orphaned')
      .map((block) => block.block_id),
    refreshed_hash_block_ids: [],
    pruned_registry_block_ids: [],
    skipped_block_ids: options.skippedBlockIds,
    repair_action: null,
    run_mode: 'protected_reimport',
    conflict_policy: 'protect_conflicts',
    diagnostics_summary: options.diagnostics.summary,
    summary_counts: {
      ...summaryCounts,
      affected_blocks: options.affectedBlockIds.length,
      skipped_blocks: options.skippedBlockIds.length,
    },
  } satisfies TenderEditorImportRunExecutionMetadata;
}

function buildRepairSummary(action: TenderImportRegistryRepairAction, affectedCount: number, skippedCount: number) {
  const verb = (() => {
    switch (action) {
      case 'refresh_registry_metadata':
        return 'Päivitettiin registry-metadata';
      case 'mark_orphaned_registry_entries':
        return 'Merkittiin orphaned-riveiksi';
      case 'prune_inactive_registry_entries':
        return 'Siivottiin inaktiiviset registry-rivit';
      case 'resync_registry_hashes_from_live_quote_markers':
        return 'Resynkattiin registry-hashit live quote -markereista';
      default:
        return action;
    }
  })();

  if (affectedCount < 1) {
    return `${verb}: ei turvallisia kohdeblokkeja.`;
  }

  if (skippedCount > 0) {
    return `${verb}: ${affectedCount} blokkia, ${skippedCount} blokkia skipattiin.`;
  }

  return `${verb}: ${affectedCount} blokkia.`;
}

export function buildTenderImportRegistryRepairPlan(options: {
  organizationId: string;
  draftPackageId: string;
  targetQuoteId: string;
  currentImportRevision: number;
  diagnostics: TenderDraftPackageImportDiagnostics;
  preview?: TenderImportRegistryRepairPreview | null;
  action: TenderImportRegistryRepairAction;
  syncedAt?: string;
}) {
  const syncedAt = options.syncedAt ?? new Date().toISOString();
  const preview = options.preview ?? buildTenderImportRegistryRepairPreview({
    diagnostics: options.diagnostics,
    generatedAt: syncedAt,
  });
  const actionSummary = preview.actions.find((item) => item.action === options.action);
  const eligibleBlocks = preview.blocks.filter((block) => hasTenderImportRegistryRepairAction(block, options.action));
  const upsertRecords: TenderImportOwnedBlockWriteRecord[] = [];
  const pruneRegistryRowIds: string[] = [];

  eligibleBlocks.forEach((block) => {
    if (options.action === 'prune_inactive_registry_entries') {
      if (block.registry_entry_id) {
        pruneRegistryRowIds.push(block.registry_entry_id);
      }
      return;
    }

    if (options.action === 'mark_orphaned_registry_entries') {
      upsertRecords.push({
        ...buildRegistryWriteRecord(block, {
          organizationId: options.organizationId,
          draftPackageId: options.draftPackageId,
          targetQuoteId: options.targetQuoteId,
          syncedAt,
        }),
        drift_status: 'orphaned_registry',
        is_active: false,
      });
      return;
    }

    if (options.action === 'refresh_registry_metadata') {
      upsertRecords.push(buildRegistryWriteRecord(block, {
        organizationId: options.organizationId,
        draftPackageId: options.draftPackageId,
        targetQuoteId: options.targetQuoteId,
        syncedAt,
      }));
      return;
    }

    if (options.action === 'resync_registry_hashes_from_live_quote_markers') {
      upsertRecords.push({
        organization_id: options.organizationId,
        tender_draft_package_id: options.draftPackageId,
        target_quote_id: options.targetQuoteId,
        import_run_id: null,
        block_id: block.block_id,
        marker_key: block.marker_key,
        target_field: block.target_kind,
        target_section_key: buildSectionRowKey(block.marker_key),
        block_title: block.title,
        payload_hash: block.latest_payload_hash ?? block.registry_payload_hash ?? '',
        last_applied_content_hash: block.latest_payload_applied_content_hash ?? block.live_quote_content_hash ?? null,
        last_seen_quote_content_hash: block.live_quote_content_hash ?? null,
        drift_status: 'up_to_date',
        last_drift_checked_at: syncedAt,
        revision: block.registry_revision ?? Math.max(options.currentImportRevision, 1),
        last_synced_at: block.registry_last_synced_at ?? syncedAt,
        is_active: true,
      });
    }
  });

  const eligibleBlockIds = eligibleBlocks.map((block) => block.block_id);
  const skippedBlockIds = actionSummary?.skipped_block_ids ?? [];
  const summaryCounts = buildDefaultSummaryCounts(options.diagnostics.summary);
  const executionMetadata = {
    run_type: 'registry_repair',
    selected_block_ids: [],
    selected_update_block_ids: [],
    selected_remove_block_ids: [],
    conflict_block_ids: options.diagnostics.blocks.filter((block) => block.is_conflict).map((block) => block.block_id),
    skipped_conflict_block_ids: [],
    override_conflict_block_ids: [],
    updated_block_ids: [],
    removed_block_ids: [],
    missing_in_quote_block_ids: options.diagnostics.blocks
      .filter((block) => block.diagnostic_status === 'missing_quote')
      .map((block) => block.block_id),
    untouched_block_ids: [],
    affected_block_ids: eligibleBlockIds,
    orphaned_block_ids: options.action === 'mark_orphaned_registry_entries' ? eligibleBlockIds : [],
    refreshed_hash_block_ids: options.action === 'resync_registry_hashes_from_live_quote_markers' ? eligibleBlockIds : [],
    pruned_registry_block_ids: options.action === 'prune_inactive_registry_entries' ? eligibleBlockIds : [],
    skipped_block_ids: skippedBlockIds,
    repair_action: options.action,
    run_mode: 'protected_reimport',
    conflict_policy: 'protect_conflicts',
    diagnostics_summary: options.diagnostics.summary,
    summary_counts: {
      ...summaryCounts,
      affected_blocks: eligibleBlockIds.length,
      orphaned_blocks: options.action === 'mark_orphaned_registry_entries' ? eligibleBlockIds.length : 0,
      refreshed_hash_blocks: options.action === 'resync_registry_hashes_from_live_quote_markers' ? eligibleBlockIds.length : 0,
      pruned_registry_blocks: options.action === 'prune_inactive_registry_entries' ? eligibleBlockIds.length : 0,
      skipped_blocks: skippedBlockIds.length,
    },
  } satisfies TenderEditorImportRunExecutionMetadata;

  return {
    action: options.action,
    upsertRecords,
    pruneRegistryRowIds,
    eligibleBlockIds,
    skippedBlockIds,
    resultStatus: eligibleBlockIds.length > 0 ? 'updated' : 'no_changes',
    summary: buildRepairSummary(options.action, eligibleBlockIds.length, skippedBlockIds.length),
    executionMetadata,
  } satisfies TenderImportRegistryRepairPlan;
}