import { z } from 'zod';

import {
  tenderDraftPackageImportStatusSchema,
  tenderDraftPackageItemTypeSchema,
  tenderDraftPackageSourceEntityTypeSchema,
  tenderDraftPackageStatusSchema,
} from './tender-intelligence';

const entityIdSchema = z.string().trim().min(1);
const timestampSchema = z.string().min(1);

export const TENDER_EDITOR_IMPORT_SCHEMA_VERSION = 'tender-editor-import/v1' as const;

export const tenderEditorImportGroupSchema = z.enum([
  'requirements_and_quote_notes',
  'selected_references',
  'resolved_missing_items_and_attachment_notes',
  'notes_for_editor',
]);

export const tenderEditorImportTargetKindSchema = z.enum(['quote_notes_section', 'quote_internal_notes_section']);
export const tenderEditorImportIssueSeveritySchema = z.enum(['info', 'warning', 'error']);
export const tenderEditorImportIssueCodeSchema = z.enum([
  'empty_package',
  'no_importable_items',
  'missing_title',
  'missing_content',
  'already_imported',
]);

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

export const tenderEditorImportPayloadSchema = z.object({
  schema_version: z.literal(TENDER_EDITOR_IMPORT_SCHEMA_VERSION),
  generated_at: timestampSchema,
  source_draft_package_id: entityIdSchema,
  source_tender_package_id: entityIdSchema,
  source_analysis_job_id: entityIdSchema.nullable().optional(),
  metadata: z.object({
    draft_package_title: z.string().trim().min(1),
    draft_package_status: tenderDraftPackageStatusSchema,
    import_status: tenderDraftPackageImportStatusSchema,
    target_quote_title: z.string().trim().min(1),
    target_customer_id: entityIdSchema.nullable().optional(),
    target_project_id: entityIdSchema.nullable().optional(),
    imported_quote_id: entityIdSchema.nullable().optional(),
    will_create_placeholder_target: z.boolean(),
  }),
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
  payload: tenderEditorImportPayloadSchema,
  validation: tenderEditorImportValidationResultSchema,
  sections: z.array(tenderEditorImportPreviewSectionSchema),
});

export const tenderEditorImportResultSchema = z.object({
  draft_package_id: entityIdSchema,
  imported_quote_id: entityIdSchema,
  imported_project_id: entityIdSchema,
  imported_customer_id: entityIdSchema,
  created_placeholder_target: z.boolean(),
});

export type TenderEditorImportGroup = z.infer<typeof tenderEditorImportGroupSchema>;
export type TenderEditorImportTargetKind = z.infer<typeof tenderEditorImportTargetKindSchema>;
export type TenderEditorImportItem = z.infer<typeof tenderEditorImportItemSchema>;
export type TenderEditorImportPayload = z.infer<typeof tenderEditorImportPayloadSchema>;
export type TenderEditorImportValidationIssue = z.infer<typeof tenderEditorImportValidationIssueSchema>;
export type TenderEditorImportValidationResult = z.infer<typeof tenderEditorImportValidationResultSchema>;
export type TenderEditorImportPreviewSection = z.infer<typeof tenderEditorImportPreviewSectionSchema>;
export type TenderEditorImportPreview = z.infer<typeof tenderEditorImportPreviewSchema>;
export type TenderEditorImportResult = z.infer<typeof tenderEditorImportResultSchema>;