import type { Customer, Project, Quote } from '@/lib/types';

import type { CreateTenderPackageInput, TenderPackage } from '../types/tender-intelligence';

export interface TenderPackageCreationFormValues {
  name: string;
  customerId: string;
  projectId: string;
  quoteId: string;
}

export interface TenderPackageLinkLookups {
  customerNameById?: Record<string, string>;
  projectNameById?: Record<string, string>;
  quoteLabelById?: Record<string, string>;
}

export interface TenderPackageLinkItem {
  key: 'customer' | 'project' | 'quote';
  label: string;
  value: string;
}

function normalizeOptionalId(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function fallbackLabel(id: string) {
  return `Tunnus ${id.slice(0, 8)}`;
}

export function buildTenderPackageCreateInput(options: {
  values: TenderPackageCreationFormValues;
  customers: Customer[];
  projects: Project[];
  quotes: Quote[];
}): CreateTenderPackageInput {
  const name = options.values.name.trim();

  if (!name) {
    throw new Error('Anna tarjouspyyntöpaketille nimi.');
  }

  const customerId = normalizeOptionalId(options.values.customerId);
  const projectId = normalizeOptionalId(options.values.projectId);
  const quoteId = normalizeOptionalId(options.values.quoteId);

  const customerById = new Map(options.customers.map((customer) => [customer.id, customer]));
  const projectById = new Map(options.projects.map((project) => [project.id, project]));
  const quoteById = new Map(options.quotes.map((quote) => [quote.id, quote]));

  const customer = customerId ? customerById.get(customerId) ?? null : null;
  const project = projectId ? projectById.get(projectId) ?? null : null;
  const quote = quoteId ? quoteById.get(quoteId) ?? null : null;

  if (customerId && !customer) {
    throw new Error('Valittua asiakasta ei löytynyt enää näkyvistä tiedoista. Valitse asiakas uudelleen.');
  }

  if (projectId && !project) {
    throw new Error('Valittua projektia ei löytynyt enää näkyvistä tiedoista. Valitse projekti uudelleen.');
  }

  if (quoteId && !quote) {
    throw new Error('Valittua tarjousta ei löytynyt enää näkyvistä tiedoista. Valitse tarjous uudelleen.');
  }

  if (project && customer && project.customerId !== customer.id) {
    throw new Error('Valittu projekti ei kuulu valitulle asiakkaalle. Tarkista linkitys ennen tallennusta.');
  }

  if (quote && project && quote.projectId !== project.id) {
    throw new Error('Valittu tarjous ei kuulu valittuun projektiin. Tarkista linkitys ennen tallennusta.');
  }

  const resolvedProject = quote ? projectById.get(quote.projectId) ?? null : project;

  if (quote && !resolvedProject) {
    throw new Error('Valitun tarjouksen projektia ei löytynyt enää näkyvistä tiedoista.');
  }

  const resolvedCustomer = resolvedProject
    ? projectById.get(resolvedProject.id)
      ? customerById.get(resolvedProject.customerId) ?? null
      : null
    : customer;

  return {
    name,
    linkedCustomerId: resolvedCustomer?.id ?? customer?.id ?? null,
    linkedProjectId: resolvedProject?.id ?? null,
    linkedQuoteId: quote?.id ?? null,
  };
}

export function buildTenderPackageLinkItems(
  tenderPackage: Pick<TenderPackage, 'linkedCustomerId' | 'linkedProjectId' | 'linkedQuoteId'>,
  lookups: TenderPackageLinkLookups = {},
): TenderPackageLinkItem[] {
  const items: TenderPackageLinkItem[] = [];

  if (tenderPackage.linkedCustomerId) {
    items.push({
      key: 'customer',
      label: 'Asiakas',
      value: lookups.customerNameById?.[tenderPackage.linkedCustomerId] ?? fallbackLabel(tenderPackage.linkedCustomerId),
    });
  }

  if (tenderPackage.linkedProjectId) {
    items.push({
      key: 'project',
      label: 'Projekti',
      value: lookups.projectNameById?.[tenderPackage.linkedProjectId] ?? fallbackLabel(tenderPackage.linkedProjectId),
    });
  }

  if (tenderPackage.linkedQuoteId) {
    items.push({
      key: 'quote',
      label: 'Tarjous',
      value: lookups.quoteLabelById?.[tenderPackage.linkedQuoteId] ?? fallbackLabel(tenderPackage.linkedQuoteId),
    });
  }

  return items;
}