import { describe, expect, it } from 'vitest';

import { buildTenderDecisionSupport } from './tender-decision-support';
import type { TenderAnalysisJob, TenderPackageDetails } from '../types/tender-intelligence';

function createAnalysisJob(overrides: Partial<TenderAnalysisJob> = {}): TenderAnalysisJob {
  return {
    id: 'job-1',
    packageId: 'pkg-1',
    jobType: 'placeholder_analysis',
    status: 'completed',
    stageLabel: 'Baseline-analyysi valmis',
    provider: null,
    model: null,
    requestedAt: '2026-04-06T08:00:00.000Z',
    startedAt: '2026-04-06T08:01:00.000Z',
    completedAt: '2026-04-06T08:02:00.000Z',
    errorMessage: null,
    ...overrides,
  };
}

function createPackageDetails(overrides: Partial<TenderPackageDetails> = {}): TenderPackageDetails {
  const base: TenderPackageDetails = {
    package: {
      id: 'pkg-1',
      name: 'Tarjouspaketti',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-06T08:00:00.000Z',
      updatedAt: '2026-04-06T08:00:00.000Z',
      createdByUserId: 'user-1',
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
    documents: [
      {
        id: 'doc-1',
        packageId: 'pkg-1',
        fileName: 'tarjouspyynto.txt',
        mimeType: 'text/plain',
        kind: 'other',
        storageBucket: 'tender-intelligence',
        storagePath: 'org/pkg/tarjouspyynto.txt',
        fileSizeBytes: 120,
        checksum: null,
        uploadError: null,
        uploadState: 'uploaded',
        parseStatus: 'completed',
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
      },
    ],
    documentExtractions: [
      {
        id: 'ext-1',
        documentId: 'doc-1',
        packageId: 'pkg-1',
        extractionStatus: 'extracted',
        extractorType: 'plain_text',
        sourceMimeType: 'text/plain',
        characterCount: 320,
        chunkCount: 2,
        extractedText: 'Purettu teksti',
        errorMessage: null,
        extractedAt: '2026-04-06T08:05:00.000Z',
        createdAt: '2026-04-06T08:05:00.000Z',
        updatedAt: '2026-04-06T08:05:00.000Z',
      },
    ],
    resultEvidence: [],
    analysisJobs: [createAnalysisJob()],
    latestAnalysisJob: createAnalysisJob(),
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
      requirements: [],
      missingItems: [],
      riskFlags: [],
      goNoGoAssessment: null,
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [],
    },
  };

  return {
    ...base,
    ...overrides,
    package: {
      ...base.package,
      ...overrides.package,
      summary: {
        ...base.package.summary,
        ...overrides.package?.summary,
      },
    },
    analysisReadiness: {
      ...base.analysisReadiness,
      ...overrides.analysisReadiness,
      coverage: {
        ...base.analysisReadiness.coverage,
        ...overrides.analysisReadiness?.coverage,
      },
    },
    results: {
      ...base.results,
      ...overrides.results,
    },
  };
}

describe('buildTenderDecisionSupport', () => {
  it('stays pending when the package has not reached analyzable state', () => {
    const summary = buildTenderDecisionSupport(
      createPackageDetails({
        analysisJobs: [],
        latestAnalysisJob: null,
        analysisReadiness: {
          canStart: false,
          blockedReason: 'Käynnistä extraction vähintään yhdelle tuetulle dokumentille ennen analyysin käynnistämistä.',
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
      })
    );

    expect(summary.operationalRecommendation).toBe('pending');
    expect(summary.signals.find((signal) => signal.key === 'analysis')?.status).toBe('critical');
    expect(summary.blockingReasons).toContain('Käynnistä extraction vähintään yhdelle tuetulle dokumentille ennen analyysin käynnistämistä.');
  });

  it('returns no-go when missing requirements and high risks remain open after analysis', () => {
    const summary = buildTenderDecisionSupport(
      createPackageDetails({
        results: {
          requirements: [
            {
              id: 'req-1',
              packageId: 'pkg-1',
              sourceDocumentId: 'doc-1',
              requirementType: 'technical',
              title: 'Toimita tekninen toteutussuunnitelma',
              description: null,
              status: 'missing',
              confidence: 0.82,
              sourceExcerpt: 'Tekninen toteutussuunnitelma tulee liittää tarjoukseen.',
              reviewStatus: 'needs_attention',
              reviewNote: null,
              reviewedByUserId: null,
              reviewedAt: null,
              resolutionStatus: 'open',
              resolutionNote: null,
              resolvedByUserId: null,
              resolvedAt: null,
              assignedToUserId: null,
            },
          ],
          missingItems: [],
          riskFlags: [
            {
              id: 'risk-1',
              packageId: 'pkg-1',
              riskType: 'delivery',
              title: 'Aikatauluriski on korkea',
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
            },
          ],
          goNoGoAssessment: {
            packageId: 'pkg-1',
            recommendation: 'pending',
            summary: 'Baseline-analyysi odottaa katselmointia.',
            confidence: 0.61,
            updatedAt: '2026-04-06T08:10:00.000Z',
          },
          referenceSuggestions: [],
          draftArtifacts: [],
          reviewTasks: [],
        },
      })
    );

    expect(summary.operationalRecommendation).toBe('no-go');
    expect(summary.criticalCount).toBeGreaterThanOrEqual(2);
    expect(summary.blockingReasons).toContain('1 vaatimus(ta) on edelleen merkitty puuttuvaksi.');
    expect(summary.blockingReasons).toContain('1 korkean vakavuuden riski(ä) on edelleen avoinna.');
  });

  it('returns go when the analyzed package no longer has open blockers or workflow backlog', () => {
    const summary = buildTenderDecisionSupport(
      createPackageDetails({
        results: {
          requirements: [
            {
              id: 'req-1',
              packageId: 'pkg-1',
              sourceDocumentId: 'doc-1',
              requirementType: 'technical',
              title: 'Toimita tekninen toteutussuunnitelma',
              description: null,
              status: 'covered',
              confidence: 0.82,
              sourceExcerpt: 'Tekninen toteutussuunnitelma tulee liittää tarjoukseen.',
              reviewStatus: 'accepted',
              reviewNote: 'Ok',
              reviewedByUserId: 'user-1',
              reviewedAt: '2026-04-06T08:15:00.000Z',
              resolutionStatus: 'resolved',
              resolutionNote: 'Katettu',
              resolvedByUserId: 'user-1',
              resolvedAt: '2026-04-06T08:16:00.000Z',
              assignedToUserId: 'user-1',
            },
          ],
          missingItems: [],
          riskFlags: [],
          goNoGoAssessment: {
            packageId: 'pkg-1',
            recommendation: 'pending',
            summary: 'Baseline-analyysi odottaa katselmointia.',
            confidence: 0.61,
            updatedAt: '2026-04-06T08:10:00.000Z',
          },
          referenceSuggestions: [],
          draftArtifacts: [],
          reviewTasks: [],
        },
      })
    );

    expect(summary.operationalRecommendation).toBe('go');
    expect(summary.blockingReasons).toEqual([]);
    expect(summary.warningCount).toBe(0);
    expect(summary.nextActions).toContain('Vahvista go/no-go-päätös ja siirry luonnospaketin viimeistelyyn tai tarjouspalaveriin.');
  });
});