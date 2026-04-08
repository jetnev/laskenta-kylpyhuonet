import type { Quote, QuoteRow } from './types';

type QuoteReference = Pick<Quote, 'id' | 'projectId'>;
type QuoteRowReference = Pick<QuoteRow, 'id' | 'quoteId'>;

export interface QuoteCascadeDeletionPlan {
  quoteIds: string[];
  rowIds: string[];
  quoteCount: number;
  rowCount: number;
}

export interface ProjectCascadeDeletionPlan extends QuoteCascadeDeletionPlan {
  projectId: string;
}

export interface QuoteCascadeDeletionExecutor {
  deleteRows: (ids: string[]) => void;
  deleteQuote: (id: string) => void;
}

export interface ProjectCascadeDeletionExecutor extends QuoteCascadeDeletionExecutor {
  deleteProject: (id: string) => void;
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function formatQuoteDeleteCount(count: number) {
  return count === 1 ? '1 tarjouksen' : `${count} tarjousta`;
}

function formatRowDeleteCount(count: number) {
  return count === 1 ? '1 rivin' : `${count} riviä`;
}

export function buildQuotesCascadeDeletionPlan(quoteIds: string[], rows: QuoteRowReference[]): QuoteCascadeDeletionPlan {
  const normalizedQuoteIds = uniqueIds(quoteIds);
  const quoteIdSet = new Set(normalizedQuoteIds);
  const rowIds = uniqueIds(rows.filter((row) => quoteIdSet.has(row.quoteId)).map((row) => row.id));

  return {
    quoteIds: normalizedQuoteIds,
    rowIds,
    quoteCount: normalizedQuoteIds.length,
    rowCount: rowIds.length,
  };
}

export function buildQuoteCascadeDeletionPlan(quoteId: string, rows: QuoteRowReference[]): QuoteCascadeDeletionPlan {
  return buildQuotesCascadeDeletionPlan([quoteId], rows);
}

export function buildProjectCascadeDeletionPlan(
  projectId: string,
  quotes: QuoteReference[],
  rows: QuoteRowReference[],
): ProjectCascadeDeletionPlan {
  const projectQuoteIds = uniqueIds(
    quotes.filter((quote) => quote.projectId === projectId).map((quote) => quote.id),
  );
  const quotePlan = buildQuotesCascadeDeletionPlan(projectQuoteIds, rows);

  return {
    projectId,
    ...quotePlan,
  };
}

export function buildQuoteCascadeDeleteConfirmMessage(plan: QuoteCascadeDeletionPlan) {
  if (plan.rowCount === 0) {
    return 'Haluatko varmasti poistaa tarjouksen?';
  }

  return `Haluatko varmasti poistaa tarjouksen? Tämä poistaa myös ${formatRowDeleteCount(plan.rowCount)}.`;
}

export function buildBulkQuoteCascadeDeleteConfirmMessage(plan: QuoteCascadeDeletionPlan) {
  if (plan.quoteCount === 0) {
    return 'Haluatko varmasti poistaa tarjoukset?';
  }

  if (plan.rowCount === 0) {
    return `Haluatko varmasti poistaa ${formatQuoteDeleteCount(plan.quoteCount)}?`;
  }

  return `Haluatko varmasti poistaa ${formatQuoteDeleteCount(plan.quoteCount)}? Tämä poistaa myös ${formatRowDeleteCount(plan.rowCount)}.`;
}

export function buildProjectCascadeDeleteConfirmMessage(plan: ProjectCascadeDeletionPlan) {
  if (plan.quoteCount === 0) {
    return 'Haluatko varmasti poistaa projektin?';
  }

  return `Haluatko varmasti poistaa projektin? Tämä poistaa myös ${formatQuoteDeleteCount(plan.quoteCount)} ja ${formatRowDeleteCount(plan.rowCount)}.`;
}

export function executeQuoteCascadeDeletion(plan: QuoteCascadeDeletionPlan, executor: QuoteCascadeDeletionExecutor) {
  if (plan.rowIds.length > 0) {
    executor.deleteRows(plan.rowIds);
  }

  plan.quoteIds.forEach((quoteId) => executor.deleteQuote(quoteId));
  return plan;
}

export function executeProjectCascadeDeletion(plan: ProjectCascadeDeletionPlan, executor: ProjectCascadeDeletionExecutor) {
  executeQuoteCascadeDeletion(plan, executor);
  executor.deleteProject(plan.projectId);
  return plan;
}