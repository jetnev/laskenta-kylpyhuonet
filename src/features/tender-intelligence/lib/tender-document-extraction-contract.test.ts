import { describe, expect, it } from 'vitest';

import {
  isTenderDocumentExtractionRunnerRejected,
  parseTenderDocumentExtractionRunnerResponse,
  tenderDocumentExtractionRunnerRequestSchema,
  tenderDocumentExtractionRunnerResponseSchema,
  TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME,
} from '../types/tender-document-extraction-contract';

describe('tender-document-extraction-contract', () => {
  it('uses the extractor Edge Function name', () => {
    expect(TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME).toBe('tender-document-extractor');
  });

  it('validates the extraction request payload', () => {
    expect(
      tenderDocumentExtractionRunnerRequestSchema.parse({
        tenderPackageId: 'package-1',
        tenderDocumentId: 'document-1',
      }),
    ).toEqual({
      tenderPackageId: 'package-1',
      tenderDocumentId: 'document-1',
    });
  });

  it('parses extraction responses for successful and unsupported runs', () => {
    expect(
      tenderDocumentExtractionRunnerResponseSchema.parse({
        accepted: true,
        extractionId: 'extraction-1',
        tenderDocumentId: 'document-1',
        status: 'extracted',
        message: null,
        chunkCount: 3,
        characterCount: 1400,
      }).status,
    ).toBe('extracted');

    expect(
      parseTenderDocumentExtractionRunnerResponse({
        accepted: true,
        extractionId: 'extraction-2',
        tenderDocumentId: 'document-2',
        status: 'unsupported',
        message: 'Ei tuettu.',
        chunkCount: 0,
        characterCount: 0,
      }).status,
    ).toBe('unsupported');
  });

  it('treats rejected responses as throwable client errors', () => {
    expect(
      isTenderDocumentExtractionRunnerRejected({
        accepted: false,
        extractionId: null,
        tenderDocumentId: null,
        status: 'rejected',
        message: 'Virhe.',
        chunkCount: null,
        characterCount: null,
      }),
    ).toBe(true);
  });
});