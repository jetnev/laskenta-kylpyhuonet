import { describe, expect, it } from 'vitest';

import {
  buildTenderPackageDetails,
  mapCreateTenderPackageInputToInsert,
  mapTenderDraftArtifactRowToDomain,
  mapTenderMissingItemRowToDomain,
  mapTenderPackageRowToDomain,
  mapTenderReferenceSuggestionRowToDomain,
  mapTenderRequirementRowToDomain,
  mapTenderReviewTaskRowToDomain,
  mapTenderRiskFlagRowToDomain,
} from './tender-intelligence-mappers';
import type {
  TenderAnalysisJobRow,
  TenderDocumentRow,
  TenderDraftArtifactRow,
  TenderGoNoGoAssessmentRow,
  TenderMissingItemRow,
  TenderPackageRow,
  TenderReferenceSuggestionRow,
  TenderRequirementRow,
  TenderReviewTaskRow,
  TenderRiskFlagRow,
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
      requirementCount: 2,
      missingItemCount: 1,
      riskCount: 1,
      reviewTaskCount: 2,
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
      requirementCount: 2,
      missingItemCount: 1,
      riskCount: 1,
      reviewTaskCount: 2,
    });
  });
});

describe('result row mappers', () => {
  it('maps persistent result rows into domain objects', () => {
    const requirementRow: TenderRequirementRow = {
      id: '44444444-4444-4444-8444-444444444444',
      tender_package_id: '11111111-1111-4111-8111-111111111111',
      organization_id: '22222222-2222-4222-8222-222222222222',
      source_document_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      requirement_type: 'technical',
      title: 'Vahvista tekninen toimituslaajuus',
      description: 'Placeholder-vaatimus',
      status: 'unreviewed',
      confidence: 0.42,
      source_excerpt: 'Placeholder-ote',
      created_at: '2026-04-05T09:00:00.000Z',
      updated_at: '2026-04-05T09:00:00.000Z',
    };
    const missingItemRow: TenderMissingItemRow = {
      id: '55555555-5555-4555-8555-555555555555',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      related_requirement_id: requirementRow.id,
      item_type: 'clarification',
      title: 'Täsmennä toimituslaajuus',
      description: 'Placeholder-puute',
      severity: 'medium',
      status: 'open',
      created_at: '2026-04-05T09:05:00.000Z',
      updated_at: '2026-04-05T09:05:00.000Z',
    };
    const riskFlagRow: TenderRiskFlagRow = {
      id: '66666666-6666-4666-8666-666666666666',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      risk_type: 'delivery',
      title: 'Aikatauluriski vaatii tarkistuksen',
      description: 'Placeholder-riski',
      severity: 'high',
      status: 'open',
      created_at: '2026-04-05T09:06:00.000Z',
      updated_at: '2026-04-05T09:06:00.000Z',
    };
    const referenceSuggestionRow: TenderReferenceSuggestionRow = {
      id: '77777777-7777-4777-8777-777777777777',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      source_type: 'manual',
      source_reference: 'A-liite.pdf',
      title: 'Hyödynnä aiempi vastausrunko',
      rationale: 'Placeholder-ehdotus',
      confidence: 0.31,
      created_at: '2026-04-05T09:07:00.000Z',
      updated_at: '2026-04-05T09:07:00.000Z',
    };
    const draftArtifactRow: TenderDraftArtifactRow = {
      id: '88888888-8888-4888-8888-888888888888',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      artifact_type: 'quote-outline',
      title: 'Tarjousvastauksen placeholder-runko',
      content_md: '# Placeholder',
      status: 'placeholder',
      created_at: '2026-04-05T09:08:00.000Z',
      updated_at: '2026-04-05T09:08:00.000Z',
    };
    const reviewTaskRow: TenderReviewTaskRow = {
      id: '99999999-9999-4999-8999-999999999999',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      task_type: 'requirements',
      title: 'Käy placeholder-vaatimukset läpi',
      description: 'Placeholder-tehtävä',
      status: 'todo',
      assigned_to_user_id: null,
      created_at: '2026-04-05T09:09:00.000Z',
      updated_at: '2026-04-05T09:09:00.000Z',
    };

    expect(mapTenderRequirementRowToDomain(requirementRow)).toMatchObject({
      requirementType: 'technical',
      confidence: 0.42,
      sourceExcerpt: 'Placeholder-ote',
    });
    expect(mapTenderMissingItemRowToDomain(missingItemRow)).toMatchObject({
      relatedRequirementId: requirementRow.id,
      itemType: 'clarification',
      status: 'open',
    });
    expect(mapTenderRiskFlagRowToDomain(riskFlagRow)).toMatchObject({
      riskType: 'delivery',
      severity: 'high',
      status: 'open',
    });
    expect(mapTenderReferenceSuggestionRowToDomain(referenceSuggestionRow)).toMatchObject({
      sourceType: 'manual',
      sourceReference: 'A-liite.pdf',
      confidence: 0.31,
    });
    expect(mapTenderDraftArtifactRowToDomain(draftArtifactRow)).toMatchObject({
      artifactType: 'quote-outline',
      contentMd: '# Placeholder',
      status: 'placeholder',
    });
    expect(mapTenderReviewTaskRowToDomain(reviewTaskRow)).toMatchObject({
      taskType: 'requirements',
      description: 'Placeholder-tehtävä',
      status: 'todo',
    });
  });
});

describe('buildTenderPackageDetails', () => {
  it('builds a stable detail model from Supabase rows and loads persistent result tables', () => {
    const packageRow = createPackageRow({ status: 'review-needed' });
    const documentRows: TenderDocumentRow[] = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
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
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        job_type: 'placeholder_analysis',
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
    const requirementRows: TenderRequirementRow[] = [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        source_document_id: documentRows[0].id,
        requirement_type: 'technical',
        title: 'Vahvista tekninen toimituslaajuus',
        description: 'Placeholder-vaatimus',
        status: 'unreviewed',
        confidence: 0.42,
        source_excerpt: 'Placeholder-ote',
        created_at: '2026-04-05T09:12:00.000Z',
        updated_at: '2026-04-05T09:12:00.000Z',
      },
    ];
    const missingItemRows: TenderMissingItemRow[] = [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        related_requirement_id: requirementRows[0].id,
        item_type: 'clarification',
        title: 'Täsmennä rajaukset',
        description: 'Placeholder-puute',
        severity: 'medium',
        status: 'open',
        created_at: '2026-04-05T09:13:00.000Z',
        updated_at: '2026-04-05T09:13:00.000Z',
      },
    ];
    const riskFlagRows: TenderRiskFlagRow[] = [
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        risk_type: 'delivery',
        title: 'Aikatauluriski vaatii tarkistuksen',
        description: 'Placeholder-riski',
        severity: 'high',
        status: 'open',
        created_at: '2026-04-05T09:14:00.000Z',
        updated_at: '2026-04-05T09:14:00.000Z',
      },
    ];
    const referenceSuggestionRows: TenderReferenceSuggestionRow[] = [
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        source_type: 'manual',
        source_reference: 'tarjouspyynto.pdf',
        title: 'Hyödynnä aiempi vastausrunko',
        rationale: 'Placeholder-ehdotus',
        confidence: 0.31,
        created_at: '2026-04-05T09:15:00.000Z',
        updated_at: '2026-04-05T09:15:00.000Z',
      },
    ];
    const draftArtifactRows: TenderDraftArtifactRow[] = [
      {
        id: '12121212-1212-4212-8212-121212121212',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        artifact_type: 'quote-outline',
        title: 'Tarjousvastauksen placeholder-runko',
        content_md: '# Placeholder',
        status: 'placeholder',
        created_at: '2026-04-05T09:16:00.000Z',
        updated_at: '2026-04-05T09:16:00.000Z',
      },
    ];
    const reviewTaskRows: TenderReviewTaskRow[] = [
      {
        id: '13131313-1313-4313-8313-131313131313',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        task_type: 'requirements',
        title: 'Käy placeholder-vaatimukset läpi',
        description: 'Placeholder-tehtävä',
        status: 'todo',
        assigned_to_user_id: null,
        created_at: '2026-04-05T09:17:00.000Z',
        updated_at: '2026-04-05T09:17:00.000Z',
      },
    ];
    const assessmentRow: TenderGoNoGoAssessmentRow = {
      id: '14141414-1414-4414-8414-141414141414',
      tender_package_id: packageRow.id,
      organization_id: packageRow.organization_id,
      recommendation: 'pending',
      summary: 'Placeholder-analyysi tallensi result-domainin rungon.',
      confidence: 0.24,
      created_at: '2026-04-05T09:18:00.000Z',
      updated_at: '2026-04-05T09:18:00.000Z',
    };

    const details = buildTenderPackageDetails({
      packageRow,
      documentRows,
      analysisJobRows: jobRows,
      requirementRows,
      missingItemRows,
      riskFlagRows,
      referenceSuggestionRows,
      draftArtifactRows,
      reviewTaskRows,
      goNoGoAssessmentRow: assessmentRow,
    });

    expect(details.package.name).toBe(packageRow.title);
    expect(details.package.summary).toEqual({
      documentCount: 1,
      requirementCount: 1,
      missingItemCount: 1,
      riskCount: 1,
      reviewTaskCount: 1,
    });
    expect(details.latestAnalysisJob).toMatchObject({
      id: jobRows[0].id,
      jobType: 'placeholder_analysis',
      status: 'queued',
    });
    expect(details.results.requirements[0]).toMatchObject({
      requirementType: 'technical',
      confidence: 0.42,
    });
    expect(details.results.missingItems[0]).toMatchObject({
      relatedRequirementId: requirementRows[0].id,
      itemType: 'clarification',
    });
    expect(details.results.riskFlags[0]).toMatchObject({
      riskType: 'delivery',
      severity: 'high',
    });
    expect(details.results.referenceSuggestions[0]).toMatchObject({
      sourceReference: 'tarjouspyynto.pdf',
      confidence: 0.31,
    });
    expect(details.results.draftArtifacts[0]).toMatchObject({
      artifactType: 'quote-outline',
      contentMd: '# Placeholder',
    });
    expect(details.results.reviewTasks[0]).toMatchObject({
      taskType: 'requirements',
      title: 'Käy placeholder-vaatimukset läpi',
    });
    expect(details.results.goNoGoAssessment).toMatchObject({
      packageId: packageRow.id,
      recommendation: 'pending',
      summary: 'Placeholder-analyysi tallensi result-domainin rungon.',
    });
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