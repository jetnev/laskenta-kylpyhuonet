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
import AdditionalCostsSection from './quote-editor/AdditionalCostsSection';
import HelpTooltip from './quote-editor/HelpTooltip';
import QuoteCompletionChecklist from './quote-editor/QuoteCompletionChecklist';
import QuoteEditorSection from './quote-editor/QuoteEditorSection';
import QuoteManagedInterceptionDialogContent, {
  type QuoteManagedInterceptionDialogRequest,
} from './quote-editor/QuoteManagedInterceptionDialogContent';
import QuoteManagedSaveGuard from './quote-editor/QuoteManagedSaveGuard';
import QuoteEditorStepper from './quote-editor/QuoteEditorStepper';
import QuoteManagedSectionBadge from './quote-editor/QuoteManagedSectionBadge';
import QuoteNotesPanels from './quote-editor/QuoteNotesPanels';
import QuotePricingModeSelector from './quote-editor/QuotePricingModeSelector';
import QuoteTenderImportInspector, { type QuoteTenderImportSourceSummary } from './quote-editor/QuoteTenderImportInspector';
import VisibilityBadge from './quote-editor/VisibilityBadge';
import { useAuth } from '../hooks/use-auth';
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
  useSubstituteProducts,
} from '../hooks/use-data';
import { Product, Quote, QuoteChargeType, QuotePricingMode, QuoteRow, QuoteRowMode, ScheduleMilestone } from '../lib/types';
import {
  calculateQuoteRowTargetUnitPrice,
  calculateQuoteRow,
  calculateTravelCosts,
  canSendQuote,
  formatCurrency,
  formatNumber,
  formatVatPercent,
  getQuoteRowInternalUnitCost,
  getQuoteSummaryBreakdown,
  getQuoteVatLabel,
  getQuoteVatPercent,
  getQuoteRowPricingDetails,
  getQuoteRowPricingModel,
  getQuoteRowUnitPricingMode,
} from '../lib/calculations';
import {
  exportQuoteToCustomerExcel,
  exportQuoteToInternalExcel,
  exportQuoteToPDF,
} from '../lib/export';
import { getQuoteCompletionChecklist, getQuoteEditorSteps, type QuoteEditorStepId } from '../lib/quote-editor-ux';
import { getResponsibleUserLabel } from '../lib/ownership';
import { resolveQuoteTermsSnapshotTemplate, resolveTermTemplatePlaceholders } from '../lib/term-templates';
import {
  buildTenderIntelligenceQuoteEditorHandoff,
  type TenderIntelligenceHandoffIntent,
  type TenderIntelligenceQuoteEditorHandoffLink,
} from '../features/tender-intelligence/lib/tender-intelligence-handoff';
import {
  inspectQuoteTenderManagedSurface,
  resolveQuoteTenderManagedActionGuardDecision,
  resolveQuoteTenderManagedEditGuardDecision,
  resolveQuoteTenderManagedEditTarget,
  type QuoteTenderManagedEditTarget,
  type QuoteTenderManagedSurfaceHealthStatus,
  resolveQuoteTenderManagedEditorState,
  resolveQuoteTenderManagedSectionState,
} from '../features/tender-intelligence/lib/quote-managed-surface-inspector';
import { getTenderIntelligenceRepository } from '../features/tender-intelligence/services/tender-intelligence-repository';
import type { TenderEditorManagedBlockId } from '../features/tender-intelligence/types/tender-editor-import';

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

type RowPricingWorkflow = QuotePricingMode | 'line_total';

const ROW_PRICING_WORKFLOW_LABELS: Record<RowPricingWorkflow, string> = {
  margin: 'Kateohjattu',
  manual: 'Manuaalinen asiakashinta',
  line_total: 'Rivin kokonaishinta',
};

const ROW_PRICE_SOURCE_LABELS: Record<RowPricingWorkflow, string> = {
  margin: 'Johdettu kateohjatusti',
  manual: 'Manuaalisesti syötetty',
  line_total: 'Kokonaishinnasta johdettu',
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
  pricingMode: 'Tämä määrittää uusien rivien oletustilan. Rivin varsinainen hinnoittelutapa valitaan aina rivikohtaisesti.',
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
  pricingModel: 'Valitse ensin rivin hinnoittelutapa: kateohjattu, manuaalinen asiakashinta tai rivin kokonaishinta.',
  chargeType: 'Veloituksen tyyppi helpottaa lisäkulujen erottelua raportoinnissa ja yhteenvedossa.',
  productCode: 'Tuotekoodi helpottaa rivin tunnistusta ja pitää tarjouksen linjassa oman tuoterekisterin kanssa.',
  productName: 'Tuotenimi on näkyvin tieto asiakkaalle. Kirjoita se selkeästi ja asiakkaan näkökulmasta ymmärrettävästi.',
  description: 'Kuvaus tarkentaa mitä rivi sisältää, esimerkiksi koon, mallin tai työn sisällön.',
  notes: 'Rivihuomautus tuo lisätietoa juuri tälle riville, esimerkiksi rajauksia tai tarkennuksia asiakkaalle.',
  quantity: 'Määrä kertoo kuinka monta kappaletta, metriä tai muuta yksikköä tarjotaan tällä rivillä.',
  unit: 'Yksikkö kertoo millä tavalla määrä lasketaan, kuten kpl, m2 tai erä.',
  purchasePrice: 'Ostohinta per yksikkö muodostaa yhdessä asennuksen taustahinnan ja aluekertoimen kanssa sisäisen yksikkökustannuksen.',
  marginPercent: 'Tavoitekate kertoo millä prosentilla asiakashinta johdetaan sisäisestä yksikkökustannuksesta.',
  salesPrice: 'Asiakashinta per yksikkö on asiakkaalle tarjottu veroton hinta. Kateohjatussa tilassa arvo on johdettu, ellei sitä ylikirjoiteta.',
  lineTotal: 'Rivin kokonaishinta on koko riville sovittu veroton summa. Järjestelmä johtaa siitä yksikköhinnan vain apuarvoksi.',
  derivedUnitPrice: 'Johdettu yksikköhinta lasketaan rivin kokonaishinnasta ja määrästä. Se ei ole käyttäjän syöttämä arvo.',
  priceAdjustment: 'Voit lisätä tai vähentää riviltä kiinteän euromäärän ilman että määrä muuttuu.',
  installationPrice: 'Asennuksen taustahinta per yksikkö lisätään sisäiseen kustannukseen ennen asiakashinnan johtamista.',
  installationGroupId: 'Hintaryhmä tuo valmiita oletuksia asennuksen osuuteen ja nopeuttaa vastaavien rivien luontia.',
  regionMultiplier: 'Aluekerroin kerrotaan sisäisellä yksikkökustannuksella ennen asiakashinnan johtamista. Se ei muuta jo syötettyä rivin kokonaishintaa.',
  netTotal: 'Veroton summa on rivin laskutettava summa ennen arvonlisäveroa.',
  vatAmount: 'ALV lasketaan verottomasta summasta tarjouksen ALV-prosentin mukaan.',
  grossTotal: 'Verollinen summa on veroton summa lisättynä ALV:lla.',
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

const QUOTE_EDITOR_STEP_ORDER: QuoteEditorStepId[] = ['basics', 'rows', 'costs', 'finishing', 'review'];

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatFlexibleNumber(value: number) {
  return new Intl.NumberFormat('fi-FI', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function calculateSuggestedUnitPrice(row: Pick<QuoteRow, 'mode' | 'purchasePrice' | 'installationPrice' | 'regionMultiplier'>, marginPercent: number) {
  return calculateQuoteRowTargetUnitPrice(row, marginPercent);
}

function getRowPricingWorkflow(
  row: Pick<QuoteRow, 'pricingModel' | 'unitPricingMode' | 'manualSalesPrice'>
): RowPricingWorkflow {
  if (row.pricingModel === 'line_total') {
    return 'line_total';
  }

  return getQuoteRowUnitPricingMode(row);
}

function getRowPriceSource(
  row: Pick<QuoteRow, 'pricingModel' | 'unitPricingMode' | 'manualSalesPrice'>
): RowPricingWorkflow {
  if (row.pricingModel === 'line_total') {
    return 'line_total';
  }

  return getQuoteRowUnitPricingMode(row) === 'margin' && !row.manualSalesPrice ? 'margin' : 'manual';
}

function formatRowQuantityLabel(row: Pick<QuoteRow, 'quantity' | 'unit'>) {
  return `${formatFlexibleNumber(row.quantity)} ${row.unit}`.trim();
}

function formatAdjustmentLabel(adjustmentTotal: number) {
  if (adjustmentTotal === 0) {
    return '';
  }

  return ` ${adjustmentTotal > 0 ? '+' : '-'} ${formatCurrency(Math.abs(adjustmentTotal))}`;
}

function formatInternalCostFormula(
  row: Pick<QuoteRow, 'mode' | 'purchasePrice' | 'installationPrice' | 'regionMultiplier' | 'unit'>
) {
  const purchasePrice = roundCurrency(Math.max(0, row.purchasePrice));
  const installationPrice = roundCurrency(Math.max(0, row.installationPrice));
  const regionMultiplier = row.regionMultiplier > 0 ? row.regionMultiplier : 1;
  const internalUnitCost = getQuoteRowInternalUnitCost(row);
  return `(${formatCurrency(purchasePrice)} + ${formatCurrency(installationPrice)}) × ${formatFlexibleNumber(regionMultiplier)} = ${formatCurrency(internalUnitCost)} / ${row.unit}`;
}

function formatMarginDrivenPriceFormula(row: QuoteRow, vatPercent: number) {
  const pricing = getQuoteRowPricingDetails(row, vatPercent);
  const derivedUnitPrice = calculateSuggestedUnitPrice(row, row.marginPercent);
  const targetMarginLabel = formatNumber(row.marginPercent, 1);
  const formula = `${formatCurrency(getQuoteRowInternalUnitCost(row))} / (1 - ${targetMarginLabel} %) = ${formatCurrency(derivedUnitPrice)} / ${row.unit}`;

  if (row.manualSalesPrice) {
    return `${formula}. Käytössä on ylikirjoitettu asiakashinta ${formatCurrency(pricing.enteredUnitPrice ?? 0)} / ${row.unit}.`;
  }

  return formula;
}

function formatQuoteRowFormula(row: QuoteRow, vatPercent: number) {
  const pricing = getQuoteRowPricingDetails(row, vatPercent);
  const quantityLabel = formatRowQuantityLabel(row);
  const adjustmentLabel = formatAdjustmentLabel(pricing.adjustmentTotal);

  if (getRowPricingWorkflow(row) === 'margin') {
    return formatMarginDrivenPriceFormula(row, vatPercent);
  }

  if (pricing.pricingModel === 'line_total') {
    const lead = `Syötetty rivin veroton kokonaishinta ${formatCurrency(pricing.enteredLineTotal ?? 0)}${adjustmentLabel}.`;

    if (row.quantity > 0) {
      return `${lead} Johdettu yksikköhinta ${formatCurrency(pricing.derivedUnitPrice)} / ${row.unit} (${formatCurrency(pricing.enteredLineTotal ?? 0)} / ${quantityLabel}).`;
    }

    return `${lead} Johdettua yksikköhintaa ei voida laskea, koska määrä on 0.`;
  }

  return `${quantityLabel} × ${formatCurrency(pricing.enteredUnitPrice ?? 0)}${adjustmentLabel} = ${formatCurrency(pricing.netTotal)}`;
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

function formatManagedScopeLabel(titles: string[]) {
  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];

  if (uniqueTitles.length === 0) {
    return 'Tarjousälyn hallinnoimaa sisältöä';
  }

  if (uniqueTitles.length === 1) {
    return `Tarjousälyn hallinnoimaa lohkoa "${uniqueTitles[0]}"`;
  }

  if (uniqueTitles.length === 2) {
    return `Tarjousälyn hallinnoimia lohkoja "${uniqueTitles[0]}" ja "${uniqueTitles[1]}"`;
  }

  return `${uniqueTitles.length} Tarjousälyn hallinnoimaa lohkoa`;
}

function normalizeManagedBlockIds(blockIds?: string[] | null) {
  if (!blockIds || blockIds.length === 0) {
    return [];
  }

  return [...new Set(blockIds.map((blockId) => blockId.trim()).filter(Boolean))] as TenderEditorManagedBlockId[];
}

function createTenderIntelligenceHandoffLink(options: {
  quoteId: string;
  source: QuoteTenderImportSourceSummary | null;
  intent: TenderIntelligenceHandoffIntent;
  blockIds?: string[];
}): TenderIntelligenceQuoteEditorHandoffLink | null {
  if (!options.source?.tenderPackageId || !options.source.draftPackageId) {
    return null;
  }

  return buildTenderIntelligenceQuoteEditorHandoff({
    tenderPackageId: options.source.tenderPackageId,
    draftPackageId: options.source.draftPackageId,
    importedQuoteId: options.quoteId,
    intent: options.intent,
    blockIds: normalizeManagedBlockIds(options.blockIds),
  });
}

function resolveInspectorHandoffIntent(
  healthStatus: QuoteTenderManagedSurfaceHealthStatus,
): TenderIntelligenceHandoffIntent {
  if (healthStatus === 'inconsistent') {
    return 'repair-managed-import';
  }

  if (healthStatus === 'needs_attention') {
    return 'reimport-managed-import';
  }

  return 'open-source-draft';
}

function buildManagedEditGuardRequest(
  target: QuoteTenderManagedEditTarget,
  tenderIntelligenceLink: TenderIntelligenceQuoteEditorHandoffLink | null,
): QuoteManagedInterceptionDialogRequest {
  const managedScope = formatManagedScopeLabel(target.titles);

  if (target.status === 'danger') {
    return {
      kind: 'edit',
      status: 'danger',
      title: `Muokkaus estetty: ${target.label}`,
      description: `${target.label} sisältää ${managedScope}. Managed surface on danger-tilassa, joten tätä kohtaa ei voi muokata suoraan editorissa.`,
      issueMessages: target.issue_messages,
      tenderIntelligenceLink,
      closeLabel: 'Sulje',
    };
  }

  return {
    kind: 'edit',
    status: target.status,
    title: `Vahvista muokkaus: ${target.label}`,
    description: target.status === 'warning'
      ? `${target.label} sisältää ${managedScope} ja lohko on jo muuttunut editorissa. Lisämuokkaus vaikeuttaa turvallista Tarjousäly re-importia.`
      : `${target.label} sisältää ${managedScope}. Suora muokkaus irrottaa tai rikkoo Tarjousälyn hallitsemaa rakennetta, joten jatko vaatii eksplisiittisen vahvistuksen.`,
    confirmLabel: 'Muokkaa tästä huolimatta',
    issueMessages: target.issue_messages,
    tenderIntelligenceLink,
  };
}

function buildManagedActionGuardRequest(options: {
  actionLabel: string;
  status: 'warning' | 'danger';
  issueMessages: string[];
  tenderIntelligenceLink: TenderIntelligenceQuoteEditorHandoffLink | null;
  confirmLabel?: string;
}): QuoteManagedInterceptionDialogRequest {
  if (options.status === 'danger') {
    return {
      kind: 'action',
      status: 'danger',
      title: `${options.actionLabel} on estetty`,
      description: `Tarjousälyn hallinnoitu sisältö on danger-tilassa. ${options.actionLabel} on estetty, kunnes palaat Tarjousälyyn ja korjaat managed surface -tilan.`,
      issueMessages: options.issueMessages,
      tenderIntelligenceLink: options.tenderIntelligenceLink,
      closeLabel: 'Sulje',
    };
  }

  return {
    kind: 'action',
    status: 'warning',
    title: `Vahvista: ${options.actionLabel}`,
    description: `Tarjousälyn hallinnoitu sisältö on jo muuttunut. ${options.actionLabel} kannattaa tehdä vain, jos tiedät miksi managed lohkoja on muokattu editorissa.`,
    confirmLabel: options.confirmLabel ?? 'Jatka tästä huolimatta',
    issueMessages: options.issueMessages,
    tenderIntelligenceLink: options.tenderIntelligenceLink,
  };
}

function resolveManagedSectionInlineHint(target: QuoteTenderManagedEditTarget | null, unlocked: boolean) {
  if (!target?.is_tarjousaly_managed) {
    return null;
  }

  if (target.status === 'danger') {
    return 'Tarjousäly hallinnoi tätä väliotsikkoa. Suora muokkaus on estetty, kunnes managed surface on korjattu.';
  }

  if (target.status === 'warning') {
    return unlocked
      ? 'Tarjousäly hallinnoi tätä väliotsikkoa. Väliotsikko on jo warning-tilassa ja muokkaus on avattu tälle sessiolle vahvistuksen jälkeen.'
      : 'Tarjousäly hallinnoi tätä väliotsikkoa. Väliotsikko on jo warning-tilassa ja lisämuokkaus vaatii vahvistuksen.';
  }

  return unlocked
    ? 'Tarjousäly hallinnoi tätä väliotsikkoa. Muokkaus on avattu tälle sessiolle vahvistuksen jälkeen.'
    : 'Tarjousäly hallinnoi tätä väliotsikkoa. Suora muokkaus vaatii vahvistuksen.';
}

export default function QuoteEditor({ projectId, quoteId, onClose }: QuoteEditorProps) {
  const { user, users, canManageUsers } = useAuth();
  const tenderIntelligenceRepository = useMemo(() => getTenderIntelligenceRepository(), []);
  const { products } = useProducts();
  const { groups } = useInstallationGroups();
  const { getSubstitutesForProduct } = useSubstituteProducts();
  const { addRow, deleteRow, deleteRows, getRowsForQuote, updateRow } = useQuoteRows();
  const { addQuote, getQuote, getQuotesForProject, hasNewerRevision, quotesLoaded, updateQuote, updateQuoteStatus } = useQuotes();
  const { createInvoiceFromQuote, getInvoicesForQuote } = useInvoices();
  const { getProject, projectsLoaded } = useProjects();
  const { customersLoaded, getCustomer } = useCustomers();
  const { activeTerms, createQuoteTermsSnapshot, getTermById } = useQuoteTerms();
  const { sharedSettings, documentSettings } = useDocumentSettings();
  const project = getProject(projectId);
  const customer = project ? getCustomer(project.customerId) : undefined;
  const responsibleUsers = users.length > 0 ? users : user ? [user] : [];
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(quoteId);
  const [productSearch, setProductSearch] = useState('');
  const [validationOpen, setValidationOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<QuoteEditorStepId>('basics');
  const [additionalCostsOpen, setAdditionalCostsOpen] = useState(false);
  const [quoteTenderImportSource, setQuoteTenderImportSource] = useState<QuoteTenderImportSourceSummary | null>(null);
  const [managedGuardRequest, setManagedGuardRequest] = useState<QuoteManagedInterceptionDialogRequest | null>(null);
  const [managedEditUnlockKeys, setManagedEditUnlockKeys] = useState<string[]>([]);
  const pendingManagedGuardActionRef = useRef<null | (() => void)>(null);
  const initializedQuoteUiRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveQuoteId(quoteId);
    setSelectedRowIds([]);
    setActiveStep('basics');
    setAdditionalCostsOpen(false);
    setManagedGuardRequest(null);
    setManagedEditUnlockKeys([]);
    pendingManagedGuardActionRef.current = null;
    initializedQuoteUiRef.current = null;
  }, [quoteId]);

  const quote = useMemo(() => {
    if (!activeQuoteId) {
      return null;
    }

    return getQuote(activeQuoteId) ?? null;
  }, [activeQuoteId, getQuote]);
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
  const quoteTenderManagedDiagnostics = useMemo(
    () => inspectQuoteTenderManagedSurface({ quote, rows: quoteRows }),
    [quote, quoteRows]
  );
  const quoteTenderManagedEditorState = useMemo(
    () => resolveQuoteTenderManagedEditorState({ quote, rows: quoteRows, diagnostics: quoteTenderManagedDiagnostics }),
    [quote, quoteRows, quoteTenderManagedDiagnostics]
  );
  const resolveTenderIntelligenceLink = (
    intent: TenderIntelligenceHandoffIntent,
    blockIds?: string[],
  ) => {
    if (!quote) {
      return null;
    }

    return createTenderIntelligenceHandoffLink({
      quoteId: quote.id,
      source: quoteTenderImportSource,
      intent,
      blockIds,
    });
  };
  const tenderIntelligenceRepairLink = resolveTenderIntelligenceLink(
    'repair-managed-import',
    quoteTenderManagedDiagnostics.managed_block_ids,
  );
  const tenderIntelligenceInspectorLink = resolveTenderIntelligenceLink(
    resolveInspectorHandoffIntent(quoteTenderManagedDiagnostics.health_status),
    quoteTenderManagedDiagnostics.managed_block_ids,
  );
  const managedEditUnlockKeySet = useMemo(() => new Set(managedEditUnlockKeys), [managedEditUnlockKeys]);
  const quoteTenderManagedFieldTargets = useMemo(() => ({
    notes: resolveQuoteTenderManagedEditTarget({
      quote,
      rows: quoteRows,
      diagnostics: quoteTenderManagedDiagnostics,
      editorState: quoteTenderManagedEditorState,
      target: { kind: 'quote_field', field: 'notes' },
    }),
    internalNotes: resolveQuoteTenderManagedEditTarget({
      quote,
      rows: quoteRows,
      diagnostics: quoteTenderManagedDiagnostics,
      editorState: quoteTenderManagedEditorState,
      target: { kind: 'quote_field', field: 'internalNotes' },
    }),
  }), [quote, quoteRows, quoteTenderManagedDiagnostics, quoteTenderManagedEditorState]);
  const quoteTenderSectionStateByRowId = useMemo(() => {
    const entries = new Map<string, ReturnType<typeof resolveQuoteTenderManagedSectionState>>();

    quoteRows.forEach((row) => {
      const sectionState = resolveQuoteTenderManagedSectionState(row, quoteTenderManagedDiagnostics);

      if (sectionState) {
        entries.set(row.id, sectionState);
      }
    });

    return entries;
  }, [quoteRows, quoteTenderManagedDiagnostics]);
  const quoteTenderManagedEditTargetsByRowId = useMemo(() => {
    const entries = new Map<string, QuoteTenderManagedEditTarget>();

    quoteRows.forEach((row) => {
      if (row.mode !== 'section') {
        return;
      }

      entries.set(row.id, resolveQuoteTenderManagedEditTarget({
        quote,
        rows: quoteRows,
        diagnostics: quoteTenderManagedDiagnostics,
        editorState: quoteTenderManagedEditorState,
        target: { kind: 'section_row', rowId: row.id },
      }));
    });

    return entries;
  }, [quote, quoteRows, quoteTenderManagedDiagnostics, quoteTenderManagedEditorState]);
  const resolvedQuoteTermsContent = useMemo(
    () => (quote && quoteTerms ? resolveTermTemplatePlaceholders(quoteTerms.contentMd, { customer, project, quote, settings: documentSettings }) : ''),
    [customer, documentSettings, project, quote, quoteTerms]
  );
  const projectQuotes = useMemo(() => getQuotesForProject(projectId), [getQuotesForProject, projectId]);
  const quoteInvoices = useMemo(() => (quote ? getInvoicesForQuote(quote.id) : []), [getInvoicesForQuote, quote]);
  const quoteHasNewerRevision = quote ? hasNewerRevision(quote) : false;
  const isEditable = Boolean(quote && quote.status === 'draft' && !quoteHasNewerRevision);
  const quoteVatPercent = quote ? getQuoteVatPercent(quote) : 0;
  const quoteVatLabel = quote ? getQuoteVatLabel(quote) : 'ALV -';
  const quoteSummary = useMemo(() => (quote ? getQuoteSummaryBreakdown(quote, quoteRows) : null), [quote, quoteRows]);
  const calculation = quoteSummary?.calculation ?? null;
  const quoteOwnerLabel = quote ? getResponsibleUserLabel(quote.ownerUserId, responsibleUsers) : 'Ei vastuuhenkilöä';
  const travelCosts = quote ? calculateTravelCosts(quote) : 0;
  const activeExtraChargeLines = quoteSummary?.extraChargeLines ?? [];
  const visibleScheduleMilestones = useMemo(
    () => (quote ? (quote.scheduleMilestones || []).filter(hasScheduleMilestoneContent) : []),
    [quote]
  );
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
  const billableRowCount = useMemo(
    () => quoteRows.filter((row) => row.mode !== 'section').length,
    [quoteRows]
  );
  const hasPotentialDoubleInstallationCharge = useMemo(
    () => Boolean(
      quote &&
      quote.installationCosts > 0 &&
      quoteRows.some(
        (row) =>
          row.mode !== 'section' &&
          row.mode !== 'charge' &&
          (row.mode === 'installation' || row.mode === 'product_installation') &&
          row.installationPrice > 0
      )
    ),
    [quote, quoteRows]
  );
  const quoteEditorProgress = useMemo(
    () => (quote && validation ? {
      quote,
      rows: quoteRows,
      validation,
      quoteOwnerLabel,
      visibleScheduleMilestones,
    } : null),
    [quote, quoteOwnerLabel, quoteRows, validation, visibleScheduleMilestones]
  );
  const quoteEditorSteps = useMemo(
    () => (quoteEditorProgress ? getQuoteEditorSteps(quoteEditorProgress) : []),
    [quoteEditorProgress]
  );
  const quoteCompletionChecklist = useMemo(
    () => (quoteEditorProgress ? getQuoteCompletionChecklist(quoteEditorProgress) : []),
    [quoteEditorProgress]
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

  useEffect(() => {
    let active = true;

    if (
      !quoteTenderManagedDiagnostics.has_tarjousaly_managed_surface
      || quoteTenderManagedDiagnostics.multiple_draft_package_sources
      || !quoteTenderManagedDiagnostics.primary_draft_package_id
    ) {
      setQuoteTenderImportSource(null);
      return () => {
        active = false;
      };
    }

    const draftPackageId = quoteTenderManagedDiagnostics.primary_draft_package_id;

    const loadTenderImportSource = async () => {
      try {
        const draftPackage = await tenderIntelligenceRepository.getDraftPackageById(draftPackageId);

        if (!draftPackage) {
          if (active) {
            setQuoteTenderImportSource({
              draftPackageId,
              draftPackageTitle: null,
              tenderPackageId: null,
              tenderPackageTitle: null,
            });
          }
          return;
        }

        const tenderPackage = await tenderIntelligenceRepository.getTenderPackageById(draftPackage.tenderPackageId);

        if (active) {
          setQuoteTenderImportSource({
            draftPackageId: draftPackage.id,
            draftPackageTitle: draftPackage.title,
            tenderPackageId: draftPackage.tenderPackageId,
            tenderPackageTitle: tenderPackage?.package.name ?? null,
          });
        }
      } catch {
        if (active) {
          setQuoteTenderImportSource({
            draftPackageId,
            draftPackageTitle: null,
            tenderPackageId: null,
            tenderPackageTitle: null,
          });
        }
      }
    };

    void loadTenderImportSource();

    return () => {
      active = false;
    };
  }, [quoteTenderManagedDiagnostics, tenderIntelligenceRepository]);

  useEffect(() => {
    if (!quote || initializedQuoteUiRef.current === quote.id) {
      return;
    }

    initializedQuoteUiRef.current = quote.id;
    setActiveStep(billableRowCount > 0 ? 'rows' : 'basics');
    setAdditionalCostsOpen(calculation ? calculation.extraChargesTotal > 0 || hasPotentialDoubleInstallationCharge : false);
  }, [billableRowCount, calculation, hasPotentialDoubleInstallationCharge, quote]);

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
          {!activeQuoteId
            ? 'Tarjouseditori pitää avata olemassa olevan tarjouksen kautta. Luo tarjous ensin projektityötilasta.'
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

  const basicsStep = quoteEditorSteps.find((step) => step.id === 'basics');
  const rowsStep = quoteEditorSteps.find((step) => step.id === 'rows');
  const costsStep = quoteEditorSteps.find((step) => step.id === 'costs');
  const finishingStep = quoteEditorSteps.find((step) => step.id === 'finishing');
  const reviewStep = quoteEditorSteps.find((step) => step.id === 'review');

  if (!basicsStep || !rowsStep || !costsStep || !finishingStep || !reviewStep) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Tarjouseditori" maxWidth="full">
        <Card className="p-10 text-center text-muted-foreground">
          Tarjouseditorin vaiheita ei voitu muodostaa. Sulje editori ja yrita uudelleen.
        </Card>
      </ResponsiveDialog>
    );
  }

  const getPreviousStepId = (stepId: QuoteEditorStepId) => {
    const index = QUOTE_EDITOR_STEP_ORDER.indexOf(stepId);
    return index > 0 ? QUOTE_EDITOR_STEP_ORDER[index - 1] : null;
  };

  const getNextStepId = (stepId: QuoteEditorStepId) => {
    const index = QUOTE_EDITOR_STEP_ORDER.indexOf(stepId);
    return index >= 0 && index < QUOTE_EDITOR_STEP_ORDER.length - 1 ? QUOTE_EDITOR_STEP_ORDER[index + 1] : null;
  };

  const touchQuote = () => {
    updateQuote(quote.id, {});
  };

  const saveManagedAwareDraft = () => {
    touchQuote();
    toast.success(
      quoteTenderManagedEditorState.status === 'warning'
        ? 'Tarjous tallennettu käyttäjän vahvistuksella Tarjousälyn hallinnoitujen muutosten jälkeen.'
        : 'Tarjouksen luonnos tallennettu.'
    );
  };

  const closeManagedGuardDialog = () => {
    setManagedGuardRequest(null);
    pendingManagedGuardActionRef.current = null;
  };

  const handleManagedGuardConfirm = () => {
    const pendingAction = pendingManagedGuardActionRef.current;
    closeManagedGuardDialog();
    pendingAction?.();
  };

  const rememberUnlockedManagedTarget = (unlockKey?: string) => {
    if (!unlockKey) {
      return;
    }

    setManagedEditUnlockKeys((current) => current.includes(unlockKey) ? current : [...current, unlockKey]);
  };

  const attemptManagedEdit = (
    target: QuoteTenderManagedEditTarget | null | undefined,
    applyChange: () => void,
  ) => {
    if (!target) {
      applyChange();
      return;
    }

    const decision = resolveQuoteTenderManagedEditGuardDecision(
      target,
      Boolean(target.unlock_key && managedEditUnlockKeySet.has(target.unlock_key)),
    );

    if (decision === 'allow') {
      applyChange();
      return;
    }

    setManagedGuardRequest(buildManagedEditGuardRequest(
      target,
      resolveTenderIntelligenceLink(
        target.status === 'danger'
          ? 'repair-managed-import'
          : target.status === 'warning'
            ? 'reimport-managed-import'
            : 'open-source-draft',
        target.block_ids,
      ),
    ));

    if (decision === 'confirm') {
      pendingManagedGuardActionRef.current = () => {
        rememberUnlockedManagedTarget(target.unlock_key);
        applyChange();
      };
      return;
    }

    pendingManagedGuardActionRef.current = null;
  };

  const updateManagedQuoteField = (field: 'notes' | 'internalNotes', value: string) => {
    const target = quoteTenderManagedFieldTargets[field];

    attemptManagedEdit(target, () => {
      updateQuote(quote.id, field === 'notes' ? { notes: value } : { internalNotes: value });
    });
  };

  const attemptManagedSectionEdit = (row: QuoteRow, applyChange: () => void) => {
    attemptManagedEdit(quoteTenderManagedEditTargetsByRowId.get(row.id), applyChange);
  };

  const resolveManagedSelectionEditTarget = () => {
    const managedTargets = selectedRowIds
      .map((rowId) => quoteTenderManagedEditTargetsByRowId.get(rowId) ?? null)
      .filter((target): target is QuoteTenderManagedEditTarget => Boolean(target?.is_tarjousaly_managed));

    if (managedTargets.length === 0) {
      return null;
    }

    const markerKeys = [...new Set(managedTargets.flatMap((target) => target.marker_keys))].sort();
    const titles = [...new Set(managedTargets.flatMap((target) => target.titles).filter(Boolean))];
    const status = managedTargets.some((target) => target.status === 'danger')
      ? 'danger'
      : managedTargets.some((target) => target.status === 'warning')
        ? 'warning'
        : 'clean';

    return {
      kind: 'section_row' as const,
      label: managedTargets.length === 1
        ? managedTargets[0].label
        : `${managedTargets.length} Tarjousälyn hallinnoimaa väliotsikkoa`,
      status,
      is_tarjousaly_managed: true,
      is_safe_managed: status !== 'danger',
      is_danger: status === 'danger',
      field: 'sections' as const,
      marker_keys: markerKeys,
      block_ids: [...new Set(managedTargets.flatMap((target) => target.block_ids))],
      titles,
      issue_messages: [...new Set(managedTargets.flatMap((target) => target.issue_messages))],
      unlock_key: `section-selection:${markerKeys.join('|')}`,
    } satisfies QuoteTenderManagedEditTarget;
  };

  const attemptManagedAction = (
    actionLabel: string,
    onProceed: () => void,
    options: {
      confirmLabel?: string;
      allowWarningWithoutConfirmation?: boolean;
    } = {},
  ) => {
    const decision = resolveQuoteTenderManagedActionGuardDecision(
      quoteTenderManagedEditorState,
      options.allowWarningWithoutConfirmation ?? false,
    );

    if (decision === 'allow') {
      onProceed();
      return;
    }

    const status = quoteTenderManagedEditorState.status === 'danger' ? 'danger' : 'warning';

    setManagedGuardRequest(buildManagedActionGuardRequest({
      actionLabel,
      status,
      issueMessages: quoteTenderManagedEditorState.issues.map((issue) => issue.message),
      tenderIntelligenceLink: resolveTenderIntelligenceLink(
        status === 'danger' ? 'repair-managed-import' : 'reimport-managed-import',
        quoteTenderManagedDiagnostics.managed_block_ids,
      ),
      confirmLabel: options.confirmLabel,
    }));
    pendingManagedGuardActionRef.current = decision === 'confirm' ? onProceed : null;
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
    const mode: QuoteRowMode = installationPrice > 0 ? 'product_installation' : 'product';
    const regionMultiplier = project.regionCoefficient || 1;
    const suggestedUnitPrice = quote.pricingMode === 'manual' && (product.defaultSalePrice ?? 0) > 0
      ? roundCurrency(Math.max(0, product.defaultSalePrice ?? 0) + (mode === 'product_installation' ? installationPrice * regionMultiplier : 0))
      : calculateSuggestedUnitPrice(
          {
            mode,
            purchasePrice: product.purchasePrice,
            installationPrice,
            regionMultiplier,
          },
          marginPercent
        );

    return {
      quoteId: quote.id,
      sortOrder: quoteRows.length,
      mode,
      pricingModel: 'unit_price',
      unitPricingMode: quote.pricingMode,
      source: 'catalog',
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      description: product.description,
      quantity: 1,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      salesPrice: suggestedUnitPrice,
      installationPrice,
      marginPercent,
      priceAdjustment: 0,
      regionMultiplier,
      installationGroupId: product.installationGroupId,
      notes: '',
      manualSalesPrice: quote.pricingMode === 'manual',
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
      pricingModel: 'unit_price',
      unitPricingMode: mode === 'charge' ? 'manual' : quote.pricingMode,
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
      priceAdjustment: 0,
      regionMultiplier: project.regionCoefficient || 1,
      notes: '',
      manualSalesPrice: mode === 'charge' || quote.pricingMode === 'manual',
      chargeType: mode === 'charge' ? 'other' : undefined,
    };
    addRow(baseRow);
    touchQuote();
  };

  const syncRowWithMargin = (row: QuoteRow, marginPercent: number) => {
    if (
      row.mode === 'section' ||
      row.mode === 'charge' ||
      getRowPricingWorkflow(row) !== 'margin'
    ) {
      return;
    }

    updateRow(row.id, {
      unitPricingMode: 'margin',
      marginPercent,
      salesPrice: calculateSuggestedUnitPrice(row, marginPercent),
      manualSalesPrice: false,
    });
  };

  const patchRow = (row: QuoteRow, updates: Partial<QuoteRow>) => {
    const currentPricing = getQuoteRowPricingDetails(row, quoteVatPercent);
    const nextRow = {
      ...row,
      ...updates,
      pricingModel: updates.pricingModel ?? row.pricingModel ?? getQuoteRowPricingModel(row),
      unitPricingMode: updates.unitPricingMode ?? row.unitPricingMode ?? getQuoteRowUnitPricingMode(row),
      priceAdjustment: updates.priceAdjustment ?? row.priceAdjustment ?? 0,
    } satisfies QuoteRow;

    if ('mode' in updates && nextRow.mode === 'charge' && nextRow.pricingModel !== 'line_total') {
      nextRow.unitPricingMode = 'manual';
      nextRow.manualSalesPrice = true;
    }

    const nextPricingWorkflow = getRowPricingWorkflow(nextRow);

    if ('pricingModel' in updates || 'unitPricingMode' in updates) {
      if (nextPricingWorkflow === 'line_total') {
        nextRow.overridePrice = updates.overridePrice ?? currentPricing.baseTotal;
        nextRow.manualSalesPrice = true;
      }

      if (nextPricingWorkflow === 'manual') {
        if (!('salesPrice' in updates)) {
          nextRow.salesPrice = currentPricing.derivedUnitPrice;
        }
        nextRow.overridePrice = undefined;
        nextRow.manualSalesPrice = true;
      }

      if (nextPricingWorkflow === 'margin') {
        nextRow.overridePrice = undefined;
        nextRow.manualSalesPrice = updates.manualSalesPrice ?? false;
        nextRow.salesPrice = calculateSuggestedUnitPrice(nextRow, nextRow.marginPercent);
      }
    }

    if ('manualSalesPrice' in updates && nextPricingWorkflow === 'margin') {
      if (updates.manualSalesPrice) {
        nextRow.salesPrice = currentPricing.derivedUnitPrice;
      } else {
        nextRow.salesPrice = calculateSuggestedUnitPrice(nextRow, nextRow.marginPercent);
      }
    }

    if ('installationGroupId' in updates && nextRow.installationGroupId) {
      const group = groups.find((item) => item.id === nextRow.installationGroupId);
      if (group && row.mode !== 'section' && row.mode !== 'charge' && row.mode !== 'product') {
        nextRow.installationPrice = nextRow.installationPrice || group.defaultInstallationPrice || group.defaultPrice;
      }
    }

    if (
      (
        'purchasePrice' in updates ||
        'marginPercent' in updates ||
        'installationPrice' in updates ||
        'installationGroupId' in updates ||
        'regionMultiplier' in updates ||
        'mode' in updates
      ) &&
      nextPricingWorkflow === 'margin' &&
      !nextRow.manualSalesPrice &&
      nextRow.mode !== 'section' &&
      nextRow.mode !== 'charge'
    ) {
      nextRow.salesPrice = calculateSuggestedUnitPrice(nextRow, nextRow.marginPercent);
    }

    if ('salesPrice' in updates) {
      nextRow.manualSalesPrice = nextPricingWorkflow === 'margin'
        ? updates.manualSalesPrice ?? true
        : true;
    }

    if ('overridePrice' in updates) {
      nextRow.manualSalesPrice = true;
    }

    updateRow(row.id, nextRow);
    touchQuote();
  };

  const setRowPricingWorkflow = (row: QuoteRow, workflow: RowPricingWorkflow) => {
    const currentPricing = getQuoteRowPricingDetails(row, quote.vatPercent);

    if (workflow === 'line_total') {
      patchRow(row, {
        pricingModel: 'line_total',
        overridePrice: currentPricing.baseTotal,
      });
      return;
    }

    if (workflow === 'manual') {
      patchRow(row, {
        pricingModel: 'unit_price',
        unitPricingMode: 'manual',
        salesPrice: currentPricing.pricingModel === 'line_total'
          ? currentPricing.derivedUnitPrice
          : currentPricing.enteredUnitPrice ?? currentPricing.derivedUnitPrice,
      });
      return;
    }

    patchRow(row, {
      pricingModel: 'unit_price',
      unitPricingMode: 'margin',
      manualSalesPrice: false,
      salesPrice: calculateSuggestedUnitPrice(row, row.marginPercent),
      overridePrice: undefined,
    });
  };

  const handleQuoteOwnerChange = (nextOwnerUserId: string) => {
    updateQuote(quote.id, { ownerUserId: nextOwnerUserId });
    quoteRows.forEach((row) => {
      updateRow(row.id, { ownerUserId: nextOwnerUserId });
    });
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
    const completeRemoval = () => {
      if (!window.confirm(`Haluatko varmasti poistaa ${count} valittua tarjousriviä?`)) return;
      deleteRows(selectedRowIds);
      setSelectedRowIds([]);
      touchQuote();
      toast.success(count === 1 ? '1 tarjousrivi poistettu.' : `${count} tarjousriviä poistettu.`);
    };
    const managedSelectionTarget = resolveManagedSelectionEditTarget();

    if (managedSelectionTarget) {
      attemptManagedEdit(managedSelectionTarget, completeRemoval);
      return;
    }

    completeRemoval();
  };

  const applyQuoteMargin = (marginPercent: number) => {
    updateQuote(quote.id, { selectedMarginPercent: marginPercent });
    if (quote.pricingMode === 'margin') {
      quoteRows.forEach((row) => {
        if (getQuoteRowUnitPricingMode(row) === 'margin' && !row.manualSalesPrice) {
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
      vatPercent: quoteVatPercent,
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

  const renderSectionFooter = (stepId: QuoteEditorStepId, nextLabel?: string, nextStepOverride?: QuoteEditorStepId) => {
    const previousStepId = getPreviousStepId(stepId);
    const nextStepId = nextStepOverride ?? getNextStepId(stepId);

    return (
      <>
        {previousStepId ? (
          <Button type="button" variant="outline" onClick={() => setActiveStep(previousStepId)}>
            Edellinen vaihe
          </Button>
        ) : (
          <div className="text-sm text-slate-500">Vaiheittainen rakenne auttaa pitämään tarjousrivit editorin päätyönä.</div>
        )}
        {nextStepId ? (
          <Button type="button" onClick={() => setActiveStep(nextStepId)}>
            {nextLabel || 'Seuraava vaihe'}
          </Button>
        ) : (
          <div className="text-sm text-slate-500">Viimeinen vaihe. Tarkista lähetysvalmius ennen asiakkaalle vientiä.</div>
        )}
      </>
    );
  };

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>Sulje</Button>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button variant="outline" onClick={() => attemptManagedAction('PDF-vienti', () => exportQuoteToPDF(quote, quoteRows, customer, project, quoteTerms, documentSettings), { confirmLabel: 'Vie PDF tästä huolimatta' })}>
          <FilePdf className="h-4 w-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={() => attemptManagedAction('Asiakas-Excel-vienti', () => exportQuoteToCustomerExcel(quote, quoteRows, customer, project, quoteTerms, documentSettings), { confirmLabel: 'Vie asiakas-Excel tästä huolimatta' })}>
          <FileXls className="h-4 w-4" />
          Asiakas-Excel
        </Button>
        <Button variant="outline" onClick={() => attemptManagedAction('Sisäinen Excel-vienti', () => exportQuoteToInternalExcel(quote, quoteRows, customer, project, quoteTerms, documentSettings), { confirmLabel: 'Vie sisäinen Excel tästä huolimatta' })}>
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
          <Button variant="outline" onClick={() => attemptManagedAction('Tarjouksen revisio', createRevision, { confirmLabel: 'Luo revisio tästä huolimatta' })}>
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
          <Button onClick={() => attemptManagedAction('Lähetyksen tarkistus', () => setValidationOpen(true), { allowWarningWithoutConfirmation: true })} disabled={!validation.isValid && validation.errors.length > 0}>
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
                  <Badge variant="outline">{quote.quoteNumber || 'Tarjousnumero puuttuu'}</Badge>
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

            <QuoteManagedSaveGuard
              state={quoteTenderManagedEditorState}
              isEditable={isEditable}
              onSave={saveManagedAwareDraft}
              tenderIntelligenceLink={tenderIntelligenceRepairLink}
            />

            <QuoteTenderImportInspector
              diagnostics={quoteTenderManagedDiagnostics}
              source={quoteTenderImportSource}
              tenderIntelligenceLink={tenderIntelligenceInspectorLink}
            />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Päätyövaihe</div>
                <div className="mt-2 text-base font-semibold text-slate-950">Tarjousrivit</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Vaiheet pitävät perustiedot, rivit, lisäkulut ja viimeistelyn erillään, jotta varsinainen myyntityö pysyy riveissä.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Loppusumma</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{formatCurrency(calculation.total)}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Rivit, lisäkulut, alennus ja ALV muodostavat asiakkaalle näkyvän kokonaissumman tähän näkymään reaaliaikaisesti.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sisäinen kate</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{formatCurrency(calculation.totalMargin)}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {formatNumber(calculation.marginPercent, 1)} % koko tarjoukselle. Tämä auttaa tarkistamaan kannattavuuden ennen lähetystä.
                </p>
              </div>
            </div>
          </Card>

          <QuoteEditorStepper steps={quoteEditorSteps} activeStep={activeStep} onStepChange={setActiveStep} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.95fr)]">
            <div className="space-y-6">
              <QuoteEditorSection
                step={basicsStep}
                stepNumber={1}
                active={activeStep === 'basics'}
                onSelect={() => setActiveStep('basics')}
                badges={(
                  <>
                    <VisibilityBadge tone="derived" label="Vaikuttaa uusien rivien oletuksiin" />
                    <VisibilityBadge tone="optional" label="Alennus on valinnainen" />
                  </>
                )}
                footer={renderSectionFooter('basics', 'Siirry tarjousriveihin')}
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldHelpLabel htmlFor="quote-number" label="Tarjousnumero" help={QUOTE_FIELD_HELP.quoteNumber} />
                      <Input id="quote-number" value={quote.quoteNumber} onChange={(event) => updateQuote(quote.id, { quoteNumber: event.target.value })} disabled={!isEditable} />
                    </div>
                    <div className="space-y-2">
                      <FieldHelpLabel htmlFor="valid-until" label="Voimassa asti" help={QUOTE_FIELD_HELP.validUntil} />
                      <Input id="valid-until" type="date" value={quote.validUntil || ''} onChange={(event) => updateQuote(quote.id, { validUntil: event.target.value })} disabled={!isEditable} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <FieldHelpLabel htmlFor="quote-owner" label="Vastuuhenkilö / myyjä" help="Tämä käyttäjä omistaa tarjouksen ja sen rivit. Uudet rivit ja raportointi kohdistuvat tämän vastuuhenkilön alle." />
                      {canManageUsers ? (
                        <Select value={quote.ownerUserId || user?.id || 'none'} onValueChange={handleQuoteOwnerChange} disabled={!isEditable}>
                          <SelectTrigger id="quote-owner"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {responsibleUsers.map((responsibleUser) => (
                              <SelectItem key={responsibleUser.id} value={responsibleUser.id}>{responsibleUser.displayName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{quoteOwnerLabel}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <FieldHelpLabel htmlFor="pricing-mode" label="Uusien rivien oletustila" help={QUOTE_FIELD_HELP.pricingMode} />
                      <Select
                        value={quote.pricingMode}
                        onValueChange={(value) => {
                          updateQuote(quote.id, { pricingMode: value as Quote['pricingMode'] });
                          if (value === 'margin') {
                            quoteRows.forEach((row) => {
                              if (getQuoteRowUnitPricingMode(row) === 'margin' && !row.manualSalesPrice) {
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
                          <SelectItem value="manual">Manuaalinen asiakashinta</SelectItem>
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
                    <div className="space-y-2 sm:col-span-2">
                      <FieldHelpLabel htmlFor="discount-value" label="Alennuksen arvo" help={QUOTE_FIELD_HELP.discountValue} />
                      <Input id="discount-value" type="number" min="0" step="0.01" value={quote.discountValue} onChange={(event) => updateQuote(quote.id, { discountValue: parseFloat(event.target.value) || 0 })} disabled={!isEditable || quote.discountType === 'none'} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Mitä perustiedoissa päätetään?</h4>
                        <HelpTooltip
                          label="Perustiedot"
                          help="Perustiedoissa asetat tarjouksen tunnisteet, vastuuhenkilön, verotuksen ja uusien rivien oletuslogiikan. Varsinainen rivikohtainen hinnoittelu tehdään vasta tarjousriveillä."
                        />
                      </div>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                        <p>
                          Uusien rivien oletustila määrittää, syntyykö uusi rivi kateohjattuna vai manuaalisella asiakashinnalla. Jokaisella rivillä voit vaihtaa tämän myöhemmin erikseen.
                        </p>
                        <p>
                          ALV ja alennus vaikuttavat koko tarjouksen loppusummaan, mutta eivät muuta rivien sisäistä kustannuslogiikkaa.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tämän vaiheen tarkistus</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vastuuhenkilö</div>
                          <div className="mt-1 text-sm font-medium text-slate-950">{quoteOwnerLabel}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Uusien rivien oletus</div>
                          <div className="mt-1 text-sm font-medium text-slate-950">{quote.pricingMode === 'margin' ? 'Kateohjattu' : 'Manuaalinen asiakashinta'}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Oletuskate</div>
                          <div className="mt-1 text-sm font-medium text-slate-950">{formatNumber(quote.selectedMarginPercent, 1)} %</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">ALV</div>
                          <div className="mt-1 text-sm font-medium text-slate-950">{formatVatPercent(quoteVatPercent)} %</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </QuoteEditorSection>

              <QuoteEditorSection
                step={rowsStep}
                stepNumber={2}
                active={activeStep === 'rows'}
                onSelect={() => setActiveStep('rows')}
                badges={(
                  <>
                    <VisibilityBadge tone="customer" label="Asiakkaan laskutettava työtila" />
                    <VisibilityBadge tone="internal" label="Sisäinen kannattavuus näkyy erikseen" />
                    <VisibilityBadge tone="derived" label="Kateohjauksessa asiakashinta voidaan johtaa automaattisesti" />
                  </>
                )}
                footer={renderSectionFooter('rows', 'Lisää tarvittaessa lisäkulut')}
              >
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Laskutettavia rivejä</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{billableRowCount}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Tuotteet, työrivit ja erilliset veloitukset. Väliotsikot jäsentävät, mutta eivät vaikuta summaan.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rivien välisumma</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{formatCurrency(calculation.lineSubtotal)}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Lisäkulut, alennus ja ALV lisätään tämän vaiheen jälkeen.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Valitut rivit</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedRowIds.length}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Massapoisto helpottaa suurten tarjousten siistimistä ilman, että rivejä tarvitsee poistaa yksitellen.</p>
                  </div>
                </div>

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
                      const pricingDetails = getQuoteRowPricingDetails(row, quoteVatPercent);
                      const managedSectionState = quoteTenderSectionStateByRowId.get(row.id) ?? null;
                      const managedSectionEditTarget = quoteTenderManagedEditTargetsByRowId.get(row.id) ?? null;
                      const managedSectionEditUnlocked = Boolean(
                        managedSectionEditTarget?.unlock_key && managedEditUnlockKeySet.has(managedSectionEditTarget.unlock_key),
                      );
                      const pricingWorkflow = getRowPricingWorkflow(row);
                      const priceSource = getRowPriceSource(row);
                      const isMarginWorkflow = pricingWorkflow === 'margin';
                      const isManualWorkflow = pricingWorkflow === 'manual';
                      const isLineTotalWorkflow = pricingWorkflow === 'line_total';
                      const isManualOverride = isMarginWorkflow && row.manualSalesPrice;
                      const canUseMarginWorkflow = row.mode !== 'charge';
                      const canTrackInternalCosts = row.mode !== 'charge';
                      const targetUnitPrice = calculateSuggestedUnitPrice(row, row.marginPercent);
                      const priceBelowTarget = isManualOverride && rowCalculation.rowTotal > 0 && rowCalculation.marginPercent < row.marginPercent;
                      const priceBelowCost = isManualOverride && rowCalculation.marginAmount < 0;
                      const showOverrideWarning = priceBelowTarget || priceBelowCost;
                      const optionalInternalUnitCostLabel = rowCalculation.hasInternalCostBasis
                        ? `${formatCurrency(rowCalculation.internalUnitCost)} / ${row.unit}`
                        : 'Ei tiedossa';
                      const optionalInternalRowCostLabel = rowCalculation.hasInternalCostBasis
                        ? formatCurrency(rowCalculation.costTotal)
                        : 'Ei tiedossa';
                      const optionalMarginAmountLabel = rowCalculation.hasInternalCostBasis
                        ? formatCurrency(rowCalculation.marginAmount)
                        : 'Ei tiedossa';
                      const optionalMarginPercentLabel = rowCalculation.hasInternalCostBasis
                        ? `${formatNumber(rowCalculation.marginPercent, 1)} %`
                        : 'Ei tiedossa';
                      const customerUnitPriceLabel = isLineTotalWorkflow
                        ? `${formatCurrency(pricingDetails.derivedUnitPrice)} / ${row.unit}`
                        : `${formatCurrency(pricingDetails.enteredUnitPrice ?? 0)} / ${row.unit}`;
                      const showInstallationDefaults = row.mode === 'installation' || row.mode === 'product_installation';
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
                                <QuoteManagedSectionBadge sectionState={managedSectionState} />
                                <Badge variant="outline">{ROW_PRICING_WORKFLOW_LABELS[pricingWorkflow]}</Badge>
                                {priceSource !== pricingWorkflow && <Badge variant="outline">{ROW_PRICE_SOURCE_LABELS[priceSource]}</Badge>}
                                {rowCalculation.usesLegacyPricing && <Badge variant="outline">Vanha rivi, hinnoittelu muunnettu näkyvään malliin</Badge>}
                                {row.chargeType && <Badge variant="outline">{CHARGE_TYPE_LABELS[row.chargeType]}</Badge>}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="ghost" onClick={() => attemptManagedSectionEdit(row, () => moveRow(row.id, -1))} disabled={!isEditable || index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => attemptManagedSectionEdit(row, () => moveRow(row.id, 1))} disabled={!isEditable || index === quoteRows.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => attemptManagedSectionEdit(row, () => cloneRow(row))} disabled={!isEditable}><Copy className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => attemptManagedSectionEdit(row, () => removeRow(row.id))} disabled={!isEditable}><Trash className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="space-y-2">
                                <FieldHelpLabel label="Tyyppi" help={QUOTE_ROW_FIELD_HELP.mode} />
                                <Select value={row.mode} onValueChange={(value) => attemptManagedSectionEdit(row, () => patchRow(row, { mode: value as QuoteRowMode }))} disabled={!isEditable}>
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
                                <Input value={row.productName} onChange={(event) => attemptManagedSectionEdit(row, () => patchRow(row, { productName: event.target.value }))} disabled={!isEditable} />
                                {managedSectionEditTarget?.is_tarjousaly_managed && row.mode === 'section' && (
                                  <p className={[
                                    'text-xs leading-6',
                                    managedSectionEditTarget.status === 'danger'
                                      ? 'text-red-700'
                                      : managedSectionEditTarget.status === 'warning'
                                        ? 'text-amber-700'
                                        : 'text-slate-500',
                                  ].join(' ')}>
                                    {resolveManagedSectionInlineHint(managedSectionEditTarget, managedSectionEditUnlocked)}
                                  </p>
                                )}
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
                                <div className="rounded-xl border bg-background p-4 space-y-4">
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-sm font-medium">Hinnoittelutapa</div>
                                        <VisibilityBadge tone="customer" label="Määrittää asiakkaalle näkyvän hinnan" />
                                        {isMarginWorkflow && <VisibilityBadge tone="internal" label="Lähtee sisäisestä kustannuksesta" />}
                                        {isLineTotalWorkflow && <VisibilityBadge tone="derived" label="Yksikköhinta johdetaan automaattisesti" />}
                                      </div>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {isMarginWorkflow
                                          ? 'Aloita omasta kustannuksesta ja tavoitekatteesta. Asiakashinta johdetaan tästä vasta sen jälkeen.'
                                          : isManualWorkflow
                                            ? 'Syötä asiakkaalle annettava veroton yksikköhinta suoraan. Sisäiset kustannukset ovat tässä tilassa apuseurantaa.'
                                            : 'Syötä koko rivin veroton kokonaishinta. Järjestelmä johtaa yksikköhinnan vain apuarvoksi.'}
                                      </p>
                                    </div>
                                  </div>

                                  <QuotePricingModeSelector
                                    value={pricingWorkflow}
                                    onChange={(value) => setRowPricingWorkflow(row, value)}
                                    disabled={!isEditable}
                                    canUseMargin={canUseMarginWorkflow}
                                  />

                                  {!canUseMarginWorkflow && (
                                    <p className="text-xs text-muted-foreground">
                                      Lisäveloitusrivit hinnoitellaan manuaalisesti tai rivin kokonaishintana.
                                    </p>
                                  )}

                                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="space-y-2">
                                      <FieldHelpLabel label="Määrä" help={QUOTE_ROW_FIELD_HELP.quantity} />
                                      <Input type="number" min="0" step="0.01" value={row.quantity} onChange={(event) => patchRow(row, { quantity: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                    </div>
                                    <div className="space-y-2">
                                      <FieldHelpLabel label="Yksikkö" help={QUOTE_ROW_FIELD_HELP.unit} />
                                      <Input value={row.unit} onChange={(event) => patchRow(row, { unit: event.target.value })} disabled={!isEditable} />
                                    </div>
                                    <div className="space-y-2">
                                      <FieldHelpLabel label="Hinnan lähde" help={QUOTE_ROW_FIELD_HELP.pricingModel} />
                                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{ROW_PRICE_SOURCE_LABELS[priceSource]}</div>
                                    </div>
                                    <div className="space-y-2">
                                      <FieldHelpLabel label={isLineTotalWorkflow ? 'Johdettu yksikköhinta' : 'Asiakashinta / yks.'} help={isLineTotalWorkflow ? QUOTE_ROW_FIELD_HELP.derivedUnitPrice : QUOTE_ROW_FIELD_HELP.salesPrice} />
                                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{customerUnitPriceLabel}</div>
                                    </div>
                                  </div>

                                  {isMarginWorkflow && (
                                    <>
                                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                          <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <div className="text-sm font-medium text-slate-950">Sisäinen kannattavuus</div>
                                              <VisibilityBadge tone="internal" label="Ei näy asiakkaalle" />
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              Syötä ensin oma kustannus ja tavoitekate. Asiakashinta johdetaan näistä arvoista.
                                            </p>
                                          </div>
                                          <Badge variant="outline">{formatCurrency(rowCalculation.internalUnitCost)} / {row.unit}</Badge>
                                        </div>

                                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white/80 px-4 py-3">
                                          <Warning className="mt-0.5 h-4 w-4 flex-none text-amber-700" weight="fill" />
                                          <div className="space-y-1">
                                            <div className="text-sm font-medium text-amber-950">Tämä osio ei näy asiakkaalle</div>
                                            <p className="text-xs leading-5 text-amber-900/80">
                                              Sisäinen kannattavuus ohjaa tarjouksen hinnan muodostusta, mutta sitä ei viedä asiakkaalle näkyviin dokumentteihin.
                                            </p>
                                          </div>
                                        </div>

                                        <div className="rounded-xl border bg-white/80 px-4 py-3 text-sm">
                                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Sisäisen kustannuksen kaava</div>
                                          <div className="mt-1 font-medium text-foreground">{formatInternalCostFormula(row)}</div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Ostohinta / yksikkö" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                            <Input type="number" min="0" step="0.01" value={row.purchasePrice} onChange={(event) => patchRow(row, { purchasePrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Aluekerroin" help={QUOTE_ROW_FIELD_HELP.regionMultiplier} />
                                            <Input type="number" min="0" step="0.01" value={row.regionMultiplier} onChange={(event) => patchRow(row, { regionMultiplier: parseFloat(event.target.value) || 1 })} disabled={!isEditable} />
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Tavoitekate %" help={QUOTE_ROW_FIELD_HELP.marginPercent} />
                                            <Input type="number" min="0" step="0.1" value={row.marginPercent} onChange={(event) => patchRow(row, { marginPercent: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Sisäinen yksikkökustannus" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(rowCalculation.internalUnitCost)} / {row.unit}</div>
                                          </div>
                                        </div>

                                        {showInstallationDefaults ? (
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
                                              <FieldHelpLabel label="Asennuksen taustahinta / yks." help={QUOTE_ROW_FIELD_HELP.installationPrice} />
                                              <Input type="number" min="0" step="0.01" value={row.installationPrice} onChange={(event) => patchRow(row, { installationPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
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
                                        ) : (
                                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Todellinen kate" help={QUOTE_ROW_FIELD_HELP.marginAmount} />
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(rowCalculation.marginAmount)}</div>
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Kate % toteuma" help={QUOTE_ROW_FIELD_HELP.realizedMarginPercent} />
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatNumber(rowCalculation.marginPercent, 1)} %</div>
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Sisäinen rivikustannus" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(rowCalculation.costTotal)}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="rounded-xl border bg-background p-4 space-y-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                          <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <div className="text-sm font-medium">Asiakashinta asiakkaalle</div>
                                              <VisibilityBadge tone="customer" />
                                              {!isManualOverride && <VisibilityBadge tone="derived" label="Johdettu sisäisestä kannattavuudesta" />}
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              Asiakashinta on tässä tilassa johdettu arvo. Käytä ylikirjoitusta vain poikkeuksissa.
                                            </p>
                                          </div>
                                          <label className="flex items-center gap-2 rounded-full border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground">
                                            <Checkbox checked={row.manualSalesPrice} onCheckedChange={(checked) => patchRow(row, { manualSalesPrice: Boolean(checked) })} disabled={!isEditable} />
                                            Ylikirjoita asiakashinta
                                          </label>
                                        </div>

                                        {showOverrideWarning && (
                                          <Alert className={priceBelowCost ? 'border-destructive/40 text-destructive' : 'border-amber-300 bg-amber-50 text-amber-950'}>
                                            <AlertDescription>
                                              {priceBelowCost ? 'Ylikirjoitettu asiakashinta jää alle sisäisen kustannuksen.' : 'Ylikirjoitettu asiakashinta jää alle tavoitekatteen.'}
                                              {priceBelowTarget && ` Toteutuva kate ${formatNumber(rowCalculation.marginPercent, 1)} % jää alle tavoitteen ${formatNumber(row.marginPercent, 1)} %.`}
                                            </AlertDescription>
                                          </Alert>
                                        )}

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                          <div className="space-y-2">
                                            <FieldHelpLabel label={isManualOverride ? 'Asiakashinta, veroton / yks.' : 'Johdettu asiakashinta, veroton / yks.'} help={QUOTE_ROW_FIELD_HELP.salesPrice} />
                                            {isManualOverride ? (
                                              <Input type="number" min="0" step="0.01" value={pricingDetails.enteredUnitPrice ?? 0} onChange={(event) => patchRow(row, { salesPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                            ) : (
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(targetUnitPrice)} / {row.unit}</div>
                                            )}
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Lisä / alennus, veroton" help={QUOTE_ROW_FIELD_HELP.priceAdjustment} />
                                            <Input type="number" step="0.01" value={row.priceAdjustment ?? 0} onChange={(event) => patchRow(row, { priceAdjustment: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Kateohjattu tavoitehinta" help={QUOTE_ROW_FIELD_HELP.salesPrice} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(targetUnitPrice)} / {row.unit}</div>
                                          </div>
                                        </div>

                                        <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Laskentakaava</div>
                                          <div className="mt-1 font-medium text-foreground">{formatQuoteRowFormula(row, quoteVatPercent)}</div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Hinnan lähde" help={QUOTE_ROW_FIELD_HELP.pricingModel} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{ROW_PRICE_SOURCE_LABELS[priceSource]}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Veroton summa" help={QUOTE_ROW_FIELD_HELP.netTotal} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.netTotal)}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label={quoteVatLabel} help={QUOTE_ROW_FIELD_HELP.vatAmount} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.vatAmount)}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Verollinen summa" help={QUOTE_ROW_FIELD_HELP.grossTotal} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.grossTotal)}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {isManualWorkflow && (
                                    <>
                                      <div className="rounded-xl border bg-background p-4 space-y-4">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-medium">Asiakashinta asiakkaalle</div>
                                            <VisibilityBadge tone="customer" label="Syötetään käsin" />
                                          </div>
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            Asiakashinta on tässä tilassa käyttäjän syöttämä veroton yksikköhinta.
                                          </p>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Asiakashinta, veroton / yks." help={QUOTE_ROW_FIELD_HELP.salesPrice} />
                                            <Input type="number" min="0" step="0.01" value={pricingDetails.enteredUnitPrice ?? 0} onChange={(event) => patchRow(row, { salesPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Lisä / alennus, veroton" help={QUOTE_ROW_FIELD_HELP.priceAdjustment} />
                                            <Input type="number" step="0.01" value={row.priceAdjustment ?? 0} onChange={(event) => patchRow(row, { priceAdjustment: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                          </div>
                                        </div>

                                        <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Laskentakaava</div>
                                          <div className="mt-1 font-medium text-foreground">{formatQuoteRowFormula(row, quoteVatPercent)}</div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Hinnan lähde" help={QUOTE_ROW_FIELD_HELP.pricingModel} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{ROW_PRICE_SOURCE_LABELS[priceSource]}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Veroton summa" help={QUOTE_ROW_FIELD_HELP.netTotal} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.netTotal)}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label={quoteVatLabel} help={QUOTE_ROW_FIELD_HELP.vatAmount} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.vatAmount)}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Verollinen summa" help={QUOTE_ROW_FIELD_HELP.grossTotal} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.grossTotal)}</div>
                                          </div>
                                        </div>
                                      </div>

                                      {canTrackInternalCosts && (
                                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
                                          <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <div className="text-sm font-medium text-slate-950">Sisäinen kustannus- ja kateseuranta</div>
                                              <VisibilityBadge tone="internal" label="Valinnainen sisäinen seuranta" />
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              Täytä sisäiset kustannukset, jos haluat nähdä toteutuvan katteen myös manuaalisella asiakashinnalla.
                                            </p>
                                          </div>

                                          {!rowCalculation.hasInternalCostBasis && (
                                            <Alert>
                                              <AlertDescription>
                                                Täytä ostohinta tai asennuksen taustahinta, jos haluat toteutuvan katteen näkyviin.
                                              </AlertDescription>
                                            </Alert>
                                          )}

                                          <div className="rounded-xl border bg-white/80 px-4 py-3 text-sm">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Sisäisen kustannuksen kaava</div>
                                            <div className="mt-1 font-medium text-foreground">{formatInternalCostFormula(row)}</div>
                                          </div>

                                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Ostohinta / yksikkö" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                              <Input type="number" min="0" step="0.01" value={row.purchasePrice} onChange={(event) => patchRow(row, { purchasePrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Aluekerroin" help={QUOTE_ROW_FIELD_HELP.regionMultiplier} />
                                              <Input type="number" min="0" step="0.01" value={row.regionMultiplier} onChange={(event) => patchRow(row, { regionMultiplier: parseFloat(event.target.value) || 1 })} disabled={!isEditable} />
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Sisäinen yksikkökustannus" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalInternalUnitCostLabel}</div>
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Sisäinen rivikustannus" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalInternalRowCostLabel}</div>
                                            </div>
                                          </div>

                                          {showInstallationDefaults ? (
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
                                                <FieldHelpLabel label="Asennuksen taustahinta / yks." help={QUOTE_ROW_FIELD_HELP.installationPrice} />
                                                <Input type="number" min="0" step="0.01" value={row.installationPrice} onChange={(event) => patchRow(row, { installationPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                              </div>
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Todellinen kate" help={QUOTE_ROW_FIELD_HELP.marginAmount} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginAmountLabel}</div>
                                              </div>
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Kate % toteuma" help={QUOTE_ROW_FIELD_HELP.realizedMarginPercent} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginPercentLabel}</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Todellinen kate" help={QUOTE_ROW_FIELD_HELP.marginAmount} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginAmountLabel}</div>
                                              </div>
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Kate % toteuma" help={QUOTE_ROW_FIELD_HELP.realizedMarginPercent} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginPercentLabel}</div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {isLineTotalWorkflow && (
                                    <>
                                      <div className="rounded-xl border bg-background p-4 space-y-4">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-medium">Rivin kokonaishinta asiakkaalle</div>
                                            <VisibilityBadge tone="customer" label="Syötetään verottomana kokonaissummana" />
                                            <VisibilityBadge tone="derived" label="Yksikköhinta johdetaan automaattisesti" />
                                          </div>
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            Järjestelmä johtaa tästä rivin yksikköhinnan vain apuarvoksi.
                                          </p>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Rivin kokonaishinta, veroton" help={QUOTE_ROW_FIELD_HELP.lineTotal} />
                                            <Input type="number" min="0" step="0.01" value={pricingDetails.enteredLineTotal ?? 0} onChange={(event) => patchRow(row, { overridePrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Lisä / alennus, veroton" help={QUOTE_ROW_FIELD_HELP.priceAdjustment} />
                                            <Input type="number" step="0.01" value={row.priceAdjustment ?? 0} onChange={(event) => patchRow(row, { priceAdjustment: parseFloat(event.target.value) || 0 })} disabled={!isEditable} />
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Johdettu yksikköhinta" help={QUOTE_ROW_FIELD_HELP.derivedUnitPrice} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.derivedUnitPrice)} / {row.unit}</div>
                                          </div>
                                        </div>

                                        <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Laskentakaava</div>
                                          <div className="mt-1 font-medium text-foreground">{formatQuoteRowFormula(row, quote.vatPercent)}</div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Hinnan lähde" help={QUOTE_ROW_FIELD_HELP.pricingModel} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{ROW_PRICE_SOURCE_LABELS[priceSource]}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Veroton summa" help={QUOTE_ROW_FIELD_HELP.netTotal} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.netTotal)}</div>
                                          </div>
                                          <div className="space-y-2">
                                              <FieldHelpLabel label={quoteVatLabel} help={QUOTE_ROW_FIELD_HELP.vatAmount} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.vatAmount)}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldHelpLabel label="Verollinen summa" help={QUOTE_ROW_FIELD_HELP.grossTotal} />
                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formatCurrency(pricingDetails.grossTotal)}</div>
                                          </div>
                                        </div>
                                      </div>

                                      {canTrackInternalCosts && (
                                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
                                          <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <div className="text-sm font-medium text-slate-950">Sisäinen kustannus- ja kateseuranta</div>
                                              <VisibilityBadge tone="internal" label="Valinnainen sisäinen seuranta" />
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              Täytä sisäiset kustannukset, jos haluat nähdä toteutuvan katteen myös kokonaishintarivillä.
                                            </p>
                                          </div>

                                          {!rowCalculation.hasInternalCostBasis && (
                                            <Alert>
                                              <AlertDescription>
                                                Täytä ostohinta tai asennuksen taustahinta, jos haluat toteutuvan katteen näkyviin.
                                              </AlertDescription>
                                            </Alert>
                                          )}

                                          <div className="rounded-xl border bg-white/80 px-4 py-3 text-sm">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Sisäisen kustannuksen kaava</div>
                                            <div className="mt-1 font-medium text-foreground">{formatInternalCostFormula(row)}</div>
                                          </div>

                                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Ostohinta / yksikkö" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                              <Input type="number" min="0" step="0.01" value={row.purchasePrice} onChange={(event) => patchRow(row, { purchasePrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Aluekerroin" help={QUOTE_ROW_FIELD_HELP.regionMultiplier} />
                                              <Input type="number" min="0" step="0.01" value={row.regionMultiplier} onChange={(event) => patchRow(row, { regionMultiplier: parseFloat(event.target.value) || 1 })} disabled={!isEditable} />
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Sisäinen yksikkökustannus" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalInternalUnitCostLabel}</div>
                                            </div>
                                            <div className="space-y-2">
                                              <FieldHelpLabel label="Sisäinen rivikustannus" help={QUOTE_ROW_FIELD_HELP.purchasePrice} />
                                              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalInternalRowCostLabel}</div>
                                            </div>
                                          </div>

                                          {showInstallationDefaults ? (
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
                                                <FieldHelpLabel label="Asennuksen taustahinta / yks." help={QUOTE_ROW_FIELD_HELP.installationPrice} />
                                                <Input type="number" min="0" step="0.01" value={row.installationPrice} onChange={(event) => patchRow(row, { installationPrice: parseFloat(event.target.value) || 0 })} disabled={!isEditable || row.mode === 'charge'} />
                                              </div>
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Todellinen kate" help={QUOTE_ROW_FIELD_HELP.marginAmount} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginAmountLabel}</div>
                                              </div>
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Kate % toteuma" help={QUOTE_ROW_FIELD_HELP.realizedMarginPercent} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginPercentLabel}</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Todellinen kate" help={QUOTE_ROW_FIELD_HELP.marginAmount} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginAmountLabel}</div>
                                              </div>
                                              <div className="space-y-2">
                                                <FieldHelpLabel label="Kate % toteuma" help={QUOTE_ROW_FIELD_HELP.realizedMarginPercent} />
                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{optionalMarginPercentLabel}</div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
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
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
              </QuoteEditorSection>

              <QuoteEditorSection
                step={costsStep}
                stepNumber={3}
                active={activeStep === 'costs'}
                onSelect={() => setActiveStep('costs')}
                badges={(
                  <>
                    <VisibilityBadge tone="optional" />
                    <VisibilityBadge tone="customer" label="Näkyvät asiakkaalle erillisinä erinä" />
                  </>
                )}
                footer={renderSectionFooter('costs', 'Viimeistele ehdot ja huomiot')}
              >
                <AdditionalCostsSection
                  quote={quote}
                  total={calculation.extraChargesTotal}
                  travelCosts={travelCosts}
                  open={additionalCostsOpen}
                  isEditable={isEditable}
                  onOpenChange={setAdditionalCostsOpen}
                  onUpdateQuote={updateQuote}
                  fieldHelp={QUOTE_FIELD_HELP}
                  hasPotentialDoubleInstallationCharge={hasPotentialDoubleInstallationCharge}
                />
              </QuoteEditorSection>

              <QuoteEditorSection
                step={finishingStep}
                stepNumber={4}
                active={activeStep === 'finishing'}
                onSelect={() => setActiveStep('finishing')}
                badges={(
                  <>
                    <VisibilityBadge tone="customer" label="Ehdot, aikataulu ja asiakasviesti näkyvät asiakkaalle" />
                    <VisibilityBadge tone="internal" label="Sisäiset muistiot pysyvät erillään" />
                  </>
                )}
                footer={renderSectionFooter('finishing', 'Tarkista lähetysvalmius')}
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Ehtopohja ja tarjouksen ehtoteksti</h4>
                      <VisibilityBadge tone="customer" label="Tulostuu asiakkaalle" />
                      <HelpTooltip
                        label="Ehtoteksti"
                        help="Valittu ehtopohja tallentuu tarjoukselle snapshot-muotoon. Voit muokata tätä tarjouksen versiota vapaasti ilman, että alkuperäinen ehtopohja muuttuu."
                      />
                    </div>
                    <div className="mt-4 space-y-4">
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
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Aikataulu ja määräajat</h4>
                      <VisibilityBadge tone="customer" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Lisää aloitus, toimitus, määräaika tai valmistuminen tähän vaiheeseen. Tiedot näkyvät myös asiakkaan dokumenteissa.
                    </p>
                    <div className="mt-4">
                      <ScheduleSection milestones={quote.scheduleMilestones || []} onChange={(scheduleMilestones) => updateQuote(quote.id, { scheduleMilestones })} disabled={!isEditable} />
                    </div>
                  </div>
                </div>

                <QuoteNotesPanels
                  quote={quote}
                  isEditable={isEditable}
                  onUpdateField={updateManagedQuoteField}
                  fieldHelp={{ notes: QUOTE_FIELD_HELP.notes, internalNotes: QUOTE_FIELD_HELP.internalNotes }}
                  managedTargets={quoteTenderManagedFieldTargets}
                  managedUnlockState={{
                    notes: Boolean(
                      quoteTenderManagedFieldTargets.notes.unlock_key
                        && managedEditUnlockKeySet.has(quoteTenderManagedFieldTargets.notes.unlock_key),
                    ),
                    internalNotes: Boolean(
                      quoteTenderManagedFieldTargets.internalNotes.unlock_key
                        && managedEditUnlockKeySet.has(quoteTenderManagedFieldTargets.internalNotes.unlock_key),
                    ),
                  }}
                />

                {quoteTerms && resolvedQuoteTermsContent && (
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Esikatselu asiakkaalle näkyvästä ehtotekstistä</h4>
                      <VisibilityBadge tone="customer" />
                    </div>
                    <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                      {resolvedQuoteTermsContent}
                    </div>
                  </div>
                )}
              </QuoteEditorSection>

              <QuoteEditorSection
                step={reviewStep}
                stepNumber={5}
                active={activeStep === 'review'}
                onSelect={() => setActiveStep('review')}
                badges={(
                  <>
                    <VisibilityBadge tone="derived" label="Yhteenveto perustuu koko tarjoukseen" />
                    <VisibilityBadge tone="customer" label="Tarkista asiakkaalle lähtevä sisältö" />
                    <VisibilityBadge tone="internal" label="Varmista myös sisäinen kate" />
                  </>
                )}
                footer={renderSectionFooter('review')}
              >
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Lähetysvalmius</h4>
                      <VisibilityBadge tone="derived" label="Perustuu validointiin" />
                    </div>
                    <div className="mt-4 space-y-4">
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
                        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                          <Warning className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium">Tarkista vielä nämä varoitukset:</div>
                            <ul className="mt-2 list-disc pl-5">
                              {validation.warnings.map((warning) => <li key={warning.field}>{warning.message}</li>)}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                      {validation.errors.length === 0 && validation.warnings.length === 0 && (
                        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
                          <CheckCircle className="h-4 w-4" weight="fill" />
                          <AlertDescription>
                            Tarjous näyttää olevan valmis lähetettäväksi ilman estäviä puutteita tai varoituksia.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={() => attemptManagedAction('Lähetyksen tarkistus', () => setValidationOpen(true), { allowWarningWithoutConfirmation: true })} disabled={!validation.isValid}>
                          <PaperPlaneTilt className="h-4 w-4" />
                          Tarkista ja lähetä tarjous
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setActiveStep('rows')}>
                          Palaa riveihin
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">Mitä eri vientiversiot sisältävät?</h4>
                      <HelpTooltip
                        label="Vientiversiot"
                        help="Asiakasversiot näyttävät vain asiakkaalle tarkoitetut tiedot. Sisäiset viennit sisältävät lisäksi ostohinnan, toteutuneen katteen ja sisäiset muistiinpanot."
                      />
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-950">Asiakasversio</h5>
                          <VisibilityBadge tone="customer" />
                        </div>
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-sky-950/90">
                          <li>Tarjousrivit ja asiakkaalle näkyvät hinnat</li>
                          <li>Lisäkulut, alennus, ALV ja loppusumma</li>
                          <li>Aikataulu, ehtoteksti ja tarjoushuomautukset</li>
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-950">Sisäinen versio</h5>
                          <VisibilityBadge tone="internal" />
                        </div>
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-950/90">
                          <li>Ostohinta, sisäinen kustannus ja katetiedot</li>
                          <li>Sisäiset muistiinpanot ja kannattavuuden seuranta</li>
                          <li>Kokonaiskate koko tarjoukselle</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </QuoteEditorSection>
            </div>
            <div className="space-y-6 xl:sticky xl:top-0 self-start">
              <QuoteCompletionChecklist items={quoteCompletionChecklist} onJumpToStep={setActiveStep} />

              <Card className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Tarjouksen yhteenveto</h3>
                  <p className="text-sm text-muted-foreground">Asiakas-, projekti- ja summatiedot yhdellä silmäyksellä ennen vientiä tai lähetystä.</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Asiakas</span><span className="text-right font-medium">{customer.name}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Projekti</span><span className="text-right font-medium">{project.name}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Vastuuhenkilö</span><span className="text-right font-medium">{quoteOwnerLabel}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Voimassa asti</span><span className="text-right font-medium">{quote.validUntil || '-'}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Rivejä</span><span className="text-right font-medium">{billableRowCount}</span></div>
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
                  <div className="flex justify-between"><span>{quoteVatLabel}</span><span className="font-medium">{formatCurrency(calculation.vat)}</span></div>
                  <div className="flex justify-between border-t pt-3 text-lg font-semibold"><span>Loppusumma</span><span>{formatCurrency(calculation.total)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Kokonaiskate</span><span>{formatCurrency(calculation.totalMargin)} ({formatNumber(calculation.marginPercent, 1)} %)</span></div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Ehdot</div>
                  <div className="mt-2">{quoteTerms ? `${quoteTerms.name} on liitetty tarjoukselle snapshot-muotoisena.` : 'Tarjoukselle ei ole valittu ehtopohjaa.'}</div>
                </div>
                {quote.notes?.trim() && (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium">Asiakasnäkyvät huomautukset</div>
                      <VisibilityBadge tone="customer" />
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes.trim()}</div>
                  </div>
                )}
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
                attemptManagedAction('Tarjouksen lähetys', () => {
                  updateQuoteStatus(quote.id, 'sent');
                  setValidationOpen(false);
                  toast.success('Tarjous merkitty lähetetyksi.');
                }, {
                  confirmLabel: 'Lähetä tästä huolimatta',
                });
              }}
              disabled={!validation.isValid}
            >
              <PaperPlaneTilt className="h-4 w-4" />
              Vahvista lähetys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(managedGuardRequest)} onOpenChange={(open) => !open && closeManagedGuardDialog()}>
        {managedGuardRequest && (
          <DialogContent>
            <QuoteManagedInterceptionDialogContent
              request={managedGuardRequest}
              onClose={closeManagedGuardDialog}
              onConfirm={handleManagedGuardConfirm}
            />
          </DialogContent>
        )}
      </Dialog>

      {selectedInvoiceId && <InvoiceEditor invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />}
    </>
  );
}
