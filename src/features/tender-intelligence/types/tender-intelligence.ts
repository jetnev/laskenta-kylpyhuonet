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
export const tenderReviewStatusSchema = z.enum(['unreviewed', 'accepted', 'dismissed', 'needs_attention']);
export const tenderResolutionStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'wont_fix']);
export const tenderGoNoGoRecommendationSchema = z.enum(['pending', 'go', 'conditional-go', 'no-go']);
export const tenderReferenceSuggestionSourceTypeSchema = z.enum(['quote', 'project', 'document-template', 'manual', 'organization_reference_profile']);
export const tenderReferenceProfileSourceKindSchema = z.enum(['manual', 'imported', 'other']);
export const tenderDraftPackageStatusSchema = z.enum(['draft', 'reviewed', 'exported', 'archived']);
export const tenderDraftPackageImportStatusSchema = z.enum(['not_imported', 'imported', 'failed']);
export const tenderDraftPackageItemTypeSchema = z.enum(['accepted_requirement', 'selected_reference', 'resolved_missing_item', 'review_note', 'draft_artifact']);
export const tenderDraftPackageSourceEntityTypeSchema = z.enum(['requirement', 'missing_item', 'reference_suggestion', 'review_task', 'draft_artifact']);
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

const tenderWorkflowStateSchema = z.object({
  reviewStatus: tenderReviewStatusSchema,
  reviewNote: z.string().trim().nullable().optional(),
  reviewedByUserId: entityIdSchema.nullable().optional(),
  reviewedAt: timestampSchema.nullable().optional(),
  resolutionStatus: tenderResolutionStatusSchema,
  resolutionNote: z.string().trim().nullable().optional(),
  resolvedByUserId: entityIdSchema.nullable().optional(),
  resolvedAt: timestampSchema.nullable().optional(),
});

const tenderAssignableWorkflowStateSchema = tenderWorkflowStateSchema.extend({
  assignedToUserId: entityIdSchema.nullable().optional(),
});

export const updateTenderWorkflowInputSchema = z.object({
  reviewStatus: tenderReviewStatusSchema.optional(),
  reviewNote: z.string().trim().nullable().optional(),
  resolutionStatus: tenderResolutionStatusSchema.optional(),
  resolutionNote: z.string().trim().nullable().optional(),
  assignedToUserId: entityIdSchema.nullable().optional(),
});

export const tenderReferenceProfileSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  title: z.string().trim().min(1),
  clientName: z.string().trim().nullable().optional(),
  projectType: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  completedYear: z.number().int().nullable().optional(),
  contractValue: z.number().nonnegative().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).nullable().optional(),
  sourceKind: tenderReferenceProfileSourceKindSchema,
  sourceReference: z.string().trim().nullable().optional(),
  createdByUserId: entityIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const tenderReferenceProfileInputSchema = z.object({
  title: z.string().trim().min(1, 'Anna referenssille otsikko.'),
  clientName: z.string().trim().nullable().optional(),
  projectType: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  completedYear: z.number().int().min(1900).max(2100).nullable().optional(),
  contractValue: z.number().nonnegative().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).nullable().optional(),
  sourceKind: tenderReferenceProfileSourceKindSchema.default('manual'),
  sourceReference: z.string().trim().nullable().optional(),
});

export const createTenderReferenceProfileInputSchema = tenderReferenceProfileInputSchema;
export const updateTenderReferenceProfileInputSchema = tenderReferenceProfileInputSchema;

export const TENDER_DRAFT_EXPORT_SCHEMA_VERSION = 'tender-draft-package/v1' as const;

export const tenderDraftPackageItemSchema = z.object({
  id: entityIdSchema,
  draftPackageId: entityIdSchema,
  itemType: tenderDraftPackageItemTypeSchema,
  sourceEntityType: tenderDraftPackageSourceEntityTypeSchema,
  sourceEntityId: entityIdSchema,
  title: z.string().trim().min(1),
  contentMd: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0),
  isIncluded: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const tenderDraftExportMetadataSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().nullable().optional(),
  draft_package_status: tenderDraftPackageStatusSchema,
});

const tenderDraftExportRequirementSchema = z.object({
  source_requirement_id: entityIdSchema,
  title: z.string().trim().min(1),
  content_md: z.string().trim().nullable().optional(),
});

const tenderDraftExportReferenceSchema = z.object({
  source_reference_suggestion_id: entityIdSchema,
  related_requirement_id: entityIdSchema.nullable().optional(),
  title: z.string().trim().min(1),
  content_md: z.string().trim().nullable().optional(),
});

const tenderDraftExportMissingItemSchema = z.object({
  source_missing_item_id: entityIdSchema,
  related_requirement_id: entityIdSchema.nullable().optional(),
  title: z.string().trim().min(1),
  content_md: z.string().trim().nullable().optional(),
});

const tenderDraftExportNoteSchema = z.object({
  source_entity_type: tenderDraftPackageSourceEntityTypeSchema,
  source_entity_id: entityIdSchema,
  title: z.string().trim().min(1),
  content_md: z.string().trim().nullable().optional(),
});

export const tenderDraftExportPayloadSchema = z.object({
  schema_version: z.literal(TENDER_DRAFT_EXPORT_SCHEMA_VERSION),
  generated_at: timestampSchema,
  generated_by_user_id: entityIdSchema.nullable().optional(),
  source_tender_package_id: entityIdSchema,
  source_analysis_job_id: entityIdSchema.nullable().optional(),
  metadata: tenderDraftExportMetadataSchema,
  accepted_requirements: z.array(tenderDraftExportRequirementSchema),
  selected_references: z.array(tenderDraftExportReferenceSchema),
  resolved_missing_items: z.array(tenderDraftExportMissingItemSchema),
  notes_for_editor: z.array(tenderDraftExportNoteSchema),
});

export const tenderDraftPackageSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  tenderPackageId: entityIdSchema,
  title: z.string().trim().min(1),
  status: tenderDraftPackageStatusSchema,
  importStatus: tenderDraftPackageImportStatusSchema.default('not_imported'),
  generatedFromAnalysisJobId: entityIdSchema.nullable().optional(),
  generatedByUserId: entityIdSchema.nullable().optional(),
  importedQuoteId: entityIdSchema.nullable().optional(),
  importedAt: timestampSchema.nullable().optional(),
  importedByUserId: entityIdSchema.nullable().optional(),
  summary: z.string().trim().nullable().optional(),
  exportPayload: tenderDraftExportPayloadSchema,
  items: z.array(tenderDraftPackageItemSchema).default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const updateTenderDraftPackageItemInputSchema = z.object({
  title: z.string().trim().min(1).optional(),
  contentMd: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isIncluded: z.boolean().optional(),
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
}).merge(tenderAssignableWorkflowStateSchema);

export const tenderMissingItemSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  relatedRequirementId: entityIdSchema.nullable().optional(),
  itemType: tenderMissingItemTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  severity: tenderSeveritySchema,
  status: tenderMissingItemStatusSchema,
}).merge(tenderAssignableWorkflowStateSchema);

export const tenderRiskFlagSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  riskType: tenderRiskTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  severity: tenderSeveritySchema,
  status: tenderRiskFlagStatusSchema,
}).merge(tenderAssignableWorkflowStateSchema);

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
  relatedRequirementId: entityIdSchema.nullable().optional(),
  sourceType: tenderReferenceSuggestionSourceTypeSchema,
  sourceReference: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1),
  rationale: z.string().trim().min(1).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
}).merge(tenderWorkflowStateSchema);

export const tenderDraftArtifactSchema = z.object({
  id: entityIdSchema,
  packageId: entityIdSchema,
  title: z.string().trim().min(1),
  artifactType: tenderDraftArtifactTypeSchema,
  contentMd: z.string().trim().nullable().optional(),
  status: tenderDraftArtifactStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).merge(tenderWorkflowStateSchema);

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
}).merge(tenderAssignableWorkflowStateSchema);

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
export type TenderReviewStatus = z.infer<typeof tenderReviewStatusSchema>;
export type TenderResolutionStatus = z.infer<typeof tenderResolutionStatusSchema>;
export type TenderGoNoGoRecommendation = z.infer<typeof tenderGoNoGoRecommendationSchema>;
export type TenderReferenceSuggestionSourceType = z.infer<typeof tenderReferenceSuggestionSourceTypeSchema>;
export type TenderReferenceProfileSourceKind = z.infer<typeof tenderReferenceProfileSourceKindSchema>;
export type TenderDraftPackageStatus = z.infer<typeof tenderDraftPackageStatusSchema>;
export type TenderDraftPackageImportStatus = z.infer<typeof tenderDraftPackageImportStatusSchema>;
export type TenderDraftPackageItemType = z.infer<typeof tenderDraftPackageItemTypeSchema>;
export type TenderDraftPackageSourceEntityType = z.infer<typeof tenderDraftPackageSourceEntityTypeSchema>;
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
export type TenderReferenceProfile = z.infer<typeof tenderReferenceProfileSchema>;
export type TenderReferenceSuggestion = z.infer<typeof tenderReferenceSuggestionSchema>;
export type TenderDraftPackageItem = z.infer<typeof tenderDraftPackageItemSchema>;
export type TenderDraftExportPayload = z.infer<typeof tenderDraftExportPayloadSchema>;
export type TenderDraftPackage = z.infer<typeof tenderDraftPackageSchema>;
export type TenderDraftArtifact = z.infer<typeof tenderDraftArtifactSchema>;
export type TenderReviewTask = z.infer<typeof tenderReviewTaskSchema>;
export type TenderPackageResults = z.infer<typeof tenderPackageResultsSchema>;
export type TenderPackageDetails = z.infer<typeof tenderPackageDetailsSchema>;
export type CreateTenderPackageInput = z.infer<typeof createTenderPackageInputSchema>;
export type AddTenderDocumentInput = z.infer<typeof addTenderDocumentInputSchema>;
export type CreateTenderReferenceProfileInput = z.infer<typeof createTenderReferenceProfileInputSchema>;
export type UpdateTenderReferenceProfileInput = z.infer<typeof updateTenderReferenceProfileInputSchema>;
export type UpdateTenderDraftPackageItemInput = z.infer<typeof updateTenderDraftPackageItemInputSchema>;
export type UpdateTenderWorkflowInput = z.infer<typeof updateTenderWorkflowInputSchema>;