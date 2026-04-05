import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderResultPanels from './TenderResultPanels';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createPackageWithEvidence(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-05T08:00:00.000Z',
      updatedAt: '2026-04-05T08:00:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      linkedCustomerId: null,
      linkedProjectId: null,
      linkedQuoteId: null,
      currentJobId: null,
      summary: {
        documentCount: 1,
        requirementCount: 1,
        missingItemCount: 0,
        riskCount: 0,
        reviewTaskCount: 0,
      },
    },
    documents: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        packageId: '11111111-1111-4111-8111-111111111111',
        fileName: 'tarjouspyynto.txt',
        mimeType: 'text/plain',
        kind: 'other',
        storageBucket: 'tender-intelligence',
        storagePath: 'org/package/tarjouspyynto.txt',
        fileSizeBytes: 100,
        checksum: null,
        uploadError: null,
        uploadState: 'uploaded',
        parseStatus: 'completed',
        createdAt: '2026-04-05T08:00:00.000Z',
        updatedAt: '2026-04-05T08:00:00.000Z',
      },
    ],
    documentExtractions: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        documentId: '33333333-3333-4333-8333-333333333333',
        packageId: '11111111-1111-4111-8111-111111111111',
        extractionStatus: 'extracted',
        extractorType: 'plain_text',
        sourceMimeType: 'text/plain',
        characterCount: 200,
        chunkCount: 1,
        extractedText: 'Purettu teksti',
        errorMessage: null,
        extractedAt: '2026-04-05T08:05:00.000Z',
        createdAt: '2026-04-05T08:05:00.000Z',
        updatedAt: '2026-04-05T08:05:00.000Z',
      },
    ],
    resultEvidence: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        packageId: '11111111-1111-4111-8111-111111111111',
        sourceDocumentId: '33333333-3333-4333-8333-333333333333',
        extractionId: '44444444-4444-4444-8444-444444444444',
        chunkId: '66666666-6666-4666-8666-666666666666',
        targetEntityType: 'requirement',
        targetEntityId: '77777777-7777-4777-8777-777777777777',
        excerptText: 'Tekninen toimituslaajuus kuvataan tässä extracted chunkissa.',
        locatorText: 'tarjouspyynto.txt / chunk 1',
        confidence: 0.68,
        createdAt: '2026-04-05T08:06:00.000Z',
        updatedAt: '2026-04-05T08:06:00.000Z',
      },
    ],
    analysisJobs: [],
    latestAnalysisJob: null,
    analysisReadiness: {
      canStart: true,
      blockedReason: null,
      coverage: {
        totalDocuments: 1,
        uploadedDocuments: 1,
        supportedDocuments: 1,
        extractedDocuments: 1,
        extractedChunks: 1,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 0,
      },
    },
    results: {
      requirements: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: '33333333-3333-4333-8333-333333333333',
          requirementType: 'technical',
          title: 'Vahvista tekninen toimituslaajuus',
          description: 'Placeholder-vaatimus',
          status: 'unreviewed',
          confidence: 0.42,
          sourceExcerpt: 'Tekninen toimituslaajuus kuvataan tässä extracted chunkissa.',
          reviewStatus: 'unreviewed',
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
      riskFlags: [],
      goNoGoAssessment: null,
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [],
    },
  };
}

describe('TenderResultPanels', () => {
  it('renders evidence previews and workflow actions for result rows with provenance', () => {
    const markup = renderToStaticMarkup(
      <TenderResultPanels
        selectedPackage={createPackageWithEvidence()}
        currentUserId="user-1"
        actorNameById={{ 'user-1': 'Copilot Test' }}
        onUpdateRequirement={async () => undefined}
        onUpdateMissingItem={async () => undefined}
        onUpdateRiskFlag={async () => undefined}
        onUpdateReviewTask={async () => undefined}
      />,
    );

    expect(markup).toContain('Review workflow');
    expect(markup).toContain('Evidence');
    expect(markup).toContain('Hyväksy');
    expect(markup).toContain('Vaatii huomiota');
    expect(markup).toContain('Ratkaisu: Avoin');
    expect(markup).toContain('tarjouspyynto.txt');
    expect(markup).toContain('tarjouspyynto.txt / chunk 1');
    expect(markup).toContain('Tekninen toimituslaajuus kuvataan tässä extracted chunkissa.');
    expect(markup).toContain('1 lähde');
  });
});