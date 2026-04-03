import { useMemo, useState } from 'react';
import { Eye, FilePdf, Plus, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import InvoiceEditor from '../InvoiceEditor';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useCustomers, useInvoices, useProjects, useQuoteRows, useQuotes } from '../../hooks/use-data';
import { calculateQuote, formatCurrency } from '../../lib/calculations';
import { exportInvoiceToPDF } from '../../lib/export';
import { getInvoiceStatusLabel, invoiceToQuoteLike, isInvoiceOverdue } from '../../lib/invoices';
import type { InvoiceStatus } from '../../lib/types';

type InvoiceFilter = 'all' | InvoiceStatus | 'overdue';

const FILTERS: Array<{ value: InvoiceFilter; label: string }> = [
  { value: 'all', label: 'Kaikki' },
  { value: 'draft', label: 'Luonnokset' },
  { value: 'issued', label: 'Lähetetyt' },
  { value: 'paid', label: 'Maksetut' },
  { value: 'cancelled', label: 'Mitätöidyt' },
  { value: 'overdue', label: 'Erääntyneet' },
];

function getStatusVariant(status: InvoiceStatus) {
  if (status === 'paid') return 'default';
  if (status === 'cancelled') return 'destructive';
  if (status === 'issued') return 'outline';
  return 'secondary';
}

export default function InvoicesPage() {
  const { quotes } = useQuotes();
  const { getRowsForQuote } = useQuoteRows();
  const { getCustomer } = useCustomers();
  const { getProject } = useProjects();
  const { createInvoiceFromQuote, deleteInvoice, invoices } = useInvoices();
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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
            calculation: calculateQuote(quote, rows),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((left, right) => new Date(right.quote.acceptedAt || right.quote.updatedAt).getTime() - new Date(left.quote.acceptedAt || left.quote.updatedAt).getTime()),
    [getCustomer, getProject, getRowsForQuote, invoices, quotes]
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) => {
        if (filter === 'all') return true;
        if (filter === 'overdue') return isInvoiceOverdue(invoice);
        return invoice.status === filter;
      }),
    [filter, invoices]
  );

  const totals = useMemo(() => {
    const totalCount = invoices.length;
    const overdueCount = invoices.filter((invoice) => isInvoiceOverdue(invoice)).length;
    const openValue = invoices
      .filter((invoice) => invoice.status === 'issued' || invoice.status === 'draft')
      .reduce((sum, invoice) => sum + calculateQuote(invoiceToQuoteLike(invoice), invoice.rows).total, 0);

    return {
      totalCount,
      overdueCount,
      openValue,
    };
  }, [invoices]);

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
      setSelectedInvoiceId(invoice.id);
      toast.success(`Lasku ${invoice.invoiceNumber} luotu.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Laskun luonti epäonnistui.');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Laskut</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Luo lasku hyväksytystä tarjouksesta snapshot-muotoon ja hallitse laskudokumentteja keskitetysti.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Laskuja yhteensä</div>
          <div className="mt-2 text-2xl font-semibold">{totals.totalCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Avoin laskutus</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(totals.openValue)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Erääntyneet</div>
          <div className="mt-2 text-2xl font-semibold">{totals.overdueCount}</div>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Hyväksytyt tarjoukset ilman laskua</h2>
            <p className="text-sm text-muted-foreground">Näistä voit luoda laskun yhdellä klikkauksella.</p>
          </div>
          <Badge variant="outline">{eligibleQuotes.length} valmista</Badge>
        </div>

        {eligibleQuotes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Ei laskuttamattomia hyväksyttyjä tarjouksia.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {eligibleQuotes.map(({ quote, project, customer, calculation }) => (
              <Card key={quote.id} className="p-5 space-y-4 bg-muted/20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold">{quote.title}</div>
                    <div className="text-sm text-muted-foreground">{customer.name} • {project.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Tarjous {quote.quoteNumber}</div>
                  </div>
                  <Button onClick={() => handleCreateInvoice(quote.id)}>
                    <Plus className="h-4 w-4" />
                    Luo lasku
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">Hyväksytty {quote.acceptedAt ? new Date(quote.acceptedAt).toLocaleDateString('fi-FI') : '-'}</Badge>
                  <Badge variant="outline">Loppusumma {formatCurrency(calculation.total)}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Luodut laskut</h2>
            <p className="text-sm text-muted-foreground">Avaa, vie PDF:nä tai poista laskuluonnos tarvittaessa.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={filter === item.value ? 'default' : 'outline'}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Suodatuksella ei löytynyt laskuja.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredInvoices.map((invoice) => {
              const calculation = calculateQuote(invoiceToQuoteLike(invoice), invoice.rows);
              const overdue = isInvoiceOverdue(invoice);

              return (
                <Card key={invoice.id} className="p-5 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold">{invoice.invoiceNumber}</div>
                        <Badge variant={getStatusVariant(invoice.status)}>{getInvoiceStatusLabel(invoice.status)}</Badge>
                        {overdue && <Badge variant="destructive">Erääntynyt</Badge>}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">{invoice.customer.name} • {invoice.project.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Eräpäivä {invoice.dueDate || '-'} • Viite {invoice.referenceNumber}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="outline" size="sm" onClick={() => setSelectedInvoiceId(invoice.id)}>
                        <Eye className="h-4 w-4" />
                        Avaa
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => exportInvoiceToPDF(invoice)}>
                        <FilePdf className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!window.confirm(`Poistetaanko lasku ${invoice.invoiceNumber}?`)) {
                            return;
                          }
                          try {
                            deleteInvoice(invoice.id);
                            toast.success('Lasku poistettu.');
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : 'Laskun poisto epäonnistui.');
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                        Poista
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Loppusumma</div>
                      <div className="mt-1 font-semibold">{formatCurrency(calculation.total)}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                      <div className="mt-1 font-semibold">{getInvoiceStatusLabel(invoice.status)}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Lähdetarjous</div>
                      <div className="mt-1 font-semibold">{invoice.sourceQuoteNumber}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {selectedInvoiceId && <InvoiceEditor invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />}
    </div>
  );
}