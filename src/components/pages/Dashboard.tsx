import { Clock, FileText, FolderOpen, Package, Plus, TrendUp, Wrench } from '@phosphor-icons/react';
import DeadlineNotifications from '../DeadlineNotifications';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useCustomers, useProducts, useProjects, useQuoteRows, useQuotes } from '../../hooks/use-data';
import { calculateQuote, formatCurrency } from '../../lib/calculations';

type DashboardTarget = 'projects' | 'products' | 'installation-groups';

interface DashboardProps {
  onNavigate?: (page: DashboardTarget) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { products } = useProducts();
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { customers } = useCustomers();
  const { getRowsForQuote } = useQuoteRows();

  const quoteSummaries = quotes
    .map((quote) => {
      const project = projects.find((item) => item.id === quote.projectId);
      const customer = customers.find((item) => item.id === project?.customerId);
      const rows = getRowsForQuote(quote.id);
      const totals = calculateQuote(quote, rows);
      return {
        ...quote,
        customerName: customer?.name || 'Ei asiakasta',
        projectName: project?.name || 'Tuntematon projekti',
        total: totals.total,
        rowCount: rows.filter((row) => row.mode !== 'section').length,
      };
    })
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  const acceptedValue = quoteSummaries
    .filter((quote) => quote.status === 'accepted')
    .reduce((sum, quote) => sum + quote.total, 0);
  const sentQuotes = quoteSummaries.filter((quote) => quote.status === 'sent');
  const draftQuotes = quoteSummaries.filter((quote) => quote.status === 'draft');
  const draftsNeedingWork = draftQuotes.filter((quote) => quote.rowCount === 0 || !quote.validUntil || quote.total <= 0);
  const latestProjects = [...projects]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6);
  const latestQuotes = quoteSummaries.slice(0, 6);

  const stats = [
    { title: 'Tuotteita', value: products.length, subtitle: 'Tuoterekisterissä', icon: Package, tone: 'text-sky-600 bg-sky-50' },
    { title: 'Projekteja', value: projects.length, subtitle: 'Aktiiviset omat projektit', icon: FolderOpen, tone: 'text-emerald-600 bg-emerald-50' },
    { title: 'Tarjouksia', value: quotes.length, subtitle: 'Kaikki tilat yhteensä', icon: FileText, tone: 'text-violet-600 bg-violet-50' },
    { title: 'Hyväksytty arvo', value: formatCurrency(acceptedValue), subtitle: 'Voitetut tarjoukset', icon: TrendUp, tone: 'text-amber-600 bg-amber-50' },
    { title: 'Viimeistele', value: draftsNeedingWork.length, subtitle: 'Luonnosta odottaa viimeistelyä', icon: Clock, tone: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Etusivu</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Tarjousten työnjono, määräajat ja tärkeimmät tunnusluvut yhdellä silmäyksellä.</p>
        </div>
        <Card className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={() => onNavigate?.('projects')} className="justify-start gap-2"><Plus className="h-4 w-4" /> Uusi projekti</Button>
          <Button variant="outline" onClick={() => onNavigate?.('projects')} className="justify-start gap-2"><FileText className="h-4 w-4" /> Uusi tarjous</Button>
          <Button variant="outline" onClick={() => onNavigate?.('products')} className="justify-start gap-2"><Package className="h-4 w-4" /> Lisää tuote</Button>
          <Button variant="outline" onClick={() => onNavigate?.('installation-groups')} className="justify-start gap-2"><Wrench className="h-4 w-4" /> Hallitse hintaryhmiä</Button>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-5">
              <div className="flex items-start gap-4">
                <div className={`rounded-2xl p-3 ${stat.tone}`}>
                  <Icon className="h-5 w-5" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tarjoukset statuksittain</h2>
              <p className="text-sm text-muted-foreground">Luonnokset, odottavat vastaukset ja hyväksytyt.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('projects')}>Avaa projektit</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Luonnos', value: draftQuotes.length, variant: 'secondary' as const },
              { label: 'Lähetetty', value: sentQuotes.length, variant: 'outline' as const },
              { label: 'Hyväksytty', value: quoteSummaries.filter((quote) => quote.status === 'accepted').length, variant: 'default' as const },
              { label: 'Hylätty', value: quoteSummaries.filter((quote) => quote.status === 'rejected').length, variant: 'destructive' as const },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border bg-muted/20 p-4">
                <Badge variant={item.variant}>{item.label}</Badge>
                <div className="mt-3 text-3xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Viimeistele nämä ensin</h2>
          {draftsNeedingWork.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Kaikki luonnokset näyttävät valmiilta.</div>
          ) : (
            <div className="space-y-3">
              {draftsNeedingWork.slice(0, 5).map((quote) => (
                <div key={quote.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{quote.title}</p>
                      <p className="text-sm text-muted-foreground">{quote.projectName} • {quote.customerName}</p>
                    </div>
                    <Badge variant="secondary">Luonnos</Badge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {quote.rowCount === 0 ? 'Ei rivejä' : `Rivejä ${quote.rowCount}`} • {quote.validUntil ? `Voimassa ${quote.validUntil}` : 'Voimassaoloaika puuttuu'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <DeadlineNotifications />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Viimeisimmät tarjoukset</h2>
              <p className="text-sm text-muted-foreground">Päivitettyjen tarjousten viimeisin tilanne.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('projects')}>Näytä kaikki</Button>
          </div>
          {latestQuotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">Tarjouksia ei ole vielä luotu.</div>
          ) : (
            <div className="space-y-3">
              {latestQuotes.map((quote) => (
                <div key={quote.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{quote.quoteNumber} • {quote.title}</p>
                      <p className="text-sm text-muted-foreground">{quote.projectName} • {quote.customerName}</p>
                    </div>
                    <Badge variant={quote.status === 'accepted' ? 'default' : quote.status === 'rejected' ? 'destructive' : quote.status === 'sent' ? 'outline' : 'secondary'}>
                      {quote.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(quote.updatedAt).toLocaleString('fi-FI')}</span>
                    <strong>{formatCurrency(quote.total)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Viimeisimmät projektit</h2>
              <p className="text-sm text-muted-foreground">Projekti- ja tarjousmäärät uusimmista kohteista.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('projects')}>Projektit</Button>
          </div>
          {latestProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">Projektit näkyvät tässä, kun ensimmäinen kohde on luotu.</div>
          ) : (
            <div className="space-y-3">
              {latestProjects.map((project) => {
                const customer = customers.find((item) => item.id === project.customerId);
                const projectQuoteCount = quoteSummaries.filter((quote) => quote.projectId === project.id).length;
                return (
                  <div key={project.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{customer?.name || 'Ei asiakasta'} • {project.site}</p>
                      </div>
                      <Badge variant="outline">{projectQuoteCount} tarjousta</Badge>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      Päivitetty {new Date(project.updatedAt).toLocaleString('fi-FI')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
