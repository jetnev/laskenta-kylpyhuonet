import type { TenderDraftPackage, TenderDraftPackageItem } from '../types/tender-intelligence';
import {
  type TenderEditorImportGroup,
  type TenderEditorImportItem,
  type TenderEditorImportPreview,
  type TenderEditorImportPreviewSection,
  type TenderEditorImportTargetKind,
  type TenderEditorImportValidationIssue,
  type TenderEditorImportValidationResult,
  tenderEditorImportPayloadSchema,
  tenderEditorImportPreviewSchema,
  tenderEditorImportValidationResultSchema,
  TENDER_EDITOR_IMPORT_SCHEMA_VERSION,
} from '../types/tender-editor-import';

const GROUP_META: Record<
  TenderEditorImportGroup,
  { title: string; targetKind: TenderEditorImportTargetKind; targetLabel: string }
> = {
  requirements_and_quote_notes: {
    title: 'Vaatimukset / tarjoushuomiot',
    targetKind: 'quote_notes_section',
    targetLabel: 'Tarjouksen notes-kenttä',
  },
  selected_references: {
    title: 'Valitut referenssit',
    targetKind: 'quote_notes_section',
    targetLabel: 'Tarjouksen notes-kenttä',
  },
  resolved_missing_items_and_attachment_notes: {
    title: 'Ratkaistut puutteet / liitehuomiot',
    targetKind: 'quote_internal_notes_section',
    targetLabel: 'Tarjouksen internalNotes-kenttä',
  },
  notes_for_editor: {
    title: 'Notes for editor',
    targetKind: 'quote_internal_notes_section',
    targetLabel: 'Tarjouksen internalNotes-kenttä',
  },
};

function normalizeContent(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

function resolveImportGroup(item: TenderDraftPackageItem): TenderEditorImportGroup {
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
  const groupMeta = GROUP_META[importGroup];

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

function buildSectionPreview(section: TenderEditorImportPreviewSection, items: TenderEditorImportItem[]) {
  if (items.length < 1) {
    return null;
  }

  return [`## ${section.title}`]
    .concat(
      items.flatMap((item) => {
        const content = normalizeContent(item.content_md);
        return content ? [`### ${item.title}`, content] : [`### ${item.title}`];
      }),
    )
    .join('\n\n');
}

function buildPreviewSections(items: TenderEditorImportItem[]) {
  return (Object.keys(GROUP_META) as TenderEditorImportGroup[]).map((key) => {
    const sectionItems = items.filter((item) => item.import_group === key);
    const section: TenderEditorImportPreviewSection = {
      key,
      title: GROUP_META[key].title,
      target_kind: GROUP_META[key].targetKind,
      target_label: GROUP_META[key].targetLabel,
      item_count: sectionItems.length,
      preview_md: null,
    };

    section.preview_md = buildSectionPreview(section, sectionItems);
    return section;
  });
}

function joinSectionPreviews(title: string, sections: TenderEditorImportPreviewSection[]) {
  const previews = sections
    .map((section) => section.preview_md)
    .filter((section): section is string => Boolean(section));

  if (previews.length < 1) {
    return null;
  }

  return [`# ${title}`].concat(previews).join('\n\n');
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

  if (options.draftPackage.importStatus === 'imported') {
    issues.push({
      code: 'already_imported',
      severity: 'error',
      message: options.draftPackage.importedQuoteId
        ? `Luonnospaketti on jo importoitu editoriin tarjouksena ${options.draftPackage.importedQuoteId}.`
        : 'Luonnospaketti on jo merkitty importoiduksi editoriin.',
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
  targetCustomerId?: string | null;
  targetProjectId?: string | null;
  willCreatePlaceholderTarget: boolean;
  generatedAt?: string;
}): TenderEditorImportPreview {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const items = options.draftPackage.items
    .filter((item) => item.isIncluded)
    .map(mapDraftPackageItemToImportItem);
  const sections = buildPreviewSections(items);
  const quoteNotesSections = sections.filter((section) => section.target_kind === 'quote_notes_section');
  const quoteInternalNotesSections = sections.filter((section) => section.target_kind === 'quote_internal_notes_section');
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
      target_quote_title: buildTargetQuoteTitle(options.packageName),
      target_customer_id: options.targetCustomerId ?? null,
      target_project_id: options.targetProjectId ?? null,
      imported_quote_id: options.draftPackage.importedQuoteId ?? null,
      will_create_placeholder_target: options.willCreatePlaceholderTarget,
    },
    sections: {
      quote_notes_md: joinSectionPreviews('Tarjousäly / tarjoushuomiot', quoteNotesSections),
      quote_internal_notes_md: joinSectionPreviews('Tarjousäly / sisäiset editorimuistiot', quoteInternalNotesSections),
    },
    items,
  });
  const validation = validateTenderEditorImport({
    draftPackage: options.draftPackage,
    items,
  });

  return tenderEditorImportPreviewSchema.parse({
    draft_item_count: options.draftPackage.items.length,
    importable_item_count: items.length,
    payload,
    validation,
    sections,
  });
}