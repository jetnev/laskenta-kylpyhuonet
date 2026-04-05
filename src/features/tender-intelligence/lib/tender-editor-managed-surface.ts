import {
  TENDER_EDITOR_MANAGED_SURFACE_CONTRACT_VERSION,
  tenderEditorManagedSurfaceSchema,
  type TenderEditorImportGroup,
  type TenderEditorImportItem,
  type TenderEditorImportPayload,
  type TenderEditorImportTargetKind,
  type TenderEditorManagedBlock,
  type TenderEditorManagedSurface,
} from '../types/tender-editor-import';

export const TENDER_EDITOR_MANAGED_SURFACE_OWNERSHIP_NOTICE = 'Tarjousäly päivittää vain nämä hallitut lohkot. Muu editorin sisältö ei kuulu adapterin hallintaan.';

export const TENDER_EDITOR_MANAGED_BLOCK_META: Record<
  TenderEditorImportGroup,
  { title: string; targetKind: TenderEditorImportTargetKind; targetLabel: string }
> = {
  requirements_and_quote_notes: {
    title: 'Tarjoushuomiot',
    targetKind: 'quote_notes_section',
    targetLabel: 'Tarjouksen notes-kenttä',
  },
  selected_references: {
    title: 'Referenssiyhteenveto',
    targetKind: 'quote_notes_section',
    targetLabel: 'Tarjouksen notes-kenttä',
  },
  resolved_missing_items_and_attachment_notes: {
    title: 'Liitehuomiot ja ratkaistut puutteet',
    targetKind: 'quote_internal_notes_section',
    targetLabel: 'Tarjouksen internalNotes-kenttä',
  },
  notes_for_editor: {
    title: 'Sisäiset editorihuomiot',
    targetKind: 'quote_internal_notes_section',
    targetLabel: 'Tarjouksen internalNotes-kenttä',
  },
};

export const TENDER_EDITOR_MANAGED_BLOCK_ORDER = Object.keys(
  TENDER_EDITOR_MANAGED_BLOCK_META,
) as TenderEditorImportGroup[];

function normalizeContent(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

function buildManagedBlockPreview(title: string, items: TenderEditorImportItem[]) {
  return [`## ${title}`]
    .concat(
      items.flatMap((item) => {
        const content = normalizeContent(item.content_md);
        return content ? [`### ${item.title}`, content] : [`### ${item.title}`];
      }),
    )
    .join('\n\n');
}

export function buildTenderEditorManagedBlockMarkerKey(draftPackageId: string, blockId: TenderEditorManagedBlock['block_id']) {
  return `${draftPackageId}:${blockId}`;
}

export function buildTenderEditorManagedSurface(options: {
  draftPackageId: string;
  items: TenderEditorImportItem[];
}): TenderEditorManagedSurface {
  const blocks = TENDER_EDITOR_MANAGED_BLOCK_ORDER
    .map((importGroup) => {
      const blockItems = options.items.filter((item) => item.import_group === importGroup);

      if (blockItems.length < 1) {
        return null;
      }

      const meta = TENDER_EDITOR_MANAGED_BLOCK_META[importGroup];

      return {
        block_id: importGroup,
        marker_key: buildTenderEditorManagedBlockMarkerKey(options.draftPackageId, importGroup),
        import_group: importGroup,
        target_kind: meta.targetKind,
        target_label: meta.targetLabel,
        title: meta.title,
        content_md: buildManagedBlockPreview(meta.title, blockItems),
        item_count: blockItems.length,
        owned_by_adapter: true as const,
      } satisfies TenderEditorManagedBlock;
    })
    .filter((block): block is TenderEditorManagedBlock => Boolean(block));

  return tenderEditorManagedSurfaceSchema.parse({
    contract_version: TENDER_EDITOR_MANAGED_SURFACE_CONTRACT_VERSION,
    ownership_notice: TENDER_EDITOR_MANAGED_SURFACE_OWNERSHIP_NOTICE,
    blocks,
  });
}

export function buildTenderEditorManagedSurfaceFromPayload(payload: TenderEditorImportPayload): TenderEditorManagedSurface {
  if (payload.managed_surface) {
    return tenderEditorManagedSurfaceSchema.parse(payload.managed_surface);
  }

  return buildTenderEditorManagedSurface({
    draftPackageId: payload.source_draft_package_id,
    items: payload.items,
  });
}

export function buildTenderEditorManagedFieldContent(
  surface: TenderEditorManagedSurface,
  targetKind: TenderEditorImportTargetKind,
) {
  const blockContents = surface.blocks
    .filter((block) => block.target_kind === targetKind)
    .map((block) => normalizeContent(block.content_md))
    .filter((content): content is string => Boolean(content));

  return blockContents.length > 0 ? blockContents.join('\n\n') : null;
}

export function listTenderEditorManagedBlocksForTarget(
  surface: TenderEditorManagedSurface,
  targetKind: TenderEditorImportTargetKind,
) {
  return surface.blocks.filter((block) => block.target_kind === targetKind);
}