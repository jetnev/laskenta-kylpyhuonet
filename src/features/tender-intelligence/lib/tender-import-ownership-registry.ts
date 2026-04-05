import type { Quote, QuoteRow } from '@/lib/types';

import type {
  TenderEditorManagedBlock,
  TenderEditorManagedBlockId,
  TenderEditorManagedBlockDriftStatus,
  TenderEditorImportRunExecutionMetadata,
  TenderEditorImportTargetKind,
  TenderEditorReconciliationBlock,
  TenderEditorSelectiveReimportSelection,
  TenderImportOwnedBlock,
  TenderImportOwnershipRegistryStatus,
} from '../types/tender-editor-import';
import {
  buildTenderEditorManagedSectionRowKey,
  extractTenderEditorManagedTextMarkerKeys,
  hasTenderEditorManagedSectionRow,
  hasTenderEditorManagedTextBlock,
  parseTenderEditorManagedSectionRowKey,
} from './tender-editor-managed-markers';
import type { TenderImportOwnedBlockDriftState } from './tender-import-drift';

type OwnershipSource = 'registry' | 'latest_successful_run';

export interface TenderImportOwnershipFallbackMeta {
  importRunId?: string | null;
  revision: number;
  lastSyncedAt: string | null;
}

export interface TenderImportOwnedBlockBaseline {
  persistedRow: TenderImportOwnedBlock | null;
  blockId: TenderEditorManagedBlockId;
  markerKey: string;
  targetField: TenderEditorImportTargetKind;
  targetSectionKey: string | null;
  blockTitle: string;
  payloadHash: string;
  lastAppliedContentHash: string | null;
  lastSeenQuoteContentHash: string | null;
  lastDriftStatus: TenderEditorManagedBlockDriftStatus | null;
  lastDriftCheckedAt: string | null;
  revision: number;
  lastSyncedAt: string | null;
  importRunId: string | null;
  source: OwnershipSource;
}

export interface TenderImportOwnedBlockPresence {
  textMarkerPresent: boolean;
  sectionRowPresent: boolean;
}

export interface TenderImportOwnedBlockWriteRecord {
  organization_id: string;
  tender_draft_package_id: string;
  target_quote_id: string;
  import_run_id: string | null;
  block_id: TenderEditorManagedBlockId;
  marker_key: string;
  target_field: TenderEditorImportTargetKind;
  target_section_key: string | null;
  block_title: string;
  payload_hash: string;
  last_applied_content_hash?: string | null;
  last_seen_quote_content_hash?: string | null;
  drift_status?: TenderEditorManagedBlockDriftStatus | null;
  last_drift_checked_at?: string | null;
  revision: number;
  last_synced_at: string;
  is_active: boolean;
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, nextValue]) => `${JSON.stringify(key)}:${stableStringify(nextValue)}`).join(',')}}`;
}

function createDeterministicHash(input: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeTimestamp(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

function toBlockIdArray(value: Iterable<TenderEditorManagedBlockId>) {
  return [...new Set(value)];
}

const EMPTY_EXECUTION_METADATA: TenderEditorImportRunExecutionMetadata = {
  selected_block_ids: [],
  selected_update_block_ids: [],
  selected_remove_block_ids: [],
  conflict_block_ids: [],
  skipped_conflict_block_ids: [],
  override_conflict_block_ids: [],
  updated_block_ids: [],
  removed_block_ids: [],
  missing_in_quote_block_ids: [],
  untouched_block_ids: [],
  run_mode: 'protected_reimport',
  conflict_policy: 'protect_conflicts',
  summary_counts: {
    selected_blocks: 0,
    conflict_blocks: 0,
    skipped_conflicts: 0,
    updated_blocks: 0,
    removed_blocks: 0,
    missing_in_quote_blocks: 0,
    untouched_blocks: 0,
  },
};

export function buildTenderImportOwnedBlockPayloadHash(block: Pick<
  TenderEditorManagedBlock,
  'block_id' | 'target_kind' | 'title' | 'content_md' | 'item_count'
>) {
  return createDeterministicHash(stableStringify({
    block_id: block.block_id,
    target_kind: block.target_kind,
    title: block.title,
    content_md: block.content_md,
    item_count: block.item_count,
  }));
}

export function buildTenderImportOwnedBlockAppliedContentHash(block: {
  targetField: TenderEditorImportTargetKind;
  title: string | null | undefined;
  contentMd: string | null | undefined;
}) {
  return createDeterministicHash(stableStringify({
    target_field: block.targetField,
    title: block.title?.trim() || null,
    content_md: block.contentMd?.trim() || null,
  }));
}
function buildBaselineFromManagedBlock(options: {
  draftPackageId: string;
  block: TenderEditorManagedBlock;
  revision: number;
  lastSyncedAt: string | null;
  importRunId?: string | null;
  source: OwnershipSource;
}): TenderImportOwnedBlockBaseline {
  return {
    persistedRow: null,
    blockId: options.block.block_id,
    markerKey: options.block.marker_key,
    targetField: options.block.target_kind,
    targetSectionKey: buildTenderEditorManagedSectionRowKey(options.draftPackageId, options.block.block_id),
    blockTitle: options.block.title,
    payloadHash: buildTenderImportOwnedBlockPayloadHash(options.block),
    lastAppliedContentHash: buildTenderImportOwnedBlockAppliedContentHash({
      targetField: options.block.target_kind,
      title: options.block.title,
      contentMd: options.block.content_md,
    }),
    lastSeenQuoteContentHash: null,
    lastDriftStatus: null,
    lastDriftCheckedAt: null,
    revision: options.revision,
    lastSyncedAt: normalizeTimestamp(options.lastSyncedAt),
    importRunId: options.importRunId ?? null,
    source: options.source,
  };
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
    lastAppliedContentHash: normalizeTimestamp(row.last_applied_content_hash),
    lastSeenQuoteContentHash: normalizeTimestamp(row.last_seen_quote_content_hash),
    lastDriftStatus: row.drift_status ?? null,
    lastDriftCheckedAt: normalizeTimestamp(row.last_drift_checked_at),
    revision: row.revision,
    lastSyncedAt: normalizeTimestamp(row.last_synced_at),
    importRunId: row.import_run_id ?? null,
    source: 'registry',
  };
}

function getQuoteFieldValue(quote: Quote | null, targetField: TenderEditorImportTargetKind) {
  if (!quote) {
    return null;
  }

  return targetField === 'quote_notes_section' ? quote.notes ?? null : quote.internalNotes ?? null;
}

export function buildTenderImportOwnedBlockPresence(options: {
  quote: Quote | null;
  rows: QuoteRow[];
  markerKey: string;
  targetField: TenderEditorImportTargetKind;
  targetSectionKey: string | null;
}): TenderImportOwnedBlockPresence {
  return {
    textMarkerPresent: hasTenderEditorManagedTextBlock(getQuoteFieldValue(options.quote, options.targetField), options.markerKey),
    sectionRowPresent: hasTenderEditorManagedSectionRow(options.rows, options.targetSectionKey),
  };
}

export function buildTenderImportOwnedBlockBaselines(options: {
  draftPackageId: string;
  ownedBlocks: TenderImportOwnedBlock[];
  fallbackBlocks: TenderEditorManagedBlock[];
  fallbackMeta: TenderImportOwnershipFallbackMeta;
  quote: Quote | null;
  rows: QuoteRow[];
}) {
  const persistedActiveBlocks = options.ownedBlocks.filter((block) => block.is_active);

  if (persistedActiveBlocks.length > 0) {
    return persistedActiveBlocks.map(buildBaselineFromOwnedBlock);
  }

  return options.fallbackBlocks
    .map((block) => buildBaselineFromManagedBlock({
      draftPackageId: options.draftPackageId,
      block,
      revision: options.fallbackMeta.revision,
      lastSyncedAt: options.fallbackMeta.lastSyncedAt,
      importRunId: options.fallbackMeta.importRunId ?? null,
      source: 'latest_successful_run',
    }))
    .filter((baseline) => {
      const presence = buildTenderImportOwnedBlockPresence({
        quote: options.quote,
        rows: options.rows,
        markerKey: baseline.markerKey,
        targetField: baseline.targetField,
        targetSectionKey: baseline.targetSectionKey,
      });

      return presence.textMarkerPresent || presence.sectionRowPresent;
    });
}

export function resolveTenderEditorSelectiveReimportSelection(options: {
  blocks: TenderEditorReconciliationBlock[];
  selection?: TenderEditorSelectiveReimportSelection | null;
}) {
  const allowedUpdateIds = new Set(options.blocks.filter((block) => block.can_select_for_update).map((block) => block.block_id));
  const allowedRemoveIds = new Set(options.blocks.filter((block) => block.can_select_for_removal).map((block) => block.block_id));
  const allowedOverrideIds = new Set(options.blocks.filter((block) => block.can_override_conflict).map((block) => block.block_id));
  const defaultUpdateIds = options.blocks.filter((block) => block.selected_for_update).map((block) => block.block_id);
  const defaultRemoveIds = options.blocks.filter((block) => block.selected_for_removal).map((block) => block.block_id);
  const defaultOverrideIds = options.blocks.filter((block) => block.selected_conflict_override).map((block) => block.block_id);

  const requestedUpdateIds = options.selection?.update_block_ids ?? defaultUpdateIds;
  const requestedRemoveIds = options.selection?.remove_block_ids ?? defaultRemoveIds;
  const requestedOverrideIds = options.selection?.override_conflict_block_ids ?? defaultOverrideIds;
  const overrideConflictBlockIds = toBlockIdArray(requestedOverrideIds.filter((blockId) => allowedOverrideIds.has(blockId)));

  return {
    updateBlockIds: toBlockIdArray(requestedUpdateIds.filter((blockId) => allowedUpdateIds.has(blockId))),
    removeBlockIds: toBlockIdArray(requestedRemoveIds.filter((blockId) => allowedRemoveIds.has(blockId))),
    overrideConflictBlockIds,
    conflictPolicy: options.selection?.conflict_policy
      ?? (overrideConflictBlockIds.length > 0 ? 'override_selected_conflicts' : 'protect_conflicts'),
  };
}

export function resolveTenderImportOwnershipRegistryStatus(options: {
  importedQuoteId?: string | null;
  registryRows: TenderImportOwnedBlock[];
  effectiveOwnedBlocks: TenderImportOwnedBlockBaseline[];
  warnings: string[];
  actionableBlockIds: TenderEditorManagedBlockId[];
  conflictBlockIds?: TenderEditorManagedBlockId[];
  registryIssueBlockIds?: TenderEditorManagedBlockId[];
}): TenderImportOwnershipRegistryStatus {
  if (!options.importedQuoteId) {
    return 'not_available';
  }

  if ((options.registryIssueBlockIds?.length ?? 0) > 0 || (options.conflictBlockIds?.length ?? 0) > 0) {
    return 'conflicted';
  }

  if (options.warnings.length > 0) {
    return 'conflicted';
  }

  if (options.registryRows.filter((row) => row.is_active).length < 1) {
    return options.effectiveOwnedBlocks.length > 0 ? 'missing' : 'stale';
  }

  if (options.actionableBlockIds.length > 0) {
    return 'stale';
  }

  return 'current';
}

export function listTenderEditorManagedMarkerConflicts(options: {
  draftPackageId: string;
  quote: Quote | null;
  rows: QuoteRow[];
  expectedMarkerKeys: string[];
  expectedSectionRowKeys: string[];
}) {
  const expectedMarkerKeySet = new Set(options.expectedMarkerKeys);
  const expectedSectionRowKeySet = new Set(options.expectedSectionRowKeys.filter(Boolean));
  const extraMarkerKeys = [
    ...extractTenderEditorManagedTextMarkerKeys(options.quote?.notes ?? null, options.draftPackageId),
    ...extractTenderEditorManagedTextMarkerKeys(options.quote?.internalNotes ?? null, options.draftPackageId),
  ].filter((markerKey) => !expectedMarkerKeySet.has(markerKey));
  const extraSectionKeys = options.rows
    .filter((row) => row.mode === 'section')
    .map((row) => row.notes?.trim() ?? '')
    .filter(Boolean)
    .filter((rowNote) => {
      const marker = parseTenderEditorManagedSectionRowKey(rowNote);
      return marker?.draftPackageId === options.draftPackageId && !expectedSectionRowKeySet.has(rowNote);
    });

  return {
    extraMarkerKeys: [...new Set(extraMarkerKeys)],
    extraSectionKeys: [...new Set(extraSectionKeys)],
  };
}

export function buildTenderImportOwnedBlockWriteRecords(options: {
  organizationId: string;
  draftPackageId: string;
  targetQuoteId: string;
  importRunId?: string | null;
  currentBlocks: TenderEditorManagedBlock[];
  driftStates: TenderImportOwnedBlockDriftState[];
  executionMetadata?: TenderEditorImportRunExecutionMetadata;
  syncedAt: string;
  nextRevision: number;
}) {
  const executionMetadata = options.executionMetadata ?? EMPTY_EXECUTION_METADATA;
  const currentBlocksById = new Map(options.currentBlocks.map((block) => [block.block_id, block]));
  const updatedSet = new Set(executionMetadata.updated_block_ids);
  const removedSet = new Set(executionMetadata.removed_block_ids);
  const touchedSet = new Set([
    ...executionMetadata.selected_block_ids,
    ...executionMetadata.updated_block_ids,
    ...executionMetadata.removed_block_ids,
    ...executionMetadata.skipped_conflict_block_ids,
    ...executionMetadata.missing_in_quote_block_ids,
    ...executionMetadata.untouched_block_ids,
  ]);
  const records: TenderImportOwnedBlockWriteRecord[] = [];

  options.driftStates.forEach((state) => {
    const currentBlock = currentBlocksById.get(state.blockId) ?? state.currentBlock ?? null;
    const baseline = state.baseline;

    if (!currentBlock && !baseline) {
      return;
    }

    if (!baseline && currentBlock) {
      if (!updatedSet.has(state.blockId)) {
        return;
      }

      const appliedContentHash = buildTenderImportOwnedBlockAppliedContentHash({
        targetField: currentBlock.target_kind,
        title: currentBlock.title,
        contentMd: currentBlock.content_md,
      });

      records.push({
        organization_id: options.organizationId,
        tender_draft_package_id: options.draftPackageId,
        target_quote_id: options.targetQuoteId,
        import_run_id: options.importRunId ?? null,
        block_id: currentBlock.block_id,
        marker_key: currentBlock.marker_key,
        target_field: currentBlock.target_kind,
        target_section_key: buildTenderEditorManagedSectionRowKey(options.draftPackageId, currentBlock.block_id),
        block_title: currentBlock.title,
        payload_hash: buildTenderImportOwnedBlockPayloadHash(currentBlock),
        last_applied_content_hash: appliedContentHash,
        last_seen_quote_content_hash: appliedContentHash,
        drift_status: 'up_to_date',
        last_drift_checked_at: options.syncedAt,
        revision: options.nextRevision,
        last_synced_at: options.syncedAt,
        is_active: true,
      });
      return;
    }

    if (!baseline) {
      return;
    }

    if (removedSet.has(state.blockId)) {
      records.push({
        organization_id: options.organizationId,
        tender_draft_package_id: options.draftPackageId,
        target_quote_id: options.targetQuoteId,
        import_run_id: options.importRunId ?? null,
        block_id: baseline.blockId,
        marker_key: baseline.markerKey,
        target_field: baseline.targetField,
        target_section_key: baseline.targetSectionKey,
        block_title: baseline.blockTitle,
        payload_hash: baseline.payloadHash,
        last_applied_content_hash: baseline.lastAppliedContentHash,
        last_seen_quote_content_hash: state.quoteSnapshot.contentHash ?? baseline.lastSeenQuoteContentHash,
        drift_status: state.driftStatus,
        last_drift_checked_at: options.syncedAt,
        revision: options.nextRevision,
        last_synced_at: options.syncedAt,
        is_active: false,
      });
      return;
    }

    if (updatedSet.has(state.blockId) && currentBlock) {
      const appliedContentHash = buildTenderImportOwnedBlockAppliedContentHash({
        targetField: currentBlock.target_kind,
        title: currentBlock.title,
        contentMd: currentBlock.content_md,
      });

      records.push({
        organization_id: options.organizationId,
        tender_draft_package_id: options.draftPackageId,
        target_quote_id: options.targetQuoteId,
        import_run_id: options.importRunId ?? null,
        block_id: currentBlock.block_id,
        marker_key: currentBlock.marker_key,
        target_field: currentBlock.target_kind,
        target_section_key: buildTenderEditorManagedSectionRowKey(options.draftPackageId, currentBlock.block_id),
        block_title: currentBlock.title,
        payload_hash: buildTenderImportOwnedBlockPayloadHash(currentBlock),
        last_applied_content_hash: appliedContentHash,
        last_seen_quote_content_hash: appliedContentHash,
        drift_status: 'up_to_date',
        last_drift_checked_at: options.syncedAt,
        revision: options.nextRevision,
        last_synced_at: options.syncedAt,
        is_active: true,
      });
      return;
    }

    if (!touchedSet.has(state.blockId) && baseline.persistedRow == null) {
      return;
    }

    records.push({
      organization_id: options.organizationId,
      tender_draft_package_id: options.draftPackageId,
      target_quote_id: options.targetQuoteId,
      import_run_id: baseline.importRunId,
      block_id: baseline.blockId,
      marker_key: baseline.markerKey,
      target_field: baseline.targetField,
      target_section_key: baseline.targetSectionKey,
      block_title: baseline.blockTitle,
      payload_hash: baseline.payloadHash,
      last_applied_content_hash: baseline.lastAppliedContentHash,
      last_seen_quote_content_hash: state.quoteSnapshot.contentHash ?? baseline.lastSeenQuoteContentHash,
      drift_status: state.driftStatus,
      last_drift_checked_at: options.syncedAt,
      revision: baseline.revision,
      last_synced_at: baseline.lastSyncedAt ?? options.syncedAt,
      is_active: true,
    });
  });

  return records;
}