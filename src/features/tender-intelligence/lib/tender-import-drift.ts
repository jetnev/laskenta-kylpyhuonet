import type { Quote, QuoteRow } from '@/lib/types';

import type {
  TenderEditorImportTargetKind,
  TenderEditorManagedBlock,
  TenderEditorManagedBlockDriftStatus,
  TenderEditorManagedBlockId,
  TenderImportOwnedBlock,
} from '../types/tender-editor-import';
import {
  extractTenderEditorManagedTextBlockContent,
  findTenderEditorManagedSectionRow,
  hasTenderEditorManagedSectionRow,
  hasTenderEditorManagedTextBlock,
} from './tender-editor-managed-markers';
import {
  buildTenderImportOwnedBlockAppliedContentHash,
  buildTenderImportOwnedBlockBaselines,
  buildTenderImportOwnedBlockPayloadHash,
  type TenderImportOwnedBlockBaseline,
  type TenderImportOwnershipFallbackMeta,
} from './tender-import-ownership-registry';

function getQuoteFieldValue(quote: Quote | null, targetField: TenderEditorImportTargetKind) {
  if (!quote) {
    return null;
  }

  return targetField === 'quote_notes_section' ? quote.notes ?? null : quote.internalNotes ?? null;
}

export interface TenderImportOwnedBlockQuoteSnapshot {
  contentMd: string | null;
  sectionTitle: string | null;
  contentHash: string | null;
  textMarkerPresent: boolean;
  sectionRowPresent: boolean;
}

export interface TenderImportOwnedBlockDriftState {
  blockId: TenderEditorManagedBlockId;
  currentBlock: TenderEditorManagedBlock | null;
  baseline: TenderImportOwnedBlockBaseline | null;
  quoteSnapshot: TenderImportOwnedBlockQuoteSnapshot;
  currentPayloadHash: string | null;
  currentAppliedContentHash: string | null;
  lastAppliedContentHash: string | null;
  lastSeenQuoteContentHash: string | null;
  driftStatus: TenderEditorManagedBlockDriftStatus;
  isConflict: boolean;
  manualQuoteEditDetected: boolean;
  safeToUpdate: boolean;
  safeToRemove: boolean;
}

export function readTenderImportOwnedBlockQuoteSnapshot(options: {
  quote: Quote | null;
  rows: QuoteRow[];
  markerKey: string;
  targetField: TenderEditorImportTargetKind;
  targetSectionKey: string | null;
}) {
  const currentFieldValue = getQuoteFieldValue(options.quote, options.targetField);
  const contentMd = extractTenderEditorManagedTextBlockContent(currentFieldValue, options.markerKey);
  const sectionRow = findTenderEditorManagedSectionRow(options.rows, options.targetSectionKey);
  const sectionTitle = sectionRow?.productName?.trim() ? sectionRow.productName.trim() : null;
  const textMarkerPresent = hasTenderEditorManagedTextBlock(currentFieldValue, options.markerKey);
  const sectionRowPresent = hasTenderEditorManagedSectionRow(options.rows, options.targetSectionKey);

  return {
    contentMd,
    sectionTitle,
    contentHash: textMarkerPresent || sectionRowPresent
      ? buildTenderImportOwnedBlockAppliedContentHash({
          targetField: options.targetField,
          title: sectionTitle,
          contentMd,
        })
      : null,
    textMarkerPresent,
    sectionRowPresent,
  } satisfies TenderImportOwnedBlockQuoteSnapshot;
}

export function classifyTenderImportOwnedBlockDrift(options: {
  currentBlock: TenderEditorManagedBlock | null;
  baseline: TenderImportOwnedBlockBaseline | null;
  quoteSnapshot: TenderImportOwnedBlockQuoteSnapshot;
}): TenderEditorManagedBlockDriftStatus {
  if (!options.baseline) {
    return options.currentBlock ? 'changed_in_draft' : 'registry_stale';
  }

  if (options.baseline.source !== 'registry') {
    return 'registry_stale';
  }

  if (!options.quoteSnapshot.textMarkerPresent || !options.quoteSnapshot.sectionRowPresent) {
    return options.currentBlock ? 'removed_from_quote' : 'orphaned_registry';
  }

  if (!options.baseline.lastAppliedContentHash) {
    return 'registry_stale';
  }

  const currentAppliedContentHash = options.currentBlock
    ? buildTenderImportOwnedBlockAppliedContentHash({
        targetField: options.currentBlock.target_kind,
        title: options.currentBlock.title,
        contentMd: options.currentBlock.content_md,
      })
    : null;
  const draftChanged = options.currentBlock
    ? currentAppliedContentHash !== options.baseline.lastAppliedContentHash
    : true;
  const quoteChanged = options.quoteSnapshot.contentHash !== options.baseline.lastAppliedContentHash;

  if (draftChanged && quoteChanged) {
    return 'changed_in_both';
  }

  if (draftChanged) {
    return 'changed_in_draft';
  }

  if (quoteChanged) {
    return 'changed_in_quote';
  }

  return 'up_to_date';
}

export function buildTenderImportOwnedBlockDriftStates(options: {
  draftPackageId: string;
  currentBlocks: TenderEditorManagedBlock[];
  ownedBlocks: TenderImportOwnedBlock[];
  fallbackBlocks: TenderEditorManagedBlock[];
  fallbackMeta: TenderImportOwnershipFallbackMeta;
  quote: Quote | null;
  rows: QuoteRow[];
}) {
  const currentBlocksById = new Map(options.currentBlocks.map((block) => [block.block_id, block]));
  const baselines = buildTenderImportOwnedBlockBaselines({
    draftPackageId: options.draftPackageId,
    ownedBlocks: options.ownedBlocks,
    fallbackBlocks: options.fallbackBlocks,
    fallbackMeta: options.fallbackMeta,
    quote: options.quote,
    rows: options.rows,
  });
  const baselinesById = new Map(baselines.map((baseline) => [baseline.blockId, baseline]));
  const blockIds = [...new Set([
    ...options.currentBlocks.map((block) => block.block_id),
    ...baselines.map((baseline) => baseline.blockId),
  ])];

  return blockIds.map((blockId) => {
    const currentBlock = currentBlocksById.get(blockId) ?? null;
    const baseline = baselinesById.get(blockId) ?? null;
    const markerKey = currentBlock?.marker_key ?? baseline?.markerKey ?? `${options.draftPackageId}:${blockId}`;
    const targetField = currentBlock?.target_kind ?? baseline?.targetField ?? 'quote_notes_section';
    const targetSectionKey = baseline?.targetSectionKey ?? null;
    const quoteSnapshot = readTenderImportOwnedBlockQuoteSnapshot({
      quote: options.quote,
      rows: options.rows,
      markerKey,
      targetField,
      targetSectionKey,
    });
    const driftStatus = classifyTenderImportOwnedBlockDrift({
      currentBlock,
      baseline,
      quoteSnapshot,
    });
    const isConflict = driftStatus === 'changed_in_quote'
      || driftStatus === 'changed_in_both'
      || driftStatus === 'removed_from_quote'
      || driftStatus === 'registry_stale';

    return {
      blockId,
      currentBlock,
      baseline,
      quoteSnapshot,
      currentPayloadHash: currentBlock ? buildTenderImportOwnedBlockPayloadHash(currentBlock) : null,
      currentAppliedContentHash: currentBlock
        ? buildTenderImportOwnedBlockAppliedContentHash({
            targetField: currentBlock.target_kind,
            title: currentBlock.title,
            contentMd: currentBlock.content_md,
          })
        : null,
      lastAppliedContentHash: baseline?.lastAppliedContentHash ?? null,
      lastSeenQuoteContentHash: quoteSnapshot.contentHash,
      driftStatus,
      isConflict,
      manualQuoteEditDetected: driftStatus === 'changed_in_quote'
        || driftStatus === 'changed_in_both'
        || driftStatus === 'removed_from_quote',
      safeToUpdate: Boolean(currentBlock) && !isConflict,
      safeToRemove: !currentBlock && Boolean(baseline) && (driftStatus === 'changed_in_draft' || driftStatus === 'orphaned_registry'),
    } satisfies TenderImportOwnedBlockDriftState;
  });
}