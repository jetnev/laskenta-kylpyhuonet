import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import {
  CalendarBlank,
  FilePdf,
  FileXls,
  Warning,
  ArrowRight,
  TrendDown,
  CaretRight,
  Eye,
  Target,
  ChartBar,
  Users,
  ShoppingCart,
  Folder,
  Briefcase,
  ListChecks,
  GitBranch,
  Funnel,
} from '@phosphor-icons/react';
import {
  useProjects,
  useQuotes,
  useQuoteRows,
  useCustomers,
  useDocumentSettings,
  useInvoices,
  useInstallationGroups,
  useProducts,
} from '../../hooks/use-data';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/use-auth';
import { AppPageLayout } from '../layout/AppPageLayout';
import { exportReportsToPDF } from '../../lib/export';
import ReportingDrilldownContent from './reporting/ReportingDrilldownContent';
import { getReportingDrilldownDescription } from './reporting/ReportingDrilldownMeta';
import type { AppLocationState } from '../../lib/app-routing';
import {
  buildReportingModel,
  resolveReportingFilters,
  type ReportingModel,
  type ReportingFilterDraft,
  type QuoteFamilySummary,
  type ReportActionItem,
  type ReportActionGroupKey,
  type ReportBadgeVariant,
} from '../../lib/reporting';
import { selectReportingViewState } from '../../lib/reporting-view-state';

const FMT_CURRENCY = new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const FMT_PERCENT = new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fc(value: number) { return FMT_CURRENCY.format(value); }
function fp(value: number) { return `${FMT_PERCENT.format(value)}\u00a0%`; }
function fd(value: string | Date) { return format(value instanceof Date ? value : new Date(value), 'dd.MM.yyyy', { locale: fi }); }

function badgeVariant(v: ReportBadgeVariant): 'default' | 'secondary' | 'outline' | 'destructive' { return v as 'default' | 'secondary' | 'outline' | 'destructive'; }

function deltaColor(value: number | null) {
  if (value === null) return '';
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return '';
}

function deltaSign(value: number | null) {
  if (value === null) return '\u2013';
  if (value > 0) return `+${fc(value)}`;
  return fc(value);
}

type DrillKind = 'families' | 'family-detail' | 'customers' | 'products' | 'projects';
interface DrillState { kind: DrillKind; title: string; ids: string[]; }

function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground/40 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      {action && <p className="text-sm text-muted-foreground mt-2 font-medium">{action}</p>}
    </div>
  );
}

function ReportsLoadingState() {
  return (
    <AppPageLayout pageType="registry">
      <div>
        <h1 className="text-3xl font-semibold">Raportointi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ladataan raportointinäkymää ensimmäistä kertaa.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-6 text-sm text-muted-foreground">
        Raportin sisältö valmistellaan. Ensimmäisen latauksen jälkeen data pidetään näkyvissä myös taustapäivitysten aikana.
      </Card>
    </AppPageLayout>
  );
}

function KpiCard({ label, value, sub, alert, onClick }: { label: string; value: string; sub?: string; alert?: boolean; onClick?: () => void }) {
  return (
    <Card className={cn('cursor-default transition-colors', onClick && 'cursor-pointer hover:border-primary/40', alert && 'border-amber-300 dark:border-amber-700')} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {alert && <Warning className="h-4 w-4 text-amber-500" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {onClick && <p className="text-xs text-primary mt-1 flex items-center gap-1">Poraudu <CaretRight className="h-3 w-3" /></p>}
      </CardContent>
    </Card>
  );
}

function ActionRow({ item, onDrill }: { item: ReportActionItem; onDrill: (d: DrillState) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onDrill({ kind: item.sourceKind === 'projects' ? 'projects' : item.sourceKind === 'customers' ? 'customers' : 'families', title: item.title, ids: item.sourceIds })}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('h-2 w-2 rounded-full shrink-0', item.severity === 'high' ? 'bg-red-500' : item.severity === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground')} />
          <span className="font-medium text-sm truncate">{item.title}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 tabular-nums">{item.metricLabel}</Badge>
    </div>
  );
}

interface ReportsPageProps {
  onNavigate?: (location: AppLocationState, options?: { replace?: boolean }) => void;
}

export default function ReportsPage({ onNavigate }: ReportsPageProps) {
  const { user, users, canManageUsers } = useAuth();
  const { projects, projectsLoaded } = useProjects();
  const { quotes, quotesLoaded } = useQuotes();
  const { rows, rowsLoaded } = useQuoteRows();
  const { customers, customersLoaded } = useCustomers();
  const { invoices, invoicesLoaded } = useInvoices();
  const { products, productsLoaded } = useProducts();
  const { groups: installationGroups, groupsLoaded } = useInstallationGroups();
  const { documentSettings } = useDocumentSettings();

  const [filterDraft, setFilterDraft] = useState<ReportingFilterDraft>({});
  const [drill, setDrill] = useState<DrillState | null>(null);

  const updateFilter = useCallback(<K extends keyof ReportingFilterDraft>(key: K, value: ReportingFilterDraft[K]) => {
    setFilterDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const responsibleUsers = useMemo(
    () => [user, ...users].filter((c): c is NonNullable<typeof user> => Boolean(c)).filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i).map((c) => ({ id: c.id, displayName: c.displayName })).sort((a, b) => a.displayName.localeCompare(b.displayName, 'fi')),
    [user, users]
  );

  const resolvedFilters = useMemo(
    () => resolveReportingFilters({ filters: filterDraft, canManageUsers, currentUserId: user?.id }),
    [filterDraft, canManageUsers, user?.id]
  );

  const liveModel: ReportingModel = useMemo(
    () => buildReportingModel({ quotes, quoteRows: rows, projects, customers, invoices, products, installationGroups, users: responsibleUsers, filters: resolvedFilters }),
    [quotes, rows, projects, customers, invoices, products, installationGroups, responsibleUsers, resolvedFilters]
  );

  const [stableModel, setStableModel] = useState<ReportingModel | null>(null);

  const datasetsLoaded = projectsLoaded
    && quotesLoaded
    && rowsLoaded
    && customersLoaded
    && invoicesLoaded
    && productsLoaded
    && groupsLoaded;

  useEffect(() => {
    if (!datasetsLoaded) {
      return;
    }

    setStableModel(liveModel);
  }, [datasetsLoaded, liveModel]);

  const { model: resolvedModel, isInitialLoading, isRefreshing } = useMemo(
    () => selectReportingViewState({ datasetsLoaded, liveModel, stableModel }),
    [datasetsLoaded, liveModel, stableModel]
  );
  const model = resolvedModel ?? liveModel;
  const shouldShowInitialLoading = !resolvedModel || isInitialLoading;

  const openDrill = useCallback((d: DrillState) => setDrill(d), []);
  const closeDrill = useCallback(() => setDrill(null), []);

  const openQuoteFromDrill = useCallback((family: QuoteFamilySummary) => {
    closeDrill();
    onNavigate?.({
      page: 'projects',
      projectId: family.projectId,
      quoteId: family.latestQuoteId,
      editor: 'quote',
    });
  }, [closeDrill, onNavigate]);

  const drillFamilies = useMemo(() => {
    if (!drill || (drill.kind !== 'families' && drill.kind !== 'family-detail')) return [];
    const idSet = new Set(drill.ids);
    return model.families.filter((f) => idSet.has(f.id));
  }, [drill, model.families]);

  const drillCustomers = useMemo(() => {
    if (!drill || drill.kind !== 'customers') return [];
    const idSet = new Set(drill.ids);
    return model.customers.filter((c) => idSet.has(c.id));
  }, [drill, model.customers]);

  const drillProjects = useMemo(() => {
    if (!drill || drill.kind !== 'projects') return [];
    const idSet = new Set(drill.ids);
    return model.projects.filter((p) => idSet.has(p.id));
  }, [drill, model.projects]);

  const drillCount = drill?.kind === 'customers'
    ? drillCustomers.length
    : drill?.kind === 'projects'
      ? drillProjects.length
      : drillFamilies.length;

  const exportToPDF = useCallback(() => {
    try {
      const kpiData = {
        totalProjects: model.projects.length, totalQuotes: model.meta.filteredFamilies,
        sentQuotes: model.statusSummary.find((s) => s.status === 'sent')?.count || 0,
        acceptedQuotes: model.statusSummary.find((s) => s.status === 'accepted')?.count || 0,
        rejectedQuotes: model.statusSummary.find((s) => s.status === 'rejected')?.count || 0,
        draftQuotes: model.statusSummary.find((s) => s.status === 'draft')?.count || 0,
        acceptanceRate: model.kpis.acceptanceRatePercent,
        totalValue: model.kpis.openQuoteBookValue,
        totalMargin: model.kpis.openQuoteBookValue * (model.kpis.averageMarginPercent / 100),
        marginPercent: model.kpis.averageMarginPercent,
      };
      exportReportsToPDF({
        periodLabel: 'Raportointi', generatedAt: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: fi }),
        kpiData, statusData: model.statusSummary.filter((s) => s.count > 0).map((s) => ({ name: s.label, value: s.count, color: '#666' })),
        monthlyData: [], topProducts: model.products.slice(0, 15).map((p) => ({ name: p.name, code: p.code, quantity: p.quantity, value: p.value, count: p.sourceIds.length })),
        customerAnalysis: model.customers.slice(0, 15).map((c) => ({ id: c.id, name: c.name, ownerUserId: c.ownerUserId, responsibleUserLabel: c.ownerLabel, projectCount: 0, quoteCount: c.quoteCount, totalValue: c.totalValue, acceptedValue: c.acceptedValue, acceptedCount: c.acceptedCount, sentCount: c.decidedCount, acceptanceRate: c.acceptanceRatePercent })),
        recentProjects: [], settings: documentSettings,
      });
      toast.success('PDF-raportti avattu');
    } catch { toast.error('PDF-vienti epäonnistui'); }
  }, [model, documentSettings]);

  const exportToCSV = useCallback(() => {
    const header = ['Tarjous', 'Asiakas', 'Vastuuhenkilö', 'Status', 'Arvo €', 'Kate %', 'Revisioita', 'Ikä pv', 'Toteuma €', 'Poikkeama €'];
    const csvRows = model.families.map((f) => [f.latestQuoteNumber, f.customerName, f.ownerLabel, f.latestStatusLabel, f.latestSubtotal.toFixed(2), f.latestMarginPercent.toFixed(1), f.revisionCount, f.ageDays, f.actualValue?.toFixed(2) ?? '', f.quoteToActualDelta?.toFixed(2) ?? ''].join('\t'));
    const csv = [header.join('\t'), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raportti_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    link.click();
    toast.success('CSV-raportti ladattu');
  }, [model.families]);

  if (shouldShowInitialLoading) {
    return <ReportsLoadingState />;
  }

  if (!model.meta.hasQuotes && model.customers.length === 0) {
    return (
      <AppPageLayout pageType="registry">
        <h1 className="text-3xl font-semibold mb-2">Raportointi</h1>
        <EmptyState icon={<ChartBar className="h-16 w-16" />} title="Ei vielä riittävästi dataa" description="Raportointi aktivoituu, kun järjestelmässä on asiakkaita, projekteja ja tarjouksia." action="Luo ensimmäinen asiakas ja tarjous aloittaaksesi." />
      </AppPageLayout>
    );
  }

  const allActions = [...model.actions.sales, ...model.actions.margin, ...model.actions.customers, ...model.actions.projects, ...model.actions.data];
  const actionCount = allActions.length;
  const defaultReportTab = actionCount > 0 ? 'actions' : 'overview';

  return (
    <AppPageLayout pageType="registry">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">Raportointi</h1>
            {isRefreshing && <Badge variant="outline">Päivitetään taustalla...</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">Tarjouksesta projektiin — johtamis- ja toimintanäkymä</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageUsers && responsibleUsers.length > 1 && (
            <Select value={filterDraft.ownerUserId || 'all'} onValueChange={(v) => updateFilter('ownerUserId', v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Vastuuhenkilö" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki vastuuhenkilöt</SelectItem>
                {responsibleUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select
            value={filterDraft.quoteStatus || 'all'}
            onValueChange={(value) => updateFilter('quoteStatus', value === 'all' ? undefined : value as ReportingFilterDraft['quoteStatus'])}
          >
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki statukset</SelectItem>
              <SelectItem value="draft">Luonnos</SelectItem>
              <SelectItem value="sent">Lähetetty</SelectItem>
              <SelectItem value="accepted">Hyväksytty</SelectItem>
              <SelectItem value="rejected">Hylätty</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDraft.customerId || 'all'} onValueChange={(v) => updateFilter('customerId', v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Asiakas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki asiakkaat</SelectItem>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(filterDraft.from && 'border-primary')}>
                <CalendarBlank className="mr-2 h-4 w-4" />
                {filterDraft.from && filterDraft.to ? `${fd(filterDraft.from)} – ${fd(filterDraft.to)}` : 'Aikaväli'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={{ from: filterDraft.from, to: filterDraft.to }} onSelect={(range) => { if (range?.from) updateFilter('from', range.from); if (range?.to) updateFilter('to', range.to); }} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          {(filterDraft.from || filterDraft.ownerUserId || filterDraft.quoteStatus || filterDraft.customerId) && (
            <Button variant="ghost" size="sm" onClick={() => setFilterDraft({})}>Tyhjennä</Button>
          )}
          <Button variant="outline" size="sm" onClick={exportToCSV}><FileXls className="mr-1 h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}><FilePdf className="mr-1 h-4 w-4" />PDF</Button>
        </div>
      </div>

      <Tabs defaultValue={defaultReportTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><Eye className="h-4 w-4" />Yleiskatsaus</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5"><ListChecks className="h-4 w-4" />Toimenpiteet{actionCount > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">{actionCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5"><Funnel className="h-4 w-4" />Myynti</TabsTrigger>
          <TabsTrigger value="margin" className="gap-1.5"><Target className="h-4 w-4" />Kate</TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5"><Users className="h-4 w-4" />Asiakkaat</TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5"><ShoppingCart className="h-4 w-4" />Tuotteet</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><Folder className="h-4 w-4" />Projektit</TabsTrigger>
          <TabsTrigger value="revisions" className="gap-1.5"><GitBranch className="h-4 w-4" />Revisiot</TabsTrigger>
        </TabsList>

        {/* YLEISKATSAUS */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="Avoin tarjouskanta" value={fc(model.kpis.openQuoteBookValue)} onClick={() => openDrill({ kind: 'families', title: 'Avoimet tarjoukset', ids: model.families.filter((f) => f.isOpen).map((f) => f.id) })} />
            <KpiCard label="Painotettu ennuste" value={fc(model.kpis.weightedForecastValue)} sub="Statuskohtaisilla painokertoimilla" />
            <KpiCard label="Keskimääräinen kate" value={fp(model.kpis.averageMarginPercent)} />
            <KpiCard label="Hyväksymisaste" value={fp(model.kpis.acceptanceRatePercent)} />
            <KpiCard label="Ilman toimenpidettä 7+ pv" value={String(model.kpis.staleQuotesCount)} alert={model.kpis.staleQuotesCount > 0} onClick={model.kpis.staleQuotesCount > 0 ? () => openDrill({ kind: 'families', title: 'Vanhentuneet tarjoukset', ids: model.families.filter((f) => f.isOpen && f.ageDays > 7).map((f) => f.id) }) : undefined} />
            <KpiCard label="Riskiprojektit" value={String(model.kpis.atRiskProjectsCount)} alert={model.kpis.atRiskProjectsCount > 0} onClick={model.kpis.atRiskProjectsCount > 0 ? () => openDrill({ kind: 'projects', title: 'Riskiprojektit', ids: model.projects.filter((p) => p.riskFlag).map((p) => p.id) }) : undefined} />
          </div>

          {allActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Warning className="h-5 w-5 text-amber-500" />Toimenpiteet nyt</CardTitle>
                <CardDescription>Tärkeimmät huomiot, joihin pitää reagoida.</CardDescription>
              </CardHeader>
              <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{allActions.slice(0, 6).map((a) => <ActionRow key={a.id} item={a} onDrill={openDrill} />)}</div></CardContent>
            </Card>
          )}

          {model.overviewChains.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tarjouksesta projektiin — ketjunäkymä</CardTitle>
                <CardDescription>Viimeisimmät tarjousketjut ja niiden polku asiakkaasta toteumaan.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Asiakas</TableHead><TableHead>Tarjous</TableHead><TableHead className="text-center">Rev.</TableHead><TableHead>Status</TableHead><TableHead>Vastuuhenkilö</TableHead>
                      <TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead>Projektin vaihe</TableHead>
                      <TableHead className="text-right">Toteuma €</TableHead><TableHead className="text-right">Poikkeama</TableHead><TableHead>Huomio</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {model.overviewChains.map((f) => (
                        <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'family-detail', title: f.latestQuoteNumber, ids: [f.id] })}>
                          <TableCell className="font-medium max-w-[140px] truncate">{f.customerName}</TableCell>
                          <TableCell className="font-mono text-sm">{f.latestQuoteNumber}</TableCell>
                          <TableCell className="text-center">{f.revisionCount}</TableCell>
                          <TableCell><Badge variant={badgeVariant(f.latestStatusVariant)}>{f.latestStatusLabel}</Badge></TableCell>
                          <TableCell className="text-sm">{f.ownerLabel}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{fc(f.latestSubtotal)}</TableCell>
                          <TableCell className={cn('text-right font-mono tabular-nums', f.belowTargetMargin && 'text-red-600 dark:text-red-400')}>{fp(f.latestMarginPercent)}</TableCell>
                          <TableCell><Badge variant={badgeVariant(f.projectStageVariant)} className="text-xs">{f.projectStage}</Badge></TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{f.actualValue !== null ? fc(f.actualValue) : '\u2013'}</TableCell>
                          <TableCell className={cn('text-right font-mono tabular-nums', deltaColor(f.quoteToActualDelta))}>{f.quoteToActualDelta !== null ? deltaSign(f.quoteToActualDelta) : '\u2013'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{f.primaryDeviationReason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {model.families.length > model.overviewChains.length && (
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => openDrill({ kind: 'families', title: 'Kaikki tarjousketjut', ids: model.families.map((f) => f.id) })}>
                    Näytä kaikki {model.families.length} ketjua <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TOIMENPITEET */}
        <TabsContent value="actions" className="space-y-6">
          {allActions.length === 0 ? (
            <EmptyState icon={<ListChecks className="h-16 w-16" />} title="Ei avoimia toimenpiteitä" description="Kaikki näyttää hyvältä! Toimenpiteitä syntyy, kun datassa havaitaan puutteita tai riskejä." />
          ) : (
            <div className="space-y-4">
              {(['sales', 'margin', 'customers', 'projects', 'data'] as ReportActionGroupKey[]).map((groupKey) => {
                const items = model.actions[groupKey];
                if (items.length === 0) return null;
                const groupLabel = groupKey === 'sales' ? 'Myynti' : groupKey === 'margin' ? 'Kate' : groupKey === 'customers' ? 'Asiakkaat' : groupKey === 'projects' ? 'Projektit' : 'Data ja puuttuvat tiedot';
                return (<Card key={groupKey}><CardHeader><CardTitle className="text-base">{groupLabel}</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((item) => <ActionRow key={item.id} item={item} onDrill={openDrill} />)}</CardContent></Card>);
              })}
            </div>
          )}
        </TabsContent>

        {/* MYYNTI */}
        <TabsContent value="sales" className="space-y-6">
          {model.meta.filteredFamilies === 0 ? (
            <EmptyState icon={<Funnel className="h-16 w-16" />} title="Ei tarjouksia valituilla suodattimilla" description="Muuta aikaväliä tai poista suodattimia nähdäksesi dataa." />
          ) : (<>
            <Card><CardHeader><CardTitle>Tarjousputki statuksittain</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Määrä</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Painotettu ennuste €</TableHead><TableHead className="text-right">Keskim. kate %</TableHead></TableRow></TableHeader>
              <TableBody>{model.statusSummary.map((s) => (
                <TableRow key={s.status} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'families', title: s.label, ids: s.sourceIds })}>
                  <TableCell><Badge variant={badgeVariant(s.variant)}>{s.label}</Badge></TableCell><TableCell className="text-right tabular-nums">{s.count}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fc(s.value)}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(s.weightedForecast)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fp(s.averageMarginPercent)}</TableCell>
                </TableRow>))}</TableBody></Table>
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Tarjousten ikäjakauma (avoimet)</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Ikäluokka</TableHead><TableHead className="text-right">Määrä</TableHead><TableHead className="text-right">Arvo €</TableHead></TableRow></TableHeader>
              <TableBody>{model.agingSummary.map((a) => (
                <TableRow key={a.bucket} className={cn(a.count > 0 && 'cursor-pointer hover:bg-muted/50')} onClick={a.count > 0 ? () => openDrill({ kind: 'families', title: a.label, ids: a.sourceIds }) : undefined}>
                  <TableCell className="font-medium">{a.label}</TableCell><TableCell className="text-right tabular-nums">{a.count}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(a.value)}</TableCell>
                </TableRow>))}</TableBody></Table>
            </CardContent></Card>

            {model.ownerSummary.length > 0 && (
              <Card><CardHeader><CardTitle>Vastuuhenkilöittäin</CardTitle></CardHeader><CardContent><ScrollArea className="w-full">
                <Table><TableHeader><TableRow><TableHead>Vastuuhenkilö</TableHead><TableHead className="text-right">Tarjouksia</TableHead><TableHead className="text-right">Tarjouskanta €</TableHead><TableHead className="text-right">Hyväksymisaste</TableHead><TableHead className="text-right">Keskim. kate %</TableHead><TableHead className="text-right">Keskim. koko €</TableHead><TableHead className="text-right">Vanhentuneet</TableHead></TableRow></TableHeader>
                <TableBody>{model.ownerSummary.map((o) => (
                  <TableRow key={o.ownerUserId} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'families', title: o.ownerLabel, ids: o.sourceIds })}>
                    <TableCell className="font-medium">{o.ownerLabel}</TableCell><TableCell className="text-right tabular-nums">{o.quoteCount}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(o.quoteValue)}</TableCell><TableCell className="text-right tabular-nums">{fp(o.acceptanceRatePercent)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(o.averageMarginPercent)}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(o.averageQuoteSize)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', o.expiredQuoteCount > 0 && 'text-red-600 dark:text-red-400')}>{o.expiredQuoteCount}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </ScrollArea></CardContent></Card>
            )}
          </>)}
        </TabsContent>

        {/* KATE */}
        <TabsContent value="margin" className="space-y-6">
          {model.meta.filteredFamilies === 0 ? (
            <EmptyState icon={<Target className="h-16 w-16" />} title="Ei katedataa" description="Luo tarjouksia riveineen nähdäksesi kate-analyysin." />
          ) : (<>
            {model.marginByOwner.length > 0 && (
              <Card><CardHeader><CardTitle>Kate vastuuhenkilöittäin</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Vastuuhenkilö</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Kate €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Alle tavoitteen</TableHead></TableRow></TableHeader>
                <TableBody>{model.marginByOwner.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'families', title: m.label, ids: m.sourceIds })}>
                    <TableCell className="font-medium">{m.label}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(m.value)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(m.margin)}</TableCell><TableCell className="text-right tabular-nums">{fp(m.marginPercent)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', m.belowTargetCount > 0 && 'text-red-600 dark:text-red-400 font-medium')}>{m.belowTargetCount}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}

            {model.marginByCustomer.length > 0 && (
              <Card><CardHeader><CardTitle>Kate asiakkaittain</CardTitle><CardDescription>Top-asiakkaat tarjousarvon mukaan</CardDescription></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Asiakas</TableHead><TableHead>Vastuuhenkilö</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Kate €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Alle tavoitteen</TableHead></TableRow></TableHeader>
                <TableBody>{model.marginByCustomer.slice(0, 15).map((m) => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'families', title: m.label, ids: m.sourceIds })}>
                    <TableCell className="font-medium">{m.label}</TableCell><TableCell className="text-sm">{m.ownerLabel}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(m.value)}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(m.margin)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(m.marginPercent)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', m.belowTargetCount > 0 && 'text-red-600 dark:text-red-400 font-medium')}>{m.belowTargetCount}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}

            {model.marginByGroup.length > 0 && (
              <Card><CardHeader><CardTitle>Kate hintaryhmittäin</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Hintaryhmä</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Kate €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Alle tavoitteen</TableHead><TableHead className="text-right">Alitusosuus</TableHead></TableRow></TableHeader>
                <TableBody>{model.marginByGroup.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.label}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(g.value)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(g.margin)}</TableCell><TableCell className="text-right tabular-nums">{fp(g.marginPercent)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', g.belowTargetCount > 0 && 'text-red-600 dark:text-red-400 font-medium')}>{g.belowTargetCount}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', g.underTargetSharePercent >= 40 && 'text-red-600 dark:text-red-400 font-medium')}>{fp(g.underTargetSharePercent)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}

            {model.leakageSummary.some((l) => l.impactValue > 0 || l.occurrenceCount > 0) && (
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendDown className="h-5 w-5 text-red-500" />Katevuoto-analyysi</CardTitle><CardDescription>Mistä kate heikkenee — alennukset, revisiot, ostohinnat ja hintaryhmien alitukset.</CardDescription></CardHeader>
              <CardContent><div className="space-y-3">
                {model.leakageSummary.filter((l) => l.impactValue > 0 || l.occurrenceCount > 0).map((l) => (
                  <div key={l.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className={cn('h-2 w-2 rounded-full shrink-0', l.severity === 'high' ? 'bg-red-500' : l.severity === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground')} /><span className="font-medium text-sm">{l.title}</span></div><p className="text-xs text-muted-foreground">{l.explanation}</p></div>
                    <div className="text-right shrink-0"><div className="font-mono font-bold text-sm tabular-nums text-red-600 dark:text-red-400">{fc(l.impactValue)}</div><div className="text-xs text-muted-foreground">{l.occurrenceCount} tapahtumaa</div></div>
                  </div>))}
              </div></CardContent></Card>
            )}

            {model.lowMarginFamilies.length > 0 && (
              <Card><CardHeader><CardTitle>Tarjoukset alle tavoitekatteen</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Tarjous</TableHead><TableHead>Asiakas</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Tavoite %</TableHead><TableHead className="text-right">Ero</TableHead></TableRow></TableHeader>
                <TableBody>{model.lowMarginFamilies.slice(0, 15).map((f) => (
                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'family-detail', title: f.latestQuoteNumber, ids: [f.id] })}>
                    <TableCell className="font-mono text-sm">{f.latestQuoteNumber}</TableCell><TableCell>{f.customerName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(f.latestSubtotal)}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400 font-medium">{fp(f.latestMarginPercent)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(f.marginTargetPercent)}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">{fp(f.marginGapPercent)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}
          </>)}
        </TabsContent>

        {/* ASIAKKAAT */}
        <TabsContent value="customers" className="space-y-6">
          {model.customers.length === 0 ? (
            <EmptyState icon={<Users className="h-16 w-16" />} title="Ei asiakasdataa" description="Asiakasraportointi aktivoituu, kun tarjouksia on luotu asiakkaille." />
          ) : (<>
            <Card><CardHeader><CardTitle>Asiakkaat tarjousarvon mukaan</CardTitle><CardDescription>Top-asiakas {fp(model.customerConcentration.topCustomerSharePercent)} kokonaisarvosta · Top 5 yhteensä {fp(model.customerConcentration.topFiveSharePercent)}</CardDescription></CardHeader>
            <CardContent><ScrollArea className="w-full">
              <Table><TableHeader><TableRow><TableHead>Asiakas</TableHead><TableHead>Vastuuhenkilö</TableHead><TableHead className="text-right">Tarjouksia</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Hyväks. arvo €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Hyväksymisaste</TableHead><TableHead className="text-right">Keskim. rev.</TableHead><TableHead>Profiili</TableHead></TableRow></TableHeader>
              <TableBody>{model.customers.slice(0, 20).map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'families', title: c.name, ids: c.sourceIds })}>
                  <TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-sm">{c.ownerLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.quoteCount}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(c.totalValue)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-green-600 dark:text-green-400">{fc(c.acceptedValue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fp(c.marginPercent)}</TableCell>
                  <TableCell className="text-right"><Badge variant={c.acceptanceRatePercent >= 50 ? 'default' : 'secondary'}>{fp(c.acceptanceRatePercent)}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{c.averageRevisionCount.toFixed(1)}</TableCell>
                  <TableCell className="max-w-[140px]"><div className="flex flex-wrap gap-1">{c.profileLabels.map((l) => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}</div></TableCell>
                </TableRow>))}</TableBody></Table>
            </ScrollArea></CardContent></Card>

            {model.dormantCustomers.length > 0 && (
              <Card><CardHeader><CardTitle>Asiakkaat ilman viimeaikaista aktiviteettia</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Asiakas</TableHead><TableHead>Vastuuhenkilö</TableHead><TableHead className="text-right">Päivää edellisestä</TableHead><TableHead className="text-right">Tarjouksia</TableHead><TableHead className="text-right">Arvo €</TableHead></TableRow></TableHeader>
                <TableBody>{model.dormantCustomers.slice(0, 10).map((c) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-sm">{c.ownerLabel}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', (c.daysSinceActivity ?? 0) > 90 && 'text-red-600 dark:text-red-400 font-medium')}>{c.daysSinceActivity ?? '\u2013'} pv</TableCell>
                    <TableCell className="text-right tabular-nums">{c.quoteCount}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(c.totalValue)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {model.highAcceptanceCustomers.length > 0 && (
                <Card><CardHeader><CardTitle className="text-base">Korkean hyväksynnän asiakkaat</CardTitle></CardHeader><CardContent><div className="space-y-2">
                  {model.highAcceptanceCustomers.map((c) => (<div key={c.id} className="flex justify-between items-center text-sm"><span className="font-medium truncate">{c.name}</span><Badge variant="default">{fp(c.acceptanceRatePercent)}</Badge></div>))}
                </div></CardContent></Card>
              )}
              {model.revisionHeavyCustomers.length > 0 && (
                <Card><CardHeader><CardTitle className="text-base">Paljon revisioita, vähän hyväksyntöjä</CardTitle></CardHeader><CardContent><div className="space-y-2">
                  {model.revisionHeavyCustomers.map((c) => (<div key={c.id} className="flex justify-between items-center text-sm"><span className="font-medium truncate">{c.name}</span><span className="text-muted-foreground tabular-nums">{c.averageRevisionCount.toFixed(1)} rev · {fp(c.acceptanceRatePercent)}</span></div>))}
                </div></CardContent></Card>
              )}
            </div>
          </>)}
        </TabsContent>

        {/* TUOTTEET */}
        <TabsContent value="products" className="space-y-6">
          {model.products.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="h-16 w-16" />} title="Ei tuotedataa" description="Tuoteraportointi aktivoituu, kun tarjousriveillä on tuotteita." />
          ) : (
            <Accordion type="multiple" defaultValue={['top-products', 'profitable', 'weak-margin', 'groups']} className="space-y-4">
              <AccordionItem value="top-products" className="border rounded-lg px-4"><AccordionTrigger className="text-base font-semibold">Myydyimmät tuotteet</AccordionTrigger><AccordionContent>
                <Table><TableHeader><TableRow><TableHead>Koodi</TableHead><TableHead>Tuote</TableHead><TableHead>Hintaryhmä</TableHead><TableHead className="text-right">Määrä</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Alennus €</TableHead></TableRow></TableHeader>
                <TableBody>{model.products.slice(0, 15).map((p) => (
                  <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.code || '\u2013'}</TableCell><TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell><TableCell className="text-sm">{p.installationGroupName}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity.toFixed(2)}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(p.value)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(p.marginPercent)}</TableCell>
                    <TableCell className={cn('text-right font-mono tabular-nums', p.discountImpact > 0 && 'text-red-600 dark:text-red-400')}>{p.discountImpact > 0 ? fc(p.discountImpact) : '\u2013'}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </AccordionContent></AccordionItem>

              <AccordionItem value="profitable" className="border rounded-lg px-4"><AccordionTrigger className="text-base font-semibold">Eniten katetta tuottavat</AccordionTrigger><AccordionContent>
                <Table><TableHeader><TableRow><TableHead>Tuote</TableHead><TableHead className="text-right">Kate €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Arvo €</TableHead></TableRow></TableHeader>
                <TableBody>{model.profitableProducts.map((p) => (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right font-mono tabular-nums text-green-600 dark:text-green-400">{fc(p.margin)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(p.marginPercent)}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(p.value)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </AccordionContent></AccordionItem>

              <AccordionItem value="weak-margin" className="border rounded-lg px-4"><AccordionTrigger className="text-base font-semibold">Heikoimman katteen tuotteet</AccordionTrigger><AccordionContent>
                <Table><TableHeader><TableRow><TableHead>Tuote</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Alle tavoitteen</TableHead></TableRow></TableHeader>
                <TableBody>{model.weakMarginProducts.map((p) => (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right tabular-nums text-red-600 dark:text-red-400 font-medium">{fp(p.marginPercent)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(p.value)}</TableCell><TableCell className="text-right tabular-nums">{p.belowTargetCount}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </AccordionContent></AccordionItem>

              <AccordionItem value="groups" className="border rounded-lg px-4"><AccordionTrigger className="text-base font-semibold">Hintaryhmät ja tavoitteen alitus</AccordionTrigger><AccordionContent>
                <Table><TableHeader><TableRow><TableHead>Hintaryhmä</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead className="text-right">Alle tavoitteen</TableHead><TableHead className="text-right">Alitusosuus</TableHead></TableRow></TableHeader>
                <TableBody>{model.groupsUnderTarget.map((g) => (
                  <TableRow key={g.id}><TableCell className="font-medium">{g.label}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(g.value)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(g.marginPercent)}</TableCell><TableCell className="text-right tabular-nums">{g.belowTargetCount}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', g.underTargetSharePercent >= 40 && 'text-red-600 dark:text-red-400 font-medium')}>{fp(g.underTargetSharePercent)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </AccordionContent></AccordionItem>

              {model.wonProducts.length > 0 && (
                <AccordionItem value="won" className="border rounded-lg px-4"><AccordionTrigger className="text-base font-semibold">Voitetuissa tarjouksissa yleisimmät tuotteet</AccordionTrigger><AccordionContent>
                  <Table><TableHeader><TableRow><TableHead>Tuote</TableHead><TableHead className="text-right">Hyväks. kertaa</TableHead><TableHead className="text-right">Hyväks. arvo €</TableHead></TableRow></TableHeader>
                  <TableBody>{model.wonProducts.map((p) => (<TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right tabular-nums">{p.acceptedUsageCount}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(p.acceptedValue)}</TableCell></TableRow>))}</TableBody></Table>
                </AccordionContent></AccordionItem>
              )}

              {model.basketPairs.length > 0 && (
                <AccordionItem value="basket" className="border rounded-lg px-4"><AccordionTrigger className="text-base font-semibold">Usein yhdessä esiintyvät tuotteet</AccordionTrigger><AccordionContent>
                  <div className="space-y-2">{model.basketPairs.map((b) => (<div key={b.id} className="flex justify-between items-center text-sm"><span className="truncate">{b.label}</span><Badge variant="secondary" className="tabular-nums">{b.count} kertaa</Badge></div>))}</div>
                </AccordionContent></AccordionItem>
              )}
            </Accordion>
          )}
        </TabsContent>

        {/* PROJEKTIT */}
        <TabsContent value="projects" className="space-y-6">
          {model.projects.length === 0 ? (
            <EmptyState icon={<Briefcase className="h-16 w-16" />} title="Ei projektidataa" description="Projektiraportointi aktivoituu, kun tarjouksia on hyväksytty tai toteumatyöt alkaneet." />
          ) : (<>
            <Card><CardHeader><CardTitle>Projektien vaihe</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{model.projectStages.map((s) => (
                <div key={s.stage} className="p-4 rounded-lg bg-muted/40 text-center"><div className="text-2xl font-bold tabular-nums">{s.count}</div><div className="text-sm text-muted-foreground mt-1">{s.stage}</div><div className="text-xs font-mono mt-1">{fc(s.value)}</div></div>
              ))}</div>
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Tarjous vs. toteutuma</CardTitle><CardDescription>Projektit joissa sekä hyväksytty tarjous että toteumatiedot</CardDescription></CardHeader><CardContent><ScrollArea className="w-full">
              <Table><TableHeader><TableRow><TableHead>Projekti</TableHead><TableHead>Asiakas</TableHead><TableHead>Vastuuhenkilö</TableHead><TableHead className="text-right">Tarjous €</TableHead><TableHead className="text-right">Laskutettu €</TableHead><TableHead className="text-right">Poikkeama €</TableHead><TableHead className="text-right">Poikkeama %</TableHead><TableHead className="text-right">Kate €</TableHead><TableHead className="text-right">Kate %</TableHead><TableHead>Vaihe</TableHead><TableHead>Pääsyy</TableHead></TableRow></TableHeader>
              <TableBody>{model.projects.slice(0, 25).map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill({ kind: 'families', title: p.name, ids: p.sourceIds })}>
                  <TableCell className="font-medium max-w-[180px] truncate">{p.name}</TableCell><TableCell className="text-sm">{p.customerName}</TableCell><TableCell className="text-sm">{p.ownerLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fc(p.quoteValue)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fc(p.actualValue ?? 0)}</TableCell>
                  <TableCell className={cn('text-right font-mono tabular-nums', (p.quoteToActualDelta ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : (p.quoteToActualDelta ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : '')}>{(p.quoteToActualDelta ?? 0) > 0 ? '+' : ''}{fc(p.quoteToActualDelta ?? 0)}</TableCell>
                  <TableCell className={cn('text-right tabular-nums', (p.quoteToActualDeltaPercent ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : (p.quoteToActualDeltaPercent ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : '')}>{(p.quoteToActualDeltaPercent ?? 0) > 0 ? '+' : ''}{fp(p.quoteToActualDeltaPercent ?? 0)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fc(p.quoteValue * p.quoteMarginPercent / 100)}</TableCell>
                  <TableCell className={cn('text-right tabular-nums', p.quoteMarginPercent >= 20 ? 'text-green-600 dark:text-green-400' : p.quoteMarginPercent < 10 ? 'text-red-600 dark:text-red-400' : '')}>{fp(p.quoteMarginPercent)}</TableCell>
                  <TableCell><Badge variant={p.projectStageVariant === 'default' ? 'default' : 'secondary'}>{p.projectStage}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{p.riskReason || '\u2013'}</TableCell>
                </TableRow>))}</TableBody></Table>
            </ScrollArea></CardContent></Card>

            {model.acceptedWithoutActualization.length > 0 && (
              <Card className="border-amber-500/30"><CardHeader><CardTitle className="text-amber-700 dark:text-amber-400">Hyväksytty ilman toteumatietoja</CardTitle><CardDescription>Nämä tarjoukset on hyväksytty mutta laskutustietoja ei ole kirjattu</CardDescription></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Tarjous</TableHead><TableHead>Asiakas</TableHead><TableHead className="text-right">Arvo €</TableHead><TableHead>Hyväksytty</TableHead></TableRow></TableHeader>
                <TableBody>{model.acceptedWithoutActualization.map((f) => (
                  <TableRow key={f.id}><TableCell className="font-medium">{f.latestQuoteTitle || f.projectName}</TableCell><TableCell className="text-sm">{f.customerName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(f.latestSubtotal)}</TableCell><TableCell className="text-sm text-muted-foreground">{fd(f.lastActivityAt)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}

            {model.projectByOwner.length > 0 && (
              <Card><CardHeader><CardTitle>Projektit vastuuhenkilöittäin</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Vastuuhenkilö</TableHead><TableHead className="text-right">Tarjouksia</TableHead><TableHead className="text-right">Tarjous €</TableHead><TableHead className="text-right">Keskim. koko</TableHead><TableHead className="text-right">Kate %</TableHead></TableRow></TableHeader>
                <TableBody>{model.projectByOwner.map((o) => (
                  <TableRow key={o.ownerUserId}><TableCell className="font-medium">{o.ownerLabel}</TableCell><TableCell className="text-right tabular-nums">{o.quoteCount}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(o.quoteValue)}</TableCell><TableCell className="text-right font-mono tabular-nums">{fc(o.averageQuoteSize)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(o.averageMarginPercent)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}
          </>)}
        </TabsContent>

        {/* REVISIOT */}
        <TabsContent value="revisions" className="space-y-6">
          {model.revisionDistribution.length === 0 ? (
            <EmptyState icon={<GitBranch className="h-16 w-16" />} title="Ei revisiodataa" description="Revisioraportointi aktivoituu, kun tarjouksista on tehty useampia versioita." />
          ) : (<>
            <Card><CardHeader><CardTitle>Revisiojakauma</CardTitle><CardDescription>Kuinka monta versiota tarjouksista on tehty ennen lopputulosta</CardDescription></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Revisiot</TableHead><TableHead className="text-right">Tarjouksia</TableHead><TableHead className="text-right">Hyväksymisaste</TableHead></TableRow></TableHeader>
              <TableBody>{model.revisionDistribution.map((r) => (
                <TableRow key={r.bucket}><TableCell className="font-medium">{r.label}</TableCell><TableCell className="text-right tabular-nums">{r.familyCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{fp(r.acceptanceRatePercent)}</TableCell>
                </TableRow>))}</TableBody></Table>
            </CardContent></Card>

            {model.revisionImpactFamilies.length > 0 && (
              <Card><CardHeader><CardTitle>Revisioiden vaikutus katteeseen</CardTitle><CardDescription>Tarjoukset joissa revisiot ovat muuttaneet katetta merkittävästi</CardDescription></CardHeader><CardContent><ScrollArea className="w-full">
                <Table><TableHeader><TableRow><TableHead>Tarjous</TableHead><TableHead>Asiakas</TableHead><TableHead className="text-right">Revisiot</TableHead><TableHead className="text-right">1. kate %</TableHead><TableHead className="text-right">Nyk. kate %</TableHead><TableHead className="text-right">Muutos %-yks</TableHead><TableHead className="text-right">Arvo €</TableHead></TableRow></TableHeader>
                <TableBody>{model.revisionImpactFamilies.map((f) => {
                  const drift = f.latestMarginPercent - f.originalMarginPercent;
                  return (
                  <TableRow key={f.id}><TableCell className="font-medium max-w-[180px] truncate">{f.latestQuoteTitle || f.projectName}</TableCell><TableCell className="text-sm">{f.customerName}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.revisionCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(f.originalMarginPercent)}</TableCell><TableCell className="text-right tabular-nums">{fp(f.latestMarginPercent)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums font-medium', drift > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{drift > 0 ? '+' : ''}{drift.toFixed(1)} pp</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(f.latestSubtotal)}</TableCell>
                  </TableRow>);})}</TableBody></Table>
              </ScrollArea></CardContent></Card>
            )}

            {model.stalledRevisionFamilies.length > 0 && (
              <Card className="border-amber-500/30"><CardHeader><CardTitle className="text-amber-700 dark:text-amber-400">Jumittuneet revisioketjut</CardTitle><CardDescription>Tarjoukset joista on tehty useita versioita mutta tila ei ole edennyt</CardDescription></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Tarjous</TableHead><TableHead>Asiakas</TableHead><TableHead className="text-right">Revisiot</TableHead><TableHead className="text-right">Päiviä viimeisestä</TableHead><TableHead>Tila</TableHead></TableRow></TableHeader>
                <TableBody>{model.stalledRevisionFamilies.map((f) => (
                  <TableRow key={f.id}><TableCell className="font-medium">{f.latestQuoteTitle || f.projectName}</TableCell><TableCell className="text-sm">{f.customerName}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.revisionCount}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', f.ageDays > 21 && 'text-red-600 dark:text-red-400 font-medium')}>{f.ageDays} pv</TableCell>
                    <TableCell><Badge variant={badgeVariant(f.latestStatusVariant)}>{f.latestStatusLabel}</Badge></TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}

            {model.revisionAddedProducts.length > 0 && (
              <Card><CardHeader><CardTitle>Revisioissa lisätyt tuotteet</CardTitle><CardDescription>Tuotteet jotka esiintyvät pääasiassa myöhemmissä revisioissa</CardDescription></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Tuote</TableHead><TableHead className="text-right">Lisäyksiä</TableHead><TableHead className="text-right">Arvo €</TableHead></TableRow></TableHeader>
                <TableBody>{model.revisionAddedProducts.map((p) => (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right tabular-nums">{p.revisionAddCount}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fc(p.value)}</TableCell>
                  </TableRow>))}</TableBody></Table>
              </CardContent></Card>
            )}
          </>)}
        </TabsContent>
      </Tabs>

      {/* DRILL-DOWN DIALOG */}
      <Dialog open={drill !== null} onOpenChange={(open) => { if (!open) closeDrill(); }}>
        <DialogContent className="max-h-[90vh] w-[min(96vw,78rem)] max-w-[78rem] overflow-hidden rounded-[30px] border-border/70 bg-background p-0 shadow-[0_40px_120px_-54px_rgba(15,23,42,0.56)]">
          <DialogHeader className="border-b border-border/50 bg-gradient-to-b from-muted/25 via-background to-background px-6 pb-6 pt-7 pr-14 sm:px-8 sm:pb-7 sm:pt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2.5">
                <DialogTitle className="text-2xl leading-tight tracking-[-0.03em] sm:text-[1.9rem]">{drill?.title ?? 'Toimenpiteet'}</DialogTitle>
                <DialogDescription className="max-w-2xl text-sm leading-6">
                  {getReportingDrilldownDescription(drill?.kind ?? null)}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="w-fit shrink-0 rounded-full bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] tabular-nums">
                {drillCount} {drillCount === 1 ? 'kohde' : 'kohdetta'}
              </Badge>
            </div>
          </DialogHeader>
          <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-8">
            <ScrollArea className="max-h-[70vh] w-full">
              <div className="pr-2 sm:pr-4">
                <ReportingDrilldownContent
                  kind={drill?.kind === 'products' ? null : drill?.kind ?? null}
                  title={drill?.title}
                  families={drillFamilies}
                  customers={drillCustomers}
                  projects={drillProjects}
                  onOpenQuote={openQuoteFromDrill}
                />
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </AppPageLayout>
  );
}