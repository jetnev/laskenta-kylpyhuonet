import type {
  TenderDraftPackageImportStatus,
  TenderDraftPackage,
  CreateTenderReferenceProfileInput,
  CreateTenderPackageInput,
  TenderAnalysisJob,
  TenderAnalysisJobStatus,
  TenderAnalysisJobType,
  TenderAnalysisReadiness,
  TenderDocumentChunk,
  TenderDocumentExtraction,
  TenderDraftArtifact,
  TenderDocument,
  TenderExtractionCoverage,
  TenderMissingItem,
  TenderPackage,
  TenderPackageDetails,
  TenderPackageResults,
  TenderProviderProfileDetails,
  TenderReferenceProfile,
  TenderResultEvidence,
  TenderResultEvidenceTargetType,
  TenderReferenceSuggestion,
  TenderRequirement,
  TenderReviewTask,
  TenderRiskFlag,
  UpsertTenderProviderConstraintInput,
  UpsertTenderProviderContactInput,
  UpsertTenderProviderCredentialInput,
  UpsertTenderProviderDocumentInput,
  UpsertTenderProviderProfileInput,
  UpsertTenderProviderResponseTemplateInput,
  UpdateTenderDraftPackageItemInput,
  UpdateTenderReferenceProfileInput,
  UpdateTenderWorkflowInput,
} from '../types/tender-intelligence';
import type {
  TenderDraftPackageImportDiagnostics,
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderEditorImportResult,
  TenderImportRegistryRepairAction,
  TenderImportRegistryRepairPreview,
  TenderImportRegistryRepairResult,
  TenderEditorSelectiveReimportSelection,
  TenderEditorReconciliationPreview,
  TenderEditorImportValidationResult,
} from '../types/tender-editor-import';

export interface TenderIntelligenceBackendAdapter {
  listTenderPackages(): Promise<TenderPackage[]>;
  getTenderPackageById(packageId: string): Promise<TenderPackageDetails | null>;
  createTenderPackage(input: CreateTenderPackageInput): Promise<TenderPackageDetails>;
  upsertTenderProviderProfile(packageId: string, input: UpsertTenderProviderProfileInput): Promise<TenderProviderProfileDetails>;
  upsertTenderProviderContact(
    packageId: string,
    contactId: string | null,
    input: UpsertTenderProviderContactInput,
  ): Promise<TenderProviderProfileDetails>;
  deleteTenderProviderContact(packageId: string, contactId: string): Promise<void>;
  upsertTenderProviderCredential(
    packageId: string,
    credentialId: string | null,
    input: UpsertTenderProviderCredentialInput,
  ): Promise<TenderProviderProfileDetails>;
  deleteTenderProviderCredential(packageId: string, credentialId: string): Promise<void>;
  upsertTenderProviderConstraint(
    packageId: string,
    constraintId: string | null,
    input: UpsertTenderProviderConstraintInput,
  ): Promise<TenderProviderProfileDetails>;
  deleteTenderProviderConstraint(packageId: string, constraintId: string): Promise<void>;
  upsertTenderProviderDocument(
    packageId: string,
    documentId: string | null,
    input: UpsertTenderProviderDocumentInput,
  ): Promise<TenderProviderProfileDetails>;
  deleteTenderProviderDocument(packageId: string, documentId: string): Promise<void>;
  upsertTenderProviderResponseTemplate(
    packageId: string,
    templateId: string | null,
    input: UpsertTenderProviderResponseTemplateInput,
  ): Promise<TenderProviderProfileDetails>;
  deleteTenderProviderResponseTemplate(packageId: string, templateId: string): Promise<void>;
  createAnalysisJob(
    packageId: string,
    options?: { jobType?: TenderAnalysisJobType; status?: TenderAnalysisJobStatus }
  ): Promise<TenderAnalysisJob>;
  listAnalysisJobsForPackage(packageId: string): Promise<TenderAnalysisJob[]>;
  getLatestAnalysisJobForPackage(packageId: string): Promise<TenderAnalysisJob | null>;
  listRequirementsForPackage(packageId: string): Promise<TenderRequirement[]>;
  listMissingItemsForPackage(packageId: string): Promise<TenderMissingItem[]>;
  listRiskFlagsForPackage(packageId: string): Promise<TenderRiskFlag[]>;
  listReferenceProfiles(): Promise<TenderReferenceProfile[]>;
  createReferenceProfile(input: CreateTenderReferenceProfileInput): Promise<TenderReferenceProfile>;
  importReferenceProfiles(inputs: CreateTenderReferenceProfileInput[]): Promise<TenderReferenceProfile[]>;
  updateReferenceProfile(profileId: string, input: UpdateTenderReferenceProfileInput): Promise<TenderReferenceProfile>;
  deleteReferenceProfile(profileId: string): Promise<void>;
  listDraftPackagesForTenderPackage(packageId: string): Promise<TenderDraftPackage[]>;
  getDraftPackageById(draftPackageId: string): Promise<TenderDraftPackage | null>;
  createDraftPackageFromReviewedResults(packageId: string): Promise<TenderDraftPackage>;
  updateDraftPackageItem(itemId: string, input: UpdateTenderDraftPackageItemInput): Promise<TenderDraftPackage>;
  markDraftPackageReviewed(draftPackageId: string): Promise<TenderDraftPackage>;
  markDraftPackageExported(draftPackageId: string): Promise<TenderDraftPackage>;
  previewEditorImportForDraftPackage(draftPackageId: string): Promise<TenderEditorImportPreview>;
  validateEditorImportForDraftPackage(draftPackageId: string): Promise<TenderEditorImportValidationResult>;
  getDraftPackageImportStatus(draftPackageId: string): Promise<TenderDraftPackageImportState>;
  getDraftPackageImportDiagnostics(draftPackageId: string): Promise<TenderDraftPackageImportDiagnostics>;
  previewDraftPackageReimport(draftPackageId: string): Promise<TenderEditorReconciliationPreview>;
  previewDraftPackageImportRegistryRepair(draftPackageId: string): Promise<TenderImportRegistryRepairPreview>;
  importDraftPackageToEditor(draftPackageId: string): Promise<TenderEditorImportResult>;
  reimportDraftPackageToEditor(draftPackageId: string, selection?: TenderEditorSelectiveReimportSelection): Promise<TenderEditorImportResult>;
  refreshDraftPackageImportDiagnosticsFromQuote(draftPackageId: string): Promise<TenderDraftPackageImportDiagnostics>;
  repairDraftPackageImportRegistry(draftPackageId: string, action: TenderImportRegistryRepairAction): Promise<TenderImportRegistryRepairResult>;
  markDraftPackageImported(draftPackageId: string, importedQuoteId: string, importStatus?: TenderDraftPackageImportStatus): Promise<TenderDraftPackage>;
  listDraftPackageImportRuns(draftPackageId: string): Promise<TenderDraftPackageImportRun[]>;
  listReferenceSuggestionsForPackage(packageId: string): Promise<TenderReferenceSuggestion[]>;
  listDraftArtifactsForPackage(packageId: string): Promise<TenderDraftArtifact[]>;
  listReviewTasksForPackage(packageId: string): Promise<TenderReviewTask[]>;
  updateRequirementWorkflow(requirementId: string, input: UpdateTenderWorkflowInput): Promise<TenderRequirement>;
  updateMissingItemWorkflow(missingItemId: string, input: UpdateTenderWorkflowInput): Promise<TenderMissingItem>;
  updateRiskFlagWorkflow(riskFlagId: string, input: UpdateTenderWorkflowInput): Promise<TenderRiskFlag>;
  updateReferenceSuggestionWorkflow(referenceSuggestionId: string, input: UpdateTenderWorkflowInput): Promise<TenderReferenceSuggestion>;
  updateDraftArtifactWorkflow(draftArtifactId: string, input: UpdateTenderWorkflowInput): Promise<TenderDraftArtifact>;
  updateReviewTaskWorkflow(reviewTaskId: string, input: UpdateTenderWorkflowInput): Promise<TenderReviewTask>;
  recomputeReferenceSuggestionsForPackage(packageId: string): Promise<TenderReferenceSuggestion[]>;
  clearAnalysisResultsForPackage(packageId: string): Promise<void>;
  seedPlaceholderAnalysisResults(packageId: string): Promise<TenderPackageResults>;
  startPlaceholderAnalysis(packageId: string): Promise<TenderAnalysisJob>;
  markAnalysisJobRunning(jobId: string): Promise<TenderAnalysisJob>;
  markAnalysisJobCompleted(jobId: string): Promise<TenderAnalysisJob>;
  markAnalysisJobFailed(jobId: string, errorMessage: string): Promise<TenderAnalysisJob>;
  uploadTenderDocument(packageId: string, file: File): Promise<TenderDocument>;
  listTenderDocuments(packageId: string): Promise<TenderDocument[]>;
  startDocumentExtraction(packageId: string, documentId: string): Promise<TenderDocumentExtraction>;
  listDocumentExtractionsForPackage(packageId: string): Promise<TenderDocumentExtraction[]>;
  getDocumentExtractionForDocument(documentId: string): Promise<TenderDocumentExtraction | null>;
  listDocumentChunksForDocument(documentId: string): Promise<TenderDocumentChunk[]>;
  listEvidenceForPackage(packageId: string): Promise<TenderResultEvidence[]>;
  listEvidenceForTarget(
    packageId: string,
    targetEntityType: TenderResultEvidenceTargetType,
    targetEntityId: string
  ): Promise<TenderResultEvidence[]>;
  getExtractionCoverageForPackage(packageId: string): Promise<TenderExtractionCoverage>;
  getAnalysisReadinessForPackage(packageId: string): Promise<TenderAnalysisReadiness>;
  clearDocumentExtractionForDocument(documentId: string): Promise<void>;
  deleteTenderDocument(documentId: string): Promise<void>;
  getTenderAnalysisStatus(packageId: string): Promise<TenderAnalysisJob | null>;
  getTenderResults(packageId: string): Promise<TenderPackageResults | null>;
}

export interface TenderIntelligenceBackendPlan {
  persistence: 'supabase';
  documentStorage: 'metadata-only' | 'supabase-storage';
  documentExtraction: 'none' | 'edge-function-runner' | 'worker-service';
  analysisExecution: 'none' | 'placeholder-runner' | 'edge-function-runner' | 'worker-service';
}

export const TENDER_INTELLIGENCE_BACKEND_PLAN: TenderIntelligenceBackendPlan = {
  persistence: 'supabase',
  documentStorage: 'supabase-storage',
  documentExtraction: 'edge-function-runner',
  analysisExecution: 'edge-function-runner',
};