import { describe, expect, it } from 'vitest';

import {
  TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES,
  buildTenderDocumentStoragePath,
  sanitizeTenderDocumentFileName,
  validateTenderDocumentFile,
} from './tender-document-upload';

describe('sanitizeTenderDocumentFileName', () => {
  it('normalizes whitespace, accents and unsafe path characters', () => {
    expect(sanitizeTenderDocumentFileName('  Tarjous pyyntö ÄÖ / liite 1 .PDF  ')).toBe('tarjous-pyynto-ao-liite-1.pdf');
  });
});

describe('buildTenderDocumentStoragePath', () => {
  it('builds an organization- and package-scoped path with document id prefix', () => {
    const path = buildTenderDocumentStoragePath({
      organizationId: '11111111-1111-4111-8111-111111111111',
      packageId: '22222222-2222-4222-8222-222222222222',
      documentId: '33333333-3333-4333-8333-333333333333',
      fileName: 'Tarjouspyyntö 2026.xlsx',
    });

    expect(path).toBe(
      '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333-tarjouspyynto-2026.xlsx'
    );
  });
});

describe('validateTenderDocumentFile', () => {
  it('accepts an allowed file type and normalizes the mime type', () => {
    const parsed = validateTenderDocumentFile({
      name: 'Hankinta-aineisto.zip',
      size: 4096,
      type: 'application/x-zip-compressed',
    });

    expect(parsed).toMatchObject({
      label: 'ZIP',
      canonicalMimeType: 'application/zip',
      sanitizedFileName: 'hankinta-aineisto.zip',
    });
  });

  it('rejects unsupported file types', () => {
    expect(() =>
      validateTenderDocumentFile({
        name: 'muistiinpanot.txt',
        size: 512,
        type: 'text/plain',
      })
    ).toThrow(/Sallitut tiedostotyypit ovat PDF, DOCX, XLSX, ZIP/i);
  });

  it('rejects empty files', () => {
    expect(() =>
      validateTenderDocumentFile({
        name: 'tarjous.pdf',
        size: 0,
        type: 'application/pdf',
      })
    ).toThrow(/on tyhjä/i);
  });

  it('rejects files larger than the configured maximum', () => {
    expect(() =>
      validateTenderDocumentFile({
        name: 'tarjous.pdf',
        size: TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES + 1,
        type: 'application/pdf',
      })
    ).toThrow(/ylittää kokorajan/i);
  });

  it('rejects mismatched mime types when the browser provides a concrete type', () => {
    expect(() =>
      validateTenderDocumentFile({
        name: 'tarjous.docx',
        size: 2048,
        type: 'application/pdf',
      })
    ).toThrow(/MIME-tyyppi ei vastaa sallittua DOCX-tiedostoa/i);
  });
});