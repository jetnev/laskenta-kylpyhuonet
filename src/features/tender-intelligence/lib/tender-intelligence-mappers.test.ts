import { describe, expect, it } from 'vitest';

import {
  buildTenderPackageDetails,
  mapCreateTenderReferenceProfileInputToInsert,
  mapCreateTenderPackageInputToInsert,
  mapTenderDocumentChunkRowToDomain,
  mapTenderDocumentExtractionRowToDomain,
  mapTenderDraftArtifactRowToDomain,
  mapTenderMissingItemRowToDomain,
  mapTenderPackageRowToDomain,
  mapTenderReferenceProfileRowToDomain,
  mapTenderResultEvidenceRowToDomain,
  mapTenderReferenceSuggestionRowToDomain,
  mapTenderRequirementRowToDomain,
  mapTenderReviewTaskRowToDomain,
  mapTenderRiskFlagRowToDomain,
  mapUpdateTenderReferenceProfileInputToPatch,
} from './tender-intelligence-mappers';
import type {
  TenderAnalysisJobRow,
  TenderDocumentChunkRow,
  TenderDocumentExtractionRow,
  TenderDocumentRow,
  TenderDraftArtifactRow,
  TenderGoNoGoAssessmentRow,
  TenderMissingItemRow,
  TenderPackageRow,
  TenderReferenceProfileRow,
  TenderResultEvidenceRow,
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

function createWorkflowFields(overrides: Partial<{
  review_status: 'unreviewed' | 'accepted' | 'dismissed' | 'needs_attention';
  review_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  resolution_status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  resolution_note: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
}> = {}) {
  return {
    review_status: 'unreviewed' as const,
    review_note: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    resolution_status: 'open' as const,
    resolution_note: null,
    resolved_by_user_id: null,
    resolved_at: null,
    ...overrides,
  };
}

function createAssignableWorkflowFields(overrides: Partial<{
  review_status: 'unreviewed' | 'accepted' | 'dismissed' | 'needs_attention';
  review_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  resolution_status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  resolution_note: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  assigned_to_user_id: string | null;
}> = {}) {
  return {
    ...createWorkflowFields(overrides),
    assigned_to_user_id: null,
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
      ...createAssignableWorkflowFields({
        review_status: 'accepted',
        review_note: 'Hyväksytty manuaalisesti',
        reviewed_by_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
        reviewed_at: '2026-04-05T09:01:00.000Z',
        resolution_status: 'resolved',
        resolution_note: 'Ratkaistu jatkokäsittelyyn',
        resolved_by_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
        resolved_at: '2026-04-05T09:02:00.000Z',
        assigned_to_user_id: '33333333-3333-4333-8333-333333333333',
      }),
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
      ...createAssignableWorkflowFields({
        review_status: 'needs_attention',
        resolution_status: 'open',
      }),
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
      ...createAssignableWorkflowFields({
        review_status: 'dismissed',
        resolution_status: 'wont_fix',
      }),
    };
    const referenceSuggestionRow: TenderReferenceSuggestionRow = {
      id: '77777777-7777-4777-8777-777777777777',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      related_requirement_id: requirementRow.id,
      source_type: 'manual',
      source_reference: 'A-liite.pdf',
      title: 'Hyödynnä aiempi vastausrunko',
      rationale: 'Placeholder-ehdotus',
      confidence: 0.31,
      created_at: '2026-04-05T09:07:00.000Z',
      updated_at: '2026-04-05T09:07:00.000Z',
      ...createWorkflowFields(),
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
      ...createWorkflowFields(),
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
      ...createWorkflowFields({
        review_status: 'accepted',
        resolution_status: 'resolved',
      }),
    };
    const extractionRow: TenderDocumentExtractionRow = {
      id: '10101010-1010-4010-8010-101010101010',
      tender_document_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      extraction_status: 'extracted',
      extractor_type: 'xlsx',
      source_mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      character_count: 240,
      chunk_count: 2,
      extracted_text: 'Sheet data',
      error_message: null,
      extracted_at: '2026-04-05T09:09:30.000Z',
      created_at: '2026-04-05T09:09:30.000Z',
      updated_at: '2026-04-05T09:09:30.000Z',
    };
    const chunkRow: TenderDocumentChunkRow = {
      id: '20202020-2020-4020-8020-202020202020',
      tender_document_id: extractionRow.tender_document_id,
      tender_package_id: extractionRow.tender_package_id,
      organization_id: extractionRow.organization_id,
      extraction_id: extractionRow.id,
      chunk_index: 0,
      text_content: 'Sheet data chunk',
      character_count: 16,
      created_at: '2026-04-05T09:09:31.000Z',
      updated_at: '2026-04-05T09:09:31.000Z',
    };
    const resultEvidenceRow: TenderResultEvidenceRow = {
      id: '30303030-3030-4030-8030-303030303030',
      tender_package_id: requirementRow.tender_package_id,
      organization_id: requirementRow.organization_id,
      source_document_id: requirementRow.source_document_id!,
      extraction_id: extractionRow.id,
      chunk_id: chunkRow.id,
      target_entity_type: 'requirement',
      target_entity_id: requirementRow.id,
      excerpt_text: 'Sheet data chunk',
      locator_text: 'A-liite.pdf / chunk 1',
      confidence: 0.68,
      created_at: '2026-04-05T09:09:32.000Z',
      updated_at: '2026-04-05T09:09:32.000Z',
    };

    expect(mapTenderRequirementRowToDomain(requirementRow)).toMatchObject({
      requirementType: 'technical',
      confidence: 0.42,
      sourceExcerpt: 'Placeholder-ote',
      reviewStatus: 'accepted',
      resolutionStatus: 'resolved',
      assignedToUserId: '33333333-3333-4333-8333-333333333333',
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
      relatedRequirementId: requirementRow.id,
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
      reviewStatus: 'accepted',
      resolutionStatus: 'resolved',
    });
    expect(mapTenderDocumentExtractionRowToDomain(extractionRow)).toMatchObject({
      extractionStatus: 'extracted',
      extractorType: 'xlsx',
      chunkCount: 2,
    });
    expect(mapTenderDocumentChunkRowToDomain(chunkRow)).toMatchObject({
      extractionId: extractionRow.id,
      chunkIndex: 0,
      textContent: 'Sheet data chunk',
    });
    expect(mapTenderResultEvidenceRowToDomain(resultEvidenceRow)).toMatchObject({
      targetEntityType: 'requirement',
      targetEntityId: requirementRow.id,
      locatorText: 'A-liite.pdf / chunk 1',
      confidence: 0.68,
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
        mime_type: 'text/plain',
        storage_bucket: 'tender-intelligence',
        storage_path: 'org/package/tarjouspyynto.txt',
        file_size_bytes: null,
        checksum: null,
        upload_error: null,
        upload_status: 'uploaded',
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
    const documentExtractionRows: TenderDocumentExtractionRow[] = [
      {
        id: '15151515-1515-4515-8515-151515151515',
        tender_document_id: documentRows[0].id,
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        extraction_status: 'extracted',
        extractor_type: 'plain_text',
        source_mime_type: 'text/plain',
        character_count: 180,
        chunk_count: 1,
        extracted_text: 'Purettu teksti',
        error_message: null,
        extracted_at: '2026-04-05T09:11:00.000Z',
        created_at: '2026-04-05T09:11:00.000Z',
        updated_at: '2026-04-05T09:11:00.000Z',
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
        ...createAssignableWorkflowFields(),
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
        ...createAssignableWorkflowFields(),
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
        ...createAssignableWorkflowFields(),
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
        ...createWorkflowFields(),
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
        ...createWorkflowFields(),
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
        ...createWorkflowFields(),
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
    const resultEvidenceRows: TenderResultEvidenceRow[] = [
      {
        id: '15151515-1515-4515-8515-151515151516',
        tender_package_id: packageRow.id,
        organization_id: packageRow.organization_id,
        source_document_id: documentRows[0].id,
        extraction_id: documentExtractionRows[0].id,
        chunk_id: '16161616-1616-4616-8616-161616161616',
        target_entity_type: 'requirement',
        target_entity_id: requirementRows[0].id,
        excerpt_text: 'Purettu teksti',
        locator_text: 'tarjouspyynto.pdf / chunk 1',
        confidence: 0.55,
        created_at: '2026-04-05T09:18:30.000Z',
        updated_at: '2026-04-05T09:18:30.000Z',
      },
    ];

    const details = buildTenderPackageDetails({
      packageRow,
      documentRows,
      documentExtractionRows,
      resultEvidenceRows,
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
    expect(details.documentExtractions[0]).toMatchObject({
      documentId: documentRows[0].id,
      extractionStatus: 'extracted',
      chunkCount: 1,
    });
    expect(details.resultEvidence[0]).toMatchObject({
      targetEntityType: 'requirement',
      targetEntityId: requirementRows[0].id,
      locatorText: 'tarjouspyynto.pdf / chunk 1',
    });
    expect(details.analysisReadiness).toMatchObject({
      canStart: false,
      blockedReason: 'Paketille on jo käynnissä analyysiajo. Odota nykyisen ajon valmistumista.',
    });
    expect(details.analysisReadiness.coverage).toMatchObject({
      extractedDocuments: 1,
      extractedChunks: 1,
    });
    expect(details.results.requirements[0]).toMatchObject({
      requirementType: 'technical',
      confidence: 0.42,
      reviewStatus: 'unreviewed',
      resolutionStatus: 'open',
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
      reviewStatus: 'unreviewed',
      resolutionStatus: 'open',
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

describe('reference profile mappers', () => {
  it('maps reference corpus rows and CRUD payloads into the feature boundary', () => {
    const row: TenderReferenceProfileRow = {
      id: '21212121-2121-4212-8212-212121212121',
      organization_id: '22222222-2222-4222-8222-222222222222',
      title: 'Kylpyhuoneremontti / As Oy Aurinkopiha',
      client_name: 'As Oy Aurinkopiha',
      project_type: 'kylpyhuoneremontti',
      description: 'Laaja saneerauskohde',
      location: 'Helsinki',
      completed_year: 2024,
      contract_value: 185000,
      tags: ['kylpyhuone', 'saneeraus'],
      source_kind: 'manual',
      source_reference: 'CRM-42',
      created_by_user_id: '33333333-3333-4333-8333-333333333333',
      created_at: '2026-04-05T09:20:00.000Z',
      updated_at: '2026-04-05T09:21:00.000Z',
    };

    expect(mapTenderReferenceProfileRowToDomain(row)).toMatchObject({
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      projectType: 'kylpyhuoneremontti',
      completedYear: 2024,
      contractValue: 185000,
      tags: ['kylpyhuone', 'saneeraus'],
      sourceKind: 'manual',
    });

    expect(mapCreateTenderReferenceProfileInputToInsert({
      title: 'As Oy Aurinkopiha',
      clientName: 'As Oy Aurinkopiha',
      projectType: 'kylpyhuoneremontti',
      description: 'Laaja saneerauskohde',
      location: 'Helsinki',
      completedYear: 2024,
      contractValue: 185000,
      tags: ['kylpyhuone', 'saneeraus'],
      sourceKind: 'manual',
      sourceReference: 'CRM-42',
    })).toEqual({
      title: 'As Oy Aurinkopiha',
      client_name: 'As Oy Aurinkopiha',
      project_type: 'kylpyhuoneremontti',
      description: 'Laaja saneerauskohde',
      location: 'Helsinki',
      completed_year: 2024,
      contract_value: 185000,
      tags: ['kylpyhuone', 'saneeraus'],
      source_kind: 'manual',
      source_reference: 'CRM-42',
    });

    expect(mapUpdateTenderReferenceProfileInputToPatch({
      title: 'As Oy Aurinkopiha / päivitetty',
      clientName: null,
      projectType: 'linjasaneeraus',
      description: null,
      location: 'Espoo',
      completedYear: 2025,
      contractValue: null,
      tags: null,
      sourceKind: 'imported',
      sourceReference: null,
    })).toEqual({
      title: 'As Oy Aurinkopiha / päivitetty',
      client_name: null,
      project_type: 'linjasaneeraus',
      description: null,
      location: 'Espoo',
      completed_year: 2025,
      contract_value: null,
      tags: null,
      source_kind: 'imported',
      source_reference: null,
    });
  });
});