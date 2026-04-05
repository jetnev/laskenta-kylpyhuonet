export type AppPage =
  | 'dashboard'
  | 'help'
  | 'projects'
  | 'tender-intelligence'
  | 'invoices'
  | 'products'
  | 'installation-groups'
  | 'substitutes'
  | 'terms'
  | 'legal'
  | 'reports'
  | 'users'
  | 'settings'
  | 'account';

export type AppRoute = 'login' | 'app';

export type AppWorkspaceEditor = 'quote';
export type TenderIntelligenceHandoffSource = 'quote-editor';
export type TenderIntelligenceHandoffIntent = 'open-source-draft' | 'reimport-managed-import' | 'repair-managed-import';

export interface TenderIntelligenceLocationState {
  source?: TenderIntelligenceHandoffSource;
  tenderPackageId?: string;
  draftPackageId?: string;
  importedQuoteId?: string;
  intent?: TenderIntelligenceHandoffIntent;
  blockIds?: string[];
}

export interface AppLocationState {
  page: AppPage;
  projectId?: string;
  quoteId?: string;
  invoiceId?: string;
  editor?: AppWorkspaceEditor;
  tenderContext?: TenderIntelligenceLocationState;
}

export const DEFAULT_APP_PAGE: AppPage = 'dashboard';

const APP_QUERY_PARAM = {
  blocks: 'blocks',
  draftPackage: 'draftPackage',
  editor: 'editor',
  invoice: 'invoice',
  intent: 'intent',
  importQuote: 'importQuote',
  project: 'project',
  quote: 'quote',
  source: 'source',
  tenderPackage: 'tenderPackage',
} as const;

const TENDER_INTELLIGENCE_HANDOFF_INTENTS = new Set<TenderIntelligenceHandoffIntent>([
  'open-source-draft',
  'reimport-managed-import',
  'repair-managed-import',
]);

const APP_PAGE_PATHS: Record<AppPage, string> = {
  dashboard: '/app/etusivu',
  help: '/app/ohjeet',
  projects: '/app/projektit',
  'tender-intelligence': '/app/tarjousaly',
  invoices: '/app/laskut',
  products: '/app/tuoterekisteri',
  'installation-groups': '/app/hintaryhmat',
  substitutes: '/app/korvaavat-tuotteet',
  terms: '/app/tarjousehdot',
  legal: '/app/juridiset-dokumentit',
  reports: '/app/raportointi',
  users: '/app/kayttajat',
  settings: '/app/asetukset',
  account: '/app/oma-tili',
};

const APP_PAGE_ALIASES: Partial<Record<AppPage, string[]>> = {
  dashboard: ['/app'],
  legal: ['/app/sopimusasiat'],
};

const APP_PAGE_BY_PATH = Object.entries(APP_PAGE_PATHS).reduce<Record<string, AppPage>>((result, [page, path]) => {
  result[path] = page as AppPage;
  return result;
}, {});

Object.entries(APP_PAGE_ALIASES).forEach(([page, aliases]) => {
  aliases?.forEach((alias) => {
    APP_PAGE_BY_PATH[alias] = page as AppPage;
  });
});

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

export function getAppPagePath(page: AppPage) {
  return APP_PAGE_PATHS[page];
}

export function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/app' || normalizedPath.startsWith('/app/')) {
    return 'app';
  }

  return 'login';
}

export function resolveAppPage(pathname: string): AppPage | null {
  const normalizedPath = normalizePathname(pathname);
  return APP_PAGE_BY_PATH[normalizedPath] ?? null;
}

function normalizeEntityId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeTenderIntelligenceBlocks(value?: string[] | null) {
  if (!value || value.length < 1) {
    return undefined;
  }

  const normalized = [...new Set(
    value
      .flatMap((entry) => entry.split(','))
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTenderIntelligenceIntent(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && TENDER_INTELLIGENCE_HANDOFF_INTENTS.has(trimmed as TenderIntelligenceHandoffIntent)
    ? trimmed as TenderIntelligenceHandoffIntent
    : undefined;
}

function normalizeTenderIntelligenceLocationState(state?: TenderIntelligenceLocationState | null) {
  if (!state) {
    return undefined;
  }

  const source = state.source === 'quote-editor' ? 'quote-editor' : undefined;
  const tenderPackageId = normalizeEntityId(state.tenderPackageId);
  const draftPackageId = normalizeEntityId(state.draftPackageId);
  const importedQuoteId = normalizeEntityId(state.importedQuoteId);
  const intent = normalizeTenderIntelligenceIntent(state.intent);
  const blockIds = normalizeTenderIntelligenceBlocks(state.blockIds);

  if (!source && !tenderPackageId && !draftPackageId && !importedQuoteId && !intent && !blockIds) {
    return undefined;
  }

  return {
    source,
    tenderPackageId,
    draftPackageId,
    importedQuoteId,
    intent,
    blockIds,
  } satisfies TenderIntelligenceLocationState;
}

function normalizeLocationShape(state: AppLocationState): AppLocationState {
  if (state.page === 'projects') {
    const projectId = normalizeEntityId(state.projectId);
    const quoteId = projectId ? normalizeEntityId(state.quoteId) : undefined;
    const editor = quoteId && state.editor === 'quote' ? 'quote' : undefined;

    return {
      page: 'projects',
      projectId,
      quoteId,
      editor,
    };
  }

  if (state.page === 'invoices') {
    return {
      page: 'invoices',
      invoiceId: normalizeEntityId(state.invoiceId),
    };
  }

  if (state.page === 'tender-intelligence') {
    return {
      page: 'tender-intelligence',
      tenderContext: normalizeTenderIntelligenceLocationState(state.tenderContext),
    };
  }

  return { page: state.page };
}

export function resolveAppLocation(pathname: string, search = ''): AppLocationState {
  const requestedPage = resolveAppPage(pathname) ?? DEFAULT_APP_PAGE;
  const params = new URLSearchParams(search);

  return normalizeLocationShape({
    page: requestedPage,
    projectId: params.get(APP_QUERY_PARAM.project) ?? undefined,
    quoteId: params.get(APP_QUERY_PARAM.quote) ?? undefined,
    invoiceId: params.get(APP_QUERY_PARAM.invoice) ?? undefined,
    editor: params.get(APP_QUERY_PARAM.editor) === 'quote' ? 'quote' : undefined,
    tenderContext: requestedPage === 'tender-intelligence'
      ? {
          source: params.get(APP_QUERY_PARAM.source) === 'quote-editor' ? 'quote-editor' : undefined,
          tenderPackageId: params.get(APP_QUERY_PARAM.tenderPackage) ?? undefined,
          draftPackageId: params.get(APP_QUERY_PARAM.draftPackage) ?? undefined,
          importedQuoteId: params.get(APP_QUERY_PARAM.importQuote) ?? undefined,
          intent: normalizeTenderIntelligenceIntent(params.get(APP_QUERY_PARAM.intent)),
          blockIds: params.get(APP_QUERY_PARAM.blocks)?.split(',') ?? undefined,
        }
      : undefined,
  });
}

export function buildAppSearch(state: AppLocationState) {
  const normalizedState = normalizeLocationShape(state);
  const params = new URLSearchParams();

  if (normalizedState.page === 'projects') {
    if (normalizedState.projectId) {
      params.set(APP_QUERY_PARAM.project, normalizedState.projectId);
    }

    if (normalizedState.quoteId) {
      params.set(APP_QUERY_PARAM.quote, normalizedState.quoteId);
    }

    if (normalizedState.editor === 'quote') {
      params.set(APP_QUERY_PARAM.editor, 'quote');
    }
  }

  if (normalizedState.page === 'invoices' && normalizedState.invoiceId) {
    params.set(APP_QUERY_PARAM.invoice, normalizedState.invoiceId);
  }

  if (normalizedState.page === 'tender-intelligence' && normalizedState.tenderContext) {
    if (normalizedState.tenderContext.source) {
      params.set(APP_QUERY_PARAM.source, normalizedState.tenderContext.source);
    }

    if (normalizedState.tenderContext.tenderPackageId) {
      params.set(APP_QUERY_PARAM.tenderPackage, normalizedState.tenderContext.tenderPackageId);
    }

    if (normalizedState.tenderContext.draftPackageId) {
      params.set(APP_QUERY_PARAM.draftPackage, normalizedState.tenderContext.draftPackageId);
    }

    if (normalizedState.tenderContext.importedQuoteId) {
      params.set(APP_QUERY_PARAM.importQuote, normalizedState.tenderContext.importedQuoteId);
    }

    if (normalizedState.tenderContext.intent) {
      params.set(APP_QUERY_PARAM.intent, normalizedState.tenderContext.intent);
    }

    if (normalizedState.tenderContext.blockIds && normalizedState.tenderContext.blockIds.length > 0) {
      params.set(APP_QUERY_PARAM.blocks, normalizedState.tenderContext.blockIds.join(','));
    }
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function buildAppUrl(state: AppLocationState) {
  const normalizedState = normalizeLocationShape(state);
  return `${getAppPagePath(normalizedState.page)}${buildAppSearch(normalizedState)}`;
}

export function resolveAccessibleAppPage(
  requestedPage: AppPage | null,
  options: {
    canManageLegalDocuments: boolean;
  }
) {
  if (!requestedPage) {
    return DEFAULT_APP_PAGE;
  }

  if (requestedPage === 'legal' && !options.canManageLegalDocuments) {
    return 'account';
  }

  return requestedPage;
}

export function resolveAccessibleAppLocation(
  requestedLocation: AppLocationState,
  options: {
    canManageLegalDocuments: boolean;
  }
) {
  const nextPage = resolveAccessibleAppPage(requestedLocation.page, options);
  return normalizeLocationShape({
    ...requestedLocation,
    page: nextPage,
  });
}
