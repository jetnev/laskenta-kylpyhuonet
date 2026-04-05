import type {
  CreateTenderPackageInput,
  TenderAnalysisJob,
  TenderAnalysisJobStatus,
  TenderAnalysisJobType,
  TenderDocument,
  TenderPackage,
  TenderPackageDetails,
  TenderPackageResults,
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
  startPlaceholderAnalysis(packageId: string): Promise<TenderAnalysisJob>;
  markAnalysisJobRunning(jobId: string): Promise<TenderAnalysisJob>;
  markAnalysisJobCompleted(jobId: string): Promise<TenderAnalysisJob>;
  markAnalysisJobFailed(jobId: string, errorMessage: string): Promise<TenderAnalysisJob>;
  uploadTenderDocument(packageId: string, file: File): Promise<TenderDocument>;
  listTenderDocuments(packageId: string): Promise<TenderDocument[]>;
  deleteTenderDocument(documentId: string): Promise<void>;
  getTenderAnalysisStatus(packageId: string): Promise<TenderAnalysisJob | null>;
  getTenderResults(packageId: string): Promise<TenderPackageResults | null>;
}

export interface TenderIntelligenceBackendPlan {
  persistence: 'supabase';
  documentStorage: 'metadata-only' | 'supabase-storage';
  analysisExecution: 'none' | 'placeholder-runner' | 'worker-service';
}

export const TENDER_INTELLIGENCE_BACKEND_PLAN: TenderIntelligenceBackendPlan = {
  persistence: 'supabase',
  documentStorage: 'supabase-storage',
  analysisExecution: 'placeholder-runner',
};