import { describe, expect, it } from 'vitest';

import { buildTenderDeterministicAnalysisPlan } from './tender-rule-analysis';

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
    expect(plan.ruleMatches[0]).toMatchObject({
      matchedRule: 'fallback.manual_review',
      category: 'fallback',
      targetEntityType: 'review_task',
    });
  });
});