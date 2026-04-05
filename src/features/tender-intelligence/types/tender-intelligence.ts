import { z } from 'zod';

const entityIdSchema = z.string().trim().min(1);
const timestampSchema = z.string().min(1);

export const tenderPackageStatusSchema = z.enum([
  'draft',
  'ready-for-analysis',
  'analysis-pending',
  'review-needed',
  'completed',
]);

export const tenderAnalysisJobStatusSchema = z.enum([
  'not-started',
  'queued',
  'processing',
  'completed',
  'failed',
]);

export const tenderAnalysisJobTypeSchema = z.enum([
  'document-analysis',
  'go-no-go',
  'reference-scan',
  'draft-preparation',
  'placeholder',
]);

export const tenderDocumentUploadStatusSchema = z.enum(['placeholder', 'pending', 'uploaded', 'failed']);
export const tenderDocumentParseStatusSchema = z.enum(['not-started', 'queued', 'processing', 'completed', 'failed']);

export const tenderRequirementStatusSchema = z.enum(['unreviewed', 'covered', 'missing', 'at-risk']);
export const tenderPrioritySchema = z.enum(['critical', 'high', 'normal', 'low']);
export const tenderSeveritySchema = z.enum(['high', 'medium', 'low']);
export const tenderGoNoGoRecommendationSchema = z.enum(['pending', 'go', 'conditional-go', 'no-go']);
export const tenderDraftArtifactStatusSchema = z.enum(['placeholder', 'ready-for-review', 'accepted']);
export const tenderReviewTaskStatusSchema = z.enum(['todo', 'in-review', 'done']);
export const tenderReviewTaskCategorySchema = z.enum(['documents', 'requirements', 'risk', 'decision', 'draft']);
export const tenderDocumentKindSchema = z.enum(['rfp', 'appendix', 'pricing', 'technical', 'contract', 'other']);

export const tenderPackageSummarySchema = z.object({
  documentCount: z.number().int().min(0),
  requirementCount: z.number().int().min(0),
  missingItemCount: z.number().int().min(0),
  riskCount: z.number().int().min(0),
  reviewTaskCount: z.number().int().min(0),
});

export const tenderPackageSchema = z.object({
  id: entityIdSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  status: tenderPackageStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  createdByUserId: entityIdSchema.nullable().optional(),
  linkedCustomerId: entityIdSchema.nullable().optional(),
  linkedProjectId: entityIdSchema.nullable().optional(),
  linkedQuoteId: entityIdSchema.nullable().optional(),
  currentJobId: entityIdSchema.nullable().optional(),
  summary: tenderPackageSummarySchema,
});

export const tenderDocumentSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  kind: tenderDocumentKindSchema,
  storagePath: z.string().trim().nullable().optional(),
  fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  checksum: z.string().trim().nullable().optional(),
  uploadState: tenderDocumentUploadStatusSchema,
  parseStatus: tenderDocumentParseStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderAnalysisJobSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  jobType: tenderAnalysisJobTypeSchema,
  status: tenderAnalysisJobStatusSchema,
  stageLabel: z.string().trim().min(1),
  provider: z.string().trim().min(1).nullable().optional(),
  model: z.string().trim().min(1).nullable().optional(),
  requestedAt: timestampSchema,
  startedAt: timestampSchema.nullable().optional(),
  completedAt: timestampSchema.nullable().optional(),
  errorMessage: z.string().trim().min(1).nullable().optional(),
});

export const tenderRequirementSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  status: tenderRequirementStatusSchema,
  priority: tenderPrioritySchema,
  sourceDocumentId: entityIdSchema.nullable().optional(),
});

export const tenderMissingItemSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  severity: tenderSeveritySchema,
  state: z.enum(['open', 'resolved']),
});

export const tenderRiskFlagSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  severity: tenderSeveritySchema,
  state: z.enum(['open', 'accepted', 'mitigated']),
});

export const tenderGoNoGoAssessmentSchema = z.object({
  packageId: entityIdSchema,
  recommendation: tenderGoNoGoRecommendationSchema,
  summary: z.string().trim().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  updatedAt: timestampSchema,
});

export const tenderReferenceSuggestionSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  sourceLabel: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  sourceType: z.enum(['quote', 'project', 'document-template', 'manual']),
  sourceId: entityIdSchema.nullable().optional(),
});

export const tenderDraftArtifactSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  kind: z.enum(['quote-outline', 'response-summary', 'clarification-list']),
  status: tenderDraftArtifactStatusSchema,
  summary: z.string().trim().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderReviewTaskSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  status: tenderReviewTaskStatusSchema,
  category: tenderReviewTaskCategorySchema,
  assigneeUserId: entityIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderPackageResultsSchema = z.object({
  requirements: z.array(tenderRequirementSchema),
  missingItems: z.array(tenderMissingItemSchema),
  riskFlags: z.array(tenderRiskFlagSchema),
  goNoGoAssessment: tenderGoNoGoAssessmentSchema.nullable(),
  referenceSuggestions: z.array(tenderReferenceSuggestionSchema),
  draftArtifacts: z.array(tenderDraftArtifactSchema),
  reviewTasks: z.array(tenderReviewTaskSchema),
});

export const tenderPackageDetailsSchema = z.object({
  package: tenderPackageSchema,
  documents: z.array(tenderDocumentSchema),
  latestAnalysisJob: tenderAnalysisJobSchema.nullable(),
  results: tenderPackageResultsSchema,
});

export const createTenderPackageInputSchema = z.object({
  name: z.string().trim().min(1, 'Anna tarjouspyyntöpaketille nimi.'),
  description: z.string().trim().nullable().optional(),
  linkedCustomerId: entityIdSchema.nullable().optional(),
  linkedProjectId: entityIdSchema.nullable().optional(),
  linkedQuoteId: entityIdSchema.nullable().optional(),
  createdByUserId: entityIdSchema.nullable().optional(),
});

export const addTenderDocumentInputSchema = z.object({
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1).default('application/octet-stream'),
  kind: tenderDocumentKindSchema.default('other'),
});

export type TenderPackageStatus = z.infer<typeof tenderPackageStatusSchema>;
export type TenderAnalysisJobStatus = z.infer<typeof tenderAnalysisJobStatusSchema>;
export type TenderAnalysisJobType = z.infer<typeof tenderAnalysisJobTypeSchema>;
export type TenderRequirementStatus = z.infer<typeof tenderRequirementStatusSchema>;
export type TenderSeverity = z.infer<typeof tenderSeveritySchema>;
export type TenderGoNoGoRecommendation = z.infer<typeof tenderGoNoGoRecommendationSchema>;
export type TenderDraftArtifactStatus = z.infer<typeof tenderDraftArtifactStatusSchema>;
export type TenderReviewTaskStatus = z.infer<typeof tenderReviewTaskStatusSchema>;
export type TenderDocumentKind = z.infer<typeof tenderDocumentKindSchema>;
export type TenderDocumentUploadStatus = z.infer<typeof tenderDocumentUploadStatusSchema>;
export type TenderDocumentParseStatus = z.infer<typeof tenderDocumentParseStatusSchema>;

export type TenderPackageSummary = z.infer<typeof tenderPackageSummarySchema>;
export type TenderPackage = z.infer<typeof tenderPackageSchema>;
export type TenderDocument = z.infer<typeof tenderDocumentSchema>;
export type TenderAnalysisJob = z.infer<typeof tenderAnalysisJobSchema>;
export type TenderRequirement = z.infer<typeof tenderRequirementSchema>;
export type TenderMissingItem = z.infer<typeof tenderMissingItemSchema>;
export type TenderRiskFlag = z.infer<typeof tenderRiskFlagSchema>;
export type TenderGoNoGoAssessment = z.infer<typeof tenderGoNoGoAssessmentSchema>;
export type TenderReferenceSuggestion = z.infer<typeof tenderReferenceSuggestionSchema>;
export type TenderDraftArtifact = z.infer<typeof tenderDraftArtifactSchema>;
export type TenderReviewTask = z.infer<typeof tenderReviewTaskSchema>;
export type TenderPackageResults = z.infer<typeof tenderPackageResultsSchema>;
export type TenderPackageDetails = z.infer<typeof tenderPackageDetailsSchema>;
export type CreateTenderPackageInput = z.infer<typeof createTenderPackageInputSchema>;
export type AddTenderDocumentInput = z.infer<typeof addTenderDocumentInputSchema>;