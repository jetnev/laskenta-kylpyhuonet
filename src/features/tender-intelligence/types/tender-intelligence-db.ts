import { z } from 'zod';

import {
  TENDER_DOCUMENT_EXTRACTION_STATUSES,
  TENDER_DOCUMENT_EXTRACTOR_TYPES,
} from '../lib/tender-document-extraction';

export const tenderPackageRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  created_by_user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'ready-for-analysis', 'analysis-pending', 'review-needed', 'completed']),
  linked_customer_id: z.string().nullable(),
  linked_project_id: z.string().nullable(),
  linked_quote_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderDocumentRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  created_by_user_id: z.string().uuid(),
  file_name: z.string(),
  mime_type: z.string(),
  storage_bucket: z.string(),
  storage_path: z.string().nullable(),
  file_size_bytes: z.number().nullable(),
  checksum: z.string().nullable(),
  upload_error: z.string().nullable(),
  upload_status: z.enum(['placeholder', 'pending', 'uploaded', 'failed']),
  parse_status: z.enum(['not-started', 'queued', 'processing', 'completed', 'failed']),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderAnalysisJobRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  job_type: z.enum(['document-analysis', 'go-no-go', 'reference-scan', 'draft-preparation', 'placeholder_analysis']),
  status: z.enum(['pending', 'queued', 'running', 'completed', 'failed']),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderDocumentExtractionRowSchema = z.object({
  id: z.string().uuid(),
  tender_document_id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  extraction_status: z.enum(TENDER_DOCUMENT_EXTRACTION_STATUSES),
  extractor_type: z.enum(TENDER_DOCUMENT_EXTRACTOR_TYPES),
  source_mime_type: z.string(),
  character_count: z.number().int().nullable(),
  chunk_count: z.number().int().nullable(),
  extracted_text: z.string().nullable(),
  error_message: z.string().nullable(),
  extracted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderDocumentChunkRowSchema = z.object({
  id: z.string().uuid(),
  tender_document_id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  extraction_id: z.string().uuid(),
  chunk_index: z.number().int().min(0),
  text_content: z.string(),
  character_count: z.number().int().min(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderResultEvidenceRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  source_document_id: z.string().uuid(),
  extraction_id: z.string().uuid(),
  chunk_id: z.string().uuid(),
  target_entity_type: z.enum([
    'requirement',
    'missing_item',
    'risk_flag',
    'reference_suggestion',
    'draft_artifact',
    'review_task',
  ]),
  target_entity_id: z.string().uuid(),
  excerpt_text: z.string(),
  locator_text: z.string().nullable(),
  confidence: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const tenderReviewStatusRowSchema = z.enum(['unreviewed', 'accepted', 'dismissed', 'needs_attention']);
const tenderResolutionStatusRowSchema = z.enum(['open', 'in_progress', 'resolved', 'wont_fix']);
const tenderReferenceProfileSourceKindRowSchema = z.enum(['manual', 'imported', 'other']);
const tenderDraftPackageStatusRowSchema = z.enum(['draft', 'reviewed', 'exported', 'archived']);
const tenderDraftPackageItemTypeRowSchema = z.enum(['accepted_requirement', 'selected_reference', 'resolved_missing_item', 'review_note', 'draft_artifact']);
const tenderDraftPackageSourceEntityTypeRowSchema = z.enum(['requirement', 'missing_item', 'reference_suggestion', 'review_task', 'draft_artifact']);

const tenderWorkflowRowSchema = z.object({
  review_status: tenderReviewStatusRowSchema,
  review_note: z.string().nullable(),
  reviewed_by_user_id: z.string().uuid().nullable(),
  reviewed_at: z.string().nullable(),
  resolution_status: tenderResolutionStatusRowSchema,
  resolution_note: z.string().nullable(),
  resolved_by_user_id: z.string().uuid().nullable(),
  resolved_at: z.string().nullable(),
});

const tenderAssignableWorkflowRowSchema = tenderWorkflowRowSchema.extend({
  assigned_to_user_id: z.string().uuid().nullable(),
});

export const tenderGoNoGoAssessmentRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  recommendation: z.enum(['pending', 'go', 'conditional-go', 'no-go']),
  summary: z.string().nullable(),
  confidence: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderRequirementRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  source_document_id: z.string().uuid().nullable(),
  requirement_type: z.enum(['administrative', 'commercial', 'technical', 'schedule', 'legal', 'other']),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['unreviewed', 'covered', 'missing', 'at-risk']),
  confidence: z.number().nullable(),
  source_excerpt: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).merge(tenderAssignableWorkflowRowSchema);

export const tenderMissingItemRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  related_requirement_id: z.string().uuid().nullable(),
  item_type: z.enum(['clarification', 'document', 'pricing', 'resourcing', 'decision', 'other']),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.enum(['high', 'medium', 'low']),
  status: z.enum(['open', 'resolved']),
  created_at: z.string(),
  updated_at: z.string(),
}).merge(tenderAssignableWorkflowRowSchema);

export const tenderRiskFlagRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  risk_type: z.enum(['commercial', 'delivery', 'technical', 'legal', 'resourcing', 'other']),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.enum(['high', 'medium', 'low']),
  status: z.enum(['open', 'accepted', 'mitigated']),
  created_at: z.string(),
  updated_at: z.string(),
}).merge(tenderAssignableWorkflowRowSchema);

export const tenderReferenceProfileRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  title: z.string(),
  client_name: z.string().nullable(),
  project_type: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  completed_year: z.number().int().nullable(),
  contract_value: z.number().nullable(),
  tags: z.array(z.string()).nullable(),
  source_kind: tenderReferenceProfileSourceKindRowSchema,
  source_reference: z.string().nullable(),
  created_by_user_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderReferenceSuggestionRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  related_requirement_id: z.string().uuid().nullable(),
  source_type: z.enum(['quote', 'project', 'document-template', 'manual', 'organization_reference_profile']),
  source_reference: z.string().nullable(),
  title: z.string(),
  rationale: z.string().nullable(),
  confidence: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).merge(tenderWorkflowRowSchema);

export const tenderDraftPackageRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  title: z.string(),
  status: tenderDraftPackageStatusRowSchema,
  generated_from_analysis_job_id: z.string().uuid().nullable(),
  generated_by_user_id: z.string().uuid().nullable(),
  summary: z.string().nullable(),
  payload_json: z.unknown(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderDraftPackageItemRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  tender_draft_package_id: z.string().uuid(),
  item_type: tenderDraftPackageItemTypeRowSchema,
  source_entity_type: tenderDraftPackageSourceEntityTypeRowSchema,
  source_entity_id: z.string().uuid(),
  title: z.string(),
  content_md: z.string().nullable(),
  sort_order: z.number().int(),
  is_included: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tenderDraftArtifactRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  artifact_type: z.enum(['quote-outline', 'response-summary', 'clarification-list']),
  title: z.string(),
  content_md: z.string().nullable(),
  status: z.enum(['placeholder', 'ready-for-review', 'accepted']),
  created_at: z.string(),
  updated_at: z.string(),
}).merge(tenderWorkflowRowSchema);

export const tenderReviewTaskRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  task_type: z.enum(['documents', 'requirements', 'risk', 'decision', 'draft']),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['todo', 'in-review', 'done']),
  assigned_to_user_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).merge(tenderWorkflowRowSchema);

export const tenderPackageRowsSchema = z.array(tenderPackageRowSchema);
export const tenderDocumentRowsSchema = z.array(tenderDocumentRowSchema);
export const tenderAnalysisJobRowsSchema = z.array(tenderAnalysisJobRowSchema);
export const tenderGoNoGoAssessmentRowsSchema = z.array(tenderGoNoGoAssessmentRowSchema);
export const tenderDocumentExtractionRowsSchema = z.array(tenderDocumentExtractionRowSchema);
export const tenderDocumentChunkRowsSchema = z.array(tenderDocumentChunkRowSchema);
export const tenderResultEvidenceRowsSchema = z.array(tenderResultEvidenceRowSchema);
export const tenderRequirementRowsSchema = z.array(tenderRequirementRowSchema);
export const tenderMissingItemRowsSchema = z.array(tenderMissingItemRowSchema);
export const tenderRiskFlagRowsSchema = z.array(tenderRiskFlagRowSchema);
export const tenderReferenceProfileRowsSchema = z.array(tenderReferenceProfileRowSchema);
export const tenderReferenceSuggestionRowsSchema = z.array(tenderReferenceSuggestionRowSchema);
export const tenderDraftPackageRowsSchema = z.array(tenderDraftPackageRowSchema);
export const tenderDraftPackageItemRowsSchema = z.array(tenderDraftPackageItemRowSchema);
export const tenderDraftArtifactRowsSchema = z.array(tenderDraftArtifactRowSchema);
export const tenderReviewTaskRowsSchema = z.array(tenderReviewTaskRowSchema);

export type TenderPackageRow = z.infer<typeof tenderPackageRowSchema>;
export type TenderDocumentRow = z.infer<typeof tenderDocumentRowSchema>;
export type TenderAnalysisJobRow = z.infer<typeof tenderAnalysisJobRowSchema>;
export type TenderDocumentExtractionRow = z.infer<typeof tenderDocumentExtractionRowSchema>;
export type TenderDocumentChunkRow = z.infer<typeof tenderDocumentChunkRowSchema>;
export type TenderResultEvidenceRow = z.infer<typeof tenderResultEvidenceRowSchema>;
export type TenderGoNoGoAssessmentRow = z.infer<typeof tenderGoNoGoAssessmentRowSchema>;
export type TenderRequirementRow = z.infer<typeof tenderRequirementRowSchema>;
export type TenderMissingItemRow = z.infer<typeof tenderMissingItemRowSchema>;
export type TenderRiskFlagRow = z.infer<typeof tenderRiskFlagRowSchema>;
export type TenderReferenceProfileRow = z.infer<typeof tenderReferenceProfileRowSchema>;
export type TenderReferenceSuggestionRow = z.infer<typeof tenderReferenceSuggestionRowSchema>;
export type TenderDraftPackageRow = z.infer<typeof tenderDraftPackageRowSchema>;
export type TenderDraftPackageItemRow = z.infer<typeof tenderDraftPackageItemRowSchema>;
export type TenderDraftArtifactRow = z.infer<typeof tenderDraftArtifactRowSchema>;
export type TenderReviewTaskRow = z.infer<typeof tenderReviewTaskRowSchema>;