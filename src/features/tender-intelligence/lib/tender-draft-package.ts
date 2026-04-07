import type {
  TenderDraftExportPayload,
  TenderDraftPackageItem,
  TenderDraftPackageItemType,
  TenderDraftPackageSourceEntityType,
  TenderDraftPackageStatus,
  TenderPackageDetails,
} from '../types/tender-intelligence';
import { TENDER_DRAFT_EXPORT_SCHEMA_VERSION, tenderDraftExportPayloadSchema } from '../types/tender-intelligence';
import { buildTenderDecisionSupport, type TenderDecisionSupportSummary } from './tender-decision-support';

export interface TenderDraftPackageItemSeed {
  itemType: TenderDraftPackageItemType;
  sourceEntityType: TenderDraftPackageSourceEntityType;
  sourceEntityId: string;
  title: string;
  contentMd: string | null;
  sortOrder: number;
  isIncluded: boolean;
}

export interface TenderDraftPackageReadiness {
  acceptedRequirementCount: number;
  acceptedReferenceCount: number;
  resolvedMissingItemCount: number;
  noteCount: number;
  draftArtifactCount: number;
  unresolvedItemCount: number;
  includedItemCount: number;
  excludedItemCount: number;
  canGenerate: boolean;
  blockedReason: string | null;
}

export interface TenderDraftPackageGenerationResult {
  title: string;
  summary: string | null;
  items: TenderDraftPackageItemSeed[];
  exportPayload: TenderDraftExportPayload;
  readiness: TenderDraftPackageReadiness;
}

export interface TenderDraftPackageQualityGate {
  decisionSupport: TenderDecisionSupportSummary;
  canMarkReviewed: boolean;
  reviewBlockedReason: string | null;
  canMarkExported: boolean;
  exportBlockedReason: string | null;
  warnings: string[];
  nextActions: string[];
  importWarning: string | null;
}

interface DraftPayloadOptions {
  title: string;
  summary: string | null;
  status: TenderDraftPackageStatus;
  generatedAt: string;
  generatedByUserId?: string | null;
  sourceTenderPackageId: string;
  sourceAnalysisJobId?: string | null;
  items: Array<Pick<TenderDraftPackageItem, 'itemType' | 'sourceEntityType' | 'sourceEntityId' | 'title' | 'contentMd' | 'isIncluded'>>;
}

function hasAcceptedResolvedState(entity: {
  reviewStatus: string;
  resolutionStatus: string;
}) {
  return entity.reviewStatus === 'accepted' && entity.resolutionStatus === 'resolved';
}

function pushUnique(target: string[], value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return;
  }

  if (!target.includes(normalized)) {
    target.push(normalized);
  }
}

function isIntentionallyOpenReviewNote(entity: {
  reviewStatus: string;
  resolutionStatus: string;
}) {
  return entity.reviewStatus === 'needs_attention' && (entity.resolutionStatus === 'open' || entity.resolutionStatus === 'in_progress');
}

function appendMarkdownSection(sections: string[], title: string, value: string | null | undefined, formatter?: (content: string) => string) {
  const normalized = value?.trim();

  if (!normalized) {
    return;
  }

  sections.push(`## ${title}\n${formatter ? formatter(normalized) : normalized}`);
}

function buildRequirementContent(requirement: TenderPackageDetails['results']['requirements'][number]) {
  const sections: string[] = [];
  appendMarkdownSection(sections, 'Kuvaus', requirement.description);
  appendMarkdownSection(sections, 'Lähdeote', requirement.sourceExcerpt, (content) => `> ${content}`);
  appendMarkdownSection(sections, 'Review note', requirement.reviewNote);
  appendMarkdownSection(sections, 'Ratkaisunote', requirement.resolutionNote);
  return sections.join('\n\n') || null;
}

function buildReferenceContent(
  suggestion: TenderPackageDetails['results']['referenceSuggestions'][number],
  relatedRequirementTitle: string | null,
) {
  const sections: string[] = [];
  appendMarkdownSection(sections, 'Liittyvä vaatimus', relatedRequirementTitle);
  appendMarkdownSection(sections, 'Perustelu', suggestion.rationale);
  appendMarkdownSection(sections, 'Lähdeviite', suggestion.sourceReference);
  appendMarkdownSection(sections, 'Review note', suggestion.reviewNote);
  appendMarkdownSection(sections, 'Ratkaisunote', suggestion.resolutionNote);
  return sections.join('\n\n') || null;
}

function buildMissingItemContent(
  item: TenderPackageDetails['results']['missingItems'][number],
  relatedRequirementTitle: string | null,
) {
  const sections: string[] = [];
  appendMarkdownSection(sections, 'Liittyvä vaatimus', relatedRequirementTitle);
  appendMarkdownSection(sections, 'Kuvaus', item.description);
  appendMarkdownSection(sections, 'Review note', item.reviewNote);
  appendMarkdownSection(sections, 'Ratkaisunote', item.resolutionNote);
  return sections.join('\n\n') || null;
}

function buildReviewTaskContent(task: TenderPackageDetails['results']['reviewTasks'][number]) {
  const sections: string[] = [];
  appendMarkdownSection(sections, 'Kuvaus', task.description);
  appendMarkdownSection(sections, 'Review note', task.reviewNote);
  appendMarkdownSection(sections, 'Ratkaisunote', task.resolutionNote);
  return sections.join('\n\n') || null;
}

function buildDraftArtifactContent(artifact: TenderPackageDetails['results']['draftArtifacts'][number]) {
  const sections: string[] = [];
  appendMarkdownSection(sections, 'Sisältö', artifact.contentMd);
  appendMarkdownSection(sections, 'Review note', artifact.reviewNote);
  appendMarkdownSection(sections, 'Ratkaisunote', artifact.resolutionNote);
  return sections.join('\n\n') || null;
}

export function buildTenderDraftSummary(input: {
  acceptedRequirementCount: number;
  acceptedReferenceCount: number;
  resolvedMissingItemCount: number;
  noteCount: number;
  draftArtifactCount: number;
}) {
  const parts: string[] = [];

  if (input.acceptedRequirementCount > 0) {
    parts.push(`${input.acceptedRequirementCount} hyväksyttyä vaatimusta`);
  }

  if (input.acceptedReferenceCount > 0) {
    parts.push(`${input.acceptedReferenceCount} hyväksyttyä referenssiä`);
  }

  if (input.resolvedMissingItemCount > 0) {
    parts.push(`${input.resolvedMissingItemCount} ratkaistua puutetta`);
  }

  if (input.noteCount > 0) {
    parts.push(`${input.noteCount} editor-notea`);
  }

  if (input.draftArtifactCount > 0) {
    parts.push(`${input.draftArtifactCount} draft artefaktia`);
  }

  return parts.length > 0 ? `Luonnospaketti sisältää ${parts.join(', ')}.` : null;
}

export function buildTenderDraftExportPayload(options: DraftPayloadOptions): TenderDraftExportPayload {
  const includedItems = options.items.filter((item) => item.isIncluded);

  return tenderDraftExportPayloadSchema.parse({
    schema_version: TENDER_DRAFT_EXPORT_SCHEMA_VERSION,
    generated_at: options.generatedAt,
    generated_by_user_id: options.generatedByUserId ?? null,
    source_tender_package_id: options.sourceTenderPackageId,
    source_analysis_job_id: options.sourceAnalysisJobId ?? null,
    metadata: {
      title: options.title,
      summary: options.summary,
      draft_package_status: options.status,
    },
    accepted_requirements: includedItems
      .filter((item) => item.itemType === 'accepted_requirement')
      .map((item) => ({
        source_requirement_id: item.sourceEntityId,
        title: item.title,
        content_md: item.contentMd,
      })),
    selected_references: includedItems
      .filter((item) => item.itemType === 'selected_reference')
      .map((item) => ({
        source_reference_suggestion_id: item.sourceEntityId,
        related_requirement_id: null,
        title: item.title,
        content_md: item.contentMd,
      })),
    resolved_missing_items: includedItems
      .filter((item) => item.itemType === 'resolved_missing_item')
      .map((item) => ({
        source_missing_item_id: item.sourceEntityId,
        related_requirement_id: null,
        title: item.title,
        content_md: item.contentMd,
      })),
    notes_for_editor: includedItems
      .filter((item) => item.itemType === 'review_note' || item.itemType === 'draft_artifact')
      .map((item) => ({
        source_entity_type: item.sourceEntityType,
        source_entity_id: item.sourceEntityId,
        title: item.title,
        content_md: item.contentMd,
      })),
  });
}

export function buildTenderDraftPackageReadiness(packageDetails: TenderPackageDetails): TenderDraftPackageReadiness {
  const acceptedRequirementCount = packageDetails.results.requirements.filter(hasAcceptedResolvedState).length;
  const acceptedReferenceCount = packageDetails.results.referenceSuggestions.filter(hasAcceptedResolvedState).length;
  const resolvedMissingItemCount = packageDetails.results.missingItems.filter((item) => item.status === 'resolved' && hasAcceptedResolvedState(item)).length;
  const noteCount = packageDetails.results.reviewTasks.filter((task) => hasAcceptedResolvedState(task) || isIntentionallyOpenReviewNote(task)).length;
  const draftArtifactCount = packageDetails.results.draftArtifacts.filter((artifact) => artifact.status === 'accepted' || hasAcceptedResolvedState(artifact)).length;
  const includedItemCount = acceptedRequirementCount + acceptedReferenceCount + resolvedMissingItemCount + noteCount + draftArtifactCount;
  const excludedItemCount =
    packageDetails.results.requirements.length +
    packageDetails.results.referenceSuggestions.length +
    packageDetails.results.missingItems.length +
    packageDetails.results.reviewTasks.length +
    packageDetails.results.draftArtifacts.length - includedItemCount;
  const unresolvedItemCount = [
    ...packageDetails.results.requirements,
    ...packageDetails.results.missingItems,
    ...packageDetails.results.riskFlags,
    ...packageDetails.results.referenceSuggestions,
    ...packageDetails.results.reviewTasks,
  ].filter((item) => item.reviewStatus === 'unreviewed' || item.resolutionStatus === 'open' || item.resolutionStatus === 'in_progress').length;
  const canGenerate = includedItemCount > 0 && (acceptedRequirementCount > 0 || acceptedReferenceCount > 0 || draftArtifactCount > 0);

  return {
    acceptedRequirementCount,
    acceptedReferenceCount,
    resolvedMissingItemCount,
    noteCount,
    draftArtifactCount,
    unresolvedItemCount,
    includedItemCount,
    excludedItemCount,
    canGenerate,
    blockedReason: canGenerate
      ? null
      : 'Draft package muodostetaan vasta kun paketissa on vähintään yksi hyväksytty ydinsisältö, kuten vaatimus, referenssi tai hyväksytty draft artefakti.',
  };
}

export function buildTenderDraftPackageQualityGate(options: {
  packageDetails: TenderPackageDetails;
  draftPackageStatus?: TenderDraftPackageStatus | null;
}): TenderDraftPackageQualityGate {
  const readiness = buildTenderDraftPackageReadiness(options.packageDetails);
  const decisionSupport = buildTenderDecisionSupport(options.packageDetails);
  const reviewBlockers: string[] = [];
  const exportBlockers: string[] = [];
  const warnings: string[] = [];

  if (!readiness.canGenerate) {
    pushUnique(reviewBlockers, readiness.blockedReason);
    pushUnique(exportBlockers, readiness.blockedReason);
  }

  if (decisionSupport.operationalRecommendation === 'pending') {
    const pendingReason =
      'Luonnospakettia ei voi kuitata tarkistetuksi ennen kuin päätöstuki perustuu vähintään yhteen analysoituun pakettitulokseen.';
    pushUnique(reviewBlockers, pendingReason);
    pushUnique(exportBlockers, pendingReason);
  }

  if (decisionSupport.criticalCount > 0) {
    const criticalReason =
      decisionSupport.blockingReasons[0]
      ?? 'Päätöstuki tunnistaa edelleen kriittisiä blokkerisignaaleja, joten luonnospakettia ei voi kuitata valmiiksi.';
    pushUnique(reviewBlockers, criticalReason);
    pushUnique(exportBlockers, criticalReason);
  }

  if (options.draftPackageStatus !== 'reviewed' && options.draftPackageStatus !== 'exported') {
    pushUnique(exportBlockers, 'Merkitse luonnospaketti ensin tarkistetuksi ennen viedyksi kuittaamista.');
  }

  if (decisionSupport.warningCount > 0) {
    pushUnique(warnings, decisionSupport.operationalSummary);
  }

  if (decisionSupport.workflowSummary.unreviewed > 0) {
    pushUnique(warnings, `${decisionSupport.workflowSummary.unreviewed} workflow-riviä on vielä tarkistamatta.`);
  }

  if (decisionSupport.stats.openReviewTaskCount > 0) {
    pushUnique(warnings, `${decisionSupport.stats.openReviewTaskCount} avointa review-tehtävää on vielä kesken.`);
  }

  const importWarning = decisionSupport.criticalCount > 0
    ? `Import on teknisesti mahdollinen, mutta päätöstuki tunnistaa edelleen blokkerin: ${decisionSupport.blockingReasons[0] ?? decisionSupport.operationalSummary}`
    : decisionSupport.warningCount > 0
      ? `Import kannattaa tehdä vasta tietoisen päätöksen kanssa: ${decisionSupport.operationalSummary}`
      : null;

  return {
    decisionSupport,
    canMarkReviewed: reviewBlockers.length < 1,
    reviewBlockedReason: reviewBlockers[0] ?? null,
    canMarkExported: exportBlockers.length < 1,
    exportBlockedReason: exportBlockers[0] ?? null,
    warnings,
    nextActions: decisionSupport.nextActions,
    importWarning,
  };
}

export function buildTenderDraftPackageFromReviewedResults(options: {
  packageDetails: TenderPackageDetails;
  generatedAt?: string;
  generatedByUserId?: string | null;
  title?: string;
}): TenderDraftPackageGenerationResult {
  const readiness = buildTenderDraftPackageReadiness(options.packageDetails);
  const requirementTitleById = new Map(options.packageDetails.results.requirements.map((item) => [item.id, item.title]));
  const items: TenderDraftPackageItemSeed[] = [];
  let sortOrder = 0;
  const pushItem = (item: Omit<TenderDraftPackageItemSeed, 'sortOrder'>) => {
    items.push({
      ...item,
      sortOrder,
    });
    sortOrder += 1;
  };

  options.packageDetails.results.requirements.forEach((requirement) => {
    pushItem({
      itemType: 'accepted_requirement',
      sourceEntityType: 'requirement',
      sourceEntityId: requirement.id,
      title: requirement.title,
      contentMd: buildRequirementContent(requirement),
      isIncluded: hasAcceptedResolvedState(requirement),
    });
  });

  options.packageDetails.results.referenceSuggestions.forEach((suggestion) => {
    pushItem({
      itemType: 'selected_reference',
      sourceEntityType: 'reference_suggestion',
      sourceEntityId: suggestion.id,
      title: suggestion.title,
      contentMd: buildReferenceContent(suggestion, suggestion.relatedRequirementId ? requirementTitleById.get(suggestion.relatedRequirementId) ?? null : null),
      isIncluded: hasAcceptedResolvedState(suggestion),
    });
  });

  options.packageDetails.results.missingItems.forEach((item) => {
    pushItem({
      itemType: 'resolved_missing_item',
      sourceEntityType: 'missing_item',
      sourceEntityId: item.id,
      title: item.title,
      contentMd: buildMissingItemContent(item, item.relatedRequirementId ? requirementTitleById.get(item.relatedRequirementId) ?? null : null),
      isIncluded: item.status === 'resolved' && hasAcceptedResolvedState(item),
    });
  });

  options.packageDetails.results.reviewTasks.forEach((task) => {
    pushItem({
      itemType: 'review_note',
      sourceEntityType: 'review_task',
      sourceEntityId: task.id,
      title: task.title,
      contentMd: buildReviewTaskContent(task),
      isIncluded: hasAcceptedResolvedState(task) || isIntentionallyOpenReviewNote(task),
    });
  });

  options.packageDetails.results.draftArtifacts.forEach((artifact) => {
    pushItem({
      itemType: 'draft_artifact',
      sourceEntityType: 'draft_artifact',
      sourceEntityId: artifact.id,
      title: artifact.title,
      contentMd: buildDraftArtifactContent(artifact),
      isIncluded: artifact.status === 'accepted' || hasAcceptedResolvedState(artifact),
    });
  });

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const title = options.title ?? `${options.packageDetails.package.name} / draft package`;
  const summary = buildTenderDraftSummary(readiness);

  return {
    title,
    summary,
    items,
    exportPayload: buildTenderDraftExportPayload({
      title,
      summary,
      status: 'draft',
      generatedAt,
      generatedByUserId: options.generatedByUserId ?? null,
      sourceTenderPackageId: options.packageDetails.package.id,
      sourceAnalysisJobId: options.packageDetails.latestAnalysisJob?.id ?? null,
      items: items.map((item) => ({
        ...item,
        id: item.sourceEntityId,
        draftPackageId: options.packageDetails.package.id,
        createdAt: generatedAt,
        updatedAt: generatedAt,
      })),
    }),
    readiness,
  };
}