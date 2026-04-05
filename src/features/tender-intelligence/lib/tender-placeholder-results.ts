import type {
  TenderDraftArtifactStatus,
  TenderDraftArtifactType,
  TenderGoNoGoRecommendation,
  TenderMissingItemStatus,
  TenderMissingItemType,
  TenderReferenceSuggestionSourceType,
  TenderRequirementStatus,
  TenderRequirementType,
  TenderReviewTaskStatus,
  TenderReviewTaskType,
  TenderRiskFlagStatus,
  TenderRiskType,
  TenderSeverity,
} from '../types/tender-intelligence';
import type { TenderDocumentRow, TenderPackageRow } from '../types/tender-intelligence-db';

export interface PlaceholderRequirementSeed {
  sourceDocumentId: string | null;
  requirementType: TenderRequirementType;
  title: string;
  description: string | null;
  status: TenderRequirementStatus;
  confidence: number | null;
  sourceExcerpt: string | null;
}

export interface PlaceholderMissingItemSeed {
  relatedRequirementIndex: number | null;
  itemType: TenderMissingItemType;
  title: string;
  description: string | null;
  severity: TenderSeverity;
  status: TenderMissingItemStatus;
}

export interface PlaceholderRiskFlagSeed {
  riskType: TenderRiskType;
  title: string;
  description: string | null;
  severity: TenderSeverity;
  status: TenderRiskFlagStatus;
}

export interface PlaceholderReferenceSuggestionSeed {
  sourceType: TenderReferenceSuggestionSourceType;
  sourceReference: string | null;
  title: string;
  rationale: string | null;
  confidence: number | null;
}

export interface PlaceholderDraftArtifactSeed {
  artifactType: TenderDraftArtifactType;
  title: string;
  contentMd: string | null;
  status: TenderDraftArtifactStatus;
}

export interface PlaceholderReviewTaskSeed {
  taskType: TenderReviewTaskType;
  title: string;
  description: string | null;
  status: TenderReviewTaskStatus;
}

export interface PlaceholderAnalysisSeedPlan {
  goNoGoAssessment: {
    recommendation: TenderGoNoGoRecommendation;
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

function sortDocuments(documents: TenderDocumentRow[]) {
  return [...documents].sort((left, right) => left.file_name.localeCompare(right.file_name, 'fi-FI'));
}

export function buildPlaceholderAnalysisSeedPlan(input: {
  packageRow: TenderPackageRow;
  documentRows: TenderDocumentRow[];
}): PlaceholderAnalysisSeedPlan {
  const sortedDocuments = sortDocuments(input.documentRows);
  const primaryDocument = sortedDocuments[0] ?? null;
  const secondaryDocument = sortedDocuments[1] ?? primaryDocument;
  const documentReference = sortedDocuments.slice(0, 2).map((documentRow) => documentRow.file_name).join(', ') || null;
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
        sourceExcerpt: primaryDocument ? `Placeholder-ote tiedostosta "${primaryDocument.file_name}".` : null,
      },
      {
        sourceDocumentId: secondaryDocument?.id ?? null,
        requirementType: 'schedule',
        title: 'Vahvista aikataulu ja vastuurajat',
        description: 'Tämä placeholder-rivi toimii tulevan vaatimusmallin pysyvänä domain-pohjana.',
        status: 'at-risk',
        confidence: 0.37,
        sourceExcerpt: secondaryDocument ? `Placeholder-havainto tiedostosta "${secondaryDocument.file_name}".` : null,
      },
    ],
    missingItems: [
      {
        relatedRequirementIndex: 0,
        itemType: 'clarification',
        title: 'Täsmennä toimituslaajuuden rajaukset',
        description: 'Placeholder-puute muistuttaa, että oikea analyysipalvelu tulee myöhemmin tunnistamaan täsmennystarpeet dokumenttien sisällöstä.',
        severity: 'medium',
        status: 'open',
      },
      {
        relatedRequirementIndex: 1,
        itemType: 'decision',
        title: 'Varmista projektin päätöksentekijä ennen luonnoksen viimeistelyä',
        description: 'Placeholder-rivi säilyttää puutedomainin pysyvän rakenteen ilman yhteyttä nykyiseen tarjouseditoriin.',
        severity: 'low',
        status: 'open',
      },
    ],
    riskFlags: [
      {
        riskType: 'delivery',
        title: 'Aikatauluriski vaatii manuaalisen tarkistuksen',
        description: 'Placeholder-riski ei perustu tekstinpurkuun vaan testaa pysyvää riskidomainia ja näkyvää UI-esitystä.',
        severity: 'medium',
        status: 'open',
      },
      {
        riskType: 'commercial',
        title: 'Hinnoittelun rajaukset ovat vielä avoinna',
        description: 'Tämä placeholder-rivi korvautuu myöhemmin oikean analyysipalvelun tuottamalla riskihavainnolla.',
        severity: 'high',
        status: 'open',
      },
    ],
    referenceSuggestions: [
      {
        sourceType: 'manual',
        sourceReference: documentReference,
        title: 'Hyödynnä aiemmin hyväksyttyä vastausrunkoa seuraavassa vaiheessa',
        rationale: 'Placeholder-referenssiehdotus osoittaa, mihin myöhempi referenssihaku ja materiaalien uudelleenkäyttö kiinnittyvät.',
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
        description: 'Tehtävä varmistaa, että result-domain näkyy työtilassa myös ilman oikeaa analyysipalvelua.',
        status: 'todo',
      },
    ],
  };
}