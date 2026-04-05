import type { Quote, QuoteRow } from '@/lib/types';

import type { TenderDraftPackage } from '../types/tender-intelligence';
import {
  type TenderDraftPackageImportRun,
  type TenderDraftPackageImportState,
  type TenderEditorImportItem,
  type TenderEditorImportMode,
  type TenderEditorImportPayload,
  type TenderEditorImportPreview,
  type TenderEditorReconciliationBlock,
  type TenderEditorReconciliationEntry,
  type TenderEditorReconciliationPreview,
  type TenderImportOwnedBlock,
  tenderDraftPackageImportStateSchema,
  tenderEditorReconciliationPreviewSchema,
} from '../types/tender-editor-import';
import { buildTenderEditorManagedSurfaceFromPayload } from './tender-editor-managed-surface';
import {
  buildTenderImportOwnedBlockPayloadHash,
  listTenderEditorManagedMarkerConflicts,
  resolveTenderImportOwnershipRegistryStatus,
} from './tender-import-ownership-registry';
import { buildTenderImportOwnedBlockDriftStates } from './tender-import-drift';

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

function getLatestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

export function buildTenderEditorImportPayloadHash(payload: TenderEditorImportPayload) {
  return createDeterministicHash(stableStringify(buildManagedSurface(payload)));
}

export function resolveTenderDraftPackageReimportStatus(options: {
  draftPackage: TenderDraftPackage;
  currentPayloadHash: string;
  latestSuccessfulRun?: TenderDraftPackageImportRun | null;
  reconciliation?: TenderEditorReconciliationPreview | null;
}) {
  if (options.draftPackage.importStatus === 'failed') {
    return 'import_failed' as const;
  }

  if (!options.draftPackage.importedQuoteId) {
    return 'never_imported' as const;
  }

  if (options.reconciliation) {
    if (options.reconciliation.registry_status !== 'current') {
      return 'stale' as const;
    }

    return options.reconciliation.added_blocks > 0
      || options.reconciliation.changed_blocks > 0
      || options.reconciliation.removed_blocks > 0
      ? 'stale' as const
      : 'up_to_date' as const;
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
  reconciliation?: TenderEditorReconciliationPreview | null;
}): TenderDraftPackageImportState {
  const suggestedImportMode: TenderEditorImportMode = options.draftPackage.importedQuoteId && options.targetQuoteId
    ? 'update_existing_quote'
    : 'create_new_quote';
  const reimportStatus = resolveTenderDraftPackageReimportStatus({
    draftPackage: options.draftPackage,
    currentPayloadHash: options.preview.payload_hash,
    latestSuccessfulRun: options.latestSuccessfulRun,
    reconciliation: options.reconciliation ?? null,
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
    can_reimport: options.preview.validation.can_import
      && suggestedImportMode === 'update_existing_quote'
      && Boolean(options.reconciliation?.can_reimport),
    owned_block_count: options.reconciliation?.registry_active_block_count ?? 0,
    owned_block_last_synced_at: options.reconciliation?.registry_last_synced_at ?? null,
    last_drift_checked_at: options.reconciliation?.last_drift_checked_at ?? null,
    ownership_registry_status: options.reconciliation?.registry_status ?? 'not_available',
    selective_reimport_available: Boolean(options.reconciliation?.selective_reimport_available),
    safe_reimport_now: Boolean(options.reconciliation?.safe_reimport_now),
    manual_quote_edit_detected: Boolean(options.reconciliation?.manual_quote_edit_detected),
    conflict_block_count: options.reconciliation?.conflict_block_count ?? 0,
    missing_in_quote_block_count: options.reconciliation?.missing_in_quote_block_count ?? 0,
    registry_warning_count: options.reconciliation?.warnings.length ?? 0,
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
  ownedBlocks?: TenderImportOwnedBlock[];
  targetQuoteSnapshot?: { quote: Quote | null; rows: QuoteRow[] } | null;
  driftCheckedAt?: string | null;
}): TenderEditorReconciliationPreview {
  const currentManagedBlocks = buildTenderEditorManagedSurfaceFromPayload(options.preview.payload).blocks;
  const currentEntries = buildManagedEntries(options.preview.payload.items);
  const previousPayload = options.latestSuccessfulRun?.payload_snapshot ?? null;
  const previousManagedBlocks = previousPayload ? buildTenderEditorManagedSurfaceFromPayload(previousPayload).blocks : [];
  const previousEntries = previousPayload ? buildManagedEntries(previousPayload.items) : [];
  const currentBlocksById = new Map(currentManagedBlocks.map((block) => [block.block_id, block]));
  const previousBlocksById = new Map(previousManagedBlocks.map((block) => [block.block_id, block]));
  const previousEntriesByKey = new Map(previousEntries.map((entry) => [entry.key, entry]));
  const currentEntriesByKey = new Map(currentEntries.map((entry) => [entry.key, entry]));
  const quote = options.targetQuoteSnapshot?.quote ?? null;
  const rows = options.targetQuoteSnapshot?.rows ?? [];
  const ownedBlocks = options.ownedBlocks ?? [];
  const driftStates = buildTenderImportOwnedBlockDriftStates({
    draftPackageId: options.preview.payload.source_draft_package_id,
    currentBlocks: currentManagedBlocks,
    ownedBlocks,
    fallbackBlocks: previousManagedBlocks,
    fallbackMeta: {
      importRunId: options.latestSuccessfulRun?.id ?? null,
      revision: Math.max(options.draftPackage.importRevision, 1),
      lastSyncedAt: options.latestSuccessfulRun?.created_at ?? options.draftPackage.importedAt ?? null,
    },
    quote,
    rows,
  });
  const effectiveOwnedBlocks = driftStates.flatMap((state) => (state.baseline ? [state.baseline] : []));
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

  driftStates.forEach((driftState) => {
    const currentBlock = currentBlocksById.get(driftState.blockId) ?? driftState.currentBlock ?? null;
    const previousBlock = previousBlocksById.get(driftState.blockId) ?? null;
    const effectiveOwnedBlock = driftState.baseline;
    const currentPayloadHash = currentBlock ? buildTenderImportOwnedBlockPayloadHash(currentBlock) : null;
    const warnings: string[] = [];
    const targetKind = currentBlock?.target_kind ?? effectiveOwnedBlock?.targetField ?? previousBlock?.target_kind ?? 'quote_notes_section';
    const targetLabel = currentBlock?.target_label
      ?? previousBlock?.target_label
      ?? (targetKind === 'quote_internal_notes_section'
        ? 'Tarjouksen internalNotes-kenttä'
        : 'Tarjouksen notes-kenttä');

    if (effectiveOwnedBlock?.source === 'registry') {
      if (driftState.driftStatus === 'changed_in_quote') {
        warnings.push('Quote-puolen managed block on muuttunut käsin viime importin jälkeen. Blokkia ei päivitetä oletuksena ilman overridea.');
      } else if (driftState.driftStatus === 'changed_in_both') {
        warnings.push('Sekä draft payload että quote-puolen managed block ovat muuttuneet. Blokkia ei ylikirjoiteta oletuksena.');
      } else if (driftState.driftStatus === 'removed_from_quote') {
        warnings.push('Managed block puuttuu quote-puolelta, vaikka registry pitää sitä aktiivisena. Override tarvitaan blokin palauttamiseen.');
      } else if (driftState.driftStatus === 'registry_stale') {
        warnings.push('Registryltä puuttuu riittävä applied-content hash drift-tarkistusta varten. Blokkia ei käsitellä turvallisena oletuksena.');
      } else if (driftState.driftStatus === 'orphaned_registry') {
        warnings.push('Registry sisältää aktiivisen rivin blokille, jota ei enää löydy draftista eikä quotesta.');
      }
    }

    if (effectiveOwnedBlock?.source === 'latest_successful_run') {
      warnings.push('Ownership registry puuttuu; lohkon ownership perustuu viimeisimpään onnistuneeseen import-snapshotiin.');
    }

    let changeType: TenderEditorReconciliationBlock['change_type'] = 'unchanged';

    if (currentBlock && !effectiveOwnedBlock) {
      changeType = 'added';
      addedBlocks += 1;
    } else if (!currentBlock && effectiveOwnedBlock) {
      changeType = 'removed';
      removedBlocks += 1;
    } else if (currentBlock && effectiveOwnedBlock && currentPayloadHash !== effectiveOwnedBlock.payloadHash) {
      changeType = 'changed';
      changedBlocks += 1;
    } else {
      unchangedBlocks += 1;
    }

    const canSelectForUpdate = Boolean(currentBlock) && (changeType !== 'unchanged' || driftState.driftStatus !== 'up_to_date');
    const canSelectForRemoval = !currentBlock && Boolean(effectiveOwnedBlock);
    const selectedForUpdate = canSelectForUpdate && !driftState.isConflict && changeType !== 'unchanged';
    const selectedForRemoval = canSelectForRemoval && (driftState.driftStatus === 'changed_in_draft' || driftState.driftStatus === 'orphaned_registry');

    blocks.push({
      block_id: driftState.blockId,
      marker_key: currentBlock?.marker_key ?? effectiveOwnedBlock?.markerKey ?? previousBlock?.marker_key ?? `${options.preview.payload.source_draft_package_id}:${driftState.blockId}`,
      import_group: currentBlock?.import_group ?? previousBlock?.import_group ?? driftState.blockId,
      target_kind: targetKind,
      target_label: targetLabel,
      title: currentBlock?.title ?? previousBlock?.title ?? effectiveOwnedBlock?.blockTitle ?? driftState.blockId,
      change_type: changeType,
      current_content_md: currentBlock?.content_md ?? null,
      previous_content_md: previousBlock?.content_md ?? null,
      quote_content_md: driftState.quoteSnapshot.contentMd,
      quote_section_title: driftState.quoteSnapshot.sectionTitle,
      quote_content_hash: driftState.quoteSnapshot.contentHash,
      current_item_count: currentBlock?.item_count ?? null,
      previous_item_count: previousBlock?.item_count ?? null,
      registry_entry_id: effectiveOwnedBlock?.persistedRow?.id ?? null,
      registry_revision: effectiveOwnedBlock?.revision ?? null,
      registry_last_synced_at: effectiveOwnedBlock?.lastSyncedAt ?? null,
      last_applied_content_hash: driftState.lastAppliedContentHash,
      last_seen_quote_content_hash: driftState.lastSeenQuoteContentHash,
      drift_status: driftState.driftStatus,
      is_conflict: driftState.isConflict,
      can_override_conflict: driftState.isConflict && (canSelectForUpdate || canSelectForRemoval),
      ownership_source: effectiveOwnedBlock?.source ?? 'current_payload',
      text_marker_present: driftState.quoteSnapshot.textMarkerPresent,
      section_row_present: driftState.quoteSnapshot.sectionRowPresent,
      can_select_for_update: canSelectForUpdate,
      can_select_for_removal: canSelectForRemoval,
      selected_for_update: selectedForUpdate,
      selected_for_removal: selectedForRemoval,
      selected_conflict_override: false,
      warnings,
      owned_by_adapter: true,
    });
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

  const actionableBlocks = blocks.filter((block) => block.can_select_for_update || block.can_select_for_removal);
  const conflictBlocks = blocks.filter((block) => block.is_conflict);
  const missingInQuoteBlocks = blocks.filter((block) => block.drift_status === 'removed_from_quote');
  const registryStaleBlocks = blocks.filter((block) => block.drift_status === 'registry_stale' || block.drift_status === 'orphaned_registry');
  const safeUpdateBlocks = blocks.filter((block) => block.can_select_for_update && !block.is_conflict);
  const defaultUpdateBlockIds = actionableBlocks
    .filter((block) => block.selected_for_update)
    .map((block) => block.block_id);
  const defaultRemoveBlockIds = actionableBlocks
    .filter((block) => block.selected_for_removal)
    .map((block) => block.block_id);
  const defaultOverrideConflictBlockIds = actionableBlocks
    .filter((block) => block.selected_conflict_override)
    .map((block) => block.block_id);
  const markerConflicts = listTenderEditorManagedMarkerConflicts({
    draftPackageId: options.preview.payload.source_draft_package_id,
    quote,
    rows,
    expectedMarkerKeys: effectiveOwnedBlocks.map((block) => block.markerKey),
    expectedSectionRowKeys: effectiveOwnedBlocks.map((block) => block.targetSectionKey ?? ''),
  });
  const warnings: string[] = [];

  if (options.importMode === 'update_existing_quote' && !previousPayload) {
    warnings.push('Aiemman importin payload-snapshot puuttuu, joten diff on best-effort-muotoinen.');
  }

  if (effectiveOwnedBlocks.some((block) => block.source === 'latest_successful_run')) {
    warnings.push('Ownership registry puuttuu vielä tältä importilta. Ensimmäinen Phase 15 -re-import bootstraptaa registryrivistön viimeisimmän onnistuneen import-snapshotin pohjalta.');
  }

  if (markerConflicts.extraMarkerKeys.length > 0) {
    warnings.push(`Quote sisältää ${markerConflicts.extraMarkerKeys.length} Tarjousälyn markeria, joille ei löytynyt aktiivista ownership registry -riviä.`);
  }

  if (markerConflicts.extraSectionKeys.length > 0) {
    warnings.push(`Quote sisältää ${markerConflicts.extraSectionKeys.length} Tarjousälyn section-riviä, joita registry ei enää tunne.`);
  }

  const manualQuoteEditCount = blocks.filter((block) => block.drift_status === 'changed_in_quote' || block.drift_status === 'changed_in_both').length;
  const registryConflictCount = blocks.filter((block) => block.warnings.length > 0 && block.ownership_source === 'registry').length;

  if (registryConflictCount > 0) {
    warnings.push(`${registryConflictCount} registry-lohkolla editorin nykyinen managed surface ei vastaa tallennettua ownership-mappia.`);
  }

  if (manualQuoteEditCount > 0) {
    warnings.push(`${manualQuoteEditCount} managed blockia on muuttunut quote-puolella käsin viime importin jälkeen.`);
  }

  if (missingInQuoteBlocks.length > 0) {
    warnings.push(`${missingInQuoteBlocks.length} registry-blokkia puuttuu quote-puolelta ja vaatii eksplisiittisen override-päivityksen tai siivouksen.`);
  }

  if (options.importMode === 'create_new_quote') {
    warnings.push('Tälle luonnospaketille ei ole vielä importoitua target-quotea, joten seuraava ajo luo uuden turvallisen tarjousluonnoksen.');
  }

  const registryStatus = resolveTenderImportOwnershipRegistryStatus({
    importedQuoteId: options.draftPackage.importedQuoteId,
    registryRows: ownedBlocks,
    effectiveOwnedBlocks,
    warnings,
    actionableBlockIds: actionableBlocks.map((block) => block.block_id),
    conflictBlockIds: conflictBlocks.map((block) => block.block_id),
    registryIssueBlockIds: registryStaleBlocks.map((block) => block.block_id),
  });
  const registryLastSyncedAt = getLatestTimestamp([
    ...ownedBlocks.filter((row) => row.is_active).map((row) => row.last_synced_at),
    ...effectiveOwnedBlocks.map((block) => block.lastSyncedAt),
  ]);
  const lastDriftCheckedAt = options.driftCheckedAt ?? getLatestTimestamp([
    ...ownedBlocks.filter((row) => row.is_active).map((row) => row.last_drift_checked_at),
    ...effectiveOwnedBlocks.map((block) => block.lastDriftCheckedAt),
  ]);
  const selectiveReimportAvailable = options.importMode === 'update_existing_quote'
    && Boolean(options.targetQuoteId)
    && options.preview.validation.can_import;
  const canReimport = selectiveReimportAvailable && actionableBlocks.length > 0;
  const safeReimportNow = selectiveReimportAvailable
    && conflictBlocks.length === 0
    && missingInQuoteBlocks.length === 0
    && registryStaleBlocks.length === 0;
  const reimportStatus = options.draftPackage.importStatus === 'failed'
    ? 'import_failed'
    : !options.draftPackage.importedQuoteId
      ? 'never_imported'
      : registryStatus !== 'current' || actionableBlocks.length > 0
        ? 'stale'
        : 'up_to_date';

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
    can_reimport: canReimport,
    registry_status: registryStatus,
    registry_active_block_count: effectiveOwnedBlocks.length,
    registry_last_synced_at: registryLastSyncedAt,
    last_drift_checked_at: lastDriftCheckedAt,
    selective_reimport_available: selectiveReimportAvailable,
    safe_reimport_now: safeReimportNow,
    manual_quote_edit_detected: manualQuoteEditCount > 0 || missingInQuoteBlocks.length > 0,
    safe_update_block_count: safeUpdateBlocks.length,
    conflict_block_count: conflictBlocks.length,
    missing_in_quote_block_count: missingInQuoteBlocks.length,
    registry_stale_block_count: registryStaleBlocks.length,
    skipped_block_count: actionableBlocks.length - defaultUpdateBlockIds.length - defaultRemoveBlockIds.length,
    default_update_block_ids: defaultUpdateBlockIds,
    default_remove_block_ids: defaultRemoveBlockIds,
    default_override_conflict_block_ids: defaultOverrideConflictBlockIds,
    warnings,
    blocks,
    entries,
  });
}