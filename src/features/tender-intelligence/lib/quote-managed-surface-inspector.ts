import type { Quote, QuoteRow } from '@/lib/types';

import type { TenderEditorImportTargetKind, TenderEditorManagedBlockId } from '../types/tender-editor-import';
import { TENDER_EDITOR_MANAGED_BLOCK_META, TENDER_EDITOR_MANAGED_BLOCK_ORDER } from './tender-editor-managed-surface';
import {
  TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX,
  TENDER_EDITOR_MANAGED_TEXT_BLOCK_PREFIX,
} from './tender-editor-managed-markers';

export type QuoteTenderManagedSurfaceHealthStatus = 'clean' | 'needs_attention' | 'inconsistent';
export type QuoteTenderManagedField = 'notes' | 'internalNotes' | 'sections';

export interface QuoteTenderManagedBlockDiagnostics {
  marker_key: string;
  draft_package_id: string | null;
  block_id: string;
  known_block_id: TenderEditorManagedBlockId | null;
  title: string;
  expected_target_kind: TenderEditorImportTargetKind | null;
  expected_text_field: 'notes' | 'internalNotes' | null;
  text_fields: Array<'notes' | 'internalNotes'>;
  text_marker_count: number;
  section_row_ids: string[];
  section_row_titles: string[];
  section_row_count: number;
  has_text_marker: boolean;
  has_section_row: boolean;
  unknown_marker: boolean;
  duplicate_marker: boolean;
  probable_drift: boolean;
  health_status: QuoteTenderManagedSurfaceHealthStatus;
}

export interface QuoteTenderManagedSurfaceDiagnostics {
  has_tarjousaly_managed_surface: boolean;
  managed_blocks_total: number;
  managed_sections_total: number;
  managed_notes_blocks_total: number;
  unknown_marker_blocks_total: number;
  duplicate_marker_blocks_total: number;
  probable_drift_blocks_total: number;
  health_status: QuoteTenderManagedSurfaceHealthStatus;
  draft_package_ids: string[];
  primary_draft_package_id: string | null;
  multiple_draft_package_sources: boolean;
  managed_block_ids: string[];
  marker_keys: string[];
  detected_fields: QuoteTenderManagedField[];
  blocks: QuoteTenderManagedBlockDiagnostics[];
}

export interface QuoteTenderManagedSectionState {
  marker_key: string;
  block_id: string;
  title: string;
  draft_package_id: string | null;
  health_status: QuoteTenderManagedSurfaceHealthStatus;
  label: string;
}

interface MutableBlockDiagnostics {
  marker_key: string;
  draft_package_id: string | null;
  block_id: string;
  known_block_id: TenderEditorManagedBlockId | null;
  title: string;
  expected_target_kind: TenderEditorImportTargetKind | null;
  expected_text_field: 'notes' | 'internalNotes' | null;
  text_fields: Set<'notes' | 'internalNotes'>;
  text_marker_count: number;
  section_row_ids: string[];
  section_row_titles: string[];
  section_row_count: number;
}

const EMPTY_DIAGNOSTICS: QuoteTenderManagedSurfaceDiagnostics = {
  has_tarjousaly_managed_surface: false,
  managed_blocks_total: 0,
  managed_sections_total: 0,
  managed_notes_blocks_total: 0,
  unknown_marker_blocks_total: 0,
  duplicate_marker_blocks_total: 0,
  probable_drift_blocks_total: 0,
  health_status: 'clean',
  draft_package_ids: [],
  primary_draft_package_id: null,
  multiple_draft_package_sources: false,
  managed_block_ids: [],
  marker_keys: [],
  detected_fields: [],
  blocks: [],
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseManagedMarkerKey(markerKey: string) {
  const trimmedMarkerKey = markerKey.trim();

  if (!trimmedMarkerKey) {
    return null;
  }

  const [draftPackageId = '', ...blockParts] = trimmedMarkerKey.split(':');
  const blockId = blockParts.join(':').trim();

  if (!draftPackageId || !blockId) {
    return null;
  }

  return {
    draftPackageId,
    blockId,
  };
}

function isKnownManagedBlockId(blockId: string): blockId is TenderEditorManagedBlockId {
  return TENDER_EDITOR_MANAGED_BLOCK_ORDER.includes(blockId as TenderEditorManagedBlockId);
}

function resolveExpectedTextField(targetKind: TenderEditorImportTargetKind | null) {
  if (targetKind === 'quote_internal_notes_section') {
    return 'internalNotes';
  }

  if (targetKind === 'quote_notes_section') {
    return 'notes';
  }

  return null;
}

function createMutableBlockDiagnostics(markerKey: string): MutableBlockDiagnostics {
  const parsedMarkerKey = parseManagedMarkerKey(markerKey);
  const knownBlockId = parsedMarkerKey && isKnownManagedBlockId(parsedMarkerKey.blockId)
    ? parsedMarkerKey.blockId
    : null;
  const blockMeta = knownBlockId ? TENDER_EDITOR_MANAGED_BLOCK_META[knownBlockId] : null;

  return {
    marker_key: markerKey,
    draft_package_id: parsedMarkerKey?.draftPackageId ?? null,
    block_id: parsedMarkerKey?.blockId ?? markerKey,
    known_block_id: knownBlockId,
    title: blockMeta?.title ?? parsedMarkerKey?.blockId ?? markerKey,
    expected_target_kind: blockMeta?.targetKind ?? null,
    expected_text_field: resolveExpectedTextField(blockMeta?.targetKind ?? null),
    text_fields: new Set<'notes' | 'internalNotes'>(),
    text_marker_count: 0,
    section_row_ids: [],
    section_row_titles: [],
    section_row_count: 0,
  };
}

function listManagedTextMarkers(value: string | null | undefined) {
  const content = value ?? '';
  const markerPattern = new RegExp(
    `<!--\\s*${escapeRegex(`${TENDER_EDITOR_MANAGED_TEXT_BLOCK_PREFIX}:block:`)}(.+?)${escapeRegex(':start -->')}`,
    'g',
  );
  const markerKeys: string[] = [];

  let match = markerPattern.exec(content);

  while (match) {
    const markerKey = match[1]?.trim();

    if (markerKey) {
      markerKeys.push(markerKey);
    }

    match = markerPattern.exec(content);
  }

  return markerKeys;
}

function listManagedSectionRows(rows: QuoteRow[]) {
  return rows
    .filter((row) => row.mode === 'section')
    .flatMap((row) => {
      const rawSectionKey = row.notes?.trim();

      if (!rawSectionKey || !rawSectionKey.startsWith(`${TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX}:`)) {
        return [];
      }

      const markerKey = rawSectionKey.slice(`${TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX}:`.length).trim();

      if (!markerKey) {
        return [];
      }

      return [{
        rowId: row.id,
        rowTitle: row.productName,
        markerKey,
      }];
    });
}

function buildBlockDiagnostics(records: MutableBlockDiagnostics[]) {
  return records
    .map((record) => {
      const unknownMarker = !record.known_block_id;
      const duplicateMarker = record.text_marker_count > 1
        || record.section_row_count > 1
        || record.text_fields.size > 1;
      const wrongTextField = Boolean(
        record.expected_text_field
        && record.text_fields.size > 0
        && [...record.text_fields].some((field) => field !== record.expected_text_field),
      );
      const missingSectionRow = !unknownMarker && record.text_marker_count > 0 && record.section_row_count < 1;
      const missingTextMarker = !unknownMarker && record.section_row_count > 0 && record.text_marker_count < 1;
      const sectionTitleMismatch = Boolean(
        record.known_block_id
        && record.section_row_titles.some((title) => title.trim().length > 0 && title.trim() !== record.title),
      );
      const probableDrift = wrongTextField || missingSectionRow || missingTextMarker || sectionTitleMismatch;
      const healthStatus: QuoteTenderManagedSurfaceHealthStatus = unknownMarker || duplicateMarker
        ? 'inconsistent'
        : probableDrift
          ? 'needs_attention'
          : 'clean';

      return {
        marker_key: record.marker_key,
        draft_package_id: record.draft_package_id,
        block_id: record.block_id,
        known_block_id: record.known_block_id,
        title: record.title,
        expected_target_kind: record.expected_target_kind,
        expected_text_field: record.expected_text_field,
        text_fields: [...record.text_fields],
        text_marker_count: record.text_marker_count,
        section_row_ids: record.section_row_ids,
        section_row_titles: record.section_row_titles,
        section_row_count: record.section_row_count,
        has_text_marker: record.text_marker_count > 0,
        has_section_row: record.section_row_count > 0,
        unknown_marker: unknownMarker,
        duplicate_marker: duplicateMarker,
        probable_drift: probableDrift,
        health_status: healthStatus,
      } satisfies QuoteTenderManagedBlockDiagnostics;
    })
    .sort((left, right) => left.marker_key.localeCompare(right.marker_key));
}

export function inspectQuoteTenderManagedSurface(options: {
  quote: Quote | null | undefined;
  rows: QuoteRow[];
}) {
  const quote = options.quote;

  if (!quote) {
    return EMPTY_DIAGNOSTICS;
  }

  const mutableBlocks = new Map<string, MutableBlockDiagnostics>();

  for (const markerKey of listManagedTextMarkers(quote.notes)) {
    const currentBlock = mutableBlocks.get(markerKey) ?? createMutableBlockDiagnostics(markerKey);
    currentBlock.text_fields.add('notes');
    currentBlock.text_marker_count += 1;
    mutableBlocks.set(markerKey, currentBlock);
  }

  for (const markerKey of listManagedTextMarkers(quote.internalNotes)) {
    const currentBlock = mutableBlocks.get(markerKey) ?? createMutableBlockDiagnostics(markerKey);
    currentBlock.text_fields.add('internalNotes');
    currentBlock.text_marker_count += 1;
    mutableBlocks.set(markerKey, currentBlock);
  }

  for (const sectionRow of listManagedSectionRows(options.rows)) {
    const currentBlock = mutableBlocks.get(sectionRow.markerKey) ?? createMutableBlockDiagnostics(sectionRow.markerKey);
    currentBlock.section_row_ids.push(sectionRow.rowId);
    currentBlock.section_row_titles.push(sectionRow.rowTitle);
    currentBlock.section_row_count += 1;
    mutableBlocks.set(sectionRow.markerKey, currentBlock);
  }

  const blocks = buildBlockDiagnostics([...mutableBlocks.values()]);
  const validDraftPackageIds = [...new Set(
    blocks
      .map((block) => block.draft_package_id)
      .filter((draftPackageId): draftPackageId is string => Boolean(draftPackageId)),
  )];
  const multipleDraftPackageSources = validDraftPackageIds.length > 1;
  const detectedFields = new Set<QuoteTenderManagedField>();

  blocks.forEach((block) => {
    if (block.text_fields.includes('notes')) {
      detectedFields.add('notes');
    }

    if (block.text_fields.includes('internalNotes')) {
      detectedFields.add('internalNotes');
    }

    if (block.section_row_count > 0) {
      detectedFields.add('sections');
    }
  });

  const managedBlocks = blocks.filter((block) => !block.unknown_marker);
  const unknownMarkerBlocksTotal = blocks.filter((block) => block.unknown_marker).length;
  const duplicateMarkerBlocksTotal = blocks.filter((block) => block.duplicate_marker).length;
  const probableDriftBlocksTotal = blocks.filter((block) => block.probable_drift).length;
  const hasTarjousalyManagedSurface = blocks.length > 0;
  const healthStatus: QuoteTenderManagedSurfaceHealthStatus = !hasTarjousalyManagedSurface
    ? 'clean'
    : unknownMarkerBlocksTotal > 0 || duplicateMarkerBlocksTotal > 0 || multipleDraftPackageSources
      ? 'inconsistent'
      : probableDriftBlocksTotal > 0
        ? 'needs_attention'
        : 'clean';

  return {
    has_tarjousaly_managed_surface: hasTarjousalyManagedSurface,
    managed_blocks_total: managedBlocks.length,
    managed_sections_total: managedBlocks.filter((block) => block.has_section_row).length,
    managed_notes_blocks_total: managedBlocks.filter((block) => block.has_text_marker).length,
    unknown_marker_blocks_total: unknownMarkerBlocksTotal,
    duplicate_marker_blocks_total: duplicateMarkerBlocksTotal,
    probable_drift_blocks_total: probableDriftBlocksTotal,
    health_status: healthStatus,
    draft_package_ids: validDraftPackageIds,
    primary_draft_package_id: validDraftPackageIds.length === 1 ? validDraftPackageIds[0] : null,
    multiple_draft_package_sources: multipleDraftPackageSources,
    managed_block_ids: managedBlocks.map((block) => block.block_id),
    marker_keys: blocks.map((block) => block.marker_key),
    detected_fields: [...detectedFields],
    blocks,
  } satisfies QuoteTenderManagedSurfaceDiagnostics;
}

export function resolveQuoteTenderManagedSectionState(
  row: QuoteRow,
  diagnostics: QuoteTenderManagedSurfaceDiagnostics,
): QuoteTenderManagedSectionState | null {
  if (row.mode !== 'section') {
    return null;
  }

  const rawSectionKey = row.notes?.trim();

  if (!rawSectionKey || !rawSectionKey.startsWith(`${TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX}:`)) {
    return null;
  }

  const markerKey = rawSectionKey.slice(`${TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX}:`.length).trim();
  const block = diagnostics.blocks.find((candidate) => candidate.marker_key === markerKey);

  if (!block) {
    const parsedMarkerKey = parseManagedMarkerKey(markerKey);

    return {
      marker_key: markerKey,
      block_id: parsedMarkerKey?.blockId ?? markerKey,
      title: row.productName,
      draft_package_id: parsedMarkerKey?.draftPackageId ?? null,
      health_status: 'inconsistent',
      label: 'Tarjousäly / tarkista',
    };
  }

  return {
    marker_key: block.marker_key,
    block_id: block.block_id,
    title: block.title,
    draft_package_id: block.draft_package_id,
    health_status: block.health_status,
    label: block.health_status === 'clean' ? 'Tarjousäly' : 'Tarjousäly / tarkista',
  };
}