import { isTenderAnalysisJobActive } from './tender-analysis';
import type { TenderDraftPackageStatus, TenderPackageDetails, TenderPackageStatus } from '../types/tender-intelligence';

const TENDER_PACKAGE_STATUS_ORDER: Record<TenderPackageStatus, number> = {
  draft: 0,
  'ready-for-analysis': 1,
  'analysis-pending': 2,
  'review-needed': 3,
  completed: 4,
};

function hasTenderResultData(packageDetails: TenderPackageDetails) {
  return packageDetails.results.requirements.length > 0
    || packageDetails.results.missingItems.length > 0
    || packageDetails.results.riskFlags.length > 0
    || packageDetails.results.referenceSuggestions.length > 0
    || packageDetails.results.reviewTasks.length > 0
    || packageDetails.results.draftArtifacts.length > 0
    || packageDetails.results.goNoGoAssessment !== null
    || packageDetails.resultEvidence.length > 0;
}

export function deriveTenderPackageLifecycleStatus(input: {
  packageDetails: TenderPackageDetails;
  draftPackageStatuses?: TenderDraftPackageStatus[] | null;
}): TenderPackageStatus {
  const { packageDetails } = input;
  const draftPackageStatuses = input.draftPackageStatuses ?? null;
  let derivedStatus: TenderPackageStatus = 'draft';

  if (packageDetails.analysisReadiness.canStart) {
    derivedStatus = 'ready-for-analysis';
  }

  if (packageDetails.latestAnalysisJob && isTenderAnalysisJobActive(packageDetails.latestAnalysisJob.status)) {
    derivedStatus = 'analysis-pending';
  }

  if (hasTenderResultData(packageDetails)) {
    derivedStatus = 'review-needed';
  }

  if (draftPackageStatuses?.includes('exported')) {
    return 'completed';
  }

  if (packageDetails.package.status === 'completed' && draftPackageStatuses === null) {
    return 'completed';
  }

  return TENDER_PACKAGE_STATUS_ORDER[packageDetails.package.status] > TENDER_PACKAGE_STATUS_ORDER[derivedStatus]
    ? packageDetails.package.status
    : derivedStatus;
}