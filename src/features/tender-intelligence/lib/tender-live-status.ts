import { isTenderAnalysisJobActive } from './tender-analysis';
import { resolveTenderDocumentExtractionStatus } from './tender-document-extraction';
import type { TenderPackageDetails } from '../types/tender-intelligence';

const ACTIVE_EXTRACTION_STATUSES = new Set(['pending', 'extracting']);

export interface TenderLiveStatusPollingInput {
  selectedPackageId: string | null;
  selectedPackage: TenderPackageDetails | null;
  startingAnalysisPackageId: string | null;
  extractingPackageId: string | null;
  extractingDocumentIds: string[];
}

function hasActiveExtraction(packageDetails: TenderPackageDetails | null) {
  if (!packageDetails) {
    return false;
  }

  return packageDetails.documentExtractions.some((item) =>
    ACTIVE_EXTRACTION_STATUSES.has(resolveTenderDocumentExtractionStatus(item.extractionStatus))
  );
}

function hasLocallyActiveDocumentExtraction(input: TenderLiveStatusPollingInput) {
  if (!input.selectedPackage || input.extractingDocumentIds.length < 1) {
    return false;
  }

  const selectedDocumentIds = new Set(input.selectedPackage.documents.map((item) => item.id));
  return input.extractingDocumentIds.some((documentId) => selectedDocumentIds.has(documentId));
}

export function shouldPollTenderPackageLiveStatus(input: TenderLiveStatusPollingInput) {
  if (!input.selectedPackageId) {
    return false;
  }

  if (input.startingAnalysisPackageId === input.selectedPackageId) {
    return true;
  }

  if (input.extractingPackageId === input.selectedPackageId) {
    return true;
  }

  if (hasLocallyActiveDocumentExtraction(input)) {
    return true;
  }

  if (!input.selectedPackage || input.selectedPackage.package.id !== input.selectedPackageId) {
    return false;
  }

  if (input.selectedPackage.latestAnalysisJob && isTenderAnalysisJobActive(input.selectedPackage.latestAnalysisJob.status)) {
    return true;
  }

  return hasActiveExtraction(input.selectedPackage);
}

export function getTenderPackageLiveStatusPollingIntervalMs(input: TenderLiveStatusPollingInput) {
  if (!shouldPollTenderPackageLiveStatus(input)) {
    return null;
  }

  const hasLocalInFlightAction = input.startingAnalysisPackageId === input.selectedPackageId
    || input.extractingPackageId === input.selectedPackageId
    || hasLocallyActiveDocumentExtraction(input);

  return hasLocalInFlightAction ? 2000 : 5000;
}