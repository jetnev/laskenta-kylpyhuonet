import { type ReactNode, type RefObject, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChartBar,
  ClockCountdown,
  Eye,
  FilePdf,
  FileText,
  FolderOpen,
  Plus,
  Receipt,
  Trash,
  TrendUp,
  WarningCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';

import InvoiceEditor from '../InvoiceEditor';
import { AppPageContentGrid, AppPageHeader, AppPageLayout } from '../layout/AppPageLayout';
import PageEmptyState from '../layout/PageEmptyState';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useCustomers, useInvoices, useProjects, useQuoteRows, useQuotes } from '../../hooks/use-data';
import type { AppLocationState } from '../../lib/app-routing';
import { calculateQuote, formatCurrency } from '../../lib/calculations';
import { exportInvoiceToPDF } from '../../lib/export';
import { getInvoiceStatusLabel, invoiceToQuoteLike, isInvoiceOverdue } from '../../lib/invoices';
import type { Invoice, InvoiceStatus } from '../../lib/types';
import { cn } from '../../lib/utils';

type InvoiceFilter = 'all' | InvoiceStatus | 'overdue';
type OperationalActionKey = 'eligible' | 'draft' | 'issued' | 'overdue';
type OperationalHighlight = {
  key: OperationalActionKey;
  title: string;
  description: string;
  actionLabel: string;
  tone: 'default' | 'warning';
};

const FILTERS: Array<{ value: InvoiceFilter; label: string }> = [
  { value: 'all', label: 'Kaikki' },
  { value: 'draft', label: 'Luonnokset' },
  { value: 'issued', label: 'Lähetetyt' },
  { value: 'paid', label: 'Maksetut' },
  { value: 'cancelled', label: 'Mitätöidyt' },
  { value: 'overdue', label: 'Erääntyneet' },
];

const DATE_FORMATTER = new Intl.DateTimeFormat('fi-FI');

function getStatusVariant(status: InvoiceStatus) {
  if (status === 'paid') return 'default';
  if (status === 'cancelled') return 'destructive';
  if (status === 'issued') return 'outline';
  return 'secondary';
}

function formatInvoiceDate(value?: string) {
  if (!value) {
    return 'Ei päivää';
  }

  return DATE_FORMATTER.format(new Date(value));
}

function InvoiceKpiCard({
  label,
  value,
  description,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: 'default' | 'warning';
}) {
  return (
    <Card
      className={cn(
        'min-h-[148px] border-border/70 bg-card/95 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]',
        tone === 'warning' && 'border-amber-200 bg-amber-50/60'
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1.5">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</CardDescription>
          <CardTitle className="text-3xl tracking-[-0.03em] tabular-nums">{value}</CardTitle>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-muted-foreground',
            tone === 'warning' && 'border-amber-200 bg-amber-100/70 text-amber-700'
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface InvoicesPageProps {
  routeState?: AppLocationState;
  onNavigate?: (location: AppLocationState, options?: { replace?: boolean }) => void;
}

export default function InvoicesPage({ routeState, onNavigate }: InvoicesPageProps) {
  const { quotes } = useQuotes();
  const { getRowsForQuote } = useQuoteRows();
  const { getCustomer } = useCustomers();
  const { getProject } = useProjects();
  const { createInvoiceFromQuote, deleteInvoice, invoices } = useInvoices();
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const eligibleSectionRef = useRef<HTMLDivElement | null>(null);
  const invoicesSectionRef = useRef<HTMLDivElement | null>(null);
  const selectedInvoiceId = routeState?.page === 'invoices' ? routeState.invoiceId ?? null : null;

  const eligibleQuotes = useMemo(
    () =>
      quotes
        .filter((quote) => quote.status === 'accepted')
        .map((quote) => {
          const project = getProject(quote.projectId);
          const customer = project ? getCustomer(project.customerId) : undefined;
          const rows = getRowsForQuote(quote.id);

          if (!project || !customer || rows.filter((row) => row.mode !== 'section').length === 0) {
            return null;
          }
          if (invoices.some((invoice) => invoice.sourceQuoteId === quote.id && invoice.status !== 'cancelled')) {
            return null;
          }

          return {
            quote,
            project,
            customer,
            rows,
            billableRowCount: rows.filter((row) => row.mode !== 'section').length,
            calculation: calculateQuote(quote, rows),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((left, right) => new Date(right.quote.acceptedAt || right.quote.updatedAt).getTime() - new Date(left.quote.acceptedAt || left.quote.updatedAt).getTime()),
    [getCustomer, getProject, getRowsForQuote, invoices, quotes]
  );

  const filteredInvoices = useMemo(
    () =>
      [...invoices]
        .filter((invoice) => {
          if (filter === 'all') return true;
          if (filter === 'overdue') return isInvoiceOverdue(invoice);
          return invoice.status === filter;
        })
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [filter, invoices]
  );

  const totals = useMemo(() => {
    const totalCount = invoices.length;
    const draftCount = invoices.filter((invoice) => invoice.status === 'draft').length;
    const issuedCount = invoices.filter((invoice) => invoice.status === 'issued').length;
    const paidCount = invoices.filter((invoice) => invoice.status === 'paid').length;
    const overdueCount = invoices.filter((invoice) => isInvoiceOverdue(invoice)).length;
    const openValue = invoices
      .filter((invoice) => invoice.status === 'issued' || invoice.status === 'draft')
      .reduce((sum, invoice) => sum + calculateQuote(invoiceToQuoteLike(invoice), invoice.rows).total, 0);

    return {
      draftCount,
      issuedCount,
      paidCount,
      totalCount,
      overdueCount,
      openValue,
    };
  }, [invoices]);

  const recentInvoices = useMemo(
    () => [...invoices].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 4),
    [invoices]
  );

  const filterLabel = FILTERS.find((item) => item.value === filter)?.label ?? 'Kaikki';

  const operationalHighlights = useMemo<OperationalHighlight[]>(
    () => {
      const highlights: Array<OperationalHighlight | null> = [
        eligibleQuotes.length > 0
          ? {
              key: 'eligible' as const,
              title: `${eligibleQuotes.length} hyväksyttyä tarjousta odottaa laskua`,
              description: 'Luo lasku snapshotiksi heti, kun haluat lukita hinnat ja rivit laskudokumenttiin.',
              actionLabel: 'Avaa laskutettavat tarjoukset',
              tone: 'default' as const,
            }
          : null,
        totals.draftCount > 0
          ? {
              key: 'draft' as const,
              title: `${totals.draftCount} laskuluonnosta odottaa viimeistelyä`,
              description: 'Tarkista maksuehdot, viitenumerot ja PDF-vienti ennen lähetystä.',
              actionLabel: 'Näytä luonnokset',
              tone: 'default' as const,
            }
          : null,
        totals.overdueCount > 0
          ? {
              key: 'overdue' as const,
              title: `${totals.overdueCount} laskua on erääntynyt`,
              description: 'Käy erääntyneet laskut läpi ensimmäisenä, jotta seuranta pysyy ajan tasalla.',
              actionLabel: 'Näytä erääntyneet',
              tone: 'warning' as const,
            }
          : null,
        totals.issuedCount > 0
          ? {
              key: 'issued' as const,
              title: `${totals.issuedCount} laskua on lähetetty`,
              description: 'Avaa lähetetyt laskut, jos haluat tarkistaa eräpäivät tai viitteet yhdestä näkymästä.',
              actionLabel: 'Näytä lähetetyt',
              tone: 'default' as const,
            }
          : null,
      ];

      return highlights.flatMap((item) => (item ? [item] : []));
    },
    [eligibleQuotes.length, totals.draftCount, totals.issuedCount, totals.overdueCount]
  );

  const scrollToSection = (target: RefObject<HTMLDivElement | null>) => {
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const focusInvoices = (nextFilter: InvoiceFilter) => {
    setFilter(nextFilter);
    scrollToSection(invoicesSectionRef);
  };

  const handleOperationalAction = (key: OperationalActionKey) => {
    if (key === 'eligible') {
      scrollToSection(eligibleSectionRef);
      return;
    }

    if (key === 'draft') {
      focusInvoices('draft');
      return;
    }

    if (key === 'issued') {
      focusInvoices('issued');
      return;
    }

    focusInvoices('overdue');
  };

  const handleCreateInvoice = (quoteId: string) => {
    const quote = quotes.find((candidate) => candidate.id === quoteId);
    if (!quote) {
      toast.error('Tarjousta ei löytynyt.');
      return;
    }

    const project = getProject(quote.projectId);
    const customer = project ? getCustomer(project.customerId) : undefined;
    const rows = getRowsForQuote(quote.id);

    if (!project || !customer) {
      toast.error('Projektin asiakas- tai projektitiedot puuttuvat.');
      return;
    }

    try {
      const invoice = createInvoiceFromQuote(quote, rows, customer, project);
      onNavigate?.({ page: 'invoices', invoiceId: invoice.id });
      toast.success(`Lasku ${invoice.invoiceNumber} luotu.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Laskun luonti epäonnistui.');
    }
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (!window.confirm(`Poistetaanko lasku ${invoice.invoiceNumber}?`)) {
      return;
    }

    try {
      deleteInvoice(invoice.id);
      toast.success('Lasku poistettu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Laskun poisto epäonnistui.');
    }
  };

  return (
    <AppPageLayout pageType="dashboard">
      <AppPageHeader
        title="Laskut"
        description="Luo lasku hyväksytystä tarjouksesta snapshot-muotoon, seuraa avoimia laskuja ja pidä laskutuksen työjono yhdessä näkymässä."
        eyebrow={<Badge variant="outline">Snapshot-laskutus</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InvoiceKpiCard
          label="Laskuja yhteensä"
          value={String(totals.totalCount)}
          description={`${totals.paidCount} maksettua ja ${totals.issuedCount} lähetettyä laskua samassa näkymässä.`}
          icon={<Receipt className="h-5 w-5" weight="duotone" />}
        />
        <InvoiceKpiCard
          label="Avoin laskutus"
          value={formatCurrency(totals.openValue)}
          description={`Luonnokset ja lähetetyt yhteensä. ${totals.draftCount} laskua odottaa vielä viimeistelyä.`}
          icon={<TrendUp className="h-5 w-5" weight="duotone" />}
        />
        <InvoiceKpiCard
          label="Erääntyneet"
          value={String(totals.overdueCount)}
          description="Nosta ensin esiin laskut, joiden eräpäivä on jo mennyt."
          icon={<ClockCountdown className="h-5 w-5" weight="duotone" />}
          tone={totals.overdueCount > 0 ? 'warning' : 'default'}
        />
        <InvoiceKpiCard
          label="Luonnokset"
          value={String(totals.draftCount)}
          description="Viimeistele maksuehdot ja dokumentti ennen PDF-vientiä tai lähetystä."
          icon={<FileText className="h-5 w-5" weight="duotone" />}
        />
      </div>

      <AppPageContentGrid>
        <div className="space-y-6 xl:col-span-8 2xl:col-span-9">
          <div ref={eligibleSectionRef}>
            <Card className="border-border/70 shadow-[0_20px_48px_-38px_rgba(15,23,42,0.32)]">
              <CardHeader className="gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Laskuta nyt: hyväksytyt tarjoukset</CardTitle>
                    <Badge variant="outline">{eligibleQuotes.length} valmista</Badge>
                  </div>
                  <CardDescription>
                    Hyväksytyt tarjoukset ilman laskua, joista voi luoda laskun suoraan ilman erillistä tietojen kokoamista.
                  </CardDescription>
                </div>
                <Button variant="outline" className="w-full justify-between sm:w-auto" onClick={() => onNavigate?.({ page: 'projects' })}>
                  Avaa projektit
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {eligibleQuotes.length === 0 ? (
                  <PageEmptyState
                    icon={<FolderOpen className="h-6 w-6" />}
                    title="Laskutettavia hyväksyttyjä tarjouksia ei vielä ole"
                    description="Kun tarjous hyväksytään projektityötilassa ja sillä on laskutettavat rivit, se ilmestyy tähän valmiina laskun luontiin."
                    primaryActionLabel="Avaa projektit"
                    onPrimaryAction={() => onNavigate?.({ page: 'projects' })}
                    secondaryActionLabel="Avaa ohjeet"
                    onSecondaryAction={() => onNavigate?.({ page: 'help' })}
                  />
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {eligibleQuotes.map(({ quote, project, customer, billableRowCount, calculation }) => (
                      <div key={quote.id} className="rounded-[24px] border border-border/70 bg-muted/18 p-5 shadow-[0_16px_30px_-34px_rgba(15,23,42,0.28)]">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-lg font-semibold tracking-[-0.02em]">{quote.title}</h3>
                              <p className="mt-2 text-sm text-muted-foreground">{customer.name} • {project.name}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Tarjous {quote.quoteNumber}</p>
                            </div>
                            <div className="shrink-0 rounded-2xl border bg-background px-4 py-3 text-right">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Loppusumma</div>
                              <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(calculation.total)}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">Hyväksytty {formatInvoiceDate(quote.acceptedAt || quote.updatedAt)}</Badge>
                            <Badge variant="outline">{billableRowCount} laskutettavaa riviä</Badge>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Button onClick={() => handleCreateInvoice(quote.id)} className="justify-between sm:min-w-40">
                              <Plus className="h-4 w-4" />
                              Luo lasku
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => onNavigate?.({ page: 'projects', projectId: project.id, quoteId: quote.id, editor: 'quote' })}
                              className="justify-between sm:min-w-40"
                            >
                              Avaa tarjous
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div ref={invoicesSectionRef}>
            <Card className="border-border/70 shadow-[0_20px_48px_-38px_rgba(15,23,42,0.32)]">
              <CardHeader className="gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Luodut laskut</CardTitle>
                    {filter !== 'all' ? <Badge variant="secondary">{filterLabel}</Badge> : null}
                  </div>
                  <CardDescription>
                    Luonnokset, lähetetyt ja maksetut laskut samassa näkymässä. Suodata tilan mukaan tai avaa dokumentti viimeistelyyn.
                  </CardDescription>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        size="sm"
                        variant={filter === item.value ? 'default' : 'ghost'}
                        className="justify-center"
                        onClick={() => setFilter(item.value)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {filteredInvoices.length === 0 ? (
                  invoices.length === 0 ? (
                    <PageEmptyState
                      icon={<Receipt className="h-6 w-6" />}
                      title="Ensimmäinen lasku syntyy hyväksytystä tarjouksesta"
                      description="Luo tarjous projektityötilassa, hyväksy se ja palaa sitten tähän näkymään muodostamaan lasku snapshotiksi. Tästä eteenpäin kaikki laskudokumentit pysyvät samassa työjonossa."
                      primaryActionLabel="Avaa projektit"
                      onPrimaryAction={() => onNavigate?.({ page: 'projects' })}
                      secondaryActionLabel="Yritys- ja laskutustiedot"
                      onSecondaryAction={() => onNavigate?.({ page: 'account' })}
                    />
                  ) : (
                    <PageEmptyState
                      icon={<WarningCircle className="h-6 w-6" />}
                      title={`Suodatuksella ${filterLabel.toLowerCase()} ei löytynyt laskuja`}
                      description="Nykyinen suodatus ei tuota rivejä. Palaa kaikkiin laskuihin tai tarkista toinen tila nähdäksesi dokumentit."
                      primaryActionLabel="Näytä kaikki"
                      onPrimaryAction={() => setFilter('all')}
                      secondaryActionLabel="Avaa raportointi"
                      onSecondaryAction={() => onNavigate?.({ page: 'reports' })}
                    />
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-4 md:hidden">
                      {filteredInvoices.map((invoice) => {
                        const calculation = calculateQuote(invoiceToQuoteLike(invoice), invoice.rows);
                        const overdue = isInvoiceOverdue(invoice);

                        return (
                          <div key={invoice.id} className="rounded-[24px] border border-border/70 bg-card p-5 shadow-[0_16px_30px_-34px_rgba(15,23,42,0.28)]">
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-lg font-semibold">{invoice.invoiceNumber}</div>
                                  <Badge variant={getStatusVariant(invoice.status)}>{getInvoiceStatusLabel(invoice.status)}</Badge>
                                  {overdue ? <Badge variant="destructive">Erääntynyt</Badge> : null}
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">{invoice.customer.name} • {invoice.project.name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Eräpäivä {formatInvoiceDate(invoice.dueDate)} • Viite {invoice.referenceNumber}</p>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                                <div className="rounded-2xl border bg-muted/20 p-3">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Loppusumma</div>
                                  <div className="mt-1 font-semibold tabular-nums">{formatCurrency(calculation.total)}</div>
                                </div>
                                <div className="rounded-2xl border bg-muted/20 p-3">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Lähdetarjous</div>
                                  <div className="mt-1 font-semibold">{invoice.sourceQuoteNumber}</div>
                                </div>
                                <div className="rounded-2xl border bg-muted/20 p-3">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Päivitetty</div>
                                  <div className="mt-1 font-semibold">{formatInvoiceDate(invoice.updatedAt)}</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => onNavigate?.({ page: 'invoices', invoiceId: invoice.id })}>
                                  <Eye className="h-4 w-4" />
                                  Avaa
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => exportInvoiceToPDF(invoice)}>
                                  <FilePdf className="h-4 w-4" />
                                  PDF
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteInvoice(invoice)}>
                                  <Trash className="h-4 w-4" />
                                  Poista
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lasku</TableHead>
                            <TableHead>Asiakas ja projekti</TableHead>
                            <TableHead>Tila</TableHead>
                            <TableHead>Eräpäivä</TableHead>
                            <TableHead className="text-right">Loppusumma</TableHead>
                            <TableHead>Lähdetarjous</TableHead>
                            <TableHead className="text-right">Toiminnot</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvoices.map((invoice) => {
                            const calculation = calculateQuote(invoiceToQuoteLike(invoice), invoice.rows);
                            const overdue = isInvoiceOverdue(invoice);

                            return (
                              <TableRow key={invoice.id}>
                                <TableCell className="align-top">
                                  <div className="space-y-1">
                                    <div className="font-semibold">{invoice.invoiceNumber}</div>
                                    <div className="text-xs text-muted-foreground">Päivitetty {formatInvoiceDate(invoice.updatedAt)}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top whitespace-normal">
                                  <div className="min-w-[240px] space-y-1">
                                    <div className="font-medium">{invoice.customer.name}</div>
                                    <div className="text-sm text-muted-foreground">{invoice.project.name}</div>
                                    <div className="text-xs text-muted-foreground">Viite {invoice.referenceNumber}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant={getStatusVariant(invoice.status)}>{getInvoiceStatusLabel(invoice.status)}</Badge>
                                    {overdue ? <Badge variant="destructive">Erääntynyt</Badge> : null}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top whitespace-normal">
                                  <div className="space-y-1">
                                    <div className="font-medium">{formatInvoiceDate(invoice.dueDate)}</div>
                                    <div className="text-xs text-muted-foreground">Laskupäivä {formatInvoiceDate(invoice.issueDate)}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top text-right font-semibold tabular-nums">
                                  {formatCurrency(calculation.total)}
                                </TableCell>
                                <TableCell className="align-top whitespace-normal">
                                  <div className="min-w-[180px] space-y-1">
                                    <div className="font-medium">{invoice.sourceQuoteNumber}</div>
                                    <div className="text-xs text-muted-foreground">{invoice.title}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => onNavigate?.({ page: 'invoices', invoiceId: invoice.id })}>
                                      <Eye className="h-4 w-4" />
                                      Avaa
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => exportInvoiceToPDF(invoice)}>
                                      <FilePdf className="h-4 w-4" />
                                      PDF
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDeleteInvoice(invoice)}>
                                      <Trash className="h-4 w-4" />
                                      Poista
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4 2xl:col-span-3">
          <Card className="border-border/70 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]">
            <CardHeader>
              <CardTitle>Pikatoiminnot</CardTitle>
              <CardDescription>Pidä laskutusvirta liikkeessä ilman turhaa navigointia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-between" onClick={() => onNavigate?.({ page: 'projects' })}>
                Siirry tarjouksiin
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => focusInvoices('draft')}>
                Avaa luonnokset
                <Badge variant="secondary" className="px-2 py-0.5 tabular-nums">{totals.draftCount}</Badge>
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => onNavigate?.({ page: 'reports' })}>
                Avaa raportointi
                <ChartBar className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => onNavigate?.({ page: 'account' })}>
                Yritys- ja laskutustiedot
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {invoices.length === 0 && eligibleQuotes.length === 0 ? (
            <Card className="border-border/70 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]">
              <CardHeader>
                <CardTitle>Miten laskutus käynnistyy</CardTitle>
                <CardDescription>Näillä askelilla näkymä alkaa täyttyä oikeasta datasta ilman käsin rakennettua välivaihetta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  'Luo tarjous projektityötilassa ja lisää sille laskutettavat rivit.',
                  'Hyväksy tarjous, jotta se siirtyy tähän näkymään laskutettavaksi.',
                  'Muodosta lasku snapshotiksi ja tarkista maksuehdot ennen PDF-vientiä.',
                ].map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold shadow-sm">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                  </div>
                ))}
                <div className="grid gap-2">
                  <Button className="w-full justify-between" onClick={() => onNavigate?.({ page: 'projects' })}>
                    Avaa projektit
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between" onClick={() => onNavigate?.({ page: 'account' })}>
                    Avaa yritys- ja laskutustiedot
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/70 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]">
              <CardHeader>
                <CardTitle>Laskutuksen tila</CardTitle>
                <CardDescription>Paneeli nostaa vain ne asiat, joihin kannattaa reagoida seuraavaksi.</CardDescription>
              </CardHeader>
              <CardContent>
                {operationalHighlights.length === 0 ? (
                  <PageEmptyState
                    compact
                    icon={<TrendUp className="h-5 w-5" />}
                    title="Laskutuksen tilanne näyttää hallitulta"
                    description="Tässä näkymässä ei ole juuri nyt kiireellisiä laskutustoimia. Voit silti avata raportoinnin tai projektityötilan jatkaaksesi seuraavaa vaihetta."
                  />
                ) : (
                  <div className="space-y-3">
                    {operationalHighlights.map((item) => (
                      <div
                        key={item.key}
                        className={cn(
                          'rounded-2xl border px-4 py-4',
                          item.tone === 'warning' ? 'border-amber-200 bg-amber-50/70' : 'border-border/70 bg-muted/20'
                        )}
                      >
                        <div className="flex flex-col gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  item.tone === 'warning' ? 'bg-amber-500' : 'bg-primary/70'
                                )}
                              />
                              <p className="text-sm font-medium">{item.title}</p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="justify-between px-0 text-left" onClick={() => handleOperationalAction(item.key)}>
                            {item.actionLabel}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {recentInvoices.length > 0 ? (
            <Card className="border-border/70 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]">
              <CardHeader>
                <CardTitle>Viimeksi päivitetyt laskut</CardTitle>
                <CardDescription>Avaa keskeneräinen dokumentti tai tarkista viimeisin muutos yhdellä klikkauksella.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentInvoices.map((invoice) => {
                  const overdue = isInvoiceOverdue(invoice);

                  return (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => onNavigate?.({ page: 'invoices', invoiceId: invoice.id })}
                      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:bg-muted/20"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{invoice.invoiceNumber}</span>
                          <Badge variant={getStatusVariant(invoice.status)}>{getInvoiceStatusLabel(invoice.status)}</Badge>
                          {overdue ? <Badge variant="destructive">Erääntynyt</Badge> : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{invoice.customer.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Päivitetty {formatInvoiceDate(invoice.updatedAt)}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </AppPageContentGrid>

      {selectedInvoiceId ? <InvoiceEditor invoiceId={selectedInvoiceId} onClose={() => onNavigate?.({ page: 'invoices' })} /> : null}
    </AppPageLayout>
  );
}