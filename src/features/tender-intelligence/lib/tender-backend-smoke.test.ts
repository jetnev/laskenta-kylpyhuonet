/**
 * Backend smoke test — validates the full tender intelligence execution chain.
 *
 * Exercises the real pipeline modules in sequence:
 *   upload validation → storage path → extraction support → chunking →
 *   analysis readiness → deterministic analysis plan → contract schemas →
 *   error classification → environment readiness
 *
 * Every assertion uses the same data produced by earlier stages, confirming
 * that stage outputs are valid inputs for the next stage in the chain.
 */

import { describe, expect, it } from 'vitest';

import {
  buildTenderDocumentStoragePath,
  inferTenderDocumentKind,
  TENDER_INTELLIGENCE_STORAGE_BUCKET,
  validateTenderDocumentFile,
} from './tender-document-upload';

import {
  chunkTenderExtractedText,
  getTenderDocumentExtractionSupport,
  isTenderDocumentExtractionSupported,
  normalizeTenderExtractedText,
} from './tender-document-extraction';

import {
  buildTenderAnalysisReadiness,
  buildTenderExtractionCoverage,
  isTenderAnalysisJobActive,
} from './tender-analysis';

import {
  buildTenderDeterministicAnalysisPlan,
} from './tender-rule-analysis';

import {
  tenderAnalysisRunnerRequestSchema,
  tenderAnalysisRunnerResponseSchema,
  parseTenderAnalysisRunnerResponse,
  isTenderAnalysisRunnerSuccess,
  TENDER_ANALYSIS_RUNNER_FUNCTION_NAME,
} from '../types/tender-analysis-runner-contract';

import {
  tenderDocumentExtractionRunnerRequestSchema,
  parseTenderDocumentExtractionRunnerResponse,
  TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME,
} from '../types/tender-document-extraction-contract';

import {
  getTenderIntelligenceEnvironmentIssueMessage,
  getTenderIntelligenceEnvironmentIssueTypeFromMessage,
  isTenderIntelligenceSchemaUnavailableError,
} from './tender-intelligence-errors';

import {
  buildTenderIntelligenceReadinessItems,
} from './tender-intelligence-readiness';

import { TENDER_INTELLIGENCE_BACKEND_PLAN } from '../services/tender-intelligence-backend-adapter';

import type { TenderAnalysisJob, TenderDocument, TenderDocumentExtraction } from '../types/tender-intelligence';

/* ------------------------------------------------------------------ */
/*  Shared fixture data flowing through the chain                      */
/* ------------------------------------------------------------------ */

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const PACKAGE_ID = '22222222-2222-4222-8222-222222222222';
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333';
const EXTRACTION_ID = '44444444-4444-4444-8444-444444444444';

const SAMPLE_TENDER_TEXT = [
  'Tarjouspyyntö: Kylpyhuoneremontti',
  '',
  'Tilaaja: Taloyhtiö Oy',
  'Kohde: As Oy Esimerkkitalo, Helsinki',
  '',
  '1. Yleiset vaatimukset',
  'Urakoitsijalla tulee olla voimassa oleva RALA-pätevyys.',
  'Vakuutusturvan tulee kattaa vähintään 500 000 € vastuu.',
  '',
  '2. Aikataulu',
  'Tarjouksen jättöpäivä: 15.6.2026',
  'Urakan aloitus: 1.8.2026',
  'Urakan valmistuminen: 30.11.2026',
  'Myöhästynyt tarjous hylätään. Tarjouksen jättämisen määräaika on ehdoton.',
  '',
  '3. Hinnoittelu',
  'Tarjous tulee antaa kokonaishintana (ALV 0 %).',
  'Maksuerätaulukko tulee liittää tarjoukseen.',
  '',
  '4. Liitteet',
  'Liitä referenssilista vähintään kolmesta vastaavasta urakasta viimeisen viiden vuoden ajalta.',
  'Liitä RALA-todistus tai muu vastaava pätevyystodistus.',
  'Liitä vastuuvakuutustodistus.',
].join('\n');

/* ------------------------------------------------------------------ */
/*  Chain: upload → extraction → analysis → results                    */
/* ------------------------------------------------------------------ */

describe('backend smoke: full upload → extraction → analysis chain', () => {
  // Stage 1: Upload validation and storage path construction
  const validated = validateTenderDocumentFile({
    name: 'Tarjouspyyntö Kylpyhuoneremontti 2026.txt',
    size: SAMPLE_TENDER_TEXT.length,
    type: 'text/plain',
  });

  const storagePath = buildTenderDocumentStoragePath({
    organizationId: ORG_ID,
    packageId: PACKAGE_ID,
    documentId: DOCUMENT_ID,
    fileName: validated.sanitizedFileName,
  });

  // Stage 2: Extraction support detection and text chunking
  const support = getTenderDocumentExtractionSupport(validated.canonicalMimeType);
  const normalized = normalizeTenderExtractedText(SAMPLE_TENDER_TEXT);
  const chunks = chunkTenderExtractedText(normalized);

  // Stage 3: Build domain objects for analysis readiness check
  const document: TenderDocument = {
    id: DOCUMENT_ID,
    packageId: PACKAGE_ID,
    fileName: validated.sanitizedFileName,
    mimeType: validated.canonicalMimeType,
    kind: inferTenderDocumentKind(validated.sanitizedFileName, validated.canonicalMimeType),
    storageBucket: TENDER_INTELLIGENCE_STORAGE_BUCKET,
    storagePath,
    fileSizeBytes: SAMPLE_TENDER_TEXT.length,
    checksum: null,
    uploadError: null,
    uploadState: 'uploaded',
    parseStatus: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const extraction: TenderDocumentExtraction = {
    id: EXTRACTION_ID,
    documentId: DOCUMENT_ID,
    packageId: PACKAGE_ID,
    extractionStatus: 'extracted',
    extractorType: support.extractorType,
    sourceMimeType: validated.canonicalMimeType,
    characterCount: normalized.length,
    chunkCount: chunks.length,
    extractedText: normalized,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Stage 4: Deterministic analysis
  const analysisChunks = chunks.map((chunk) => ({
    chunkId: `chunk-${chunk.chunkIndex}`,
    documentId: DOCUMENT_ID,
    extractionId: EXTRACTION_ID,
    chunkIndex: chunk.chunkIndex,
    textContent: chunk.textContent,
  }));

  const analysisPlan = buildTenderDeterministicAnalysisPlan({
    packageTitle: 'Kylpyhuoneremontti 2026',
    documentRows: [{ documentId: DOCUMENT_ID, fileName: validated.sanitizedFileName }],
    chunkRows: analysisChunks,
  });

  /* ---- Upload stage assertions ---- */

  it('stage 1: validates and sanitizes the upload file', () => {
    expect(validated.canonicalMimeType).toBe('text/plain');
    expect(validated.sanitizedFileName).toMatch(/^tarjouspyynto/);
    expect(validated.sanitizedFileName).toMatch(/\.txt$/);
    expect(validated.label).toBe('TXT');
  });

  it('stage 1: constructs an org- and package-scoped storage path', () => {
    expect(storagePath).toContain(ORG_ID);
    expect(storagePath).toContain(PACKAGE_ID);
    expect(storagePath).toContain(DOCUMENT_ID);
    expect(storagePath).toMatch(/\.txt$/);
  });

  /* ---- Extraction stage assertions ---- */

  it('stage 2: detects extraction support for the uploaded file type', () => {
    expect(support.supported).toBe(true);
    expect(support.extractorType).toBe('plain_text');
    expect(isTenderDocumentExtractionSupported(validated.canonicalMimeType)).toBe(true);
  });

  it('stage 2: normalizes and chunks extracted text deterministically', () => {
    expect(normalized.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chunkIndex).toBe(0);

    // Verify determinism — second pass must yield identical output
    const secondNormalized = normalizeTenderExtractedText(SAMPLE_TENDER_TEXT);
    const secondChunks = chunkTenderExtractedText(secondNormalized);
    expect(secondChunks).toEqual(chunks);
  });

  /* ---- Readiness gate assertions ---- */

  it('stage 3: extraction coverage reports full readiness for the uploaded document', () => {
    const coverage = buildTenderExtractionCoverage({
      documents: [document],
      documentExtractions: [extraction],
    });

    expect(coverage.totalDocuments).toBe(1);
    expect(coverage.uploadedDocuments).toBe(1);
    expect(coverage.supportedDocuments).toBe(1);
    expect(coverage.extractedDocuments).toBe(1);
    expect(coverage.extractedChunks).toBe(chunks.length);
    expect(coverage.pendingExtractions).toBe(0);
    expect(coverage.failedExtractions).toBe(0);
    expect(coverage.unsupportedDocuments).toBe(0);
    expect(coverage.documentsNeedingExtraction).toBe(0);
  });

  it('stage 3: analysis readiness allows starting the analysis', () => {
    const readiness = buildTenderAnalysisReadiness({
      documents: [document],
      documentExtractions: [extraction],
      latestAnalysisJob: null,
    });

    expect(readiness.canStart).toBe(true);
    expect(readiness.blockedReason).toBeNull();
    expect(readiness.coverage.extractedChunks).toBeGreaterThan(0);
  });

  it('stage 3: analysis readiness blocks when an active job already exists', () => {
    const activeJob: TenderAnalysisJob = {
      id: 'job-1',
      packageId: PACKAGE_ID,
      jobType: 'placeholder_analysis',
      status: 'running',
      stageLabel: 'Käynnissä',
      provider: null,
      model: null,
      requestedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null,
    };

    expect(isTenderAnalysisJobActive(activeJob.status)).toBe(true);

    const readiness = buildTenderAnalysisReadiness({
      documents: [document],
      documentExtractions: [extraction],
      latestAnalysisJob: activeJob,
    });

    expect(readiness.canStart).toBe(false);
    expect(readiness.blockedReason).toContain('käynnissä');
  });

  /* ---- Analysis plan assertions ---- */

  it('stage 4: deterministic analysis plan produces all result categories', () => {
    expect(analysisPlan.requirements.length).toBeGreaterThan(0);
    expect(analysisPlan.missingItems.length).toBeGreaterThan(0);
    expect(analysisPlan.riskFlags.length).toBeGreaterThan(0);
    expect(analysisPlan.reviewTasks.length).toBeGreaterThan(0);
    expect(analysisPlan.draftArtifacts.length).toBeGreaterThan(0);
    expect(analysisPlan.evidenceSources.length).toBeGreaterThan(0);
    expect(analysisPlan.goNoGoAssessment.recommendation).toBeDefined();
    expect(analysisPlan.goNoGoAssessment.summary.length).toBeGreaterThan(0);
  });

  it('stage 4: every requirement has evidence links back to source chunks', () => {
    analysisPlan.requirements.forEach((requirement) => {
      expect(requirement.evidenceLinks.length).toBeGreaterThan(0);
      requirement.evidenceLinks.forEach((link) => {
        expect(link.sourceIndex).toBeGreaterThanOrEqual(0);
        expect(link.sourceIndex).toBeLessThan(analysisPlan.evidenceSources.length);
        expect(link.confidence).toBeGreaterThan(0);
        expect(link.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  it('stage 4: evidence sources trace back to the original document and extraction', () => {
    analysisPlan.evidenceSources.forEach((source) => {
      expect(source.documentId).toBe(DOCUMENT_ID);
      expect(source.extractionId).toBe(EXTRACTION_ID);
      expect(source.chunkId).toBeTruthy();
      expect(source.excerptText.length).toBeGreaterThan(0);
    });
  });

  it('stage 4: analysis plan is deterministic across runs', () => {
    const secondPlan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Kylpyhuoneremontti 2026',
      documentRows: [{ documentId: DOCUMENT_ID, fileName: validated.sanitizedFileName }],
      chunkRows: analysisChunks,
    });

    expect(secondPlan.requirements.length).toBe(analysisPlan.requirements.length);
    expect(secondPlan.missingItems.length).toBe(analysisPlan.missingItems.length);
    expect(secondPlan.riskFlags.length).toBe(analysisPlan.riskFlags.length);
    expect(secondPlan.reviewTasks.length).toBe(analysisPlan.reviewTasks.length);
    expect(secondPlan.goNoGoAssessment.recommendation).toBe(analysisPlan.goNoGoAssessment.recommendation);
  });
});

/* ------------------------------------------------------------------ */
/*  Edge function contract schemas                                     */
/* ------------------------------------------------------------------ */

describe('backend smoke: edge function contracts', () => {
  it('extraction runner contract matches the edge function name', () => {
    expect(TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME).toBe('tender-document-extractor');
  });

  it('analysis runner contract matches the edge function name', () => {
    expect(TENDER_ANALYSIS_RUNNER_FUNCTION_NAME).toBe('tender-analysis-runner');
  });

  it('extraction runner request schema accepts valid upload-chain data', () => {
    const result = tenderDocumentExtractionRunnerRequestSchema.safeParse({
      tenderPackageId: PACKAGE_ID,
      tenderDocumentId: DOCUMENT_ID,
    });

    expect(result.success).toBe(true);
  });

  it('extraction runner response schema parses a successful extraction', () => {
    const response = parseTenderDocumentExtractionRunnerResponse({
      accepted: true,
      extractionId: EXTRACTION_ID,
      tenderDocumentId: DOCUMENT_ID,
      status: 'extracted',
      message: null,
      chunkCount: 5,
      characterCount: 1200,
    });

    expect(response.status).toBe('extracted');
    expect(response.chunkCount).toBe(5);
  });

  it('analysis runner request schema accepts a valid package id', () => {
    const result = tenderAnalysisRunnerRequestSchema.safeParse({
      tenderPackageId: PACKAGE_ID,
    });

    expect(result.success).toBe(true);
  });

  it('analysis runner response schema parses a completed analysis', () => {
    const response = parseTenderAnalysisRunnerResponse({
      accepted: true,
      analysisJobId: 'job-completed-1',
      status: 'completed',
      message: null,
    });

    expect(isTenderAnalysisRunnerSuccess(response)).toBe(true);
    expect(response.analysisJobId).toBe('job-completed-1');
  });

  it('analysis runner response schema parses a failed analysis', () => {
    const response = tenderAnalysisRunnerResponseSchema.parse({
      accepted: true,
      analysisJobId: 'job-failed-1',
      status: 'failed',
      message: 'Testausvirhe.',
    });

    expect(response.status).toBe('failed');
    expect(response.message).toBe('Testausvirhe.');
  });
});

/* ------------------------------------------------------------------ */
/*  Error classification and environment readiness chain               */
/* ------------------------------------------------------------------ */

describe('backend smoke: error classification → readiness chain', () => {
  it('classifies a PostgREST schema error as a schema issue', () => {
    const error = { message: 'relation "public.tender_packages" does not exist', code: '42P01' };
    expect(isTenderIntelligenceSchemaUnavailableError(error)).toBe(true);

    const normalized = getTenderIntelligenceEnvironmentIssueMessage(error, { operation: 'generic' });
    expect(normalized).toBeTruthy();

    const issueType = getTenderIntelligenceEnvironmentIssueTypeFromMessage(normalized);
    expect(issueType).toBe('schema');
  });

  it('classifies a storage bucket error as a storage issue', () => {
    const error = new Error('Bucket not found');
    const normalized = getTenderIntelligenceEnvironmentIssueMessage(error, { operation: 'storage-upload' });
    expect(normalized).toBeTruthy();

    const issueType = getTenderIntelligenceEnvironmentIssueTypeFromMessage(normalized);
    expect(issueType).toBe('storage');
  });

  it('classifies an edge function fetch error as a runner issue', () => {
    const error = { message: 'FunctionsFetchError', name: 'FunctionsFetchError' };
    const normalized = getTenderIntelligenceEnvironmentIssueMessage(error, { operation: 'analysis-runner' });
    expect(normalized).toBeTruthy();

    const issueType = getTenderIntelligenceEnvironmentIssueTypeFromMessage(normalized);
    expect(issueType).toBe('analysis-runner');
  });

  it('classifies an extraction runner fetch error', () => {
    const error = { message: 'FunctionsFetchError', name: 'FunctionsFetchError' };
    const normalized = getTenderIntelligenceEnvironmentIssueMessage(error, { operation: 'extraction-runner' });
    expect(normalized).toBeTruthy();

    const issueType = getTenderIntelligenceEnvironmentIssueTypeFromMessage(normalized);
    expect(issueType).toBe('extraction-runner');
  });

  it('readiness items reflect analysis-runner issue with earlier stages ready', () => {
    const items = buildTenderIntelligenceReadinessItems('analysis-runner');

    expect(items.length).toBeGreaterThan(0);
    const dbItem = items.find((item) => item.key === 'database');
    const storageItem = items.find((item) => item.key === 'storage');
    const extractionItem = items.find((item) => item.key === 'extraction');
    const analysisItem = items.find((item) => item.key === 'analysis');

    expect(dbItem?.state).toBe('ready');
    expect(storageItem?.state).toBe('ready');
    expect(extractionItem?.state).toBe('ready');
    expect(analysisItem?.state).toBe('blocked');
  });

  it('readiness items reflect a schema-blocked environment', () => {
    const items = buildTenderIntelligenceReadinessItems('schema');
    const dbItem = items.find((item) => item.key === 'database');

    expect(dbItem?.state).toBe('blocked');
  });
});

/* ------------------------------------------------------------------ */
/*  Backend plan constant                                              */
/* ------------------------------------------------------------------ */

describe('backend smoke: backend plan configuration', () => {
  it('backend plan uses real Supabase backends for all components', () => {
    expect(TENDER_INTELLIGENCE_BACKEND_PLAN).toEqual({
      persistence: 'supabase',
      documentStorage: 'supabase-storage',
      documentExtraction: 'edge-function-runner',
      analysisExecution: 'edge-function-runner',
    });
  });

  it('storage bucket name is configured', () => {
    expect(TENDER_INTELLIGENCE_STORAGE_BUCKET).toBe('tender-intelligence');
  });
});

/* ------------------------------------------------------------------ */
/*  Multi-format extraction support                                    */
/* ------------------------------------------------------------------ */

describe('backend smoke: extraction format coverage', () => {
  const supportedFormats = [
    { mimeType: 'text/plain', label: 'TXT', extractor: 'plain_text' },
    { mimeType: 'text/markdown', label: 'MD', extractor: 'markdown' },
    { mimeType: 'text/csv', label: 'CSV', extractor: 'csv' },
    { mimeType: 'application/pdf', label: 'PDF', extractor: 'pdf' },
    { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX', extractor: 'docx' },
    { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'XLSX', extractor: 'xlsx' },
  ];

  supportedFormats.forEach(({ mimeType, label, extractor }) => {
    it(`supports ${label} (${mimeType}) for extraction`, () => {
      const support = getTenderDocumentExtractionSupport(mimeType);
      expect(support.supported).toBe(true);
      expect(support.extractorType).toBe(extractor);
    });
  });

  it('does not support binary or executable formats', () => {
    expect(getTenderDocumentExtractionSupport('application/octet-stream').supported).toBe(false);
    expect(getTenderDocumentExtractionSupport('application/x-executable').supported).toBe(false);
  });
});
