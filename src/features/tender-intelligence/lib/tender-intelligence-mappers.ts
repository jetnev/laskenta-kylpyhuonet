import { buildTenderAnalysisReadiness } from './tender-analysis';
import {
  createTenderReferenceProfileInputSchema,
  tenderDraftPackageReimportStatusSchema,
  createTenderPackageInputSchema,
  tenderDraftExportPayloadSchema,
  tenderPackageDetailsSchema,
  updateTenderDraftPackageItemInputSchema,
  updateTenderReferenceProfileInputSchema,
  type CreateTenderReferenceProfileInput,
  type CreateTenderPackageInput,
  type TenderAnalysisJob,
  type TenderDocument,
  type TenderDocumentChunk,
  type TenderDocumentExtraction,
  type TenderDraftPackage,
  type TenderDraftPackageItem,
  type TenderDraftArtifact,
  type TenderGoNoGoAssessment,
  type TenderMissingItem,
  type TenderPackage,
  type TenderPackageDetails,
  type TenderPackageResults,
  type TenderReferenceProfile,
  type TenderResultEvidence,
  type TenderReferenceSuggestion,
  type TenderRequirement,
  type TenderReviewTask,
  type TenderRiskFlag,
  type UpdateTenderDraftPackageItemInput,
  type UpdateTenderReferenceProfileInput,
} from '../types/tender-intelligence';
import type { TenderDraftPackageImportRun } from '../types/tender-editor-import';
import {
  tenderEditorImportPayloadSchema,
  tenderEditorImportRunExecutionMetadataSchema,
} from '../types/tender-editor-import';
import type {
  TenderAnalysisJobRow,
  TenderDocumentChunkRow,
  TenderDocumentExtractionRow,
  TenderDocumentRow,
  TenderDraftPackageImportRunRow,
  TenderDraftPackageItemRow,
  TenderDraftPackageRow,
  TenderDraftArtifactRow,
  TenderGoNoGoAssessmentRow,
  TenderMissingItemRow,
  TenderImportOwnedBlockRow,
  TenderPackageRow,
  TenderReferenceProfileRow,
  TenderResultEvidenceRow,
  TenderReferenceSuggestionRow,
  TenderRequirementRow,
  TenderReviewTaskRow,
  TenderRiskFlagRow,
} from '../types/tender-intelligence-db';

function mapTenderWorkflowFields<
  Row extends {
    review_status: string;
    review_note: string | null;
    reviewed_by_user_id: string | null;
    reviewed_at: string | null;
    resolution_status: string;
    resolution_note: string | null;
    resolved_by_user_id: string | null;
    resolved_at: string | null;
  },
>(row: Row) {
  return {
    reviewStatus: row.review_status,
    reviewNote: row.review_note,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    resolutionStatus: row.resolution_status,
    resolutionNote: row.resolution_note,
    resolvedByUserId: row.resolved_by_user_id,
    resolvedAt: row.resolved_at,
  };
}

function mapTenderAssignableWorkflowFields<
  Row extends {
    review_status: string;
    review_note: string | null;
    reviewed_by_user_id: string | null;
    reviewed_at: string | null;
    resolution_status: string;
    resolution_note: string | null;
    resolved_by_user_id: string | null;
    resolved_at: string | null;
    assigned_to_user_id: string | null;
  },
>(row: Row) {
  return {
    ...mapTenderWorkflowFields(row),
    assignedToUserId: row.assigned_to_user_id,
  };
}

function getTenderAnalysisJobLabel(job: TenderAnalysisJobRow) {
  return job.job_type === 'placeholder_analysis' ? 'Baseline-analyysi' : 'Analyysiajo';
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
    ...mapTenderAssignableWorkflowFields(row),
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
    ...mapTenderAssignableWorkflowFields(row),
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
    ...mapTenderAssignableWorkflowFields(row),
  };
}

export function mapTenderReferenceProfileRowToDomain(row: TenderReferenceProfileRow): TenderReferenceProfile {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    clientName: row.client_name,
    projectType: row.project_type,
    description: row.description,
    location: row.location,
    completedYear: row.completed_year,
    contractValue: row.contract_value,
    tags: row.tags,
    sourceKind: row.source_kind,
    sourceReference: row.source_reference,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTenderReferenceSuggestionRowToDomain(row: TenderReferenceSuggestionRow): TenderReferenceSuggestion {
  return {
    id: row.id,
    packageId: row.tender_package_id,
    relatedRequirementId: row.related_requirement_id,
    sourceType: row.source_type,
    sourceReference: row.source_reference,
    title: row.title,
    rationale: row.rationale,
    confidence: row.confidence,
    ...mapTenderWorkflowFields(row),
  };
}

export function mapTenderDraftPackageItemRowToDomain(row: TenderDraftPackageItemRow): TenderDraftPackageItem {
  return {
    id: row.id,
    draftPackageId: row.tender_draft_package_id,
    itemType: row.item_type,
    sourceEntityType: row.source_entity_type,
    sourceEntityId: row.source_entity_id,
    title: row.title,
    contentMd: row.content_md,
    sortOrder: row.sort_order,
    isIncluded: row.is_included,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTenderDraftPackageRowToDomain(
  row: TenderDraftPackageRow,
  itemRows: TenderDraftPackageItemRow[] = [],
): TenderDraftPackage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    tenderPackageId: row.tender_package_id,
    title: row.title,
    status: row.status,
    importStatus: row.import_status,
    reimportStatus: tenderDraftPackageReimportStatusSchema.parse(row.reimport_status),
    importRevision: row.import_revision,
    lastImportPayloadHash: row.last_import_payload_hash,
    generatedFromAnalysisJobId: row.generated_from_analysis_job_id,
    generatedByUserId: row.generated_by_user_id,
    importedQuoteId: row.imported_quote_id,
    importedAt: row.imported_at,
    importedByUserId: row.imported_by_user_id,
    summary: row.summary,
    exportPayload: tenderDraftExportPayloadSchema.parse(row.payload_json),
    items: itemRows.map(mapTenderDraftPackageItemRowToDomain),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTenderDraftPackageImportRunRowToDomain(row: TenderDraftPackageImportRunRow): TenderDraftPackageImportRun {
  return {
    id: row.id,
    tender_draft_package_id: row.tender_draft_package_id,
    target_quote_id: row.target_quote_id,
    run_type: row.run_type,
    import_mode: row.import_mode,
    payload_hash: row.payload_hash,
    payload_snapshot: tenderEditorImportPayloadSchema.parse(row.payload_snapshot),
    result_status: row.result_status,
    summary: row.summary,
    execution_metadata: tenderEditorImportRunExecutionMetadataSchema.parse(row.execution_metadata ?? {}),
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
  };
}

export function mapTenderImportOwnedBlockRowToDomain(row: TenderImportOwnedBlockRow) {
  return {
    id: row.id,
    organization_id: row.organization_id,
    tender_draft_package_id: row.tender_draft_package_id,
    target_quote_id: row.target_quote_id,
    import_run_id: row.import_run_id,
    block_id: row.block_id,
    marker_key: row.marker_key,
    target_field: row.target_field,
    target_section_key: row.target_section_key,
    block_title: row.block_title,
    payload_hash: row.payload_hash,
    last_applied_content_hash: row.last_applied_content_hash,
    last_seen_quote_content_hash: row.last_seen_quote_content_hash,
    drift_status: row.drift_status,
    last_drift_checked_at: row.last_drift_checked_at,
    revision: row.revision,
    last_synced_at: row.last_synced_at,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
    ...mapTenderWorkflowFields(row),
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
    ...mapTenderWorkflowFields(row),
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

function mapTenderReferenceProfileInputToRow(input: CreateTenderReferenceProfileInput | UpdateTenderReferenceProfileInput) {
  return {
    title: input.title,
    client_name: input.clientName ?? null,
    project_type: input.projectType ?? null,
    description: input.description ?? null,
    location: input.location ?? null,
    completed_year: input.completedYear ?? null,
    contract_value: input.contractValue ?? null,
    tags: input.tags ?? null,
    source_kind: input.sourceKind,
    source_reference: input.sourceReference ?? null,
  };
}

export function mapCreateTenderReferenceProfileInputToInsert(input: CreateTenderReferenceProfileInput) {
  const parsedInput = createTenderReferenceProfileInputSchema.parse(input);
  return mapTenderReferenceProfileInputToRow(parsedInput);
}

export function mapUpdateTenderReferenceProfileInputToPatch(input: UpdateTenderReferenceProfileInput) {
  const parsedInput = updateTenderReferenceProfileInputSchema.parse(input);
  return mapTenderReferenceProfileInputToRow(parsedInput);
}

export function mapUpdateTenderDraftPackageItemInputToPatch(input: UpdateTenderDraftPackageItemInput) {
  const parsedInput = updateTenderDraftPackageItemInputSchema.parse(input);

  return {
    title: parsedInput.title,
    content_md: parsedInput.contentMd,
    sort_order: parsedInput.sortOrder,
    is_included: parsedInput.isIncluded,
  };
}