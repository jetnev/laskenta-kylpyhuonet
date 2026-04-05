import { describe, expect, it } from 'vitest';

import {
  chunkTenderExtractedText,
  getTenderDocumentExtractionSupport,
  isTenderDocumentExtractionSupported,
  normalizeTenderExtractedText,
  resolveTenderDocumentExtractionStatus,
} from './tender-document-extraction';

describe('tender-document-extraction helpers', () => {
  it('recognizes supported mime types and maps them to extractor types', () => {
    expect(getTenderDocumentExtractionSupport('text/plain')).toEqual({
      mimeType: 'text/plain',
      supported: true,
      extractorType: 'plain_text',
    });
    expect(getTenderDocumentExtractionSupport('text/markdown').extractorType).toBe('markdown');
    expect(getTenderDocumentExtractionSupport('text/csv').extractorType).toBe('csv');
    expect(getTenderDocumentExtractionSupport('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').extractorType).toBe('xlsx');
    expect(isTenderDocumentExtractionSupported('application/pdf')).toBe(false);
  });

  it('normalizes extracted text deterministically', () => {
    expect(normalizeTenderExtractedText('  Rivi 1\r\n\r\nRivi 2\u00a0 ')).toBe('Rivi 1\n\nRivi 2');
  });

  it('chunks extracted text deterministically without empty chunks', () => {
    const text = Array.from({ length: 12 }, (_, index) =>
      `Kappale ${index + 1} varmistaa että extraction-chunkitus pysyy vakaana ja ennustettavana myös pidemmällä tekstillä.`
    ).join('\n\n');

    const firstPass = chunkTenderExtractedText(text, { maxCharacters: 35 });
    const secondPass = chunkTenderExtractedText(text, { maxCharacters: 35 });

    expect(firstPass).toEqual(secondPass);
    expect(firstPass.length).toBeGreaterThan(1);
    expect(firstPass.every((chunk) => chunk.textContent.length > 0)).toBe(true);
    expect(firstPass.map((chunk) => chunk.chunkIndex)).toEqual(firstPass.map((_, index) => index));
  });

  it('falls back unknown statuses to not_started', () => {
    expect(resolveTenderDocumentExtractionStatus('unsupported')).toBe('unsupported');
    expect(resolveTenderDocumentExtractionStatus('mystery-state')).toBe('not_started');
  });
});