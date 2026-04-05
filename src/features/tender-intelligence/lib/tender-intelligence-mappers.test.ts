import { describe, expect, it } from 'vitest';

import {
  buildTenderPackageDetails,
  mapCreateTenderPackageInputToInsert,
  mapTenderPackageRowToDomain,
} from './tender-intelligence-mappers';
import type {
  TenderAnalysisJobRow,
  TenderDocumentRow,
  TenderGoNoGoAssessmentRow,
  TenderPackageRow,
} from '../types/tender-intelligence-db';

function createPackageRow(overrides: Partial<TenderPackageRow> = {}): TenderPackageRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    created_by_user_id: '33333333-3333-4333-8333-333333333333',
    title: 'Kiinteistö Oy Aurinkopiha / tarjouspyyntö',
    description: 'Ensimmäinen pysyvä tarjouspyyntöpaketti',
    status: 'draft',
    linked_customer_id: 'customer-1',
    linked_project_id: 'project-1',
    linked_quote_id: null,
    created_at: '2026-04-05T08:00:00.000Z',
    updated_at: '2026-04-05T09:00:00.000Z',
    ...overrides,
  };
}

describe('mapTenderPackageRowToDomain', () => {
  it('maps package rows into the feature domain without coupling to the quote domain', () => {
    const packageRow = createPackageRow();
    const mapped = mapTenderPackageRowToDomain(packageRow, {
      documentCount: 3,
      currentJobId: '44444444-4444-4444-8444-444444444444',
    });

    expect(mapped).toMatchObject({
      id: packageRow.id,
      name: packageRow.title,
      description: packageRow.description,
      linkedCustomerId: packageRow.linked_customer_id,
      linkedProjectId: packageRow.linked_project_id,
      linkedQuoteId: null,
      currentJobId: '44444444-4444-4444-8444-444444444444',
    });
    expect(mapped.summary).toEqual({
      documentCount: 3,
      requirementCount: 0,
      missingItemCount: 0,
      riskCount: 0,
      reviewTaskCount: 1,
    });
  });
});

describe('buildTenderPackageDetails', () => {
  it('builds a stable detail model from Supabase rows and preserves placeholder results', () => {
    const packageRow = createPackageRow({ status: 'review-needed' });
    const documentRows: TenderDocumentRow[] = [
      {
        id: '55555555-5555-4555-8555-555555555555',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        created_by_user_id: packageRow.created_by_user_id,
        file_name: 'tarjouspyynto.pdf',
        mime_type: 'application/pdf',
        storage_bucket: 'tender-intelligence',
        storage_path: null,
        file_size_bytes: null,
        checksum: null,
        upload_error: null,
        upload_status: 'placeholder',
        parse_status: 'not-started',
        created_at: '2026-04-05T09:05:00.000Z',
        updated_at: '2026-04-05T09:05:00.000Z',
      },
    ];
    const jobRows: TenderAnalysisJobRow[] = [
      {
        id: '66666666-6666-4666-8666-666666666666',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        job_type: 'placeholder',
        status: 'queued',
        provider: null,
        model: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: '2026-04-05T09:10:00.000Z',
        updated_at: '2026-04-05T09:10:00.000Z',
      },
    ];
    const assessmentRow: TenderGoNoGoAssessmentRow = {
      id: '77777777-7777-4777-8777-777777777777',
      tender_package_id: packageRow.id,
      organization_id: packageRow.organization_id,
      recommendation: 'pending',
      summary: null,
      confidence: null,
      created_at: '2026-04-05T09:15:00.000Z',
      updated_at: '2026-04-05T09:15:00.000Z',
    };

    const details = buildTenderPackageDetails({
      packageRow,
      documentRows,
      analysisJobRows: jobRows,
      goNoGoAssessmentRow: assessmentRow,
    });

    expect(details.package.name).toBe(packageRow.title);
    expect(details.package.summary.documentCount).toBe(1);
    expect(details.documents[0]).toMatchObject({
      fileName: 'tarjouspyynto.pdf',
      storageBucket: 'tender-intelligence',
      uploadState: 'placeholder',
      parseStatus: 'not-started',
    });
    expect(details.latestAnalysisJob).toMatchObject({
      id: jobRows[0].id,
      jobType: 'placeholder',
      status: 'queued',
    });
    expect(details.results.goNoGoAssessment).toMatchObject({
      packageId: packageRow.id,
      recommendation: 'pending',
      summary: null,
    });
    expect(details.results.reviewTasks[0].id).toBe(`${packageRow.id}-review-documents`);
    expect(details.results.draftArtifacts[0].id).toBe(`${packageRow.id}-draft-placeholder`);
  });
});

describe('mapCreateTenderPackageInputToInsert', () => {
  it('maps feature input into the Supabase insert payload', () => {
    const payload = mapCreateTenderPackageInputToInsert({
      name: 'Tarjouspyyntö / vaihe 1',
      description: 'Pysyvä CRUD testataan tällä payloadilla',
      linkedCustomerId: 'customer-1',
      linkedProjectId: 'project-1',
      linkedQuoteId: null,
    });

    expect(payload).toEqual({
      title: 'Tarjouspyyntö / vaihe 1',
      description: 'Pysyvä CRUD testataan tällä payloadilla',
      status: 'draft',
      linked_customer_id: 'customer-1',
      linked_project_id: 'project-1',
      linked_quote_id: null,
    });
  });
});