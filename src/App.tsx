import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowsLeftRight,
  ArrowsClockwise,
  ChartBar,
  DownloadSimple,
  FileText,
  Folder,
  Gear,
  House,
  List,
  MagnifyingGlass,
  Package,
  Receipt,
  Shield,
  SignOut,
  User,
  Wrench,
  X,
} from '@phosphor-icons/react';
import { deriveAccessState } from './lib/access-control';
import { cn } from './lib/utils';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './hooks/use-auth';
import RouteLoadingFallback from './components/RouteLoadingFallback';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { useIsMobile } from './hooks/use-mobile';
import { Button } from './components/ui/button';
import { checkForDesktopUpdates, getDesktopUpdateStatus, isDesktopRuntime, restartDesktopForUpdate, type DesktopUpdateSnapshot } from './lib/desktop-update';
import { toast } from 'sonner';
import Dashboard from './components/pages/Dashboard';
import HelpPage from './components/pages/HelpPage';
import ProductsPage from './components/pages/ProductsPage';
import InstallationGroupsPage from './components/pages/InstallationGroupsPage';
import SubstituteProductsPage from './components/pages/SubstituteProductsPage';
import ProjectsPage from './components/pages/ProjectsPage';
import TermsPage from './components/pages/TermsPage';
import InvoicesPage from './components/pages/InvoicesPage';
import SettingsPage from './components/pages/SettingsPage';
import ReportsPage from './components/pages/ReportsPage';
import LoginPage from './components/LoginPage';
import AccountPage from './components/pages/AccountPage';
import UsersPage from './components/pages/UsersPage';
import LegalDocumentsPage from './components/pages/LegalDocumentsPage';
import LegalAcceptanceGate from './components/legal/LegalAcceptanceGate';
import TenderIntelligencePage from './features/tender-intelligence/pages/TenderIntelligencePage';
import {
  acceptLegalDocuments,
  evaluateLegalAcceptanceState,
  listCurrentUserLegalAcceptances,
  listPublicActiveLegalDocuments,
  type LegalAcceptanceState,
} from './lib/legal';
import { getLegalAcceptanceSubjectKey, sanitizeLegalLoadError, shouldBlockAppForLegalState } from './lib/legal-state-ux';
import {
  buildAppUrl,
  DEFAULT_APP_PAGE,
  normalizePathname,
  resolveAccessibleAppLocation,
  resolveAppLocation,
  resolveAppRoute,
  type AppLocationState,
  type AppPage,
} from './lib/app-routing';
import { applyDocumentMetadata } from './lib/document-metadata';
import { APP_NAME, buildDocumentTitle, getWorkspacePageDescription } from './lib/site-brand';

function App() {
  const [currentPathname, setCurrentPathname] = useState(() => normalizePathname(window.location.pathname));
  const [currentSearch, setCurrentSearch] = useState(() => window.location.search || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [restartingForUpdate, setRestartingForUpdate] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [legalState, setLegalState] = useState<LegalAcceptanceState | null>(null);
  const [legalStateLoading, setLegalStateLoading] = useState(false);
  const [legalStateError, setLegalStateError] = useState<string | null>(null);
  const [legalAcceptanceError, setLegalAcceptanceError] = useState<string | null>(null);
  const [acceptingLegalDocuments, setAcceptingLegalDocuments] = useState(false);
  const [hasResolvedLegalState, setHasResolvedLegalState] = useState(false);
  const [desktopUpdateState, setDesktopUpdateState] = useState<DesktopUpdateSnapshot | null>(null);
  const {
    user,
    loading,
    role,
    organization,
    canManageUsers,
    canManageSharedData,
    canManageLegalDocuments,
    logout,
    requiresPasswordReset,
  } = useAuth();
  const isMobile = useIsMobile();
  const showDesktopUpdateActions = isDesktopRuntime();
  const currentRoute = useMemo(() => resolveAppRoute(currentPathname), [currentPathname]);
  const currentLocation = useMemo(() => resolveAppLocation(currentPathname, currentSearch), [currentPathname, currentSearch]);
  const currentPage = currentLocation.page;
  const legalAcceptanceUserId = user?.id ?? null;
  const legalAcceptanceOrganizationRole = user?.organizationRole ?? null;
  const legalAcceptanceSubjectKey = useMemo(
    () =>
      legalAcceptanceUserId
        ? getLegalAcceptanceSubjectKey({
            id: legalAcceptanceUserId,
            organizationRole: legalAcceptanceOrganizationRole,
          })
        : null,
    [legalAcceptanceOrganizationRole, legalAcceptanceUserId]
  );
  const hasResolvedLegalStateRef = useRef(false);

  const navigateTo = useCallback(
    (
      pathname: string,
      options?: {
        replace?: boolean;
        preserveHash?: boolean;
        preserveSearch?: boolean;
        search?: string;
      }
    ) => {
      const nextUrl = new URL(window.location.href);
      nextUrl.pathname = pathname;

      if (typeof options?.search === 'string') {
        nextUrl.search = options.search;
      } else if (!options?.preserveSearch) {
        nextUrl.search = '';
      }

      if (!options?.preserveHash) {
        nextUrl.hash = '';
      }

      if (options?.replace) {
        window.history.replaceState({}, '', nextUrl);
      } else {
        window.history.pushState({}, '', nextUrl);
      }
      setCurrentPathname(normalizePathname(nextUrl.pathname));
      setCurrentSearch(nextUrl.search);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    },
    []
  );

  const navigateWithinApp = useCallback(
    (location: AppLocationState, options?: { replace?: boolean }) => {
      const nextUrl = buildAppUrl(location);
      const [pathname, search = ''] = nextUrl.split('?');
      navigateTo(pathname, {
        replace: options?.replace,
        search: search ? `?${search}` : '',
      });
    },
    [navigateTo]
  );

  useEffect(() => {
    hasResolvedLegalStateRef.current = hasResolvedLegalState;
  }, [hasResolvedLegalState]);

  const loadLegalState = useCallback(async (options?: { background?: boolean }) => {
    if (!legalAcceptanceUserId) {
      setLegalState(null);
      setLegalStateError(null);
      setLegalAcceptanceError(null);
      setLegalStateLoading(false);
      setHasResolvedLegalState(false);
      return;
    }

    const isBackgroundRefresh = Boolean(options?.background && hasResolvedLegalStateRef.current);

    if (!isBackgroundRefresh) {
      setLegalStateLoading(true);
      setLegalStateError(null);
    }

    try {
      const [documentsResult, acceptancesResult] = await Promise.allSettled([
        listPublicActiveLegalDocuments(),
        listCurrentUserLegalAcceptances(legalAcceptanceUserId),
      ]);

      if (documentsResult.status === 'rejected') {
        throw documentsResult.reason;
      }

      if (acceptancesResult.status === 'rejected') {
        throw acceptancesResult.reason;
      }

      setLegalState(
        evaluateLegalAcceptanceState(documentsResult.value, acceptancesResult.value, {
          organizationRole: legalAcceptanceOrganizationRole,
        })
      );
      setLegalStateError(null);
      setLegalAcceptanceError(null);
      setHasResolvedLegalState(true);
    } catch (error) {
      if (isBackgroundRefresh && hasResolvedLegalStateRef.current) {
        console.error('Legal acceptance state refresh failed, preserving visible view.', error);
        return;
      }

      setLegalState(null);
      setLegalStateError(sanitizeLegalLoadError(error));
      setHasResolvedLegalState(false);
    } finally {
      if (!isBackgroundRefresh) {
        setLegalStateLoading(false);
      }
    }
  }, [legalAcceptanceOrganizationRole, legalAcceptanceUserId]);

  const navigation = useMemo(
    () =>
      [
        { id: 'dashboard' as const, name: 'Etusivu', icon: House, visible: true },
        { id: 'help' as const, name: 'Ohjeet', icon: List, visible: true },
        { id: 'projects' as const, name: 'Projektit', icon: Folder, visible: true },
        { id: 'tender-intelligence' as const, name: 'Tarjousäly', icon: MagnifyingGlass, visible: true },
        { id: 'invoices' as const, name: 'Laskut', icon: Receipt, visible: true },
        { id: 'products' as const, name: 'Tuoterekisteri', icon: Package, visible: true },
        { id: 'installation-groups' as const, name: 'Hintaryhmät', icon: Wrench, visible: true },
        { id: 'substitutes' as const, name: 'Korvaavat tuotteet', icon: ArrowsLeftRight, visible: true },
        { id: 'terms' as const, name: 'Tarjousehdot', icon: FileText, visible: true },
        { id: 'reports' as const, name: 'Raportointi', icon: ChartBar, visible: true },
        { id: 'users' as const, name: 'Käyttäjät', icon: User, visible: canManageUsers },
        { id: 'settings' as const, name: 'Asetukset', icon: Gear, visible: canManageSharedData },
        { id: 'legal' as const, name: 'Sopimusasiat', icon: Shield, visible: canManageLegalDocuments },
        { id: 'account' as const, name: 'Oma tili', icon: User, visible: true },
      ].filter((item) => item.visible),
    [canManageLegalDocuments, canManageSharedData, canManageUsers]
  );

  useEffect(() => {
    const syncRoute = () => {
      setCurrentPathname(normalizePathname(window.location.pathname));
      setCurrentSearch(window.location.search || '');
    };

    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (!user || currentRoute !== 'app') {
      return;
    }

    const pageTitle = navigation.find((item) => item.id === currentPage)?.name || 'Työtila';

    applyDocumentMetadata({
      title: buildDocumentTitle(pageTitle),
      description: getWorkspacePageDescription(currentPage),
      pathname: currentPathname,
      siteUrl: import.meta.env.VITE_SITE_URL?.trim(),
    });
  }, [currentPage, currentPathname, currentRoute, navigation, user]);

  useEffect(() => {
    void loadLegalState({ background: hasResolvedLegalStateRef.current });
  }, [legalAcceptanceSubjectKey, loadLegalState]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      if (currentRoute !== 'app') {
        navigateWithinApp({ page: DEFAULT_APP_PAGE }, { replace: true });
      }
      return;
    }

    if (requiresPasswordReset) {
      if (currentRoute !== 'login') {
        navigateTo('/login', { replace: true, preserveHash: true, preserveSearch: true });
      }
      return;
    }

    if (currentRoute === 'app') {
      navigateTo('/login', { replace: true });
    }
  }, [currentRoute, loading, navigateTo, navigateWithinApp, requiresPasswordReset, user]);

  useEffect(() => {
    if (loading || !user || currentRoute !== 'app') {
      return;
    }

    const nextLocation = resolveAccessibleAppLocation(currentLocation, {
      canManageLegalDocuments,
    });

    if (buildAppUrl(currentLocation) !== buildAppUrl(nextLocation)) {
      navigateWithinApp(nextLocation, { replace: true });
    }
  }, [canManageLegalDocuments, currentLocation, currentRoute, loading, navigateWithinApp, user]);

  useEffect(() => {
    if (!showDesktopUpdateActions) {
      return;
    }

    let mounted = true;
    const refreshDesktopUpdateState = async () => {
      try {
        const state = await getDesktopUpdateStatus();
        if (mounted) {
          setDesktopUpdateState(state);
        }
      } catch {
        // Desktop update status is a convenience only; ignore fetch failures here.
      }
    };

    void refreshDesktopUpdateState();
    const interval = window.setInterval(() => {
      void refreshDesktopUpdateState();
    }, 15_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [showDesktopUpdateActions]);

  const handleCheckForUpdates = async () => {
    if (!showDesktopUpdateActions) {
      toast.info('Päivitysten tarkistus toimii exe-versiossa.');
      return;
    }

    setCheckingForUpdates(true);
    try {
      const state = await checkForDesktopUpdates();
      setDesktopUpdateState(state);

      if (!state.enabled) {
        toast.info('Päivitysfeediä ei ole määritetty.');
        return;
      }

      if (state.status === 'error') {
        toast.error(state.error || 'Päivityksen tarkistus epäonnistui.');
        return;
      }

      if (state.status === 'downloading') {
        toast.info(`Päivitys ${state.latestVersion || ''} löytyi. Lataus alkoi taustalla.`);
        return;
      }

      if (state.status === 'downloaded' || state.needsRestart) {
        toast.success(`Päivitys ${state.downloadedVersion || state.latestVersion || ''} on ladattu.`);
        return;
      }

      toast.info('Uusia päivityksiä ei löytynyt.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Päivityksen tarkistus epäonnistui.');
    } finally {
      setCheckingForUpdates(false);
    }
  };

  const handleRestartForUpdate = async () => {
    setRestartingForUpdate(true);
    try {
      await restartDesktopForUpdate();
      toast.success('Päivitys käynnistyy nyt.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Päivityksen käynnistys epäonnistui.');
      setRestartingForUpdate(false);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Uloskirjautuminen epäonnistui.');
      setSigningOut(false);
    }
  };

  const shouldBlockForLegalState = shouldBlockAppForLegalState({
    hasResolvedState: hasResolvedLegalState,
    loading: legalStateLoading,
    error: legalStateError,
  });

  if (loading) {
    return <RouteLoadingFallback />;
  }

  if (!user) {
    return (
      <>
        <LoginPage onNavigateHome={() => window.location.assign('/')} />
        <Toaster />
      </>
    );
  }

  if (legalStateLoading && shouldBlockForLegalState) {
    return (
      <>
        <RouteLoadingFallback />
        <Toaster />
      </>
    );
  }

  if (legalStateError && shouldBlockForLegalState) {
    return (
      <>
        <div className="min-h-screen bg-[#f5f7fb] px-6 py-10 text-slate-950 sm:py-16">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.4)]">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Sopimusasiakirjojen tarkistus epäonnistui</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Palvelun käyttöä ei jatketa ennen kuin ajantasaiset dokumentit voidaan tarkistaa luotettavasti. Yritä päivittää näkymä tai kirjaudu ulos.
            </p>
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {legalStateError}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => void handleLogout()} disabled={signingOut}>
                {signingOut ? 'Kirjaudutaan ulos...' : 'Kirjaudu ulos'}
              </Button>
              <Button onClick={() => void loadLegalState({ background: false })}>
                Yritä uudelleen
              </Button>
            </div>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  if (legalState?.requires_blocking_acceptance && legalState.pending_source) {
    return (
      <>
        <LegalAcceptanceGate
          organizationName={organization?.name || user.organizationName}
          organizationRole={user.organizationRole}
          pendingDocuments={legalState.pending_documents}
          acceptanceSource={legalState.pending_source}
          submitting={acceptingLegalDocuments}
          error={legalAcceptanceError}
          onAccept={async ({ acceptOnBehalfOfOrganization }) => {
            try {
              setAcceptingLegalDocuments(true);
              setLegalAcceptanceError(null);
              await acceptLegalDocuments({
                documentVersionIds: legalState.pending_documents.map((document) => document.id),
                acceptanceSource: legalState.pending_source || 'reacceptance',
                locale: navigator.language || 'fi-FI',
                userAgent: navigator.userAgent || 'Tuntematon selain',
                acceptOnBehalfOfOrganization,
              });
              await loadLegalState({ background: true });
              toast.success('Hyväksyntä tallennettu. Voit jatkaa palvelun käyttöä.');
            } catch (error) {
              setLegalAcceptanceError(error instanceof Error ? error.message : 'Hyväksyntää ei voitu tallentaa.');
            } finally {
              setAcceptingLegalDocuments(false);
            }
          }}
          onLogout={async () => {
            await handleLogout();
          }}
        />
        <Toaster />
      </>
    );
  }

  const accessState = deriveAccessState({
    platformRole: role,
    organizationRole: user?.organizationRole,
    status: user?.status,
  });
  const roleBadge = {
    label: accessState.roleBadgeLabel,
    variant: accessState.roleBadgeVariant,
  };

  const handleNavigatePage = (page: AppPage) => {
    navigateWithinApp({ page });
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const handleNavigateLocation = (location: AppLocationState, options?: { replace?: boolean }) => {
    navigateWithinApp(location, options);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          'border-r border-border bg-card flex-shrink-0 flex flex-col z-50',
          isMobile ? 'fixed inset-y-0 left-0 w-72 transform transition-transform duration-300 ease-in-out' : 'w-72 relative',
          isMobile && !mobileMenuOpen && '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-6 justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">{APP_NAME}</h1>
            <p className="text-xs text-muted-foreground">{organization?.name || user?.organizationName || APP_NAME}</p>
          </div>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-muted rounded-md">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="space-y-1 p-4 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigatePage(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" weight={isActive ? 'fill' : 'regular'} />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <Badge variant={roleBadge.variant} className="text-xs mt-1">{roleBadge.label}</Badge>
            </div>
          </div>
          {showDesktopUpdateActions && desktopUpdateState?.needsRestart && (
            <Button className="w-full justify-start gap-2" onClick={() => void handleRestartForUpdate()} disabled={restartingForUpdate}>
              <DownloadSimple className={cn('h-4 w-4', restartingForUpdate && 'animate-pulse')} />
              {restartingForUpdate ? 'Käynnistetään...' : 'Päivitä nyt'}
            </Button>
          )}
          {showDesktopUpdateActions && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => void handleCheckForUpdates()} disabled={checkingForUpdates}>
              <ArrowsClockwise className={cn('h-4 w-4', checkingForUpdates && 'animate-spin')} />
              {checkingForUpdates ? 'Tarkistetaan...' : 'Tarkista päivitykset'}
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => void handleLogout()} disabled={signingOut}>
            <SignOut className="h-4 w-4" />
            {signingOut ? 'Kirjaudutaan ulos...' : 'Kirjaudu ulos'}
          </Button>
          {showDesktopUpdateActions && desktopUpdateState?.feedUrl && (
            <div className="space-y-1">
              {desktopUpdateState.needsRestart && (
                <p className="text-xs text-foreground">
                  Versio {desktopUpdateState.downloadedVersion || desktopUpdateState.latestVersion || ''} on ladattu ja valmis asennettavaksi.
                </p>
              )}
              <p className="text-xs text-muted-foreground break-words">
                Päivitysfeedi: {desktopUpdateState.feedUrl}
              </p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {isMobile && (
          <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-3 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-muted rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <List className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-primary truncate">
              {navigation.find((item) => item.id === currentPage)?.name || APP_NAME}
            </h1>
          </header>
        )}

        <main className="flex-1 overflow-auto">
          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigateLocation} />}
          {currentPage === 'help' && <HelpPage onNavigate={handleNavigatePage} />}
          {currentPage === 'projects' && <ProjectsPage routeState={currentLocation} onNavigate={handleNavigateLocation} />}
          {currentPage === 'tender-intelligence' && <TenderIntelligencePage onNavigate={handleNavigateLocation} />}
          {currentPage === 'invoices' && <InvoicesPage routeState={currentLocation} onNavigate={handleNavigateLocation} />}
          {currentPage === 'products' && <ProductsPage />}
          {currentPage === 'installation-groups' && <InstallationGroupsPage />}
          {currentPage === 'substitutes' && <SubstituteProductsPage />}
          {currentPage === 'terms' && <TermsPage />}
          {currentPage === 'legal' && <LegalDocumentsPage />}
          {currentPage === 'reports' && <ReportsPage onNavigate={handleNavigateLocation} />}
          {currentPage === 'users' && <UsersPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'account' && <AccountPage />}
        </main>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
