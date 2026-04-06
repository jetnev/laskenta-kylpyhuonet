import { describe, expect, it } from 'vitest';

import { buildTenderDeterministicAnalysisPlan } from './tender-rule-analysis';

function createProviderProfile(overrides: Partial<{
  credentials: Array<{
    title: string;
    issuer: string | null;
    credentialType: 'certificate' | 'qualification' | 'insurance' | 'license' | 'other';
    validUntil: string | null;
    documentReference: string | null;
    notes: string | null;
  }>;
  constraints: Array<{
    title: string;
    severity: 'hard' | 'soft' | 'info';
    ruleText: string;
    mitigationNote: string | null;
  }>;
  documents: Array<{
    title: string;
    documentType: 'case-study' | 'certificate' | 'insurance' | 'cv' | 'policy' | 'other';
    sourceReference: string | null;
    notes: string | null;
  }>;
  responseTemplates: Array<{
    title: string;
    templateType: 'company-overview' | 'technical-approach' | 'delivery-plan' | 'pricing-note' | 'quality' | 'other';
    contentMd: string | null;
  }>;
}> = {}) {
  return {
    profile: {
      companyName: 'Copilot Oy',
      summary: 'Korjausrakentamisen tarjousosaaja.',
      serviceArea: 'Uusimaa',
      maxTravelKm: 250,
      deliveryScope: 'regional' as const,
    },
    credentials: overrides.credentials ?? [],
    constraints: overrides.constraints ?? [],
    documents: overrides.documents ?? [],
    responseTemplates: overrides.responseTemplates ?? [],
  };
}

function createDocument(documentId: string, fileName: string) {
  return {
    documentId,
    fileName,
  };
}

function createChunk(overrides: Partial<{
  chunkId: string;
  documentId: string;
  extractionId: string;
  chunkIndex: number;
  textContent: string;
}> = {}) {
  return {
    chunkId: 'chunk-1',
    documentId: 'doc-1',
    extractionId: 'ext-1',
    chunkIndex: 0,
    textContent: 'Tarjouksen viimeinen jättöpäivä on 15.05.2026 klo 12.00.',
    ...overrides,
  };
}

describe('buildTenderDeterministicAnalysisPlan', () => {
  it('detects deadline findings and exposes rule-match metadata with chunk-backed evidence', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Päiväkoti / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'tarjouspyynto.txt')],
      chunkRows: [createChunk()],
    });

    expect(plan.requirements).toHaveLength(1);
    expect(plan.requirements[0]).toMatchObject({
      requirementType: 'schedule',
      title: 'Tarjouksen määräaika: 15.05.2026 klo 12.00',
    });
    expect(plan.requirements[0]?.evidenceLinks[0]).toMatchObject({
      sourceIndex: 0,
      matchedRule: 'deadline.tarjouksen_viimeinen_jattopaiva',
    });
    expect(plan.ruleMatches[0]).toMatchObject({
      matchedRule: 'deadline.tarjouksen_viimeinen_jattopaiva',
      targetEntityType: 'requirement',
      normalizedValue: '15.05.2026 klo 12.00',
      evidenceChunkId: 'chunk-1',
    });
    expect(plan.evidenceSources[0]).toMatchObject({
      chunkId: 'chunk-1',
      documentFileName: 'tarjouspyynto.txt',
    });
    expect(plan.draftArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactType: 'quote-outline',
          status: 'ready-for-review',
        }),
        expect.objectContaining({
          artifactType: 'response-summary',
        }),
      ]),
    );
  });

  it('creates a missing-item baseline when a required attachment is mentioned but no matching document exists', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Koulu / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'tarjouspyynto.txt')],
      chunkRows: [createChunk({ textContent: 'Pakollinen liite: verovelkatodistus on toimitettava tarjouksen mukana.' })],
    });

    expect(plan.requirements[0]).toMatchObject({
      title: 'Toimita verovelkatodistus',
      status: 'missing',
    });
    expect(plan.missingItems[0]).toMatchObject({
      itemType: 'document',
      title: 'Verovelkatodistus puuttuu paketista',
      relatedRequirementIndex: 0,
    });
    expect(plan.ruleMatches.some((match) => match.targetEntityType === 'missing_item')).toBe(true);
    expect(plan.missingItems[0]?.evidenceLinks[0]).toMatchObject({
      sourceIndex: 0,
      matchedRule: 'attachment.verovelkatodistus.missing_item',
    });
  });

  it('keeps attachment matching cautious when a similarly named document already exists', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Koulu / tarjouspyyntö',
      documentRows: [
        createDocument('doc-1', 'tarjouspyynto.txt'),
        createDocument('doc-2', 'verovelkatodistus-2026.pdf'),
      ],
      chunkRows: [createChunk({ textContent: 'Verovelkatodistus tulee liittää tarjoukseen.' })],
    });

    expect(plan.requirements[0]).toMatchObject({
      title: 'Toimita verovelkatodistus',
      status: 'unreviewed',
    });
    expect(plan.missingItems).toHaveLength(0);
  });

  it('marks attachment readiness as covered when provider profile contains supporting evidence', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Koulu / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'tarjouspyynto.txt')],
      chunkRows: [createChunk({ textContent: 'Vastuuvakuutustodistus tulee liittää tarjoukseen.' })],
      providerProfile: createProviderProfile({
        credentials: [
          {
            title: 'Vastuuvakuutus 2026',
            issuer: 'Vakuutusyhtiö',
            credentialType: 'insurance',
            validUntil: '2027-01-01T00:00:00.000Z',
            documentReference: 'vakuutus-2026.pdf',
            notes: null,
          },
        ],
      }),
    });

    expect(plan.requirements[0]).toMatchObject({
      title: 'Toimita vastuuvakuutustodistus',
      status: 'covered',
    });
    expect(plan.requirements[0]?.description).toContain('Tarjoajaprofiilista löytyi');
    expect(plan.missingItems).toHaveLength(0);
    expect(plan.goNoGoAssessment.recommendation).toBe('pending');
  });

  it('creates reference requirements and review tasks for findings that still need human judgement', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Sairaala / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'kelpoisuusvaatimukset.txt')],
      chunkRows: [
        createChunk({
          textContent: 'Tarjoajalla tulee olla vähintään kolme vastaavaa kohdetta viimeisen 3 vuoden aikana ja referenssit tulee esittää tarjouksessa.',
        }),
      ],
    });

    expect(plan.requirements[0]).toMatchObject({
      requirementType: 'technical',
      title: 'Esitä referenssit viimeisen 3 vuoden ajalta',
    });
    expect(plan.reviewTasks[0]).toMatchObject({
      taskType: 'requirements',
      title: 'Arvioi referenssivaatimuksen täyttyminen',
    });
    expect(plan.ruleMatches.filter((match) => match.matchedRule.startsWith('reference.')).map((match) => match.targetEntityType)).toEqual([
      'requirement',
      'review_task',
    ]);
    expect(plan.draftArtifacts.find((artifact) => artifact.artifactType === 'clarification-list')?.contentMd).toContain('Arvioi referenssivaatimuksen täyttyminen');
  });

  it('adds a provider follow-up review task when baseline findings exist but provider profile is missing', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Koulu / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'tarjouspyynto.txt')],
      chunkRows: [createChunk({ textContent: 'Pakollinen liite: verovelkatodistus on toimitettava tarjouksen mukana.' })],
    });

    expect(plan.reviewTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskType: 'decision',
          title: 'Täydennä tarjoajaprofiili ennen lopullista go / no-go -päätöstä',
        }),
      ]),
    );
    expect(plan.goNoGoAssessment.recommendation).toBe('conditional-go');
    expect(plan.goNoGoAssessment.summary).toContain('tarjoajaprofiili puuttuu');
  });

  it('adds a hard-constraint review task when provider profile contains blocking-fit checks', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Päiväkoti / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'tarjouspyynto.txt')],
      chunkRows: [createChunk()],
      providerProfile: createProviderProfile({
        constraints: [
          {
            title: 'Ei yli 300 km toimituksia',
            severity: 'hard',
            ruleText: 'Tarjouksia ei jätetä yli 300 km toimitusalueelle.',
            mitigationNote: null,
          },
        ],
      }),
    });

    expect(plan.reviewTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskType: 'decision',
          title: 'Vertaile tarjoajaprofiilin kovat rajaukset tarjouspyyntöön',
        }),
      ]),
    );
    expect(plan.goNoGoAssessment.recommendation).toBe('conditional-go');
    expect(plan.goNoGoAssessment.summary).toContain('kovaa rajausta');
  });

  it('injects provider profile overview and response templates into draft artifacts', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Päiväkoti / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'tarjouspyynto.txt')],
      chunkRows: [createChunk()],
      providerProfile: createProviderProfile({
        constraints: [
          {
            title: 'Ei yli 300 km toimituksia',
            severity: 'hard',
            ruleText: 'Tarjouksia ei jätetä yli 300 km toimitusalueelle.',
            mitigationNote: 'Nosta asia heti go / no-go -katselmointiin.',
          },
        ],
        responseTemplates: [
          {
            title: 'Yritysesittely',
            templateType: 'company-overview',
            contentMd: 'Copilot Oy toimittaa kylpyhuoneremontit avaimet käteen -mallilla Uudenmaan alueella.',
          },
        ],
      }),
    });

    const outlineArtifact = plan.draftArtifacts.find((artifact) => artifact.artifactType === 'quote-outline');
    const summaryArtifact = plan.draftArtifacts.find((artifact) => artifact.artifactType === 'response-summary');
    const clarificationArtifact = plan.draftArtifacts.find((artifact) => artifact.artifactType === 'clarification-list');

    expect(outlineArtifact?.contentMd).toContain('Tarjoajaprofiilin lähtötiedot');
    expect(outlineArtifact?.contentMd).toContain('Yritys: Copilot Oy');
    expect(outlineArtifact?.contentMd).toContain('Hyödynnettävät vastauspohjat');
    expect(outlineArtifact?.contentMd).toContain('Yritysesittely (company-overview)');
    expect(summaryArtifact?.contentMd).toContain('Tarjoajaprofiilin ydinviesti');
    expect(clarificationArtifact?.contentMd).toContain('Tarjoajaprofiilin kovat rajaukset');
    expect(clarificationArtifact?.contentMd).toContain('Ei yli 300 km toimituksia');
  });

  it('falls back to a single review task when no supported baseline rules match', () => {
    const plan = buildTenderDeterministicAnalysisPlan({
      packageTitle: 'Hiljainen / tarjouspyyntö',
      documentRows: [createDocument('doc-1', 'yleinen.txt')],
      chunkRows: [createChunk({ textContent: 'Yleistä taustatietoa projektin taustoista ja yhteystiedoista.' })],
    });

    expect(plan.requirements).toHaveLength(0);
    expect(plan.missingItems).toHaveLength(0);
    expect(plan.reviewTasks).toHaveLength(1);
    expect(plan.reviewTasks[0]).toMatchObject({
      title: 'Tarkista tarjouspyynnön ydinkohdat manuaalisesti',
      taskType: 'documents',
    });
    expect(plan.draftArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactType: 'quote-outline',
          title: 'Deterministinen tarjousrunko',
        }),
        expect.objectContaining({
          artifactType: 'clarification-list',
          title: 'Avoimet tarkennukset ja riskit',
        }),
      ]),
    );
    expect(plan.ruleMatches[0]).toMatchObject({
      matchedRule: 'fallback.manual_review',
      category: 'fallback',
      targetEntityType: 'review_task',
    });
  });
});