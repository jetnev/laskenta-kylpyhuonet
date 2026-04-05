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

export const tenderPackageRowsSchema = z.array(tenderPackageRowSchema);
export const tenderDocumentRowsSchema = z.array(tenderDocumentRowSchema);
export const tenderAnalysisJobRowsSchema = z.array(tenderAnalysisJobRowSchema);
export const tenderGoNoGoAssessmentRowsSchema = z.array(tenderGoNoGoAssessmentRowSchema);

export type TenderPackageRow = z.infer<typeof tenderPackageRowSchema>;
export type TenderDocumentRow = z.infer<typeof tenderDocumentRowSchema>;
export type TenderAnalysisJobRow = z.infer<typeof tenderAnalysisJobRowSchema>;
export type TenderGoNoGoAssessmentRow = z.infer<typeof tenderGoNoGoAssessmentRowSchema>;