import { describe, expect, it } from 'vitest';

import {
  getTenderPackageLiveStatusPollingIntervalMs,
  shouldPollTenderPackageLiveStatus,
  type TenderLiveStatusPollingInput,
} from './tender-live-status';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createPackageDetails(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'draft',
      createdAt: '2026-04-07T08:00:00.000Z',
      updatedAt: '2026-04-07T08:00:00.000Z',
      createdByUserId: null,
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
        id: '22222222-2222-4222-8222-222222222222',
        packageId: '11111111-1111-4111-8111-111111111111',
        fileName: 'tarjouspyynto.pdf',
        mimeType: 'application/pdf',
        kind: 'rfp',
        storageBucket: 'tender-intelligence',
        storagePath: 'org/pkg/tarjouspyynto.pdf',
        fileSizeBytes: 2048,
        checksum: null,
        uploadError: null,
        uploadState: 'uploaded',
        parseStatus: 'completed',
        createdAt: '2026-04-07T08:00:00.000Z',
        updatedAt: '2026-04-07T08:00:00.000Z',
      },
    ],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [],
    latestAnalysisJob: null,
    analysisReadiness: {
      canStart: true,
      blockedReason: null,
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

function createInput(overrides: Partial<TenderLiveStatusPollingInput> = {}): TenderLiveStatusPollingInput {
  return {
    selectedPackageId: '11111111-1111-4111-8111-111111111111',
    selectedPackage: createPackageDetails(),
    startingAnalysisPackageId: null,
    extractingPackageId: null,
    extractingDocumentIds: [],
    ...overrides,
  };
}

describe('tender-live-status', () => {
  it('returns false when no package is selected', () => {
    const input = createInput({ selectedPackageId: null, selectedPackage: null });
    expect(shouldPollTenderPackageLiveStatus(input)).toBe(false);
    expect(getTenderPackageLiveStatusPollingIntervalMs(input)).toBeNull();
  });

  it('polls while analysis start is in-flight for selected package', () => {
    const input = createInput({ startingAnalysisPackageId: '11111111-1111-4111-8111-111111111111' });
    expect(shouldPollTenderPackageLiveStatus(input)).toBe(true);
    expect(getTenderPackageLiveStatusPollingIntervalMs(input)).toBe(2000);
  });

  it('polls while latest analysis job is active', () => {
    const packageDetails = createPackageDetails();
    packageDetails.latestAnalysisJob = {
      id: '33333333-3333-4333-8333-333333333333',
      packageId: packageDetails.package.id,
      jobType: 'placeholder_analysis',
      status: 'running',
      stageLabel: 'Käynnissä',
      provider: null,
      model: null,
      requestedAt: '2026-04-07T08:00:00.000Z',
      startedAt: '2026-04-07T08:00:02.000Z',
      completedAt: null,
      errorMessage: null,
    };

    const input = createInput({ selectedPackage: packageDetails });
    expect(shouldPollTenderPackageLiveStatus(input)).toBe(true);
    expect(getTenderPackageLiveStatusPollingIntervalMs(input)).toBe(5000);
  });

  it('polls while package extraction is active', () => {
    const input = createInput({ extractingPackageId: '11111111-1111-4111-8111-111111111111' });
    expect(shouldPollTenderPackageLiveStatus(input)).toBe(true);
    expect(getTenderPackageLiveStatusPollingIntervalMs(input)).toBe(2000);
  });

  it('polls while selected document extraction is active', () => {
    const input = createInput({
      extractingDocumentIds: ['22222222-2222-4222-8222-222222222222'],
    });

    expect(shouldPollTenderPackageLiveStatus(input)).toBe(true);
    expect(getTenderPackageLiveStatusPollingIntervalMs(input)).toBe(2000);
  });

  it('polls while extraction row status is pending', () => {
    const packageDetails = createPackageDetails();
    packageDetails.documentExtractions.push({
      id: '44444444-4444-4444-8444-444444444444',
      documentId: '22222222-2222-4222-8222-222222222222',
      packageId: packageDetails.package.id,
      extractionStatus: 'pending',
      extractorType: 'pdf',
      sourceMimeType: 'application/pdf',
      characterCount: null,
      chunkCount: null,
      extractedText: null,
      errorMessage: null,
      extractedAt: null,
      createdAt: '2026-04-07T08:00:03.000Z',
      updatedAt: '2026-04-07T08:00:03.000Z',
    });

    const input = createInput({ selectedPackage: packageDetails });
    expect(shouldPollTenderPackageLiveStatus(input)).toBe(true);
    expect(getTenderPackageLiveStatusPollingIntervalMs(input)).toBe(5000);
  });

  it('does not poll when analysis and extraction are in terminal states', () => {
    const packageDetails = createPackageDetails();
    packageDetails.latestAnalysisJob = {
      id: '33333333-3333-4333-8333-333333333333',
      packageId: packageDetails.package.id,
      jobType: 'placeholder_analysis',
      status: 'completed',
      stageLabel: 'Valmis',
      provider: null,
      model: null,
      requestedAt: '2026-04-07T08:00:00.000Z',
      startedAt: '2026-04-07T08:00:02.000Z',
      completedAt: '2026-04-07T08:01:00.000Z',
      errorMessage: null,
    };
    packageDetails.documentExtractions.push({
      id: '44444444-4444-4444-8444-444444444444',
      documentId: '22222222-2222-4222-8222-222222222222',
      packageId: packageDetails.package.id,
      extractionStatus: 'extracted',
      extractorType: 'pdf',
      sourceMimeType: 'application/pdf',
      characterCount: 100,
      chunkCount: 3,
      extractedText: 'ok',
      errorMessage: null,
      extractedAt: '2026-04-07T08:00:30.000Z',
      createdAt: '2026-04-07T08:00:03.000Z',
      updatedAt: '2026-04-07T08:00:30.000Z',
    });

    const input = createInput({ selectedPackage: packageDetails });
    expect(shouldPollTenderPackageLiveStatus(input)).toBe(false);
    expect(getTenderPackageLiveStatusPollingIntervalMs(input)).toBeNull();
  });
});