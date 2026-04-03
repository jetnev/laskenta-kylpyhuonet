import { CheckCircle, Clock, FilePdf, Receipt, XCircle } from '@phosphor-icons/react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { useInvoices } from '../hooks/use-data';
import { calculateQuote, calculateQuoteRow, formatCurrency, formatNumber, getQuoteExtraChargeLines } from '../lib/calculations';
import { exportInvoiceToPDF } from '../lib/export';
import { addDaysToIsoDate, getInvoiceStatusLabel, invoiceToQuoteLike, isInvoiceOverdue } from '../lib/invoices';
import { ResponsiveDialog } from './ResponsiveDialog';

interface InvoiceEditorProps {
  invoiceId: string;
  onClose: () => void;
}

function getStatusVariant(status: 'draft' | 'issued' | 'paid' | 'cancelled') {
  if (status === 'paid') return 'default';
  if (status === 'cancelled') return 'destructive';
  if (status === 'issued') return 'outline';
  return 'secondary';
}

export default function InvoiceEditor({ invoiceId, onClose }: InvoiceEditorProps) {
  const { getInvoice, updateInvoice, updateInvoiceStatus } = useInvoices();
  const invoice = getInvoice(invoiceId);

  if (!invoice) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Lasku" maxWidth="xl">
        <Card className="p-10 text-center text-muted-foreground">
          Laskua ei löytynyt. Sulje näkymä ja avaa lasku uudelleen listalta.
        </Card>
      </ResponsiveDialog>
    );
  }

  const quoteLikeInvoice = invoiceToQuoteLike(invoice);
  const calculation = calculateQuote(quoteLikeInvoice, invoice.rows);
  const extraChargeLines = getQuoteExtraChargeLines(quoteLikeInvoice).filter((line) => line.amount > 0);
  const overdue = isInvoiceOverdue(invoice);
  const isEditable = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>Sulje</Button>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button variant="outline" onClick={() => exportInvoiceToPDF(invoice)}>
          <FilePdf className="h-4 w-4" />
          PDF
        </Button>
        {invoice.status === 'draft' && (
          <Button onClick={() => updateInvoiceStatus(invoice.id, 'issued')}>
            <Receipt className="h-4 w-4" />
            Merkitse lähetetyksi
          </Button>
        )}
        {invoice.status === 'issued' && (
          <>
            <Button onClick={() => updateInvoiceStatus(invoice.id, 'paid')}>
              <CheckCircle className="h-4 w-4" />
              Merkitse maksetuksi
            </Button>
            <Button variant="outline" onClick={() => updateInvoiceStatus(invoice.id, 'cancelled')}>
              <XCircle className="h-4 w-4" />
              Mitätöi
            </Button>
          </>
        )}
      </div>
    </>
  );

  return (
    <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Lasku" footer={footer} maxWidth="full">
      <div className="space-y-6 pb-2">
        <Card className="p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getStatusVariant(invoice.status)}>{getInvoiceStatusLabel(invoice.status)}</Badge>
                {overdue && (
                  <Badge variant="destructive" className="gap-1">
                    <Clock className="h-3.5 w-3.5" weight="fill" />
                    Erääntynyt
                  </Badge>
                )}
                <Badge variant="outline">{invoice.invoiceNumber}</Badge>
                <Badge variant="outline">Tarjous {invoice.sourceQuoteNumber}</Badge>
              </div>
              <Input
                value={invoice.title}
                onChange={(event) => updateInvoice(invoice.id, { title: event.target.value })}
                className="max-w-3xl border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
                disabled={!isEditable}
              />
              <p className="text-sm text-muted-foreground">
                {invoice.customer.name} • {invoice.project.name} • {invoice.project.site}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <div>Luotu: {new Date(invoice.createdAt).toLocaleString('fi-FI')}</div>
              <div>Päivitetty: {new Date(invoice.updatedAt).toLocaleString('fi-FI')}</div>
              {invoice.issuedAt && <div>Lähetetty: {new Date(invoice.issuedAt).toLocaleString('fi-FI')}</div>}
              {invoice.paidAt && <div>Maksettu: {new Date(invoice.paidAt).toLocaleString('fi-FI')}</div>}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Laskunumero</div>
                <Input value={invoice.invoiceNumber} onChange={(event) => updateInvoice(invoice.id, { invoiceNumber: event.target.value.toUpperCase() })} disabled={!isEditable} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Viitenumero</div>
                <Input value={invoice.referenceNumber} onChange={(event) => updateInvoice(invoice.id, { referenceNumber: event.target.value.replace(/\s+/g, '') })} disabled={!isEditable} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Päiväys</div>
                <Input
                  type="date"
                  value={invoice.issueDate}
                  onChange={(event) => updateInvoice(invoice.id, {
                    issueDate: event.target.value,
                    dueDate: addDaysToIsoDate(event.target.value, invoice.paymentTermDays),
                  })}
                  disabled={!isEditable}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Eräpäivä</div>
                <Input type="date" value={invoice.dueDate} onChange={(event) => updateInvoice(invoice.id, { dueDate: event.target.value })} disabled={!isEditable} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Maksuehto (pv)</div>
                <Input
                  type="number"
                  min="0"
                  value={invoice.paymentTermDays}
                  onChange={(event) => {
                    const paymentTermDays = parseInt(event.target.value, 10) || 0;
                    updateInvoice(invoice.id, {
                      paymentTermDays,
                      dueDate: addDaysToIsoDate(invoice.issueDate, paymentTermDays),
                    });
                  }}
                  disabled={!isEditable}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">ALV %</div>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={invoice.vatPercent}
                  onChange={(event) => updateInvoice(invoice.id, { vatPercent: parseFloat(event.target.value) || 0 })}
                  disabled={!isEditable}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Lisätiedot laskulle</div>
              <Textarea
                rows={8}
                value={invoice.notes || ''}
                onChange={(event) => updateInvoice(invoice.id, { notes: event.target.value })}
                placeholder="Lisää laskulle näkyvät lisätiedot tähän."
                disabled={!isEditable}
              />
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Laskurivit</h3>
                <p className="text-sm text-muted-foreground">Rivit on kopioitu hyväksytystä tarjouksesta snapshotiksi.</p>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Koodi</TableHead>
                      <TableHead>Rivi</TableHead>
                      <TableHead className="text-right">Määrä</TableHead>
                      <TableHead className="text-right">Yks.</TableHead>
                      <TableHead className="text-right">Yhteensä</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.rows.map((row) => {
                      const rowCalculation = calculateQuoteRow(row);
                      if (row.mode === 'section') {
                        return (
                          <TableRow key={row.id} className="bg-muted/40">
                            <TableCell colSpan={5} className="font-semibold text-primary">{row.productName}</TableCell>
                          </TableRow>
                        );
                      }

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-muted-foreground">{row.productCode || '-'}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.productName}</div>
                            {row.description && <div className="text-xs text-muted-foreground">{row.description}</div>}
                            {row.notes && <div className="text-xs text-muted-foreground">Huomio: {row.notes}</div>}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(row.quantity, 2)}</TableCell>
                          <TableCell className="text-right">{row.unit}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(rowCalculation.rowTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-0 self-start">
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Laskun yhteenveto</h3>
                <p className="text-sm text-muted-foreground">Maksutiedot ja laskun loppusumma.</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Asiakas</span><span className="text-right font-medium">{invoice.customer.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Eräpäivä</span><span className="text-right font-medium">{invoice.dueDate || '-'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">IBAN</span><span className="text-right font-medium">{invoice.company.iban || '-'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">BIC</span><span className="text-right font-medium">{invoice.company.bic || '-'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Viitenumero</span><span className="text-right font-medium">{invoice.referenceNumber || '-'}</span></div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Rivien välisumma</span><span className="font-medium">{formatCurrency(calculation.lineSubtotal)}</span></div>
                <div className="flex justify-between"><span>Lisäkulut yhteensä</span><span className="font-medium">{formatCurrency(calculation.extraChargesTotal)}</span></div>
                {extraChargeLines.length > 0 && (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                    {extraChargeLines.map((line) => (
                      <div key={line.key} className="flex justify-between gap-4 text-muted-foreground">
                        <span>{line.label}</span>
                        <span className="font-medium">{formatCurrency(line.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between"><span>Alennus</span><span className="font-medium">-{formatCurrency(calculation.discountAmount)}</span></div>
                <div className="flex justify-between"><span>Veroton yhteensä</span><span className="font-medium">{formatCurrency(calculation.subtotal)}</span></div>
                <div className="flex justify-between"><span>ALV {formatNumber(invoice.vatPercent, 1)} %</span><span className="font-medium">{formatCurrency(calculation.vat)}</span></div>
                <div className="flex justify-between border-t pt-3 text-lg font-semibold"><span>Loppusumma</span><span>{formatCurrency(calculation.total)}</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}