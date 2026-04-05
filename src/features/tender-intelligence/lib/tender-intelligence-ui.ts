import type {
  TenderAnalysisJobType,
  TenderAnalysisJobStatus,
  TenderDocumentExtractionStatus,
  TenderDocumentExtractorType,
  TenderDraftPackageItemType,
  TenderDraftPackageStatus,
  TenderDraftArtifactStatus,
  TenderDraftArtifactType,
  TenderDocumentParseStatus,
  TenderDocumentUploadStatus,
  TenderGoNoGoRecommendation,
  TenderMissingItemStatus,
  TenderMissingItemType,
  TenderPackageStatus,
  TenderReferenceProfileSourceKind,
  TenderReferenceSuggestionSourceType,
  TenderResolutionStatus,
  TenderReviewStatus,
  TenderRequirementStatus,
  TenderRequirementType,
  TenderReviewTaskType,
  TenderRiskFlagStatus,
  TenderRiskType,
  TenderReviewTaskStatus,
  TenderSeverity,
} from '../types/tender-intelligence';

export type TenderBadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

export const TENDER_PACKAGE_STATUS_META: Record<TenderPackageStatus, { label: string; variant: TenderBadgeVariant }> = {
  draft: { label: 'Luonnos', variant: 'secondary' },
  'ready-for-analysis': { label: 'Valmis analyysiin', variant: 'outline' },
  'analysis-pending': { label: 'Analyysi jonossa', variant: 'outline' },
  'review-needed': { label: 'Vaatii katselmoinnin', variant: 'default' },
  completed: { label: 'Valmis', variant: 'default' },
};

export const TENDER_ANALYSIS_JOB_STATUS_META: Record<
  TenderAnalysisJobStatus,
  { label: string; variant: TenderBadgeVariant }
> = {
  pending: { label: 'Valmistellaan', variant: 'secondary' },
  queued: { label: 'Jonossa', variant: 'outline' },
  running: { label: 'Käynnissä', variant: 'outline' },
  completed: { label: 'Valmis', variant: 'default' },
  failed: { label: 'Epäonnistui', variant: 'destructive' },
};

export const TENDER_ANALYSIS_JOB_TYPE_META: Record<
  TenderAnalysisJobType,
  { label: string; variant: TenderBadgeVariant }
> = {
  'document-analysis': { label: 'Dokumenttianalyysi', variant: 'outline' },
  'go-no-go': { label: 'Go / No-Go', variant: 'outline' },
  'reference-scan': { label: 'Referenssihaku', variant: 'outline' },
  'draft-preparation': { label: 'Luonnoksen valmistelu', variant: 'outline' },
  placeholder_analysis: { label: 'Baseline-analyysi', variant: 'secondary' },
};

export const TENDER_REQUIREMENT_TYPE_META: Record<TenderRequirementType, { label: string; variant: TenderBadgeVariant }> = {
  administrative: { label: 'Hallinnollinen', variant: 'secondary' },
  commercial: { label: 'Kaupallinen', variant: 'outline' },
  technical: { label: 'Tekninen', variant: 'outline' },
  schedule: { label: 'Aikataulu', variant: 'outline' },
  legal: { label: 'Sopimus', variant: 'outline' },
  other: { label: 'Muu', variant: 'secondary' },
};

export const TENDER_REQUIREMENT_STATUS_META: Record<TenderRequirementStatus, { label: string; variant: TenderBadgeVariant }> = {
  unreviewed: { label: 'Tarkistamatta', variant: 'secondary' },
  covered: { label: 'Katettu', variant: 'default' },
  missing: { label: 'Puuttuu', variant: 'destructive' },
  'at-risk': { label: 'Riskissä', variant: 'outline' },
};

export const TENDER_REVIEW_STATUS_META: Record<TenderReviewStatus, { label: string; variant: TenderBadgeVariant }> = {
  unreviewed: { label: 'Tarkistamatta', variant: 'secondary' },
  accepted: { label: 'Hyväksytty', variant: 'default' },
  dismissed: { label: 'Hylätty', variant: 'outline' },
  needs_attention: { label: 'Vaatii huomiota', variant: 'destructive' },
};

export const TENDER_RESOLUTION_STATUS_META: Record<TenderResolutionStatus, { label: string; variant: TenderBadgeVariant }> = {
  open: { label: 'Avoin', variant: 'destructive' },
  in_progress: { label: 'Työn alla', variant: 'outline' },
  resolved: { label: 'Ratkaistu', variant: 'default' },
  wont_fix: { label: 'Ei toteuteta', variant: 'secondary' },
};

export const TENDER_MISSING_ITEM_TYPE_META: Record<TenderMissingItemType, { label: string; variant: TenderBadgeVariant }> = {
  clarification: { label: 'Tarkennus', variant: 'outline' },
  document: { label: 'Dokumentti', variant: 'outline' },
  pricing: { label: 'Hinnoittelu', variant: 'outline' },
  resourcing: { label: 'Resursointi', variant: 'outline' },
  decision: { label: 'Päätös', variant: 'outline' },
  other: { label: 'Muu', variant: 'secondary' },
};

export const TENDER_MISSING_ITEM_STATUS_META: Record<TenderMissingItemStatus, { label: string; variant: TenderBadgeVariant }> = {
  open: { label: 'Avoin', variant: 'destructive' },
  resolved: { label: 'Ratkaistu', variant: 'default' },
};

export const TENDER_RISK_TYPE_META: Record<TenderRiskType, { label: string; variant: TenderBadgeVariant }> = {
  commercial: { label: 'Kaupallinen', variant: 'outline' },
  delivery: { label: 'Toimitus', variant: 'outline' },
  technical: { label: 'Tekninen', variant: 'outline' },
  legal: { label: 'Sopimus', variant: 'outline' },
  resourcing: { label: 'Resursointi', variant: 'outline' },
  other: { label: 'Muu', variant: 'secondary' },
};

export const TENDER_RISK_FLAG_STATUS_META: Record<TenderRiskFlagStatus, { label: string; variant: TenderBadgeVariant }> = {
  open: { label: 'Avoin', variant: 'destructive' },
  accepted: { label: 'Hyväksytty', variant: 'outline' },
  mitigated: { label: 'Mitigoitu', variant: 'default' },
};

export const TENDER_REFERENCE_SOURCE_META: Record<TenderReferenceSuggestionSourceType, { label: string; variant: TenderBadgeVariant }> = {
  quote: { label: 'Tarjous', variant: 'outline' },
  project: { label: 'Projekti', variant: 'outline' },
  'document-template': { label: 'Dokumenttipohja', variant: 'outline' },
  manual: { label: 'Manuaalinen', variant: 'secondary' },
  organization_reference_profile: { label: 'Referenssikorpus', variant: 'default' },
};

export const TENDER_REFERENCE_PROFILE_SOURCE_KIND_META: Record<
  TenderReferenceProfileSourceKind,
  { label: string; variant: TenderBadgeVariant }
> = {
  manual: { label: 'Manuaalinen', variant: 'default' },
  imported: { label: 'Tuotu', variant: 'outline' },
  other: { label: 'Muu lähde', variant: 'secondary' },
};

export const TENDER_DRAFT_PACKAGE_STATUS_META: Record<TenderDraftPackageStatus, { label: string; variant: TenderBadgeVariant }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  reviewed: { label: 'Tarkistettu', variant: 'outline' },
  exported: { label: 'Merkitty viedyksi', variant: 'default' },
  archived: { label: 'Arkistoitu', variant: 'secondary' },
};

export const TENDER_DRAFT_PACKAGE_ITEM_TYPE_META: Record<TenderDraftPackageItemType, { label: string; variant: TenderBadgeVariant }> = {
  accepted_requirement: { label: 'Hyväksytty vaatimus', variant: 'default' },
  selected_reference: { label: 'Valittu referenssi', variant: 'outline' },
  resolved_missing_item: { label: 'Ratkaistu puute', variant: 'secondary' },
  review_note: { label: 'Editor-note', variant: 'outline' },
  draft_artifact: { label: 'Draft artefakti', variant: 'secondary' },
};

export const TENDER_DRAFT_ARTIFACT_TYPE_META: Record<TenderDraftArtifactType, { label: string; variant: TenderBadgeVariant }> = {
  'quote-outline': { label: 'Tarjousrunko', variant: 'outline' },
  'response-summary': { label: 'Vastausyhteenveto', variant: 'outline' },
  'clarification-list': { label: 'Tarkennuslista', variant: 'outline' },
};

export const TENDER_DRAFT_ARTIFACT_STATUS_META: Record<TenderDraftArtifactStatus, { label: string; variant: TenderBadgeVariant }> = {
  placeholder: { label: 'Placeholder', variant: 'secondary' },
  'ready-for-review': { label: 'Valmis tarkistukseen', variant: 'outline' },
  accepted: { label: 'Hyväksytty', variant: 'default' },
};

export const TENDER_REVIEW_TASK_TYPE_META: Record<TenderReviewTaskType, { label: string; variant: TenderBadgeVariant }> = {
  documents: { label: 'Dokumentit', variant: 'outline' },
  requirements: { label: 'Vaatimukset', variant: 'outline' },
  risk: { label: 'Riskit', variant: 'outline' },
  decision: { label: 'Päätös', variant: 'outline' },
  draft: { label: 'Luonnos', variant: 'outline' },
};

export const TENDER_DOCUMENT_UPLOAD_STATUS_META: Record<
  TenderDocumentUploadStatus,
  { label: string; variant: TenderBadgeVariant }
> = {
  placeholder: { label: 'Placeholder', variant: 'secondary' },
  pending: { label: 'Ladataan', variant: 'outline' },
  uploaded: { label: 'Tallennettu', variant: 'default' },
  failed: { label: 'Virhe', variant: 'destructive' },
};

export const TENDER_DOCUMENT_PARSE_STATUS_META: Record<
  TenderDocumentParseStatus,
  { label: string; variant: TenderBadgeVariant }
> = {
  'not-started': { label: 'Ei aloitettu', variant: 'secondary' },
  queued: { label: 'Jonossa', variant: 'outline' },
  processing: { label: 'Käsittelyssä', variant: 'outline' },
  completed: { label: 'Valmis', variant: 'default' },
  failed: { label: 'Virhe', variant: 'destructive' },
};

export const TENDER_DOCUMENT_EXTRACTION_STATUS_META: Record<
  TenderDocumentExtractionStatus,
  { label: string; variant: TenderBadgeVariant }
> = {
  not_started: { label: 'Ei aloitettu', variant: 'secondary' },
  pending: { label: 'Jonossa', variant: 'outline' },
  extracting: { label: 'Extracting', variant: 'outline' },
  extracted: { label: 'Purettu', variant: 'default' },
  failed: { label: 'Epäonnistui', variant: 'destructive' },
  unsupported: { label: 'Ei tuettu', variant: 'secondary' },
};

export const TENDER_DOCUMENT_EXTRACTOR_TYPE_META: Record<
  TenderDocumentExtractorType,
  { label: string; variant: TenderBadgeVariant }
> = {
  none: { label: 'Ei extractor-mallia', variant: 'secondary' },
  plain_text: { label: 'Teksti', variant: 'outline' },
  markdown: { label: 'Markdown', variant: 'outline' },
  csv: { label: 'CSV', variant: 'outline' },
  xlsx: { label: 'XLSX', variant: 'outline' },
  unsupported: { label: 'Ei tuettu', variant: 'secondary' },
};

export const TENDER_GO_NO_GO_META: Record<
  TenderGoNoGoRecommendation,
  { label: string; variant: TenderBadgeVariant }
> = {
  pending: { label: 'Odottaa analyysiä', variant: 'secondary' },
  go: { label: 'Go', variant: 'default' },
  'conditional-go': { label: 'Ehdollinen go', variant: 'outline' },
  'no-go': { label: 'No-Go', variant: 'destructive' },
};

export const TENDER_REVIEW_TASK_STATUS_META: Record<
  TenderReviewTaskStatus,
  { label: string; variant: TenderBadgeVariant }
> = {
  todo: { label: 'Avoin', variant: 'secondary' },
  'in-review': { label: 'Työn alla', variant: 'outline' },
  done: { label: 'Valmis', variant: 'default' },
};

export const TENDER_SEVERITY_META: Record<TenderSeverity, { label: string; variant: TenderBadgeVariant }> = {
  high: { label: 'Korkea', variant: 'destructive' },
  medium: { label: 'Keskitaso', variant: 'outline' },
  low: { label: 'Matala', variant: 'secondary' },
};

export function formatTenderTimestamp(value: string) {
  return new Intl.DateTimeFormat('fi-FI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatTenderConfidence(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 'Ei arviota';
  }

  return `${Math.round(value * 100)} %`;
}

export function formatTenderCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 'Ei arvoa';
  }

  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getTenderTextPreview(value: string | null | undefined, maxLength = 160) {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  const suffix = '...';

  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - suffix.length)).trimEnd()}${suffix}`;
}

export function formatCountLabel(count: number, singular: string, plural = singular) {
  const normalizedPlural = plural === singular ? `${plural}a` : plural;
  return `${count} ${count === 1 ? singular : normalizedPlural}`;
}