import type { Quote, QuoteRow } from '@/lib/types';

import type {
  TenderDraftPackageImportRun,
  TenderEditorImportPreview,
  TenderEditorImportTargetKind,
  TenderImportOwnedBlock,
  TenderImportRegistryDiagnosticBlock,
  TenderImportRegistryDiagnosticStatus,
  TenderImportRegistryHealthSummary,
  TenderImportOwnershipRegistryStatus,
} from '../types/tender-editor-import';
import { tenderDraftPackageImportDiagnosticsSchema } from '../types/tender-editor-import';
import { buildTenderEditorManagedSurfaceFromPayload } from './tender-editor-managed-surface';
import {
  buildTenderImportOwnedBlockDriftStates,
  classifyTenderImportOwnedBlockDrift,
  readTenderImportOwnedBlockQuoteSnapshot,
  type TenderImportOwnedBlockDriftState,
} from './tender-import-drift';
import {
  buildTenderImportOwnedBlockAppliedContentHash,
  buildTenderImportOwnedBlockPayloadHash,
  listTenderEditorManagedMarkerConflicts,
  resolveTenderImportOwnershipRegistryStatus,
  type TenderImportOwnedBlockBaseline,
} from './tender-import-ownership-registry';

function getLatestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function resolveTargetLabel(targetKind: TenderEditorImportTargetKind) {
  return targetKind === 'quote_internal_notes_section'
    ? 'Tarjouksen internalNotes-kenttä'
    : 'Tarjouksen notes-kenttä';
}

function resolveDiagnosticStatus(state: TenderImportOwnedBlockDriftState): TenderImportRegistryDiagnosticStatus {
  switch (state.driftStatus) {
    case 'up_to_date':
      return 'healthy';
    case 'registry_stale':
      return 'stale';
    case 'orphaned_registry':
      return 'orphaned';
    case 'removed_from_quote':
      return 'missing_quote';
    case 'changed_in_both':
      return 'conflict';
    case 'changed_in_quote':
      return 'drifted_quote';
    case 'changed_in_draft':
      return 'drifted_draft';
    default:
      return 'stale';
  }
}

function buildBaselineFromOwnedBlock(row: TenderImportOwnedBlock): TenderImportOwnedBlockBaseline {
  return {
    persistedRow: row,
    blockId: row.block_id,
    markerKey: row.marker_key,
    targetField: row.target_field,
    targetSectionKey: row.target_section_key ?? null,
    blockTitle: row.block_title,
    payloadHash: row.payload_hash,
    lastAppliedContentHash: row.last_applied_content_hash ?? null,
    lastSeenQuoteContentHash: row.last_seen_quote_content_hash ?? null,
    lastDriftStatus: row.drift_status ?? null,
    lastDriftCheckedAt: row.last_drift_checked_at ?? null,
    revision: row.revision,
    lastSyncedAt: row.last_synced_at ?? null,
    importRunId: row.import_run_id ?? null,
    source: 'registry',
  };
}

function buildInactiveOwnedBlockDriftState(options: {
  draftPackageId: string;
  ownedBlock: TenderImportOwnedBlock;
  currentBlock: ReturnType<typeof buildTenderEditorManagedSurfaceFromPayload>['blocks'][number] | null;
  quote: Quote | null;
  rows: QuoteRow[];
}) {
  const baseline = buildBaselineFromOwnedBlock(options.ownedBlock);
  const quoteSnapshot = readTenderImportOwnedBlockQuoteSnapshot({
    quote: options.quote,
    rows: options.rows,
    markerKey: baseline.markerKey,
    targetField: baseline.targetField,
    targetSectionKey: baseline.targetSectionKey,
  });
  const driftStatus = classifyTenderImportOwnedBlockDrift({
    currentBlock: options.currentBlock,
    baseline,
    quoteSnapshot,
  });
  const currentAppliedContentHash = options.currentBlock
    ? buildTenderImportOwnedBlockAppliedContentHash({
        targetField: options.currentBlock.target_kind,
        title: options.currentBlock.title,
        contentMd: options.currentBlock.content_md,
      })
    : null;

  return {
    blockId: baseline.blockId,
    currentBlock: options.currentBlock,
    baseline,
    quoteSnapshot,
    currentPayloadHash: options.currentBlock ? buildTenderImportOwnedBlockPayloadHash(options.currentBlock) : null,
    currentAppliedContentHash,
    lastAppliedContentHash: baseline.lastAppliedContentHash,
    lastSeenQuoteContentHash: quoteSnapshot.contentHash,
    driftStatus,
    isConflict: driftStatus === 'changed_in_quote'
      || driftStatus === 'changed_in_both'
      || driftStatus === 'removed_from_quote'
      || driftStatus === 'registry_stale',
    manualQuoteEditDetected: driftStatus === 'changed_in_quote'
      || driftStatus === 'changed_in_both'
      || driftStatus === 'removed_from_quote',
    safeToUpdate: Boolean(options.currentBlock) && driftStatus === 'up_to_date',
    safeToRemove: !options.currentBlock && driftStatus === 'orphaned_registry',
  } satisfies TenderImportOwnedBlockDriftState;
}

function buildDiagnosticBlock(options: {
  draftPackageId: string;
  state: TenderImportOwnedBlockDriftState;
  latestImportRun: TenderDraftPackageImportRun | null;
}) {
  const currentBlock = options.state.currentBlock;
  const baseline = options.state.baseline;
  const persistedRow = baseline?.persistedRow ?? null;
  const targetKind = currentBlock?.target_kind ?? baseline?.targetField ?? 'quote_notes_section';
  const title = currentBlock?.title ?? baseline?.blockTitle ?? options.state.blockId;
  const latestPayloadHash = currentBlock ? buildTenderImportOwnedBlockPayloadHash(currentBlock) : null;
  const latestPayloadAppliedContentHash = currentBlock
    ? buildTenderImportOwnedBlockAppliedContentHash({
        targetField: currentBlock.target_kind,
        title: currentBlock.title,
        contentMd: currentBlock.content_md,
      })
    : null;
  const liveQuoteMatchesCurrentPayload = Boolean(
    currentBlock
    && options.state.quoteSnapshot.textMarkerPresent
    && options.state.quoteSnapshot.sectionRowPresent
    && options.state.quoteSnapshot.contentHash
    && latestPayloadAppliedContentHash
    && options.state.quoteSnapshot.contentHash === latestPayloadAppliedContentHash,
  );
  const canResyncHashesFromLiveQuoteMarkers = liveQuoteMatchesCurrentPayload
    && (
      !persistedRow
      || !persistedRow.is_active
      || persistedRow.payload_hash !== latestPayloadHash
      || persistedRow.last_applied_content_hash !== latestPayloadAppliedContentHash
      || persistedRow.last_seen_quote_content_hash !== options.state.quoteSnapshot.contentHash
      || persistedRow.drift_status !== 'up_to_date'
    );
  const canMarkOrphaned = Boolean(persistedRow?.is_active)
    && !currentBlock
    && options.state.driftStatus === 'orphaned_registry';
  const canPruneInactive = Boolean(persistedRow && !persistedRow.is_active);
  const canRefreshRegistryMetadata = Boolean(persistedRow)
    && !canResyncHashesFromLiveQuoteMarkers
    && !canMarkOrphaned
    && !canPruneInactive
    && options.state.driftStatus === 'registry_stale';
  const requiresReimport = options.state.driftStatus === 'changed_in_quote'
    || options.state.driftStatus === 'changed_in_both'
    || options.state.driftStatus === 'removed_from_quote';
  const diagnosticStatus = resolveDiagnosticStatus(options.state);
  const warnings: string[] = [];

  if (!persistedRow && (options.state.quoteSnapshot.textMarkerPresent || options.state.quoteSnapshot.sectionRowPresent)) {
    warnings.push('Quote sisältää managed markerin tai section-rivin, mutta registry-rivi puuttuu.');
  }

  if (options.state.driftStatus === 'removed_from_quote') {
    warnings.push('Quote-blokki puuttuu. Phase 17 repair ei palauta sisältöä, vaan varsinainen palautus kuuluu re-import-polkuun.');
  }

  if (options.state.driftStatus === 'changed_in_quote' || options.state.driftStatus === 'changed_in_both') {
    warnings.push('Quote-puolen sisältö on muuttunut. Registry repair ei adoptoi käyttäjän tekstiä registryyn tässä vaiheessa.');
  }

  if (canResyncHashesFromLiveQuoteMarkers) {
    warnings.push('Live quote marker vastaa latest payloadia, joten registry-hashit voidaan resynkata ilman sisältökirjoitusta.');
  }

  if (canMarkOrphaned) {
    warnings.push('Registry-rivi voidaan merkitä orphaned-tilaan ilman quote-sisällön muutosta.');
  }

  if (canPruneInactive) {
    warnings.push('Inaktiivinen registry-rivi voidaan siivota audit-historiaa rikkomatta.');
  }

  if (canRefreshRegistryMetadata) {
    warnings.push('Registry-metadata voidaan päivittää vastaamaan nykyistä drift-näkymää ilman quote-sisällön muutosta.');
  }

  let recommendedRepairAction: TenderImportRegistryDiagnosticBlock['recommended_repair_action'] = null;

  if (canResyncHashesFromLiveQuoteMarkers) {
    recommendedRepairAction = 'resync_registry_hashes_from_live_quote_markers';
  } else if (canMarkOrphaned) {
    recommendedRepairAction = 'mark_orphaned_registry_entries';
  } else if (canPruneInactive) {
    recommendedRepairAction = 'prune_inactive_registry_entries';
  } else if (canRefreshRegistryMetadata) {
    recommendedRepairAction = 'refresh_registry_metadata';
  }

  return {
    block_id: options.state.blockId,
    marker_key: currentBlock?.marker_key ?? baseline?.markerKey ?? `${options.draftPackageId}:${options.state.blockId}`,
    target_kind: targetKind,
    target_label: currentBlock?.target_label ?? resolveTargetLabel(targetKind),
    title,
    registry_entry_id: persistedRow?.id ?? null,
    registry_revision: baseline?.revision ?? null,
    registry_is_active: persistedRow?.is_active ?? false,
    registry_last_synced_at: baseline?.lastSyncedAt ?? null,
    registry_last_drift_checked_at: baseline?.lastDriftCheckedAt ?? null,
    registry_payload_hash: persistedRow?.payload_hash ?? null,
    registry_last_applied_content_hash: persistedRow?.last_applied_content_hash ?? null,
    registry_last_seen_quote_content_hash: persistedRow?.last_seen_quote_content_hash ?? null,
    latest_payload_present: Boolean(currentBlock),
    latest_payload_hash: latestPayloadHash,
    latest_payload_applied_content_hash: latestPayloadAppliedContentHash,
    live_quote_content_md: options.state.quoteSnapshot.contentMd,
    live_quote_section_title: options.state.quoteSnapshot.sectionTitle,
    live_quote_content_hash: options.state.quoteSnapshot.contentHash,
    live_quote_marker_present: options.state.quoteSnapshot.textMarkerPresent,
    live_quote_section_row_present: options.state.quoteSnapshot.sectionRowPresent,
    latest_import_run_id: options.latestImportRun?.id ?? baseline?.importRunId ?? null,
    drift_status: options.state.driftStatus,
    diagnostic_status: diagnosticStatus,
    is_conflict: options.state.isConflict,
    repair_recommended_before_reimport: recommendedRepairAction != null,
    recommended_repair_action: recommendedRepairAction,
    can_refresh_registry_metadata: canRefreshRegistryMetadata,
    can_mark_orphaned: canMarkOrphaned,
    can_prune_inactive: canPruneInactive,
    can_resync_hashes_from_live_quote_markers: canResyncHashesFromLiveQuoteMarkers,
    requires_reimport: requiresReimport,
    warnings,
  } satisfies TenderImportRegistryDiagnosticBlock;
}

export function buildTenderImportRegistryHealthSummary(blocks: TenderImportRegistryDiagnosticBlock[]) {
  return {
    healthy_blocks: blocks.filter((block) => block.diagnostic_status === 'healthy').length,
    stale_blocks: blocks.filter((block) => block.diagnostic_status === 'stale').length,
    orphaned_registry_blocks: blocks.filter((block) => block.diagnostic_status === 'orphaned').length,
    missing_quote_blocks: blocks.filter((block) => block.diagnostic_status === 'missing_quote').length,
    conflict_blocks: blocks.filter((block) => block.is_conflict).length,
    drifted_quote_blocks: blocks.filter((block) => block.diagnostic_status === 'drifted_quote' || block.diagnostic_status === 'conflict').length,
    drifted_draft_blocks: blocks.filter((block) => block.diagnostic_status === 'drifted_draft' || block.diagnostic_status === 'conflict').length,
    total_registry_blocks: blocks.length,
  } satisfies TenderImportRegistryHealthSummary;
}

export function buildTenderDraftPackageImportDiagnostics(options: {
  draftPackageId: string;
  targetQuoteId?: string | null;
  targetQuoteTitle?: string | null;
  preview: TenderEditorImportPreview;
  importRuns: TenderDraftPackageImportRun[];
  ownedBlocks: TenderImportOwnedBlock[];
  targetQuoteSnapshot: { quote: Quote | null; rows: QuoteRow[] };
  generatedAt?: string;
}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const currentBlocks = buildTenderEditorManagedSurfaceFromPayload(options.preview.payload).blocks;
  const currentBlocksById = new Map(currentBlocks.map((block) => [block.block_id, block]));
  const latestImportRun = options.importRuns.find((run) => run.run_type === 'import' || run.run_type === 'reimport') ?? null;
  const latestSuccessfulImportRun = options.importRuns.find(
    (run) => run.result_status === 'success' && (run.run_type === 'import' || run.run_type === 'reimport'),
  ) ?? null;
  const latestDiagnosticsRefreshRun = options.importRuns.find(
    (run) => run.result_status === 'success' && run.run_type === 'diagnostics_refresh',
  ) ?? null;
  const latestRegistryRepairRun = options.importRuns.find(
    (run) => run.result_status === 'success' && run.run_type === 'registry_repair',
  ) ?? null;
  const fallbackBlocks = latestSuccessfulImportRun
    ? buildTenderEditorManagedSurfaceFromPayload(latestSuccessfulImportRun.payload_snapshot).blocks
    : [];
  const driftStates = buildTenderImportOwnedBlockDriftStates({
    draftPackageId: options.draftPackageId,
    currentBlocks,
    ownedBlocks: options.ownedBlocks,
    fallbackBlocks,
    fallbackMeta: {
      importRunId: latestSuccessfulImportRun?.id ?? null,
      revision: 1,
      lastSyncedAt: latestSuccessfulImportRun?.created_at ?? null,
    },
    quote: options.targetQuoteSnapshot.quote,
    rows: options.targetQuoteSnapshot.rows,
  });
  const activeBlockIds = new Set(driftStates.map((state) => state.blockId));
  const inactiveDriftStates = options.ownedBlocks
    .filter((row) => !row.is_active && !activeBlockIds.has(row.block_id))
    .map((row) => buildInactiveOwnedBlockDriftState({
      draftPackageId: options.draftPackageId,
      ownedBlock: row,
      currentBlock: currentBlocksById.get(row.block_id) ?? null,
      quote: options.targetQuoteSnapshot.quote,
      rows: options.targetQuoteSnapshot.rows,
    }));
  const blocks = [...driftStates, ...inactiveDriftStates]
    .map((state) => buildDiagnosticBlock({
      draftPackageId: options.draftPackageId,
      state,
      latestImportRun,
    }))
    .sort((left, right) => left.block_id.localeCompare(right.block_id));
  const summary = buildTenderImportRegistryHealthSummary(blocks);
  const markerConflicts = listTenderEditorManagedMarkerConflicts({
    draftPackageId: options.draftPackageId,
    quote: options.targetQuoteSnapshot.quote,
    rows: options.targetQuoteSnapshot.rows,
    expectedMarkerKeys: blocks.map((block) => block.marker_key),
    expectedSectionRowKeys: blocks
      .filter((block) => block.registry_is_active || block.latest_payload_present)
      .map((block) => `tender-editor-import:${block.marker_key}`),
  });
  const warnings: string[] = [];

  if (markerConflicts.extraMarkerKeys.length > 0) {
    warnings.push(`Quote sisältää ${markerConflicts.extraMarkerKeys.length} managed markeria, joille registry ei tunne aktiivista riviä.`);
  }

  if (markerConflicts.extraSectionKeys.length > 0) {
    warnings.push(`Quote sisältää ${markerConflicts.extraSectionKeys.length} managed section-riviä, joita registry ei tunne.`);
  }

  const registryStatus = resolveTenderImportOwnershipRegistryStatus({
    importedQuoteId: options.targetQuoteId ?? null,
    registryRows: options.ownedBlocks,
    effectiveOwnedBlocks: blocks
      .filter((block) => block.registry_is_active && block.registry_entry_id)
      .map((block) => ({
        persistedRow: options.ownedBlocks.find((row) => row.id === block.registry_entry_id) ?? null,
        blockId: block.block_id,
        markerKey: block.marker_key,
        targetField: block.target_kind,
        targetSectionKey: `tender-editor-import:${block.marker_key}`,
        blockTitle: block.title,
        payloadHash: block.registry_payload_hash ?? block.latest_payload_hash ?? '',
        lastAppliedContentHash: block.registry_last_applied_content_hash ?? null,
        lastSeenQuoteContentHash: block.registry_last_seen_quote_content_hash ?? null,
        lastDriftStatus: block.drift_status,
        lastDriftCheckedAt: block.registry_last_drift_checked_at ?? null,
        revision: block.registry_revision ?? 0,
        lastSyncedAt: block.registry_last_synced_at ?? null,
        importRunId: block.latest_import_run_id ?? null,
        source: 'registry' as const,
      })),
    warnings,
    actionableBlockIds: blocks
      .filter((block) => block.latest_payload_present || block.registry_is_active)
      .map((block) => block.block_id),
    conflictBlockIds: blocks.filter((block) => block.is_conflict).map((block) => block.block_id),
    registryIssueBlockIds: blocks
      .filter((block) => block.drift_status === 'registry_stale' || block.diagnostic_status === 'orphaned')
      .map((block) => block.block_id),
  });
  const activeRepairBlocks = blocks.filter((block) => block.registry_is_active || block.latest_payload_present);
  const safeReimportNow = activeRepairBlocks.every(
    (block) => !block.is_conflict && block.drift_status !== 'registry_stale' && block.diagnostic_status !== 'orphaned',
  );
  const manualQuoteEditDetected = blocks.some((block) => block.drift_status === 'changed_in_quote' || block.drift_status === 'changed_in_both' || block.drift_status === 'removed_from_quote');
  const repairRecommended = blocks.some((block) => block.recommended_repair_action != null);

  return tenderDraftPackageImportDiagnosticsSchema.parse({
    draft_package_id: options.draftPackageId,
    target_quote_id: options.targetQuoteId ?? null,
    target_quote_title: options.targetQuoteTitle ?? null,
    generated_at: generatedAt,
    registry_status: registryStatus as TenderImportOwnershipRegistryStatus,
    summary,
    blocks,
    latest_import_run: latestImportRun,
    latest_diagnostics_refresh_run: latestDiagnosticsRefreshRun,
    latest_registry_repair_run: latestRegistryRepairRun,
    last_live_drift_checked_at: getLatestTimestamp([
      ...options.ownedBlocks.map((row) => row.last_drift_checked_at),
      latestDiagnosticsRefreshRun?.created_at,
      latestRegistryRepairRun?.created_at,
    ]),
    last_registry_sync_at: getLatestTimestamp(options.ownedBlocks.map((row) => row.last_synced_at)),
    safe_reimport_now: safeReimportNow,
    manual_quote_edit_detected: manualQuoteEditDetected,
    repair_recommended: repairRecommended,
    warnings,
  });
}