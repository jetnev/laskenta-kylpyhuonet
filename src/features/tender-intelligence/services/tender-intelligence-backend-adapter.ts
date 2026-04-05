import type {
  AddTenderDocumentInput,
  CreateTenderPackageInput,
  TenderAnalysisJob,
  TenderDocument,
  TenderPackage,
  TenderPackageDetails,
  TenderPackageResults,
} from '../types/tender-intelligence';

export interface TenderIntelligenceBackendAdapter {
  listTenderPackages(): Promise<TenderPackage[]>;
  getTenderPackageById(packageId: string): Promise<TenderPackageDetails | null>;
  createTenderPackage(input: CreateTenderPackageInput): Promise<TenderPackageDetails>;
  addTenderDocument(packageId: string, input: AddTenderDocumentInput): Promise<TenderDocument>;
  getTenderAnalysisStatus(packageId: string): Promise<TenderAnalysisJob | null>;
  getTenderResults(packageId: string): Promise<TenderPackageResults | null>;
}

export interface TenderIntelligenceBackendPlan {
  persistence: 'supabase';
  documentStorage: 'metadata-only' | 'supabase-storage';
  analysisExecution: 'none' | 'worker-service';
}

export const TENDER_INTELLIGENCE_BACKEND_PLAN: TenderIntelligenceBackendPlan = {
  persistence: 'supabase',
  documentStorage: 'metadata-only',
  analysisExecution: 'none',
};