import type { AppLocationState } from '../../../lib/app-routing';
import type {
  QuoteFamilySummary,
  ReportActionItem,
  ReportCustomerSummary,
  ReportProductSummary,
  ReportProjectSummary,
  ReportingModel,
} from '../../../lib/reporting';
import type { Quote, Project } from '../../../lib/types';
import type { ReportingDrillKind } from './ReportingDrilldownMeta';

export interface ReportingDrillRequest {
  kind: ReportingDrillKind;
  title: string;
  ids: string[];
}

export type ReportingDrillState =
  | {
      kind: 'families' | 'family-detail';
      title: string;
      families: QuoteFamilySummary[];
    }
  | {
      kind: 'customers';
      title: string;
      customers: ReportCustomerSummary[];
    }
  | {
      kind: 'projects';
      title: string;
      projects: ReportProjectSummary[];
    };

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function resolveFamiliesByIds(ids: string[], families: QuoteFamilySummary[]) {
  const idSet = new Set(ids);
  return uniqueById(families.filter((family) => idSet.has(family.id)));
}

function resolveCustomersByIds(ids: string[], customers: ReportCustomerSummary[]) {
  const idSet = new Set(ids);
  return uniqueById(customers.filter((customer) => idSet.has(customer.id)));
}

function resolveProjectsByIds(ids: string[], projects: ReportProjectSummary[]) {
  const idSet = new Set(ids);
  return uniqueById(projects.filter((project) => idSet.has(project.id)));
}

function resolveFamilyIdsFromRows(ids: string[], model: ReportingModel) {
  const idSet = new Set(ids);
  return uniqueById(model.rows.filter((row) => idSet.has(row.id)).map((row) => ({ id: row.familyId }))).map((row) => row.id);
}

function resolveFamilyIdsFromProducts(ids: string[], products: ReportProductSummary[]) {
  const idSet = new Set(ids);
  return uniqueById(
    products
      .filter((product) => idSet.has(product.id))
      .flatMap((product) => product.sourceIds.map((id) => ({ id })))
  ).map((family) => family.id);
}

export function countReportingDrillItems(drill: ReportingDrillState | null) {
  if (!drill) {
    return 0;
  }

  switch (drill.kind) {
    case 'customers':
      return drill.customers.length;
    case 'projects':
      return drill.projects.length;
    default:
      return drill.families.length;
  }
}

export function createReportingDrillState(request: ReportingDrillRequest, model: ReportingModel): ReportingDrillState | null {
  switch (request.kind) {
    case 'customers': {
      const customers = resolveCustomersByIds(request.ids, model.customers);
      return customers.length > 0 ? { kind: 'customers', title: request.title, customers } : null;
    }
    case 'projects': {
      const projects = resolveProjectsByIds(request.ids, model.projects);
      return projects.length > 0 ? { kind: 'projects', title: request.title, projects } : null;
    }
    case 'family-detail':
    case 'families': {
      const families = resolveFamiliesByIds(request.ids, model.families);
      return families.length > 0 ? { kind: request.kind, title: request.title, families } : null;
    }
    default:
      return null;
  }
}

export function createReportingActionDrillState(item: ReportActionItem, model: ReportingModel): ReportingDrillState | null {
  switch (item.sourceKind) {
    case 'customers':
      return createReportingDrillState({ kind: 'customers', title: item.title, ids: item.sourceIds }, model);
    case 'projects':
      return createReportingDrillState({ kind: 'projects', title: item.title, ids: item.sourceIds }, model);
    case 'rows':
      return createReportingDrillState(
        {
          kind: 'families',
          title: item.title,
          ids: resolveFamilyIdsFromRows(item.sourceIds, model),
        },
        model,
      );
    case 'products':
      return createReportingDrillState(
        {
          kind: 'families',
          title: item.title,
          ids: resolveFamilyIdsFromProducts(item.sourceIds, model.products),
        },
        model,
      );
    case 'families':
    default:
      return createReportingDrillState({ kind: 'families', title: item.title, ids: item.sourceIds }, model);
  }
}

export function resolveQuoteFamilyNavigationTarget(args: {
  family: QuoteFamilySummary;
  projects: Project[];
  quotes: Quote[];
}): { target: AppLocationState; fallbackReason?: string } {
  const { family, projects, quotes } = args;
  const quote = quotes.find((candidate) => candidate.id === family.latestQuoteId);
  const quoteProjectId = quote?.projectId?.trim();
  if (quote && quoteProjectId) {
    return {
      target: {
        page: 'projects',
        projectId: quoteProjectId,
        quoteId: family.latestQuoteId,
        editor: 'quote',
      },
    };
  }

  const familyProjectId = family.projectId?.trim();
  const project = familyProjectId
    ? projects.find((candidate) => candidate.id === familyProjectId)
    : undefined;
  if (project) {
    return {
      target: {
        page: 'projects',
        projectId: project.id,
      },
      fallbackReason: 'Tarjous ei ole enää saatavilla. Avattiin projektin yleisnäkymä.',
    };
  }

  return {
    target: { page: 'projects' },
    fallbackReason: 'Tarjouksen projekti ei ole enää saatavilla. Avaa projektityötila nähdäksesi ajantasaiset kohteet.',
  };
}