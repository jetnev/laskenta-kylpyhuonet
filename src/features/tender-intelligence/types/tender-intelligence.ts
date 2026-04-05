import { z } from 'zod';

import {
  TENDER_DOCUMENT_EXTRACTION_STATUSES,
  TENDER_DOCUMENT_EXTRACTOR_TYPES,
} from '../lib/tender-document-extraction';

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
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
]);

export const tenderAnalysisJobTypeSchema = z.enum([
  'document-analysis',
  'go-no-go',
  'reference-scan',
  'draft-preparation',
  'placeholder_analysis',
]);

export const tenderDocumentUploadStatusSchema = z.enum(['placeholder', 'pending', 'uploaded', 'failed']);
export const tenderDocumentParseStatusSchema = z.enum(['not-started', 'queued', 'processing', 'completed', 'failed']);
export const tenderDocumentExtractionStatusSchema = z.enum(TENDER_DOCUMENT_EXTRACTION_STATUSES);
export const tenderDocumentExtractorTypeSchema = z.enum(TENDER_DOCUMENT_EXTRACTOR_TYPES);

export const tenderRequirementTypeSchema = z.enum(['administrative', 'commercial', 'technical', 'schedule', 'legal', 'other']);
export const tenderRequirementStatusSchema = z.enum(['unreviewed', 'covered', 'missing', 'at-risk']);
export const tenderPrioritySchema = z.enum(['critical', 'high', 'normal', 'low']);
export const tenderMissingItemTypeSchema = z.enum(['clarification', 'document', 'pricing', 'resourcing', 'decision', 'other']);
export const tenderMissingItemStatusSchema = z.enum(['open', 'resolved']);
export const tenderRiskTypeSchema = z.enum(['commercial', 'delivery', 'technical', 'legal', 'resourcing', 'other']);
export const tenderSeveritySchema = z.enum(['high', 'medium', 'low']);
export const tenderRiskFlagStatusSchema = z.enum(['open', 'accepted', 'mitigated']);
export const tenderGoNoGoRecommendationSchema = z.enum(['pending', 'go', 'conditional-go', 'no-go']);
export const tenderReferenceSuggestionSourceTypeSchema = z.enum(['quote', 'project', 'document-template', 'manual']);
export const tenderDraftArtifactTypeSchema = z.enum(['quote-outline', 'response-summary', 'clarification-list']);
export const tenderDraftArtifactStatusSchema = z.enum(['placeholder', 'ready-for-review', 'accepted']);
export const tenderReviewTaskTypeSchema = z.enum(['documents', 'requirements', 'risk', 'decision', 'draft']);
export const tenderReviewTaskStatusSchema = z.enum(['todo', 'in-review', 'done']);
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
  storageBucket: z.string().trim().min(1).nullable().optional(),
  storagePath: z.string().trim().nullable().optional(),
  fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  checksum: z.string().trim().nullable().optional(),
  uploadError: z.string().trim().nullable().optional(),
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

export const tenderDocumentExtractionSchema = z.object({
  id: entityIdSchema,
  documentId: entityIdSchema,
  packageId: entityIdSchema,
  extractionStatus: tenderDocumentExtractionStatusSchema,
  extractorType: tenderDocumentExtractorTypeSchema,
  sourceMimeType: z.string().trim().min(1),
  characterCount: z.number().int().nonnegative().nullable().optional(),
  chunkCount: z.number().int().nonnegative().nullable().optional(),
  extractedText: z.string().nullable().optional(),
  errorMessage: z.string().trim().nullable().optional(),
  extractedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderDocumentChunkSchema = z.object({
  id: entityIdSchema,
  documentId: entityIdSchema,
  packageId: entityIdSchema,
  extractionId: entityIdSchema,
  chunkIndex: z.number().int().min(0),
  textContent: z.string().min(1),
  characterCount: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderResultEvidenceTargetTypeSchema = z.enum([
  'requirement',
  'missing_item',
  'risk_flag',
  'reference_suggestion',
  'draft_artifact',
  'review_task',
]);

export const tenderResultEvidenceSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  sourceDocumentId: entityIdSchema,
  extractionId: entityIdSchema,
  chunkId: entityIdSchema,
  targetEntityType: tenderResultEvidenceTargetTypeSchema,
  targetEntityId: entityIdSchema,
  excerptText: z.string().trim().min(1),
  locatorText: z.string().trim().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderExtractionCoverageSchema = z.object({
  totalDocuments: z.number().int().min(0),
  uploadedDocuments: z.number().int().min(0),
  supportedDocuments: z.number().int().min(0),
  extractedDocuments: z.number().int().min(0),
  extractedChunks: z.number().int().min(0),
  pendingExtractions: z.number().int().min(0),
  failedExtractions: z.number().int().min(0),
  unsupportedDocuments: z.number().int().min(0),
  documentsNeedingExtraction: z.number().int().min(0),
});

export const tenderAnalysisReadinessSchema = z.object({
  canStart: z.boolean(),
  blockedReason: z.string().trim().nullable().optional(),
  coverage: tenderExtractionCoverageSchema,
});

export const tenderRequirementSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  requirementType: tenderRequirementTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  status: tenderRequirementStatusSchema,
  sourceDocumentId: entityIdSchema.nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  sourceExcerpt: z.string().trim().min(1).nullable().optional(),
});

export const tenderMissingItemSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  relatedRequirementId: entityIdSchema.nullable().optional(),
  itemType: tenderMissingItemTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  severity: tenderSeveritySchema,
  status: tenderMissingItemStatusSchema,
});

export const tenderRiskFlagSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  riskType: tenderRiskTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  severity: tenderSeveritySchema,
  status: tenderRiskFlagStatusSchema,
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
  sourceType: tenderReferenceSuggestionSourceTypeSchema,
  sourceReference: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1),
  rationale: z.string().trim().min(1).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const tenderDraftArtifactSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  artifactType: tenderDraftArtifactTypeSchema,
  contentMd: z.string().trim().nullable().optional(),
  status: tenderDraftArtifactStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderReviewTaskSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  taskType: tenderReviewTaskTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  status: tenderReviewTaskStatusSchema,
  assignedToUserId: entityIdSchema.nullable().optional(),
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
  documentExtractions: z.array(tenderDocumentExtractionSchema),
  resultEvidence: z.array(tenderResultEvidenceSchema),
  analysisJobs: z.array(tenderAnalysisJobSchema),
  latestAnalysisJob: tenderAnalysisJobSchema.nullable(),
  analysisReadiness: tenderAnalysisReadinessSchema,
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
export type TenderRequirementType = z.infer<typeof tenderRequirementTypeSchema>;
export type TenderRequirementStatus = z.infer<typeof tenderRequirementStatusSchema>;
export type TenderMissingItemType = z.infer<typeof tenderMissingItemTypeSchema>;
export type TenderMissingItemStatus = z.infer<typeof tenderMissingItemStatusSchema>;
export type TenderRiskType = z.infer<typeof tenderRiskTypeSchema>;
export type TenderSeverity = z.infer<typeof tenderSeveritySchema>;
export type TenderRiskFlagStatus = z.infer<typeof tenderRiskFlagStatusSchema>;
export type TenderGoNoGoRecommendation = z.infer<typeof tenderGoNoGoRecommendationSchema>;
export type TenderReferenceSuggestionSourceType = z.infer<typeof tenderReferenceSuggestionSourceTypeSchema>;
export type TenderDraftArtifactType = z.infer<typeof tenderDraftArtifactTypeSchema>;
export type TenderDraftArtifactStatus = z.infer<typeof tenderDraftArtifactStatusSchema>;
export type TenderReviewTaskType = z.infer<typeof tenderReviewTaskTypeSchema>;
export type TenderReviewTaskStatus = z.infer<typeof tenderReviewTaskStatusSchema>;
export type TenderDocumentKind = z.infer<typeof tenderDocumentKindSchema>;
export type TenderDocumentUploadStatus = z.infer<typeof tenderDocumentUploadStatusSchema>;
export type TenderDocumentParseStatus = z.infer<typeof tenderDocumentParseStatusSchema>;
export type TenderDocumentExtractionStatus = z.infer<typeof tenderDocumentExtractionStatusSchema>;
export type TenderDocumentExtractorType = z.infer<typeof tenderDocumentExtractorTypeSchema>;
export type TenderResultEvidenceTargetType = z.infer<typeof tenderResultEvidenceTargetTypeSchema>;

export type TenderPackageSummary = z.infer<typeof tenderPackageSummarySchema>;
export type TenderPackage = z.infer<typeof tenderPackageSchema>;
export type TenderDocument = z.infer<typeof tenderDocumentSchema>;
export type TenderDocumentExtraction = z.infer<typeof tenderDocumentExtractionSchema>;
export type TenderDocumentChunk = z.infer<typeof tenderDocumentChunkSchema>;
export type TenderResultEvidence = z.infer<typeof tenderResultEvidenceSchema>;
export type TenderExtractionCoverage = z.infer<typeof tenderExtractionCoverageSchema>;
export type TenderAnalysisReadiness = z.infer<typeof tenderAnalysisReadinessSchema>;
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