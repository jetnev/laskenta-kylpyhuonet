import type { TenderDraftPackage } from '../types/tender-intelligence';
import {
  type TenderDraftPackageImportRun,
  type TenderDraftPackageImportState,
  type TenderEditorImportItem,
  type TenderEditorImportMode,
  type TenderEditorImportPayload,
  type TenderEditorImportPreview,
  type TenderEditorManagedBlock,
  type TenderEditorReconciliationEntry,
  type TenderEditorReconciliationBlock,
  type TenderEditorReconciliationPreview,
  tenderDraftPackageImportStateSchema,
  tenderEditorReconciliationPreviewSchema,
} from '../types/tender-editor-import';
import { buildTenderEditorManagedSurfaceFromPayload } from './tender-editor-managed-surface';

function normalizeContent(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
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

function buildManagedEntryKey(item: TenderEditorImportItem) {
  return [item.import_group, item.item_type, item.source_entity_type, item.source_entity_id].join(':');
}

function buildManagedEntries(items: TenderEditorImportItem[]) {
  return items.map((item) => ({
    key: buildManagedEntryKey(item),
    import_group: item.import_group,
    target_kind: item.target_kind,
    title: item.title.trim(),
    content_md: normalizeContent(item.content_md),
  }));
}

function buildManagedSurface(payload: TenderEditorImportPayload) {
  const managedSurface = buildTenderEditorManagedSurfaceFromPayload(payload);

  return {
    blocks: managedSurface.blocks.map((block) => ({
      block_id: block.block_id,
      import_group: block.import_group,
      target_kind: block.target_kind,
      title: block.title,
      content_md: normalizeContent(block.content_md),
      item_count: block.item_count,
    })),
    items: buildManagedEntries(payload.items),
  };
}

function mapChangedEntry(options: {
  current?: ReturnType<typeof buildManagedEntries>[number];
  previous?: ReturnType<typeof buildManagedEntries>[number];
  changeType: TenderEditorReconciliationEntry['change_type'];
}): TenderEditorReconciliationEntry {
  const basis = options.current ?? options.previous;

  if (!basis) {
    throw new Error('Reconciliation entry requires current or previous payload item.');
  }

  return {
    key: basis.key,
    import_group: basis.import_group,
    target_kind: basis.target_kind,
    title: basis.title,
    change_type: options.changeType,
    current_content_md: options.current?.content_md ?? null,
    previous_content_md: options.previous?.content_md ?? null,
  };
}

function mapChangedBlock(options: {
  current?: TenderEditorManagedBlock;
  previous?: TenderEditorManagedBlock;
  changeType: TenderEditorReconciliationBlock['change_type'];
}): TenderEditorReconciliationBlock {
  const basis = options.current ?? options.previous;

  if (!basis) {
    throw new Error('Reconciliation block requires current or previous managed block.');
  }

  return {
    block_id: basis.block_id,
    marker_key: basis.marker_key,
    import_group: basis.import_group,
    target_kind: basis.target_kind,
    target_label: basis.target_label,
    title: basis.title,
    change_type: options.changeType,
    current_content_md: options.current?.content_md ?? null,
    previous_content_md: options.previous?.content_md ?? null,
    current_item_count: options.current?.item_count ?? null,
    previous_item_count: options.previous?.item_count ?? null,
    owned_by_adapter: true,
  };
}

export function buildTenderEditorImportPayloadHash(payload: TenderEditorImportPayload) {
  return createDeterministicHash(stableStringify(buildManagedSurface(payload)));
}

export function resolveTenderDraftPackageReimportStatus(options: {
  draftPackage: TenderDraftPackage;
  currentPayloadHash: string;
  latestSuccessfulRun?: TenderDraftPackageImportRun | null;
}) {
  if (options.draftPackage.importStatus === 'failed') {
    return 'import_failed' as const;
  }

  if (!options.draftPackage.importedQuoteId || options.draftPackage.importStatus === 'not_imported') {
    return 'never_imported' as const;
  }

  const lastKnownHash = options.draftPackage.lastImportPayloadHash
    ?? options.latestSuccessfulRun?.payload_hash
    ?? null;

  if (lastKnownHash && lastKnownHash === options.currentPayloadHash) {
    return 'up_to_date' as const;
  }

  return 'stale' as const;
}

export function buildTenderDraftPackageImportState(options: {
  draftPackage: TenderDraftPackage;
  preview: TenderEditorImportPreview;
  latestRun?: TenderDraftPackageImportRun | null;
  latestSuccessfulRun?: TenderDraftPackageImportRun | null;
  targetQuoteId?: string | null;
  targetQuoteTitle?: string | null;
  targetProjectId?: string | null;
  targetCustomerId?: string | null;
}): TenderDraftPackageImportState {
  const suggestedImportMode: TenderEditorImportMode = options.draftPackage.importedQuoteId && options.targetQuoteId
    ? 'update_existing_quote'
    : 'create_new_quote';
  const reimportStatus = resolveTenderDraftPackageReimportStatus({
    draftPackage: options.draftPackage,
    currentPayloadHash: options.preview.payload_hash,
    latestSuccessfulRun: options.latestSuccessfulRun,
  });

  return tenderDraftPackageImportStateSchema.parse({
    draft_package_id: options.draftPackage.id,
    import_status: options.draftPackage.importStatus,
    reimport_status: reimportStatus,
    import_revision: options.draftPackage.importRevision,
    current_payload_hash: options.preview.payload_hash,
    last_import_payload_hash: options.draftPackage.lastImportPayloadHash ?? options.latestSuccessfulRun?.payload_hash ?? null,
    imported_quote_id: options.draftPackage.importedQuoteId ?? null,
    imported_at: options.draftPackage.importedAt ?? null,
    target_quote_id: options.targetQuoteId ?? null,
    target_quote_title: options.targetQuoteTitle ?? options.preview.payload.metadata.target_quote_title,
    target_project_id: options.targetProjectId ?? null,
    target_customer_id: options.targetCustomerId ?? null,
    can_import: options.preview.validation.can_import,
    can_reimport: options.preview.validation.can_import && suggestedImportMode === 'update_existing_quote',
    suggested_import_mode: suggestedImportMode,
    latest_run: options.latestRun ?? null,
  });
}

export function buildTenderEditorReconciliationPreview(options: {
  draftPackage: TenderDraftPackage;
  preview: TenderEditorImportPreview;
  latestSuccessfulRun?: TenderDraftPackageImportRun | null;
  targetQuoteId?: string | null;
  targetQuoteTitle?: string | null;
  importMode: TenderEditorImportMode;
}): TenderEditorReconciliationPreview {
  const currentManagedBlocks = buildTenderEditorManagedSurfaceFromPayload(options.preview.payload).blocks;
  const currentEntries = buildManagedEntries(options.preview.payload.items);
  const previousPayload = options.latestSuccessfulRun?.payload_snapshot ?? null;
  const previousManagedBlocks = previousPayload ? buildTenderEditorManagedSurfaceFromPayload(previousPayload).blocks : [];
  const previousEntries = previousPayload ? buildManagedEntries(previousPayload.items) : [];
  const previousBlocksById = new Map(previousManagedBlocks.map((block) => [block.block_id, block]));
  const previousEntriesByKey = new Map(previousEntries.map((entry) => [entry.key, entry]));
  const currentBlocksById = new Map(currentManagedBlocks.map((block) => [block.block_id, block]));
  const currentEntriesByKey = new Map(currentEntries.map((entry) => [entry.key, entry]));
  const blocks: TenderEditorReconciliationBlock[] = [];
  const entries: TenderEditorReconciliationEntry[] = [];
  let addedCount = 0;
  let changedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;
  let addedBlocks = 0;
  let changedBlocks = 0;
  let removedBlocks = 0;
  let unchangedBlocks = 0;

  currentManagedBlocks.forEach((block) => {
    const previousBlock = previousBlocksById.get(block.block_id);

    if (!previousBlock) {
      blocks.push(mapChangedBlock({ current: block, changeType: 'added' }));
      addedBlocks += 1;
      return;
    }

    if (
      previousBlock.title !== block.title
      || previousBlock.target_kind !== block.target_kind
      || previousBlock.content_md !== block.content_md
      || previousBlock.item_count !== block.item_count
    ) {
      blocks.push(mapChangedBlock({ current: block, previous: previousBlock, changeType: 'changed' }));
      changedBlocks += 1;
      return;
    }

    blocks.push(mapChangedBlock({ current: block, previous: previousBlock, changeType: 'unchanged' }));
    unchangedBlocks += 1;
  });

  previousManagedBlocks.forEach((block) => {
    if (currentBlocksById.has(block.block_id)) {
      return;
    }

    blocks.push(mapChangedBlock({ previous: block, changeType: 'removed' }));
    removedBlocks += 1;
  });

  currentEntries.forEach((entry) => {
    const previousEntry = previousEntriesByKey.get(entry.key);

    if (!previousEntry) {
      entries.push(mapChangedEntry({ current: entry, changeType: 'added' }));
      addedCount += 1;
      return;
    }

    if (previousEntry.title !== entry.title || previousEntry.content_md !== entry.content_md) {
      entries.push(mapChangedEntry({ current: entry, previous: previousEntry, changeType: 'changed' }));
      changedCount += 1;
      return;
    }

    entries.push(mapChangedEntry({ current: entry, previous: previousEntry, changeType: 'unchanged' }));
    unchangedCount += 1;
  });

  previousEntries.forEach((entry) => {
    if (currentEntriesByKey.has(entry.key)) {
      return;
    }

    entries.push(mapChangedEntry({ previous: entry, changeType: 'removed' }));
    removedCount += 1;
  });

  const reimportStatus = resolveTenderDraftPackageReimportStatus({
    draftPackage: options.draftPackage,
    currentPayloadHash: options.preview.payload_hash,
    latestSuccessfulRun: options.latestSuccessfulRun,
  });
  const warnings: string[] = [];

  if (options.importMode === 'update_existing_quote' && !previousPayload) {
    warnings.push('Aiemman importin payload-snapshot puuttuu, joten diff on best-effort-muotoinen.');
  }

  if (
    previousPayload
    && options.preview.payload_hash !== options.latestSuccessfulRun?.payload_hash
    && addedBlocks === 0
    && changedBlocks === 0
    && removedBlocks === 0
  ) {
    warnings.push('Managed surface muuttui vain lohkojen järjestyksen tai koostetun tekstin tasolla.');
  }

  if (reimportStatus === 'up_to_date') {
    warnings.push('Luonnospaketti vastaa viimeisintä onnistunutta importia. Re-import olisi no-op.');
  }

  if (options.importMode === 'create_new_quote') {
    warnings.push('Tälle luonnospaketille ei ole vielä importoitua target-quotea, joten seuraava ajo luo uuden turvallisen tarjousluonnoksen.');
  }

  return tenderEditorReconciliationPreviewSchema.parse({
    draft_package_id: options.draftPackage.id,
    target_quote_id: options.targetQuoteId ?? null,
    target_quote_title: options.targetQuoteTitle ?? options.preview.payload.metadata.target_quote_title,
    import_mode: options.importMode,
    reimport_status: reimportStatus,
    current_payload_hash: options.preview.payload_hash,
    previous_payload_hash: options.latestSuccessfulRun?.payload_hash ?? null,
    added_count: addedCount,
    changed_count: changedCount,
    removed_count: removedCount,
    unchanged_count: unchangedCount,
    added_blocks: addedBlocks,
    changed_blocks: changedBlocks,
    removed_blocks: removedBlocks,
    unchanged_blocks: unchangedBlocks,
    can_reimport: options.preview.validation.can_import && options.importMode === 'update_existing_quote',
    warnings,
    blocks,
    entries,
  });
}