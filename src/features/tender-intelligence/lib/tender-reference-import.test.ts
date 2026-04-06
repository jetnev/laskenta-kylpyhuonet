import { describe, expect, it } from 'vitest';

import {
  buildTenderReferenceImportPreview,
  parseTenderReferenceImportRecords,
  parseTenderReferenceImportText,
} from './tender-reference-import';
import type { TenderReferenceProfile } from '../types/tender-intelligence';

function createExistingProfile(): TenderReferenceProfile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    organizationId: '22222222-2222-4222-8222-222222222222',
    title: 'Kylpyhuoneremontti / As Oy Merikatu',
    clientName: 'As Oy Merikatu',
    projectType: 'kylpyhuoneremontti',
    description: 'Valmis kohde',
    location: 'Helsinki',
    completedYear: 2025,
    contractValue: 185000,
    tags: ['kylpyhuone'],
    sourceKind: 'imported',
    sourceReference: 'CRM-100',
    createdByUserId: null,
    createdAt: '2026-04-06T12:00:00.000Z',
    updatedAt: '2026-04-06T12:00:00.000Z',
  };
}

describe('tender-reference-import', () => {
  it('parses TSV import text into reference profile inputs', () => {
    const parsedRows = parseTenderReferenceImportText([
      'Otsikko\tAsiakas\tProjektityyppi\tSijainti\tValmistumisvuosi\tUrakka-arvo\tTagit\tLähdetyyppi\tLähdeviite',
      'Kylpyhuoneremontti / As Oy Aurinkopiha\tAs Oy Aurinkopiha\tkylpyhuoneremontti\tEspoo\t2024\t85000\tkylpyhuone; saneeraus\ttuotu\tCRM-101',
    ].join('\n'));

    expect(parsedRows).toHaveLength(1);
    expect(parsedRows[0]).toMatchObject({
      rowNumber: 1,
      error: null,
    });
    expect(parsedRows[0]?.input).toMatchObject({
      title: 'Kylpyhuoneremontti / As Oy Aurinkopiha',
      clientName: 'As Oy Aurinkopiha',
      projectType: 'kylpyhuoneremontti',
      location: 'Espoo',
      completedYear: 2024,
      contractValue: 85000,
      sourceKind: 'imported',
      sourceReference: 'CRM-101',
      tags: ['kylpyhuone', 'saneeraus'],
    });
  });

  it('marks existing and batch duplicates while keeping new rows importable', () => {
    const parsedRows = parseTenderReferenceImportRecords([
      {
        Otsikko: 'Kylpyhuoneremontti / As Oy Merikatu',
        Asiakas: 'As Oy Merikatu',
        Projektityyppi: 'kylpyhuoneremontti',
        Sijainti: 'Helsinki',
        Valmistumisvuosi: 2025,
        'Urakka-arvo': 185000,
      },
      {
        Otsikko: 'Kylpyhuoneremontti / As Oy Aurinkopiha',
        Asiakas: 'As Oy Aurinkopiha',
        Projektityyppi: 'kylpyhuoneremontti',
        Sijainti: 'Espoo',
        Valmistumisvuosi: 2024,
        'Urakka-arvo': 85000,
      },
      {
        Otsikko: 'Kylpyhuoneremontti / As Oy Aurinkopiha',
        Asiakas: 'As Oy Aurinkopiha',
        Projektityyppi: 'kylpyhuoneremontti',
        Sijainti: 'Espoo',
        Valmistumisvuosi: 2024,
        'Urakka-arvo': 85000,
      },
    ]);
    const preview = buildTenderReferenceImportPreview({
      parsedRows,
      existingProfiles: [createExistingProfile()],
    });

    expect(preview.summary).toMatchObject({
      totalRows: 3,
      importableCount: 1,
      duplicateExistingCount: 1,
      duplicateBatchCount: 1,
      invalidCount: 0,
    });
    expect(preview.rows.map((row) => row.status)).toEqual([
      'duplicate_existing',
      'importable',
      'duplicate_batch',
    ]);
    expect(preview.importableProfiles).toHaveLength(1);
  });

  it('flags invalid rows with a parse error', () => {
    const parsedRows = parseTenderReferenceImportRecords([
      {
        Asiakas: 'As Oy Puuttuva',
      },
    ]);

    expect(parsedRows).toHaveLength(1);
    expect(parsedRows[0]).toMatchObject({
      input: null,
      error: 'Otsikko puuttuu.',
    });
  });
});