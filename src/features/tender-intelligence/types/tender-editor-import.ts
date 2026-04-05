import { z } from 'zod';

import {
  tenderDraftPackageImportStatusSchema,
  tenderDraftPackageItemTypeSchema,
  tenderDraftPackageReimportStatusSchema,
  tenderDraftPackageSourceEntityTypeSchema,
  tenderDraftPackageStatusSchema,
} from './tender-intelligence';

const entityIdSchema = z.string().trim().min(1);
const timestampSchema = z.string().min(1);

export const TENDER_EDITOR_IMPORT_SCHEMA_VERSION = 'tender-editor-import/v2' as const;
export const TENDER_EDITOR_MANAGED_SURFACE_CONTRACT_VERSION = 'tender-editor-managed-surface/v1' as const;
export const tenderEditorImportSchemaVersionSchema = z.enum(['tender-editor-import/v1', 'tender-editor-import/v2']);

export const tenderEditorImportGroupSchema = z.enum([
  'requirements_and_quote_notes',
  'selected_references',
  'resolved_missing_items_and_attachment_notes',
  'notes_for_editor',
]);

export const tenderEditorImportTargetKindSchema = z.enum(['quote_notes_section', 'quote_internal_notes_section']);
export const tenderEditorImportModeSchema = z.enum(['create_new_quote', 'update_existing_quote']);
export const tenderEditorImportRunResultStatusSchema = z.enum(['success', 'failed']);
export const tenderEditorImportExecutionStatusSchema = z.enum(['created', 'updated', 'no_changes']);
export const tenderEditorImportIssueSeveritySchema = z.enum(['info', 'warning', 'error']);
export const tenderEditorManagedBlockIdSchema = tenderEditorImportGroupSchema;
export const tenderEditorManagedSurfaceContractVersionSchema = z.literal(TENDER_EDITOR_MANAGED_SURFACE_CONTRACT_VERSION);
export const tenderEditorImportIssueCodeSchema = z.enum([
  'empty_package',
  'no_importable_items',
  'missing_title',
  'missing_content',
]);

export const tenderEditorReconciliationChangeTypeSchema = z.enum(['added', 'changed', 'removed', 'unchanged']);
export const tenderImportOwnershipRegistryStatusSchema = z.enum(['current', 'stale', 'missing', 'conflicted', 'not_available']);
export const tenderEditorOwnedBlockSourceSchema = z.enum(['registry', 'latest_successful_run', 'current_payload']);

export const tenderEditorImportItemSchema = z.object({
  draft_package_item_id: entityIdSchema,
  source_entity_type: tenderDraftPackageSourceEntityTypeSchema,
  source_entity_id: entityIdSchema,
  item_type: tenderDraftPackageItemTypeSchema,
  import_group: tenderEditorImportGroupSchema,
  target_kind: tenderEditorImportTargetKindSchema,
  target_label: z.string().trim().min(1),
  title: z.string().trim().min(1),
  content_md: z.string().trim().nullable().optional(),
});

export const tenderEditorManagedBlockSchema = z.object({
  block_id: tenderEditorManagedBlockIdSchema,
  marker_key: z.string().trim().min(1),
  import_group: tenderEditorImportGroupSchema,
  target_kind: tenderEditorImportTargetKindSchema,
  target_label: z.string().trim().min(1),
  title: z.string().trim().min(1),
  content_md: z.string().trim().min(1),
  item_count: z.number().int().min(0),
  owned_by_adapter: z.literal(true),
});

export const tenderEditorManagedSurfaceSchema = z.object({
  contract_version: tenderEditorManagedSurfaceContractVersionSchema,
  ownership_notice: z.string().trim().min(1),
  blocks: z.array(tenderEditorManagedBlockSchema),
});

export const tenderImportOwnedBlockSchema = z.object({
  id: entityIdSchema,
  organization_id: entityIdSchema,
  tender_draft_package_id: entityIdSchema,
  target_quote_id: entityIdSchema,
  import_run_id: entityIdSchema.nullable().optional(),
  block_id: tenderEditorManagedBlockIdSchema,
  marker_key: z.string().trim().min(1),
  target_field: tenderEditorImportTargetKindSchema,
  target_section_key: z.string().trim().nullable().optional(),
  block_title: z.string().trim().min(1),
  payload_hash: z.string().trim().min(1),
  revision: z.number().int().min(0),
  last_synced_at: timestampSchema,
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const tenderEditorSelectiveReimportSelectionSchema = z.object({
  update_block_ids: z.array(tenderEditorManagedBlockIdSchema),
  remove_block_ids: z.array(tenderEditorManagedBlockIdSchema),
});

export const tenderEditorImportPayloadSchema = z.object({
  schema_version: tenderEditorImportSchemaVersionSchema,
  generated_at: timestampSchema,
  source_draft_package_id: entityIdSchema,
  source_tender_package_id: entityIdSchema,
  source_analysis_job_id: entityIdSchema.nullable().optional(),
  metadata: z.object({
    draft_package_title: z.string().trim().min(1),
    draft_package_status: tenderDraftPackageStatusSchema,
    import_status: tenderDraftPackageImportStatusSchema,
    reimport_status: tenderDraftPackageReimportStatusSchema.nullable().optional(),
    target_quote_title: z.string().trim().min(1),
    target_quote_id: entityIdSchema.nullable().optional(),
    target_customer_id: entityIdSchema.nullable().optional(),
    target_project_id: entityIdSchema.nullable().optional(),
    imported_quote_id: entityIdSchema.nullable().optional(),
    will_create_placeholder_target: z.boolean(),
  }),
  managed_surface: tenderEditorManagedSurfaceSchema.optional(),
  sections: z.object({
    quote_notes_md: z.string().trim().nullable().optional(),
    quote_internal_notes_md: z.string().trim().nullable().optional(),
  }),
  items: z.array(tenderEditorImportItemSchema),
});

export const tenderEditorImportValidationIssueSchema = z.object({
  code: tenderEditorImportIssueCodeSchema,
  severity: tenderEditorImportIssueSeveritySchema,
  message: z.string().trim().min(1),
  draft_package_item_id: entityIdSchema.nullable().optional(),
});

export const tenderEditorImportValidationResultSchema = z.object({
  is_valid: z.boolean(),
  can_import: z.boolean(),
  warning_count: z.number().int().min(0),
  error_count: z.number().int().min(0),
  issues: z.array(tenderEditorImportValidationIssueSchema),
});

export const tenderEditorImportPreviewSectionSchema = z.object({
  key: tenderEditorImportGroupSchema,
  title: z.string().trim().min(1),
  target_kind: tenderEditorImportTargetKindSchema,
  target_label: z.string().trim().min(1),
  item_count: z.number().int().min(0),
  preview_md: z.string().trim().nullable().optional(),
});

export const tenderEditorImportPreviewSchema = z.object({
  draft_item_count: z.number().int().min(0),
  importable_item_count: z.number().int().min(0),
  payload_hash: z.string().trim().min(1),
  payload: tenderEditorImportPayloadSchema,
  validation: tenderEditorImportValidationResultSchema,
  sections: z.array(tenderEditorImportPreviewSectionSchema),
});

export const tenderEditorImportResultSchema = z.object({
  draft_package_id: entityIdSchema,
  imported_quote_id: entityIdSchema,
  imported_project_id: entityIdSchema.nullable().optional(),
  imported_customer_id: entityIdSchema.nullable().optional(),
  created_placeholder_target: z.boolean(),
  import_mode: tenderEditorImportModeSchema,
  result_status: tenderEditorImportExecutionStatusSchema,
  payload_hash: z.string().trim().min(1),
  import_revision: z.number().int().min(0),
  summary: z.string().trim().min(1),
});

export const tenderDraftPackageImportRunSchema = z.object({
  id: entityIdSchema,
  tender_draft_package_id: entityIdSchema,
  target_quote_id: entityIdSchema.nullable().optional(),
  import_mode: tenderEditorImportModeSchema,
  payload_hash: z.string().trim().min(1),
  payload_snapshot: tenderEditorImportPayloadSchema,
  result_status: tenderEditorImportRunResultStatusSchema,
  summary: z.string().trim().nullable().optional(),
  created_by_user_id: entityIdSchema.nullable().optional(),
  created_at: timestampSchema,
});

export const tenderDraftPackageImportStateSchema = z.object({
  draft_package_id: entityIdSchema,
  import_status: tenderDraftPackageImportStatusSchema,
  reimport_status: tenderDraftPackageReimportStatusSchema,
  import_revision: z.number().int().min(0),
  current_payload_hash: z.string().trim().nullable().optional(),
  last_import_payload_hash: z.string().trim().nullable().optional(),
  imported_quote_id: entityIdSchema.nullable().optional(),
  imported_at: timestampSchema.nullable().optional(),
  target_quote_id: entityIdSchema.nullable().optional(),
  target_quote_title: z.string().trim().nullable().optional(),
  target_project_id: entityIdSchema.nullable().optional(),
  target_customer_id: entityIdSchema.nullable().optional(),
  can_import: z.boolean(),
  can_reimport: z.boolean(),
  owned_block_count: z.number().int().min(0),
  owned_block_last_synced_at: timestampSchema.nullable().optional(),
  ownership_registry_status: tenderImportOwnershipRegistryStatusSchema,
  selective_reimport_available: z.boolean(),
  registry_warning_count: z.number().int().min(0),
  suggested_import_mode: tenderEditorImportModeSchema,
  latest_run: tenderDraftPackageImportRunSchema.nullable().optional(),
});

export const tenderEditorReconciliationEntrySchema = z.object({
  key: z.string().trim().min(1),
  import_group: tenderEditorImportGroupSchema,
  target_kind: tenderEditorImportTargetKindSchema,
  title: z.string().trim().min(1),
  change_type: tenderEditorReconciliationChangeTypeSchema,
  current_content_md: z.string().trim().nullable().optional(),
  previous_content_md: z.string().trim().nullable().optional(),
});

export const tenderEditorReconciliationBlockSchema = z.object({
  block_id: tenderEditorManagedBlockIdSchema,
  marker_key: z.string().trim().min(1),
  import_group: tenderEditorImportGroupSchema,
  target_kind: tenderEditorImportTargetKindSchema,
  target_label: z.string().trim().min(1),
  title: z.string().trim().min(1),
  change_type: tenderEditorReconciliationChangeTypeSchema,
  current_content_md: z.string().trim().nullable().optional(),
  previous_content_md: z.string().trim().nullable().optional(),
  current_item_count: z.number().int().min(0).nullable().optional(),
  previous_item_count: z.number().int().min(0).nullable().optional(),
  registry_entry_id: entityIdSchema.nullable().optional(),
  registry_revision: z.number().int().min(0).nullable().optional(),
  registry_last_synced_at: timestampSchema.nullable().optional(),
  ownership_source: tenderEditorOwnedBlockSourceSchema,
  text_marker_present: z.boolean(),
  section_row_present: z.boolean(),
  can_select_for_update: z.boolean(),
  can_select_for_removal: z.boolean(),
  selected_for_update: z.boolean(),
  selected_for_removal: z.boolean(),
  warnings: z.array(z.string().trim().min(1)),
  owned_by_adapter: z.literal(true),
});

export const tenderEditorReconciliationPreviewSchema = z.object({
  draft_package_id: entityIdSchema,
  target_quote_id: entityIdSchema.nullable().optional(),
  target_quote_title: z.string().trim().nullable().optional(),
  import_mode: tenderEditorImportModeSchema,
  reimport_status: tenderDraftPackageReimportStatusSchema,
  current_payload_hash: z.string().trim().min(1),
  previous_payload_hash: z.string().trim().nullable().optional(),
  added_count: z.number().int().min(0),
  changed_count: z.number().int().min(0),
  removed_count: z.number().int().min(0),
  unchanged_count: z.number().int().min(0),
  added_blocks: z.number().int().min(0),
  changed_blocks: z.number().int().min(0),
  removed_blocks: z.number().int().min(0),
  unchanged_blocks: z.number().int().min(0),
  can_reimport: z.boolean(),
  registry_status: tenderImportOwnershipRegistryStatusSchema,
  registry_active_block_count: z.number().int().min(0),
  registry_last_synced_at: timestampSchema.nullable().optional(),
  selective_reimport_available: z.boolean(),
  default_update_block_ids: z.array(tenderEditorManagedBlockIdSchema),
  default_remove_block_ids: z.array(tenderEditorManagedBlockIdSchema),
  warnings: z.array(z.string().trim().min(1)),
  blocks: z.array(tenderEditorReconciliationBlockSchema),
  entries: z.array(tenderEditorReconciliationEntrySchema),
});

export type TenderEditorImportGroup = z.infer<typeof tenderEditorImportGroupSchema>;
export type TenderEditorImportTargetKind = z.infer<typeof tenderEditorImportTargetKindSchema>;
export type TenderEditorImportMode = z.infer<typeof tenderEditorImportModeSchema>;
export type TenderEditorImportRunResultStatus = z.infer<typeof tenderEditorImportRunResultStatusSchema>;
export type TenderEditorImportExecutionStatus = z.infer<typeof tenderEditorImportExecutionStatusSchema>;
export type TenderEditorManagedBlockId = z.infer<typeof tenderEditorManagedBlockIdSchema>;
export type TenderEditorImportItem = z.infer<typeof tenderEditorImportItemSchema>;
export type TenderEditorManagedBlock = z.infer<typeof tenderEditorManagedBlockSchema>;
export type TenderEditorManagedSurface = z.infer<typeof tenderEditorManagedSurfaceSchema>;
export type TenderImportOwnedBlock = z.infer<typeof tenderImportOwnedBlockSchema>;
export type TenderEditorSelectiveReimportSelection = z.infer<typeof tenderEditorSelectiveReimportSelectionSchema>;
export type TenderEditorImportPayload = z.infer<typeof tenderEditorImportPayloadSchema>;
export type TenderEditorImportValidationIssue = z.infer<typeof tenderEditorImportValidationIssueSchema>;
export type TenderEditorImportValidationResult = z.infer<typeof tenderEditorImportValidationResultSchema>;
export type TenderEditorImportPreviewSection = z.infer<typeof tenderEditorImportPreviewSectionSchema>;
export type TenderEditorImportPreview = z.infer<typeof tenderEditorImportPreviewSchema>;
export type TenderEditorImportResult = z.infer<typeof tenderEditorImportResultSchema>;
export type TenderDraftPackageImportRun = z.infer<typeof tenderDraftPackageImportRunSchema>;
export type TenderDraftPackageImportState = z.infer<typeof tenderDraftPackageImportStateSchema>;
export type TenderEditorReconciliationChangeType = z.infer<typeof tenderEditorReconciliationChangeTypeSchema>;
export type TenderImportOwnershipRegistryStatus = z.infer<typeof tenderImportOwnershipRegistryStatusSchema>;
export type TenderEditorOwnedBlockSource = z.infer<typeof tenderEditorOwnedBlockSourceSchema>;
export type TenderEditorReconciliationEntry = z.infer<typeof tenderEditorReconciliationEntrySchema>;
export type TenderEditorReconciliationBlock = z.infer<typeof tenderEditorReconciliationBlockSchema>;
export type TenderEditorReconciliationPreview = z.infer<typeof tenderEditorReconciliationPreviewSchema>;