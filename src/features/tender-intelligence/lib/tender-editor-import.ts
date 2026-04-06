import type { TenderDraftPackage, TenderDraftPackageItem } from '../types/tender-intelligence';
import {
  type TenderEditorImportGroup,
  type TenderEditorImportItem,
  type TenderEditorManagedSurface,
  type TenderEditorImportPreview,
  type TenderEditorImportPreviewSection,
  type TenderEditorImportValidationIssue,
  type TenderEditorImportValidationResult,
  tenderEditorImportPayloadSchema,
  tenderEditorImportPreviewSchema,
  tenderEditorImportValidationResultSchema,
  TENDER_EDITOR_IMPORT_SCHEMA_VERSION,
} from '../types/tender-editor-import';
import { buildTenderEditorImportPayloadHash } from './tender-editor-reconciliation';
import {
  buildTenderEditorManagedFieldContent,
  buildTenderEditorManagedSurface,
  TENDER_EDITOR_MANAGED_BLOCK_META,
} from './tender-editor-managed-surface';
import { hasTenderProviderContext } from './tender-provider-context';

function normalizeContent(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

function resolveImportGroup(item: TenderDraftPackageItem): TenderEditorImportGroup {
  if (item.itemType === 'draft_artifact' && hasTenderProviderContext(item.contentMd)) {
    return 'provider_profile_context';
  }

  switch (item.itemType) {
    case 'accepted_requirement':
      return 'requirements_and_quote_notes';
    case 'selected_reference':
      return 'selected_references';
    case 'resolved_missing_item':
      return 'resolved_missing_items_and_attachment_notes';
    case 'review_note':
    case 'draft_artifact':
      return 'notes_for_editor';
    default:
      return 'notes_for_editor';
  }
}

function mapDraftPackageItemToImportItem(item: TenderDraftPackageItem): TenderEditorImportItem {
  const importGroup = resolveImportGroup(item);
  const groupMeta = TENDER_EDITOR_MANAGED_BLOCK_META[importGroup];

  return {
    draft_package_item_id: item.id,
    source_entity_type: item.sourceEntityType,
    source_entity_id: item.sourceEntityId,
    item_type: item.itemType,
    import_group: importGroup,
    target_kind: groupMeta.targetKind,
    target_label: groupMeta.targetLabel,
    title: item.title,
    content_md: normalizeContent(item.contentMd),
  };
}

function buildPreviewSections(managedSurface: TenderEditorManagedSurface) {
  return (Object.keys(TENDER_EDITOR_MANAGED_BLOCK_META) as TenderEditorImportGroup[]).map((key) => {
    const block = managedSurface.blocks.find((candidate) => candidate.import_group === key);

    return {
      key,
      title: TENDER_EDITOR_MANAGED_BLOCK_META[key].title,
      target_kind: TENDER_EDITOR_MANAGED_BLOCK_META[key].targetKind,
      target_label: TENDER_EDITOR_MANAGED_BLOCK_META[key].targetLabel,
      item_count: block?.item_count ?? 0,
      preview_md: block?.content_md ?? null,
    } satisfies TenderEditorImportPreviewSection;
  });
}

export function validateTenderEditorImport(options: {
  draftPackage: TenderDraftPackage;
  items: TenderEditorImportItem[];
}): TenderEditorImportValidationResult {
  const issues: TenderEditorImportValidationIssue[] = [];

  if (options.draftPackage.items.length < 1) {
    issues.push({
      code: 'empty_package',
      severity: 'error',
      message: 'Luonnospaketissa ei ole rivejä editori-importtia varten.',
      draft_package_item_id: null,
    });
  }

  if (options.items.length < 1) {
    issues.push({
      code: 'no_importable_items',
      severity: 'error',
      message: 'Luonnospaketissa ei ole tällä hetkellä mukana yhtään editoriin tuotavaa riviä.',
      draft_package_item_id: null,
    });
  }

  options.items.forEach((item) => {
    if (!item.title.trim()) {
      issues.push({
        code: 'missing_title',
        severity: 'error',
        message: 'Importoitavalta riviltä puuttuu otsikko.',
        draft_package_item_id: item.draft_package_item_id,
      });
    }

    if (
      !normalizeContent(item.content_md)
      && item.item_type !== 'review_note'
    ) {
      issues.push({
        code: 'missing_content',
        severity: 'warning',
        message: `Riviltä “${item.title}” puuttuu varsinainen sisältö. Editoriin tuodaan tässä vaiheessa vain otsikkotaso.`,
        draft_package_item_id: item.draft_package_item_id,
      });
    }
  });

  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

  return tenderEditorImportValidationResultSchema.parse({
    is_valid: errorCount < 1,
    can_import: errorCount < 1,
    warning_count: warningCount,
    error_count: errorCount,
    issues,
  });
}

function buildTargetQuoteTitle(packageName: string) {
  const baseName = packageName.trim() || 'Tarjousäly-paketti';
  return `${baseName} / editor import`;
}

export function buildTenderEditorImportPreview(options: {
  draftPackage: TenderDraftPackage;
  packageName: string;
  targetQuoteId?: string | null;
  targetQuoteTitle?: string | null;
  targetCustomerId?: string | null;
  targetProjectId?: string | null;
  willCreatePlaceholderTarget: boolean;
  generatedAt?: string;
}): TenderEditorImportPreview {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const items = options.draftPackage.items
    .filter((item) => item.isIncluded)
    .map(mapDraftPackageItemToImportItem);
  const managedSurface = buildTenderEditorManagedSurface({
    draftPackageId: options.draftPackage.id,
    items,
  });
  const sections = buildPreviewSections(managedSurface);
  const payload = tenderEditorImportPayloadSchema.parse({
    schema_version: TENDER_EDITOR_IMPORT_SCHEMA_VERSION,
    generated_at: generatedAt,
    source_draft_package_id: options.draftPackage.id,
    source_tender_package_id: options.draftPackage.tenderPackageId,
    source_analysis_job_id: options.draftPackage.generatedFromAnalysisJobId ?? null,
    metadata: {
      draft_package_title: options.draftPackage.title,
      draft_package_status: options.draftPackage.status,
      import_status: options.draftPackage.importStatus,
      reimport_status: options.draftPackage.reimportStatus,
      target_quote_title: options.targetQuoteTitle?.trim() || buildTargetQuoteTitle(options.packageName),
      target_quote_id: options.targetQuoteId ?? options.draftPackage.importedQuoteId ?? null,
      target_customer_id: options.targetCustomerId ?? null,
      target_project_id: options.targetProjectId ?? null,
      imported_quote_id: options.draftPackage.importedQuoteId ?? null,
      will_create_placeholder_target: options.willCreatePlaceholderTarget,
    },
    managed_surface: managedSurface,
    sections: {
      quote_notes_md: buildTenderEditorManagedFieldContent(managedSurface, 'quote_notes_section'),
      quote_internal_notes_md: buildTenderEditorManagedFieldContent(managedSurface, 'quote_internal_notes_section'),
    },
    items,
  });
  const validation = validateTenderEditorImport({
    draftPackage: options.draftPackage,
    items,
  });
  const payloadHash = buildTenderEditorImportPayloadHash(payload);

  return tenderEditorImportPreviewSchema.parse({
    draft_item_count: options.draftPackage.items.length,
    importable_item_count: items.length,
    payload_hash: payloadHash,
    payload,
    validation,
    sections,
  });
}