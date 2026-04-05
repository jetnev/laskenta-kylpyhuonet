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
}

export interface PlaceholderMissingItemSeed {
  relatedRequirementIndex: number | null;
  itemType: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
}

export interface PlaceholderRiskFlagSeed {
  riskType: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
}

export interface PlaceholderReferenceSuggestionSeed {
  sourceType: string;
  sourceReference: string | null;
  title: string;
  rationale: string | null;
  confidence: number | null;
}

export interface PlaceholderDraftArtifactSeed {
  artifactType: string;
  title: string;
  contentMd: string | null;
  status: string;
}

export interface PlaceholderReviewTaskSeed {
  taskType: string;
  title: string;
  description: string | null;
  status: string;
}

export interface PlaceholderAnalysisSeedPlan {
  goNoGoAssessment: {
    recommendation: string;
    summary: string;
    confidence: number | null;
  };
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

function sortDocuments(documents: DocumentRowSlice[]) {
  return [...documents].sort((a, b) =>
    a.file_name.localeCompare(b.file_name, 'fi-FI'),
  );
}

export function buildPlaceholderAnalysisSeedPlan(input: {
  packageRow: PackageRowSlice;
  documentRows: DocumentRowSlice[];
}): PlaceholderAnalysisSeedPlan {
  const sortedDocuments = sortDocuments(input.documentRows);
  const primaryDocument = sortedDocuments[0] ?? null;
  const secondaryDocument = sortedDocuments[1] ?? primaryDocument;
  const documentReference =
    sortedDocuments
      .slice(0, 2)
      .map((d) => d.file_name)
      .join(', ') || null;
  const packageTitle = input.packageRow.title.trim();

  return {
    goNoGoAssessment: {
      recommendation: 'pending',
      summary: `Placeholder-analyysi tallensi paketin "${packageTitle}" tulosdomainiin esimerkkirakenteen. Varsinainen päätöstuki lisätään myöhemmässä vaiheessa.`,
      confidence: 0.24,
    },
    requirements: [
      {
        sourceDocumentId: primaryDocument?.id ?? null,
        requirementType: 'technical',
        title: 'Vahvista tekninen toimituslaajuus',
        description: `Placeholder-vaatimus on luotu paketille "${packageTitle}" ilman dokumenttien sisällön analysointia.`,
        status: 'unreviewed',
        confidence: 0.42,
        sourceExcerpt: primaryDocument
          ? `Placeholder-ote tiedostosta "${primaryDocument.file_name}".`
          : null,
      },
      {
        sourceDocumentId: secondaryDocument?.id ?? null,
        requirementType: 'schedule',
        title: 'Vahvista aikataulu ja vastuurajat',
        description:
          'Tämä placeholder-rivi toimii tulevan vaatimusmallin pysyvänä domain-pohjana.',
        status: 'at-risk',
        confidence: 0.37,
        sourceExcerpt: secondaryDocument
          ? `Placeholder-havainto tiedostosta "${secondaryDocument.file_name}".`
          : null,
      },
    ],
    missingItems: [
      {
        relatedRequirementIndex: 0,
        itemType: 'clarification',
        title: 'Täsmennä toimituslaajuuden rajaukset',
        description:
          'Placeholder-puute muistuttaa, että oikea analyysipalvelu tulee myöhemmin tunnistamaan täsmennystarpeet dokumenttien sisällöstä.',
        severity: 'medium',
        status: 'open',
      },
      {
        relatedRequirementIndex: 1,
        itemType: 'decision',
        title: 'Varmista projektin päätöksentekijä ennen luonnoksen viimeistelyä',
        description:
          'Placeholder-rivi säilyttää puutedomainin pysyvän rakenteen ilman yhteyttä nykyiseen tarjouseditoriin.',
        severity: 'low',
        status: 'open',
      },
    ],
    riskFlags: [
      {
        riskType: 'delivery',
        title: 'Aikatauluriski vaatii manuaalisen tarkistuksen',
        description:
          'Placeholder-riski ei perustu tekstinpurkuun vaan testaa pysyvää riskidomainia ja näkyvää UI-esitystä.',
        severity: 'medium',
        status: 'open',
      },
      {
        riskType: 'commercial',
        title: 'Hinnoittelun rajaukset ovat vielä avoinna',
        description:
          'Tämä placeholder-rivi korvautuu myöhemmin oikean analyysipalvelun tuottamalla riskihavainnolla.',
        severity: 'high',
        status: 'open',
      },
    ],
    referenceSuggestions: [
      {
        sourceType: 'manual',
        sourceReference: documentReference,
        title: 'Hyödynnä aiemmin hyväksyttyä vastausrunkoa seuraavassa vaiheessa',
        rationale:
          'Placeholder-referenssiehdotus osoittaa, mihin myöhempi referenssihaku ja materiaalien uudelleenkäyttö kiinnittyvät.',
        confidence: 0.31,
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
          'Tämä sisältö on deterministinen placeholder eikä perustu dokumenttien tekstin analysointiin.',
          '',
          '## Seuraavat vaiheet',
          '- tarkista dokumentit manuaalisesti',
          '- vahvista vaatimusten käsittely',
          '- odota varsinaisen analyysipalvelun seuraavaa vaihetta',
        ].join('\n'),
        status: 'placeholder',
      },
    ],
    reviewTasks: [
      {
        taskType: 'documents',
        title: 'Tarkista että kaikki tarjouspyynnön liitteet ovat paketissa',
        description: primaryDocument
          ? `Placeholder-tehtävä viittaa dokumenttiin "${primaryDocument.file_name}", mutta ei lue sen sisältöä.`
          : 'Placeholder-tehtävä avaa dokumenttikatselmoinnin rungon tulevia vaiheita varten.',
        status: 'todo',
      },
      {
        taskType: 'requirements',
        title: 'Käy placeholder-vaatimukset läpi ennen seuraavaa vaihetta',
        description:
          'Tehtävä varmistaa, että result-domain näkyy työtilassa myös ilman oikeaa analyysipalvelua.',
        status: 'todo',
      },
    ],
  };
}
