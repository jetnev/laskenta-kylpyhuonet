import type {
  TenderAnalysisJobStatus,
  TenderDocumentParseStatus,
  TenderDocumentUploadStatus,
  TenderGoNoGoRecommendation,
  TenderPackageStatus,
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
  'not-started': { label: 'Ei käynnistetty', variant: 'secondary' },
  queued: { label: 'Jonossa', variant: 'outline' },
  processing: { label: 'Käsittelyssä', variant: 'outline' },
  completed: { label: 'Valmis', variant: 'default' },
  failed: { label: 'Virhe', variant: 'destructive' },
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

export function formatCountLabel(count: number, singular: string, plural = singular) {
  const normalizedPlural = plural === singular ? `${plural}a` : plural;
  return `${count} ${count === 1 ? singular : normalizedPlural}`;
}