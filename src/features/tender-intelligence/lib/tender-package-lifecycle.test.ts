import { describe, expect, it } from 'vitest';

import { deriveTenderPackageLifecycleStatus } from './tender-package-lifecycle';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createPackageDetails(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti / status',
      description: null,
      status: 'draft',
      createdAt: '2026-04-07T08:00:00.000Z',
      updatedAt: '2026-04-07T08:00:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      linkedCustomerId: null,
      linkedProjectId: null,
      linkedQuoteId: null,
      currentJobId: null,
      summary: {
        documentCount: 1,
        requirementCount: 0,
        missingItemCount: 0,
        riskCount: 0,
        reviewTaskCount: 0,
      },
    },
    documents: [],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [],
    latestAnalysisJob: null,
    analysisReadiness: {
      canStart: false,
      blockedReason: 'Lisää vielä extraction-data.',
      coverage: {
        totalDocuments: 1,
        uploadedDocuments: 1,
        supportedDocuments: 1,
        extractedDocuments: 0,
        extractedChunks: 0,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 1,
      },
    },
    results: {
      requirements: [],
      missingItems: [],
      riskFlags: [],
      goNoGoAssessment: null,
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [],
    },
  };
}

describe('tender-package-lifecycle', () => {
  it('returns ready-for-analysis when the extraction basis is complete but no results exist yet', () => {
    const packageDetails = createPackageDetails();
    packageDetails.analysisReadiness.canStart = true;
    packageDetails.analysisReadiness.blockedReason = null;
    packageDetails.analysisReadiness.coverage.extractedDocuments = 1;
    packageDetails.analysisReadiness.coverage.extractedChunks = 4;
    packageDetails.analysisReadiness.coverage.documentsNeedingExtraction = 0;

    expect(deriveTenderPackageLifecycleStatus({ packageDetails })).toBe('ready-for-analysis');
  });

  it('returns analysis-pending while the latest analysis job is active', () => {
    const packageDetails = createPackageDetails();
    packageDetails.analysisReadiness.canStart = true;
    packageDetails.latestAnalysisJob = {
      id: '33333333-3333-4333-8333-333333333333',
      packageId: packageDetails.package.id,
      jobType: 'placeholder_analysis',
      status: 'running',
      stageLabel: 'Ajo käynnissä',
      provider: null,
      model: null,
      requestedAt: '2026-04-07T08:10:00.000Z',
      startedAt: '2026-04-07T08:11:00.000Z',
      completedAt: null,
      errorMessage: null,
    };

    expect(deriveTenderPackageLifecycleStatus({ packageDetails })).toBe('analysis-pending');
  });

  it('returns review-needed when result-domain already contains findings', () => {
    const packageDetails = createPackageDetails();
    packageDetails.results.requirements.push({
      id: '44444444-4444-4444-8444-444444444444',
      packageId: packageDetails.package.id,
      sourceDocumentId: null,
      requirementType: 'technical',
      title: 'Vaatimus',
      description: 'Perusvaatimus',
      status: 'covered',
      confidence: 0.82,
      sourceExcerpt: null,
      reviewStatus: 'accepted',
      reviewNote: null,
      reviewedByUserId: null,
      reviewedAt: null,
      resolutionStatus: 'resolved',
      resolutionNote: null,
      resolvedByUserId: null,
      resolvedAt: null,
      assignedToUserId: null,
    });

    expect(deriveTenderPackageLifecycleStatus({ packageDetails, draftPackageStatuses: ['draft'] })).toBe('review-needed');
  });

  it('returns completed when at least one draft package has been exported', () => {
    const packageDetails = createPackageDetails();
    packageDetails.package.status = 'review-needed';

    expect(deriveTenderPackageLifecycleStatus({
      packageDetails,
      draftPackageStatuses: ['draft', 'reviewed', 'exported'],
    })).toBe('completed');
  });

  it('preserves completed fallback when draft package statuses have not been loaded yet', () => {
    const packageDetails = createPackageDetails();
    packageDetails.package.status = 'completed';

    expect(deriveTenderPackageLifecycleStatus({ packageDetails })).toBe('completed');
  });
});