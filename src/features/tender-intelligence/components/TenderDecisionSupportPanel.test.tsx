import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderDecisionSupportPanel from './TenderDecisionSupportPanel';
import { buildTenderDecisionSupport } from '../lib/tender-decision-support';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createPackageDetails(): TenderPackageDetails {
  return {
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
        requirementCount: 1,
        missingItemCount: 0,
        riskCount: 1,
        reviewTaskCount: 1,
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
    resultEvidence: [
      {
        id: 'ev-1',
        packageId: 'pkg-1',
        sourceDocumentId: 'doc-1',
        extractionId: 'ext-1',
        chunkId: 'chunk-1',
        targetEntityType: 'requirement',
        targetEntityId: 'req-1',
        excerptText: 'Tekninen toteutussuunnitelma tulee liittää tarjoukseen.',
        locatorText: 'tarjouspyynto.txt / chunk 1',
        confidence: 0.82,
        createdAt: '2026-04-06T08:06:00.000Z',
        updatedAt: '2026-04-06T08:06:00.000Z',
      },
    ],
    analysisJobs: [
      {
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
      },
    ],
    latestAnalysisJob: {
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
      reviewTasks: [
        {
          id: 'task-1',
          packageId: 'pkg-1',
          taskType: 'decision',
          title: 'Päätä etenemisestä',
          description: null,
          status: 'todo',
          assignedToUserId: null,
          createdAt: '2026-04-06T08:20:00.000Z',
          updatedAt: '2026-04-06T08:20:00.000Z',
          reviewStatus: 'unreviewed',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'open',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
        },
      ],
    },
  };
}

describe('TenderDecisionSupportPanel', () => {
  it('renders the stored baseline, operational status, blockers and next actions', () => {
    const decisionSupport = buildTenderDecisionSupport(createPackageDetails());
    const markup = renderToStaticMarkup(<TenderDecisionSupportPanel decisionSupport={decisionSupport} />);

    expect(markup).toContain('Päätöstuki');
    expect(markup).toContain('Tallennettu baseline');
    expect(markup).toContain('Operatiivinen tila');
    expect(markup).toContain('No-Go');
    expect(markup).toContain('Nykyiset blokkerit');
    expect(markup).toContain('Ratkaise puuttuvat vaatimukset');
    expect(markup).toContain('Vaatimukset');
    expect(markup).toContain('Riskit');
  });
});