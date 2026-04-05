import { describe, expect, it } from 'vitest';

import { buildPlaceholderAnalysisSeedPlan } from './tender-placeholder-results';
import type { TenderDocumentChunkRow, TenderDocumentRow, TenderPackageRow } from '../types/tender-intelligence-db';

function createPackageRow(overrides: Partial<TenderPackageRow> = {}): TenderPackageRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    created_by_user_id: '33333333-3333-4333-8333-333333333333',
    title: 'Kiinteistö Oy Aurinkopiha / tarjouspyyntö',
    description: 'Result-domain baseline',
    status: 'draft',
    linked_customer_id: null,
    linked_project_id: null,
    linked_quote_id: null,
    created_at: '2026-04-05T08:00:00.000Z',
    updated_at: '2026-04-05T09:00:00.000Z',
    ...overrides,
  };
}

function createDocumentRow(id: string, fileName: string): TenderDocumentRow {
  return {
    id,
    tender_package_id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    created_by_user_id: '33333333-3333-4333-8333-333333333333',
    file_name: fileName,
    mime_type: 'text/plain',
    storage_bucket: 'tender-intelligence',
    storage_path: `${fileName}.txt`,
    file_size_bytes: 100,
    checksum: null,
    upload_error: null,
    upload_status: 'uploaded',
    parse_status: 'not-started',
    created_at: '2026-04-05T08:05:00.000Z',
    updated_at: '2026-04-05T08:05:00.000Z',
  };
}

function createChunkRow(id: string, documentId: string, extractionId: string, chunkIndex: number, textContent: string): TenderDocumentChunkRow {
  return {
    id,
    tender_document_id: documentId,
    tender_package_id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    extraction_id: extractionId,
    chunk_index: chunkIndex,
    text_content: textContent,
    character_count: textContent.length,
    created_at: '2026-04-05T08:06:00.000Z',
    updated_at: '2026-04-05T08:06:00.000Z',
  };
}

describe('buildPlaceholderAnalysisSeedPlan', () => {
  it('keeps the legacy wrapper deterministic while producing baseline findings from extracted chunks', () => {
    const packageRow = createPackageRow();
    const documents = [createDocumentRow('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'tarjouspyynto')];
    const chunkRows = [
      createChunkRow(
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        0,
        'Tarjouksen viimeinen jättöpäivä on 15.05.2026 klo 12.00 ja verovelkatodistus tulee liittää tarjoukseen.'
      ),
    ];

    const firstPlan = buildPlaceholderAnalysisSeedPlan({ packageRow, documentRows: documents, chunkRows });
    const secondPlan = buildPlaceholderAnalysisSeedPlan({ packageRow, documentRows: documents, chunkRows });

    expect(firstPlan).toEqual(secondPlan);
    expect(firstPlan.requirements.map((item) => item.title)).toEqual([
      'Tarjouksen määräaika: 15.05.2026 klo 12.00',
      'Toimita verovelkatodistus',
    ]);
    expect(firstPlan.missingItems[0]).toMatchObject({
      title: 'Verovelkatodistus puuttuu paketista',
      relatedRequirementIndex: 1,
    });
    expect(firstPlan.reviewTasks[0]?.title).toBe('Käy sääntöpohjaiset löydökset läpi');
    expect(firstPlan.referenceSuggestions).toHaveLength(0);
    expect(firstPlan.draftArtifacts).toHaveLength(0);
    expect(firstPlan.evidenceSources[0]?.locatorText).toBe('tarjouspyynto / chunk 1');
    expect(firstPlan.requirements[0]?.evidenceLinks[0]?.matchedRule).toBe('deadline.tarjouksen_viimeinen_jattopaiva');
  });

  it('rejects baseline seeding when no extracted chunks exist', () => {
    expect(() =>
      buildPlaceholderAnalysisSeedPlan({
        packageRow: createPackageRow(),
        documentRows: [createDocumentRow('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'tarjouspyynto')],
        chunkRows: [],
      })
    ).toThrow('Deterministinen baseline-analyysi vaatii vähintään yhden extracted chunkin');
  });
});