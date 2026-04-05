/**
 * Deterministic placeholder analysis seed plan builder for server-side runner.
 *
 * This is the server-side counterpart of the frontend's
 * `buildPlaceholderAnalysisSeedPlan` — it generates the same deterministic
 * placeholder data structure without depending on frontend build tooling.
 *
 * When a real analysis engine replaces placeholder runs, this file is removed
 * entirely; the Edge Function entry-point is the only stable boundary.
 */

/* ------------------------------------------------------------------ */
/*  Lightweight row shapes — only the fields the seed plan needs       */
/* ------------------------------------------------------------------ */

export interface PackageRowSlice {
  id: string;
  title: string;
  organization_id: string;
}

export interface DocumentRowSlice {
  id: string;
  file_name: string;
  tender_package_id: string;
}

export interface ChunkRowSlice {
  id: string;
  tender_document_id: string;
  extraction_id: string;
  chunk_index: number;
  text_content: string;
}

/* ------------------------------------------------------------------ */
/*  Seed plan types                                                    */
/* ------------------------------------------------------------------ */

export interface PlaceholderRequirementSeed {
  sourceDocumentId: string | null;
  requirementType: string;
  title: string;
  description: string | null;
  status: string;
  confidence: number | null;
  sourceExcerpt: string | null;
  evidenceLinks: PlaceholderResultEvidenceLinkSeed[];
}

export interface PlaceholderMissingItemSeed {
  relatedRequirementIndex: number | null;
  itemType: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  evidenceLinks: PlaceholderResultEvidenceLinkSeed[];
}

export interface PlaceholderRiskFlagSeed {
  riskType: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  evidenceLinks: PlaceholderResultEvidenceLinkSeed[];
}

export interface PlaceholderReferenceSuggestionSeed {
  sourceType: string;
  sourceReference: string | null;
  title: string;
  rationale: string | null;
  confidence: number | null;
  evidenceLinks: PlaceholderResultEvidenceLinkSeed[];
}

export interface PlaceholderDraftArtifactSeed {
  artifactType: string;
  title: string;
  contentMd: string | null;
  status: string;
  evidenceLinks: PlaceholderResultEvidenceLinkSeed[];
}

export interface PlaceholderReviewTaskSeed {
  taskType: string;
  title: string;
  description: string | null;
  status: string;
  evidenceLinks: PlaceholderResultEvidenceLinkSeed[];
}

export interface PlaceholderResultEvidenceLinkSeed {
  sourceIndex: number;
  confidence: number | null;
}

export interface PlaceholderEvidenceSourceSeed {
  documentId: string;
  extractionId: string;
  chunkId: string;
  documentFileName: string;
  chunkIndex: number;
  excerptText: string;
  locatorText: string;
}

export interface PlaceholderAnalysisSeedPlan {
  goNoGoAssessment: {
    recommendation: string;
    summary: string;
    confidence: number | null;
  };
  evidenceSources: PlaceholderEvidenceSourceSeed[];
  requirements: PlaceholderRequirementSeed[];
  missingItems: PlaceholderMissingItemSeed[];
  riskFlags: PlaceholderRiskFlagSeed[];
  referenceSuggestions: PlaceholderReferenceSuggestionSeed[];
  draftArtifacts: PlaceholderDraftArtifactSeed[];
  reviewTasks: PlaceholderReviewTaskSeed[];
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

function getChunkExcerpt(value: string, maxLength = 180) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const suffix = '...';

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - suffix.length)).trimEnd()}${suffix}`;
}

function buildEvidenceSources(documentRows: DocumentRowSlice[], chunkRows: ChunkRowSlice[]) {
  const documentNameById = new Map(documentRows.map((row) => [row.id, row.file_name]));

  return [...chunkRows]
    .sort((left, right) => {
      const leftName = documentNameById.get(left.tender_document_id) ?? '';
      const rightName = documentNameById.get(right.tender_document_id) ?? '';
      return leftName.localeCompare(rightName, 'fi-FI') || left.chunk_index - right.chunk_index || left.id.localeCompare(right.id, 'fi-FI');
    })
    .map((chunkRow) => {
      const documentFileName = documentNameById.get(chunkRow.tender_document_id) ?? 'Tuntematon dokumentti';

      return {
        documentId: chunkRow.tender_document_id,
        extractionId: chunkRow.extraction_id,
        chunkId: chunkRow.id,
        documentFileName,
        chunkIndex: chunkRow.chunk_index,
        excerptText: getChunkExcerpt(chunkRow.text_content),
        locatorText: `${documentFileName} / chunk ${chunkRow.chunk_index + 1}`,
      };
    });
}

function buildEvidenceLinks(evidenceSourceCount: number, sourceIndexes: number[], confidence: number | null) {
  if (evidenceSourceCount < 1) {
    return [];
  }

  return Array.from(new Set(sourceIndexes.map((sourceIndex) => sourceIndex % evidenceSourceCount))).map((sourceIndex) => ({
    sourceIndex,
    confidence,
  }));
}

export function buildPlaceholderAnalysisSeedPlan(input: {
  packageRow: PackageRowSlice;
  documentRows: DocumentRowSlice[];
  chunkRows: ChunkRowSlice[];
}): PlaceholderAnalysisSeedPlan {
  const evidenceSources = buildEvidenceSources(input.documentRows, input.chunkRows);

  if (evidenceSources.length < 1) {
    throw new Error('Placeholder-analyysi vaatii vähintään yhden extracted chunkin evidence-datan muodostamiseen.');
  }

  const primaryEvidence = evidenceSources[0];
  const secondaryEvidence = evidenceSources[1] ?? primaryEvidence;
  const tertiaryEvidence = evidenceSources[2] ?? secondaryEvidence;
  const documentReference =
    Array.from(new Set(evidenceSources.slice(0, 2).map((source) => source.documentFileName))).join(', ') || null;
  const packageTitle = input.packageRow.title.trim();

  return {
    goNoGoAssessment: {
      recommendation: 'pending',
      summary: `Placeholder-analyysi tallensi paketin "${packageTitle}" tulosdomainiin extraction-aware esimerkkirakenteen. Varsinainen päätöstuki lisätään myöhemmässä vaiheessa, mutta rivit ankkuroituvat jo oikeisiin extracted chunk -lähteisiin.`,
      confidence: 0.24,
    },
    evidenceSources,
    requirements: [
      {
        sourceDocumentId: primaryEvidence.documentId,
        requirementType: 'technical',
        title: 'Vahvista tekninen toimituslaajuus',
        description: `Placeholder-vaatimus ankkuroituu extracted chunkiin ${primaryEvidence.locatorText} paketilta "${packageTitle}" ilman semanttista tulkintaa.`,
        status: 'unreviewed',
        confidence: 0.42,
        sourceExcerpt: primaryEvidence.excerptText,
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [0], 0.42),
      },
      {
        sourceDocumentId: secondaryEvidence.documentId,
        requirementType: 'schedule',
        title: 'Vahvista aikataulu ja vastuurajat',
        description: `Tämä placeholder-rivi käyttää extracted chunkia ${secondaryEvidence.locatorText} tulevan vaatimusmallin pysyvänä domain-pohjana.`,
        status: 'at-risk',
        confidence: 0.37,
        sourceExcerpt: secondaryEvidence.excerptText,
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [1], 0.37),
      },
    ],
    missingItems: [
      {
        relatedRequirementIndex: 0,
        itemType: 'clarification',
        title: 'Täsmennä toimituslaajuuden rajaukset',
        description: `Placeholder-puute viittaa chunkiin ${primaryEvidence.locatorText}, mutta ei vielä tee sisällöstä oikeaa päätelmää.`,
        severity: 'medium',
        status: 'open',
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [0], 0.34),
      },
      {
        relatedRequirementIndex: 1,
        itemType: 'decision',
        title: 'Varmista projektin päätöksentekijä ennen luonnoksen viimeistelyä',
        description: `Placeholder-rivi säilyttää puutedomainin pysyvän rakenteen ja liittää sen evidence-lähteeseen ${secondaryEvidence.locatorText}.`,
        severity: 'low',
        status: 'open',
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [1], 0.28),
      },
    ],
    riskFlags: [
      {
        riskType: 'delivery',
        title: 'Aikatauluriski vaatii manuaalisen tarkistuksen',
        description: `Placeholder-riski nojaa extracted chunkiin ${secondaryEvidence.locatorText} ja testaa pysyvää riskidomainia ilman semanttista analyysiä.`,
        severity: 'medium',
        status: 'open',
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [1], 0.33),
      },
      {
        riskType: 'commercial',
        title: 'Hinnoittelun rajaukset ovat vielä avoinna',
        description: `Tämä placeholder-rivi käyttää evidence-lähdettä ${tertiaryEvidence.locatorText} ja korvautuu myöhemmin oikealla riskihavainnolla.`,
        severity: 'high',
        status: 'open',
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [2], 0.36),
      },
    ],
    referenceSuggestions: [
      {
        sourceType: 'manual',
        sourceReference: documentReference,
        title: 'Hyödynnä aiemmin hyväksyttyä vastausrunkoa seuraavassa vaiheessa',
        rationale: `Placeholder-referenssiehdotus osoittaa, mihin myöhempi referenssihaku kiinnittyy, ja käyttää lähteenä ${primaryEvidence.locatorText}.`,
        confidence: 0.31,
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [0], 0.31),
      },
    ],
    draftArtifacts: [
      {
        artifactType: 'quote-outline',
        title: 'Tarjousvastauksen placeholder-runko',
        contentMd: [
          '# Tarjousvastauksen placeholder-runko',
          '',
          `Paketti: ${packageTitle}`,
          '',
          '## Huomio',
          `Tämä sisältö on deterministinen placeholder. Lähdechunkit: ${primaryEvidence.locatorText}${secondaryEvidence.locatorText === primaryEvidence.locatorText ? '' : `, ${secondaryEvidence.locatorText}`}.`,
          '',
          '## Seuraavat vaiheet',
          '- tarkista dokumentit manuaalisesti',
          '- vahvista vaatimusten käsittely',
          '- odota varsinaisen analyysipalvelun seuraavaa vaihetta',
        ].join('\n'),
        status: 'placeholder',
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [0, 1], 0.29),
      },
    ],
    reviewTasks: [
      {
        taskType: 'documents',
        title: 'Tarkista että kaikki tarjouspyynnön liitteet ovat paketissa',
        description: `Placeholder-tehtävä viittaa extracted chunkiin ${primaryEvidence.locatorText}, mutta ei vielä lue sisältöä semanttisesti.`,
        status: 'todo',
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [0], 0.27),
      },
      {
        taskType: 'requirements',
        title: 'Käy placeholder-vaatimukset läpi ennen seuraavaa vaihetta',
        description: `Tehtävä varmistaa, että result-domain näkyy työtilassa oikeisiin evidence-lähteisiin ankkuroituna (${secondaryEvidence.locatorText}).`,
        status: 'todo',
        evidenceLinks: buildEvidenceLinks(evidenceSources.length, [1], 0.27),
      },
    ],
  };
}
