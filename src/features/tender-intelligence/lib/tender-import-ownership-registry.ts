import type { Quote, QuoteRow } from '@/lib/types';

import type {
  TenderEditorManagedBlock,
  TenderEditorManagedBlockId,
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

type OwnershipSource = 'registry' | 'latest_successful_run';

export interface TenderImportOwnershipFallbackMeta {
  importRunId?: string | null;
  revision: number;
  lastSyncedAt: string | null;
}

interface TenderImportOwnedBlockBaseline {
  persistedRow: TenderImportOwnedBlock | null;
  blockId: TenderEditorManagedBlockId;
  markerKey: string;
  targetField: TenderEditorImportTargetKind;
  targetSectionKey: string | null;
  blockTitle: string;
  payloadHash: string;
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
  const defaultUpdateIds = options.blocks.filter((block) => block.selected_for_update).map((block) => block.block_id);
  const defaultRemoveIds = options.blocks.filter((block) => block.selected_for_removal).map((block) => block.block_id);

  const requestedUpdateIds = options.selection?.update_block_ids ?? defaultUpdateIds;
  const requestedRemoveIds = options.selection?.remove_block_ids ?? defaultRemoveIds;

  return {
    updateBlockIds: toBlockIdArray(requestedUpdateIds.filter((blockId) => allowedUpdateIds.has(blockId))),
    removeBlockIds: toBlockIdArray(requestedRemoveIds.filter((blockId) => allowedRemoveIds.has(blockId))),
  };
}

export function resolveTenderImportOwnershipRegistryStatus(options: {
  importedQuoteId?: string | null;
  registryRows: TenderImportOwnedBlock[];
  effectiveOwnedBlocks: TenderImportOwnedBlockBaseline[];
  warnings: string[];
  actionableBlockIds: TenderEditorManagedBlockId[];
}): TenderImportOwnershipRegistryStatus {
  if (!options.importedQuoteId) {
    return 'not_available';
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
  ownedBlocks: TenderImportOwnedBlock[];
  fallbackBlocks: TenderEditorManagedBlock[];
  fallbackMeta: TenderImportOwnershipFallbackMeta;
  quote: Quote | null;
  rows: QuoteRow[];
  selectedUpdateBlockIds: TenderEditorManagedBlockId[];
  selectedRemoveBlockIds: TenderEditorManagedBlockId[];
  syncedAt: string;
  nextRevision: number;
}) {
  const currentBlocksById = new Map(options.currentBlocks.map((block) => [block.block_id, block]));
  const persistedActiveBlocks = options.ownedBlocks.filter((block) => block.is_active);
  const hasPersistedRegistry = persistedActiveBlocks.length > 0;
  const updateSet = new Set(options.selectedUpdateBlockIds);
  const removeSet = new Set(options.selectedRemoveBlockIds);

  if (hasPersistedRegistry) {
    return [
      ...options.selectedUpdateBlockIds.flatMap((blockId) => {
        const block = currentBlocksById.get(blockId);

        if (!block) {
          return [];
        }

        return {
          organization_id: options.organizationId,
          tender_draft_package_id: options.draftPackageId,
          target_quote_id: options.targetQuoteId,
          import_run_id: options.importRunId ?? null,
          block_id: block.block_id,
          marker_key: block.marker_key,
          target_field: block.target_kind,
          target_section_key: buildTenderEditorManagedSectionRowKey(options.draftPackageId, block.block_id),
          block_title: block.title,
          payload_hash: buildTenderImportOwnedBlockPayloadHash(block),
          revision: options.nextRevision,
          last_synced_at: options.syncedAt,
          is_active: true,
        } satisfies TenderImportOwnedBlockWriteRecord;
      }),
      ...persistedActiveBlocks.flatMap((row) => {
        if (!removeSet.has(row.block_id)) {
          return [];
        }

        return {
          organization_id: options.organizationId,
          tender_draft_package_id: options.draftPackageId,
          target_quote_id: options.targetQuoteId,
          import_run_id: options.importRunId ?? null,
          block_id: row.block_id,
          marker_key: row.marker_key,
          target_field: row.target_field,
          target_section_key: row.target_section_key ?? null,
          block_title: row.block_title,
          payload_hash: row.payload_hash,
          revision: options.nextRevision,
          last_synced_at: options.syncedAt,
          is_active: false,
        } satisfies TenderImportOwnedBlockWriteRecord;
      }),
    ];
  }

  const baselineBlocks = buildTenderImportOwnedBlockBaselines({
    draftPackageId: options.draftPackageId,
    ownedBlocks: options.ownedBlocks,
    fallbackBlocks: options.fallbackBlocks,
    fallbackMeta: options.fallbackMeta,
    quote: options.quote,
    rows: options.rows,
  });
  const baselineById = new Map(baselineBlocks.map((block) => [block.blockId, block]));
  const orderedBlockIds = toBlockIdArray([
    ...options.currentBlocks.map((block) => block.block_id),
    ...baselineBlocks.map((block) => block.blockId),
  ]);
  const records: TenderImportOwnedBlockWriteRecord[] = [];

  orderedBlockIds.forEach((blockId) => {
    const currentBlock = currentBlocksById.get(blockId) ?? null;
    const baseline = baselineById.get(blockId) ?? null;

    if (!currentBlock && !baseline) {
      return;
    }

    if (!baseline && currentBlock) {
      if (!updateSet.has(blockId)) {
        return;
      }

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
        revision: options.nextRevision,
        last_synced_at: options.syncedAt,
        is_active: true,
      });
      return;
    }

    if (baseline && !currentBlock) {
      records.push({
        organization_id: options.organizationId,
        tender_draft_package_id: options.draftPackageId,
        target_quote_id: options.targetQuoteId,
        import_run_id: removeSet.has(blockId) ? options.importRunId ?? null : baseline.importRunId,
        block_id: baseline.blockId,
        marker_key: baseline.markerKey,
        target_field: baseline.targetField,
        target_section_key: baseline.targetSectionKey,
        block_title: baseline.blockTitle,
        payload_hash: baseline.payloadHash,
        revision: removeSet.has(blockId) ? options.nextRevision : baseline.revision,
        last_synced_at: removeSet.has(blockId) ? options.syncedAt : baseline.lastSyncedAt ?? options.syncedAt,
        is_active: !removeSet.has(blockId),
      });
      return;
    }

    if (!currentBlock || !baseline) {
      return;
    }

    const currentPayloadHash = buildTenderImportOwnedBlockPayloadHash(currentBlock);
    const keepBaseline = baseline.source === 'latest_successful_run' && !updateSet.has(blockId) && baseline.payloadHash !== currentPayloadHash;

    if (keepBaseline) {
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
        revision: baseline.revision,
        last_synced_at: baseline.lastSyncedAt ?? options.syncedAt,
        is_active: true,
      });
      return;
    }

    records.push({
      organization_id: options.organizationId,
      tender_draft_package_id: options.draftPackageId,
      target_quote_id: options.targetQuoteId,
      import_run_id: updateSet.has(blockId) ? options.importRunId ?? null : baseline.importRunId,
      block_id: currentBlock.block_id,
      marker_key: currentBlock.marker_key,
      target_field: currentBlock.target_kind,
      target_section_key: buildTenderEditorManagedSectionRowKey(options.draftPackageId, currentBlock.block_id),
      block_title: currentBlock.title,
      payload_hash: currentPayloadHash,
      revision: updateSet.has(blockId) ? options.nextRevision : baseline.revision,
      last_synced_at: updateSet.has(blockId) ? options.syncedAt : baseline.lastSyncedAt ?? options.syncedAt,
      is_active: true,
    });
  });

  return records;
}