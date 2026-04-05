import { describe, expect, it } from 'vitest';

import { buildPlaceholderAnalysisSeedPlan } from './tender-placeholder-results';
import type { TenderDocumentRow, TenderPackageRow } from '../types/tender-intelligence-db';

function createPackageRow(overrides: Partial<TenderPackageRow> = {}): TenderPackageRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    created_by_user_id: '33333333-3333-4333-8333-333333333333',
    title: 'Kiinteistö Oy Aurinkopiha / tarjouspyyntö',
    description: 'Result-domain placeholder',
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
    mime_type: 'application/pdf',
    storage_bucket: 'tender-intelligence',
    storage_path: `${fileName}.pdf`,
    file_size_bytes: 100,
    checksum: null,
    upload_error: null,
    upload_status: 'uploaded',
    parse_status: 'not-started',
    created_at: '2026-04-05T08:05:00.000Z',
    updated_at: '2026-04-05T08:05:00.000Z',
  };
}

describe('buildPlaceholderAnalysisSeedPlan', () => {
  it('creates deterministic placeholder data from package and document metadata', () => {
    const packageRow = createPackageRow();
    const documents = [
      createDocumentRow('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B-liite.pdf'),
      createDocumentRow('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A-liite.pdf'),
    ];

    const firstPlan = buildPlaceholderAnalysisSeedPlan({ packageRow, documentRows: documents });
    const secondPlan = buildPlaceholderAnalysisSeedPlan({ packageRow, documentRows: documents });

    expect(firstPlan).toEqual(secondPlan);
    expect(firstPlan.requirements).toHaveLength(2);
    expect(firstPlan.requirements[0]?.sourceDocumentId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(firstPlan.goNoGoAssessment.summary).toContain(packageRow.title);
    expect(firstPlan.referenceSuggestions[0]?.sourceReference).toBe('A-liite.pdf, B-liite.pdf');
    expect(firstPlan.draftArtifacts[0]?.contentMd).toContain('Tarjousvastauksen placeholder-runko');
    expect(firstPlan.reviewTasks.map((task) => task.taskType)).toEqual(['documents', 'requirements']);
  });
});