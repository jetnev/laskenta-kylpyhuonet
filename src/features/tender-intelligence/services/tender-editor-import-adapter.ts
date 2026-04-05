import type { SupabaseClient } from '@supabase/supabase-js';

import type { Customer, Project, Quote, QuoteRow } from '@/lib/types';

import type { TenderPackageDetails } from '../types/tender-intelligence';
import type {
  TenderEditorImportRunExecutionMetadata,
  TenderEditorManagedBlockId,
  TenderEditorImportMode,
  TenderEditorImportPreview,
  TenderEditorImportResult,
  TenderEditorImportTargetKind,
  TenderEditorManagedBlock,
  TenderEditorReimportConflictPolicy,
  TenderImportOwnedBlock,
} from '../types/tender-editor-import';
import { buildTenderEditorManagedSurfaceFromPayload } from '../lib/tender-editor-managed-surface';
import {
  buildTenderEditorManagedSectionRowKey,
  getTenderEditorManagedTextBlockMarkers,
  parseTenderEditorManagedSectionRowKey,
} from '../lib/tender-editor-managed-markers';
import { buildTenderImportOwnedBlockBaselines } from '../lib/tender-import-ownership-registry';
import { buildTenderImportOwnedBlockDriftStates } from '../lib/tender-import-drift';
const DEFAULT_VAT_PERCENT = 25.5;
const DEFAULT_MARGIN_PERCENT = 30;
const DEFAULT_VALIDITY_DAYS = 30;
const DEFAULT_REGION_COEFFICIENT = 1;
const LEGACY_MANAGED_QUOTE_NOTES_BLOCK_ID = 'quote_notes';
const LEGACY_MANAGED_INTERNAL_NOTES_BLOCK_ID = 'quote_internal_notes';

const LEGACY_MANAGED_FIELD_MARKER_KEYS: Record<TenderEditorImportTargetKind, string[]> = {
  quote_notes_section: [LEGACY_MANAGED_QUOTE_NOTES_BLOCK_ID],
  quote_internal_notes_section: [LEGACY_MANAGED_INTERNAL_NOTES_BLOCK_ID],
};

type ManagedOwnershipBaseline = ReturnType<typeof buildTenderImportOwnedBlockBaselines>[number];

type UserBucketKey = 'customers' | 'projects' | 'quotes' | 'quote-rows';

interface ResolvedImportTarget {
  customerId: string | null;
  projectId: string | null;
  quoteId: string | null;
  quoteTitle: string | null;
  projectRegionCoefficient: number;
  willCreatePlaceholderTarget: boolean;
  importedQuoteMissing: boolean;
}

interface EnsuredImportTarget extends ResolvedImportTarget {
  customerId: string;
  projectId: string;
  createdPlaceholderTarget: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeContent(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

function buildOwnedAudit(userId: string, timestamp: string) {
  return {
    ownerUserId: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdByUserId: userId,
    updatedByUserId: userId,
  };
}

function getUserRecordId(key: UserBucketKey, userId: string) {
  return `user:${userId}:${key}`;
}

async function readUserBucket<T>(client: SupabaseClient, key: UserBucketKey, userId: string, fallback: T): Promise<T> {
  const { data, error } = await client
    .from('app_kv')
    .select('value')
    .eq('id', getUserRecordId(key, userId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.value == null) {
    return fallback;
  }

  return data.value as T;
}

async function writeUserBucket<T>(client: SupabaseClient, key: UserBucketKey, userId: string, value: T) {
  const { error } = await client.from('app_kv').upsert(
    {
      id: getUserRecordId(key, userId),
      storage_key: key,
      scope: 'user',
      owner_user_id: userId,
      organization_id: null,
      value,
      updated_at: nowIso(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw error;
  }
}

export async function readTenderEditorImportTargetSnapshot(options: {
  client: SupabaseClient;
  actorUserId: string;
  quoteId: string;
}) {
  const quotes = await readUserBucket<Quote[]>(options.client, 'quotes', options.actorUserId, []);
  const rows = await readUserBucket<QuoteRow[]>(options.client, 'quote-rows', options.actorUserId, []);

  return {
    quote: quotes.find((candidate) => candidate.id === options.quoteId) ?? null,
    rows: rows.filter((row) => row.quoteId === options.quoteId),
  };
}

function generateQuoteNumber(prefix = 'TAR') {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  return `${prefix}-${datePart}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function buildPlaceholderCustomer(packageDetails: TenderPackageDetails, actorUserId: string, timestamp: string): Customer {
  return {
    id: crypto.randomUUID(),
    name: 'Tarjousäly-importit',
    contactPerson: undefined,
    email: undefined,
    phone: undefined,
    address: undefined,
    businessId: undefined,
    notes: `Luotu automaattisesti Tarjousälyn editor-importtia varten paketista “${packageDetails.package.name}”.`,
    ...buildOwnedAudit(actorUserId, timestamp),
  };
}

function buildPlaceholderProject(packageDetails: TenderPackageDetails, actorUserId: string, customerId: string, timestamp: string): Project {
  return {
    id: crypto.randomUUID(),
    customerId,
    name: packageDetails.package.name,
    site: packageDetails.package.name,
    region: 'Tarjousäly-import',
    regionCoefficient: DEFAULT_REGION_COEFFICIENT,
    notes: `Luotu automaattisesti Tarjousälyn editor-importtia varten draft packagesta “${packageDetails.package.name}”.`,
    customOptions: [],
    ...buildOwnedAudit(actorUserId, timestamp),
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactTextBlocks(value: string | null | undefined) {
  const nextValue = value?.replace(/\n{3,}/g, '\n\n').trim();
  return nextValue ? nextValue : undefined;
}

function buildManagedTextBlock(markerKey: string, content: string | null | undefined, options?: { legacy?: boolean }) {
  const nextContent = normalizeContent(content);

  if (!nextContent) {
    return null;
  }

  const markers = getTenderEditorManagedTextBlockMarkers(markerKey, options);
  return `${markers.start}\n${nextContent}\n${markers.end}`;
}

function upsertManagedTextBlock(options: {
  existingValue?: string | null;
  markerKey: string;
  content: string | null | undefined;
}) {
  const existingValue = options.existingValue ?? '';
  const nextBlock = buildManagedTextBlock(options.markerKey, options.content);
  const markers = getTenderEditorManagedTextBlockMarkers(options.markerKey);
  const blockPattern = new RegExp(`${escapeRegex(markers.start)}[\\s\\S]*?${escapeRegex(markers.end)}`, 'm');

  if (blockPattern.test(existingValue)) {
    const replaced = nextBlock ? existingValue.replace(blockPattern, nextBlock) : existingValue.replace(blockPattern, '');
    return compactTextBlocks(replaced);
  }

  if (!nextBlock) {
    return compactTextBlocks(existingValue);
  }

  return compactTextBlocks(existingValue ? `${existingValue}\n\n${nextBlock}` : nextBlock);
}

function removeManagedTextBlock(existingValue: string | null | undefined, markerKey: string, options?: { legacy?: boolean }) {
  const currentValue = existingValue ?? '';
  const markers = getTenderEditorManagedTextBlockMarkers(markerKey, options);
  const blockPattern = new RegExp(`${escapeRegex(markers.start)}[\\s\\S]*?${escapeRegex(markers.end)}`, 'm');

  if (!blockPattern.test(currentValue)) {
    return compactTextBlocks(currentValue);
  }

  return compactTextBlocks(currentValue.replace(blockPattern, ''));
}

export function syncTenderEditorManagedBlocks(options: {
  existingValue?: string | null;
  targetKind: TenderEditorImportTargetKind;
  currentBlocks: TenderEditorManagedBlock[];
  effectiveOwnedBlocks: ManagedOwnershipBaseline[];
  selectedUpdateBlockIds: TenderEditorManagedBlockId[];
  selectedRemoveBlockIds: TenderEditorManagedBlockId[];
}) {
  let nextValue = options.existingValue ?? '';
  const selectedUpdateSet = new Set(options.selectedUpdateBlockIds);
  const selectedRemoveSet = new Set(options.selectedRemoveBlockIds);
  const ownedBlocksForTarget = options.effectiveOwnedBlocks.filter((block) => block.targetField === options.targetKind);

  LEGACY_MANAGED_FIELD_MARKER_KEYS[options.targetKind].forEach((markerKey) => {
    nextValue = removeManagedTextBlock(nextValue, markerKey, { legacy: true }) ?? '';
  });

  ownedBlocksForTarget.forEach((block) => {
    if (!selectedRemoveSet.has(block.blockId)) {
      return;
    }

    nextValue = removeManagedTextBlock(nextValue, block.markerKey) ?? '';
  });

  options.currentBlocks
    .filter((block) => block.target_kind === options.targetKind && selectedUpdateSet.has(block.block_id))
    .forEach((block) => {
    nextValue = upsertManagedTextBlock({
      existingValue: nextValue,
      markerKey: block.marker_key,
      content: block.content_md,
    }) ?? '';
    });

  return compactTextBlocks(nextValue);
}

function isLikelyLegacyImportSectionRow(row: QuoteRow) {
  return row.mode === 'section'
    && row.quantity === 0
    && row.purchasePrice === 0
    && row.salesPrice === 0
    && row.installationPrice === 0
    && row.source === 'manual'
    && row.unit === 'erä';
}

function buildQuoteDraft(options: {
  actorUserId: string;
  projectId: string;
  quoteTitle: string;
  preview: TenderEditorImportPreview;
  timestamp: string;
}): Quote {
  const managedSurface = buildTenderEditorManagedSurfaceFromPayload(options.preview.payload);
  const selectedUpdateBlockIds = managedSurface.blocks.map((block) => block.block_id);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + DEFAULT_VALIDITY_DAYS);

  return {
    id: crypto.randomUUID(),
    projectId: options.projectId,
    title: options.quoteTitle,
    quoteNumber: generateQuoteNumber(),
    revisionNumber: 1,
    status: 'draft',
    vatPercent: DEFAULT_VAT_PERCENT,
    validUntil: validUntil.toISOString().slice(0, 10),
    sentAt: undefined,
    acceptedAt: undefined,
    rejectedAt: undefined,
    notes: syncTenderEditorManagedBlocks({
      targetKind: 'quote_notes_section',
      currentBlocks: managedSurface.blocks,
      effectiveOwnedBlocks: [],
      selectedUpdateBlockIds,
      selectedRemoveBlockIds: [],
    }),
    internalNotes: syncTenderEditorManagedBlocks({
      targetKind: 'quote_internal_notes_section',
      currentBlocks: managedSurface.blocks,
      effectiveOwnedBlocks: [],
      selectedUpdateBlockIds,
      selectedRemoveBlockIds: [],
    }),
    schedule: undefined,
    scheduleMilestones: [],
    termsId: undefined,
    termsSnapshotName: undefined,
    termsSnapshotContentMd: undefined,
    discountType: 'none',
    discountValue: 0,
    projectCosts: 0,
    deliveryCosts: 0,
    installationCosts: 0,
    travelKilometers: 0,
    travelRatePerKm: 0,
    disposalCosts: 0,
    demolitionCosts: 0,
    protectionCosts: 0,
    permitCosts: 0,
    selectedMarginPercent: DEFAULT_MARGIN_PERCENT,
    pricingMode: 'margin',
    lastAutoSavedAt: options.timestamp,
    ...buildOwnedAudit(options.actorUserId, options.timestamp),
  };
}

function buildSectionRow(options: {
  actorUserId: string;
  draftPackageId: string;
  quoteId: string;
  regionCoefficient: number;
  blockId: TenderEditorManagedBlockId;
  title: string;
  timestamp: string;
  sortOrder: number;
  existingRow?: QuoteRow;
}) {
  return {
    id: options.existingRow?.id ?? crypto.randomUUID(),
    quoteId: options.quoteId,
    sortOrder: options.sortOrder,
    mode: 'section' as const,
    pricingModel: 'unit_price' as const,
    unitPricingMode: 'manual' as const,
    chargeType: undefined,
    source: 'manual' as const,
    productId: undefined,
    productName: options.title,
    productCode: '',
    description: '',
    quantity: 0,
    unit: 'erä',
    purchasePrice: 0,
    salesPrice: 0,
    installationPrice: 0,
    marginPercent: 0,
    overridePrice: undefined,
    priceAdjustment: 0,
    regionMultiplier: options.regionCoefficient || DEFAULT_REGION_COEFFICIENT,
    installationGroupId: undefined,
    notes: buildTenderEditorManagedSectionRowKey(options.draftPackageId, options.blockId),
    manualSalesPrice: true,
    ownerUserId: options.existingRow?.ownerUserId ?? options.actorUserId,
    createdAt: options.existingRow?.createdAt ?? options.timestamp,
    updatedAt: options.timestamp,
    createdByUserId: options.existingRow?.createdByUserId ?? options.actorUserId,
    updatedByUserId: options.actorUserId,
  } satisfies QuoteRow;
}

function buildSectionRows(options: {
  actorUserId: string;
  draftPackageId: string;
  quoteId: string;
  regionCoefficient: number;
  blocks: Array<{ block_id: TenderEditorManagedBlockId; title: string }>;
  timestamp: string;
  existingRowsByBlockId?: Map<string, QuoteRow>;
  startSortOrder?: number;
}): QuoteRow[] {
  return options.blocks
    .map((block, index) => {
      const existingRow = options.existingRowsByBlockId?.get(block.block_id);

      return buildSectionRow({
        actorUserId: options.actorUserId,
        draftPackageId: options.draftPackageId,
        quoteId: options.quoteId,
        regionCoefficient: options.regionCoefficient,
        blockId: block.block_id,
        title: block.title,
        timestamp: options.timestamp,
        sortOrder: (options.startSortOrder ?? 0) + index,
        existingRow,
      });
    });
}

function getQuoteRowSignature(row: QuoteRow) {
  return JSON.stringify({
    id: row.id,
    quoteId: row.quoteId,
    sortOrder: row.sortOrder,
    mode: row.mode,
    productName: row.productName,
    productCode: row.productCode ?? '',
    notes: row.notes ?? '',
    regionMultiplier: row.regionMultiplier,
  });
}

function replaceManagedSectionRows(options: {
  actorUserId: string;
  draftPackageId: string;
  quoteId: string;
  regionCoefficient: number;
  currentBlocks: TenderEditorManagedBlock[];
  effectiveOwnedBlocks: ManagedOwnershipBaseline[];
  existingRows: QuoteRow[];
  timestamp: string;
  selectedUpdateBlockIds: TenderEditorManagedBlockId[];
  selectedRemoveBlockIds: TenderEditorManagedBlockId[];
}) {
  const currentRows = options.existingRows
    .filter((row) => row.quoteId === options.quoteId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const currentBlocksById = new Map(options.currentBlocks.map((block) => [block.block_id, block]));
  const effectiveOwnedBlocksById = new Map(options.effectiveOwnedBlocks.map((block) => [block.blockId, block]));
  const selectedUpdateSet = new Set(options.selectedUpdateBlockIds);
  const selectedRemoveSet = new Set(options.selectedRemoveBlockIds);
  const hasPersistedRegistry = options.effectiveOwnedBlocks.some((block) => block.source === 'registry');
  const managedRows = currentRows.filter((row) => {
    const marker = parseTenderEditorManagedSectionRowKey(row.notes);
    return row.mode === 'section'
      && marker?.draftPackageId === options.draftPackageId
      && effectiveOwnedBlocksById.has(marker.blockId as TenderEditorManagedBlockId);
  });
  const legacyManagedRows = !hasPersistedRegistry && managedRows.length === 0 && currentRows.length > 0 && currentRows.every(isLikelyLegacyImportSectionRow)
    ? currentRows
    : [];
  const rowsToReplace = managedRows.length > 0 ? managedRows : legacyManagedRows;
  const insertionIndex = rowsToReplace.length > 0 ? Math.min(...rowsToReplace.map((row) => row.sortOrder)) : 0;
  const unmanagedRows = currentRows.filter((row) => !rowsToReplace.some((candidate) => candidate.id === row.id));
  const currentRowsById = new Map(currentRows.map((row) => [row.id, row]));

  const finalizeRows = (managedZoneRows: QuoteRow[]) => {
    const beforeRows = unmanagedRows.filter((row) => row.sortOrder < insertionIndex);
    const afterRows = unmanagedRows.filter((row) => row.sortOrder >= insertionIndex);
    const nextRows = [...beforeRows, ...managedZoneRows, ...afterRows].map((row, index) => {
      const previousRow = currentRowsById.get(row.id);
      const reindexedRow = {
        ...row,
        sortOrder: index,
      };

      if (previousRow && getQuoteRowSignature(previousRow) === getQuoteRowSignature(reindexedRow)) {
        return {
          ...reindexedRow,
          updatedAt: previousRow.updatedAt,
          updatedByUserId: previousRow.updatedByUserId,
        };
      }

      return {
        ...reindexedRow,
        updatedAt: options.timestamp,
        updatedByUserId: options.actorUserId,
      };
    });
    const changed = currentRows.length !== nextRows.length
      || currentRows.some((row, index) => getQuoteRowSignature(row) !== getQuoteRowSignature(nextRows[index]));

    return { rows: nextRows, changed };
  };

  if (legacyManagedRows.length > 0) {
    const orderedBlockIds = [...new Set([
      ...options.currentBlocks.map((block) => block.block_id),
      ...options.effectiveOwnedBlocks.map((block) => block.blockId),
    ])];
    const legacyBlocks = orderedBlockIds.flatMap((blockId) => {
      const currentBlock = currentBlocksById.get(blockId) ?? null;
      const ownedBlock = effectiveOwnedBlocksById.get(blockId) ?? null;

      if (!ownedBlock && currentBlock && selectedUpdateSet.has(blockId)) {
        return [{ block_id: blockId, title: currentBlock.title }];
      }

      if (!currentBlock && ownedBlock && selectedRemoveSet.has(blockId)) {
        return [];
      }

      if (currentBlock && selectedUpdateSet.has(blockId)) {
        return [{ block_id: blockId, title: currentBlock.title }];
      }

      if (ownedBlock) {
        return [{ block_id: blockId, title: ownedBlock.blockTitle }];
      }

      return [];
    });

    return finalizeRows(buildSectionRows({
      actorUserId: options.actorUserId,
      draftPackageId: options.draftPackageId,
      quoteId: options.quoteId,
      regionCoefficient: options.regionCoefficient,
      blocks: legacyBlocks,
      timestamp: options.timestamp,
    }));
  }

  const existingRowsByBlockId = new Map<string, QuoteRow>();

  managedRows.forEach((row) => {
    const marker = parseTenderEditorManagedSectionRowKey(row.notes);

    if (marker) {
      existingRowsByBlockId.set(marker.blockId, row);
    }
  });

  const retainedManagedRows = managedRows.filter((row) => {
    const marker = parseTenderEditorManagedSectionRowKey(row.notes);
    return Boolean(marker)
      && !selectedUpdateSet.has(marker!.blockId as TenderEditorManagedBlockId)
      && !selectedRemoveSet.has(marker!.blockId as TenderEditorManagedBlockId);
  });
  const maxManagedSortOrder = rowsToReplace.length > 0 ? Math.max(...rowsToReplace.map((row) => row.sortOrder)) : insertionIndex - 1;
  const updatedRows = options.currentBlocks
    .filter((block) => selectedUpdateSet.has(block.block_id))
    .map((block, index) => {
      const existingRow = existingRowsByBlockId.get(block.block_id);

      return buildSectionRow({
        actorUserId: options.actorUserId,
        draftPackageId: options.draftPackageId,
        quoteId: options.quoteId,
        regionCoefficient: options.regionCoefficient,
        blockId: block.block_id,
        title: block.title,
        timestamp: options.timestamp,
        sortOrder: existingRow?.sortOrder ?? (maxManagedSortOrder + index + 1),
        existingRow,
      });
    });

  return finalizeRows([
    ...retainedManagedRows,
    ...updatedRows,
  ].sort((left, right) => left.sortOrder - right.sortOrder));
}

function buildImportSummary(options: {
  importMode: TenderEditorImportMode;
  resultStatus: TenderEditorImportResult['result_status'];
  quoteTitle: string;
  executionMetadata?: TenderEditorImportRunExecutionMetadata;
}) {
  if (options.resultStatus === 'no_changes') {
    if (options.executionMetadata && (options.executionMetadata.summary_counts.skipped_conflicts > 0 || options.executionMetadata.summary_counts.missing_in_quote_blocks > 0)) {
      const parts: string[] = [];

      if (options.executionMetadata.summary_counts.skipped_conflicts > 0) {
        parts.push(`${options.executionMetadata.summary_counts.skipped_conflicts} konfliktiblokkia jätettiin suojaan`);
      }

      if (options.executionMetadata.summary_counts.missing_in_quote_blocks > 0) {
        parts.push(`${options.executionMetadata.summary_counts.missing_in_quote_blocks} blokkia puuttui quote-puolelta`);
      }

      return `Suojattu re-import ei muuttanut tarjousta “${options.quoteTitle}”: ${parts.join(' ja ')}.`;
    }

    return `Importoitu tarjous “${options.quoteTitle}” oli jo ajan tasalla.`;
  }

  if (options.importMode === 'update_existing_quote') {
    if (options.executionMetadata) {
      const parts: string[] = [];

      if (options.executionMetadata.summary_counts.updated_blocks > 0) {
        parts.push(`päivitettiin ${options.executionMetadata.summary_counts.updated_blocks} blokkia`);
      }

      if (options.executionMetadata.summary_counts.removed_blocks > 0) {
        parts.push(`poistettiin ${options.executionMetadata.summary_counts.removed_blocks} blokkia`);
      }

      if (options.executionMetadata.summary_counts.skipped_conflicts > 0) {
        parts.push(`jätettiin ${options.executionMetadata.summary_counts.skipped_conflicts} konfliktiblokkia suojaan`);
      }

      if (options.executionMetadata.summary_counts.missing_in_quote_blocks > 0) {
        parts.push(`${options.executionMetadata.summary_counts.missing_in_quote_blocks} blokkia oli jo poistunut quote-puolelta`);
      }

      if (parts.length > 0) {
        return `Suojattu re-import tarjoukseen “${options.quoteTitle}”: ${parts.join(', ')}.`;
      }
    }

    return `Päivitettiin aiemmin importoitu tarjous “${options.quoteTitle}” Tarjousälyn managed surface -alueelta.`;
  }

  return `Luotiin uusi tarjousluonnos “${options.quoteTitle}” Tarjousälyn importia varten.`;
}

function toUniqueBlockIds(blockIds: TenderEditorManagedBlockId[]) {
  return [...new Set(blockIds)];
}

function buildImportExecutionMetadata(options: {
  runMode: TenderEditorImportRunExecutionMetadata['run_mode'];
  conflictPolicy: TenderEditorReimportConflictPolicy;
  currentBlocks: TenderEditorManagedBlock[];
  selectedUpdateBlockIds: TenderEditorManagedBlockId[];
  selectedRemoveBlockIds: TenderEditorManagedBlockId[];
  overrideConflictBlockIds: TenderEditorManagedBlockId[];
  conflictBlockIds: TenderEditorManagedBlockId[];
  updatedBlockIds: TenderEditorManagedBlockId[];
  removedBlockIds: TenderEditorManagedBlockId[];
  skippedConflictBlockIds: TenderEditorManagedBlockId[];
  missingInQuoteBlockIds: TenderEditorManagedBlockId[];
  untouchedBlockIds: TenderEditorManagedBlockId[];
}): TenderEditorImportRunExecutionMetadata {
  const selectedUpdateBlockIds = toUniqueBlockIds(options.selectedUpdateBlockIds);
  const selectedRemoveBlockIds = toUniqueBlockIds(options.selectedRemoveBlockIds);
  const overrideConflictBlockIds = toUniqueBlockIds(options.overrideConflictBlockIds);
  const conflictBlockIds = toUniqueBlockIds(options.conflictBlockIds);
  const updatedBlockIds = toUniqueBlockIds(options.updatedBlockIds);
  const removedBlockIds = toUniqueBlockIds(options.removedBlockIds);
  const skippedConflictBlockIds = toUniqueBlockIds(options.skippedConflictBlockIds);
  const missingInQuoteBlockIds = toUniqueBlockIds(options.missingInQuoteBlockIds);
  const untouchedBlockIds = toUniqueBlockIds(options.untouchedBlockIds);

  return {
    run_type: 'reimport',
    selected_block_ids: toUniqueBlockIds([...selectedUpdateBlockIds, ...selectedRemoveBlockIds]),
    selected_update_block_ids: selectedUpdateBlockIds,
    selected_remove_block_ids: selectedRemoveBlockIds,
    conflict_block_ids: conflictBlockIds,
    skipped_conflict_block_ids: skippedConflictBlockIds,
    override_conflict_block_ids: overrideConflictBlockIds,
    updated_block_ids: updatedBlockIds,
    removed_block_ids: removedBlockIds,
    missing_in_quote_block_ids: missingInQuoteBlockIds,
    untouched_block_ids: untouchedBlockIds,
    affected_block_ids: toUniqueBlockIds([...updatedBlockIds, ...removedBlockIds]),
    orphaned_block_ids: [],
    refreshed_hash_block_ids: [],
    pruned_registry_block_ids: [],
    skipped_block_ids: toUniqueBlockIds([...skippedConflictBlockIds, ...untouchedBlockIds]),
    repair_action: null,
    diagnostics_summary: {
      healthy_blocks: 0,
      stale_blocks: 0,
      orphaned_registry_blocks: 0,
      missing_quote_blocks: missingInQuoteBlockIds.length,
      conflict_blocks: conflictBlockIds.length,
      drifted_quote_blocks: 0,
      drifted_draft_blocks: 0,
      total_registry_blocks: options.currentBlocks.length,
    },
    run_mode: options.runMode,
    conflict_policy: options.conflictPolicy,
    summary_counts: {
      selected_blocks: selectedUpdateBlockIds.length + selectedRemoveBlockIds.length,
      conflict_blocks: conflictBlockIds.length,
      skipped_conflicts: skippedConflictBlockIds.length,
      updated_blocks: updatedBlockIds.length,
      removed_blocks: removedBlockIds.length,
      missing_in_quote_blocks: missingInQuoteBlockIds.length,
      untouched_blocks: untouchedBlockIds.length,
      affected_blocks: updatedBlockIds.length + removedBlockIds.length,
      orphaned_blocks: 0,
      refreshed_hash_blocks: 0,
      pruned_registry_blocks: 0,
      skipped_blocks: skippedConflictBlockIds.length + untouchedBlockIds.length,
      healthy_blocks: 0,
      stale_blocks: 0,
      orphaned_registry_blocks: 0,
      drifted_quote_blocks: 0,
      drifted_draft_blocks: 0,
      total_registry_blocks: options.currentBlocks.length,
    },
  };
}

async function updateExistingImportedQuote(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  preview: TenderEditorImportPreview;
  actorUserId: string;
  quoteId: string;
  currentImportRevision: number;
  ownedBlocks?: TenderImportOwnedBlock[];
  fallbackBlocks?: TenderEditorManagedBlock[];
  previousImportRunId?: string | null;
  previousImportSyncedAt?: string | null;
  selectedUpdateBlockIds?: TenderEditorManagedBlockId[];
  selectedRemoveBlockIds?: TenderEditorManagedBlockId[];
  overrideConflictBlockIds?: TenderEditorManagedBlockId[];
  conflictPolicy?: TenderEditorReimportConflictPolicy;
  resolvedTarget: ResolvedImportTarget;
}): Promise<TenderEditorImportResult | null> {
  const timestamp = nowIso();
  const managedSurface = buildTenderEditorManagedSurfaceFromPayload(options.preview.payload);
  const quotes = await readUserBucket<Quote[]>(options.client, 'quotes', options.actorUserId, []);
  const existingRows = await readUserBucket<QuoteRow[]>(options.client, 'quote-rows', options.actorUserId, []);
  const quote = quotes.find((candidate) => candidate.id === options.quoteId) ?? null;

  if (!quote) {
    return null;
  }

  const selectedUpdateBlockIds = options.selectedUpdateBlockIds ?? managedSurface.blocks.map((block) => block.block_id);
  const selectedRemoveBlockIds = options.selectedRemoveBlockIds ?? [];
  const overrideConflictBlockIds = options.overrideConflictBlockIds ?? [];
  const conflictPolicy = options.conflictPolicy ?? (overrideConflictBlockIds.length > 0 ? 'override_selected_conflicts' : 'protect_conflicts');
  const quoteRows = existingRows.filter((row) => row.quoteId === quote.id);
  const driftStates = buildTenderImportOwnedBlockDriftStates({
    draftPackageId: options.preview.payload.source_draft_package_id,
    currentBlocks: managedSurface.blocks,
    ownedBlocks: options.ownedBlocks ?? [],
    fallbackBlocks: options.fallbackBlocks ?? [],
    fallbackMeta: {
      importRunId: options.previousImportRunId ?? null,
      revision: Math.max(options.currentImportRevision, 1),
      lastSyncedAt: options.previousImportSyncedAt ?? null,
    },
    quote,
    rows: quoteRows,
  });
  const effectiveOwnedBlocks = driftStates.flatMap((state) => (state.baseline ? [state.baseline] : []));
  const driftStatesById = new Map(driftStates.map((state) => [state.blockId, state]));
  const requestedUpdateSet = new Set(selectedUpdateBlockIds);
  const requestedRemoveSet = new Set(selectedRemoveBlockIds);
  const overrideConflictSet = new Set(overrideConflictBlockIds);
  const allowedUpdateBlockIds = selectedUpdateBlockIds.filter((blockId) => {
    const driftState = driftStatesById.get(blockId);

    if (!driftState) {
      return false;
    }

    return !driftState.isConflict || (conflictPolicy === 'override_selected_conflicts' && overrideConflictSet.has(blockId));
  });
  const allowedRemoveBlockIds = selectedRemoveBlockIds.filter((blockId) => {
    const driftState = driftStatesById.get(blockId);

    if (!driftState) {
      return false;
    }

    return !driftState.isConflict || (conflictPolicy === 'override_selected_conflicts' && overrideConflictSet.has(blockId));
  });
  const updatedBlockIds = toUniqueBlockIds(allowedUpdateBlockIds);
  const removedBlockIds = toUniqueBlockIds(allowedRemoveBlockIds);
  const skippedConflictBlockIds = new Set<TenderEditorManagedBlockId>();
  const missingInQuoteBlockIds = new Set<TenderEditorManagedBlockId>();
  const conflictBlockIds = driftStates.filter((state) => state.isConflict).map((state) => state.blockId);
  const allManagedBlockIds = toUniqueBlockIds([
    ...managedSurface.blocks.map((block) => block.block_id),
    ...driftStates.map((state) => state.blockId),
  ]);

  driftStates.forEach((state) => {
    const requestedUpdate = requestedUpdateSet.has(state.blockId);
    const requestedRemove = requestedRemoveSet.has(state.blockId);

    if (requestedUpdate && !updatedBlockIds.includes(state.blockId)) {
      if (state.driftStatus === 'removed_from_quote') {
        missingInQuoteBlockIds.add(state.blockId);
      } else if (state.isConflict) {
        skippedConflictBlockIds.add(state.blockId);
      }

      return;
    }

    if (requestedRemove && !removedBlockIds.includes(state.blockId)) {
      if (state.driftStatus === 'removed_from_quote') {
        missingInQuoteBlockIds.add(state.blockId);
      } else if (state.isConflict) {
        skippedConflictBlockIds.add(state.blockId);
      }

      return;
    }

    if (!requestedUpdate && !requestedRemove && state.driftStatus === 'removed_from_quote') {
      missingInQuoteBlockIds.add(state.blockId);
    }
  });

  const untouchedBlockIds = allManagedBlockIds.filter((blockId) => !updatedBlockIds.includes(blockId)
    && !removedBlockIds.includes(blockId)
    && !skippedConflictBlockIds.has(blockId)
    && !missingInQuoteBlockIds.has(blockId));

  const nextNotes = syncTenderEditorManagedBlocks({
    existingValue: quote.notes,
    targetKind: 'quote_notes_section',
    currentBlocks: managedSurface.blocks,
    effectiveOwnedBlocks,
    selectedUpdateBlockIds: updatedBlockIds,
    selectedRemoveBlockIds: removedBlockIds,
  });
  const nextInternalNotes = syncTenderEditorManagedBlocks({
    existingValue: quote.internalNotes,
    targetKind: 'quote_internal_notes_section',
    currentBlocks: managedSurface.blocks,
    effectiveOwnedBlocks,
    selectedUpdateBlockIds: updatedBlockIds,
    selectedRemoveBlockIds: removedBlockIds,
  });
  const nextManagedRows = replaceManagedSectionRows({
    actorUserId: options.actorUserId,
    draftPackageId: options.preview.payload.source_draft_package_id,
    quoteId: quote.id,
    regionCoefficient: options.resolvedTarget.projectRegionCoefficient,
    currentBlocks: managedSurface.blocks,
    effectiveOwnedBlocks,
    existingRows,
    timestamp,
    selectedUpdateBlockIds: updatedBlockIds,
    selectedRemoveBlockIds: removedBlockIds,
  });
  const notesChanged = (quote.notes ?? '') !== (nextNotes ?? '');
  const internalNotesChanged = (quote.internalNotes ?? '') !== (nextInternalNotes ?? '');
  const quoteChanged = notesChanged || internalNotesChanged || nextManagedRows.changed;

  if (quoteChanged) {
    const updatedQuote: Quote = {
      ...quote,
      notes: nextNotes,
      internalNotes: nextInternalNotes,
      updatedAt: timestamp,
      updatedByUserId: options.actorUserId,
      lastAutoSavedAt: timestamp,
    };
    const updatedQuotes = quotes.map((candidate) => (candidate.id === quote.id ? updatedQuote : candidate));
    const updatedRows = [
      ...existingRows.filter((row) => row.quoteId !== quote.id),
      ...nextManagedRows.rows,
    ];

    await writeUserBucket(options.client, 'quotes', options.actorUserId, updatedQuotes);
    await writeUserBucket(options.client, 'quote-rows', options.actorUserId, updatedRows);
  }

  const resultStatus: TenderEditorImportResult['result_status'] = quoteChanged || updatedBlockIds.length > 0 || removedBlockIds.length > 0
    ? 'updated'
    : 'no_changes';
  const executionMetadata = buildImportExecutionMetadata({
    runMode: overrideConflictBlockIds.length > 0 ? 'protected_reimport_with_override' : 'protected_reimport',
    conflictPolicy,
    currentBlocks: managedSurface.blocks,
    selectedUpdateBlockIds,
    selectedRemoveBlockIds,
    overrideConflictBlockIds,
    conflictBlockIds,
    updatedBlockIds,
    removedBlockIds,
    skippedConflictBlockIds: [...skippedConflictBlockIds],
    missingInQuoteBlockIds: [...missingInQuoteBlockIds],
    untouchedBlockIds,
  });

  return {
    draft_package_id: options.preview.payload.source_draft_package_id,
    imported_quote_id: quote.id,
    imported_project_id: quote.projectId,
    imported_customer_id: options.resolvedTarget.customerId,
    created_placeholder_target: false,
    import_mode: 'update_existing_quote',
    result_status: resultStatus,
    payload_hash: options.preview.payload_hash,
    import_revision: resultStatus === 'updated' ? options.currentImportRevision + 1 : options.currentImportRevision,
    summary: buildImportSummary({
      importMode: 'update_existing_quote',
      resultStatus,
      quoteTitle: quote.title,
      executionMetadata,
    }),
    execution_metadata: executionMetadata,
  };
}

export async function resolveTenderEditorImportTarget(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  actorUserId: string;
  importedQuoteId?: string | null;
}): Promise<ResolvedImportTarget> {
  const customers = await readUserBucket<Customer[]>(options.client, 'customers', options.actorUserId, []);
  const projects = await readUserBucket<Project[]>(options.client, 'projects', options.actorUserId, []);
  const quotes = await readUserBucket<Quote[]>(options.client, 'quotes', options.actorUserId, []);
  const importedQuote = options.importedQuoteId
    ? quotes.find((candidate) => candidate.id === options.importedQuoteId) ?? null
    : null;

  if (importedQuote) {
    const importedProject = projects.find((candidate) => candidate.id === importedQuote.projectId) ?? null;
    const importedCustomer = importedProject
      ? customers.find((candidate) => candidate.id === importedProject.customerId) ?? null
      : null;

    return {
      customerId: importedCustomer?.id ?? importedProject?.customerId ?? null,
      projectId: importedQuote.projectId,
      quoteId: importedQuote.id,
      quoteTitle: importedQuote.title,
      projectRegionCoefficient: importedProject?.regionCoefficient ?? DEFAULT_REGION_COEFFICIENT,
      willCreatePlaceholderTarget: false,
      importedQuoteMissing: false,
    };
  }

  const linkedCustomer = options.packageDetails.package.linkedCustomerId
    ? customers.find((candidate) => candidate.id === options.packageDetails.package.linkedCustomerId) ?? null
    : null;
  const linkedProject = options.packageDetails.package.linkedProjectId
    ? projects.find((candidate) => candidate.id === options.packageDetails.package.linkedProjectId) ?? null
    : null;

  return {
    customerId: linkedProject?.customerId ?? linkedCustomer?.id ?? null,
    projectId: linkedProject?.id ?? null,
    quoteId: null,
    quoteTitle: null,
    projectRegionCoefficient: linkedProject?.regionCoefficient ?? DEFAULT_REGION_COEFFICIENT,
    willCreatePlaceholderTarget: !linkedProject,
    importedQuoteMissing: Boolean(options.importedQuoteId),
  };
}

async function ensureTenderEditorImportTarget(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  actorUserId: string;
}): Promise<EnsuredImportTarget> {
  const timestamp = nowIso();
  const customers = await readUserBucket<Customer[]>(options.client, 'customers', options.actorUserId, []);
  const projects = await readUserBucket<Project[]>(options.client, 'projects', options.actorUserId, []);
  let nextCustomers = [...customers];
  let nextProjects = [...projects];
  let customer = options.packageDetails.package.linkedCustomerId
    ? nextCustomers.find((candidate) => candidate.id === options.packageDetails.package.linkedCustomerId) ?? null
    : null;
  let project = options.packageDetails.package.linkedProjectId
    ? nextProjects.find((candidate) => candidate.id === options.packageDetails.package.linkedProjectId) ?? null
    : null;
  let createdPlaceholderTarget = false;

  if (!customer && project) {
    const projectCustomerId = project.customerId;
    customer = nextCustomers.find((candidate) => candidate.id === projectCustomerId) ?? null;
  }

  if (!customer) {
    customer = buildPlaceholderCustomer(options.packageDetails, options.actorUserId, timestamp);
    nextCustomers = [...nextCustomers, customer];
    await writeUserBucket(options.client, 'customers', options.actorUserId, nextCustomers);
    createdPlaceholderTarget = true;
  }

  if (!project) {
    project = buildPlaceholderProject(options.packageDetails, options.actorUserId, customer.id, timestamp);
    nextProjects = [...nextProjects, project];
    await writeUserBucket(options.client, 'projects', options.actorUserId, nextProjects);
    createdPlaceholderTarget = true;
  }

  if (!customer || !project) {
    throw new Error('Tender editor import target could not be resolved.');
  }

  return {
    customerId: customer.id,
    projectId: project.id,
    quoteId: null,
    quoteTitle: null,
    projectRegionCoefficient: project.regionCoefficient || DEFAULT_REGION_COEFFICIENT,
    willCreatePlaceholderTarget: createdPlaceholderTarget,
    importedQuoteMissing: false,
    createdPlaceholderTarget,
  };
}

async function createNewImportedQuote(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  preview: TenderEditorImportPreview;
  actorUserId: string;
  currentImportRevision: number;
}) {
  const timestamp = nowIso();
  const target = await ensureTenderEditorImportTarget({
    client: options.client,
    packageDetails: options.packageDetails,
    actorUserId: options.actorUserId,
  });
  const quotes = await readUserBucket<Quote[]>(options.client, 'quotes', options.actorUserId, []);
  const existingRows = await readUserBucket<QuoteRow[]>(options.client, 'quote-rows', options.actorUserId, []);
  const managedBlocks = buildTenderEditorManagedSurfaceFromPayload(options.preview.payload).blocks;
  const quote = buildQuoteDraft({
    actorUserId: options.actorUserId,
    projectId: target.projectId,
    quoteTitle: options.preview.payload.metadata.target_quote_title,
    preview: options.preview,
    timestamp,
  });
  const sectionRows = buildSectionRows({
    actorUserId: options.actorUserId,
    draftPackageId: options.preview.payload.source_draft_package_id,
    quoteId: quote.id,
    regionCoefficient: target.projectRegionCoefficient,
    blocks: managedBlocks,
    timestamp,
  });
  const selectedUpdateBlockIds = managedBlocks.map((block) => block.block_id);
  const executionMetadata = buildImportExecutionMetadata({
    runMode: 'create_new_quote',
    conflictPolicy: 'protect_conflicts',
    currentBlocks: managedBlocks,
    selectedUpdateBlockIds,
    selectedRemoveBlockIds: [],
    overrideConflictBlockIds: [],
    conflictBlockIds: [],
    updatedBlockIds: selectedUpdateBlockIds,
    removedBlockIds: [],
    skippedConflictBlockIds: [],
    missingInQuoteBlockIds: [],
    untouchedBlockIds: [],
  });

  await writeUserBucket(options.client, 'quotes', options.actorUserId, [...quotes, quote]);
  await writeUserBucket(options.client, 'quote-rows', options.actorUserId, [...existingRows, ...sectionRows]);

  return {
    draft_package_id: options.preview.payload.source_draft_package_id,
    imported_quote_id: quote.id,
    imported_project_id: target.projectId,
    imported_customer_id: target.customerId,
    created_placeholder_target: target.createdPlaceholderTarget,
    import_mode: 'create_new_quote' as const,
    result_status: 'created' as const,
    payload_hash: options.preview.payload_hash,
    import_revision: options.currentImportRevision + 1,
    summary: buildImportSummary({
      importMode: 'create_new_quote',
      resultStatus: 'created',
      quoteTitle: quote.title,
      executionMetadata,
    }),
    execution_metadata: executionMetadata,
  };
}

export async function importTenderDraftPackageToEditor(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  preview: TenderEditorImportPreview;
  actorUserId: string;
  currentImportRevision: number;
  ownedBlocks?: TenderImportOwnedBlock[];
  fallbackBlocks?: TenderEditorManagedBlock[];
  previousImportRunId?: string | null;
  previousImportSyncedAt?: string | null;
  selectedUpdateBlockIds?: TenderEditorManagedBlockId[];
  selectedRemoveBlockIds?: TenderEditorManagedBlockId[];
  overrideConflictBlockIds?: TenderEditorManagedBlockId[];
  conflictPolicy?: TenderEditorReimportConflictPolicy;
}): Promise<TenderEditorImportResult> {
  const resolvedTarget = await resolveTenderEditorImportTarget({
    client: options.client,
    packageDetails: options.packageDetails,
    actorUserId: options.actorUserId,
    importedQuoteId: options.preview.payload.metadata.target_quote_id ?? options.preview.payload.metadata.imported_quote_id ?? null,
  });

  if (resolvedTarget.quoteId) {
    const updatedQuote = await updateExistingImportedQuote({
      client: options.client,
      packageDetails: options.packageDetails,
      preview: options.preview,
      actorUserId: options.actorUserId,
      quoteId: resolvedTarget.quoteId,
      currentImportRevision: options.currentImportRevision,
      ownedBlocks: options.ownedBlocks,
      fallbackBlocks: options.fallbackBlocks,
      previousImportRunId: options.previousImportRunId ?? null,
      previousImportSyncedAt: options.previousImportSyncedAt ?? null,
      selectedUpdateBlockIds: options.selectedUpdateBlockIds,
      selectedRemoveBlockIds: options.selectedRemoveBlockIds,
      overrideConflictBlockIds: options.overrideConflictBlockIds,
      conflictPolicy: options.conflictPolicy,
      resolvedTarget,
    });

    if (updatedQuote) {
      return updatedQuote;
    }
  }

  return createNewImportedQuote({
    client: options.client,
    packageDetails: options.packageDetails,
    preview: options.preview,
    actorUserId: options.actorUserId,
    currentImportRevision: options.currentImportRevision,
  });
}
