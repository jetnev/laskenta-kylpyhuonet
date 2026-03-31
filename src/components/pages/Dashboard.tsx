import { Package, FolderOpen, FileText, TrendUp } from '@phosphor-icons/react';
import { Card } from '../ui/card';
import { useProducts, useProjects, useQuotes, useCustomers } from '../../hooks/use-data';
import { calculateQuote } from '../../lib/calculations';
import { useQuoteRows } from '../../hooks/use-data';
import DeadlineNotifications from '../DeadlineNotifications';

export default function Dashboard() {
  const { products } = useProducts();
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { customers } = useCustomers();
  const { rows, getRowsForQuote } = useQuoteRows();

  const draftQuotes = quotes.filter(q => q.status === 'draft');
  const sentQuotes = quotes.filter(q => q.status === 'sent');
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted');

  const totalValue = acceptedQuotes.reduce((sum, quote) => {
    const quoteRows = getRowsForQuote(quote.id);
    const calc = calculateQuote(quote, quoteRows);
    return sum + calc.total;
  }, 0);

  const stats = [
    {
      title: 'Tuotteita',
      value: products.length,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Projekteja',
      value: projects.length,
      icon: FolderOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tarjouksia',
      value: quotes.length,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Hyväksytty arvo',
      value: `${(totalValue / 1000).toFixed(0)}k €`,
      icon: TrendUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Etusivu</h1>
        <p className="text-muted-foreground mt-1">Tarjouslaskennan yhteenveto</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} weight="fill" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Luonnokset</h3>
          <div className="text-4xl font-semibold text-primary">{draftQuotes.length}</div>
          <p className="text-sm text-muted-foreground mt-2">Keskeneräistä tarjousta</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Lähetetyt</h3>
          <div className="text-4xl font-semibold text-accent">{sentQuotes.length}</div>
          <p className="text-sm text-muted-foreground mt-2">Odottaa vastausta</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Hyväksytyt</h3>
          <div className="text-4xl font-semibold text-green-600">{acceptedQuotes.length}</div>
          <p className="text-sm text-muted-foreground mt-2">Voitettu tarjous</p>
        </Card>
      </div>

      <DeadlineNotifications />

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Viimeisimmät projektit</h3>
        {projects.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Ei projekteja. Luo ensimmäinen projekti Projektit-sivulta.
          </p>
        ) : (
          <div className="space-y-3">
            {projects.slice(0, 5).map((project) => {
              const customer = customers.find(c => c.id === project.customerId);
              const projectQuotes = quotes.filter(q => q.projectId === project.id);
              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer?.name} • {project.site}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{projectQuotes.length} tarjousta</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString('fi-FI')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
