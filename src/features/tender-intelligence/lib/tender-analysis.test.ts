import { describe, expect, it } from 'vitest';

import { TENDER_ANALYSIS_JOB_STATUS_META, TENDER_ANALYSIS_JOB_TYPE_META } from './tender-intelligence-ui';
import {
  buildTenderAnalysisReadiness,
  buildTenderExtractionCoverage,
  getLatestSuccessfulTenderAnalysisJob,
  getTenderAnalysisStartState,
  isTenderAnalysisJobActive,
} from './tender-analysis';
import type { TenderAnalysisJob, TenderDocument, TenderDocumentExtraction } from '../types/tender-intelligence';

function createAnalysisJob(overrides: Partial<TenderAnalysisJob> = {}): TenderAnalysisJob {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    packageId: '22222222-2222-4222-8222-222222222222',
    jobType: 'placeholder_analysis',
    status: 'completed',
    stageLabel: 'Placeholder-analyysi valmistui',
    provider: null,
    model: null,
    requestedAt: '2026-04-05T08:00:00.000Z',
    startedAt: '2026-04-05T08:01:00.000Z',
    completedAt: '2026-04-05T08:02:00.000Z',
    errorMessage: null,
    ...overrides,
  };
}

function createTenderDocument(overrides: Partial<TenderDocument> = {}): TenderDocument {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    packageId: '22222222-2222-4222-8222-222222222222',
    fileName: 'tarjouspyynto.txt',
    mimeType: 'text/plain',
    kind: 'other',
    storageBucket: 'tender-intelligence',
    storagePath: 'org/package/tarjouspyynto.txt',
    fileSizeBytes: 128,
    checksum: null,
    uploadError: null,
    uploadState: 'uploaded',
    parseStatus: 'completed',
    createdAt: '2026-04-05T08:00:00.000Z',
    updatedAt: '2026-04-05T08:00:00.000Z',
    ...overrides,
  };
}

function createTenderDocumentExtraction(overrides: Partial<TenderDocumentExtraction> = {}): TenderDocumentExtraction {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    documentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    packageId: '22222222-2222-4222-8222-222222222222',
    extractionStatus: 'extracted',
    extractorType: 'plain_text',
    sourceMimeType: 'text/plain',
    characterCount: 512,
    chunkCount: 2,
    extractedText: 'Purettu teksti',
    errorMessage: null,
    extractedAt: '2026-04-05T08:05:00.000Z',
    createdAt: '2026-04-05T08:05:00.000Z',
    updatedAt: '2026-04-05T08:05:00.000Z',
    ...overrides,
  };
}

describe('TENDER_ANALYSIS_JOB_STATUS_META', () => {
  it('maps the phase 3 analysis statuses into visible finnish labels', () => {
    expect(TENDER_ANALYSIS_JOB_STATUS_META.pending.label).toBe('Valmistellaan');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.queued.label).toBe('Jonossa');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.running.label).toBe('Käynnissä');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.completed.label).toBe('Valmis');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.failed.label).toBe('Epäonnistui');
    expect(TENDER_ANALYSIS_JOB_TYPE_META.placeholder_analysis.label).toBe('Placeholder-analyysi');
  });
});

describe('getTenderAnalysisStartState', () => {
  it('disables analysis start when the package has no documents', () => {
    expect(getTenderAnalysisStartState({ documentCount: 0, latestAnalysisJob: null })).toEqual({
      canStart: false,
      reason: 'Lisää pakettiin vähintään yksi dokumentti ennen analyysin käynnistämistä.',
    });
  });

  it('disables analysis start when a previous job is still active', () => {
    const queuedJob = createAnalysisJob({ status: 'queued', completedAt: null, stageLabel: 'Placeholder-analyysi odottaa suoritusvuoroa' });

    expect(isTenderAnalysisJobActive(queuedJob.status)).toBe(true);
    expect(getTenderAnalysisStartState({ documentCount: 2, latestAnalysisJob: queuedJob })).toEqual({
      canStart: false,
      reason: 'Paketille on jo käynnissä analyysiajo. Odota nykyisen ajon valmistumista.',
    });
  });

  it('allows analysis start when documents exist and the previous job is terminal', () => {
    const failedJob = createAnalysisJob({ status: 'failed', completedAt: '2026-04-05T09:00:00.000Z', errorMessage: 'Virhe' });

    expect(getTenderAnalysisStartState({ documentCount: 2, latestAnalysisJob: failedJob })).toEqual({
      canStart: true,
      reason: null,
    });
  });

  it('uses extraction-aware readiness when supported documents still need extraction', () => {
    const document = createTenderDocument();

    expect(
      getTenderAnalysisStartState({
        analysisReadiness: buildTenderAnalysisReadiness({
          documents: [document],
          documentExtractions: [],
          latestAnalysisJob: null,
        }),
      })
    ).toEqual({
      canStart: false,
      reason: 'Käynnistä extraction vähintään yhdelle tuetulle dokumentille ennen analyysin käynnistämistä.',
    });
  });
});

describe('buildTenderExtractionCoverage', () => {
  it('counts uploaded, extracted and chunk-backed documents for evidence-aware analysis', () => {
    const coverage = buildTenderExtractionCoverage({
      documents: [createTenderDocument()],
      documentExtractions: [createTenderDocumentExtraction()],
    });

    expect(coverage).toEqual({
      totalDocuments: 1,
      uploadedDocuments: 1,
      supportedDocuments: 1,
      extractedDocuments: 1,
      extractedChunks: 2,
      pendingExtractions: 0,
      failedExtractions: 0,
      unsupportedDocuments: 0,
      documentsNeedingExtraction: 0,
    });
  });
});

describe('buildTenderAnalysisReadiness', () => {
  it('allows analysis only when extracted chunk data exists', () => {
    const readiness = buildTenderAnalysisReadiness({
      documents: [createTenderDocument()],
      documentExtractions: [createTenderDocumentExtraction()],
      latestAnalysisJob: null,
    });

    expect(readiness.canStart).toBe(true);
    expect(readiness.blockedReason).toBeNull();
    expect(readiness.coverage.extractedChunks).toBe(2);
  });

  it('blocks analysis when only unsupported documents are available', () => {
    const readiness = buildTenderAnalysisReadiness({
      documents: [createTenderDocument({ fileName: 'tarjouspyynto.pdf', mimeType: 'application/pdf', storagePath: 'org/package/tarjouspyynto.pdf' })],
      documentExtractions: [],
      latestAnalysisJob: null,
    });

    expect(readiness).toMatchObject({
      canStart: false,
      blockedReason: 'Analyysi tarvitsee vähintään yhden tuetun TXT-, Markdown-, CSV- tai XLSX-dokumentin, jolle extraction voidaan suorittaa.',
    });
  });

  it('blocks analysis when extracted documents have no chunk data for evidence rows', () => {
    const readiness = buildTenderAnalysisReadiness({
      documents: [createTenderDocument()],
      documentExtractions: [createTenderDocumentExtraction({ chunkCount: 0 })],
      latestAnalysisJob: null,
    });

    expect(readiness).toMatchObject({
      canStart: false,
      blockedReason: 'Puretuista dokumenteista ei löytynyt yhtään analyysiin kelpaavaa chunkia, joten evidence-rivejä ei voida muodostaa.',
    });
  });
});

describe('getLatestSuccessfulTenderAnalysisJob', () => {
  it('returns the most recent completed job for the status panel', () => {
    const oldestCompleted = createAnalysisJob({
      id: '33333333-3333-4333-8333-333333333333',
      completedAt: '2026-04-05T08:02:00.000Z',
    });
    const failedJob = createAnalysisJob({
      id: '44444444-4444-4444-8444-444444444444',
      status: 'failed',
      completedAt: '2026-04-05T09:00:00.000Z',
      errorMessage: 'Virhe',
    });
    const latestCompleted = createAnalysisJob({
      id: '55555555-5555-4555-8555-555555555555',
      completedAt: '2026-04-05T10:00:00.000Z',
    });

    expect(getLatestSuccessfulTenderAnalysisJob([oldestCompleted, failedJob, latestCompleted])?.id).toBe(latestCompleted.id);
  });
});