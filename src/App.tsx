import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Package,
  Shield,
  SignOut,
  User,
  Wrench,
  X,
} from '@phosphor-icons/react';
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
import SettingsPage from './components/pages/SettingsPage';
import ReportsPage from './components/pages/ReportsPage';
import LoginPage from './components/LoginPage';
import AccountPage from './components/pages/AccountPage';
import UsersPage from './components/pages/UsersPage';

type Page =
  | 'dashboard'
  | 'help'
  | 'projects'
  | 'products'
  | 'installation-groups'
  | 'substitutes'
  | 'terms'
  | 'reports'
  | 'users'
  | 'settings'
  | 'account';

type AppRoute = 'login' | 'app';

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/app') {
    return 'app';
  }

  return 'login';
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => resolveAppRoute(window.location.pathname));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [restartingForUpdate, setRestartingForUpdate] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [desktopUpdateState, setDesktopUpdateState] = useState<DesktopUpdateSnapshot | null>(null);
  const { user, loading, role, canManageUsers, canManageSharedData, logout, requiresPasswordReset } = useAuth();
  const isMobile = useIsMobile();
  const showDesktopUpdateActions = isDesktopRuntime();

  const navigateTo = useCallback(
    (
      pathname: '/' | '/login' | '/app',
      options?: { replace?: boolean; preserveHash?: boolean; preserveSearch?: boolean }
    ) => {
      const nextUrl = new URL(window.location.href);
      nextUrl.pathname = pathname;

      if (!options?.preserveSearch) {
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
      setCurrentRoute(resolveAppRoute(nextUrl.pathname));
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    },
    []
  );

  const navigation = useMemo(
    () =>
      [
        { id: 'dashboard' as const, name: 'Etusivu', icon: House, visible: true },
        { id: 'help' as const, name: 'Ohjeet', icon: List, visible: true },
        { id: 'projects' as const, name: 'Projektit', icon: Folder, visible: true },
        { id: 'products' as const, name: 'Tuoterekisteri', icon: Package, visible: true },
        { id: 'installation-groups' as const, name: 'Hintaryhmät', icon: Wrench, visible: true },
        { id: 'substitutes' as const, name: 'Korvaavat tuotteet', icon: ArrowsLeftRight, visible: true },
        { id: 'terms' as const, name: 'Ehdot', icon: FileText, visible: true },
        { id: 'reports' as const, name: 'Raportointi', icon: ChartBar, visible: true },
        { id: 'users' as const, name: 'Käyttäjät', icon: Shield, visible: canManageUsers },
        { id: 'settings' as const, name: 'Asetukset', icon: Gear, visible: canManageSharedData },
        { id: 'account' as const, name: 'Oma tili', icon: User, visible: true },
      ].filter((item) => item.visible),
    [canManageSharedData, canManageUsers]
  );

  useEffect(() => {
    if (!navigation.some((item) => item.id === currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [currentPage, navigation]);

  useEffect(() => {
    const syncRoute = () => {
      setCurrentRoute(resolveAppRoute(window.location.pathname));
    };

    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      if (currentRoute !== 'app') {
        navigateTo('/app', { replace: true });
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
  }, [currentRoute, loading, navigateTo, requiresPasswordReset, user]);

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

  const roleBadge = role === 'admin'
    ? { label: 'Admin', variant: 'default' as const }
    : { label: 'Käyttäjä', variant: 'secondary' as const };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
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
            <h1 className="text-xl font-semibold text-primary">Laskenta</h1>
            <p className="text-xs text-muted-foreground">Tarjouslaskenta</p>
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
                onClick={() => handleNavigate(item.id)}
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
              {navigation.find((item) => item.id === currentPage)?.name || 'Laskenta'}
            </h1>
          </header>
        )}

        <main className="flex-1 overflow-auto">
          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentPage === 'help' && <HelpPage />}
          {currentPage === 'projects' && <ProjectsPage />}
          {currentPage === 'products' && <ProductsPage />}
          {currentPage === 'installation-groups' && <InstallationGroupsPage />}
          {currentPage === 'substitutes' && <SubstituteProductsPage />}
          {currentPage === 'terms' && <TermsPage />}
          {currentPage === 'reports' && <ReportsPage />}
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
