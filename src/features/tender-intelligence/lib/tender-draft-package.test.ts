import { describe, expect, it } from 'vitest';

import {
  buildTenderDraftExportPayload,
  buildTenderDraftPackageFromReviewedResults,
  buildTenderDraftPackageReadiness,
} from './tender-draft-package';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createReviewedPackage(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti / vaihe 11',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-05T10:00:00.000Z',
      updatedAt: '2026-04-05T10:00:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      linkedCustomerId: null,
      linkedProjectId: null,
      linkedQuoteId: null,
      currentJobId: '33333333-3333-4333-8333-333333333333',
      summary: {
        documentCount: 1,
        requirementCount: 2,
        missingItemCount: 1,
        riskCount: 1,
        reviewTaskCount: 2,
      },
    },
    documents: [],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        packageId: '11111111-1111-4111-8111-111111111111',
        jobType: 'placeholder_analysis',
        status: 'completed',
        stageLabel: 'Baseline valmis',
        provider: null,
        model: null,
        requestedAt: '2026-04-05T10:00:00.000Z',
        startedAt: '2026-04-05T10:01:00.000Z',
        completedAt: '2026-04-05T10:02:00.000Z',
        errorMessage: null,
      },
    ],
    latestAnalysisJob: {
      id: '33333333-3333-4333-8333-333333333333',
      packageId: '11111111-1111-4111-8111-111111111111',
      jobType: 'placeholder_analysis',
      status: 'completed',
      stageLabel: 'Baseline valmis',
      provider: null,
      model: null,
      requestedAt: '2026-04-05T10:00:00.000Z',
      startedAt: '2026-04-05T10:01:00.000Z',
      completedAt: '2026-04-05T10:02:00.000Z',
      errorMessage: null,
    },
    analysisReadiness: {
      canStart: true,
      blockedReason: null,
      coverage: {
        totalDocuments: 1,
        uploadedDocuments: 1,
        supportedDocuments: 1,
        extractedDocuments: 1,
        extractedChunks: 3,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 0,
      },
    },
    results: {
      requirements: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: null,
          requirementType: 'technical',
          title: 'Vahvista kylpyhuoneremontin toimituslaajuus',
          description: 'Kuvaa toimitussisältö jäsennellysti.',
          status: 'covered',
          confidence: 0.81,
          sourceExcerpt: 'Tarjoajan tulee kuvata toimituslaajuus tarkasti.',
          reviewStatus: 'accepted',
          reviewNote: 'Hyväksytty mukaan luonnospakettiin.',
          reviewedByUserId: '22222222-2222-4222-8222-222222222222',
          reviewedAt: '2026-04-05T10:05:00.000Z',
          resolutionStatus: 'resolved',
          resolutionNote: 'Valmis editorivientiä varten.',
          resolvedByUserId: '22222222-2222-4222-8222-222222222222',
          resolvedAt: '2026-04-05T10:06:00.000Z',
          assignedToUserId: null,
        },
        {
          id: '45454545-4545-4545-8545-454545454545',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: null,
          requirementType: 'commercial',
          title: 'Hinnoitteluliite tarkistettava',
          description: null,
          status: 'missing',
          confidence: 0.44,
          sourceExcerpt: null,
          reviewStatus: 'unreviewed',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'open',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
          assignedToUserId: null,
        },
      ],
      missingItems: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          packageId: '11111111-1111-4111-8111-111111111111',
          relatedRequirementId: '44444444-4444-4444-8444-444444444444',
          itemType: 'clarification',
          title: 'Selvitä urakka-aikataulun tarkennus',
          description: 'Tarjouspyyntö pyytää lisäselvennystä aikatauluun.',
          severity: 'medium',
          status: 'resolved',
          reviewStatus: 'accepted',
          reviewNote: 'Ratkaisu löytyi dokumentaatiosta.',
          reviewedByUserId: '22222222-2222-4222-8222-222222222222',
          reviewedAt: '2026-04-05T10:07:00.000Z',
          resolutionStatus: 'resolved',
          resolutionNote: 'Ei estä luonnospaketin vientiä.',
          resolvedByUserId: '22222222-2222-4222-8222-222222222222',
          resolvedAt: '2026-04-05T10:08:00.000Z',
          assignedToUserId: null,
        },
      ],
      riskFlags: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          packageId: '11111111-1111-4111-8111-111111111111',
          riskType: 'legal',
          title: 'Sopimusriski avoin',
          description: null,
          severity: 'high',
          status: 'open',
          reviewStatus: 'needs_attention',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'open',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
          assignedToUserId: null,
        },
      ],
      goNoGoAssessment: null,
      referenceSuggestions: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          packageId: '11111111-1111-4111-8111-111111111111',
          relatedRequirementId: '44444444-4444-4444-8444-444444444444',
          sourceType: 'organization_reference_profile',
          sourceReference: 'profile-1',
          title: 'Kylpyhuoneremontti / As Oy Aurinkopiha',
          rationale: 'Hyvä osuma vaatimukseen.',
          confidence: 0.77,
          reviewStatus: 'accepted',
          reviewNote: 'Valitaan mukaan.',
          reviewedByUserId: '22222222-2222-4222-8222-222222222222',
          reviewedAt: '2026-04-05T10:09:00.000Z',
          resolutionStatus: 'resolved',
          resolutionNote: 'Soveltuu luonnospaketin referenssiksi.',
          resolvedByUserId: '22222222-2222-4222-8222-222222222222',
          resolvedAt: '2026-04-05T10:10:00.000Z',
        },
      ],
      draftArtifacts: [
        {
          id: '88888888-8888-4888-8888-888888888888',
          packageId: '11111111-1111-4111-8111-111111111111',
          title: 'Tarjousrunko / ensimmäinen versio',
          artifactType: 'quote-outline',
          contentMd: '# Tarjousrunko\n\n- Johdanto\n- Referenssit',
          status: 'accepted',
          createdAt: '2026-04-05T10:11:00.000Z',
          updatedAt: '2026-04-05T10:11:00.000Z',
          reviewStatus: 'accepted',
          reviewNote: 'Kelpaa luonnospaketin pohjaksi.',
          reviewedByUserId: '22222222-2222-4222-8222-222222222222',
          reviewedAt: '2026-04-05T10:12:00.000Z',
          resolutionStatus: 'resolved',
          resolutionNote: 'Sisällytetään payloadiin.',
          resolvedByUserId: '22222222-2222-4222-8222-222222222222',
          resolvedAt: '2026-04-05T10:13:00.000Z',
        },
      ],
      reviewTasks: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          packageId: '11111111-1111-4111-8111-111111111111',
          taskType: 'draft',
          title: 'Pidä toimitusrajauksen huomio editorissa',
          description: 'Jätä tämä tieto näkyväksi editor-notena.',
          status: 'in-review',
          assignedToUserId: null,
          createdAt: '2026-04-05T10:14:00.000Z',
          updatedAt: '2026-04-05T10:14:00.000Z',
          reviewStatus: 'needs_attention',
          reviewNote: 'Pidetään tarkoituksella avoimena huomiona.',
          reviewedByUserId: '22222222-2222-4222-8222-222222222222',
          reviewedAt: '2026-04-05T10:15:00.000Z',
          resolutionStatus: 'open',
          resolutionNote: 'Editorin pitää huomioida tämä myöhemmin.',
          resolvedByUserId: null,
          resolvedAt: null,
        },
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          packageId: '11111111-1111-4111-8111-111111111111',
          taskType: 'requirements',
          title: 'Vanha tarkistustehtävä',
          description: null,
          status: 'todo',
          assignedToUserId: null,
          createdAt: '2026-04-05T10:16:00.000Z',
          updatedAt: '2026-04-05T10:16:00.000Z',
          reviewStatus: 'dismissed',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'wont_fix',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
        },
      ],
    },
  };
}

describe('tender-draft-package', () => {
  it('calculates readiness from reviewed Tender results', () => {
    const readiness = buildTenderDraftPackageReadiness(createReviewedPackage());

    expect(readiness).toMatchObject({
      acceptedRequirementCount: 1,
      acceptedReferenceCount: 1,
      resolvedMissingItemCount: 1,
      noteCount: 1,
      draftArtifactCount: 1,
      unresolvedItemCount: 3,
      canGenerate: true,
    });
  });

  it('builds deterministic draft package items and payload from reviewed results', () => {
    const generation = buildTenderDraftPackageFromReviewedResults({
      packageDetails: createReviewedPackage(),
      generatedAt: '2026-04-05T12:00:00.000Z',
      generatedByUserId: '22222222-2222-4222-8222-222222222222',
    });

    expect(generation.items.some((item) => item.itemType === 'accepted_requirement' && item.isIncluded)).toBe(true);
    expect(generation.items.some((item) => item.itemType === 'accepted_requirement' && !item.isIncluded)).toBe(true);
    expect(generation.items.some((item) => item.itemType === 'review_note' && item.isIncluded)).toBe(true);
    expect(generation.summary).toContain('1 hyväksyttyä vaatimusta');
    expect(generation.exportPayload).toMatchObject({
      schema_version: 'tender-draft-package/v1',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
    });
    expect(generation.exportPayload.accepted_requirements).toHaveLength(1);
    expect(generation.exportPayload.selected_references).toHaveLength(1);
    expect(generation.exportPayload.resolved_missing_items).toHaveLength(1);
    expect(generation.exportPayload.notes_for_editor).toHaveLength(2);
    expect(generation.exportPayload.notes_for_editor[0]?.title).toContain('Pidä toimitusrajauksen');
  });

  it('maps only included items into the export payload sections', () => {
    const payload = buildTenderDraftExportPayload({
      title: 'Payload preview',
      summary: 'Test payload',
      status: 'draft',
      generatedAt: '2026-04-05T12:30:00.000Z',
      generatedByUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      sourceTenderPackageId: '11111111-1111-4111-8111-111111111111',
      sourceAnalysisJobId: '33333333-3333-4333-8333-333333333333',
      items: [
        {
          itemType: 'accepted_requirement',
          sourceEntityType: 'requirement',
          sourceEntityId: '44444444-4444-4444-8444-444444444444',
          title: 'Mukana oleva vaatimus',
          contentMd: 'Tämä lähtee payloadiin.',
          isIncluded: true,
        },
        {
          itemType: 'review_note',
          sourceEntityType: 'review_task',
          sourceEntityId: '55555555-5555-4555-8555-555555555555',
          title: 'Pois jätetty note',
          contentMd: 'Tämä ei lähde payloadiin.',
          isIncluded: false,
        },
      ],
    });

    expect(payload.accepted_requirements).toHaveLength(1);
    expect(payload.notes_for_editor).toEqual([]);
  });
});