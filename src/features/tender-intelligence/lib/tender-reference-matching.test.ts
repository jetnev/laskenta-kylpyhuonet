import { describe, expect, it } from 'vitest';

import { buildTenderReferenceMatches, isTenderReferenceRequirementCandidate } from './tender-reference-matching';

describe('tender-reference-matching', () => {
  it('creates deterministic suggestions only for profiles with concrete keyword, project type, year, and location support', () => {
    const suggestions = buildTenderReferenceMatches({
      currentYear: 2026,
      requirements: [
        {
          id: 'requirement-1',
          title: 'Esitä kylpyhuoneremontin referenssit Helsingin alueelta viimeisen 3 vuoden aikana',
          description: 'Tarjoajalla tulee olla vastaavia kylpyhuoneremontteja julkisesta saneerauskohteesta.',
          sourceExcerpt: 'Referenssien tulee liittyä kylpyhuoneremonttiin ja sijaita Helsingissä.',
        },
      ],
      profiles: [
        {
          id: 'profile-match',
          title: 'Kylpyhuoneremontti / As Oy Merikatu',
          clientName: 'As Oy Merikatu',
          projectType: 'kylpyhuoneremontti',
          description: 'Laaja julkinen saneeraus, jossa uusittiin märkätilat ja talotekniikka.',
          location: 'Helsinki',
          completedYear: 2025,
          contractValue: 185000,
          tags: ['kylpyhuoneremontti', 'julkinen', 'saneeraus'],
        },
        {
          id: 'profile-too-old',
          title: 'Kylpyhuoneremontti / As Oy Vanhapiha',
          clientName: 'As Oy Vanhapiha',
          projectType: 'kylpyhuoneremontti',
          description: 'Saneerauskohde',
          location: 'Helsinki',
          completedYear: 2020,
          contractValue: 120000,
          tags: ['kylpyhuoneremontti'],
        },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      requirementId: 'requirement-1',
      profileId: 'profile-match',
      title: 'Kylpyhuoneremontti / As Oy Merikatu',
    });
    expect(suggestions[0]?.rationale).toContain('Projektityyppi');
    expect(suggestions[0]?.rationale).toContain('Helsinki');
    expect(suggestions[0]?.matchSummary).toMatchObject({
      projectTypeMatched: true,
      locationMatched: true,
      completedYearMatched: true,
      referenceWindowYears: 3,
    });
  });

  it('refuses to create fake suggestions for generic reference requirements without a concrete corpus signal', () => {
    const suggestions = buildTenderReferenceMatches({
      currentYear: 2026,
      requirements: [
        {
          id: 'requirement-1',
          title: 'Esitä tarjouspyynnön mukaiset referenssit',
          description: 'Tarjoajalla tulee olla vastaavia kohteita viimeisen 3 vuoden aikana.',
          sourceExcerpt: null,
        },
      ],
      profiles: [
        {
          id: 'profile-generic',
          title: 'Linjasaneeraus / As Oy Ketokuja',
          clientName: 'As Oy Ketokuja',
          projectType: 'linjasaneeraus',
          description: 'Yleinen linjasaneeraus ilman tarjouspyynnön erikoistermejä.',
          location: 'Tampere',
          completedYear: 2025,
          contractValue: 90000,
          tags: ['linjasaneeraus'],
        },
      ],
    });

    expect(suggestions).toEqual([]);
  });

  it('detects which requirements are reference requirements before matching', () => {
    expect(isTenderReferenceRequirementCandidate({
      title: 'Esitä viimeisen 3 vuoden referenssit',
      description: null,
      sourceExcerpt: null,
    })).toBe(true);
    expect(isTenderReferenceRequirementCandidate({
      title: 'Tarjouksen määräaika',
      description: 'Toimita tarjous viimeistään 15.05.2026.',
      sourceExcerpt: null,
    })).toBe(false);
  });
});