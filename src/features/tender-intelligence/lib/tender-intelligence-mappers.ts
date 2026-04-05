import {
  createTenderPackageInputSchema,
  tenderPackageDetailsSchema,
  type CreateTenderPackageInput,
  type TenderAnalysisJob,
  type TenderDocument,
  type TenderDraftArtifact,
  type TenderGoNoGoAssessment,
  type TenderPackage,
  type TenderPackageDetails,
  type TenderPackageResults,
  type TenderReviewTask,
} from '../types/tender-intelligence';
import type {
  TenderAnalysisJobRow,
  TenderDocumentRow,
  TenderGoNoGoAssessmentRow,
  TenderPackageRow,
} from '../types/tender-intelligence-db';

function buildPlaceholderDraftArtifact(packageId: string, anchorTimestamp: string): TenderDraftArtifact {
  return {
    id: `${packageId}-draft-placeholder`,
    packageId,
    title: 'Tarjousluonnoksen runko',
    kind: 'quote-outline',
    status: 'placeholder',
    summary: 'Tarjousluonnoksen generointi lisätään myöhemmässä vaiheessa oman analyysi- ja hyväksyntäputken päälle.',
    createdAt: anchorTimestamp,
    updatedAt: anchorTimestamp,
  };
}

function buildPlaceholderReviewTask(packageId: string, anchorTimestamp: string, assigneeUserId?: string | null): TenderReviewTask {
  return {
    id: `${packageId}-review-documents`,
    packageId,
    title: 'Käynnistä placeholder-analyysi, tarkista jobin tila ja valmistele paketti seuraavaa vaihetta varten',
    status: 'todo',
    category: 'documents',
    assigneeUserId: assigneeUserId || null,
    createdAt: anchorTimestamp,
    updatedAt: anchorTimestamp,
  };
}

function getTenderAnalysisJobLabel(job: TenderAnalysisJobRow) {
  return job.job_type === 'placeholder_analysis' ? 'Placeholder-analyysi' : 'Analyysiajo';
}

function getTenderAnalysisStageLabel(job: TenderAnalysisJobRow) {
  const jobLabel = getTenderAnalysisJobLabel(job);

  if (job.status === 'failed') {
    return job.error_message?.trim() || `${jobLabel} epäonnistui.`;
  }

  if (job.status === 'completed') {
    return `${jobLabel} valmistui`;
  }

  if (job.status === 'running') {
    return `${jobLabel} on käynnissä`;
  }

  if (job.status === 'queued') {
    return `${jobLabel} odottaa suoritusvuoroa`;
  }

  return `${jobLabel} valmistellaan käynnistettäväksi`;
}

export function mapTenderGoNoGoAssessmentRowToDomain(row: TenderGoNoGoAssessmentRow): TenderGoNoGoAssessment {
  return {
    packageId: row.tender_package_id,
    recommendation: row.recommendation,
    summary: row.summary,
    confidence: row.confidence,
    updatedAt: row.updated_at,
  };
}

export function mapTenderAnalysisJobRowToDomain(row: TenderAnalysisJobRow): TenderAnalysisJob {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    jobType: row.job_type,
    status: row.status,
    stageLabel: getTenderAnalysisStageLabel(row),
    provider: row.provider,
    model: row.model,
    requestedAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
  };
}

export function mapTenderDocumentRowToDomain(row: TenderDocumentRow): TenderDocument {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    kind: 'other',
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileSizeBytes: row.file_size_bytes,
    checksum: row.checksum,
    uploadError: row.upload_error,
    uploadState: row.upload_status,
    parseStatus: row.parse_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildTenderPackageSummary(options: { documentCount: number; reviewTaskCount?: number }) {
  return {
    documentCount: options.documentCount,
    requirementCount: 0,
    missingItemCount: 0,
    riskCount: 0,
    reviewTaskCount: options.reviewTaskCount ?? 1,
  };
}

export function mapTenderPackageRowToDomain(
  row: TenderPackageRow,
  options: {
    documentCount?: number;
    reviewTaskCount?: number;
    currentJobId?: string | null;
  } = {}
): TenderPackage {
  return {
    id: row.id,
    name: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    linkedCustomerId: row.linked_customer_id,
    linkedProjectId: row.linked_project_id,
    linkedQuoteId: row.linked_quote_id,
    currentJobId: options.currentJobId ?? null,
    summary: buildTenderPackageSummary({
      documentCount: options.documentCount ?? 0,
      reviewTaskCount: options.reviewTaskCount ?? 1,
    }),
  };
}

export function buildTenderPackageResults(options: {
  packageId: string;
  createdByUserId?: string | null;
  anchorTimestamp: string;
  goNoGoAssessment: TenderGoNoGoAssessment | null;
}): TenderPackageResults {
  return {
    requirements: [],
    missingItems: [],
    riskFlags: [],
    goNoGoAssessment: options.goNoGoAssessment,
    referenceSuggestions: [],
    draftArtifacts: [buildPlaceholderDraftArtifact(options.packageId, options.anchorTimestamp)],
    reviewTasks: [buildPlaceholderReviewTask(options.packageId, options.anchorTimestamp, options.createdByUserId)],
  };
}

export function buildTenderPackageDetails(input: {
  packageRow: TenderPackageRow;
  documentRows: TenderDocumentRow[];
  analysisJobRows: TenderAnalysisJobRow[];
  goNoGoAssessmentRow: TenderGoNoGoAssessmentRow | null;
}): TenderPackageDetails {
  const sortedJobRows = [...input.analysisJobRows].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
  const analysisJobs = sortedJobRows.map(mapTenderAnalysisJobRowToDomain);
  const latestAnalysisJob = analysisJobs[0] ?? null;
  const goNoGoAssessment = input.goNoGoAssessmentRow ? mapTenderGoNoGoAssessmentRowToDomain(input.goNoGoAssessmentRow) : null;
  const results = buildTenderPackageResults({
    packageId: input.packageRow.id,
    createdByUserId: input.packageRow.created_by_user_id,
    anchorTimestamp: input.goNoGoAssessmentRow?.updated_at || sortedJobRows[0]?.updated_at || input.packageRow.updated_at,
    goNoGoAssessment,
  });

  return tenderPackageDetailsSchema.parse({
    package: mapTenderPackageRowToDomain(input.packageRow, {
      documentCount: input.documentRows.length,
      reviewTaskCount: results.reviewTasks.length,
      currentJobId: latestAnalysisJob?.id ?? null,
    }),
    documents: input.documentRows.map(mapTenderDocumentRowToDomain),
    analysisJobs,
    latestAnalysisJob,
    results,
  });
}

export function mapCreateTenderPackageInputToInsert(input: CreateTenderPackageInput) {
  const parsedInput = createTenderPackageInputSchema.parse(input);

  return {
    title: parsedInput.name,
    description: parsedInput.description ?? null,
    status: 'draft' as const,
    linked_customer_id: parsedInput.linkedCustomerId ?? null,
    linked_project_id: parsedInput.linkedProjectId ?? null,
    linked_quote_id: parsedInput.linkedQuoteId ?? null,
  };
}