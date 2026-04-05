import { z } from 'zod';

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
});

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
});

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
});

export const tenderReferenceSuggestionRowSchema = z.object({
  id: z.string().uuid(),
  tender_package_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  source_type: z.enum(['quote', 'project', 'document-template', 'manual']),
  source_reference: z.string().nullable(),
  title: z.string(),
  rationale: z.string().nullable(),
  confidence: z.number().nullable(),
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
});

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
});

export const tenderPackageRowsSchema = z.array(tenderPackageRowSchema);
export const tenderDocumentRowsSchema = z.array(tenderDocumentRowSchema);
export const tenderAnalysisJobRowsSchema = z.array(tenderAnalysisJobRowSchema);
export const tenderGoNoGoAssessmentRowsSchema = z.array(tenderGoNoGoAssessmentRowSchema);
export const tenderRequirementRowsSchema = z.array(tenderRequirementRowSchema);
export const tenderMissingItemRowsSchema = z.array(tenderMissingItemRowSchema);
export const tenderRiskFlagRowsSchema = z.array(tenderRiskFlagRowSchema);
export const tenderReferenceSuggestionRowsSchema = z.array(tenderReferenceSuggestionRowSchema);
export const tenderDraftArtifactRowsSchema = z.array(tenderDraftArtifactRowSchema);
export const tenderReviewTaskRowsSchema = z.array(tenderReviewTaskRowSchema);

export type TenderPackageRow = z.infer<typeof tenderPackageRowSchema>;
export type TenderDocumentRow = z.infer<typeof tenderDocumentRowSchema>;
export type TenderAnalysisJobRow = z.infer<typeof tenderAnalysisJobRowSchema>;
export type TenderGoNoGoAssessmentRow = z.infer<typeof tenderGoNoGoAssessmentRowSchema>;
export type TenderRequirementRow = z.infer<typeof tenderRequirementRowSchema>;
export type TenderMissingItemRow = z.infer<typeof tenderMissingItemRowSchema>;
export type TenderRiskFlagRow = z.infer<typeof tenderRiskFlagRowSchema>;
export type TenderReferenceSuggestionRow = z.infer<typeof tenderReferenceSuggestionRowSchema>;
export type TenderDraftArtifactRow = z.infer<typeof tenderDraftArtifactRowSchema>;
export type TenderReviewTaskRow = z.infer<typeof tenderReviewTaskRowSchema>;