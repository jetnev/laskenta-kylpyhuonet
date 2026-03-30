import { useState, useEffect } from 'react';
import { Plus, Trash, Warning, FilePdf, FileXls, Copy, FloppyDisk } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import {
  useProducts,
  useInstallationGroups,
  useQuoteRows,
  useQuotes,
  useProjects,
  useCustomers,
  useQuoteTerms,
  useSettings,
} from '../hooks/use-data';
import { Quote, QuoteRowMode, QuoteRow } from '../lib/types';
import {
  calculateQuoteRow,
  calculateQuote,
  formatCurrency,
  formatNumber,
  canSendQuote,
} from '../lib/calculations';
import { toast } from 'sonner';
import { exportQuoteToPDF, exportQuoteToCustomerExcel, exportQuoteToInternalExcel } from '../lib/export';

interface QuoteEditorProps {
  quote: Quote;
  onClose: () => void;
}

const MODE_LABELS: Record<QuoteRowMode, string> = {
  product: 'Tuote',
  installation: 'Asennus',
  product_installation: 'Tuote + asennus',
};

export default function QuoteEditor({ quote, onClose }: QuoteEditorProps) {
  const { products } = useProducts();
  const { groups } = useInstallationGroups();
  const { rows, addRow, updateRow, deleteRow, getRowsForQuote } = useQuoteRows();
  const { updateQuote, updateQuoteStatus, hasNewerRevision, addQuote } = useQuotes();
  const { getProject } = useProjects();
  const { getCustomer } = useCustomers();
  const { terms, getDefaultTerms } = useQuoteTerms();
  const { settings } = useSettings();

  const quoteRows = getRowsForQuote(quote.id);
  const project = getProject(quote.projectId);
  const customer = project ? getCustomer(project.customerId) : undefined;
  const calculation = calculateQuote(quote, quoteRows);
  const quoteTerms = quote.termsId ? terms.find(t => t.id === quote.termsId) : undefined;
  
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [localNotes, setLocalNotes] = useState(quote.notes || '');
  const [localTitle, setLocalTitle] = useState(quote.title);

  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (quote.status === 'draft') {
        if (localNotes !== quote.notes) {
          updateQuote(quote.id, { notes: localNotes });
        }
        if (localTitle !== quote.title) {
          updateQuote(quote.id, { title: localTitle });
        }
      }
    }, 1000);

    return () => clearTimeout(autoSaveTimer);
  }, [localNotes, localTitle, quote.id, quote.notes, quote.title, quote.status, updateQuote]);

  const handleAddRow = () => {
    const sortOrder = quoteRows.length;
    addRow({
      quoteId: quote.id,
      sortOrder,
      mode: 'product',
      productName: '',
      quantity: 1,
      unit: 'kpl',
      purchasePrice: 0,
      salesPrice: 0,
      installationPrice: 0,
      marginPercent: settings.defaultMarginPercent,
      regionMultiplier: project?.regionCoefficient || 1.0,
    });
  };

  const handleProductSelect = (rowId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const group = product.installationGroupId
      ? groups.find((g) => g.id === product.installationGroupId)
      : undefined;

    const marginPercent = settings.defaultMarginPercent;
    const salesPrice = product.purchasePrice * (1 + marginPercent / 100);

    updateRow(rowId, {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      salesPrice,
      installationPrice: group?.defaultPrice || 0,
      marginPercent,
    });
  };

  const handleRowChange = (rowId: string, field: keyof QuoteRow, value: any) => {
    const row = quoteRows.find((r) => r.id === rowId);
    if (!row) return;

    const updates: Partial<QuoteRow> = { [field]: value };

    if (field === 'purchasePrice' || field === 'marginPercent') {
      const purchasePrice = field === 'purchasePrice' ? value : row.purchasePrice;
      const marginPercent = field === 'marginPercent' ? value : row.marginPercent;
      updates.salesPrice = purchasePrice * (1 + marginPercent / 100);
    }

    updateRow(rowId, updates);
  };

  const handleValidateAndShowDialog = () => {
    const validation = canSendQuote(
      quote,
      quoteRows,
      customer,
      project,
      hasNewerRevision(quote)
    );

    if (!validation.isValid || validation.warnings.length > 0) {
      setShowValidationDialog(true);
    } else {
      handleSendQuote();
    }
  };

  const handleSendQuote = () => {
    const validation = canSendQuote(
      quote,
      quoteRows,
      customer,
      project,
      hasNewerRevision(quote)
    );

    if (!validation.isValid) {
      toast.error('Tarjousta ei voida lähettää', {
        description: validation.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    if (validation.warnings.length > 0) {
      toast.warning('Huomio', {
        description: validation.warnings.map((w) => w.message).join(', '),
      });
    }

    updateQuoteStatus(quote.id, 'sent');
    toast.success('Tarjous lähetetty');
    setShowValidationDialog(false);
  };

  const handleCreateRevision = () => {
    if (!project || !customer) {
      toast.error('Projekti tai asiakas puuttuu');
      return;
    }

    const newRevisionNumber = quote.revisionNumber + 1;
    const newQuote = addQuote({
      projectId: quote.projectId,
      title: quote.title,
      revisionNumber: newRevisionNumber,
      parentQuoteId: quote.parentQuoteId || quote.id,
      status: 'draft',
      vatPercent: quote.vatPercent,
      notes: quote.notes,
      termsId: quote.termsId,
    });

    quoteRows.forEach((row, index) => {
      addRow({
        quoteId: newQuote.id,
        sortOrder: index,
        mode: row.mode,
        productId: row.productId,
        productName: row.productName,
        productCode: row.productCode,
        quantity: row.quantity,
        unit: row.unit,
        purchasePrice: row.purchasePrice,
        salesPrice: row.salesPrice,
        installationPrice: row.installationPrice,
        marginPercent: row.marginPercent,
        overridePrice: row.overridePrice,
        regionMultiplier: row.regionMultiplier,
        notes: row.notes,
      });
    });

    toast.success(`Revisio ${newRevisionNumber} luotu`);
    onClose();
  };

  const handleExportPDF = () => {
    if (!customer || !project) {
      toast.error('Asiakas tai projekti puuttuu');
      return;
    }

    try {
      exportQuoteToPDF(quote, quoteRows, customer, project, quoteTerms, settings);
      toast.success('PDF avattu uuteen ikkunaan');
    } catch (error) {
      toast.error('PDF:n luonti epäonnistui');
      console.error(error);
    }
  };

  const handleExportCustomerExcel = () => {
    if (!customer || !project) {
      toast.error('Asiakas tai projekti puuttuu');
      return;
    }

    try {
      exportQuoteToCustomerExcel(quote, quoteRows, customer, project, quoteTerms, settings);
      toast.success('Asiakas-Excel ladattu');
    } catch (error) {
      toast.error('Excelin luonti epäonnistui');
      console.error(error);
    }
  };

  const handleExportInternalExcel = () => {
    if (!customer || !project) {
      toast.error('Asiakas tai projekti puuttuu');
      return;
    }

    try {
      exportQuoteToInternalExcel(quote, quoteRows, customer, project, settings);
      toast.success('Sisäinen Excel ladattu');
    } catch (error) {
      toast.error('Excelin luonti epäonnistui');
      console.error(error);
    }
  };

  const validation = canSendQuote(
    quote,
    quoteRows,
    customer,
    project,
    hasNewerRevision(quote)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {quote.status === 'draft' ? (
            <Input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="text-2xl font-semibold border-0 p-0 h-auto focus-visible:ring-0"
            />
          ) : (
            <h2 className="text-2xl font-semibold">{quote.title}</h2>
          )}
          <p className="text-sm text-muted-foreground">
            Revisio {quote.revisionNumber} • {customer?.name} • {project?.site}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {quote.status === 'draft' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FloppyDisk className="h-3 w-3" />
              <span>Automaattitallennus</span>
            </div>
          )}
          <Badge
            variant={
              quote.status === 'draft'
                ? 'secondary'
                : quote.status === 'sent'
                  ? 'default'
                  : quote.status === 'accepted'
                    ? 'default'
                    : 'destructive'
            }
          >
            {quote.status === 'draft' && 'Luonnos'}
            {quote.status === 'sent' && 'Lähetetty'}
            {quote.status === 'accepted' && 'Hyväksytty'}
            {quote.status === 'rejected' && 'Hylätty'}
          </Badge>
        </div>
      </div>

      {hasNewerRevision(quote) && (
        <Alert>
          <Warning className="h-4 w-4" />
          <AlertDescription>
            Tästä tarjouksesta on olemassa uudempi revisio. Tätä versiota ei voi enää lähettää.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quote-notes">Tarjoushuomautukset</Label>
            <Textarea
              id="quote-notes"
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Lisää huomautuksia tarjoukseen..."
              rows={3}
              disabled={quote.status !== 'draft'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-terms">Sopimusehdot</Label>
            <Select
              value={quote.termsId || ''}
              onValueChange={(value) => updateQuote(quote.id, { termsId: value })}
              disabled={quote.status !== 'draft'}
            >
              <SelectTrigger id="quote-terms">
                <SelectValue placeholder="Valitse ehdot" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name} {term.isDefault && '(oletus)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Tarjousrivit</h3>
          <Button onClick={handleAddRow} size="sm" className="gap-2">
            <Plus weight="bold" />
            Lisää rivi
          </Button>
        </div>

        {quoteRows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Ei rivejä. Lisää ensimmäinen rivi yllä olevasta painikkeesta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Tyyppi</TableHead>
                  <TableHead>Tuote</TableHead>
                  <TableHead className="w-24">Määrä</TableHead>
                  <TableHead className="w-20">Yks.</TableHead>
                  <TableHead className="text-right">Ostohinta</TableHead>
                  <TableHead className="text-right">Myyntihinta</TableHead>
                  <TableHead className="text-right">As. hinta</TableHead>
                  <TableHead className="text-right">Yhteensä</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quoteRows.map((row) => {
                  const calc = calculateQuoteRow(row);
                  const isEditing = editingRowId === row.id;

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Select
                          value={row.mode}
                          onValueChange={(value: QuoteRowMode) =>
                            handleRowChange(row.id, 'mode', value)
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(MODE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={row.productId || undefined}
                            onValueChange={(value) => handleProductSelect(row.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Valitse tuote" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.code} - {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            onClick={() => setEditingRowId(row.id)}
                            className="text-left hover:underline"
                          >
                            {row.productCode ? `${row.productCode} - ` : ''}
                            {row.productName || 'Valitse tuote'}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity}
                          onChange={(e) =>
                            handleRowChange(row.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="h-8 font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{row.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.salesPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.installationPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(calc.rowTotal)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(row.id)}
                          className="h-8 w-8"
                        >
                          <Trash className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Välisumma:</span>
              <span className="font-mono">{formatCurrency(calculation.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>ALV ({quote.vatPercent}%):</span>
              <span className="font-mono">{formatCurrency(calculation.vat)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Yhteensä:</span>
              <span className="font-mono">{formatCurrency(calculation.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Kate:</span>
              <span className="font-mono">
                {formatCurrency(calculation.totalMargin)} ({formatNumber(calculation.marginPercent, 1)}%)
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Sulje
        </Button>
        <div className="flex gap-2">
          {quote.status !== 'draft' && !hasNewerRevision(quote) && (
            <Button variant="outline" onClick={handleCreateRevision} className="gap-2">
              <Copy />
              Luo revisio
            </Button>
          )}
          
          <Dialog open={showExportMenu} onOpenChange={setShowExportMenu}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FilePdf />
                Vie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vie tarjous</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Button onClick={handleExportPDF} variant="outline" className="w-full gap-2 justify-start">
                  <FilePdf />
                  Vie PDF (asiakas)
                </Button>
                <Button onClick={handleExportCustomerExcel} variant="outline" className="w-full gap-2 justify-start">
                  <FileXls />
                  Vie Excel (asiakas)
                </Button>
                <Button onClick={handleExportInternalExcel} variant="outline" className="w-full gap-2 justify-start">
                  <FileXls />
                  Vie Excel (sisäinen)
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {quote.status === 'draft' && !hasNewerRevision(quote) && (
            <Button onClick={handleValidateAndShowDialog}>Lähetä tarjous</Button>
          )}
        </div>
      </div>

      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarkista tarjous ennen lähetystä</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-semibold mb-2">Virheet (estävät lähetyksen):</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {validation.warnings.length > 0 && (
              <Alert>
                <Warning className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Varoitukset:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validation.isValid && validation.warnings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Tarjous on valmis lähetettäväksi. Vahvista lähettäminen alla olevasta painikkeesta.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Peruuta
            </Button>
            <Button onClick={handleSendQuote} disabled={!validation.isValid}>
              Lähetä
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
