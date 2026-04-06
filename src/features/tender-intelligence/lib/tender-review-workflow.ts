import type {
  TenderDraftArtifact,
  TenderPackageResults,
  TenderReferenceSuggestion,
  TenderRequirement,
  TenderMissingItem,
  TenderResolutionStatus,
  TenderReviewStatus,
  TenderReviewTask,
  TenderReviewTaskStatus,
  TenderRiskFlag,
  UpdateTenderWorkflowInput,
} from '../types/tender-intelligence';

export type TenderReviewableResult =
  | TenderRequirement
  | TenderMissingItem
  | TenderRiskFlag
  | TenderReferenceSuggestion
  | TenderDraftArtifact
  | TenderReviewTask;

export type TenderWorkflowFilter = 'all' | 'unreviewed' | 'open' | 'in_progress' | 'resolved' | 'dismissed' | 'needs_attention';

export interface TenderWorkflowSummary {
  total: number;
  unreviewed: number;
  open: number;
  inProgress: number;
  resolved: number;
  dismissed: number;
  needsAttention: number;
}

export interface TenderWorkflowStateSnapshot {
  reviewStatus: TenderReviewStatus;
  reviewNote?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  resolutionStatus: TenderResolutionStatus;
  resolutionNote?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  assignedToUserId?: string | null;
}

export interface TenderWorkflowMetadataUpdate {
  reviewStatus?: TenderReviewStatus;
  reviewNote?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  resolutionStatus?: TenderResolutionStatus;
  resolutionNote?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  assignedToUserId?: string | null;
}

function normalizeNote(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function getReviewableResults(results: TenderPackageResults): TenderReviewableResult[] {
  return [
    ...results.requirements,
    ...results.missingItems,
    ...results.riskFlags,
    ...results.referenceSuggestions,
    ...results.draftArtifacts,
    ...results.reviewTasks,
  ];
}

export function buildTenderWorkflowSummary(results: TenderPackageResults): TenderWorkflowSummary {
  const items = getReviewableResults(results);

  return {
    total: items.length,
    unreviewed: items.filter((item) => item.reviewStatus === 'unreviewed').length,
    open: items.filter((item) => item.resolutionStatus === 'open').length,
    inProgress: items.filter((item) => item.resolutionStatus === 'in_progress').length,
    resolved: items.filter((item) => item.resolutionStatus === 'resolved').length,
    dismissed: items.filter((item) => item.reviewStatus === 'dismissed').length,
    needsAttention: items.filter((item) => item.reviewStatus === 'needs_attention').length,
  };
}

export function matchesTenderWorkflowFilter(item: TenderReviewableResult, filter: TenderWorkflowFilter) {
  switch (filter) {
    case 'all':
      return true;
    case 'unreviewed':
      return item.reviewStatus === 'unreviewed';
    case 'open':
      return item.resolutionStatus === 'open';
    case 'in_progress':
      return item.resolutionStatus === 'in_progress';
    case 'resolved':
      return item.resolutionStatus === 'resolved';
    case 'dismissed':
      return item.reviewStatus === 'dismissed';
    case 'needs_attention':
      return item.reviewStatus === 'needs_attention';
    default:
      return true;
  }
}

export function getLatestTenderWorkflowNote(item: TenderWorkflowStateSnapshot) {
  const reviewAt = item.reviewedAt ? Date.parse(item.reviewedAt) : Number.NEGATIVE_INFINITY;
  const resolvedAt = item.resolvedAt ? Date.parse(item.resolvedAt) : Number.NEGATIVE_INFINITY;

  if (item.resolutionNote && resolvedAt >= reviewAt) {
    return item.resolutionNote;
  }

  return item.reviewNote ?? item.resolutionNote ?? null;
}

export function syncTenderReviewTaskStatus(resolutionStatus: TenderResolutionStatus): TenderReviewTaskStatus {
  switch (resolutionStatus) {
    case 'open':
      return 'todo';
    case 'in_progress':
      return 'in-review';
    case 'resolved':
    case 'wont_fix':
      return 'done';
    default:
      return 'todo';
  }
}

export function syncTenderDraftArtifactStatus(input: {
  reviewStatus: TenderReviewStatus;
  resolutionStatus: TenderResolutionStatus;
}) {
  if (input.reviewStatus === 'accepted' && input.resolutionStatus === 'resolved') {
    return 'accepted' as const;
  }

  return 'ready-for-review' as const;
}

export function buildTenderWorkflowMetadataUpdate(options: {
  current: TenderWorkflowStateSnapshot;
  input: UpdateTenderWorkflowInput;
  actorUserId: string;
  now: string;
}): TenderWorkflowMetadataUpdate {
  const patch: TenderWorkflowMetadataUpdate = {};

  if (options.input.assignedToUserId !== undefined) {
    patch.assignedToUserId = options.input.assignedToUserId ?? null;
  }

  if (options.input.reviewStatus !== undefined || options.input.reviewNote !== undefined) {
    const nextReviewStatus = options.input.reviewStatus ?? options.current.reviewStatus;

    patch.reviewStatus = nextReviewStatus;
    patch.reviewNote = options.input.reviewNote === undefined ? options.current.reviewNote ?? null : normalizeNote(options.input.reviewNote);

    if (nextReviewStatus === 'unreviewed') {
      patch.reviewedByUserId = null;
      patch.reviewedAt = null;
    } else {
      patch.reviewedByUserId = options.actorUserId;
      patch.reviewedAt = options.now;
    }
  }

  if (options.input.resolutionStatus !== undefined || options.input.resolutionNote !== undefined) {
    const nextResolutionStatus = options.input.resolutionStatus ?? options.current.resolutionStatus;

    patch.resolutionStatus = nextResolutionStatus;
    patch.resolutionNote =
      options.input.resolutionNote === undefined ? options.current.resolutionNote ?? null : normalizeNote(options.input.resolutionNote);

    if (nextResolutionStatus === 'resolved' || nextResolutionStatus === 'wont_fix') {
      patch.resolvedByUserId = options.actorUserId;
      patch.resolvedAt = options.now;
    } else {
      patch.resolvedByUserId = null;
      patch.resolvedAt = null;
    }
  }

  return patch;
}