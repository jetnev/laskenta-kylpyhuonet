export type AppPage =
  | 'dashboard'
  | 'help'
  | 'projects'
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

export const DEFAULT_APP_PAGE: AppPage = 'dashboard';

const APP_PAGE_PATHS: Record<AppPage, string> = {
  dashboard: '/app/etusivu',
  help: '/app/ohjeet',
  projects: '/app/projektit',
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
