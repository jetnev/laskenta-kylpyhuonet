import { buildTenderAnalysisReadiness } from './tender-analysis';
import {
  createTenderPackageInputSchema,
  tenderPackageDetailsSchema,
  type CreateTenderPackageInput,
  type TenderAnalysisJob,
  type TenderDocument,
  type TenderDocumentChunk,
  type TenderDocumentExtraction,
  type TenderDraftArtifact,
  type TenderGoNoGoAssessment,
  type TenderMissingItem,
  type TenderPackage,
  type TenderPackageDetails,
  type TenderPackageResults,
  type TenderResultEvidence,
  type TenderReferenceSuggestion,
  type TenderRequirement,
  type TenderReviewTask,
  type TenderRiskFlag,
} from '../types/tender-intelligence';
import type {
  TenderAnalysisJobRow,
  TenderDocumentChunkRow,
  TenderDocumentExtractionRow,
  TenderDocumentRow,
  TenderDraftArtifactRow,
  TenderGoNoGoAssessmentRow,
  TenderMissingItemRow,
  TenderPackageRow,
  TenderResultEvidenceRow,
  TenderReferenceSuggestionRow,
  TenderRequirementRow,
  TenderReviewTaskRow,
  TenderRiskFlagRow,
} from '../types/tender-intelligence-db';

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

export function mapTenderDocumentExtractionRowToDomain(row: TenderDocumentExtractionRow): TenderDocumentExtraction {
  return {
    id: row.id,
    documentId: row.tender_document_id,
    packageId: row.tender_package_id,
    extractionStatus: row.extraction_status,
    extractorType: row.extractor_type,
    sourceMimeType: row.source_mime_type,
    characterCount: row.character_count,
    chunkCount: row.chunk_count,
    extractedText: row.extracted_text,
    errorMessage: row.error_message,
    extractedAt: row.extracted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTenderDocumentChunkRowToDomain(row: TenderDocumentChunkRow): TenderDocumentChunk {
  return {
    id: row.id,
    documentId: row.tender_document_id,
    packageId: row.tender_package_id,
    extractionId: row.extraction_id,
    chunkIndex: row.chunk_index,
    textContent: row.text_content,
    characterCount: row.character_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTenderResultEvidenceRowToDomain(row: TenderResultEvidenceRow): TenderResultEvidence {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    sourceDocumentId: row.source_document_id,
    extractionId: row.extraction_id,
    chunkId: row.chunk_id,
    targetEntityType: row.target_entity_type,
    targetEntityId: row.target_entity_id,
    excerptText: row.excerpt_text,
    locatorText: row.locator_text,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTenderRequirementRowToDomain(row: TenderRequirementRow): TenderRequirement {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    sourceDocumentId: row.source_document_id,
    requirementType: row.requirement_type,
    title: row.title,
    description: row.description,
    status: row.status,
    confidence: row.confidence,
    sourceExcerpt: row.source_excerpt,
  };
}

export function mapTenderMissingItemRowToDomain(row: TenderMissingItemRow): TenderMissingItem {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    relatedRequirementId: row.related_requirement_id,
    itemType: row.item_type,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
  };
}

export function mapTenderRiskFlagRowToDomain(row: TenderRiskFlagRow): TenderRiskFlag {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    riskType: row.risk_type,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
  };
}

export function mapTenderReferenceSuggestionRowToDomain(row: TenderReferenceSuggestionRow): TenderReferenceSuggestion {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    sourceType: row.source_type,
    sourceReference: row.source_reference,
    title: row.title,
    rationale: row.rationale,
    confidence: row.confidence,
  };
}

export function mapTenderDraftArtifactRowToDomain(row: TenderDraftArtifactRow): TenderDraftArtifact {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    artifactType: row.artifact_type,
    title: row.title,
    contentMd: row.content_md,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTenderReviewTaskRowToDomain(row: TenderReviewTaskRow): TenderReviewTask {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    taskType: row.task_type,
    title: row.title,
    description: row.description,
    status: row.status,
    assignedToUserId: row.assigned_to_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export function buildTenderPackageSummary(options: {
  documentCount: number;
  requirementCount?: number;
  missingItemCount?: number;
  riskCount?: number;
  reviewTaskCount?: number;
}) {
  return {
    documentCount: options.documentCount,
    requirementCount: options.requirementCount ?? 0,
    missingItemCount: options.missingItemCount ?? 0,
    riskCount: options.riskCount ?? 0,
    reviewTaskCount: options.reviewTaskCount ?? 0,
  };
}

export function mapTenderPackageRowToDomain(
  row: TenderPackageRow,
  options: {
    documentCount?: number;
    requirementCount?: number;
    missingItemCount?: number;
    riskCount?: number;
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
      requirementCount: options.requirementCount ?? 0,
      missingItemCount: options.missingItemCount ?? 0,
      riskCount: options.riskCount ?? 0,
      reviewTaskCount: options.reviewTaskCount ?? 0,
    }),
  };
}

export function mapTenderPackageResultsRowsToDomain(input: {
  requirementRows: TenderRequirementRow[];
  missingItemRows: TenderMissingItemRow[];
  riskFlagRows: TenderRiskFlagRow[];
  referenceSuggestionRows: TenderReferenceSuggestionRow[];
  draftArtifactRows: TenderDraftArtifactRow[];
  reviewTaskRows: TenderReviewTaskRow[];
  goNoGoAssessmentRow: TenderGoNoGoAssessmentRow | null;
}): TenderPackageResults {
  return {
    requirements: input.requirementRows.map(mapTenderRequirementRowToDomain),
    missingItems: input.missingItemRows.map(mapTenderMissingItemRowToDomain),
    riskFlags: input.riskFlagRows.map(mapTenderRiskFlagRowToDomain),
    goNoGoAssessment: input.goNoGoAssessmentRow ? mapTenderGoNoGoAssessmentRowToDomain(input.goNoGoAssessmentRow) : null,
    referenceSuggestions: input.referenceSuggestionRows.map(mapTenderReferenceSuggestionRowToDomain),
    draftArtifacts: input.draftArtifactRows.map(mapTenderDraftArtifactRowToDomain),
    reviewTasks: input.reviewTaskRows.map(mapTenderReviewTaskRowToDomain),
  };
}

export function buildTenderPackageDetails(input: {
  packageRow: TenderPackageRow;
  documentRows: TenderDocumentRow[];
  documentExtractionRows: TenderDocumentExtractionRow[];
  resultEvidenceRows: TenderResultEvidenceRow[];
  analysisJobRows: TenderAnalysisJobRow[];
  requirementRows: TenderRequirementRow[];
  missingItemRows: TenderMissingItemRow[];
  riskFlagRows: TenderRiskFlagRow[];
  referenceSuggestionRows: TenderReferenceSuggestionRow[];
  draftArtifactRows: TenderDraftArtifactRow[];
  reviewTaskRows: TenderReviewTaskRow[];
  goNoGoAssessmentRow: TenderGoNoGoAssessmentRow | null;
}): TenderPackageDetails {
  const sortedJobRows = [...input.analysisJobRows].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
  const documents = input.documentRows.map(mapTenderDocumentRowToDomain);
  const documentExtractions = input.documentExtractionRows.map(mapTenderDocumentExtractionRowToDomain);
  const analysisJobs = sortedJobRows.map(mapTenderAnalysisJobRowToDomain);
  const latestAnalysisJob = analysisJobs[0] ?? null;
  const resultEvidence = input.resultEvidenceRows.map(mapTenderResultEvidenceRowToDomain);
  const analysisReadiness = buildTenderAnalysisReadiness({
    documents,
    documentExtractions,
    latestAnalysisJob,
  });
  const results = mapTenderPackageResultsRowsToDomain({
    requirementRows: input.requirementRows,
    missingItemRows: input.missingItemRows,
    riskFlagRows: input.riskFlagRows,
    referenceSuggestionRows: input.referenceSuggestionRows,
    draftArtifactRows: input.draftArtifactRows,
    reviewTaskRows: input.reviewTaskRows,
    goNoGoAssessmentRow: input.goNoGoAssessmentRow,
  });

  return tenderPackageDetailsSchema.parse({
    package: mapTenderPackageRowToDomain(input.packageRow, {
      documentCount: input.documentRows.length,
      requirementCount: results.requirements.length,
      missingItemCount: results.missingItems.length,
      riskCount: results.riskFlags.length,
      reviewTaskCount: results.reviewTasks.length,
      currentJobId: latestAnalysisJob?.id ?? null,
    }),
    documents,
    documentExtractions,
    resultEvidence,
    analysisJobs,
    latestAnalysisJob,
    analysisReadiness,
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