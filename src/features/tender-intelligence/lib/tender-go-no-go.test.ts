import { describe, expect, it } from 'vitest';

import { buildTenderGoNoGoDecisionSupport } from './tender-go-no-go';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createPackageDetails(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-06T08:00:00.000Z',
      updatedAt: '2026-04-06T08:00:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      linkedCustomerId: null,
      linkedProjectId: null,
      linkedQuoteId: null,
      currentJobId: null,
      summary: {
        documentCount: 1,
        requirementCount: 1,
        missingItemCount: 0,
        riskCount: 1,
        reviewTaskCount: 0,
      },
    },
    documents: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        packageId: '11111111-1111-4111-8111-111111111111',
        fileName: 'tarjouspyynto.pdf',
        mimeType: 'application/pdf',
        kind: 'rfp',
        storageBucket: 'tender-intelligence',
        storagePath: 'org/package/file.pdf',
        fileSizeBytes: 100,
        checksum: null,
        uploadError: null,
        uploadState: 'uploaded',
        parseStatus: 'completed',
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
      },
    ],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [],
    latestAnalysisJob: {
      id: '44444444-4444-4444-8444-444444444444',
      packageId: '11111111-1111-4111-8111-111111111111',
      jobType: 'placeholder_analysis',
      status: 'completed',
      stageLabel: 'Valmis',
      provider: null,
      model: null,
      requestedAt: '2026-04-06T08:05:00.000Z',
      startedAt: '2026-04-06T08:06:00.000Z',
      completedAt: '2026-04-06T08:07:00.000Z',
      errorMessage: null,
    },
    analysisReadiness: {
      canStart: true,
      blockedReason: null,
      coverage: {
        totalDocuments: 1,
        uploadedDocuments: 1,
        supportedDocuments: 1,
        extractedDocuments: 1,
        extractedChunks: 2,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 0,
      },
    },
    results: {
      requirements: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: null,
          requirementType: 'technical',
          title: 'Hyväksytty vaatimus',
          description: null,
          status: 'covered',
          confidence: 0.7,
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
        },
      ],
      missingItems: [],
      riskFlags: [],
      goNoGoAssessment: {
        packageId: '11111111-1111-4111-8111-111111111111',
        recommendation: 'go',
        summary: 'Riskitaso on hyväksyttävä ja aineisto riittää etenemiseen.',
        confidence: 0.66,
        updatedAt: '2026-04-06T08:09:00.000Z',
      },
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [],
    },
  };
}

describe('tender-go-no-go', () => {
  it('reports ready state when assessment is go and no blockers remain', () => {
    const decision = buildTenderGoNoGoDecisionSupport(createPackageDetails());

    expect(decision.state).toBe('ready');
    expect(decision.recommendation).toBe('go');
    expect(decision.canProceed).toBe(true);
  });

  it('reports blocked state when a high risk remains open', () => {
    const details = createPackageDetails();
    details.results.riskFlags.push({
      id: '66666666-6666-4666-8666-666666666666',
      packageId: details.package.id,
      riskType: 'legal',
      title: 'Avoin sopimusriski',
      description: null,
      severity: 'high',
      status: 'open',
      reviewStatus: 'needs_attention',
      reviewNote: null,
      reviewedByUserId: null,
      reviewedAt: null,
      resolutionStatus: 'open',
      resolutionNote: null,
      resolvedByUserId: null,
      resolvedAt: null,
      assignedToUserId: null,
    });

    const decision = buildTenderGoNoGoDecisionSupport(details);

    expect(decision.state).toBe('blocked');
    expect(decision.openHighRiskCount).toBe(1);
    expect(decision.canProceed).toBe(false);
  });
});