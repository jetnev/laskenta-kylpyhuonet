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

export interface AppLocationState {
  page: AppPage;
  projectId?: string;
  quoteId?: string;
  invoiceId?: string;
  editor?: AppWorkspaceEditor;
}

export const DEFAULT_APP_PAGE: AppPage = 'dashboard';

const APP_QUERY_PARAM = {
  editor: 'editor',
  invoice: 'invoice',
  project: 'project',
  quote: 'quote',
} as const;

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
    canManageUsers: boolean;
    canManageSharedData: boolean;
  }
) {
  if (!requestedPage) {
    return DEFAULT_APP_PAGE;
  }

  if (requestedPage === 'legal' && !options.canManageUsers) {
    return options.canManageSharedData ? 'settings' : DEFAULT_APP_PAGE;
  }

  return requestedPage;
}

export function resolveAccessibleAppLocation(
  requestedLocation: AppLocationState,
  options: {
    canManageUsers: boolean;
    canManageSharedData: boolean;
  }
) {
  const nextPage = resolveAccessibleAppPage(requestedLocation.page, options);
  return normalizeLocationShape({
    ...requestedLocation,
    page: nextPage,
  });
}
