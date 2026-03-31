import { useState } from 'react';
import { House, Package, Wrench, ArrowsLeftRight, Folder, FileText, Gear, ChartBar } from '@phosphor-icons/react';
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

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card flex-shrink-0">
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-xl font-semibold text-primary">Laskenta</h1>
        </div>
        <nav className="space-y-1 p-4">
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
