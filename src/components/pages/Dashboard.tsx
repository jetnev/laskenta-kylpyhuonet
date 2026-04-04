import { ArrowRight, Clock, FileText, FolderOpen, Package, Plus, TrendUp, Wrench } from '@phosphor-icons/react';
import DeadlineNotifications from '../DeadlineNotifications';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useCustomers, useProducts, useProjects, useQuoteRows, useQuotes } from '../../hooks/use-data';
import { calculateQuote, formatCurrency } from '../../lib/calculations';

type DashboardTarget = 'projects' | 'products' | 'installation-groups' | 'reports';

interface DashboardProps {
  onNavigate?: (page: DashboardTarget) => void;
}

function getQuoteStatusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Luonnos';
    case 'sent':
      return 'Lähetetty';
    case 'accepted':
      return 'Hyväksytty';
    case 'rejected':
      return 'Hylätty';
    default:
      return status;
  }
}

function getQuoteStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'accepted':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'sent':
      return 'outline';
    default:
      return 'secondary';
  }
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
  const hasWorkspace = projects.length > 0 || quotes.length > 0 || customers.length > 0;
  const focusQuote = latestQuotes[0];
  const focusProject = latestProjects[0];
  const priorityItems = [
    ...draftsNeedingWork.slice(0, 3).map((quote) => ({
      id: `draft-${quote.id}`,
      title: quote.title,
      detail: quote.rowCount === 0 ? 'Lisää rivit ja tarkista hinnoittelu.' : 'Täydennä voimassaoloaika tai viimeistele yhteenveto.',
      meta: `${quote.projectName} • ${quote.customerName}`,
      tone: 'draft' as const,
    })),
    ...sentQuotes.slice(0, 2).map((quote) => ({
      id: `sent-${quote.id}`,
      title: quote.title,
      detail: 'Seuraa asiakkaan vastausta ja päivitä tila tarvittaessa.',
      meta: `${quote.projectName} • ${quote.customerName}`,
      tone: 'sent' as const,
    })),
  ].slice(0, 4);

  const summaryCards = [
    {
      title: 'Projektit',
      value: projects.length,
      detail: 'Kaikki aktiiviset projektit',
      icon: FolderOpen,
      tone: 'bg-sky-50 text-sky-700 border-sky-100',
    },
    {
      title: 'Tarjoukset',
      value: quotes.length,
      detail: 'Kaikki tilat yhteensä',
      icon: FileText,
      tone: 'bg-violet-50 text-violet-700 border-violet-100',
    },
    {
      title: 'Tuotteet',
      value: products.length,
      detail: 'Tuoterekisterissä',
      icon: Package,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    {
      title: 'Hyväksytty arvo',
      value: formatCurrency(acceptedValue),
      detail: 'Voitetut tarjoukset',
      icon: TrendUp,
      tone: 'bg-amber-50 text-amber-700 border-amber-100',
    },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,360px)]">
        <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
          <div className="flex h-full flex-col gap-6 p-6 sm:p-8">
            {!hasWorkspace ? (
              <>
                <div className="space-y-4">
                  <Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Aloitus</Badge>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Uusi työ alkaa projektista</h1>
                    <p className="max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                      Luo ensin asiakas ja projekti. Sen jälkeen tarjoukset, hintaryhmät ja tuotteet pysyvät samassa työnkulussa ilman erillisiä välivaiheita.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="justify-center gap-2 bg-white text-slate-950 hover:bg-slate-100"
                    onClick={() => onNavigate?.('projects')}
                  >
                    <Plus className="h-4 w-4" />
                    Avaa projektityötila
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-center gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => onNavigate?.('products')}
                  >
                    <Package className="h-4 w-4" />
                    Tuoterekisteri
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-center gap-2 text-slate-200 hover:bg-white/10 hover:text-white"
                    onClick={() => onNavigate?.('installation-groups')}
                  >
                    <Wrench className="h-4 w-4" />
                    Hintaryhmät
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      step: '1',
                      title: 'Luo asiakas ja projekti',
                      description: 'Perusta kohde yhteen paikkaan, jotta tarjoukset pysyvät oikean asiakkaan alla.',
                    },
                    {
                      step: '2',
                      title: 'Rakenna tarjous',
                      description: 'Lisää rivit, kate ja ehdot samassa työtilassa ilman sivupolkuihin eksymistä.',
                    },
                    {
                      step: '3',
                      title: 'Seuraa etenemistä',
                      description: 'Palaa työn alla oleviin tarjouksiin, määräaikoihin ja raportointiin yhdestä näkymästä.',
                    },
                  ].map((item) => (
                    <div key={item.step} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Vaihe {item.step}</div>
                      <p className="mt-3 text-base font-medium text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Työtila</Badge>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Jatka keskeneräisiä tarjouksia</h1>
                    <p className="max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                      Etusivu näyttää nyt vain olennaisen: mitä pitää viimeistellä, mihin kannattaa palata seuraavaksi ja mistä projektityötilaan siirrytään.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="justify-center gap-2 bg-white text-slate-950 hover:bg-slate-100"
                    onClick={() => onNavigate?.('projects')}
                  >
                    Avaa projektit
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-center gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => onNavigate?.('reports')}
                  >
                    <TrendUp className="h-4 w-4" />
                    Raportointi
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Viimeisin tarjous</p>
                    {focusQuote ? (
                      <>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-white">{focusQuote.title}</p>
                          <Badge variant="secondary" className="border-white/10 bg-white/10 text-white">
                            {getQuoteStatusLabel(focusQuote.status)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{focusQuote.projectName} • {focusQuote.customerName}</p>
                        <p className="mt-3 text-sm text-slate-200">Arvo {formatCurrency(focusQuote.total)} • Päivitetty {new Date(focusQuote.updatedAt).toLocaleDateString('fi-FI')}</p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-300">Ensimmäinen tarjous näkyy tässä heti, kun projektille on luotu sisältöä.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Projektifokus</p>
                    {focusProject ? (
                      <>
                        <p className="mt-3 text-lg font-semibold text-white">{focusProject.name}</p>
                        <p className="mt-2 text-sm text-slate-300">{focusProject.site}</p>
                        <p className="mt-3 text-sm text-slate-200">Päivitetty {new Date(focusProject.updatedAt).toLocaleDateString('fi-FI')}</p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-300">Projektityötila alkaa näkyä tässä, kun ensimmäinen kohde on tallennettu.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.4)]">
          <CardHeader className="pb-3">
            <CardTitle>Päivän tilanne</CardTitle>
            <CardDescription>Missä työ vaatii huomiota seuraavaksi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Luonnoksia', value: draftQuotes.length },
                { label: 'Lähetettyjä', value: sentQuotes.length },
                { label: 'Asiakkaita', value: customers.length },
                { label: 'Viimeistele', value: draftsNeedingWork.length },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 shadow-sm">
                  <Clock className="h-4 w-4 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-950">
                    {draftsNeedingWork.length > 0 ? 'Seuraava tärkein työ' : 'Työjono näyttää hallitulta'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {draftsNeedingWork.length > 0
                      ? `${draftsNeedingWork[0].title} tarvitsee vielä viimeistelyä ennen lähettämistä.`
                      : 'Kaikissa luonnoksissa on ainakin perusrakenne valmiina. Seuraavaksi kannattaa siirtyä projektityötilaan ja tarkistaa viimeisin tarjous.'}
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full justify-between" onClick={() => onNavigate?.('projects')}>
              Siirry projektityötilaan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-slate-200/80 shadow-[0_18px_40px_-40px_rgba(15,23,42,0.45)]">
              <CardContent className="flex items-start gap-4 p-5">
                <div className={`rounded-2xl border p-3 ${card.tone}`}>
                  <Icon className="h-5 w-5" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,360px)]">
        <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.4)]">
          <CardHeader className="pb-3">
            <CardTitle>Jatka työskentelyä</CardTitle>
            <CardDescription>Viimeisimmät tarjoukset ja projektit pysyvät samassa näkymässä ilman erillisiä listoja.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={latestQuotes.length > 0 ? 'quotes' : 'projects'} className="gap-4">
              <TabsList className="grid w-full grid-cols-2 md:w-auto">
                <TabsTrigger value="quotes">Viimeisimmät tarjoukset</TabsTrigger>
                <TabsTrigger value="projects">Viimeisimmät projektit</TabsTrigger>
              </TabsList>

              <TabsContent value="quotes" className="space-y-3">
                {latestQuotes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                    Tarjouksia ei ole vielä luotu. Aloita projektityötilasta ja lisää ensimmäinen tarjous sinne.
                  </div>
                ) : (
                  latestQuotes.map((quote) => (
                    <div key={quote.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_30px_-32px_rgba(15,23,42,0.45)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-950">{quote.quoteNumber ? `${quote.quoteNumber} • ${quote.title}` : quote.title}</p>
                            <Badge variant={getQuoteStatusVariant(quote.status)}>{getQuoteStatusLabel(quote.status)}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{quote.projectName} • {quote.customerName}</p>
                          <p className="mt-2 text-xs text-slate-500">Päivitetty {new Date(quote.updatedAt).toLocaleString('fi-FI')}</p>
                        </div>
                        <div className="text-sm font-semibold text-slate-950">{formatCurrency(quote.total)}</div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="projects" className="space-y-3">
                {latestProjects.length === 0 ? (
                  <div className="rounded-3xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                    Projektit näkyvät tässä heti, kun ensimmäinen kohde on tallennettu.
                  </div>
                ) : (
                  latestProjects.map((project) => {
                    const customer = customers.find((item) => item.id === project.customerId);
                    const projectQuoteCount = quoteSummaries.filter((quote) => quote.projectId === project.id).length;
                    return (
                      <div key={project.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_30px_-32px_rgba(15,23,42,0.45)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-950">{project.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{customer?.name || 'Ei asiakasta'} • {project.site}</p>
                            <p className="mt-2 text-xs text-slate-500">Päivitetty {new Date(project.updatedAt).toLocaleString('fi-FI')}</p>
                          </div>
                          <Badge variant="outline">{projectQuoteCount} tarjousta</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.4)]">
            <CardHeader className="pb-3">
              <CardTitle>Seuraavat toimenpiteet</CardTitle>
              <CardDescription>Pidä etusivulla vain muutama aidosti hyödyllinen nosto.</CardDescription>
            </CardHeader>
            <CardContent>
              {priorityItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Ei välittömiä viimeisteltäviä kohteita. Siirry projektityötilaan, kun haluat jatkaa tarjousten muokkausta.
                </div>
              ) : (
                <div className="space-y-3">
                  {priorityItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-950">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                          <p className="mt-2 text-xs text-slate-500">{item.meta}</p>
                        </div>
                        <Badge variant={item.tone === 'draft' ? 'secondary' : 'outline'}>
                          {item.tone === 'draft' ? 'Viimeistele' : 'Seuranta'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DeadlineNotifications />
        </div>
      </div>
    </div>
  );
}
