import { useState } from 'react';
import { House, Package, Wrench, ArrowsLeftRight, Folder, FileText, Gear, ChartBar, User, Lock } from '@phosphor-icons/react';
import Dashboard from './components/pages/Dashboard';
import ProductsPage from './components/pages/ProductsPage';
import InstallationGroupsPage from './components/pages/InstallationGroupsPage';
import SubstituteProductsPage from './components/pages/SubstituteProductsPage';
import ProjectsPage from './components/pages/ProjectsPage';
import TermsPage from './components/pages/TermsPage';
import SettingsPage from './components/pages/SettingsPage';
import ReportsPage from './components/pages/ReportsPage';
import { cn } from './lib/utils';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';

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
  const { user, loading, isOwner } = useAuth();

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
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Kirjautuminen vaaditaan</CardTitle>
            <CardDescription>
              Sinun tulee kirjautua sisään GitHub-tilillä käyttääksesi tätä sovellusta.
            </CardDescription>
          </CardHeader>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 flex flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-xl font-semibold text-primary">Laskenta</h1>
        </div>
        <nav className="space-y-1 p-4 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5" weight={isActive ? 'fill' : 'regular'} />
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatarUrl} alt={user.login} />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.login}</p>
              {isOwner ? (
                <Badge variant="secondary" className="text-xs mt-1">Omistaja</Badge>
              ) : (
                <Badge variant="outline" className="text-xs mt-1">Lukuoikeus</Badge>
              )}
            </div>
          </div>
        </div>
      </aside>

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

      <Toaster />
    </div>
  );
}

export default App;
