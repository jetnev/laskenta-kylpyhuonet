import type {
  CreateTenderPackageInput,
  TenderAnalysisJob,
  TenderAnalysisJobStatus,
  TenderAnalysisJobType,
  TenderDocumentChunk,
  TenderDocumentExtraction,
  TenderDraftArtifact,
  TenderDocument,
  TenderMissingItem,
  TenderPackage,
  TenderPackageDetails,
  TenderPackageResults,
  TenderReferenceSuggestion,
  TenderRequirement,
  TenderReviewTask,
  TenderRiskFlag,
} from '../types/tender-intelligence';

export interface TenderIntelligenceBackendAdapter {
  listTenderPackages(): Promise<TenderPackage[]>;
  getTenderPackageById(packageId: string): Promise<TenderPackageDetails | null>;
  createTenderPackage(input: CreateTenderPackageInput): Promise<TenderPackageDetails>;
  createAnalysisJob(
    packageId: string,
    options?: { jobType?: TenderAnalysisJobType; status?: TenderAnalysisJobStatus }
  ): Promise<TenderAnalysisJob>;
  listAnalysisJobsForPackage(packageId: string): Promise<TenderAnalysisJob[]>;
  getLatestAnalysisJobForPackage(packageId: string): Promise<TenderAnalysisJob | null>;
  listRequirementsForPackage(packageId: string): Promise<TenderRequirement[]>;
  listMissingItemsForPackage(packageId: string): Promise<TenderMissingItem[]>;
  listRiskFlagsForPackage(packageId: string): Promise<TenderRiskFlag[]>;
  listReferenceSuggestionsForPackage(packageId: string): Promise<TenderReferenceSuggestion[]>;
  listDraftArtifactsForPackage(packageId: string): Promise<TenderDraftArtifact[]>;
  listReviewTasksForPackage(packageId: string): Promise<TenderReviewTask[]>;
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