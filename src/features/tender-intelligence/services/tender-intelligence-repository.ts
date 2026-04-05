import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseConfigError, isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

import type { TenderIntelligenceBackendAdapter } from './tender-intelligence-backend-adapter';
import { buildTenderAnalysisReadiness, buildTenderExtractionCoverage } from '../lib/tender-analysis';
import {
  buildTenderDraftExportPayload,
  buildTenderDraftPackageFromReviewedResults,
  buildTenderDraftSummary,
} from '../lib/tender-draft-package';
import { buildTenderEditorImportPreview } from '../lib/tender-editor-import';
import {
  buildTenderDraftPackageImportState,
  buildTenderEditorReconciliationPreview,
} from '../lib/tender-editor-reconciliation';
import { buildTenderDraftPackageImportDiagnostics } from '../lib/tender-import-diagnostics';
import { buildTenderImportOwnedBlockDriftStates } from '../lib/tender-import-drift';
import {
  buildTenderImportRegistryDiagnosticsRefreshExecutionMetadata,
  buildTenderImportRegistryDiagnosticsRefreshRecords,
  buildTenderImportRegistryRepairPlan,
  buildTenderImportRegistryRepairPreview,
} from '../lib/tender-import-registry-repair';
import {
  importTenderDraftPackageToEditor,
  readTenderEditorImportTargetSnapshot,
  resolveTenderEditorImportTarget,
} from './tender-editor-import-adapter';
import {
  type CreateTenderPackageInput,
  type TenderDraftPackageImportStatus,
  type TenderDraftPackage,
  type TenderDraftPackageReimportStatus,
  type CreateTenderReferenceProfileInput,
  type TenderAnalysisJobStatus,
  type TenderAnalysisJobType,
  type TenderAnalysisReadiness,
  type TenderExtractionCoverage,
  type TenderReferenceProfile,
  type TenderResultEvidence,
  type TenderResultEvidenceTargetType,
  type UpdateTenderDraftPackageItemInput,
  type UpdateTenderReferenceProfileInput,
  type UpdateTenderWorkflowInput,
} from '../types/tender-intelligence';
import type {
  TenderDraftPackageImportDiagnostics,
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportRunExecutionMetadata,
  TenderEditorImportPreview,
  TenderEditorImportResult,
  TenderImportRegistryRepairAction,
  TenderImportRegistryRepairPreview,
  TenderImportRegistryRepairResult,
  TenderImportRunType,
  TenderEditorSelectiveReimportSelection,
  TenderEditorReconciliationPreview,
  TenderImportOwnedBlock,
  TenderEditorImportValidationResult,
} from '../types/tender-editor-import';
import { tenderEditorImportRunExecutionMetadataSchema } from '../types/tender-editor-import';
import {
  buildTenderImportOwnedBlockWriteRecords,
  resolveTenderEditorSelectiveReimportSelection,
} from '../lib/tender-import-ownership-registry';
import { buildTenderWorkflowMetadataUpdate, syncTenderReviewTaskStatus } from '../lib/tender-review-workflow';
import { buildTenderReferenceMatches } from '../lib/tender-reference-matching';
import {
  buildTenderDocumentStoragePath,
  TENDER_INTELLIGENCE_STORAGE_BUCKET,
  validateTenderDocumentFile,
} from '../lib/tender-document-upload';
import {
  buildPlaceholderAnalysisSeedPlan,
  type PlaceholderEvidenceSourceSeed,
  type PlaceholderResultEvidenceLinkSeed,
} from '../lib/tender-placeholder-results';
import {
  TENDER_ANALYSIS_RUNNER_FUNCTION_NAME,
  parseTenderAnalysisRunnerResponse,
  isTenderAnalysisRunnerFailure,
} from '../types/tender-analysis-runner-contract';
import {
  TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME,
  isTenderDocumentExtractionRunnerRejected,
  parseTenderDocumentExtractionRunnerResponse,
} from '../types/tender-document-extraction-contract';
import {
  buildTenderPackageDetails,
  mapCreateTenderReferenceProfileInputToInsert,
  mapTenderAnalysisJobRowToDomain,
  mapTenderDraftPackageImportRunRowToDomain,
  mapTenderImportOwnedBlockRowToDomain,
  mapCreateTenderPackageInputToInsert,
  mapTenderDocumentChunkRowToDomain,
  mapTenderDocumentExtractionRowToDomain,
  mapTenderDraftPackageItemRowToDomain,
  mapTenderDraftPackageRowToDomain,
  mapTenderDraftArtifactRowToDomain,
  mapTenderDocumentRowToDomain,
  mapTenderMissingItemRowToDomain,
  mapTenderPackageResultsRowsToDomain,
  mapTenderPackageRowToDomain,
  mapTenderReferenceProfileRowToDomain,
  mapTenderResultEvidenceRowToDomain,
  mapTenderReferenceSuggestionRowToDomain,
  mapTenderRequirementRowToDomain,
  mapTenderReviewTaskRowToDomain,
  mapTenderRiskFlagRowToDomain,
  mapUpdateTenderDraftPackageItemInputToPatch,
  mapUpdateTenderReferenceProfileInputToPatch,
} from '../lib/tender-intelligence-mappers';
import {
  tenderAnalysisJobRowSchema,
  tenderAnalysisJobRowsSchema,
  tenderDocumentChunkRowsSchema,
  tenderDocumentExtractionRowSchema,
  tenderDocumentExtractionRowsSchema,
  tenderDocumentRowSchema,
  tenderDocumentRowsSchema,
  tenderDraftPackageImportRunRowSchema,
  tenderDraftPackageImportRunRowsSchema,
  tenderDraftPackageItemRowSchema,
  tenderDraftPackageItemRowsSchema,
  tenderDraftPackageRowSchema,
  tenderDraftPackageRowsSchema,
  tenderImportOwnedBlockRowSchema,
  tenderImportOwnedBlockRowsSchema,
  tenderDraftArtifactRowsSchema,
  tenderGoNoGoAssessmentRowSchema,
  tenderGoNoGoAssessmentRowsSchema,
  tenderMissingItemRowsSchema,
  tenderPackageRowSchema,
  tenderPackageRowsSchema,
  tenderReferenceProfileRowSchema,
  tenderReferenceProfileRowsSchema,
  tenderResultEvidenceRowsSchema,
  tenderReferenceSuggestionRowSchema,
  tenderReferenceSuggestionRowsSchema,
  tenderRequirementRowsSchema,
  tenderReviewTaskRowsSchema,
  tenderRiskFlagRowsSchema,
} from '../types/tender-intelligence-db';

type Listener = () => void;

export interface TenderIntelligenceRepository extends TenderIntelligenceBackendAdapter {
  subscribe(listener: Listener): () => void;
}

function requireConfiguredSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(getSupabaseConfigError());
  }

  return requireSupabase();
}

function getRepositoryErrorMessage(error: unknown, fallbackMessage: string) {
  const candidate = error as PostgrestError | Error | null | undefined;
  const message = typeof candidate?.message === 'string' ? candidate.message.trim() : '';
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('policy') ||
    normalizedMessage.includes('aktiivinen organisaatiojäsen')
  ) {
    return 'Sinulla ei ole oikeutta käyttää Tarjousälyn organisaatiodataa tällä tilillä.';
  }

  if (normalizedMessage.includes('supabase-asetukset puuttuvat')) {
    return getSupabaseConfigError();
  }

  return message || fallbackMessage;
}

function toRepositoryError(error: unknown, fallbackMessage: string) {
  return new Error(getRepositoryErrorMessage(error, fallbackMessage));
}

function isMissingStorageObjectError(error: unknown) {
  const candidate = error as Error | null | undefined;
  const message = typeof candidate?.message === 'string' ? candidate.message.toLowerCase() : '';

  return message.includes('not found') || message.includes('no such object') || message.includes('no object found');
}

async function assertTenderPackageAccess(packageId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_packages').select('*').eq('id', packageId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyyntöpakettia ei voitu tarkistaa.');
  }

  if (!data) {
    throw new Error('Tarjouspyyntöpakettia ei löytynyt tai sinulla ei ole oikeutta siihen.');
  }

  return tenderPackageRowSchema.parse(data);
}

async function fetchPackageRows<Row>(options: {
  tableName:
    | 'tender_documents'
    | 'tender_analysis_jobs'
    | 'tender_draft_packages'
    | 'tender_result_evidence'
    | 'tender_requirements'
    | 'tender_missing_items'
    | 'tender_risk_flags'
    | 'tender_reference_suggestions'
    | 'tender_draft_artifacts'
    | 'tender_review_tasks';
  packageId: string;
  schema: { parse(data: unknown): Row[] };
  fallbackMessage: string;
  orderByColumn?: 'created_at' | 'updated_at';
}) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from(options.tableName)
    .select('*')
    .eq('tender_package_id', options.packageId)
    .order(options.orderByColumn ?? 'created_at', { ascending: false });

  if (error) {
    throw toRepositoryError(error, options.fallbackMessage);
  }

  return options.schema.parse(data ?? []);
}

async function fetchTenderDocumentRowsForPackage(packageId: string) {
  return fetchPackageRows({
    tableName: 'tender_documents',
    packageId,
    schema: tenderDocumentRowsSchema,
    fallbackMessage: 'Tarjouspyyntöpaketin dokumentteja ei voitu ladata.',
  });
}

async function fetchTenderAnalysisJobRowsForPackage(packageId: string) {
  return fetchPackageRows({
    tableName: 'tender_analysis_jobs',
    packageId,
    schema: tenderAnalysisJobRowsSchema,
    fallbackMessage: 'Tarjouspyyntöpaketin analyysijobeja ei voitu ladata.',
  });
}

async function fetchTenderDocumentRowById(documentId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_documents').select('*').eq('id', documentId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Tarjousdokumenttia ei voitu ladata.');
  }

  return data ? tenderDocumentRowSchema.parse(data) : null;
}

async function fetchTenderAnalysisJobRowById(jobId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_analysis_jobs').select('*').eq('id', jobId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyynnön analyysijobia ei voitu ladata.');
  }

  return data ? tenderAnalysisJobRowSchema.parse(data) : null;
}

async function fetchPackageResultRowById<Row>(options: {
  tableName:
    | 'tender_requirements'
    | 'tender_missing_items'
    | 'tender_risk_flags'
    | 'tender_reference_suggestions'
    | 'tender_review_tasks';
  rowId: string;
  schema: { parse(data: unknown): Row };
  fallbackMessage: string;
}) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from(options.tableName).select('*').eq('id', options.rowId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, options.fallbackMessage);
  }

  return data ? options.schema.parse(data) : null;
}

async function fetchReferenceProfileRowById(profileId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_reference_profiles').select('*').eq('id', profileId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Referenssiprofiilia ei voitu ladata.');
  }

  return data ? tenderReferenceProfileRowSchema.parse(data) : null;
}

async function fetchTenderDraftPackageRowById(draftPackageId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_draft_packages').select('*').eq('id', draftPackageId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Luonnospakettia ei voitu ladata.');
  }

  return data ? tenderDraftPackageRowSchema.parse(data) : null;
}

async function fetchTenderDraftPackageItemRowById(itemId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.from('tender_draft_package_items').select('*').eq('id', itemId).maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin riviä ei voitu ladata.');
  }

  return data ? tenderDraftPackageItemRowSchema.parse(data) : null;
}

async function fetchTenderReferenceProfileRowsForOrganization(options: {
  client?: ReturnType<typeof requireSupabase>;
  organizationId: string;
}) {
  const client = options.client ?? requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_reference_profiles')
    .select('*')
    .eq('organization_id', options.organizationId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw toRepositoryError(error, 'Organisaation referenssikorpusta ei voitu ladata.');
  }

  return tenderReferenceProfileRowsSchema.parse(data ?? []);
}

async function fetchTenderDraftPackageItemRowsForDraftPackages(options: {
  client?: ReturnType<typeof requireSupabase>;
  draftPackageIds: string[];
}) {
  if (options.draftPackageIds.length < 1) {
    return [];
  }

  const client = options.client ?? requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_draft_package_items')
    .select('*')
    .in('tender_draft_package_id', options.draftPackageIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin rivejä ei voitu ladata.');
  }

  return tenderDraftPackageItemRowsSchema.parse(data ?? []);
}

async function fetchTenderDraftPackageImportRunRowsForDraftPackage(options: {
  client?: ReturnType<typeof requireSupabase>;
  draftPackageId: string;
  resultStatus?: 'success' | 'failed';
}) {
  const client = options.client ?? requireConfiguredSupabase();
  let query = client
    .from('tender_draft_package_import_runs')
    .select('*')
    .eq('tender_draft_package_id', options.draftPackageId)
    .order('created_at', { ascending: false });

  if (options.resultStatus) {
    query = query.eq('result_status', options.resultStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin import-ajohistoriaa ei voitu ladata.');
  }

  return tenderDraftPackageImportRunRowsSchema.parse(data ?? []);
}

async function fetchTenderImportOwnedBlockRowsForDraftPackage(options: {
  client?: ReturnType<typeof requireSupabase>;
  draftPackageId: string;
  targetQuoteId?: string | null;
}) {
  if (!options.targetQuoteId) {
    return [];
  }

  const client = options.client ?? requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_draft_package_import_blocks')
    .select('*')
    .eq('tender_draft_package_id', options.draftPackageId)
    .eq('target_quote_id', options.targetQuoteId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin import ownership -registryä ei voitu ladata.');
  }

  return tenderImportOwnedBlockRowsSchema.parse(data ?? []);
}

async function upsertTenderImportOwnedBlocks(options: {
  client: ReturnType<typeof requireSupabase>;
  records: ReturnType<typeof buildTenderImportOwnedBlockWriteRecords>;
}): Promise<TenderImportOwnedBlock[]> {
  if (options.records.length < 1) {
    return [];
  }

  const { data, error } = await options.client
    .from('tender_draft_package_import_blocks')
    .upsert(options.records, { onConflict: 'tender_draft_package_id,target_quote_id,block_id' })
    .select('*');

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin import ownership -registryä ei voitu päivittää.');
  }

  return tenderImportOwnedBlockRowsSchema.parse(data ?? []).map(mapTenderImportOwnedBlockRowToDomain);
}

async function deleteTenderImportOwnedBlocks(options: {
  client: ReturnType<typeof requireSupabase>;
  registryRowIds: string[];
}) {
  if (options.registryRowIds.length < 1) {
    return;
  }

  const { error } = await options.client
    .from('tender_draft_package_import_blocks')
    .delete()
    .in('id', options.registryRowIds);

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin inaktiivisia import ownership -rivejä ei voitu siivota.');
  }
}

async function getAuthenticatedActorUserId() {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw toRepositoryError(error, 'Kirjautunutta käyttäjää ei voitu tunnistaa Tarjousälyn katselmointia varten.');
  }

  const actorUserId = typeof data.user?.id === 'string' ? data.user.id.trim() : '';

  if (!actorUserId) {
    throw new Error('Kirjautunutta käyttäjää ei voitu tunnistaa Tarjousälyn katselmointia varten.');
  }

  return actorUserId;
}

function mapTenderWorkflowUpdateToRowPatch(update: ReturnType<typeof buildTenderWorkflowMetadataUpdate>) {
  const patch: Record<string, unknown> = {};

  if (update.reviewStatus !== undefined) {
    patch.review_status = update.reviewStatus;
  }

  if (update.reviewNote !== undefined) {
    patch.review_note = update.reviewNote;
  }

  if (update.reviewedByUserId !== undefined) {
    patch.reviewed_by_user_id = update.reviewedByUserId;
  }

  if (update.reviewedAt !== undefined) {
    patch.reviewed_at = update.reviewedAt;
  }

  if (update.resolutionStatus !== undefined) {
    patch.resolution_status = update.resolutionStatus;
  }

  if (update.resolutionNote !== undefined) {
    patch.resolution_note = update.resolutionNote;
  }

  if (update.resolvedByUserId !== undefined) {
    patch.resolved_by_user_id = update.resolvedByUserId;
  }

  if (update.resolvedAt !== undefined) {
    patch.resolved_at = update.resolvedAt;
  }

  if (update.assignedToUserId !== undefined) {
    patch.assigned_to_user_id = update.assignedToUserId;
  }

  return patch;
}

function buildOrganizationReferenceProfileMatches<RequirementId>(options: {
  requirements: Array<{
    id: RequirementId;
    title: string;
    description: string | null;
    sourceExcerpt: string | null;
    evidenceLinks?: PlaceholderResultEvidenceLinkSeed[];
  }>;
  profiles: Array<{
    id: string;
    title: string;
    client_name: string | null;
    project_type: string | null;
    description: string | null;
    location: string | null;
    completed_year: number | null;
    contract_value?: number | null;
    tags: string[] | null;
  }>;
}) {
  return buildTenderReferenceMatches({
    requirements: options.requirements.map((requirement) => ({
      id: requirement.id,
      title: requirement.title,
      description: requirement.description,
      sourceExcerpt: requirement.sourceExcerpt,
      evidenceLinks: requirement.evidenceLinks,
    })),
    profiles: options.profiles.map((profile) => ({
      id: profile.id,
      title: profile.title,
      clientName: profile.client_name,
      projectType: profile.project_type,
      description: profile.description,
      location: profile.location,
      completedYear: profile.completed_year,
      contractValue: profile.contract_value ?? null,
      tags: profile.tags,
    })),
  });
}

async function deleteEvidenceRowsForTargets(options: {
  client: ReturnType<typeof requireSupabase>;
  packageId: string;
  targetEntityType: TenderResultEvidenceTargetType;
  targetEntityIds: string[];
  fallbackMessage: string;
}) {
  if (options.targetEntityIds.length < 1) {
    return;
  }

  const { error } = await options.client
    .from('tender_result_evidence')
    .delete()
    .eq('tender_package_id', options.packageId)
    .eq('target_entity_type', options.targetEntityType)
    .in('target_entity_id', options.targetEntityIds);

  if (error) {
    throw toRepositoryError(error, options.fallbackMessage);
  }
}

async function insertReferenceSuggestionEvidenceFromRequirements(options: {
  client: ReturnType<typeof requireSupabase>;
  packageId: string;
  suggestionRows: Array<{ id: string; related_requirement_id: string | null; confidence: number | null }>;
  requirementEvidenceRows: Array<{ target_entity_id: string; source_document_id: string; extraction_id: string; chunk_id: string; excerpt_text: string; locator_text: string | null; confidence: number | null }>;
  fallbackMessage: string;
}) {
  const requirementEvidenceById = new Map<string, typeof options.requirementEvidenceRows>();

  options.requirementEvidenceRows.forEach((row) => {
    const current = requirementEvidenceById.get(row.target_entity_id) ?? [];
    current.push(row);
    requirementEvidenceById.set(row.target_entity_id, current);
  });

  const payload = options.suggestionRows.flatMap((suggestionRow) => {
    if (!suggestionRow.related_requirement_id) {
      return [];
    }

    return (requirementEvidenceById.get(suggestionRow.related_requirement_id) ?? []).map((row) => ({
      tender_package_id: options.packageId,
      source_document_id: row.source_document_id,
      extraction_id: row.extraction_id,
      chunk_id: row.chunk_id,
      target_entity_type: 'reference_suggestion' as const,
      target_entity_id: suggestionRow.id,
      excerpt_text: row.excerpt_text,
      locator_text: row.locator_text,
      confidence: row.confidence ?? suggestionRow.confidence ?? null,
    }));
  });

  if (payload.length < 1) {
    return;
  }

  const { error } = await options.client.from('tender_result_evidence').insert(payload);

  if (error) {
    throw toRepositoryError(error, options.fallbackMessage);
  }
}

function buildTenderDraftPackageSummaryFromItems(items: Array<{ item_type: string; is_included: boolean }>) {
  const includedItems = items.filter((item) => item.is_included);

  return buildTenderDraftSummary({
    acceptedRequirementCount: includedItems.filter((item) => item.item_type === 'accepted_requirement').length,
    acceptedReferenceCount: includedItems.filter((item) => item.item_type === 'selected_reference').length,
    resolvedMissingItemCount: includedItems.filter((item) => item.item_type === 'resolved_missing_item').length,
    noteCount: includedItems.filter((item) => item.item_type === 'review_note').length,
    draftArtifactCount: includedItems.filter((item) => item.item_type === 'draft_artifact').length,
  });
}

function mapTenderDraftPackageRowsWithItems(rows: typeof tenderDraftPackageRowsSchema['_type'], itemRows: typeof tenderDraftPackageItemRowsSchema['_type']) {
  const itemsByDraftPackageId = new Map<string, typeof itemRows>();

  itemRows.forEach((itemRow) => {
    const current = itemsByDraftPackageId.get(itemRow.tender_draft_package_id) ?? [];
    current.push(itemRow);
    itemsByDraftPackageId.set(itemRow.tender_draft_package_id, current);
  });

  return rows.map((row) => mapTenderDraftPackageRowToDomain(row, itemsByDraftPackageId.get(row.id) ?? []));
}

async function materializeTenderDraftPackage(options: {
  client: ReturnType<typeof requireSupabase>;
  draftPackageRow: typeof tenderDraftPackageRowSchema['_type'];
  itemRows: typeof tenderDraftPackageItemRowsSchema['_type'];
}) {
  const summary = buildTenderDraftPackageSummaryFromItems(options.itemRows);
  const payload = buildTenderDraftExportPayload({
    title: options.draftPackageRow.title,
    summary,
    status: options.draftPackageRow.status,
    generatedAt: new Date().toISOString(),
    generatedByUserId: options.draftPackageRow.generated_by_user_id,
    sourceTenderPackageId: options.draftPackageRow.tender_package_id,
    sourceAnalysisJobId: options.draftPackageRow.generated_from_analysis_job_id,
    items: options.itemRows.map(mapTenderDraftPackageItemRowToDomain),
  });

  const { data, error } = await options.client
    .from('tender_draft_packages')
    .update({
      summary,
      payload_json: payload,
    })
    .eq('id', options.draftPackageRow.id)
    .select('*')
    .single();

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin export payloadia ei voitu päivittää.');
  }

  return tenderDraftPackageRowSchema.parse(data);
}

async function updateTenderPackageEditorLinks(options: {
  client: ReturnType<typeof requireSupabase>;
  packageId: string;
  linkedCustomerId?: string | null;
  linkedProjectId?: string | null;
  linkedQuoteId?: string | null;
}) {
  const { error } = await options.client
    .from('tender_packages')
    .update({
      linked_customer_id: options.linkedCustomerId ?? null,
      linked_project_id: options.linkedProjectId ?? null,
      linked_quote_id: options.linkedQuoteId ?? null,
    })
    .eq('id', options.packageId);

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyyntöpaketin editorilinkkejä ei voitu päivittää.');
  }
}

async function updateTenderDraftPackageImportState(options: {
  client: ReturnType<typeof requireSupabase>;
  draftPackageId: string;
  patch: Partial<{
    import_status: TenderDraftPackageImportStatus;
    reimport_status: TenderDraftPackageReimportStatus;
    import_revision: number;
    last_import_payload_hash: string | null;
    imported_quote_id: string | null;
    imported_by_user_id: string | null;
    imported_at: string | null;
  }>;
}) {
  const { data, error } = await options.client
    .from('tender_draft_packages')
    .update(options.patch)
    .eq('id', options.draftPackageId)
    .select('*')
    .single();

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin import-tilaa ei voitu päivittää.');
  }

  const updatedRow = tenderDraftPackageRowSchema.parse(data);
  const itemRows = await fetchTenderDraftPackageItemRowsForDraftPackages({
    client: options.client,
    draftPackageIds: [options.draftPackageId],
  });
  const materializedRow = await materializeTenderDraftPackage({
    client: options.client,
    draftPackageRow: updatedRow,
    itemRows,
  });

  return mapTenderDraftPackageRowToDomain(materializedRow, itemRows);
}

async function createTenderDraftPackageImportRun(options: {
  client: ReturnType<typeof requireSupabase>;
  draftPackage: TenderDraftPackage;
  targetQuoteId?: string | null;
  runType: TenderImportRunType;
  importMode: 'create_new_quote' | 'update_existing_quote';
  payloadHash: string;
  payloadSnapshot: TenderEditorImportPreview['payload'];
  resultStatus: 'success' | 'failed';
  summary?: string | null;
  executionMetadata?: TenderEditorImportRunExecutionMetadata | null;
  createdByUserId?: string | null;
}) {
  const { data, error } = await options.client
    .from('tender_draft_package_import_runs')
    .insert({
      organization_id: options.draftPackage.organizationId,
      tender_draft_package_id: options.draftPackage.id,
      target_quote_id: options.targetQuoteId ?? null,
      run_type: options.runType,
      import_mode: options.importMode,
      payload_hash: options.payloadHash,
      payload_snapshot: options.payloadSnapshot,
      result_status: options.resultStatus,
      summary: options.summary ?? null,
      execution_metadata: options.executionMetadata ?? tenderEditorImportRunExecutionMetadataSchema.parse({}),
      created_by_user_id: options.createdByUserId ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw toRepositoryError(error, 'Luonnospaketin import-ajohistoriaa ei voitu tallentaa.');
  }

  return mapTenderDraftPackageImportRunRowToDomain(tenderDraftPackageImportRunRowSchema.parse(data));
}

async function fetchTenderDocumentExtractionRowsForPackage(packageId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_document_extractions')
    .select('*')
    .eq('tender_package_id', packageId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyyntöpaketin extraction-rivejä ei voitu ladata.');
  }

  return tenderDocumentExtractionRowsSchema.parse(data ?? []);
}

async function fetchTenderDocumentExtractionRowForDocument(documentId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_document_extractions')
    .select('*')
    .eq('tender_document_id', documentId)
    .maybeSingle();

  if (error) {
    throw toRepositoryError(error, 'Dokumentin extraction-riviä ei voitu ladata.');
  }

  return data ? tenderDocumentExtractionRowSchema.parse(data) : null;
}

async function fetchTenderDocumentChunkRowsForDocument(documentId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_document_chunks')
    .select('*')
    .eq('tender_document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (error) {
    throw toRepositoryError(error, 'Dokumentin extraction-chunkeja ei voitu ladata.');
  }

  return tenderDocumentChunkRowsSchema.parse(data ?? []);
}

async function fetchTenderDocumentChunkRowsForPackage(packageId: string) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_document_chunks')
    .select('*')
    .eq('tender_package_id', packageId)
    .order('created_at', { ascending: true });

  if (error) {
    throw toRepositoryError(error, 'Tarjouspyyntöpaketin extraction-chunkeja ei voitu ladata.');
  }

  return tenderDocumentChunkRowsSchema.parse(data ?? []);
}

async function fetchTenderResultEvidenceRowsForPackage(packageId: string) {
  return fetchPackageRows({
    tableName: 'tender_result_evidence',
    packageId,
    schema: tenderResultEvidenceRowsSchema,
    fallbackMessage: 'Tarjouspyyntöpaketin evidence-rivejä ei voitu ladata.',
  });
}

async function fetchTenderResultEvidenceRowsForTarget(
  packageId: string,
  targetEntityType: TenderResultEvidenceTargetType,
  targetEntityId: string,
) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('tender_result_evidence')
    .select('*')
    .eq('tender_package_id', packageId)
    .eq('target_entity_type', targetEntityType)
    .eq('target_entity_id', targetEntityId)
    .order('created_at', { ascending: true });

  if (error) {
    throw toRepositoryError(error, 'Evidence-rivejä ei voitu ladata valitulle kohteelle.');
  }

  return tenderResultEvidenceRowsSchema.parse(data ?? []);
}

async function fetchPackageResultCounts(
  tableName:
    | 'tender_documents'
    | 'tender_requirements'
    | 'tender_missing_items'
    | 'tender_risk_flags'
    | 'tender_review_tasks',
  packageIds: string[],
  fallbackMessage: string
) {
  if (packageIds.length === 0) {
    return new Map<string, number>();
  }

  const client = requireConfiguredSupabase();
  const { data, error } = await client.from(tableName).select('tender_package_id').in('tender_package_id', packageIds);

  if (error) {
    throw toRepositoryError(error, fallbackMessage);
  }

  const counts = new Map<string, number>();

  (data ?? []).forEach((row) => {
    const nextPackageId = typeof row.tender_package_id === 'string' ? row.tender_package_id : null;

    if (!nextPackageId) {
      return;
    }

    counts.set(nextPackageId, (counts.get(nextPackageId) ?? 0) + 1);
  });

  return counts;
}

async function deletePackageRows(
  tableName:
    | 'tender_result_evidence'
    | 'tender_review_tasks'
    | 'tender_draft_artifacts'
    | 'tender_reference_suggestions'
    | 'tender_risk_flags'
    | 'tender_missing_items'
    | 'tender_requirements',
  packageId: string,
  fallbackMessage: string
) {
  const client = requireConfiguredSupabase();
  const { error } = await client.from(tableName).delete().eq('tender_package_id', packageId);

  if (error) {
    throw toRepositoryError(error, fallbackMessage);
  }
}

async function deleteDocumentRows(
  tableName: 'tender_document_chunks' | 'tender_document_extractions',
  documentId: string,
  fallbackMessage: string
) {
  const client = requireConfiguredSupabase();
  const { error } = await client.from(tableName).delete().eq('tender_document_id', documentId);

  if (error) {
    throw toRepositoryError(error, fallbackMessage);
  }
}

async function insertTenderResultEvidenceRows<TSeed extends { evidenceLinks: PlaceholderResultEvidenceLinkSeed[] }>(options: {
  client: ReturnType<typeof requireSupabase>;
  packageId: string;
  targetEntityType: TenderResultEvidenceTargetType;
  targetRows: { id: string }[];
  seeds: TSeed[];
  evidenceSources: PlaceholderEvidenceSourceSeed[];
  fallbackMessage: string;
}) {
  const payload = options.seeds.flatMap((seed, index) => {
    const targetId = options.targetRows[index]?.id;

    if (!targetId) {
      return [];
    }

    return seed.evidenceLinks.flatMap((link) => {
      const source = options.evidenceSources[link.sourceIndex];

      if (!source) {
        return [];
      }

      return {
        tender_package_id: options.packageId,
        source_document_id: source.documentId,
        extraction_id: source.extractionId,
        chunk_id: source.chunkId,
        target_entity_type: options.targetEntityType,
        target_entity_id: targetId,
        excerpt_text: source.excerptText,
        locator_text: source.locatorText,
        confidence: link.confidence,
      };
    });
  });

  if (payload.length < 1) {
    return;
  }

  const { error } = await options.client.from('tender_result_evidence').insert(payload);

  if (error) {
    throw toRepositoryError(error, options.fallbackMessage);
  }
}

async function insertPackageRowsIfAny<Row>(options: {
  client: ReturnType<typeof requireSupabase>;
  tableName:
    | 'tender_requirements'
    | 'tender_missing_items'
    | 'tender_risk_flags'
    | 'tender_reference_suggestions'
    | 'tender_draft_artifacts'
    | 'tender_review_tasks';
  rows: Record<string, unknown>[];
  schema: { parse(data: unknown): Row[] };
  fallbackMessage: string;
}) {
  if (options.rows.length < 1) {
    return [] as Row[];
  }

  const { data, error } = await options.client.from(options.tableName).insert(options.rows).select('*');

  if (error) {
    throw toRepositoryError(error, options.fallbackMessage);
  }

  return options.schema.parse(data ?? []);
}

class SupabaseTenderIntelligenceRepository implements TenderIntelligenceRepository {
  private listeners = new Set<Listener>();

  private async updateWorkflowRow<Row extends {
    id: string;
    tender_package_id: string;
    review_status: 'unreviewed' | 'accepted' | 'dismissed' | 'needs_attention';
    review_note: string | null;
    reviewed_by_user_id: string | null;
    reviewed_at: string | null;
    resolution_status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
    resolution_note: string | null;
    resolved_by_user_id: string | null;
    resolved_at: string | null;
    assigned_to_user_id?: string | null;
  }, DomainEntity>(options: {
    tableName: 'tender_requirements' | 'tender_missing_items' | 'tender_risk_flags' | 'tender_reference_suggestions' | 'tender_review_tasks';
    rowId: string;
    input: UpdateTenderWorkflowInput;
    schema: { parse(data: unknown): Row };
    mapRow: (row: Row) => DomainEntity;
    notFoundMessage: string;
    fallbackMessage: string;
    syncLegacyReviewTaskStatus?: boolean;
  }) {
    const existingRow = await fetchPackageResultRowById({
      tableName: options.tableName,
      rowId: options.rowId,
      schema: options.schema,
      fallbackMessage: options.fallbackMessage,
    });

    if (!existingRow) {
      throw new Error(options.notFoundMessage);
    }

    await assertTenderPackageAccess(existingRow.tender_package_id);

    const actorUserId = await getAuthenticatedActorUserId();
    const workflowUpdate = buildTenderWorkflowMetadataUpdate({
      current: {
        reviewStatus: existingRow.review_status,
        reviewNote: existingRow.review_note,
        reviewedByUserId: existingRow.reviewed_by_user_id,
        reviewedAt: existingRow.reviewed_at,
        resolutionStatus: existingRow.resolution_status,
        resolutionNote: existingRow.resolution_note,
        resolvedByUserId: existingRow.resolved_by_user_id,
        resolvedAt: existingRow.resolved_at,
        assignedToUserId: 'assigned_to_user_id' in existingRow ? existingRow.assigned_to_user_id ?? null : undefined,
      },
      input: options.input,
      actorUserId,
      now: new Date().toISOString(),
    });
    const patch = mapTenderWorkflowUpdateToRowPatch(workflowUpdate);

    if (options.syncLegacyReviewTaskStatus && workflowUpdate.resolutionStatus) {
      patch.status = syncTenderReviewTaskStatus(workflowUpdate.resolutionStatus);
    }

    if (Object.keys(patch).length < 1) {
      return options.mapRow(existingRow);
    }

    const client = requireConfiguredSupabase();
    const { data, error } = await client.from(options.tableName).update(patch).eq('id', options.rowId).select('*').single();

    if (error) {
      throw toRepositoryError(error, options.fallbackMessage);
    }

    this.emit();
    return options.mapRow(options.schema.parse(data));
  }

  private async updateAnalysisJob(
    jobId: string,
    updates: {
      status?: TenderAnalysisJobStatus;
      started_at?: string | null;
      completed_at?: string | null;
      error_message?: string | null;
    },
    fallbackMessage: string
  ) {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client.from('tender_analysis_jobs').update(updates).eq('id', jobId).select('*').single();

      if (error) {
        throw error;
      }

      this.emit();
      return mapTenderAnalysisJobRowToDomain(tenderAnalysisJobRowSchema.parse(data));
    } catch (error) {
      throw toRepositoryError(error, fallbackMessage);
    }
  }

  private async clearAnalysisResults(packageId: string, emitAfter: boolean) {
    await assertTenderPackageAccess(packageId);

    await deletePackageRows('tender_result_evidence', packageId, 'Analyysin evidence-rivejä ei voitu poistaa paketilta.');
    await deletePackageRows('tender_review_tasks', packageId, 'Tarkistustehtäviä ei voitu poistaa paketilta.');
    await deletePackageRows('tender_draft_artifacts', packageId, 'Luonnosartefakteja ei voitu poistaa paketilta.');
    await deletePackageRows('tender_reference_suggestions', packageId, 'Referenssiehdotuksia ei voitu poistaa paketilta.');
    await deletePackageRows('tender_risk_flags', packageId, 'Riskilippuja ei voitu poistaa paketilta.');
    await deletePackageRows('tender_missing_items', packageId, 'Puutehavaintoja ei voitu poistaa paketilta.');
    await deletePackageRows('tender_requirements', packageId, 'Vaatimuksia ei voitu poistaa paketilta.');

    const client = requireConfiguredSupabase();
    const { error: assessmentError } = await client.from('tender_go_no_go_assessments').upsert(
      {
        tender_package_id: packageId,
        recommendation: 'pending',
        summary: null,
        confidence: null,
      },
      { onConflict: 'tender_package_id' }
    );

    if (assessmentError) {
      throw toRepositoryError(assessmentError, 'Go / No-Go -placeholderia ei voitu nollata paketilta.');
    }

    if (emitAfter) {
      this.emit();
    }
  }

  private async seedPlaceholderResults(packageId: string, emitAfter: boolean) {
    const client = requireConfiguredSupabase();
    const packageRow = await assertTenderPackageAccess(packageId);
    const documentRows = await fetchTenderDocumentRowsForPackage(packageId);
    const chunkRows = await fetchTenderDocumentChunkRowsForPackage(packageId);
    const referenceProfileRows = await fetchTenderReferenceProfileRowsForOrganization({
      client,
      organizationId: packageRow.organization_id,
    });

    if (documentRows.length === 0) {
      throw new Error('Analyysiä ei voi kirjoittaa ilman paketin dokumentteja.');
    }

    const plan = buildPlaceholderAnalysisSeedPlan({
      packageRow,
      documentRows,
      chunkRows,
    });

    try {
      await this.clearAnalysisResults(packageId, false);

      const requirementRows = await insertPackageRowsIfAny({
        client,
        tableName: 'tender_requirements',
        rows: plan.requirements.map((requirement) => ({
          tender_package_id: packageId,
          source_document_id: requirement.sourceDocumentId,
          requirement_type: requirement.requirementType,
          title: requirement.title,
          description: requirement.description,
          status: requirement.status,
          confidence: requirement.confidence,
          source_excerpt: requirement.sourceExcerpt,
        })),
        schema: tenderRequirementRowsSchema,
        fallbackMessage: 'Vaatimusrivejä ei voitu tallentaa.',
      });
      await insertTenderResultEvidenceRows({
        client,
        packageId,
        targetEntityType: 'requirement',
        targetRows: requirementRows,
        seeds: plan.requirements,
        evidenceSources: plan.evidenceSources,
        fallbackMessage: 'Vaatimusten evidence-rivejä ei voitu tallentaa.',
      });

      const missingItemRows = await insertPackageRowsIfAny({
        client,
        tableName: 'tender_missing_items',
        rows: plan.missingItems.map((item) => ({
          tender_package_id: packageId,
          related_requirement_id: item.relatedRequirementIndex == null ? null : requirementRows[item.relatedRequirementIndex]?.id ?? null,
          item_type: item.itemType,
          title: item.title,
          description: item.description,
          severity: item.severity,
          status: item.status,
        })),
        schema: tenderMissingItemRowsSchema,
        fallbackMessage: 'Puuterivejä ei voitu tallentaa.',
      });
      await insertTenderResultEvidenceRows({
        client,
        packageId,
        targetEntityType: 'missing_item',
        targetRows: missingItemRows,
        seeds: plan.missingItems,
        evidenceSources: plan.evidenceSources,
        fallbackMessage: 'Puuterivien evidence-rivejä ei voitu tallentaa.',
      });

      const riskFlagRows = await insertPackageRowsIfAny({
        client,
        tableName: 'tender_risk_flags',
        rows: plan.riskFlags.map((riskFlag) => ({
          tender_package_id: packageId,
          risk_type: riskFlag.riskType,
          title: riskFlag.title,
          description: riskFlag.description,
          severity: riskFlag.severity,
          status: riskFlag.status,
        })),
        schema: tenderRiskFlagRowsSchema,
        fallbackMessage: 'Riskirivejä ei voitu tallentaa.',
      });
      await insertTenderResultEvidenceRows({
        client,
        packageId,
        targetEntityType: 'risk_flag',
        targetRows: riskFlagRows,
        seeds: plan.riskFlags,
        evidenceSources: plan.evidenceSources,
        fallbackMessage: 'Riskirivien evidence-rivejä ei voitu tallentaa.',
      });

      const referenceSuggestionRows = await insertPackageRowsIfAny({
        client,
        tableName: 'tender_reference_suggestions',
        rows: plan.referenceSuggestions.map((suggestion) => ({
          tender_package_id: packageId,
          related_requirement_id: null,
          source_type: suggestion.sourceType,
          source_reference: suggestion.sourceReference,
          title: suggestion.title,
          rationale: suggestion.rationale,
          confidence: suggestion.confidence,
        })),
        schema: tenderReferenceSuggestionRowsSchema,
        fallbackMessage: 'Referenssiehdotuksia ei voitu tallentaa.',
      });
      await insertTenderResultEvidenceRows({
        client,
        packageId,
        targetEntityType: 'reference_suggestion',
        targetRows: referenceSuggestionRows,
        seeds: plan.referenceSuggestions,
        evidenceSources: plan.evidenceSources,
        fallbackMessage: 'Referenssien evidence-rivejä ei voitu tallentaa.',
      });

      const organizationReferenceSuggestionSeeds = buildOrganizationReferenceProfileMatches({
        requirements: plan.requirements.map((requirement, requirementIndex) => ({
          id: requirementIndex,
          title: requirement.title,
          description: requirement.description,
          sourceExcerpt: requirement.sourceExcerpt,
          evidenceLinks: requirement.evidenceLinks,
        })),
        profiles: referenceProfileRows,
      }).flatMap((match) => {
        const relatedRequirementId = requirementRows[match.requirementId]?.id ?? null;

        return relatedRequirementId
          ? [{
              ...match,
              relatedRequirementId,
            }]
          : [];
      });

      const organizationReferenceSuggestionRows = await insertPackageRowsIfAny({
        client,
        tableName: 'tender_reference_suggestions',
        rows: organizationReferenceSuggestionSeeds.map((suggestion) => ({
          tender_package_id: packageId,
          related_requirement_id: suggestion.relatedRequirementId,
          source_type: 'organization_reference_profile',
          source_reference: suggestion.profileId,
          title: suggestion.title,
          rationale: suggestion.rationale,
          confidence: suggestion.confidence,
        })),
        schema: tenderReferenceSuggestionRowsSchema,
        fallbackMessage: 'Organisaation referenssiehdotuksia ei voitu tallentaa.',
      });
      await insertTenderResultEvidenceRows({
        client,
        packageId,
        targetEntityType: 'reference_suggestion',
        targetRows: organizationReferenceSuggestionRows,
        seeds: organizationReferenceSuggestionSeeds,
        evidenceSources: plan.evidenceSources,
        fallbackMessage: 'Organisaation referenssiehdotusten evidence-rivejä ei voitu tallentaa.',
      });

      const allReferenceSuggestionRows = [...referenceSuggestionRows, ...organizationReferenceSuggestionRows];

      const draftArtifactRows = await insertPackageRowsIfAny({
        client,
        tableName: 'tender_draft_artifacts',
        rows: plan.draftArtifacts.map((artifact) => ({
          tender_package_id: packageId,
          artifact_type: artifact.artifactType,
          title: artifact.title,
          content_md: artifact.contentMd,
          status: artifact.status,
        })),
        schema: tenderDraftArtifactRowsSchema,
        fallbackMessage: 'Luonnosartefakteja ei voitu tallentaa.',
      });
      await insertTenderResultEvidenceRows({
        client,
        packageId,
        targetEntityType: 'draft_artifact',
        targetRows: draftArtifactRows,
        seeds: plan.draftArtifacts,
        evidenceSources: plan.evidenceSources,
        fallbackMessage: 'Luonnosartefaktien evidence-rivejä ei voitu tallentaa.',
      });

      const reviewTaskRows = await insertPackageRowsIfAny({
        client,
        tableName: 'tender_review_tasks',
        rows: plan.reviewTasks.map((task) => ({
          tender_package_id: packageId,
          task_type: task.taskType,
          title: task.title,
          description: task.description,
          status: task.status,
          assigned_to_user_id: null,
        })),
        schema: tenderReviewTaskRowsSchema,
        fallbackMessage: 'Tarkistustehtäviä ei voitu tallentaa.',
      });
      await insertTenderResultEvidenceRows({
        client,
        packageId,
        targetEntityType: 'review_task',
        targetRows: reviewTaskRows,
        seeds: plan.reviewTasks,
        evidenceSources: plan.evidenceSources,
        fallbackMessage: 'Tarkistustehtävien evidence-rivejä ei voitu tallentaa.',
      });

      const { data: goNoGoAssessmentData, error: goNoGoAssessmentError } = await client
        .from('tender_go_no_go_assessments')
        .upsert(
          {
            tender_package_id: packageId,
            recommendation: plan.goNoGoAssessment.recommendation,
            summary: plan.goNoGoAssessment.summary,
            confidence: plan.goNoGoAssessment.confidence,
          },
          { onConflict: 'tender_package_id' }
        )
        .select('*')
        .single();

      if (goNoGoAssessmentError) {
        throw goNoGoAssessmentError;
      }

      const goNoGoAssessmentRow = tenderGoNoGoAssessmentRowSchema.parse(goNoGoAssessmentData);
      const results = mapTenderPackageResultsRowsToDomain({
        requirementRows,
        missingItemRows,
        riskFlagRows,
        referenceSuggestionRows: allReferenceSuggestionRows,
        draftArtifactRows,
        reviewTaskRows,
        goNoGoAssessmentRow,
      });

      if (emitAfter) {
        this.emit();
      }

      return results;
    } catch (error) {
      try {
        await this.clearAnalysisResults(packageId, false);
      } catch (cleanupError) {
        console.warn('Tender baseline result cleanup failed after seed error.', cleanupError);
      }

      throw toRepositoryError(error, 'Baseline-analyysitulosten kirjoitus epäonnistui.');
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async listTenderPackages() {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client.from('tender_packages').select('*').order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      const packageRows = tenderPackageRowsSchema.parse(data ?? []);
      const packageIds = packageRows.map((row) => row.id);
      const [documentCounts, requirementCounts, missingItemCounts, riskCounts, reviewTaskCounts] = await Promise.all([
        fetchPackageResultCounts('tender_documents', packageIds, 'Tarjouspyyntöpakettien dokumentteja ei voitu ladata.'),
        fetchPackageResultCounts('tender_requirements', packageIds, 'Tarjouspyyntöpakettien vaatimuksia ei voitu ladata.'),
        fetchPackageResultCounts('tender_missing_items', packageIds, 'Tarjouspyyntöpakettien puutteita ei voitu ladata.'),
        fetchPackageResultCounts('tender_risk_flags', packageIds, 'Tarjouspyyntöpakettien riskejä ei voitu ladata.'),
        fetchPackageResultCounts('tender_review_tasks', packageIds, 'Tarjouspyyntöpakettien tarkistustehtäviä ei voitu ladata.'),
      ]);

      return packageRows.map((row) =>
        mapTenderPackageRowToDomain(row, {
          documentCount: documentCounts.get(row.id) ?? 0,
          requirementCount: requirementCounts.get(row.id) ?? 0,
          missingItemCount: missingItemCounts.get(row.id) ?? 0,
          riskCount: riskCounts.get(row.id) ?? 0,
          reviewTaskCount: reviewTaskCounts.get(row.id) ?? 0,
        })
      );
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketteja ei voitu ladata.');
    }
  }

  async getTenderPackageById(packageId: string) {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client.from('tender_packages').select('*').eq('id', packageId).maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const packageRow = tenderPackageRowSchema.parse(data);
      const [
        documentRows,
        documentExtractionRows,
        resultEvidenceRows,
        analysisJobRows,
        requirementRows,
        missingItemRows,
        riskFlagRows,
        referenceSuggestionRows,
        draftArtifactRows,
        reviewTaskRows,
        assessmentResponse,
      ] = await Promise.all([
        fetchTenderDocumentRowsForPackage(packageId),
        fetchTenderDocumentExtractionRowsForPackage(packageId),
        fetchTenderResultEvidenceRowsForPackage(packageId),
        fetchTenderAnalysisJobRowsForPackage(packageId),
        fetchPackageRows({
          tableName: 'tender_requirements',
          packageId,
          schema: tenderRequirementRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin vaatimuksia ei voitu ladata.',
          orderByColumn: 'updated_at',
        }),
        fetchPackageRows({
          tableName: 'tender_missing_items',
          packageId,
          schema: tenderMissingItemRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin puutteita ei voitu ladata.',
          orderByColumn: 'updated_at',
        }),
        fetchPackageRows({
          tableName: 'tender_risk_flags',
          packageId,
          schema: tenderRiskFlagRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin riskejä ei voitu ladata.',
          orderByColumn: 'updated_at',
        }),
        fetchPackageRows({
          tableName: 'tender_reference_suggestions',
          packageId,
          schema: tenderReferenceSuggestionRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin referenssiehdotuksia ei voitu ladata.',
          orderByColumn: 'updated_at',
        }),
        fetchPackageRows({
          tableName: 'tender_draft_artifacts',
          packageId,
          schema: tenderDraftArtifactRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin luonnosartefakteja ei voitu ladata.',
          orderByColumn: 'updated_at',
        }),
        fetchPackageRows({
          tableName: 'tender_review_tasks',
          packageId,
          schema: tenderReviewTaskRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin tarkistustehtäviä ei voitu ladata.',
          orderByColumn: 'updated_at',
        }),
        client.from('tender_go_no_go_assessments').select('*').eq('tender_package_id', packageId).limit(1),
      ]);

      if (assessmentResponse.error) {
        throw assessmentResponse.error;
      }

      const assessmentRows = tenderGoNoGoAssessmentRowsSchema.parse(assessmentResponse.data ?? []);

      return buildTenderPackageDetails({
        packageRow,
        documentRows,
        documentExtractionRows,
        resultEvidenceRows,
        analysisJobRows,
        requirementRows,
        missingItemRows,
        riskFlagRows,
        referenceSuggestionRows,
        draftArtifactRows,
        reviewTaskRows,
        goNoGoAssessmentRow: assessmentRows[0] ?? null,
      });
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin tietoja ei voitu ladata.');
    }
  }

  async createTenderPackage(input: CreateTenderPackageInput) {
    try {
      const client = requireConfiguredSupabase();
      const payload = mapCreateTenderPackageInputToInsert(input);
      const { data, error } = await client.from('tender_packages').insert(payload).select('*').single();

      if (error) {
        throw error;
      }

      const packageRow = tenderPackageRowSchema.parse(data);
      const { error: assessmentError } = await client.from('tender_go_no_go_assessments').upsert(
        {
          tender_package_id: packageRow.id,
          recommendation: 'pending',
          summary: null,
          confidence: null,
        },
        { onConflict: 'tender_package_id' }
      );

      if (assessmentError) {
        console.warn('Tender Go/No-Go placeholder creation failed, continuing without assessment.', assessmentError);
      }

      const createdPackage = await this.getTenderPackageById(packageRow.id);

      if (!createdPackage) {
        throw new Error('Luotua tarjouspyyntöpakettia ei voitu hakea takaisin tietokannasta.');
      }

      this.emit();
      return createdPackage;
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin luonti epäonnistui.');
    }
  }

  async createAnalysisJob(
    packageId: string,
    options: { jobType?: TenderAnalysisJobType; status?: TenderAnalysisJobStatus } = {}
  ) {
    try {
      const client = requireConfiguredSupabase();
      await assertTenderPackageAccess(packageId);

      const { data, error } = await client
        .from('tender_analysis_jobs')
        .insert({
          tender_package_id: packageId,
          job_type: options.jobType ?? 'placeholder_analysis',
          status: options.status ?? 'pending',
          provider: null,
          model: null,
          error_message: null,
          started_at: null,
          completed_at: null,
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      this.emit();
      return mapTenderAnalysisJobRowToDomain(tenderAnalysisJobRowSchema.parse(data));
    } catch (error) {
      throw toRepositoryError(error, 'Analyysijobin luonti epäonnistui.');
    }
  }

  async listAnalysisJobsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchTenderAnalysisJobRowsForPackage(packageId);
      return rows.map(mapTenderAnalysisJobRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin analyysijobilistaa ei voitu ladata.');
    }
  }

  async getLatestAnalysisJobForPackage(packageId: string) {
    const jobs = await this.listAnalysisJobsForPackage(packageId);
    return jobs[0] ?? null;
  }

  async listRequirementsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_requirements',
        packageId,
        schema: tenderRequirementRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin vaatimuksia ei voitu ladata.',
        orderByColumn: 'updated_at',
      });

      return rows.map(mapTenderRequirementRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin vaatimuslistaa ei voitu ladata.');
    }
  }

  async listMissingItemsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_missing_items',
        packageId,
        schema: tenderMissingItemRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin puutteita ei voitu ladata.',
        orderByColumn: 'updated_at',
      });

      return rows.map(mapTenderMissingItemRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin puutelistaa ei voitu ladata.');
    }
  }

  async listRiskFlagsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_risk_flags',
        packageId,
        schema: tenderRiskFlagRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin riskihavaintoja ei voitu ladata.',
        orderByColumn: 'updated_at',
      });

      return rows.map(mapTenderRiskFlagRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin riskilistaa ei voitu ladata.');
    }
  }

  async listReferenceProfiles() {
    try {
      const client = requireConfiguredSupabase();
      const { data, error } = await client.from('tender_reference_profiles').select('*').order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return tenderReferenceProfileRowsSchema.parse(data ?? []).map(mapTenderReferenceProfileRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Organisaation referenssikorpusta ei voitu ladata.');
    }
  }

  async createReferenceProfile(input: CreateTenderReferenceProfileInput) {
    try {
      const client = requireConfiguredSupabase();
      const payload = mapCreateTenderReferenceProfileInputToInsert(input);
      const { data, error } = await client.from('tender_reference_profiles').insert(payload).select('*').single();

      if (error) {
        throw error;
      }

      this.emit();
      return mapTenderReferenceProfileRowToDomain(tenderReferenceProfileRowSchema.parse(data));
    } catch (error) {
      throw toRepositoryError(error, 'Referenssiprofiilin luonti epäonnistui.');
    }
  }

  async updateReferenceProfile(profileId: string, input: UpdateTenderReferenceProfileInput) {
    try {
      const existingRow = await fetchReferenceProfileRowById(profileId);

      if (!existingRow) {
        throw new Error('Referenssiprofiilia ei löytynyt tai se on jo poistettu.');
      }

      const client = requireConfiguredSupabase();
      const patch = mapUpdateTenderReferenceProfileInputToPatch(input);
      const { data, error } = await client
        .from('tender_reference_profiles')
        .update(patch)
        .eq('id', profileId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      this.emit();
      return mapTenderReferenceProfileRowToDomain(tenderReferenceProfileRowSchema.parse(data));
    } catch (error) {
      throw toRepositoryError(error, 'Referenssiprofiilia ei voitu päivittää.');
    }
  }

  async deleteReferenceProfile(profileId: string) {
    try {
      const existingRow = await fetchReferenceProfileRowById(profileId);

      if (!existingRow) {
        throw new Error('Referenssiprofiilia ei löytynyt tai se on jo poistettu.');
      }

      const client = requireConfiguredSupabase();
      const { error } = await client.from('tender_reference_profiles').delete().eq('id', profileId);

      if (error) {
        throw error;
      }

      this.emit();
    } catch (error) {
      throw toRepositoryError(error, 'Referenssiprofiilia ei voitu poistaa.');
    }
  }

  async listDraftPackagesForTenderPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_draft_packages',
        packageId,
        schema: tenderDraftPackageRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin luonnospaketteja ei voitu ladata.',
        orderByColumn: 'updated_at',
      });
      const itemRows = await fetchTenderDraftPackageItemRowsForDraftPackages({
        draftPackageIds: rows.map((row) => row.id),
      });

      return mapTenderDraftPackageRowsWithItems(rows, itemRows);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin luonnospaketteja ei voitu ladata.');
    }
  }

  async getDraftPackageById(draftPackageId: string) {
    try {
      const row = await fetchTenderDraftPackageRowById(draftPackageId);

      if (!row) {
        return null;
      }

      await assertTenderPackageAccess(row.tender_package_id);
      const itemRows = await fetchTenderDraftPackageItemRowsForDraftPackages({ draftPackageIds: [draftPackageId] });
      return mapTenderDraftPackageRowToDomain(row, itemRows);
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospakettia ei voitu ladata.');
    }
  }

  async createDraftPackageFromReviewedResults(packageId: string) {
    let createdDraftPackageRow: typeof tenderDraftPackageRowSchema['_type'] | null = null;

    try {
      const client = requireConfiguredSupabase();
      const packageDetails = await this.getTenderPackageById(packageId);

      if (!packageDetails) {
        throw new Error('Tarjouspyyntöpakettia ei löytynyt luonnospaketin muodostamista varten.');
      }

      const actorUserId = await getAuthenticatedActorUserId();
      const generation = buildTenderDraftPackageFromReviewedResults({
        packageDetails,
        generatedByUserId: actorUserId,
      });

      if (!generation.readiness.canGenerate) {
        throw new Error(generation.readiness.blockedReason ?? 'Luonnospakettia ei voitu muodostaa reviewed löydöksistä.');
      }

      const { data: packageData, error: packageError } = await client
        .from('tender_draft_packages')
        .insert({
          tender_package_id: packageId,
          title: generation.title,
          status: 'draft',
          generated_from_analysis_job_id: packageDetails.latestAnalysisJob?.id ?? null,
          generated_by_user_id: actorUserId,
          summary: generation.summary,
          payload_json: generation.exportPayload,
        })
        .select('*')
        .single();

      if (packageError) {
        throw packageError;
      }

      createdDraftPackageRow = tenderDraftPackageRowSchema.parse(packageData);

      const { data: itemData, error: itemError } = await client
        .from('tender_draft_package_items')
        .insert(
          generation.items.map((item) => ({
            tender_draft_package_id: createdDraftPackageRow!.id,
            item_type: item.itemType,
            source_entity_type: item.sourceEntityType,
            source_entity_id: item.sourceEntityId,
            title: item.title,
            content_md: item.contentMd,
            sort_order: item.sortOrder,
            is_included: item.isIncluded,
          })),
        )
        .select('*');

      if (itemError) {
        throw itemError;
      }

      const itemRows = tenderDraftPackageItemRowsSchema.parse(itemData ?? []);
      const materializedRow = await materializeTenderDraftPackage({
        client,
        draftPackageRow: createdDraftPackageRow,
        itemRows,
      });

      this.emit();
      return mapTenderDraftPackageRowToDomain(materializedRow, itemRows);
    } catch (error) {
      if (createdDraftPackageRow) {
        try {
          const client = requireConfiguredSupabase();
          await client.from('tender_draft_package_items').delete().eq('tender_draft_package_id', createdDraftPackageRow.id);
          await client.from('tender_draft_packages').delete().eq('id', createdDraftPackageRow.id);
        } catch (cleanupError) {
          console.warn('Tender draft package cleanup failed after create error.', cleanupError);
        }
      }

      throw toRepositoryError(error, 'Luonnospakettia ei voitu muodostaa reviewed löydöksistä.');
    }
  }

  private async buildDraftPackageImportContext(draftPackageId: string) {
    const draftPackage = await this.getDraftPackageById(draftPackageId);

    if (!draftPackage) {
      throw new Error('Luonnospakettia ei löytynyt editori-importtia varten.');
    }

    const packageDetails = await this.getTenderPackageById(draftPackage.tenderPackageId);

    if (!packageDetails) {
      throw new Error('Tarjouspyyntöpakettia ei löytynyt editori-importtia varten.');
    }

    const actorUserId = await getAuthenticatedActorUserId();
    const client = requireConfiguredSupabase();
    const target = await resolveTenderEditorImportTarget({
      client,
      packageDetails,
      actorUserId,
      importedQuoteId: draftPackage.importedQuoteId,
    });
    const targetQuoteId = target.quoteId ?? draftPackage.importedQuoteId ?? null;
    const preview = buildTenderEditorImportPreview({
      draftPackage,
      packageName: packageDetails.package.name,
      targetQuoteId,
      targetQuoteTitle: target.quoteTitle ?? undefined,
      targetCustomerId: target.customerId,
      targetProjectId: target.projectId,
      willCreatePlaceholderTarget: target.willCreatePlaceholderTarget,
    });
    const importRunRows = await fetchTenderDraftPackageImportRunRowsForDraftPackage({
      client,
      draftPackageId,
    });
    const importRuns = importRunRows.map(mapTenderDraftPackageImportRunRowToDomain);
    const latestRun = importRuns[0] ?? null;
    const latestSuccessfulRun = importRuns.find(
      (run) => run.result_status === 'success' && (run.run_type === 'import' || run.run_type === 'reimport'),
    ) ?? null;
    const ownedBlockRows = await fetchTenderImportOwnedBlockRowsForDraftPackage({
      client,
      draftPackageId,
      targetQuoteId,
    });
    const ownedBlocks = ownedBlockRows.map(mapTenderImportOwnedBlockRowToDomain);
    const targetQuoteSnapshot = target.quoteId
      ? await readTenderEditorImportTargetSnapshot({
          client,
          actorUserId,
          quoteId: target.quoteId,
        })
      : { quote: null, rows: [] };
    const suggestedImportMode = draftPackage.importedQuoteId && targetQuoteId
      ? 'update_existing_quote'
      : 'create_new_quote';
    const reconciliation = buildTenderEditorReconciliationPreview({
      draftPackage,
      preview,
      latestSuccessfulRun,
      targetQuoteId,
      targetQuoteTitle: target.quoteTitle ?? preview.payload.metadata.target_quote_title,
      importMode: suggestedImportMode,
      ownedBlocks,
      targetQuoteSnapshot,
    });
    const importState = buildTenderDraftPackageImportState({
      draftPackage,
      preview,
      latestRun,
      latestSuccessfulRun,
      targetQuoteId,
      targetQuoteTitle: target.quoteTitle ?? preview.payload.metadata.target_quote_title,
      targetProjectId: target.projectId ?? packageDetails.package.linkedProjectId ?? null,
      targetCustomerId: target.customerId ?? packageDetails.package.linkedCustomerId ?? null,
      reconciliation,
    });
    const diagnostics = buildTenderDraftPackageImportDiagnostics({
      draftPackageId: draftPackage.id,
      targetQuoteId,
      targetQuoteTitle: target.quoteTitle ?? preview.payload.metadata.target_quote_title,
      preview,
      importRuns,
      ownedBlocks,
      targetQuoteSnapshot,
    });
    const repairPreview = buildTenderImportRegistryRepairPreview({
      diagnostics,
    });

    return {
      client,
      actorUserId,
      packageDetails,
      draftPackage,
      target,
      targetQuoteSnapshot,
      preview,
      importRuns,
      latestRun,
      latestSuccessfulRun,
      ownedBlocks,
      importState,
      reconciliation,
      diagnostics,
      repairPreview,
    };
  }

  private async syncDraftPackageReimportStatus(
    context: Awaited<ReturnType<SupabaseTenderIntelligenceRepository['buildDraftPackageImportContext']>>,
  ) {
    if (context.draftPackage.reimportStatus === context.importState.reimport_status) {
      return context.draftPackage;
    }

    return updateTenderDraftPackageImportState({
      client: context.client,
      draftPackageId: context.draftPackage.id,
      patch: {
        reimport_status: context.importState.reimport_status,
      },
    });
  }

  async updateDraftPackageItem(itemId: string, input: UpdateTenderDraftPackageItemInput) {
    try {
      const existingItemRow = await fetchTenderDraftPackageItemRowById(itemId);

      if (!existingItemRow) {
        throw new Error('Luonnospaketin riviä ei löytynyt tai se on jo poistettu.');
      }

      const existingDraftPackageRow = await fetchTenderDraftPackageRowById(existingItemRow.tender_draft_package_id);

      if (!existingDraftPackageRow) {
        throw new Error('Luonnospakettia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(existingDraftPackageRow.tender_package_id);
      const patch = Object.fromEntries(
        Object.entries(mapUpdateTenderDraftPackageItemInputToPatch(input)).filter(([, value]) => value !== undefined),
      );

      const client = requireConfiguredSupabase();

      if (Object.keys(patch).length > 0) {
        const { error } = await client
          .from('tender_draft_package_items')
          .update(patch)
          .eq('id', itemId);

        if (error) {
          throw error;
        }
      }

      const itemRows = await fetchTenderDraftPackageItemRowsForDraftPackages({
        client,
        draftPackageIds: [existingDraftPackageRow.id],
      });
      const materializedRow = await materializeTenderDraftPackage({
        client,
        draftPackageRow: existingDraftPackageRow,
        itemRows,
      });

      this.emit();
      return mapTenderDraftPackageRowToDomain(materializedRow, itemRows);
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin riviä ei voitu päivittää.');
    }
  }

  async markDraftPackageReviewed(draftPackageId: string) {
    try {
      const existingDraftPackageRow = await fetchTenderDraftPackageRowById(draftPackageId);

      if (!existingDraftPackageRow) {
        throw new Error('Luonnospakettia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(existingDraftPackageRow.tender_package_id);
      const client = requireConfiguredSupabase();
      const { data, error } = await client
        .from('tender_draft_packages')
        .update({ status: 'reviewed' })
        .eq('id', draftPackageId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const updatedRow = tenderDraftPackageRowSchema.parse(data);
      const itemRows = await fetchTenderDraftPackageItemRowsForDraftPackages({ client, draftPackageIds: [draftPackageId] });
      const materializedRow = await materializeTenderDraftPackage({
        client,
        draftPackageRow: updatedRow,
        itemRows,
      });

      this.emit();
      return mapTenderDraftPackageRowToDomain(materializedRow, itemRows);
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospakettia ei voitu merkitä tarkistetuksi.');
    }
  }

  async markDraftPackageExported(draftPackageId: string) {
    try {
      const existingDraftPackageRow = await fetchTenderDraftPackageRowById(draftPackageId);

      if (!existingDraftPackageRow) {
        throw new Error('Luonnospakettia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(existingDraftPackageRow.tender_package_id);
      const client = requireConfiguredSupabase();
      const { data, error } = await client
        .from('tender_draft_packages')
        .update({ status: 'exported' })
        .eq('id', draftPackageId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const updatedRow = tenderDraftPackageRowSchema.parse(data);
      const itemRows = await fetchTenderDraftPackageItemRowsForDraftPackages({ client, draftPackageIds: [draftPackageId] });
      const materializedRow = await materializeTenderDraftPackage({
        client,
        draftPackageRow: updatedRow,
        itemRows,
      });

      this.emit();
      return mapTenderDraftPackageRowToDomain(materializedRow, itemRows);
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospakettia ei voitu merkitä viedyksi.');
    }
  }

  private async applyDraftPackageImportToEditor(
    draftPackageId: string,
    selection?: TenderEditorSelectiveReimportSelection | null,
    runType: TenderImportRunType = 'import',
  ): Promise<TenderEditorImportResult> {
    let context: Awaited<ReturnType<SupabaseTenderIntelligenceRepository['buildDraftPackageImportContext']>> | null = null;

    try {
      context = await this.buildDraftPackageImportContext(draftPackageId);

      if (!context.preview.validation.can_import) {
        const blockingIssue = context.preview.validation.issues.find((issue) => issue.severity === 'error');
        throw new Error(blockingIssue?.message || 'Luonnospakettia ei voi vielä tuoda editoriin.');
      }

      const currentManagedBlocks = buildTenderEditorManagedSurfaceFromPayload(context.preview.payload).blocks;
      const resolvedSelection = context.importState.suggested_import_mode === 'update_existing_quote'
        ? resolveTenderEditorSelectiveReimportSelection({
            blocks: context.reconciliation.blocks,
            selection,
          })
        : {
            updateBlockIds: currentManagedBlocks.map((block) => block.block_id),
            removeBlockIds: [],
            overrideConflictBlockIds: [],
            conflictPolicy: 'protect_conflicts' as const,
          };
      const fallbackBlocks = context.latestSuccessfulRun
        ? buildTenderEditorManagedSurfaceFromPayload(context.latestSuccessfulRun.payload_snapshot).blocks
        : [];

      const adapterResult = await importTenderDraftPackageToEditor({
        client: context.client,
        packageDetails: context.packageDetails,
        preview: context.preview,
        actorUserId: context.actorUserId,
        currentImportRevision: context.draftPackage.importRevision,
        ownedBlocks: context.ownedBlocks,
        fallbackBlocks,
        previousImportRunId: context.latestSuccessfulRun?.id ?? null,
        previousImportSyncedAt: context.latestSuccessfulRun?.created_at ?? context.draftPackage.importedAt ?? null,
        selectedUpdateBlockIds: resolvedSelection.updateBlockIds,
        selectedRemoveBlockIds: resolvedSelection.removeBlockIds,
        overrideConflictBlockIds: resolvedSelection.overrideConflictBlockIds,
        conflictPolicy: resolvedSelection.conflictPolicy,
      });
      const runTimestamp = new Date().toISOString();
      const shouldAdvanceRevision = context.importState.suggested_import_mode === 'create_new_quote'
        || adapterResult.execution_metadata.summary_counts.updated_blocks > 0
        || adapterResult.execution_metadata.summary_counts.removed_blocks > 0;
      const persistedImportRevision = shouldAdvanceRevision
        ? context.draftPackage.importRevision + 1
        : Math.max(context.draftPackage.importRevision, context.draftPackage.importedQuoteId ? 1 : 0);
      const importedAt = shouldAdvanceRevision
        ? runTimestamp
        : context.draftPackage.importedAt ?? runTimestamp;
      const postImportTargetSnapshot = await readTenderEditorImportTargetSnapshot({
        client: context.client,
        actorUserId: context.actorUserId,
        quoteId: adapterResult.imported_quote_id,
      });
      const postImportDriftStates = buildTenderImportOwnedBlockDriftStates({
        draftPackageId: context.draftPackage.id,
        currentBlocks: currentManagedBlocks,
        ownedBlocks: context.ownedBlocks,
        fallbackBlocks,
        fallbackMeta: {
          importRunId: context.latestSuccessfulRun?.id ?? null,
          revision: Math.max(context.draftPackage.importRevision, 1),
          lastSyncedAt: context.latestSuccessfulRun?.created_at ?? context.draftPackage.importedAt ?? null,
        },
        quote: postImportTargetSnapshot.quote,
        rows: postImportTargetSnapshot.rows,
      });
      const registryWriteRecords = buildTenderImportOwnedBlockWriteRecords({
        organizationId: context.draftPackage.organizationId,
        draftPackageId: context.draftPackage.id,
        targetQuoteId: adapterResult.imported_quote_id,
        currentBlocks: currentManagedBlocks,
        driftStates: postImportDriftStates,
        executionMetadata: adapterResult.execution_metadata,
        syncedAt: runTimestamp,
        nextRevision: persistedImportRevision,
      });
      const fullSyncAchieved = context.importState.suggested_import_mode === 'create_new_quote'
        || context.reconciliation.blocks.every((block) => {
          if (block.can_select_for_update) {
            return adapterResult.execution_metadata.updated_block_ids.includes(block.block_id);
          }

          if (block.can_select_for_removal) {
            return adapterResult.execution_metadata.removed_block_ids.includes(block.block_id);
          }

          return block.drift_status === 'up_to_date';
        });

      await updateTenderPackageEditorLinks({
        client: context.client,
        packageId: context.packageDetails.package.id,
        linkedCustomerId: adapterResult.imported_customer_id ?? context.packageDetails.package.linkedCustomerId ?? context.target.customerId,
        linkedProjectId: adapterResult.imported_project_id ?? context.packageDetails.package.linkedProjectId ?? context.target.projectId,
        linkedQuoteId: adapterResult.imported_quote_id,
      });
      const importRun = await createTenderDraftPackageImportRun({
        client: context.client,
        draftPackage: context.draftPackage,
        targetQuoteId: adapterResult.imported_quote_id,
        runType,
        importMode: adapterResult.import_mode,
        payloadHash: adapterResult.payload_hash,
        payloadSnapshot: context.preview.payload,
        resultStatus: 'success',
        summary: adapterResult.summary,
        executionMetadata: adapterResult.execution_metadata,
        createdByUserId: context.actorUserId,
      });
      await upsertTenderImportOwnedBlocks({
        client: context.client,
        records: registryWriteRecords.map((record) => ({
          ...record,
          import_run_id: importRun.id,
        })),
      });
      await updateTenderDraftPackageImportState({
        client: context.client,
        draftPackageId,
        patch: {
          import_status: 'imported',
          reimport_status: fullSyncAchieved ? 'up_to_date' : 'stale',
          import_revision: persistedImportRevision,
          last_import_payload_hash: fullSyncAchieved
            ? adapterResult.payload_hash
            : context.draftPackage.lastImportPayloadHash ?? context.latestSuccessfulRun?.payload_hash ?? null,
          imported_quote_id: adapterResult.imported_quote_id,
          imported_by_user_id: context.actorUserId,
          imported_at: importedAt,
        },
      });

      this.emit();
      return {
        ...adapterResult,
        import_revision: persistedImportRevision,
      };
    } catch (error) {
      if (context) {
        try {
          await updateTenderDraftPackageImportState({
            client: context.client,
            draftPackageId,
            patch: context.draftPackage.importedQuoteId
              ? {
                  import_status: 'imported',
                  reimport_status: 'import_failed',
                }
              : {
                  import_status: 'failed',
                  reimport_status: 'import_failed',
                },
          });
          await createTenderDraftPackageImportRun({
            client: context.client,
            draftPackage: context.draftPackage,
            targetQuoteId: context.draftPackage.importedQuoteId ?? null,
            runType,
            importMode: context.importState.suggested_import_mode,
            payloadHash: context.preview.payload_hash,
            payloadSnapshot: context.preview.payload,
            resultStatus: 'failed',
            summary: error instanceof Error ? error.message : 'Import epäonnistui.',
            createdByUserId: context.actorUserId,
          });
        } catch (markError) {
          console.warn('Tender draft package import failure state update failed.', markError);
        }
      }

      throw toRepositoryError(error, 'Luonnospakettia ei voitu tuoda editoriin.');
    }
  }

  async previewEditorImportForDraftPackage(draftPackageId: string): Promise<TenderEditorImportPreview> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(context);
      return context.preview;
    } catch (error) {
      throw toRepositoryError(error, 'Editori-importin previewta ei voitu muodostaa.');
    }
  }

  async validateEditorImportForDraftPackage(draftPackageId: string): Promise<TenderEditorImportValidationResult> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(context);
      return context.preview.validation;
    } catch (error) {
      throw toRepositoryError(error, 'Editori-importin validointia ei voitu suorittaa.');
    }
  }

  async getDraftPackageImportStatus(draftPackageId: string): Promise<TenderDraftPackageImportState> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(context);
      return context.importState;
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin import-tilaa ei voitu ladata.');
    }
  }

  async previewDraftPackageReimport(draftPackageId: string): Promise<TenderEditorReconciliationPreview> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(context);
      return context.reconciliation;
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin re-import previewta ei voitu muodostaa.');
    }
  }

  async getDraftPackageImportDiagnostics(draftPackageId: string): Promise<TenderDraftPackageImportDiagnostics> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(context);
      return context.diagnostics;
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin import-diagnostiikkaa ei voitu ladata.');
    }
  }

  async previewDraftPackageImportRegistryRepair(draftPackageId: string): Promise<TenderImportRegistryRepairPreview> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(context);
      return context.repairPreview;
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin registry repair -previewta ei voitu muodostaa.');
    }
  }

  async refreshDraftPackageImportDiagnosticsFromQuote(draftPackageId: string): Promise<TenderDraftPackageImportDiagnostics> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      const targetQuoteId = context.target.quoteId ?? context.preview.payload.metadata.target_quote_id ?? null;

      if (!targetQuoteId) {
        throw new Error('Luonnospakettia ei ole vielä tuotu quoteen, joten live quote -tilaa ei voi päivittää.');
      }

      const syncedAt = new Date().toISOString();
      const records = buildTenderImportRegistryDiagnosticsRefreshRecords({
        organizationId: context.draftPackage.organizationId,
        draftPackageId: context.draftPackage.id,
        targetQuoteId,
        diagnostics: context.diagnostics,
        syncedAt,
      });
      const affectedBlockIds = records.map((record) => record.block_id);
      const skippedBlockIds = context.diagnostics.blocks
        .map((block) => block.block_id)
        .filter((blockId) => !affectedBlockIds.includes(blockId));
      const executionMetadata = buildTenderImportRegistryDiagnosticsRefreshExecutionMetadata({
        diagnostics: context.diagnostics,
        affectedBlockIds,
        skippedBlockIds,
      });
      const summary = affectedBlockIds.length > 0
        ? `Päivitettiin live quote -diagnostiikka ${affectedBlockIds.length} registry-blokille.`
        : 'Live quote -diagnostiikka ei löytänyt päivitettäviä registry-blokkeja.';
      const diagnosticsRun = await createTenderDraftPackageImportRun({
        client: context.client,
        draftPackage: context.draftPackage,
        targetQuoteId,
        runType: 'diagnostics_refresh',
        importMode: context.importState.suggested_import_mode,
        payloadHash: context.preview.payload_hash,
        payloadSnapshot: context.preview.payload,
        resultStatus: 'success',
        summary,
        executionMetadata,
        createdByUserId: context.actorUserId,
      });

      if (records.length > 0) {
        await upsertTenderImportOwnedBlocks({
          client: context.client,
          records: records.map((record) => ({
            ...record,
            import_run_id: diagnosticsRun.id,
          })),
        });
      }

      const refreshedContext = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(refreshedContext);
      this.emit();
      return refreshedContext.diagnostics;
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin live quote -diagnostiikkaa ei voitu päivittää.');
    }
  }

  async repairDraftPackageImportRegistry(
    draftPackageId: string,
    action: TenderImportRegistryRepairAction,
  ): Promise<TenderImportRegistryRepairResult> {
    try {
      const context = await this.buildDraftPackageImportContext(draftPackageId);
      const targetQuoteId = context.target.quoteId ?? context.preview.payload.metadata.target_quote_id ?? null;

      if (!targetQuoteId) {
        throw new Error('Luonnospakettia ei ole vielä tuotu quoteen, joten registryä ei voi korjata.');
      }

      const syncedAt = new Date().toISOString();
      const repairPlan = buildTenderImportRegistryRepairPlan({
        organizationId: context.draftPackage.organizationId,
        draftPackageId: context.draftPackage.id,
        targetQuoteId,
        currentImportRevision: context.draftPackage.importRevision,
        diagnostics: context.diagnostics,
        preview: context.repairPreview,
        action,
        syncedAt,
      });
      const repairRun = await createTenderDraftPackageImportRun({
        client: context.client,
        draftPackage: context.draftPackage,
        targetQuoteId,
        runType: 'registry_repair',
        importMode: context.importState.suggested_import_mode,
        payloadHash: context.preview.payload_hash,
        payloadSnapshot: context.preview.payload,
        resultStatus: 'success',
        summary: repairPlan.summary,
        executionMetadata: repairPlan.executionMetadata,
        createdByUserId: context.actorUserId,
      });

      if (repairPlan.upsertRecords.length > 0) {
        await upsertTenderImportOwnedBlocks({
          client: context.client,
          records: repairPlan.upsertRecords.map((record) => ({
            ...record,
            import_run_id: repairRun.id,
          })),
        });
      }

      if (repairPlan.pruneRegistryRowIds.length > 0) {
        await deleteTenderImportOwnedBlocks({
          client: context.client,
          registryRowIds: repairPlan.pruneRegistryRowIds,
        });
      }

      const refreshedContext = await this.buildDraftPackageImportContext(draftPackageId);
      await this.syncDraftPackageReimportStatus(refreshedContext);
      this.emit();

      return {
        draft_package_id: draftPackageId,
        target_quote_id: targetQuoteId,
        repair_action: action,
        result_status: repairPlan.resultStatus,
        summary: repairPlan.summary,
        execution_metadata: repairPlan.executionMetadata,
        summary_after: refreshedContext.diagnostics.summary,
        run: repairRun,
      };
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin import-registryä ei voitu korjata.');
    }
  }

  async listDraftPackageImportRuns(draftPackageId: string): Promise<TenderDraftPackageImportRun[]> {
    try {
      const existingDraftPackageRow = await fetchTenderDraftPackageRowById(draftPackageId);

      if (!existingDraftPackageRow) {
        throw new Error('Luonnospakettia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(existingDraftPackageRow.tender_package_id);
      const rows = await fetchTenderDraftPackageImportRunRowsForDraftPackage({ draftPackageId });
      return rows.map(mapTenderDraftPackageImportRunRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospaketin import-ajohistoriaa ei voitu ladata.');
    }
  }

  async markDraftPackageImported(
    draftPackageId: string,
    importedQuoteId: string,
    importStatus: TenderDraftPackageImportStatus = 'imported',
  ) {
    try {
      const existingDraftPackageRow = await fetchTenderDraftPackageRowById(draftPackageId);

      if (!existingDraftPackageRow) {
        throw new Error('Luonnospakettia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(existingDraftPackageRow.tender_package_id);
      const actorUserId = await getAuthenticatedActorUserId();
      const client = requireConfiguredSupabase();
      const updated = await updateTenderDraftPackageImportState({
        client,
        draftPackageId,
        patch: {
          import_status: importStatus,
          reimport_status: importStatus === 'imported' ? 'up_to_date' : 'import_failed',
          import_revision: existingDraftPackageRow.import_revision + (importStatus === 'imported' ? 1 : 0),
          imported_quote_id: importStatus === 'imported' ? importedQuoteId : existingDraftPackageRow.imported_quote_id,
          imported_by_user_id: importStatus === 'imported' ? actorUserId : existingDraftPackageRow.imported_by_user_id,
          imported_at: importStatus === 'imported' ? new Date().toISOString() : existingDraftPackageRow.imported_at,
        },
      });

      this.emit();
      return updated;
    } catch (error) {
      throw toRepositoryError(error, 'Luonnospakettia ei voitu merkitä importoiduksi.');
    }
  }

  async importDraftPackageToEditor(draftPackageId: string): Promise<TenderEditorImportResult> {
    return this.applyDraftPackageImportToEditor(draftPackageId, null, 'import');
  }

  async reimportDraftPackageToEditor(
    draftPackageId: string,
    selection?: TenderEditorSelectiveReimportSelection,
  ): Promise<TenderEditorImportResult> {
    return this.applyDraftPackageImportToEditor(draftPackageId, selection ?? null, 'reimport');
  }

  async listReferenceSuggestionsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_reference_suggestions',
        packageId,
        schema: tenderReferenceSuggestionRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin referenssiehdotuksia ei voitu ladata.',
        orderByColumn: 'updated_at',
      });

      return rows.map(mapTenderReferenceSuggestionRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin referenssiehdotuksia ei voitu ladata.');
    }
  }

  async listDraftArtifactsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_draft_artifacts',
        packageId,
        schema: tenderDraftArtifactRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin luonnosartefakteja ei voitu ladata.',
        orderByColumn: 'updated_at',
      });

      return rows.map(mapTenderDraftArtifactRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin luonnosartefakteja ei voitu ladata.');
    }
  }

  async listReviewTasksForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchPackageRows({
        tableName: 'tender_review_tasks',
        packageId,
        schema: tenderReviewTaskRowsSchema,
        fallbackMessage: 'Tarjouspyyntöpaketin tarkistustehtäviä ei voitu ladata.',
        orderByColumn: 'updated_at',
      });

      return rows.map(mapTenderReviewTaskRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin tarkistustehtäviä ei voitu ladata.');
    }
  }

  async updateRequirementWorkflow(requirementId: string, input: UpdateTenderWorkflowInput) {
    return this.updateWorkflowRow({
      tableName: 'tender_requirements',
      rowId: requirementId,
      input,
      schema: tenderRequirementRowSchema,
      mapRow: mapTenderRequirementRowToDomain,
      notFoundMessage: 'Vaatimusta ei löytynyt tai se on jo poistettu.',
      fallbackMessage: 'Vaatimuksen katselmointia ei voitu päivittää.',
    });
  }

  async updateMissingItemWorkflow(missingItemId: string, input: UpdateTenderWorkflowInput) {
    return this.updateWorkflowRow({
      tableName: 'tender_missing_items',
      rowId: missingItemId,
      input,
      schema: tenderMissingItemRowSchema,
      mapRow: mapTenderMissingItemRowToDomain,
      notFoundMessage: 'Puutehavaintoa ei löytynyt tai se on jo poistettu.',
      fallbackMessage: 'Puutehavainnon katselmointia ei voitu päivittää.',
    });
  }

  async updateRiskFlagWorkflow(riskFlagId: string, input: UpdateTenderWorkflowInput) {
    return this.updateWorkflowRow({
      tableName: 'tender_risk_flags',
      rowId: riskFlagId,
      input,
      schema: tenderRiskFlagRowSchema,
      mapRow: mapTenderRiskFlagRowToDomain,
      notFoundMessage: 'Riskihavaintoa ei löytynyt tai se on jo poistettu.',
      fallbackMessage: 'Riskihavainnon katselmointia ei voitu päivittää.',
    });
  }

  async updateReferenceSuggestionWorkflow(referenceSuggestionId: string, input: UpdateTenderWorkflowInput) {
    return this.updateWorkflowRow({
      tableName: 'tender_reference_suggestions',
      rowId: referenceSuggestionId,
      input,
      schema: tenderReferenceSuggestionRowSchema,
      mapRow: mapTenderReferenceSuggestionRowToDomain,
      notFoundMessage: 'Referenssiehdotusta ei löytynyt tai se on jo poistettu.',
      fallbackMessage: 'Referenssiehdotuksen katselmointia ei voitu päivittää.',
    });
  }

  async updateReviewTaskWorkflow(reviewTaskId: string, input: UpdateTenderWorkflowInput) {
    return this.updateWorkflowRow({
      tableName: 'tender_review_tasks',
      rowId: reviewTaskId,
      input,
      schema: tenderReviewTaskRowSchema,
      mapRow: mapTenderReviewTaskRowToDomain,
      notFoundMessage: 'Tarkistustehtävää ei löytynyt tai se on jo poistettu.',
      fallbackMessage: 'Tarkistustehtävän workflow-tilaa ei voitu päivittää.',
      syncLegacyReviewTaskStatus: true,
    });
  }

  async recomputeReferenceSuggestionsForPackage(packageId: string) {
    try {
      const client = requireConfiguredSupabase();
      const packageRow = await assertTenderPackageAccess(packageId);
      const [requirementRows, referenceProfileRows, existingSuggestionRows, resultEvidenceRows] = await Promise.all([
        fetchPackageRows({
          tableName: 'tender_requirements',
          packageId,
          schema: tenderRequirementRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin vaatimuksia ei voitu ladata referenssimatchausta varten.',
          orderByColumn: 'updated_at',
        }),
        fetchTenderReferenceProfileRowsForOrganization({ client, organizationId: packageRow.organization_id }),
        fetchPackageRows({
          tableName: 'tender_reference_suggestions',
          packageId,
          schema: tenderReferenceSuggestionRowsSchema,
          fallbackMessage: 'Tarjouspyyntöpaketin referenssiehdotuksia ei voitu ladata referenssimatchausta varten.',
          orderByColumn: 'updated_at',
        }),
        fetchTenderResultEvidenceRowsForPackage(packageId),
      ]);

      const organizationMatches = buildOrganizationReferenceProfileMatches({
        requirements: requirementRows.map((requirement) => ({
          id: requirement.id,
          title: requirement.title,
          description: requirement.description,
          sourceExcerpt: requirement.source_excerpt,
        })),
        profiles: referenceProfileRows,
      });
      const existingOrganizationSuggestionRows = existingSuggestionRows.filter(
        (row) => row.source_type === 'organization_reference_profile',
      );
      const existingByKey = new Map(
        existingOrganizationSuggestionRows.map((row) => [
          `${row.related_requirement_id ?? ''}:${row.source_reference ?? ''}`,
          row,
        ]),
      );
      const nextKeys = new Set(
        organizationMatches.map((match) => `${match.requirementId}:${match.profileId}`),
      );

      await deleteEvidenceRowsForTargets({
        client,
        packageId,
        targetEntityType: 'reference_suggestion',
        targetEntityIds: existingOrganizationSuggestionRows.map((row) => row.id),
        fallbackMessage: 'Aiemman referenssimatchauksen evidence-rivejä ei voitu tyhjentää.',
      });

      const staleRows = existingOrganizationSuggestionRows.filter(
        (row) => !nextKeys.has(`${row.related_requirement_id ?? ''}:${row.source_reference ?? ''}`),
      );

      if (staleRows.length > 0) {
        const { error: deleteError } = await client
          .from('tender_reference_suggestions')
          .delete()
          .in('id', staleRows.map((row) => row.id));

        if (deleteError) {
          throw deleteError;
        }
      }

      for (const match of organizationMatches) {
        const compositeKey = `${match.requirementId}:${match.profileId}`;
        const existingRow = existingByKey.get(compositeKey);

        if (!existingRow) {
          continue;
        }

        const patch: Record<string, unknown> = {};

        if (existingRow.title !== match.title) {
          patch.title = match.title;
        }

        if ((existingRow.rationale ?? null) !== match.rationale) {
          patch.rationale = match.rationale;
        }

        if ((existingRow.confidence ?? null) !== match.confidence) {
          patch.confidence = match.confidence;
        }

        if (Object.keys(patch).length < 1) {
          continue;
        }

        const { error: updateError } = await client
          .from('tender_reference_suggestions')
          .update(patch)
          .eq('id', existingRow.id);

        if (updateError) {
          throw updateError;
        }
      }

      const newMatches = organizationMatches.filter(
        (match) => !existingByKey.has(`${match.requirementId}:${match.profileId}`),
      );

      await insertPackageRowsIfAny({
        client,
        tableName: 'tender_reference_suggestions',
        rows: newMatches.map((match) => ({
          tender_package_id: packageId,
          related_requirement_id: match.requirementId,
          source_type: 'organization_reference_profile',
          source_reference: match.profileId,
          title: match.title,
          rationale: match.rationale,
          confidence: match.confidence,
        })),
        schema: tenderReferenceSuggestionRowsSchema,
        fallbackMessage: 'Deterministisiä referenssiehdotuksia ei voitu tallentaa paketille.',
      });

      const { data: refreshedData, error: refreshedError } = await client
        .from('tender_reference_suggestions')
        .select('*')
        .eq('tender_package_id', packageId)
        .eq('source_type', 'organization_reference_profile')
        .order('updated_at', { ascending: false });

      if (refreshedError) {
        throw refreshedError;
      }

      const refreshedRows = tenderReferenceSuggestionRowsSchema.parse(refreshedData ?? []);
      const requirementEvidenceRows = resultEvidenceRows.filter(
        (row) => row.target_entity_type === 'requirement',
      );

      await insertReferenceSuggestionEvidenceFromRequirements({
        client,
        packageId,
        suggestionRows: refreshedRows.map((row) => ({
          id: row.id,
          related_requirement_id: row.related_requirement_id,
          confidence: row.confidence,
        })),
        requirementEvidenceRows,
        fallbackMessage: 'Referenssiehdotusten evidence-rivejä ei voitu päivittää.',
      });

      this.emit();
      return this.listReferenceSuggestionsForPackage(packageId);
    } catch (error) {
      throw toRepositoryError(error, 'Organisaation referenssikorpuksen ehdotuksia ei voitu päivittää paketille.');
    }
  }

  async clearAnalysisResultsForPackage(packageId: string) {
    try {
      await this.clearAnalysisResults(packageId, true);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin analyysituloksia ei voitu tyhjentää.');
    }
  }

  async seedPlaceholderAnalysisResults(packageId: string) {
    return this.seedPlaceholderResults(packageId, true);
  }

  async startPlaceholderAnalysis(packageId: string) {
    try {
      const client = requireConfiguredSupabase();

      const { data: responseData, error: invokeError } = await client.functions.invoke(
        TENDER_ANALYSIS_RUNNER_FUNCTION_NAME,
        { body: { tenderPackageId: packageId } },
      );

      if (invokeError) {
        throw new Error(
          typeof invokeError.message === 'string' && invokeError.message
            ? invokeError.message
            : 'Analyysin server-side käynnistys epäonnistui.',
        );
      }

      const response = parseTenderAnalysisRunnerResponse(responseData);

      if (isTenderAnalysisRunnerFailure(response)) {
        throw new Error(
          response.message ?? 'Palvelin hylkäsi analysointipyynnön.',
        );
      }

      this.emit();

      if (!response.analysisJobId) {
        throw new Error('Palvelin ei palauttanut analysointijobin tunnistetta.');
      }

      const completedJob = await this.getLatestAnalysisJobForPackage(packageId);

      if (!completedJob) {
        throw new Error('Analyysijobia ei löytynyt käynnistyksen jälkeen.');
      }

      return completedJob;
    } catch (error) {
      const message = getRepositoryErrorMessage(error, 'Baseline-analyysin suoritus epäonnistui.');
      throw new Error(message);
    }
  }

  async markAnalysisJobRunning(jobId: string) {
    const existingJob = await fetchTenderAnalysisJobRowById(jobId);

    if (!existingJob) {
      throw new Error('Analyysijobia ei löytynyt.');
    }

    const startedAt = existingJob.started_at ?? new Date().toISOString();

    return this.updateAnalysisJob(
      jobId,
      {
        status: 'running',
        started_at: startedAt,
        completed_at: null,
        error_message: null,
      },
      'Analyysijobia ei voitu merkitä käynnissä olevaksi.'
    );
  }

  async markAnalysisJobCompleted(jobId: string) {
    const existingJob = await fetchTenderAnalysisJobRowById(jobId);

    if (!existingJob) {
      throw new Error('Analyysijobia ei löytynyt.');
    }

    const completedAt = new Date().toISOString();

    return this.updateAnalysisJob(
      jobId,
      {
        status: 'completed',
        started_at: existingJob.started_at ?? completedAt,
        completed_at: completedAt,
        error_message: null,
      },
      'Analyysijobia ei voitu merkitä valmiiksi.'
    );
  }

  async markAnalysisJobFailed(jobId: string, errorMessage: string) {
    const existingJob = await fetchTenderAnalysisJobRowById(jobId);

    if (!existingJob) {
      throw new Error('Analyysijobia ei löytynyt.');
    }

    return this.updateAnalysisJob(
      jobId,
      {
        status: 'failed',
        started_at: existingJob.started_at,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      },
      'Analyysijobia ei voitu merkitä epäonnistuneeksi.'
    );
  }

  async uploadTenderDocument(packageId: string, file: File) {
    try {
      const client = requireConfiguredSupabase();
      const packageRow = await assertTenderPackageAccess(packageId);
      const validatedFile = validateTenderDocumentFile(file);
      const documentId = crypto.randomUUID();
      const storagePath = buildTenderDocumentStoragePath({
        organizationId: packageRow.organization_id,
        packageId: packageRow.id,
        documentId,
        fileName: validatedFile.fileName,
      });
      const { data: insertedData, error: insertError } = await client
        .from('tender_documents')
        .insert({
          id: documentId,
          tender_package_id: packageId,
          file_name: validatedFile.fileName,
          mime_type: validatedFile.canonicalMimeType,
          storage_bucket: TENDER_INTELLIGENCE_STORAGE_BUCKET,
          storage_path: storagePath,
          file_size_bytes: validatedFile.fileSizeBytes,
          checksum: null,
          upload_error: null,
          upload_status: 'pending',
          parse_status: 'not-started',
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      const insertedRow = tenderDocumentRowSchema.parse(insertedData);
      const { error: uploadError } = await client.storage.from(TENDER_INTELLIGENCE_STORAGE_BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        contentType: validatedFile.canonicalMimeType,
        upsert: false,
      });

      if (uploadError) {
        const uploadFailureMessage = getRepositoryErrorMessage(
          uploadError,
          `Tiedoston “${validatedFile.fileName}” lataus Storageen epäonnistui.`
        );
        const { data: failedData, error: failedUpdateError } = await client
          .from('tender_documents')
          .update({
            upload_status: 'failed',
            upload_error: uploadFailureMessage,
            parse_status: 'not-started',
          })
          .eq('id', documentId)
          .select('*')
          .single();

        if (failedUpdateError) {
          console.warn('Tender document upload failed and metadata status update also failed.', failedUpdateError);
        }

        this.emit();

        if (failedData) {
          mapTenderDocumentRowToDomain(tenderDocumentRowSchema.parse(failedData));
        }

        throw new Error(uploadFailureMessage);
      }

      const { data: uploadedData, error: uploadedUpdateError } = await client
        .from('tender_documents')
        .update({
          upload_status: 'uploaded',
          upload_error: null,
          parse_status: 'not-started',
        })
        .eq('id', documentId)
        .select('*')
        .single();

      if (uploadedUpdateError) {
        throw uploadedUpdateError;
      }

      this.emit();
      return mapTenderDocumentRowToDomain(tenderDocumentRowSchema.parse(uploadedData ?? insertedRow));
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntödokumentin lataus epäonnistui.');
    }
  }

  async listTenderDocuments(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchTenderDocumentRowsForPackage(packageId);
      return rows.map(mapTenderDocumentRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin dokumenttilistaa ei voitu ladata.');
    }
  }

  async startDocumentExtraction(packageId: string, documentId: string) {
    try {
      const client = requireConfiguredSupabase();
      const documentRow = await fetchTenderDocumentRowById(documentId);

      if (!documentRow) {
        throw new Error('Dokumenttia ei löytynyt tai se on jo poistettu.');
      }

      if (documentRow.tender_package_id !== packageId) {
        throw new Error('Dokumentti ei kuulu valittuun tarjouspyyntöpakettiin.');
      }

      await assertTenderPackageAccess(packageId);

      const { data: responseData, error: invokeError } = await client.functions.invoke(
        TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME,
        { body: { tenderPackageId: packageId, tenderDocumentId: documentId } }
      );

      if (invokeError) {
        throw new Error(
          typeof invokeError.message === 'string' && invokeError.message
            ? invokeError.message
            : 'Dokumentin extractionin server-side käynnistys epäonnistui.'
        );
      }

      const response = parseTenderDocumentExtractionRunnerResponse(responseData);

      if (isTenderDocumentExtractionRunnerRejected(response)) {
        throw new Error(response.message ?? 'Palvelin hylkäsi dokumentin extraction-pyynnön.');
      }

      this.emit();

      const extraction = await this.getDocumentExtractionForDocument(documentId);

      if (!extraction) {
        throw new Error('Dokumentin extraction-riviä ei löytynyt ajon jälkeen.');
      }

      return extraction;
    } catch (error) {
      throw new Error(getRepositoryErrorMessage(error, 'Dokumentin extraction epäonnistui.'));
    }
  }

  async listDocumentExtractionsForPackage(packageId: string) {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchTenderDocumentExtractionRowsForPackage(packageId);
      return rows.map(mapTenderDocumentExtractionRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin extraction-listaa ei voitu ladata.');
    }
  }

  async getDocumentExtractionForDocument(documentId: string) {
    try {
      const documentRow = await fetchTenderDocumentRowById(documentId);

      if (!documentRow) {
        return null;
      }

      await assertTenderPackageAccess(documentRow.tender_package_id);
      const row = await fetchTenderDocumentExtractionRowForDocument(documentId);
      return row ? mapTenderDocumentExtractionRowToDomain(row) : null;
    } catch (error) {
      throw toRepositoryError(error, 'Dokumentin extraction-riviä ei voitu ladata.');
    }
  }

  async listDocumentChunksForDocument(documentId: string) {
    try {
      const documentRow = await fetchTenderDocumentRowById(documentId);

      if (!documentRow) {
        return [];
      }

      await assertTenderPackageAccess(documentRow.tender_package_id);
      const rows = await fetchTenderDocumentChunkRowsForDocument(documentId);
      return rows.map(mapTenderDocumentChunkRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Dokumentin extraction-chunkeja ei voitu ladata.');
    }
  }

  async listEvidenceForPackage(packageId: string): Promise<TenderResultEvidence[]> {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchTenderResultEvidenceRowsForPackage(packageId);
      return rows.map(mapTenderResultEvidenceRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin evidence-rivejä ei voitu ladata.');
    }
  }

  async listEvidenceForTarget(
    packageId: string,
    targetEntityType: TenderResultEvidenceTargetType,
    targetEntityId: string,
  ): Promise<TenderResultEvidence[]> {
    try {
      await assertTenderPackageAccess(packageId);
      const rows = await fetchTenderResultEvidenceRowsForTarget(packageId, targetEntityType, targetEntityId);
      return rows.map(mapTenderResultEvidenceRowToDomain);
    } catch (error) {
      throw toRepositoryError(error, 'Valitun kohteen evidence-rivejä ei voitu ladata.');
    }
  }

  async getExtractionCoverageForPackage(packageId: string): Promise<TenderExtractionCoverage> {
    try {
      await assertTenderPackageAccess(packageId);
      const [documentRows, documentExtractionRows] = await Promise.all([
        fetchTenderDocumentRowsForPackage(packageId),
        fetchTenderDocumentExtractionRowsForPackage(packageId),
      ]);

      return buildTenderExtractionCoverage({
        documents: documentRows.map(mapTenderDocumentRowToDomain),
        documentExtractions: documentExtractionRows.map(mapTenderDocumentExtractionRowToDomain),
      });
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin extraction-kattavuutta ei voitu laskea.');
    }
  }

  async getAnalysisReadinessForPackage(packageId: string): Promise<TenderAnalysisReadiness> {
    try {
      await assertTenderPackageAccess(packageId);
      const [documentRows, documentExtractionRows, analysisJobRows] = await Promise.all([
        fetchTenderDocumentRowsForPackage(packageId),
        fetchTenderDocumentExtractionRowsForPackage(packageId),
        fetchTenderAnalysisJobRowsForPackage(packageId),
      ]);
      const latestAnalysisJob = analysisJobRows
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .map(mapTenderAnalysisJobRowToDomain)[0] ?? null;

      return buildTenderAnalysisReadiness({
        documents: documentRows.map(mapTenderDocumentRowToDomain),
        documentExtractions: documentExtractionRows.map(mapTenderDocumentExtractionRowToDomain),
        latestAnalysisJob,
      });
    } catch (error) {
      throw toRepositoryError(error, 'Tarjouspyyntöpaketin analyysivalmiutta ei voitu laskea.');
    }
  }

  async clearDocumentExtractionForDocument(documentId: string) {
    try {
      const client = requireConfiguredSupabase();
      const documentRow = await fetchTenderDocumentRowById(documentId);

      if (!documentRow) {
        throw new Error('Dokumenttia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(documentRow.tender_package_id);
      await deleteDocumentRows('tender_document_chunks', documentId, 'Dokumentin extraction-chunkeja ei voitu poistaa.');
      await deleteDocumentRows('tender_document_extractions', documentId, 'Dokumentin extraction-riviä ei voitu poistaa.');

      const { error: documentUpdateError } = await client
        .from('tender_documents')
        .update({ parse_status: 'not-started' })
        .eq('id', documentId);

      if (documentUpdateError) {
        throw documentUpdateError;
      }

      this.emit();
    } catch (error) {
      throw toRepositoryError(error, 'Dokumentin extraction-datan tyhjennys epäonnistui.');
    }
  }

  async deleteTenderDocument(documentId: string) {
    try {
      const client = requireConfiguredSupabase();
      const documentRow = await fetchTenderDocumentRowById(documentId);

      if (!documentRow) {
        throw new Error('Dokumenttia ei löytynyt tai se on jo poistettu.');
      }

      await assertTenderPackageAccess(documentRow.tender_package_id);

      if (documentRow.storage_path) {
        const { error: storageDeleteError } = await client.storage.from(documentRow.storage_bucket).remove([documentRow.storage_path]);

        if (storageDeleteError && !isMissingStorageObjectError(storageDeleteError)) {
          throw storageDeleteError;
        }
      }

      const { error: deleteError } = await client.from('tender_documents').delete().eq('id', documentId);

      if (deleteError) {
        throw deleteError;
      }

      this.emit();
    } catch (error) {
      throw toRepositoryError(error, 'Tarjousdokumentin poisto epäonnistui.');
    }
  }

  async getTenderAnalysisStatus(packageId: string) {
    try {
      return await this.getLatestAnalysisJobForPackage(packageId);
    } catch (error) {
      throw toRepositoryError(error, 'Tarjousanalyysin tilaa ei voitu hakea.');
    }
  }

  async getTenderResults(packageId: string) {
    const details = await this.getTenderPackageById(packageId);
    return details?.results ?? null;
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

const repository = new SupabaseTenderIntelligenceRepository();

export function getTenderIntelligenceRepository() {
  return repository;
}