import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Copy,
  FilePdf,
  FileXls,
  FloppyDisk,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  Trash,
  Warning,
  XCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { ResponsiveDialog } from './ResponsiveDialog';
import ScheduleSection from './ScheduleSection';
import {
  useCustomers,
  useInstallationGroups,
  useProducts,
  useProjects,
  useQuoteRows,
  useQuotes,
  useQuoteTerms,
  useSettings,
  useSubstituteProducts,
} from '../hooks/use-data';
import { Product, Quote, QuoteChargeType, QuoteRow, QuoteRowMode } from '../lib/types';
import {
  calculateQuote,
  calculateQuoteRow,
  calculateTravelCosts,
  canSendQuote,
  formatCurrency,
  formatNumber,
  getQuoteExtraChargeLines,
} from '../lib/calculations';
import {
  exportQuoteToCustomerExcel,
  exportQuoteToInternalExcel,
  exportQuoteToPDF,
} from '../lib/export';

interface QuoteEditorProps {
  projectId: string;
  quoteId: string | null;
  onClose: () => void;
}

const ROW_MODE_LABELS: Record<QuoteRowMode, string> = {
  product: 'Tuote',
  installation: 'Asennus',
  product_installation: 'Tuote + asennus',
  section: 'Väliotsikko',
  charge: 'Veloitus',
};

const STATUS_LABELS = {
  draft: 'Luonnos',
  sent: 'Lähetetty',
  accepted: 'Hyväksytty',
  rejected: 'Hylätty',
} as const;

const CHARGE_TYPE_LABELS: Record<QuoteChargeType, string> = {
  project: 'Projektikulu',
  delivery: 'Toimitus',
  installation: 'Asennus',
  travel: 'Kilometrikorvaus',
  disposal: 'Kaatopaikkamaksu',
  demolition: 'Purkukulu',
  protection: 'Suojaus- ja peittokulu',
  permit: 'Lupamaksu',
  other: 'Muu veloitus',
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateSalesPrice(purchasePrice: number, marginPercent: number) {
  return roundCurrency(Math.max(0, purchasePrice) * (1 + Math.max(0, marginPercent) / 100));
}

function getStatusVariant(status: Quote['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'accepted') return 'default';
  if (status === 'rejected') return 'destructive';
  if (status === 'sent') return 'outline';
  return 'secondary';
}

export default function QuoteEditor({ projectId, quoteId, onClose }: QuoteEditorProps) {
  const { products } = useProducts();
  const { groups } = useInstallationGroups();
  const { getSubstitutesForProduct } = useSubstituteProducts();
  const { addRow, deleteRow, deleteRows, getRowsForQuote, updateRow } = useQuoteRows();
  const { addQuote, getQuote, getQuotesForProject, hasNewerRevision, updateQuote, updateQuoteStatus } = useQuotes();
  const { getProject } = useProjects();
  const { getCustomer } = useCustomers();
  const { getDefaultTerms, terms } = useQuoteTerms();
  const { settings } = useSettings();
  const project = getProject(projectId);
  const customer = project ? getCustomer(project.customerId) : undefined;
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(quoteId);
  const [productSearch, setProductSearch] = useState('');
  const [validationOpen, setValidationOpen] = useState(false);
  const [bootstrapQuote, setBootstrapQuote] = useState<Quote | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [quoteLookupTimedOut, setQuoteLookupTimedOut] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const initializedDraftRef = useRef(false);

  useEffect(() => {
    setActiveQuoteId(quoteId);
    initializedDraftRef.current = Boolean(quoteId);
    setBootstrapQuote(null);
    setBootstrapError(null);
    setQuoteLookupTimedOut(false);
    setSelectedRowIds([]);
  }, [quoteId]);

  useEffect(() => {
    setQuoteLookupTimedOut(false);
    if (!activeQuoteId) {
      return;
    }
    const timer = window.setTimeout(() => {
      setQuoteLookupTimedOut(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [activeQuoteId]);

  useEffect(() => {
    if (!project || activeQuoteId || initializedDraftRef.current) return;
    try {
      const defaultTerms = getDefaultTerms();
      const newQuote = addQuote({
        projectId,
        title: `${project.name} tarjous`,
        quoteNumber: '',
        revisionNumber: 1,
        termsId: defaultTerms?.id,
        pricingMode: 'margin',
        selectedMarginPercent: settings.defaultMarginPercent,
        vatPercent: settings.defaultVatPercent,
        discountType: 'none',
        discountValue: 0,
        projectCosts: 0,
        deliveryCosts: 0,
        installationCosts: 0,
        travelKilometers: 0,
        travelRatePerKm: 0,
        disposalCosts: 0,
        demolitionCosts: 0,
        protectionCosts: 0,
        permitCosts: 0,
        notes: '',
        internalNotes: '',
        scheduleMilestones: [],
      });
      initializedDraftRef.current = true;
      setBootstrapQuote(newQuote);
      setBootstrapError(null);
      setActiveQuoteId(newQuote.id);
    } catch (error) {
      initializedDraftRef.current = true;
      setBootstrapError(error instanceof Error ? error.message : 'Tarjouksen luonnissa tapahtui virhe.');
    }
  }, [activeQuoteId, addQuote, getDefaultTerms, project, projectId, settings]);

  const quote = useMemo(() => {
    if (!activeQuoteId) {
      return bootstrapQuote;
    }
    return getQuote(activeQuoteId) ?? (bootstrapQuote?.id === activeQuoteId ? bootstrapQuote : null);
  }, [activeQuoteId, bootstrapQuote, getQuote]);
  const quoteRows = useMemo(() => (quote ? getRowsForQuote(quote.id) : []), [getRowsForQuote, quote]);
  useEffect(() => {
    setSelectedRowIds((current) => {
      const availableIds = new Set(quoteRows.map((row) => row.id));
      const next = current.filter((rowId) => availableIds.has(rowId));
      return next.length === current.length ? current : next;
    });
  }, [quoteRows]);
  const quoteTerms = terms.find((term) => term.id === quote?.termsId);
  const projectQuotes = useMemo(() => getQuotesForProject(projectId), [getQuotesForProject, projectId]);
  const quoteHasNewerRevision = quote ? hasNewerRevision(quote) : false;
  const isEditable = Boolean(quote && quote.status === 'draft' && !quoteHasNewerRevision);
  const calculation = quote ? calculateQuote(quote, quoteRows) : null;
  const travelCosts = quote ? calculateTravelCosts(quote) : 0;
  const extraChargeLines = quote ? getQuoteExtraChargeLines(quote) : [];
  const activeExtraChargeLines = extraChargeLines.filter((line) => line.amount > 0);
  const validation = useMemo(
    () => (quote ? canSendQuote(quote, quoteRows, customer, project, quoteHasNewerRevision) : null),
    [customer, project, quote, quoteHasNewerRevision, quoteRows]
  );

  const matchingProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return products.slice(0, 8);
    return products
      .filter((product) =>
        [
          product.code,
          product.internalCode,
          product.name,
          product.description,
          product.category,
          product.brand,
          product.manufacturer,
          product.searchableText,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(search))
      )
      .slice(0, 8);
  }, [productSearch, products]);
  const selectedRowIdSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);
  const allRowsSelected = quoteRows.length > 0 && selectedRowIds.length === quoteRows.length;

  if (!project) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Tarjouseditori" maxWidth="full">
        <Card className="p-10 text-center text-muted-foreground">
          Projektia ei löytynyt. Sulje editori ja avaa tarjous projektin kautta uudelleen.
        </Card>
      </ResponsiveDialog>
    );
  }

  if (!customer) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Tarjouseditori" maxWidth="full">
        <Card className="p-10 text-center text-muted-foreground">
          Projektin asiakas puuttuu tai on poistettu. Korjaa asiakasprojekti ennen tarjouksen avaamista.
        </Card>
      </ResponsiveDialog>
    );
  }

  if (!quote) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Tarjouseditori" maxWidth="full">
        <Card className="p-10 text-center text-muted-foreground">
          {bootstrapError
            ? bootstrapError
            : quoteLookupTimedOut
              ? 'Tarjousta ei saatu avattua. Sulje editori ja yrita uudelleen.'
              : 'Ladataan tarjousta...'}
        </Card>
      </ResponsiveDialog>
    );
  }

  if (!calculation || !validation) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Tarjouseditori" maxWidth="full">
        <Card className="p-10 text-center text-muted-foreground">
          Tarjouksen laskentaa ei voitu alustaa. Sulje editori ja yrita uudelleen.
        </Card>
      </ResponsiveDialog>
    );
  }

  const touchQuote = () => {
    updateQuote(quote.id, {});
  };

  const getDefaultMargin = (product?: Product, installationGroupId?: string) => {
    const group = installationGroupId ? groups.find((item) => item.id === installationGroupId) : undefined;
    return product?.defaultSalesMarginPercent
      ?? group?.defaultMarginPercent
      ?? quote.selectedMarginPercent
      ?? settings.defaultMarginPercent;
  };

  const buildProductRow = (product: Product): Omit<QuoteRow, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt' | 'createdByUserId' | 'updatedByUserId'> => {
    const group = product.installationGroupId ? groups.find((item) => item.id === product.installationGroupId) : undefined;
    const marginPercent = getDefaultMargin(product, product.installationGroupId);
    const installationPrice = product.defaultInstallationPrice ?? group?.defaultInstallationPrice ?? group?.defaultPrice ?? 0;
    return {
      quoteId: quote.id,
      sortOrder: quoteRows.length,
      mode: installationPrice > 0 ? 'product_installation' : 'product',
      source: 'catalog',
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      description: product.description,
      quantity: 1,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      salesPrice: calculateSalesPrice(product.purchasePrice, marginPercent),
      installationPrice,
      marginPercent,
      regionMultiplier: project.regionCoefficient || 1,
      installationGroupId: product.installationGroupId,
      notes: '',
      manualSalesPrice: false,
    };
  };

  const addProductRow = (product: Product) => {
    addRow(buildProductRow(product));
    touchQuote();
    setProductSearch('');
    toast.success(`Lisätty ${product.name} tarjoukselle.`);
  };

  const addManualRow = (mode: QuoteRowMode) => {
    const baseRow: Omit<QuoteRow, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt' | 'createdByUserId' | 'updatedByUserId'> = {
      quoteId: quote.id,
      sortOrder: quoteRows.length,
      mode,
      source: 'manual',
      productName: mode === 'section' ? 'Uusi väliotsikko' : mode === 'charge' ? 'Lisäveloitus' : '',
      productCode: '',
      description: '',
      quantity: mode === 'section' ? 0 : 1,
      unit: mode === 'section' ? 'erä' : mode === 'charge' ? 'erä' : 'kpl',
      purchasePrice: 0,
      salesPrice: 0,
      installationPrice: 0,
      marginPercent: quote.selectedMarginPercent,
      regionMultiplier: project.regionCoefficient || 1,
      notes: '',
      manualSalesPrice: mode === 'charge',
      chargeType: mode === 'charge' ? 'other' : undefined,
    };
    addRow(baseRow);
    touchQuote();
  };

  const syncRowWithMargin = (row: QuoteRow, marginPercent: number) => {
    if (row.mode === 'section' || row.mode === 'charge' || row.mode === 'installation') return;
    updateRow(row.id, {
      marginPercent,
      salesPrice: calculateSalesPrice(row.purchasePrice, marginPercent),
      manualSalesPrice: false,
    });
  };

  const patchRow = (row: QuoteRow, updates: Partial<QuoteRow>) => {
    const nextRow = { ...row, ...updates };

    if ('installationGroupId' in updates && nextRow.installationGroupId) {
      const group = groups.find((item) => item.id === nextRow.installationGroupId);
      if (group && row.mode !== 'section' && row.mode !== 'charge') {
        nextRow.installationPrice = nextRow.installationPrice || group.defaultInstallationPrice || group.defaultPrice;
      }
    }

    if (('purchasePrice' in updates || 'marginPercent' in updates) && quote.pricingMode === 'margin' && !nextRow.manualSalesPrice && nextRow.mode !== 'section' && nextRow.mode !== 'charge' && nextRow.mode !== 'installation') {
      nextRow.salesPrice = calculateSalesPrice(nextRow.purchasePrice, nextRow.marginPercent);
    }

    if ('salesPrice' in updates) {
      nextRow.manualSalesPrice = quote.pricingMode === 'manual' ? true : Boolean(nextRow.manualSalesPrice);
      if (nextRow.mode !== 'section' && nextRow.mode !== 'charge') {
        nextRow.marginPercent = nextRow.salesPrice > 0
          ? roundCurrency(((nextRow.salesPrice - nextRow.purchasePrice) / nextRow.salesPrice) * 100)
          : 0;
      }
    }

    updateRow(row.id, nextRow);
    touchQuote();
  };

  const moveRow = (rowId: string, direction: -1 | 1) => {
    const currentIndex = quoteRows.findIndex((row) => row.id === rowId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= quoteRows.length) return;
    const current = quoteRows[currentIndex];
    const target = quoteRows[targetIndex];
    updateRow(current.id, { sortOrder: target.sortOrder });
    updateRow(target.id, { sortOrder: current.sortOrder });
    touchQuote();
  };

  const cloneRow = (row: QuoteRow) => {
    addRow({
      ...row,
      quoteId: quote.id,
      sortOrder: quoteRows.length,
      productName: row.mode === 'section' ? `${row.productName} (kopio)` : row.productName,
    });
    touchQuote();
    toast.success('Rivi kopioitu listan loppuun.');
  };

  const removeRow = (rowId: string) => {
    if (!window.confirm('Haluatko varmasti poistaa tarjousrivin?')) return;
    deleteRow(rowId);
    touchQuote();
  };

  const toggleRowSelection = (rowId: string) => {
    setSelectedRowIds((current) =>
      current.includes(rowId) ? current.filter((selectedId) => selectedId !== rowId) : [...current, rowId]
    );
  };

  const toggleAllRowSelections = () => {
    setSelectedRowIds(allRowsSelected ? [] : quoteRows.map((row) => row.id));
  };

  const removeSelectedRows = () => {
    const count = selectedRowIds.length;
    if (count === 0) return;
    if (!window.confirm(`Haluatko varmasti poistaa ${count} valittua tarjousriviä?`)) return;
    deleteRows(selectedRowIds);
    setSelectedRowIds([]);
    touchQuote();
    toast.success(count === 1 ? '1 tarjousrivi poistettu.' : `${count} tarjousriviä poistettu.`);
  };

  const applyQuoteMargin = (marginPercent: number) => {
    updateQuote(quote.id, { selectedMarginPercent: marginPercent });
    if (quote.pricingMode === 'margin') {
      quoteRows.forEach((row) => {
        if (!row.manualSalesPrice) {
          syncRowWithMargin(row, marginPercent);
        }
      });
    }
  };

  const createRevision = () => {
    const familyId = quote.parentQuoteId || quote.id;
    const nextRevision = Math.max(
      ...projectQuotes
        .filter((candidate) => (candidate.parentQuoteId || candidate.id) === familyId)
        .map((candidate) => candidate.revisionNumber),
      quote.revisionNumber
    ) + 1;

    const nextQuote = addQuote({
      projectId: quote.projectId,
      title: quote.title,
      quoteNumber: '',
      revisionNumber: nextRevision,
      parentQuoteId: familyId,
      status: 'draft',
      vatPercent: quote.vatPercent,
      validUntil: quote.validUntil,
      notes: quote.notes,
      internalNotes: quote.internalNotes,
      scheduleMilestones: quote.scheduleMilestones,
      termsId: quote.termsId,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      projectCosts: quote.projectCosts,
      deliveryCosts: quote.deliveryCosts,
      installationCosts: quote.installationCosts,
      travelKilometers: quote.travelKilometers,
      travelRatePerKm: quote.travelRatePerKm,
      disposalCosts: quote.disposalCosts,
      demolitionCosts: quote.demolitionCosts,
      protectionCosts: quote.protectionCosts,
      permitCosts: quote.permitCosts,
      selectedMarginPercent: quote.selectedMarginPercent,
      pricingMode: quote.pricingMode,
    });

    quoteRows.forEach((row, index) => {
      addRow({
        ...row,
        quoteId: nextQuote.id,
        sortOrder: index,
      });
    });
    toast.success(`Revisio ${nextRevision} luotu.`);
    setActiveQuoteId(nextQuote.id);
  };

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>Sulje</Button>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button variant="outline" onClick={() => exportQuoteToPDF(quote, quoteRows, customer, project, quoteTerms, settings)}>
          <FilePdf className="h-4 w-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={() => exportQuoteToCustomerExcel(quote, quoteRows, customer, project, quoteTerms, settings)}>
          <FileXls className="h-4 w-4" />
          Asiakas-Excel
        </Button>
        <Button variant="outline" onClick={() => exportQuoteToInternalExcel(quote, quoteRows, customer, project, quoteTerms, settings)}>
          <FileXls className="h-4 w-4" />
          Sisäinen Excel
        </Button>
        {quote.status === 'sent' && (
          <>
            <Button variant="outline" onClick={() => updateQuoteStatus(quote.id, 'accepted')}>
              <CheckCircle className="h-4 w-4" />
              Hyväksy
            </Button>
            <Button variant="outline" onClick={() => updateQuoteStatus(quote.id, 'rejected')}>
              <XCircle className="h-4 w-4" />
              Hylkää
            </Button>
          </>
        )}
        {quote.status !== 'draft' && !quoteHasNewerRevision && (
          <Button variant="outline" onClick={createRevision}>
            <Copy className="h-4 w-4" />
            Luo revisio
          </Button>
        )}
        {quote.status === 'draft' && (
          <Button onClick={() => setValidationOpen(true)} disabled={!validation.isValid && validation.errors.length > 0}>
            <PaperPlaneTilt className="h-4 w-4" />
            Lähetä tarjous
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Tarjouseditori" footer={footer} maxWidth="full">
        <div className="space-y-6 pb-2">
          <Card className="p-6 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusVariant(quote.status)}>{STATUS_LABELS[quote.status]}</Badge>
                  <Badge variant="outline">Revisio {quote.revisionNumber}</Badge>
                  <Badge variant="outline">{quote.quoteNumber}</Badge>
                </div>
                <Input
                  value={quote.title}
                  onChange={(event) => updateQuote(quote.id, { title: event.target.value })}
                  className="max-w-2xl border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
                  disabled={!isEditable}
                />
                <p className="text-sm text-muted-foreground">
                  {customer.name} • {project.name} • {project.site}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FloppyDisk className="h-4 w-4" />
                  Tallennus tapahtuu automaattisesti
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div>Luotu: {new Date(quote.createdAt).toLocaleString('fi-FI')}</div>
                  <div>Päivitetty: {new Date(quote.updatedAt).toLocaleString('fi-FI')}</div>
                  {quote.sentAt && <div>Lähetetty: {new Date(quote.sentAt).toLocaleString('fi-FI')}</div>}
                </div>
              </div>
            </div>

            {quoteHasNewerRevision && (
              <Alert>
                <Warning className="h-4 w-4" />
                <AlertDescription>
                  Tarjouksesta on olemassa uudempi revisio. Tämä versio on lukutilassa.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quote-number">Tarjousnumero</Label>
                  <Input id="quote-number" value={quote.quoteNumber} onChange={(event) => updateQuote(quote.id, { quoteNumber: event.target.value })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid-until">Voimassa asti</Label>
                  <Input id="valid-until" type="date" value={quote.validUntil || ''} onChange={(event) => updateQuote(quote.id, { validUntil: event.target.value })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricing-mode">Hinnoittelutapa</Label>
                  <Select
                    value={quote.pricingMode}
                    onValueChange={(value) => {
                      updateQuote(quote.id, { pricingMode: value as Quote['pricingMode'] });
                      if (value === 'margin') {
                        quoteRows.forEach((row) => {
                          if (!row.manualSalesPrice) {
                            syncRowWithMargin(row, quote.selectedMarginPercent);
                          }
                        });
                      }
                    }}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="pricing-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="margin">Kateohjattu</SelectItem>
                      <SelectItem value="manual">Manuaalinen myyntihinta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-margin">Oletuskate %</Label>
                  <Input id="quote-margin" type="number" min="0" step="0.1" value={quote.selectedMarginPercent} onChange={(event) => applyQuoteMargin(parseFloat(event.target.value) || 0)} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat">ALV %</Label>
                  <Input id="vat" type="number" min="0" step="0.1" value={quote.vatPercent} onChange={(event) => updateQuote(quote.id, { vatPercent: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terms">Ehtopohja</Label>
                  <Select value={quote.termsId || 'none'} onValueChange={(value) => updateQuote(quote.id, { termsId: value === 'none' ? undefined : value })} disabled={!isEditable}>
                    <SelectTrigger id="terms"><SelectValue placeholder="Valitse ehtopohja" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ei ehtopohjaa</SelectItem>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>{term.name}{term.isDefault ? ' (oletus)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Alennus</Label>
                  <Select value={quote.discountType} onValueChange={(value) => updateQuote(quote.id, { discountType: value as Quote['discountType'] })} disabled={!isEditable}>
                    <SelectTrigger id="discount-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ei alennusta</SelectItem>
                      <SelectItem value="percent">Prosentti</SelectItem>
                      <SelectItem value="amount">Eurot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-value">Alennuksen arvo</Label>
                  <Input id="discount-value" type="number" min="0" step="0.01" value={quote.discountValue} onChange={(event) => updateQuote(quote.id, { discountValue: parseFloat(event.target.value) || 0 })} disabled={!isEditable || quote.discountType === 'none'} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Korjausrakentamisen lisäkulut</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Erota työmaan lisäkulut omaksi kokonaisuudekseen. Näin kilometrit, jätemaksut, suojaus ja muut kustannukset eivät huku rivihinnoittelun sekaan.
                  </p>
                </div>
                <div className="rounded-xl border bg-background px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Lisäkulut yhteensä</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(calculation.extraChargesTotal)}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="project-costs">Muut projektikulut</Label>
                  <Input id="project-costs" type="number" min="0" step="0.01" value={quote.projectCosts} onChange={(event) => updateQuote(quote.id, { projectCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-costs">Toimituskulut</Label>
                  <Input id="delivery-costs" type="number" min="0" step="0.01" value={quote.deliveryCosts} onChange={(event) => updateQuote(quote.id, { deliveryCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installation-costs">Asennuskulut erillisenä rivinä</Label>
                  <Input id="installation-costs" type="number" min="0" step="0.01" value={quote.installationCosts} onChange={(event) => updateQuote(quote.id, { installationCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travel-kilometers">Kilometrit</Label>
                  <Input id="travel-kilometers" type="number" min="0" step="1" value={quote.travelKilometers ?? 0} onChange={(event) => updateQuote(quote.id, { travelKilometers: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travel-rate">Km-hinta</Label>
                  <Input id="travel-rate" type="number" min="0" step="0.01" value={quote.travelRatePerKm ?? 0} onChange={(event) => updateQuote(quote.id, { travelRatePerKm: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label>Ajokulu yhteensä</Label>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(travelCosts)}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="disposal-costs">Kaatopaikka- ja jätemaksut</Label>
                  <Input id="disposal-costs" type="number" min="0" step="0.01" value={quote.disposalCosts ?? 0} onChange={(event) => updateQuote(quote.id, { disposalCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demolition-costs">Purkutyön lisäkulut</Label>
                  <Input id="demolition-costs" type="number" min="0" step="0.01" value={quote.demolitionCosts ?? 0} onChange={(event) => updateQuote(quote.id, { demolitionCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protection-costs">Suojaus- ja peittokulut</Label>
                  <Input id="protection-costs" type="number" min="0" step="0.01" value={quote.protectionCosts ?? 0} onChange={(event) => updateQuote(quote.id, { protectionCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permit-costs">Lupa- ja käsittelymaksut</Label>
                  <Input id="permit-costs" type="number" min="0" step="0.01" value={quote.permitCosts ?? 0} onChange={(event) => updateQuote(quote.id, { permitCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quote-notes">Tarjoushuomautukset</Label>
                <Textarea id="quote-notes" value={quote.notes || ''} onChange={(event) => updateQuote(quote.id, { notes: event.target.value })} disabled={!isEditable} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal-notes">Sisäiset muistiinpanot</Label>
                <Textarea id="internal-notes" value={quote.internalNotes || ''} onChange={(event) => updateQuote(quote.id, { internalNotes: event.target.value })} disabled={!isEditable} rows={4} />
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.95fr)]">
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="product-search">Lisää tuotteita tarjoukselle</Label>
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="product-search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Hae koodilla, nimellä tai kuvauksella" className="pl-10" disabled={!isEditable} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => addManualRow('product')} disabled={!isEditable}><Plus className="h-4 w-4" /> Lisää käsin</Button>
                    <Button variant="outline" onClick={() => addManualRow('section')} disabled={!isEditable}><Plus className="h-4 w-4" /> Väliotsikko</Button>
                    <Button variant="outline" onClick={() => addManualRow('charge')} disabled={!isEditable}><Plus className="h-4 w-4" /> Veloitus</Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {matchingProducts.map((product) => (
                    <button
                      key={product.id}
                      className="rounded-xl border px-4 py-3 text-left transition hover:border-primary hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!isEditable}
                      onClick={() => addProductRow(product)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{product.code} • {product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.description || product.category || 'Tuoterekisterin tuote'}</div>
                        </div>
                        <Badge variant="outline">{formatCurrency(product.purchasePrice)}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Tarjousrivit</h3>
                    <p className="text-sm text-muted-foreground">Lisää käsin, tuoterekisteristä tai käytä väliotsikoita ja lisäveloituksia.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRowIds.length > 0 && <Badge variant="secondary">{selectedRowIds.length} valittu</Badge>}
                    <Badge variant="outline">{quoteRows.length} riviä</Badge>
                    <Button size="sm" variant="outline" onClick={toggleAllRowSelections} disabled={!isEditable || quoteRows.length === 0}>
                      {allRowsSelected ? 'Poista valinta' : 'Valitse kaikki'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={removeSelectedRows} disabled={!isEditable || selectedRowIds.length === 0}>
                      <Trash className="h-4 w-4" />
                      Poista valitut
                    </Button>
                  </div>
                </div>

                {quoteRows.length === 0 ? (
                  <Card className="border-dashed p-10 text-center text-muted-foreground">Tarjouksella ei ole vielä rivejä.</Card>
                ) : (
                  <div className="space-y-4">
                    {quoteRows.map((row, index) => {
                      const rowCalculation = calculateQuoteRow(row);
                      const substitutes = row.productId
                        ? getSubstitutesForProduct(row.productId)
                            .map((item) => products.find((product) => product.id === item.substituteProductId))
                            .filter((item): item is Product => Boolean(item))
                        : [];

                      return (
                        <Card key={row.id} className="border-border/80 p-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <Checkbox
                                  checked={selectedRowIdSet.has(row.id)}
                                  onCheckedChange={() => toggleRowSelection(row.id)}
                                  disabled={!isEditable}
                                  aria-label={`Valitse tarjousrivi ${index + 1}`}
                                />
                                <Badge variant="outline">#{index + 1}</Badge>
                                <Badge variant="secondary">{ROW_MODE_LABELS[row.mode]}</Badge>
                                {row.chargeType && <Badge variant="outline">{CHARGE_TYPE_LABELS[row.chargeType]}</Badge>}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="ghost" onClick={() => moveRow(row.id, -1)} disabled={!isEditable || index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => moveRow(row.id, 1)} disabled={!isEditable || index === quoteRows.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => cloneRow(row)} disabled={!isEditable}><Copy className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => removeRow(row.id)} disabled={!isEditable}><Trash className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="space-y-2">
                                <Label>Tyyppi</Label>
                                <Select value={row.mode} onValueChange={(value) => patchRow(row, { mode: value as QuoteRowMode })} disabled={!isEditable}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ROW_MODE_LABELS).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {row.mode === 'charge' && (
                                <div className="space-y-2">
                                  <Label>Veloituksen tyyppi</Label>
                                  <Select value={row.chargeType || 'other'} onValueChange={(value) => patchRow(row, { chargeType: value as QuoteChargeType })} disabled={!isEditable}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(CHARGE_TYPE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label>Tuotekoodi</Label>
                                <Input value={row.productCode || ''} onChange={(event) => patchRow(row, { productCode: event.target.value })} disabled={!isEditable || row.mode === 'section'} />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>{row.mode === 'section' ? 'Väliotsikko' : 'Tuotenimi'}</Label>
                                <Input value={row.productName} onChange={(event) => patchRow(row, { productName: event.target.value })} disabled={!isEditable} />
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="space-y-2 xl:col-span-2">
                                <Label>Kuvaus</Label>
                                <Textarea value={row.description || ''} onChange={(event) => patchRow(row, { description: event.target.value })} disabled={!isEditable || row.mode === 'section'} rows={2} />
                              </div>
                              <div className="space-y-2 xl:col-span-2">
                                <Label>Rivihuomautus</Label>
                                <Textarea value={row.notes || ''} onChange={(event) => patchRow(row, { notes: event.target.value })} disabled={!isEditable || row.mode === 'section'} rows={2} />
                              </div>
                            </div>

                            {row.mode !== 'section' && (
                              <>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                                  <div className="space-y-2">
                                    <Label>Määrä</Label>
                                    <Input type="number" min="0" step="0.01" value={row.quantity} onChange={(event) => patchRow(row, { quantity: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Yksikkö</Label>
                                    <Input value={row.unit} onChange={(event) => patchRow(row, { unit: event.target.value })} disabled={!isEditable} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Ostohinta</Label>
                                    <Input type="number" min="0" step="0.01" value={row.purchasePrice} onChange={(event) => patchRow(row, { purchasePrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Kate %</Label>
                                    <Input type="number" min="0" step="0.1" value={row.marginPercent} onChange={(event) => patchRow(row, { marginPercent: parseFloat(event.target.value) || 0, manualSalesPrice: false })} disabled={!isEditable || row.mode === 'charge' || quote.pricingMode === 'manual'} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Myyntihinta</Label>
                                    <Input type="number" min="0" step="0.01" value={row.salesPrice} onChange={(event) => patchRow(row, { salesPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'installation'} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Asennushinta</Label>
                                    <Input type="number" min="0" step="0.01" value={row.installationPrice} onChange={(event) => patchRow(row, { installationPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                  <div className="space-y-2">
                                    <Label>Hintaryhmä</Label>
                                    <Select value={row.installationGroupId || 'none'} onValueChange={(value) => patchRow(row, { installationGroupId: value === 'none' ? undefined : value })} disabled={!isEditable || row.mode === 'charge'}>
                                      <SelectTrigger><SelectValue placeholder="Ei hintaryhmää" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Ei hintaryhmää</SelectItem>
                                        {groups.map((group) => (
                                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Aluekerroin</Label>
                                    <Input type="number" min="0" step="0.01" value={row.regionMultiplier} onChange={(event) => patchRow(row, { regionMultiplier: parseFloat(event.target.value) || 1 })} disabled={!isEditable} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Todellinen kate</Label>
                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(rowCalculation.marginAmount)}</div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Kate % toteuma</Label>
                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatNumber(rowCalculation.marginPercent, 1)} %</div>
                                  </div>
                                </div>

                                {substitutes.length > 0 && (
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="mb-2 text-sm font-medium">Korvaavat tuotteet</div>
                                    <div className="flex flex-wrap gap-2">
                                      {substitutes.map((product) => (
                                        <Button
                                          key={product.id}
                                          variant="outline"
                                          size="sm"
                                          disabled={!isEditable}
                                          onClick={() => patchRow(row, { ...buildProductRow(product), quantity: row.quantity, sortOrder: row.sortOrder })}
                                        >
                                          {product.code} • {product.name}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            <Separator />
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="rounded-xl border bg-muted/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Rivisumma</div>
                                <div className="mt-1 text-lg font-semibold">{formatCurrency(rowCalculation.rowTotal)}</div>
                              </div>
                              <div className="rounded-xl border bg-muted/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Ostokustannus</div>
                                <div className="mt-1 text-lg font-semibold">{formatCurrency(rowCalculation.costTotal)}</div>
                              </div>
                              <div className="rounded-xl border bg-muted/20 p-3">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Myynti + asennus</div>
                                <div className="mt-1 text-lg font-semibold">{formatCurrency(rowCalculation.productTotal + rowCalculation.installationTotal)}</div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
            <div className="space-y-6 xl:sticky xl:top-0 self-start">
              <Card className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Tarjouksen yhteenveto</h3>
                  <p className="text-sm text-muted-foreground">Asiakas-, projekti- ja summatiedot tulostusta varten.</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Asiakas</span><span className="text-right font-medium">{customer.name}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Projekti</span><span className="text-right font-medium">{project.name}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Voimassa asti</span><span className="text-right font-medium">{quote.validUntil || '-'}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Rivejä</span><span className="text-right font-medium">{quoteRows.filter((row) => row.mode !== 'section').length}</span></div>
                </div>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span>Rivien välisumma</span><span className="font-medium">{formatCurrency(calculation.lineSubtotal)}</span></div>
                  <div className="flex justify-between"><span>Lisäkulut yhteensä</span><span className="font-medium">{formatCurrency(calculation.extraChargesTotal)}</span></div>
                  {activeExtraChargeLines.length > 0 && (
                    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                      {activeExtraChargeLines.map((line) => (
                        <div key={line.key} className="flex justify-between gap-4 text-muted-foreground">
                          <span>{line.label}</span>
                          <span className="font-medium">{formatCurrency(line.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between"><span>Alennus</span><span className="font-medium">-{formatCurrency(calculation.discountAmount)}</span></div>
                  <div className="flex justify-between"><span>Välisumma</span><span className="font-medium">{formatCurrency(calculation.subtotal)}</span></div>
                  <div className="flex justify-between"><span>ALV {formatNumber(quote.vatPercent, 1)} %</span><span className="font-medium">{formatCurrency(calculation.vat)}</span></div>
                  <div className="flex justify-between border-t pt-3 text-lg font-semibold"><span>Loppusumma</span><span>{formatCurrency(calculation.total)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Kokonaiskate</span><span>{formatCurrency(calculation.totalMargin)} ({formatNumber(calculation.marginPercent, 1)} %)</span></div>
                </div>
                {quoteTerms && (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-sm font-medium">Ehtopohja</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{quoteTerms.content}</div>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <ScheduleSection milestones={quote.scheduleMilestones || []} onChange={(scheduleMilestones) => updateQuote(quote.id, { scheduleMilestones })} disabled={!isEditable} />
              </Card>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarkista tarjous ennen lähetystä</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium">Lähetys estyy näiden virheiden vuoksi:</div>
                  <ul className="mt-2 list-disc pl-5">
                    {validation.errors.map((error) => <li key={error.field}>{error.message}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {validation.warnings.length > 0 && (
              <Alert>
                <Warning className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Tarkista vielä nämä varoitukset:</div>
                  <ul className="mt-2 list-disc pl-5">
                    {validation.warnings.map((warning) => <li key={warning.field}>{warning.message}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationOpen(false)}>Peruuta</Button>
            <Button
              onClick={() => {
                if (!validation.isValid) {
                  toast.error('Tarjous ei ole valmis lähetettäväksi.');
                  return;
                }
                updateQuoteStatus(quote.id, 'sent');
                setValidationOpen(false);
                toast.success('Tarjous merkitty lähetetyksi.');
              }}
              disabled={!validation.isValid}
            >
              <PaperPlaneTilt className="h-4 w-4" />
              Vahvista lähetys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
