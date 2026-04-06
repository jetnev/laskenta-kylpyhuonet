import { describe, expect, it } from 'vitest';

import { buildTenderGoNoGoDecisionSupport } from './tender-go-no-go';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createReadyProviderProfile() {
  return {
    profile: {
      id: '77777777-7777-4777-8777-777777777777',
      organizationId: '88888888-8888-4888-8888-888888888888',
      companyName: 'Copilot Oy',
      businessId: '1234567-8',
      websiteUrl: 'https://copilot.example.com',
      headquarters: 'Helsinki',
      summary: 'Korjausrakentamisen ja tarjousvastauksen ydinosaaja.',
      serviceArea: 'Uusimaa',
      maxTravelKm: 250,
      deliveryScope: 'regional' as const,
      createdByUserId: null,
      createdAt: '2026-04-06T08:00:00.000Z',
      updatedAt: '2026-04-06T08:00:00.000Z',
    },
    contacts: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        profileId: '77777777-7777-4777-8777-777777777777',
        organizationId: '88888888-8888-4888-8888-888888888888',
        fullName: 'Tarjousvastaava',
        roleTitle: 'Tarjousjohtaja',
        email: 'tarjous@copilot.example.com',
        phone: null,
        isPrimary: true,
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
      },
    ],
    credentials: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        profileId: '77777777-7777-4777-8777-777777777777',
        organizationId: '88888888-8888-4888-8888-888888888888',
        title: 'Vastuuvakuutus',
        issuer: 'Vakuutusyhtiö',
        credentialType: 'insurance' as const,
        validUntil: '2027-04-06T08:00:00.000Z',
        documentReference: null,
        notes: null,
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
      },
    ],
    constraints: [],
    documents: [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        profileId: '77777777-7777-4777-8777-777777777777',
        organizationId: '88888888-8888-4888-8888-888888888888',
        title: 'Yritysesite',
        documentType: 'case-study' as const,
        sourceReference: null,
        notes: null,
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
      },
    ],
    responseTemplates: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        profileId: '77777777-7777-4777-8777-777777777777',
        organizationId: '88888888-8888-4888-8888-888888888888',
        title: 'Yritysesittely',
        templateType: 'company-overview' as const,
        contentMd: 'Yritysesittelyteksti',
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
      },
    ],
  };
}

function createPackageDetails(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-06T08:00:00.000Z',
      updatedAt: '2026-04-06T08:00:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      linkedCustomerId: null,
      linkedProjectId: null,
      linkedQuoteId: null,
      currentJobId: null,
      summary: {
        documentCount: 1,
        requirementCount: 1,
        missingItemCount: 0,
        riskCount: 1,
        reviewTaskCount: 0,
      },
    },
    documents: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        packageId: '11111111-1111-4111-8111-111111111111',
        fileName: 'tarjouspyynto.pdf',
        mimeType: 'application/pdf',
        kind: 'rfp',
        storageBucket: 'tender-intelligence',
        storagePath: 'org/package/file.pdf',
        fileSizeBytes: 100,
        checksum: null,
        uploadError: null,
        uploadState: 'uploaded',
        parseStatus: 'completed',
        createdAt: '2026-04-06T08:00:00.000Z',
        updatedAt: '2026-04-06T08:00:00.000Z',
      },
    ],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [],
    latestAnalysisJob: {
      id: '44444444-4444-4444-8444-444444444444',
      packageId: '11111111-1111-4111-8111-111111111111',
      jobType: 'placeholder_analysis',
      status: 'completed',
      stageLabel: 'Valmis',
      provider: null,
      model: null,
      requestedAt: '2026-04-06T08:05:00.000Z',
      startedAt: '2026-04-06T08:06:00.000Z',
      completedAt: '2026-04-06T08:07:00.000Z',
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
        extractedChunks: 2,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 0,
      },
    },
    results: {
      requirements: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: null,
          requirementType: 'technical',
          title: 'Hyväksytty vaatimus',
          description: null,
          status: 'covered',
          confidence: 0.7,
          sourceExcerpt: null,
          reviewStatus: 'accepted',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'resolved',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
          assignedToUserId: null,
        },
      ],
      missingItems: [],
      riskFlags: [],
      goNoGoAssessment: {
        packageId: '11111111-1111-4111-8111-111111111111',
        recommendation: 'go',
        summary: 'Riskitaso on hyväksyttävä ja aineisto riittää etenemiseen.',
        confidence: 0.66,
        updatedAt: '2026-04-06T08:09:00.000Z',
      },
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [],
    },
    providerProfile: createReadyProviderProfile(),
  };
}

describe('tender-go-no-go', () => {
  it('reports ready state when assessment is go and no blockers remain', () => {
    const decision = buildTenderGoNoGoDecisionSupport(createPackageDetails());

    expect(decision.state).toBe('ready');
    expect(decision.recommendation).toBe('go');
    expect(decision.canProceed).toBe(true);
  });

  it('reports blocked state when a high risk remains open', () => {
    const details = createPackageDetails();
    details.results.riskFlags.push({
      id: '66666666-6666-4666-8666-666666666666',
      packageId: details.package.id,
      riskType: 'legal',
      title: 'Avoin sopimusriski',
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
    });

    const decision = buildTenderGoNoGoDecisionSupport(details);

    expect(decision.state).toBe('blocked');
    expect(decision.openHighRiskCount).toBe(1);
    expect(decision.canProceed).toBe(false);
  });

  it('warns when provider profile is missing even if baseline signals are otherwise ready', () => {
    const details = createPackageDetails();
    details.providerProfile = null;

    const decision = buildTenderGoNoGoDecisionSupport(details);
    const providerSignal = decision.signals.find((signal) => signal.key === 'provider-profile');

    expect(decision.state).toBe('warning');
    expect(decision.canProceed).toBe(true);
    expect(providerSignal).toMatchObject({
      state: 'warning',
    });
    expect(providerSignal?.detail).toContain('Tarjoajaprofiilia ei ole vielä muodostettu');
    expect(decision.nextActions).toContain('Luo tarjoajaprofiilin runko yrityksen ydintiedoilla.');
  });

  it('warns when hard provider constraints need manual fit-checking', () => {
    const details = createPackageDetails();
    details.providerProfile?.constraints.push({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      profileId: details.providerProfile?.profile.id ?? '77777777-7777-4777-8777-777777777777',
      organizationId: details.providerProfile?.profile.organizationId ?? '88888888-8888-4888-8888-888888888888',
      title: 'Ei yli 300 km toimituksia',
      constraintType: 'capacity',
      severity: 'hard',
      ruleText: 'Tarjouksia ei jätetä yli 300 km toimitusalueelle.',
      mitigationNote: null,
      createdAt: '2026-04-06T08:00:00.000Z',
      updatedAt: '2026-04-06T08:00:00.000Z',
    });

    const decision = buildTenderGoNoGoDecisionSupport(details);
    const providerSignal = decision.signals.find((signal) => signal.key === 'provider-profile');

    expect(decision.state).toBe('warning');
    expect(providerSignal?.detail).toContain('1 kovaa rajausta');
    expect(decision.nextActions).toContain('Tarkista 1 kovan rajauksen sopivuus tarjouspyynnön ehtoihin ennen sitovaa go / no-go -päätöstä.');
  });
});