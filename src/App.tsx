import { useState } from 'react';
import { House, Package, Wrench, ArrowsLeftRight, Folder, FileText, Gear, ChartBar, User, SignOut, List, X } from '@phosphor-icons/react';
import Dashboard from './components/pages/Dashboard';
import ProductsPage from './components/pages/ProductsPage';
import InstallationGroupsPage from './components/pages/InstallationGroupsPage';
import SubstituteProductsPage from './components/pages/SubstituteProductsPage';
import ProjectsPage from './components/pages/ProjectsPage';
import TermsPage from './components/pages/TermsPage';
import SettingsPage from './components/pages/SettingsPage';
import ReportsPage from './components/pages/ReportsPage';
import LoginPage from './components/LoginPage';
import { cn } from './lib/utils';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './hooks/use-auth';
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { useIsMobile } from './hooks/use-mobile';

type Page = 
  | 'dashboard' 
  | 'products' 
  | 'installation-groups' 
  | 'substitutes' 
  | 'projects' 
  | 'terms' 
  | 'settings' 
  | 'reports';

const navigation = [
  { id: 'dashboard' as const, name: 'Etusivu', icon: House },
  { id: 'products' as const, name: 'Tuoterekisteri', icon: Package },
  { id: 'installation-groups' as const, name: 'Hintaryhmät', icon: Wrench },
  { id: 'substitutes' as const, name: 'Korvaavat tuotteet', icon: ArrowsLeftRight },
  { id: 'projects' as const, name: 'Projektit', icon: Folder },
  { id: 'terms' as const, name: 'Ehdot', icon: FileText },
  { id: 'settings' as const, name: 'Asetukset', icon: Gear },
  { id: 'reports' as const, name: 'Raportointi', icon: ChartBar },
];

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, role, canManageUsers } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  const getRoleBadge = () => {
    switch (role) {
      case 'owner':
        return { label: 'Omistaja', variant: 'secondary' as const };
      case 'editor':
        return { label: 'Muokkaaja', variant: 'default' as const };
      case 'viewer':
        return { label: 'Lukija', variant: 'outline' as const };
    }
  };

  const roleBadge = getRoleBadge();

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={cn(
        "border-r border-border bg-card flex-shrink-0 flex flex-col z-50",
        isMobile 
          ? "fixed inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out" 
          : "w-64 relative",
        isMobile && !mobileMenuOpen && "-translate-x-full"
      )}>
        <div className="flex h-16 items-center border-b border-border px-6 justify-between">
          <h1 className="text-xl font-semibold text-primary">Laskenta</h1>
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-muted rounded-md"
            >
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
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" weight={isActive ? 'fill' : 'regular'} />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={user.avatarUrl} alt={user.login} />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.login}</p>
              <Badge variant={roleBadge.variant} className="text-xs mt-1">{roleBadge.label}</Badge>
            </div>
          </div>
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
              {navigation.find(n => n.id === currentPage)?.name || 'Laskenta'}
            </h1>
          </header>
        )}

        <main className="flex-1 overflow-auto">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'products' && <ProductsPage />}
          {currentPage === 'installation-groups' && <InstallationGroupsPage />}
          {currentPage === 'substitutes' && <SubstituteProductsPage />}
          {currentPage === 'projects' && <ProjectsPage />}
          {currentPage === 'terms' && <TermsPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'reports' && <ReportsPage />}
        </main>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
