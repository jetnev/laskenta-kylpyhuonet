import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderAnalysisPanel from './TenderAnalysisPanel';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createBlockedPackageDetails(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'draft',
      createdAt: '2026-04-05T08:00:00.000Z',
      updatedAt: '2026-04-05T08:00:00.000Z',
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
    documentExtractions: [],
    resultEvidence: [],
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
  };
}

describe('TenderAnalysisPanel', () => {
  it('renders the extraction blocker and chunk readiness summary', () => {
    const markup = renderToStaticMarkup(
      <TenderAnalysisPanel
        selectedPackage={createBlockedPackageDetails()}
        onStartAnalysis={async () => {
          return undefined;
        }}
      />
    );

    expect(markup).toContain('Käynnistä extraction vähintään yhdelle tuetulle dokumentille ennen analyysin käynnistämistä.');
    expect(markup).toContain('Evidence-chunkit');
    expect(markup).toContain('Runner hylkää nyt ajot, joilta puuttuu extraction-aware evidence-lähde.');
  });
});