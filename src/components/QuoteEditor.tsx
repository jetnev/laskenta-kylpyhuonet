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
  Receipt,
  Trash,
  Warning,
  XCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import InvoiceEditor from './InvoiceEditor';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
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
import FieldHelpLabel from './FieldHelpLabel';
import {
  useCustomers,
  useDocumentSettings,
  useInstallationGroups,
  useProducts,
  useProjects,
  useQuoteRows,
  useQuotes,
  useInvoices,
  useQuoteTerms,
  useSettings,
  useSubstituteProducts,
} from '../hooks/use-data';
import { Product, Quote, QuoteChargeType, QuoteRow, QuoteRowMode, ScheduleMilestone } from '../lib/types';
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
import { resolveQuoteTermsSnapshotTemplate, resolveTermTemplatePlaceholders } from '../lib/term-templates';

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

const QUOTE_FIELD_HELP = {
  quoteNumber: 'Tarjousnumero on yksilöllinen tunnus, jolla tarjous löytyy myöhemmin nopeasti. Käytä yrityksellesi tuttua numerointitapaa.',
  validUntil: 'Voimassaoloaika kertoo asiakkaalle, mihin saakka tarjous on hyväksyttävissä tällä hinnalla.',
  pricingMode: 'Kateohjattu hinnoittelu laskee myyntihintaa ostohinnan ja katteen perusteella. Manuaalinen tila sopii, kun haluat syöttää myyntihinnat itse.',
  selectedMarginPercent: 'Oletuskate toimii uusien rivien lähtötasona. Se auttaa pitämään tarjouksen hinnoittelun tasaisena.',
  vatPercent: 'ALV-prosentti vaikuttaa tarjouksen loppusummaan. Käytä arvoa, joka vastaa kyseisen työn verokohtelua.',
  termsId: 'Ehtopohja lisää tarjoukselle valmiit toimitus- ja sopimusehdot, jotta niitä ei tarvitse kirjoittaa joka kerta uudelleen.',
  discountType: 'Valitse annetaanko alennus prosentteina vai euromääräisenä vähennyksenä. Jos alennusta ei ole, jätä asetus pois päältä.',
  discountValue: 'Anna alennuksen määrä valitun tavan mukaisesti. Prosentti lasketaan välisummasta, euromäärä vähennetään sellaisenaan.',
  projectCosts: 'Muut projektikulut ovat sellaisia yhteiskuluja, joita ei haluta sitoa yksittäiseen tarjousriviin.',
  deliveryCosts: 'Toimituskulut kattavat tavaran kuljetukset, noudot tai muut logistiikkakulut.',
  installationCosts: 'Tähän tulee erillinen asennuskulu, jos sitä ei haluta jakaa tuotekohtaisille riveille.',
  travelKilometers: 'Kirjaa työmaahan liittyvä ajo kilometreinä, jos matkakulut veloitetaan erikseen.',
  travelRatePerKm: 'Km-hinta kertoo paljonko yhdestä ajokilometristä veloitetaan. Järjestelmä laskee kokonaissumman automaattisesti.',
  travelCosts: 'Ajokulu yhteensä lasketaan kilometreistä ja km-hinnasta. Tämä kenttä on vain yhteenveto.',
  disposalCosts: 'Kaatopaikka- ja jätemaksuihin voit kirjata purkujätteen, lajittelun tai vastaanottomaksut.',
  demolitionCosts: 'Purkutyön lisäkulut sopivat esimerkiksi piikkaukselle, purkusuojaukselle tai ylimääräiselle purkutyölle.',
  protectionCosts: 'Suojaus- ja peittokuluihin voit kirjata esimerkiksi pölysuojauksen, lattiasuojat ja muut suojausmateriaalit.',
  permitCosts: 'Lupa- ja käsittelymaksut sopivat esimerkiksi taloyhtiön, kaupungin tai muun tahon veloituksiin.',
  notes: 'Tarjoushuomautukset näkyvät asiakkaalle. Tähän kannattaa kirjata rajaukset, oletukset ja tärkeät lisätiedot.',
  internalNotes: 'Sisäiset muistiinpanot ovat vain omalle tiimille. Niitä ei näytetä asiakkaalle dokumenteissa.',
  productSearch: 'Hae tuotteita omasta tuoterekisteristä koodilla, nimellä tai kuvauksella ja lisää ne tarjoukselle yhdellä klikkauksella.',
} as const;

const QUOTE_ROW_FIELD_HELP = {
  mode: 'Rivin tyyppi määrää onko kyse tuotteesta, asennuksesta, väliotsikosta vai erillisestä veloituksesta.',
  chargeType: 'Veloituksen tyyppi helpottaa lisäkulujen erottelua raportoinnissa ja yhteenvedossa.',
  productCode: 'Tuotekoodi helpottaa rivin tunnistusta ja pitää tarjouksen linjassa oman tuoterekisterin kanssa.',
  productName: 'Tuotenimi on näkyvin tieto asiakkaalle. Kirjoita se selkeästi ja asiakkaan näkökulmasta ymmärrettävästi.',
  description: 'Kuvaus tarkentaa mitä rivi sisältää, esimerkiksi koon, mallin tai työn sisällön.',
  notes: 'Rivihuomautus tuo lisätietoa juuri tälle riville, esimerkiksi rajauksia tai tarkennuksia asiakkaalle.',
  quantity: 'Määrä kertoo kuinka monta kappaletta, metriä tai muuta yksikköä tarjotaan tällä rivillä.',
  unit: 'Yksikkö kertoo millä tavalla määrä lasketaan, kuten kpl, m2 tai erä.',
  purchasePrice: 'Ostohinta on oma kustannuksesi kyseisellä rivillä. Sen avulla järjestelmä laskee katteen.',
  marginPercent: 'Kate prosentteina kertoo tavoitellun marginaalin tälle riville, jos myyntihintaa ei anneta käsin.',
  salesPrice: 'Myyntihinta on asiakkaalle tarjottu hinta ilman mahdollisia erillisiä asennuskuluja.',
  installationPrice: 'Asennushinta on rivin työosuus. Voit käyttää tätä, jos haluat erottaa tuotteen ja työn toisistaan.',
  installationGroupId: 'Hintaryhmä tuo valmiita oletuksia asennukseen ja katteeseen. Se nopeuttaa vastaavien rivien luontia.',
  regionMultiplier: 'Aluekerroin nostaa tai laskee rivin hintatasoa alueen mukaan. Käytä arvoa 1, jos et tarvitse aluekorjausta.',
  marginAmount: 'Todellinen kate näyttää euroina, paljonko rivistä jää katetta nykyisillä hinnoilla.',
  realizedMarginPercent: 'Kate % toteuma näyttää prosentteina, kuinka kannattava rivi on tällä hetkellä.',
} as const;

const SCHEDULE_MILESTONE_LABELS: Record<ScheduleMilestone['type'], string> = {
  start: 'Aloitus',
  deadline: 'Määräaika',
  delivery: 'Toimitus',
  completion: 'Valmistuminen',
  other: 'Muu',
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

function hasScheduleMilestoneContent(milestone: ScheduleMilestone) {
  return Boolean(milestone.title.trim() || milestone.description?.trim() || milestone.targetDate);
}

function getScheduleMilestoneTitle(milestone: ScheduleMilestone) {
  const title = milestone.title.trim();
  return title || SCHEDULE_MILESTONE_LABELS[milestone.type];
}

function formatScheduleMilestoneDate(value?: string) {
  if (!value) {
    return 'Päivä avoin';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('fi-FI', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function QuoteEditor({ projectId, quoteId, onClose }: QuoteEditorProps) {
  const { products } = useProducts();
  const { groups } = useInstallationGroups();
  const { getSubstitutesForProduct } = useSubstituteProducts();
  const { addRow, deleteRow, deleteRows, getRowsForQuote, updateRow } = useQuoteRows();
  const { addQuote, getQuote, getQuotesForProject, hasNewerRevision, quotesLoaded, updateQuote, updateQuoteStatus } = useQuotes();
  const { createInvoiceFromQuote, getInvoicesForQuote } = useInvoices();
  const { getProject, projectsLoaded } = useProjects();
  const { customersLoaded, getCustomer } = useCustomers();
  const { activeTerms, createQuoteTermsSnapshot, getDefaultTerms, getTermById } = useQuoteTerms();
  const { sharedSettings, documentSettings } = useDocumentSettings();
  const project = getProject(projectId);
  const customer = project ? getCustomer(project.customerId) : undefined;
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(quoteId);
  const [productSearch, setProductSearch] = useState('');
  const [validationOpen, setValidationOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [bootstrapQuote, setBootstrapQuote] = useState<Quote | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const initializedDraftRef = useRef(false);

  useEffect(() => {
    setActiveQuoteId(quoteId);
    initializedDraftRef.current = Boolean(quoteId);
    setBootstrapQuote(null);
    setBootstrapError(null);
    setSelectedRowIds([]);
  }, [quoteId]);

  useEffect(() => {
    if (!project || activeQuoteId || initializedDraftRef.current) return;
    try {
      const defaultTerms = getDefaultTerms();
      const termsSnapshot = createQuoteTermsSnapshot(defaultTerms);
      const newQuote = addQuote({
        projectId,
        title: `${project.name} tarjous`,
        quoteNumber: '',
        revisionNumber: 1,
        ...termsSnapshot,
        pricingMode: 'margin',
        selectedMarginPercent: sharedSettings.defaultMarginPercent,
        vatPercent: sharedSettings.defaultVatPercent,
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
  }, [activeQuoteId, addQuote, getDefaultTerms, project, projectId, sharedSettings]);

  const quote = useMemo(() => {
    if (!activeQuoteId) {
      return bootstrapQuote;
    }
    return getQuote(activeQuoteId) ?? (bootstrapQuote?.id === activeQuoteId ? bootstrapQuote : null);
  }, [activeQuoteId, bootstrapQuote, getQuote]);
  const selectedTermsTemplate = quote?.termsId ? getTermById(quote.termsId) ?? null : null;
  const quoteRows = useMemo(() => (quote ? getRowsForQuote(quote.id) : []), [getRowsForQuote, quote]);
  useEffect(() => {
    setSelectedRowIds((current) => {
      const availableIds = new Set(quoteRows.map((row) => row.id));
      const next = current.filter((rowId) => availableIds.has(rowId));
      return next.length === current.length ? current : next;
    });
  }, [quoteRows]);
  const quoteTerms = useMemo(
    () => (quote ? resolveQuoteTermsSnapshotTemplate(quote, selectedTermsTemplate) : null),
    [quote, selectedTermsTemplate]
  );
  const resolvedQuoteTermsContent = useMemo(
    () => (quote && quoteTerms ? resolveTermTemplatePlaceholders(quoteTerms.contentMd, { customer, project, quote, settings: documentSettings }) : ''),
    [customer, documentSettings, project, quote, quoteTerms]
  );
  const projectQuotes = useMemo(() => getQuotesForProject(projectId), [getQuotesForProject, projectId]);
  const quoteInvoices = useMemo(() => (quote ? getInvoicesForQuote(quote.id) : []), [getInvoicesForQuote, quote]);
  const quoteHasNewerRevision = quote ? hasNewerRevision(quote) : false;
  const isEditable = Boolean(quote && quote.status === 'draft' && !quoteHasNewerRevision);
  const calculation = quote ? calculateQuote(quote, quoteRows) : null;
  const travelCosts = quote ? calculateTravelCosts(quote) : 0;
  const extraChargeLines = quote ? getQuoteExtraChargeLines(quote) : [];
  const activeExtraChargeLines = extraChargeLines.filter((line) => line.amount > 0);
  const visibleScheduleMilestones = quote ? (quote.scheduleMilestones || []).filter(hasScheduleMilestoneContent) : [];
  const applyTermsTemplateSelection = (value: string) => {
    if (!quote) {
      return;
    }

    if (value === 'none') {
      updateQuote(quote.id, createQuoteTermsSnapshot(undefined));
      return;
    }

    const template = getTermById(value);
    if (!template) {
      toast.error('Ehtopohjaa ei löytynyt.');
      return;
    }

    updateQuote(quote.id, createQuoteTermsSnapshot(template));
  };

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

  const isProjectLoading = !projectsLoaded;
  const isCustomerLoading = Boolean(project) && !customersLoaded;
  const isQuoteLoading = Boolean(activeQuoteId && !quote && !quotesLoaded);

  if (isProjectLoading || isCustomerLoading || isQuoteLoading) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Tarjouseditori" maxWidth="full">
        <Card className="p-10 text-center text-muted-foreground">
          Ladataan tarjousta...
        </Card>
      </ResponsiveDialog>
    );
  }

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
            : 'Tarjousta ei löytynyt. Se on voitu poistaa tai se ei ole käytettävissä tällä käyttäjällä.'}
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
      ?? sharedSettings.defaultMarginPercent;
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

  const openOrCreateInvoice = () => {
    if (quoteInvoices.length > 0) {
      setSelectedInvoiceId(quoteInvoices[0].id);
      return;
    }

    try {
      const invoice = createInvoiceFromQuote(quote, quoteRows, customer, project);
      setSelectedInvoiceId(invoice.id);
      toast.success(`Lasku ${invoice.invoiceNumber} luotu.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Laskun luonti epäonnistui.');
    }
  };

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>Sulje</Button>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button variant="outline" onClick={() => exportQuoteToPDF(quote, quoteRows, customer, project, quoteTerms, documentSettings)}>
          <FilePdf className="h-4 w-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={() => exportQuoteToCustomerExcel(quote, quoteRows, customer, project, quoteTerms, documentSettings)}>
          <FileXls className="h-4 w-4" />
          Asiakas-Excel
        </Button>
        <Button variant="outline" onClick={() => exportQuoteToInternalExcel(quote, quoteRows, customer, project, quoteTerms, documentSettings)}>
          <FileXls className="h-4 w-4" />
          Sisäinen Excel
        </Button>
        {quote.status === 'sent' && (
          <>
            <Button onClick={() => updateQuoteStatus(quote.id, 'accepted')}>
              <CheckCircle className="h-4 w-4" />
              Merkitse hyväksytyksi
            </Button>
            <Button variant="outline" onClick={() => updateQuoteStatus(quote.id, 'rejected')}>
              <XCircle className="h-4 w-4" />
              Merkitse hylätyksi
            </Button>
          </>
        )}
        {quote.status !== 'draft' && !quoteHasNewerRevision && (
          <Button variant="outline" onClick={createRevision}>
            <Copy className="h-4 w-4" />
            Luo revisio
          </Button>
        )}
        {quote.status === 'accepted' && (
          <Button variant="outline" onClick={openOrCreateInvoice}>
            <Receipt className="h-4 w-4" />
            {quoteInvoices.length > 0 ? 'Avaa lasku' : 'Luo lasku'}
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
                  {quote.status === 'sent' && <Badge variant="outline">Odottaa asiakkaan päätöstä</Badge>}
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

            {quote.status === 'sent' && !quoteHasNewerRevision && (
              <Alert className="border-primary/20 bg-primary/5">
                <PaperPlaneTilt className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium text-foreground">Tarjous on lähetetty asiakkaalle ja odottaa päätöstä.</div>
                  <div className="mt-1 text-muted-foreground">
                    Paina <strong>Merkitse hyväksytyksi</strong> vasta silloin, kun asiakas on vahvistanut tilauksen.
                    Jos asiakas ei hyväksy tarjousta, valitse <strong>Merkitse hylätyksi</strong>.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="quote-number" label="Tarjousnumero" help={QUOTE_FIELD_HELP.quoteNumber} />
                  <Input id="quote-number" value={quote.quoteNumber} onChange={(event) => updateQuote(quote.id, { quoteNumber: event.target.value })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="valid-until" label="Voimassa asti" help={QUOTE_FIELD_HELP.validUntil} />
                  <Input id="valid-until" type="date" value={quote.validUntil || ''} onChange={(event) => updateQuote(quote.id, { validUntil: event.target.value })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="pricing-mode" label="Hinnoittelutapa" help={QUOTE_FIELD_HELP.pricingMode} />
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
                  <FieldHelpLabel htmlFor="quote-margin" label="Oletuskate %" help={QUOTE_FIELD_HELP.selectedMarginPercent} />
                  <Input id="quote-margin" type="number" min="0" step="0.1" value={quote.selectedMarginPercent} onChange={(event) => applyQuoteMargin(parseFloat(event.target.value) || 0)} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="vat" label="ALV %" help={QUOTE_FIELD_HELP.vatPercent} />
                  <Input id="vat" type="number" min="0" step="0.1" value={quote.vatPercent} onChange={(event) => updateQuote(quote.id, { vatPercent: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="terms" label="Ehtopohja" help={QUOTE_FIELD_HELP.termsId} />
                  <Select value={quote.termsId || 'none'} onValueChange={applyTermsTemplateSelection} disabled={!isEditable}>
                    <SelectTrigger id="terms"><SelectValue placeholder="Valitse ehtopohja" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ei ehtopohjaa</SelectItem>
                      {activeTerms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>{term.name}{term.isDefault ? ' (oletus)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <FieldHelpLabel
                  htmlFor="terms-snapshot"
                  label="Tarjouksen ehtoteksti"
                  help="Valittu ehtopohja kopioidaan tarjoukselle snapshot-muotoon. Voit muokata tätä tekstiä vapaasti ilman, että alkuperäinen ehtopohja muuttuu."
                />
                <Textarea
                  id="terms-snapshot"
                  rows={10}
                  value={quote.termsSnapshotContentMd || ''}
                  onChange={(event) => updateQuote(quote.id, {
                    termsSnapshotName: quote.termsSnapshotName || quoteTerms?.name || 'Tarjousehdot',
                    termsSnapshotContentMd: event.target.value,
                  })}
                  placeholder="Valitse ehtopohja tai kirjoita tarjouksen oma ehtoteksti tähän."
                  disabled={!isEditable}
                />
                <p className="text-xs text-muted-foreground">
                  Myöhemmin tehtävät ehtopohjan muutokset eivät muuta tähän tarjoukseen tallennettua ehtotekstiä.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="discount-type" label="Alennus" help={QUOTE_FIELD_HELP.discountType} />
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
                  <FieldHelpLabel htmlFor="discount-value" label="Alennuksen arvo" help={QUOTE_FIELD_HELP.discountValue} />
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
                  <FieldHelpLabel htmlFor="project-costs" label="Muut projektikulut" help={QUOTE_FIELD_HELP.projectCosts} />
                  <Input id="project-costs" type="number" min="0" step="0.01" value={quote.projectCosts} onChange={(event) => updateQuote(quote.id, { projectCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="delivery-costs" label="Toimituskulut" help={QUOTE_FIELD_HELP.deliveryCosts} />
                  <Input id="delivery-costs" type="number" min="0" step="0.01" value={quote.deliveryCosts} onChange={(event) => updateQuote(quote.id, { deliveryCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="installation-costs" label="Asennuskulut erillisenä rivinä" help={QUOTE_FIELD_HELP.installationCosts} />
                  <Input id="installation-costs" type="number" min="0" step="0.01" value={quote.installationCosts} onChange={(event) => updateQuote(quote.id, { installationCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="travel-kilometers" label="Kilometrit" help={QUOTE_FIELD_HELP.travelKilometers} />
                  <Input id="travel-kilometers" type="number" min="0" step="1" value={quote.travelKilometers ?? 0} onChange={(event) => updateQuote(quote.id, { travelKilometers: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="travel-rate" label="Km-hinta" help={QUOTE_FIELD_HELP.travelRatePerKm} />
                  <Input id="travel-rate" type="number" min="0" step="0.01" value={quote.travelRatePerKm ?? 0} onChange={(event) => updateQuote(quote.id, { travelRatePerKm: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel label="Ajokulu yhteensä" help={QUOTE_FIELD_HELP.travelCosts} />
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(travelCosts)}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="disposal-costs" label="Kaatopaikka- ja jätemaksut" help={QUOTE_FIELD_HELP.disposalCosts} />
                  <Input id="disposal-costs" type="number" min="0" step="0.01" value={quote.disposalCosts ?? 0} onChange={(event) => updateQuote(quote.id, { disposalCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="demolition-costs" label="Purkutyön lisäkulut" help={QUOTE_FIELD_HELP.demolitionCosts} />
                  <Input id="demolition-costs" type="number" min="0" step="0.01" value={quote.demolitionCosts ?? 0} onChange={(event) => updateQuote(quote.id, { demolitionCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="protection-costs" label="Suojaus- ja peittokulut" help={QUOTE_FIELD_HELP.protectionCosts} />
                  <Input id="protection-costs" type="number" min="0" step="0.01" value={quote.protectionCosts ?? 0} onChange={(event) => updateQuote(quote.id, { protectionCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="permit-costs" label="Lupa- ja käsittelymaksut" help={QUOTE_FIELD_HELP.permitCosts} />
                  <Input id="permit-costs" type="number" min="0" step="0.01" value={quote.permitCosts ?? 0} onChange={(event) => updateQuote(quote.id, { permitCosts: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <FieldHelpLabel htmlFor="quote-notes" label="Tarjoushuomautukset" help={QUOTE_FIELD_HELP.notes} />
                <Textarea id="quote-notes" value={quote.notes || ''} onChange={(event) => updateQuote(quote.id, { notes: event.target.value })} disabled={!isEditable} rows={4} />
              </div>
              <div className="space-y-2">
                <FieldHelpLabel htmlFor="internal-notes" label="Sisäiset muistiinpanot" help={QUOTE_FIELD_HELP.internalNotes} />
                <Textarea id="internal-notes" value={quote.internalNotes || ''} onChange={(event) => updateQuote(quote.id, { internalNotes: event.target.value })} disabled={!isEditable} rows={4} />
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.95fr)]">
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <FieldHelpLabel htmlFor="product-search" label="Lisää tuotteita tarjoukselle" help={QUOTE_FIELD_HELP.productSearch} />
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
                            .map((item) => {
                              const product = products.find((candidate) => candidate.id === item.substituteProductId);
                              return product ? { product, notes: item.notes } : null;
                            })
                            .filter((item): item is { product: Product; notes?: string } => Boolean(item))
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
                                <FieldHelpLabel label="Tyyppi" help={QUOTE_ROW_FIELD_HELP.mode} />
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
                                  <FieldHelpLabel label="Veloituksen tyyppi" help={QUOTE_ROW_FIELD_HELP.chargeType} />
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
                                <FieldHelpLabel label="Tuotekoodi" help={QUOTE_ROW_FIELD_HELP.productCode} />
                                <Input value={row.productCode || ''} onChange={(event) => patchRow(row, { productCode: event.target.value })} disabled={!isEditable || row.mode === 'section'} />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <FieldHelpLabel label={row.mode === 'section' ? 'Väliotsikko' : 'Tuotenimi'} help={QUOTE_ROW_FIELD_HELP.productName} />
                                <Input value={row.productName} onChange={(event) => patchRow(row, { productName: event.target.value })} disabled={!isEditable} />
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="space-y-2 xl:col-span-2">
                                <FieldHelpLabel label="Kuvaus" help={QUOTE_ROW_FIELD_HELP.description} />
                                <Textarea value={row.description || ''} onChange={(event) => patchRow(row, { description: event.target.value })} disabled={!isEditable || row.mode === 'section'} rows={2} />
                              </div>
                              <div className="space-y-2 xl:col-span-2">
                                <FieldHelpLabel label="Rivihuomautus" help={QUOTE_ROW_FIELD_HELP.notes} />
                                <Textarea value={row.notes || ''} onChange={(event) => patchRow(row, { notes: event.target.value })} disabled={!isEditable || row.mode === 'section'} rows={2} />
                              </div>
                            </div>

                            {row.mode !== 'section' && (
                              <>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Määrä" help={QUOTE_ROW_FIELD_HELP.quantity} />
                                    <Input type="number" min="0" step="0.01" value={row.quantity} onChange={(event) => patchRow(row, { quantity: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                  </div>
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Yksikkö" help={QUOTE_ROW_FIELD_HELP.unit} />
                                    <Input value={row.unit} onChange={(event) => patchRow(row, { unit: event.target.value })} disabled={!isEditable} />
                                  </div>
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Ostohinta" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                    <Input type="number" min="0" step="0.01" value={row.purchasePrice} onChange={(event) => patchRow(row, { purchasePrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                  </div>
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Kate %" help={QUOTE_ROW_FIELD_HELP.marginPercent} />
                                    <Input type="number" min="0" step="0.1" value={row.marginPercent} onChange={(event) => patchRow(row, { marginPercent: parseFloat(event.target.value) || 0, manualSalesPrice: false })} disabled={!isEditable || row.mode === 'charge' || quote.pricingMode === 'manual'} />
                                  </div>
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Myyntihinta" help={QUOTE_ROW_FIELD_HELP.salesPrice} />
                                    <Input type="number" min="0" step="0.01" value={row.salesPrice} onChange={(event) => patchRow(row, { salesPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'installation'} />
                                  </div>
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Asennushinta" help={QUOTE_ROW_FIELD_HELP.installationPrice} />
                                    <Input type="number" min="0" step="0.01" value={row.installationPrice} onChange={(event) => patchRow(row, { installationPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Hintaryhmä" help={QUOTE_ROW_FIELD_HELP.installationGroupId} />
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
                                    <FieldHelpLabel label="Aluekerroin" help={QUOTE_ROW_FIELD_HELP.regionMultiplier} />
                                    <Input type="number" min="0" step="0.01" value={row.regionMultiplier} onChange={(event) => patchRow(row, { regionMultiplier: parseFloat(event.target.value) || 1 })} disabled={!isEditable} />
                                  </div>
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Todellinen kate" help={QUOTE_ROW_FIELD_HELP.marginAmount} />
                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(rowCalculation.marginAmount)}</div>
                                  </div>
                                  <div className="space-y-2">
                                    <FieldHelpLabel label="Kate % toteuma" help={QUOTE_ROW_FIELD_HELP.realizedMarginPercent} />
                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatNumber(rowCalculation.marginPercent, 1)} %</div>
                                  </div>
                                </div>

                                {substitutes.length > 0 && (
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="mb-1 text-sm font-medium">Ehdotettavat vaihtoehtotuotteet</div>
                                    <div className="mb-3 text-xs text-muted-foreground">
                                      Käytä tätä, kun suunnitelmissa tai asiakkaan pyynnössä on toinen tuote ja haluat ehdottaa tilalle omaa vaihtoehtoasi.
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {substitutes.map(({ product, notes }) => (
                                        <div key={product.id} className="space-y-1">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!isEditable}
                                            onClick={() => patchRow(row, { ...buildProductRow(product), quantity: row.quantity, sortOrder: row.sortOrder })}
                                          >
                                            Ehdota: {product.code} • {product.name}
                                          </Button>
                                          {notes && <div className="max-w-80 text-xs text-muted-foreground">{notes}</div>}
                                        </div>
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
                {visibleScheduleMilestones.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">Aikataulu ja määräajat</div>
                        <p className="text-xs text-muted-foreground">Nämä tiedot näkyvät myös tarjouksen tulosteella ja asiakasversiossa.</p>
                      </div>
                      <div className="space-y-2">
                        {visibleScheduleMilestones.map((milestone) => {
                          const typeLabel = SCHEDULE_MILESTONE_LABELS[milestone.type];
                          const hasCustomTitle = milestone.title.trim().length > 0;

                          return (
                            <div key={milestone.id} className="rounded-xl border bg-muted/20 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium">{getScheduleMilestoneTitle(milestone)}</div>
                                  {hasCustomTitle && <div className="text-xs text-muted-foreground">{typeLabel}</div>}
                                  {milestone.description?.trim() && (
                                    <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{milestone.description.trim()}</div>
                                  )}
                                </div>
                                <div className="shrink-0 text-right text-sm font-medium">{formatScheduleMilestoneDate(milestone.targetDate)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
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
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{resolvedQuoteTermsContent}</div>
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

      {selectedInvoiceId && <InvoiceEditor invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />}
    </>
  );
}
