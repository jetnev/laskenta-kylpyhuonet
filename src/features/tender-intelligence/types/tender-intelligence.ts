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
export const tenderProviderDeliveryScopeSchema = z.enum(['local', 'regional', 'national', 'international']);
export const tenderProviderCredentialTypeSchema = z.enum(['certificate', 'qualification', 'insurance', 'license', 'other']);
export const tenderProviderConstraintTypeSchema = z.enum(['eligibility', 'capacity', 'commercial', 'resourcing', 'compliance', 'other']);
export const tenderProviderConstraintSeveritySchema = z.enum(['hard', 'soft', 'info']);
export const tenderProviderDocumentTypeSchema = z.enum(['case-study', 'certificate', 'insurance', 'cv', 'policy', 'other']);
export const tenderProviderResponseTemplateTypeSchema = z.enum([
  'company-overview',
  'technical-approach',
  'delivery-plan',
  'pricing-note',
  'quality',
  'other',
]);
export const tenderDraftPackageStatusSchema = z.enum(['draft', 'reviewed', 'exported', 'archived']);
export const tenderDraftPackageImportStatusSchema = z.enum(['not_imported', 'imported', 'failed']);
export const tenderDraftPackageReimportStatusSchema = z.enum(['up_to_date', 'stale', 'never_imported', 'import_failed']);
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

export const tenderUsageEventTypeSchema = z.enum([
  'tender.package.created',
  'tender.document.uploaded',
  'tender.document.extraction.started',
  'tender.analysis.started',
  'tender.draft-package.imported',
  'tender.draft-package.reimported',
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

export const tenderUsageSummaryEventSchema = z.object({
  eventType: tenderUsageEventTypeSchema,
  eventCount: z.number().int().min(0),
  quantityTotal: z.number().int().min(0),
  meteredUnitsTotal: z.number().int().min(0),
});

export const tenderUsageSummarySchema = z.object({
  windowDays: z.number().int().min(1),
  totalEvents: z.number().int().min(0),
  totalQuantity: z.number().int().min(0),
  totalMeteredUnits: z.number().int().min(0),
  lastEventAt: timestampSchema.nullable(),
  events: z.array(tenderUsageSummaryEventSchema),
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

export const tenderProviderProfileSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  companyName: z.string().trim().min(1),
  businessId: z.string().trim().nullable().optional(),
  websiteUrl: z.string().trim().nullable().optional(),
  headquarters: z.string().trim().nullable().optional(),
  summary: z.string().trim().nullable().optional(),
  serviceArea: z.string().trim().nullable().optional(),
  maxTravelKm: z.number().int().min(0).nullable().optional(),
  deliveryScope: tenderProviderDeliveryScopeSchema,
  createdByUserId: entityIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderProviderContactSchema = z.object({
  id: entityIdSchema,
  profileId: entityIdSchema,
  organizationId: entityIdSchema,
  fullName: z.string().trim().min(1),
  roleTitle: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  isPrimary: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderProviderCredentialSchema = z.object({
  id: entityIdSchema,
  profileId: entityIdSchema,
  organizationId: entityIdSchema,
  title: z.string().trim().min(1),
  issuer: z.string().trim().nullable().optional(),
  credentialType: tenderProviderCredentialTypeSchema,
  validUntil: timestampSchema.nullable().optional(),
  documentReference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderProviderConstraintSchema = z.object({
  id: entityIdSchema,
  profileId: entityIdSchema,
  organizationId: entityIdSchema,
  title: z.string().trim().min(1),
  constraintType: tenderProviderConstraintTypeSchema,
  severity: tenderProviderConstraintSeveritySchema,
  ruleText: z.string().trim().min(1),
  mitigationNote: z.string().trim().nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderProviderDocumentSchema = z.object({
  id: entityIdSchema,
  profileId: entityIdSchema,
  organizationId: entityIdSchema,
  title: z.string().trim().min(1),
  documentType: tenderProviderDocumentTypeSchema,
  sourceReference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderProviderResponseTemplateSchema = z.object({
  id: entityIdSchema,
  profileId: entityIdSchema,
  organizationId: entityIdSchema,
  title: z.string().trim().min(1),
  templateType: tenderProviderResponseTemplateTypeSchema,
  contentMd: z.string().trim().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const tenderProviderProfileDetailsSchema = z.object({
  profile: tenderProviderProfileSchema,
  contacts: z.array(tenderProviderContactSchema),
  credentials: z.array(tenderProviderCredentialSchema),
  constraints: z.array(tenderProviderConstraintSchema),
  documents: z.array(tenderProviderDocumentSchema),
  responseTemplates: z.array(tenderProviderResponseTemplateSchema),
});

const tenderProviderProfileInputSchema = z.object({
  companyName: z.string().trim().min(1, 'Anna tarjoajaprofiilille yrityksen nimi.'),
  businessId: z.string().trim().nullable().optional(),
  websiteUrl: z.string().trim().nullable().optional(),
  headquarters: z.string().trim().nullable().optional(),
  summary: z.string().trim().nullable().optional(),
  serviceArea: z.string().trim().nullable().optional(),
  maxTravelKm: z.number().int().min(0).nullable().optional(),
  deliveryScope: tenderProviderDeliveryScopeSchema.default('regional'),
});

const tenderProviderContactInputSchema = z.object({
  fullName: z.string().trim().min(1, 'Anna yhteyshenkilön nimi.'),
  roleTitle: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().default(false),
});

const tenderProviderCredentialInputSchema = z.object({
  title: z.string().trim().min(1, 'Anna pätevyydelle otsikko.'),
  issuer: z.string().trim().nullable().optional(),
  credentialType: tenderProviderCredentialTypeSchema.default('certificate'),
  validUntil: timestampSchema.nullable().optional(),
  documentReference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const tenderProviderConstraintInputSchema = z.object({
  title: z.string().trim().min(1, 'Anna rajoitteelle otsikko.'),
  constraintType: tenderProviderConstraintTypeSchema.default('other'),
  severity: tenderProviderConstraintSeveritySchema.default('soft'),
  ruleText: z.string().trim().min(1, 'Kuvaa rajoite tai ehto.'),
  mitigationNote: z.string().trim().nullable().optional(),
});

const tenderProviderDocumentInputSchema = z.object({
  title: z.string().trim().min(1, 'Anna dokumentille nimi.'),
  documentType: tenderProviderDocumentTypeSchema.default('other'),
  sourceReference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const tenderProviderResponseTemplateInputSchema = z.object({
  title: z.string().trim().min(1, 'Anna vastauspohjalle nimi.'),
  templateType: tenderProviderResponseTemplateTypeSchema.default('other'),
  contentMd: z.string().trim().min(1, 'Kirjoita vastauspohjan sisältö.'),
});

export const upsertTenderProviderProfileInputSchema = tenderProviderProfileInputSchema;
export const upsertTenderProviderContactInputSchema = tenderProviderContactInputSchema;
export const upsertTenderProviderCredentialInputSchema = tenderProviderCredentialInputSchema;
export const upsertTenderProviderConstraintInputSchema = tenderProviderConstraintInputSchema;
export const upsertTenderProviderDocumentInputSchema = tenderProviderDocumentInputSchema;
export const upsertTenderProviderResponseTemplateInputSchema = tenderProviderResponseTemplateInputSchema;

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
  reimportStatus: tenderDraftPackageReimportStatusSchema.default('never_imported'),
  importRevision: z.number().int().min(0).default(0),
  lastImportPayloadHash: z.string().trim().nullable().optional(),
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
  providerProfile: tenderProviderProfileDetailsSchema.nullable().optional(),
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
export type TenderProviderDeliveryScope = z.infer<typeof tenderProviderDeliveryScopeSchema>;
export type TenderProviderCredentialType = z.infer<typeof tenderProviderCredentialTypeSchema>;
export type TenderProviderConstraintType = z.infer<typeof tenderProviderConstraintTypeSchema>;
export type TenderProviderConstraintSeverity = z.infer<typeof tenderProviderConstraintSeveritySchema>;
export type TenderProviderDocumentType = z.infer<typeof tenderProviderDocumentTypeSchema>;
export type TenderProviderResponseTemplateType = z.infer<typeof tenderProviderResponseTemplateTypeSchema>;
export type TenderDraftPackageStatus = z.infer<typeof tenderDraftPackageStatusSchema>;
export type TenderDraftPackageImportStatus = z.infer<typeof tenderDraftPackageImportStatusSchema>;
export type TenderDraftPackageReimportStatus = z.infer<typeof tenderDraftPackageReimportStatusSchema>;
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
export type TenderUsageEventType = z.infer<typeof tenderUsageEventTypeSchema>;

export type TenderPackageSummary = z.infer<typeof tenderPackageSummarySchema>;
export type TenderPackage = z.infer<typeof tenderPackageSchema>;
export type TenderDocument = z.infer<typeof tenderDocumentSchema>;
export type TenderDocumentExtraction = z.infer<typeof tenderDocumentExtractionSchema>;
export type TenderDocumentChunk = z.infer<typeof tenderDocumentChunkSchema>;
export type TenderResultEvidence = z.infer<typeof tenderResultEvidenceSchema>;
export type TenderExtractionCoverage = z.infer<typeof tenderExtractionCoverageSchema>;
export type TenderAnalysisReadiness = z.infer<typeof tenderAnalysisReadinessSchema>;
export type TenderUsageSummaryEvent = z.infer<typeof tenderUsageSummaryEventSchema>;
export type TenderUsageSummary = z.infer<typeof tenderUsageSummarySchema>;
export type TenderAnalysisJob = z.infer<typeof tenderAnalysisJobSchema>;
export type TenderRequirement = z.infer<typeof tenderRequirementSchema>;
export type TenderMissingItem = z.infer<typeof tenderMissingItemSchema>;
export type TenderRiskFlag = z.infer<typeof tenderRiskFlagSchema>;
export type TenderGoNoGoAssessment = z.infer<typeof tenderGoNoGoAssessmentSchema>;
export type TenderReferenceProfile = z.infer<typeof tenderReferenceProfileSchema>;
export type TenderProviderProfile = z.infer<typeof tenderProviderProfileSchema>;
export type TenderProviderContact = z.infer<typeof tenderProviderContactSchema>;
export type TenderProviderCredential = z.infer<typeof tenderProviderCredentialSchema>;
export type TenderProviderConstraint = z.infer<typeof tenderProviderConstraintSchema>;
export type TenderProviderDocument = z.infer<typeof tenderProviderDocumentSchema>;
export type TenderProviderResponseTemplate = z.infer<typeof tenderProviderResponseTemplateSchema>;
export type TenderProviderProfileDetails = z.infer<typeof tenderProviderProfileDetailsSchema>;
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
export type UpsertTenderProviderProfileInput = z.infer<typeof upsertTenderProviderProfileInputSchema>;
export type UpsertTenderProviderContactInput = z.infer<typeof upsertTenderProviderContactInputSchema>;
export type UpsertTenderProviderCredentialInput = z.infer<typeof upsertTenderProviderCredentialInputSchema>;
export type UpsertTenderProviderConstraintInput = z.infer<typeof upsertTenderProviderConstraintInputSchema>;
export type UpsertTenderProviderDocumentInput = z.infer<typeof upsertTenderProviderDocumentInputSchema>;
export type UpsertTenderProviderResponseTemplateInput = z.infer<typeof upsertTenderProviderResponseTemplateInputSchema>;
export type UpdateTenderDraftPackageItemInput = z.infer<typeof updateTenderDraftPackageItemInputSchema>;
export type UpdateTenderWorkflowInput = z.infer<typeof updateTenderWorkflowInputSchema>;