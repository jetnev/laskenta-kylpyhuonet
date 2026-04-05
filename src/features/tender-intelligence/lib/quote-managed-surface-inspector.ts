import type { Quote, QuoteRow } from '@/lib/types';

import type { TenderEditorImportTargetKind, TenderEditorManagedBlockId } from '../types/tender-editor-import';
import { TENDER_EDITOR_MANAGED_BLOCK_META, TENDER_EDITOR_MANAGED_BLOCK_ORDER } from './tender-editor-managed-surface';
import {
  TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX,
  TENDER_EDITOR_MANAGED_TEXT_BLOCK_PREFIX,
  extractTenderEditorManagedTextBlockContent,
} from './tender-editor-managed-markers';

export type QuoteTenderManagedSurfaceHealthStatus = 'clean' | 'needs_attention' | 'inconsistent';
export type QuoteTenderManagedField = 'notes' | 'internalNotes' | 'sections';
export type QuoteTenderManagedEditorStateStatus = 'clean' | 'warning' | 'danger';
export type QuoteTenderManagedEditorIssueSeverity = 'warning' | 'danger';
export type QuoteTenderManagedEditTargetKind = 'unmanaged' | 'notes' | 'internalNotes' | 'section_row';
export type QuoteTenderManagedEditorIssueCode =
  | 'managed_notes_block_changed'
  | 'managed_internal_notes_block_changed'
  | 'managed_section_changed'
  | 'marker_missing'
  | 'marker_duplicated'
  | 'block_moved_to_wrong_field'
  | 'unknown_marker'
  | 'multiple_draft_package_sources';
export type QuoteTenderManagedSaveGuardDecision = 'allow' | 'confirm' | 'block';
export type QuoteTenderManagedEditGuardDecision = 'allow' | 'confirm' | 'block';
export type QuoteTenderManagedActionGuardDecision = 'allow' | 'confirm' | 'block';

export type QuoteTenderManagedEditTargetLocator =
  | { kind: 'quote_field'; field: 'notes' | 'internalNotes' }
  | { kind: 'section_row'; rowId: string };

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

export interface QuoteTenderManagedEditorIssue {
  code: QuoteTenderManagedEditorIssueCode;
  severity: QuoteTenderManagedEditorIssueSeverity;
  message: string;
  marker_key?: string;
  block_id?: string;
  field?: 'notes' | 'internalNotes' | 'sections';
}

export interface QuoteTenderManagedEditorState {
  has_tarjousaly_managed_surface: boolean;
  status: QuoteTenderManagedEditorStateStatus;
  warning_count: number;
  danger_count: number;
  issues: QuoteTenderManagedEditorIssue[];
}

export interface QuoteTenderManagedEditTarget {
  kind: QuoteTenderManagedEditTargetKind;
  label: string;
  status: QuoteTenderManagedEditorStateStatus;
  is_tarjousaly_managed: boolean;
  is_safe_managed: boolean;
  is_danger: boolean;
  field?: 'notes' | 'internalNotes' | 'sections';
  row_id?: string;
  marker_keys: string[];
  block_ids: string[];
  titles: string[];
  issue_messages: string[];
  unlock_key?: string;
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

function normalizeManagedTitle(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function resolveQuoteManagedTextFieldValue(quote: Quote, field: 'notes' | 'internalNotes') {
  return field === 'internalNotes' ? quote.internalNotes : quote.notes;
}

function hasExpectedManagedBlockStructure(content: string | null, title: string) {
  const firstMeaningfulLine = (content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) {
    return false;
  }

  const headingMatch = firstMeaningfulLine.match(/^#{1,6}\s+(.+)$/);
  if (!headingMatch) {
    return false;
  }

  return normalizeManagedTitle(headingMatch[1]) === normalizeManagedTitle(title);
}

function dedupeManagedEditorIssues(issues: QuoteTenderManagedEditorIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = [issue.code, issue.marker_key ?? '', issue.field ?? ''].join('::');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createUnmanagedEditTarget(label: string): QuoteTenderManagedEditTarget {
  return {
    kind: 'unmanaged',
    label,
    status: 'clean',
    is_tarjousaly_managed: false,
    is_safe_managed: false,
    is_danger: false,
    marker_keys: [],
    block_ids: [],
    titles: [],
    issue_messages: [],
  };
}

function isGlobalManagedIssue(issue: QuoteTenderManagedEditorIssue) {
  return issue.code === 'multiple_draft_package_sources' || (!issue.marker_key && !issue.field);
}

function collectManagedIssueMessages(issues: QuoteTenderManagedEditorIssue[]) {
  return [...new Set(issues.map((issue) => issue.message))];
}

function resolveManagedTargetStatus(
  issues: QuoteTenderManagedEditorIssue[],
  healthStatuses: QuoteTenderManagedSurfaceHealthStatus[],
): QuoteTenderManagedEditorStateStatus {
  if (issues.some((issue) => issue.severity === 'danger')) {
    return 'danger';
  }

  if (issues.some((issue) => issue.severity === 'warning')) {
    return 'warning';
  }

  if (healthStatuses.some((status) => status === 'inconsistent')) {
    return 'danger';
  }

  if (healthStatuses.some((status) => status === 'needs_attention')) {
    return 'warning';
  }

  return 'clean';
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

export function resolveQuoteTenderManagedEditorState(options: {
  quote: Quote | null | undefined;
  rows: QuoteRow[];
  diagnostics?: QuoteTenderManagedSurfaceDiagnostics;
}): QuoteTenderManagedEditorState {
  const diagnostics = options.diagnostics ?? inspectQuoteTenderManagedSurface(options);
  const quote = options.quote;

  if (!quote || !diagnostics.has_tarjousaly_managed_surface) {
    return {
      has_tarjousaly_managed_surface: false,
      status: 'clean',
      warning_count: 0,
      danger_count: 0,
      issues: [],
    };
  }

  const issues: QuoteTenderManagedEditorIssue[] = [];

  if (diagnostics.multiple_draft_package_sources) {
    issues.push({
      code: 'multiple_draft_package_sources',
      severity: 'danger',
      field: 'sections',
      message: 'Quote sisältää useamman Tarjousäly-lähteen markkereita. Managed surface ei ole enää turvallisesti tulkittavissa.',
    });
  }

  diagnostics.blocks.forEach((block) => {
    if (block.unknown_marker) {
      issues.push({
        code: 'unknown_marker',
        severity: 'danger',
        marker_key: block.marker_key,
        block_id: block.block_id,
        message: `Managed marker "${block.marker_key}" ei vastaa tunnettua Tarjousäly-lohkoa.`,
      });
    }

    if (block.duplicate_marker) {
      issues.push({
        code: 'marker_duplicated',
        severity: 'danger',
        marker_key: block.marker_key,
        block_id: block.block_id,
        message: `Managed marker "${block.title}" esiintyy useammin kuin kerran tai useassa kohdassa.`,
      });
    }

    if (!block.known_block_id) {
      return;
    }

    const missingMarkerLink = block.text_marker_count < 1 || block.section_row_count < 1;
    if (missingMarkerLink) {
      issues.push({
        code: 'marker_missing',
        severity: 'danger',
        marker_key: block.marker_key,
        block_id: block.block_id,
        message: `Managed marker tai siihen sidottu section-linkki puuttuu lohkosta "${block.title}".`,
      });
    }

    if (
      !block.duplicate_marker
      && block.expected_text_field
      && block.text_fields.length === 1
      && block.text_fields[0] !== block.expected_text_field
    ) {
      issues.push({
        code: 'block_moved_to_wrong_field',
        severity: 'warning',
        marker_key: block.marker_key,
        block_id: block.block_id,
        field: block.text_fields[0],
        message: `Managed lohko "${block.title}" löytyi kentästä ${block.text_fields[0]}, vaikka sen pitäisi olla kentässä ${block.expected_text_field}.`,
      });
    }

    block.text_fields.forEach((field) => {
      const content = extractTenderEditorManagedTextBlockContent(
        resolveQuoteManagedTextFieldValue(quote, field),
        block.marker_key,
      );

      if (content === null) {
        issues.push({
          code: 'marker_missing',
          severity: 'danger',
          marker_key: block.marker_key,
          block_id: block.block_id,
          field,
          message: `Managed lohkon "${block.title}" start/end-markerit eivät enää muodosta eheää ${field}-lohkoa.`,
        });
        return;
      }

      if (!hasExpectedManagedBlockStructure(content, block.title)) {
        issues.push({
          code: field === 'internalNotes' ? 'managed_internal_notes_block_changed' : 'managed_notes_block_changed',
          severity: 'warning',
          marker_key: block.marker_key,
          block_id: block.block_id,
          field,
          message: `Managed ${field === 'internalNotes' ? 'internalNotes' : 'notes'} -lohkon "${block.title}" rakenne on muuttunut editorissa.`,
        });
      }
    });

    if (block.section_row_titles.some((title) => normalizeManagedTitle(title) !== normalizeManagedTitle(block.title))) {
      issues.push({
        code: 'managed_section_changed',
        severity: 'warning',
        marker_key: block.marker_key,
        block_id: block.block_id,
        field: 'sections',
        message: `Managed section "${block.title}" on muuttunut tai otsikko ei enää vastaa odotettua rakennetta.`,
      });
    }
  });

  const dedupedIssues = dedupeManagedEditorIssues(issues);
  const dangerCount = dedupedIssues.filter((issue) => issue.severity === 'danger').length;
  const warningCount = dedupedIssues.filter((issue) => issue.severity === 'warning').length;

  return {
    has_tarjousaly_managed_surface: diagnostics.has_tarjousaly_managed_surface,
    status: dangerCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'clean',
    warning_count: warningCount,
    danger_count: dangerCount,
    issues: dedupedIssues,
  };
}

export function resolveQuoteTenderManagedSaveGuardDecision(
  state: Pick<QuoteTenderManagedEditorState, 'has_tarjousaly_managed_surface' | 'status'>,
  warningConfirmed = false,
): QuoteTenderManagedSaveGuardDecision {
  if (!state.has_tarjousaly_managed_surface || state.status === 'clean') {
    return 'allow';
  }

  if (state.status === 'warning') {
    return warningConfirmed ? 'allow' : 'confirm';
  }

  return 'block';
}

export function resolveQuoteTenderManagedActionGuardDecision(
  state: Pick<QuoteTenderManagedEditorState, 'has_tarjousaly_managed_surface' | 'status'>,
  warningConfirmed = false,
): QuoteTenderManagedActionGuardDecision {
  return resolveQuoteTenderManagedSaveGuardDecision(state, warningConfirmed);
}

export function resolveQuoteTenderManagedEditGuardDecision(
  target: Pick<QuoteTenderManagedEditTarget, 'is_tarjousaly_managed' | 'status'>,
  editConfirmed = false,
): QuoteTenderManagedEditGuardDecision {
  if (!target.is_tarjousaly_managed) {
    return 'allow';
  }

  if (target.status === 'danger') {
    return 'block';
  }

  return editConfirmed ? 'allow' : 'confirm';
}

export function resolveQuoteTenderManagedEditTarget(options: {
  quote: Quote | null | undefined;
  rows: QuoteRow[];
  target: QuoteTenderManagedEditTargetLocator;
  diagnostics?: QuoteTenderManagedSurfaceDiagnostics;
  editorState?: QuoteTenderManagedEditorState;
}): QuoteTenderManagedEditTarget {
  const diagnostics = options.diagnostics ?? inspectQuoteTenderManagedSurface(options);
  const editorState = options.editorState ?? resolveQuoteTenderManagedEditorState({
    quote: options.quote,
    rows: options.rows,
    diagnostics,
  });

  if (options.target.kind === 'quote_field') {
    const field = options.target.field;
    const label = field === 'notes' ? 'Tarjoushuomautukset' : 'Sisäiset muistiinpanot';
    const relatedBlocks = diagnostics.blocks.filter((block) => block.text_fields.includes(field));

    if (relatedBlocks.length === 0) {
      return createUnmanagedEditTarget(label);
    }

    const markerKeys = new Set(relatedBlocks.map((block) => block.marker_key));
    const relatedIssues = dedupeManagedEditorIssues(
      editorState.issues.filter(
        (issue) => isGlobalManagedIssue(issue) || Boolean(issue.marker_key && markerKeys.has(issue.marker_key)),
      ),
    );
    const titles = [...new Set(relatedBlocks.map((block) => block.title).filter(Boolean))];
    const status = resolveManagedTargetStatus(
      relatedIssues,
      relatedBlocks.map((block) => block.health_status),
    );

    return {
      kind: field,
      label,
      status,
      is_tarjousaly_managed: true,
      is_safe_managed: status !== 'danger',
      is_danger: status === 'danger',
      field,
      marker_keys: [...markerKeys],
      block_ids: [...new Set(relatedBlocks.map((block) => block.block_id))],
      titles,
      issue_messages: collectManagedIssueMessages(relatedIssues),
      unlock_key: `quote-field:${field}`,
    };
  }

  const row = options.rows.find((candidate) => candidate.id === options.target.rowId);
  const rowLabel = row?.productName?.trim() ? `Väliotsikko "${row.productName.trim()}"` : 'Väliotsikko';

  if (!row) {
    return createUnmanagedEditTarget(rowLabel);
  }

  const sectionState = resolveQuoteTenderManagedSectionState(row, diagnostics);

  if (!sectionState) {
    return createUnmanagedEditTarget(rowLabel);
  }

  const relatedIssues = dedupeManagedEditorIssues(
    editorState.issues.filter(
      (issue) => isGlobalManagedIssue(issue) || issue.marker_key === sectionState.marker_key,
    ),
  );
  const resolvedLabel = sectionState.title.trim().length > 0
    ? `Väliotsikko "${sectionState.title}"`
    : rowLabel;
  const status = resolveManagedTargetStatus(relatedIssues, [sectionState.health_status]);

  return {
    kind: 'section_row',
    label: resolvedLabel,
    status,
    is_tarjousaly_managed: true,
    is_safe_managed: status !== 'danger',
    is_danger: status === 'danger',
    field: 'sections',
    row_id: row.id,
    marker_keys: [sectionState.marker_key],
    block_ids: [sectionState.block_id],
    titles: [sectionState.title],
    issue_messages: collectManagedIssueMessages(relatedIssues),
    unlock_key: `section-row:${sectionState.marker_key}`,
  };
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
      label: 'Tarjousäly / estetty',
    };
  }

  return {
    marker_key: block.marker_key,
    block_id: block.block_id,
    title: block.title,
    draft_package_id: block.draft_package_id,
    health_status: block.health_status,
    label: block.health_status === 'clean'
      ? 'Tarjousäly / vartioitu'
      : block.health_status === 'needs_attention'
        ? 'Tarjousäly / tarkista'
        : 'Tarjousäly / estetty',
  };
}