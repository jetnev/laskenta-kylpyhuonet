import { differenceInCalendarDays, endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import { calculateQuote, calculateQuoteRow, getQuoteExtraChargeLines } from './calculations';
import { getInvoiceStatusLabel, invoiceToQuoteLike, isInvoiceOverdue } from './invoices';
import { getResponsibleUserLabel, type OwnershipUserLike } from './ownership';
import type {
  Customer,
  InstallationGroup,
  Invoice,
  Product,
  Project,
  Quote,
  QuoteRow,
  QuoteStatus,
} from './types';

export const REPORT_STATUS_WEIGHTS: Record<QuoteStatus, number> = {
  draft: 0.25,
  sent: 0.6,
  accepted: 1,
  rejected: 0,
};

export type ReportSourceKind = 'families' | 'projects' | 'customers' | 'products' | 'rows';
export type ReportSeverity = 'high' | 'medium' | 'low';
export type ReportActionGroupKey = 'sales' | 'margin' | 'customers' | 'projects' | 'data';
export type ReportBadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

export interface ReportingFilterDraft {
  from?: Date;
  to?: Date;
  ownerUserId?: string | 'all';
  quoteStatus?: QuoteStatus | 'all';
  customerId?: string | 'all';
  projectId?: string | 'all';
  projectStage?: string | 'all';
  installationGroupId?: string | 'all';
}

export interface ReportingFilters {
  from?: Date;
  to?: Date;
  ownerUserId?: string;
  quoteStatus?: QuoteStatus | 'all';
  customerId?: string;
  projectId?: string;
  projectStage?: string;
  installationGroupId?: string;
}

export function resolveReportingFilters(input: {
  filters?: ReportingFilterDraft;
  canManageUsers: boolean;
  currentUserId?: string | null;
}): ReportingFilters {
  const filters = input.filters ?? {};
  const normalized: ReportingFilters = {
    from: filters.from,
    to: filters.to,
  };

  const includeValue = (value?: string | 'all') => {
    if (!value || value === 'all') {
      return undefined;
    }

    return value;
  };

  normalized.ownerUserId = input.canManageUsers
    ? includeValue(filters.ownerUserId)
    : input.currentUserId || undefined;
  normalized.quoteStatus = filters.quoteStatus && filters.quoteStatus !== 'all' ? filters.quoteStatus : undefined;
  normalized.customerId = includeValue(filters.customerId);
  normalized.projectId = includeValue(filters.projectId);
  normalized.projectStage = includeValue(filters.projectStage);
  normalized.installationGroupId = includeValue(filters.installationGroupId);

  return normalized;
}

export interface ReportingInput {
  quotes: Quote[];
  quoteRows: QuoteRow[];
  projects: Project[];
  customers: Customer[];
  invoices: Invoice[];
  products: Product[];
  installationGroups: InstallationGroup[];
  users: OwnershipUserLike[];
  filters?: ReportingFilters;
  now?: Date;
}

export interface ReportRowInsight {
  id: string;
  familyId: string;
  quoteId: string;
  projectId: string;
  projectName: string;
  customerId: string;
  customerName: string;
  ownerUserId?: string | null;
  ownerLabel: string;
  productId?: string;
  productKey: string;
  productName: string;
  productCode?: string;
  categoryName: string;
  installationGroupId?: string;
  installationGroupName: string;
  quantity: number;
  value: number;
  cost: number;
  margin: number;
  marginPercent: number;
  targetMarginPercent: number;
  belowTargetMargin: boolean;
  adjustmentValue: number;
  discountImpact: number;
  purchaseDeltaValue: number;
  manualPricing: boolean;
}

export interface QuoteRevisionSummary {
  id: string;
  quoteNumber: string;
  title: string;
  revisionNumber: number;
  status: QuoteStatus;
  statusLabel: string;
  statusVariant: ReportBadgeVariant;
  createdAt: string;
  updatedAt: string;
  activityAt: string;
  validUntil?: string;
  subtotal: number;
  total: number;
  margin: number;
  marginPercent: number;
  targetMarginPercent: number;
  discountAmount: number;
  extraChargesTotal: number;
  rowCount: number;
}

export interface QuoteFamilySummary {
  id: string;
  projectId: string;
  projectName: string;
  projectSite: string;
  customerId: string;
  customerName: string;
  ownerUserId?: string | null;
  ownerLabel: string;
  latestQuoteId: string;
  latestQuoteNumber: string;
  latestQuoteTitle: string;
  latestRevisionNumber: number;
  latestStatus: QuoteStatus;
  latestStatusLabel: string;
  latestStatusVariant: ReportBadgeVariant;
  revisionCount: number;
  originalQuoteId: string;
  originalQuoteNumber: string;
  originalSubtotal: number;
  originalMarginPercent: number;
  latestSubtotal: number;
  latestMargin: number;
  latestMarginPercent: number;
  marginTargetPercent: number;
  marginGapPercent: number;
  valueDelta: number;
  valueDeltaPercent: number;
  weightedForecast: number;
  isOpen: boolean;
  isDecided: boolean;
  ageDays: number;
  agingBucket: string;
  lastActivityAt: string;
  validUntil?: string;
  expiresInDays: number | null;
  actualValue: number | null;
  actualMargin: number | null;
  actualMarginPercent: number | null;
  quoteToActualDelta: number | null;
  quoteToActualDeltaPercent: number | null;
  actualMarginDeltaPercent: number | null;
  invoiceCount: number;
  invoiceStatusLabels: string[];
  projectStage: string;
  projectStageVariant: ReportBadgeVariant;
  projectRisk: boolean;
  primaryDeviationReason: string;
  belowTargetMargin: boolean;
  hasOwner: boolean;
  revisionImpactLabel: string;
  sourceQuoteIds: string[];
  revisions: QuoteRevisionSummary[];
  rowIds: string[];
}

export interface ReportKpis {
  openQuoteBookValue: number;
  weightedForecastValue: number;
  averageMarginPercent: number;
  acceptanceRatePercent: number;
  staleQuotesCount: number;
  atRiskProjectsCount: number;
}

export interface ReportStatusSummary {
  status: QuoteStatus;
  label: string;
  variant: ReportBadgeVariant;
  count: number;
  value: number;
  weightedForecast: number;
  averageMarginPercent: number;
  sourceIds: string[];
}

export interface ReportAgingSummary {
  bucket: string;
  label: string;
  count: number;
  value: number;
  sourceIds: string[];
}

export interface ReportOwnerSummary {
  ownerUserId: string;
  ownerLabel: string;
  quoteCount: number;
  quoteValue: number;
  acceptanceRatePercent: number;
  averageMarginPercent: number;
  averageQuoteSize: number;
  expiredQuoteCount: number;
  sourceIds: string[];
}

export interface ReportMarginSummary {
  id: string;
  label: string;
  ownerLabel?: string;
  value: number;
  margin: number;
  marginPercent: number;
  belowTargetCount: number;
  sourceIds: string[];
}

export interface ReportLeakageSummary {
  id: string;
  title: string;
  explanation: string;
  impactValue: number;
  occurrenceCount: number;
  severity: ReportSeverity;
  sourceKind: ReportSourceKind;
  sourceIds: string[];
}

export interface ReportCustomerSummary {
  id: string;
  name: string;
  ownerUserId?: string | null;
  ownerLabel: string;
  quoteCount: number;
  decidedCount: number;
  acceptedCount: number;
  acceptedValue: number;
  totalValue: number;
  totalMargin: number;
  marginPercent: number;
  acceptanceRatePercent: number;
  averageRevisionCount: number;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
  profileLabels: string[];
  sourceIds: string[];
}

export interface ReportCustomerOwnerSummary {
  ownerUserId: string;
  ownerLabel: string;
  customerCount: number;
  totalValue: number;
  acceptanceRatePercent: number;
  sourceIds: string[];
}

export interface ReportCustomerConcentration {
  topFiveSharePercent: number;
  topCustomerSharePercent: number;
}

export interface ReportProductSummary {
  id: string;
  productId?: string;
  name: string;
  code: string;
  categoryName: string;
  installationGroupId?: string;
  installationGroupName: string;
  quantity: number;
  value: number;
  cost: number;
  margin: number;
  marginPercent: number;
  discountImpact: number;
  belowTargetCount: number;
  acceptedUsageCount: number;
  acceptedValue: number;
  revisionAddCount: number;
  sourceIds: string[];
  sourceRowIds: string[];
}

export interface ReportGroupSummary {
  id: string;
  label: string;
  value: number;
  margin: number;
  marginPercent: number;
  belowTargetCount: number;
  underTargetSharePercent: number;
  sourceIds: string[];
  sourceRowIds: string[];
}

export interface ReportBasketPair {
  id: string;
  label: string;
  count: number;
  sourceIds: string[];
}

export interface ReportProjectSummary {
  id: string;
  name: string;
  customerName: string;
  ownerUserId?: string | null;
  ownerLabel: string;
  projectStage: string;
  projectStageVariant: ReportBadgeVariant;
  quoteValue: number;
  actualValue: number | null;
  quoteMarginPercent: number;
  actualMarginPercent: number | null;
  quoteToActualDelta: number | null;
  quoteToActualDeltaPercent: number | null;
  actualMarginDeltaPercent: number | null;
  riskFlag: boolean;
  riskReason: string;
  familyCount: number;
  sourceIds: string[];
}

export interface ReportProjectStageSummary {
  stage: string;
  variant: ReportBadgeVariant;
  count: number;
  value: number;
  sourceIds: string[];
}

export interface ReportRevisionDistributionItem {
  bucket: string;
  label: string;
  familyCount: number;
  acceptanceRatePercent: number;
  sourceIds: string[];
}

export interface ReportActionItem {
  id: string;
  group: ReportActionGroupKey;
  title: string;
  description: string;
  severity: ReportSeverity;
  metricLabel: string;
  sourceKind: ReportSourceKind;
  sourceIds: string[];
}

export interface ReportingModel {
  generatedAt: string;
  filters: ReportingFilters;
  meta: {
    totalFamilies: number;
    filteredFamilies: number;
    totalRows: number;
    filteredRows: number;
    hasQuotes: boolean;
    hasInvoices: boolean;
    hasProducts: boolean;
  };
  kpis: ReportKpis;
  families: QuoteFamilySummary[];
  rows: ReportRowInsight[];
  overviewChains: QuoteFamilySummary[];
  statusSummary: ReportStatusSummary[];
  agingSummary: ReportAgingSummary[];
  ownerSummary: ReportOwnerSummary[];
  marginByOwner: ReportMarginSummary[];
  marginByCustomer: ReportMarginSummary[];
  marginByGroup: ReportGroupSummary[];
  leakageSummary: ReportLeakageSummary[];
  lowMarginFamilies: QuoteFamilySummary[];
  revisionImpactFamilies: QuoteFamilySummary[];
  customers: ReportCustomerSummary[];
  dormantCustomers: ReportCustomerSummary[];
  highAcceptanceCustomers: ReportCustomerSummary[];
  revisionHeavyCustomers: ReportCustomerSummary[];
  customerByOwner: ReportCustomerOwnerSummary[];
  customerConcentration: ReportCustomerConcentration;
  products: ReportProductSummary[];
  profitableProducts: ReportProductSummary[];
  weakMarginProducts: ReportProductSummary[];
  discountedProducts: ReportProductSummary[];
  wonProducts: ReportProductSummary[];
  revisionAddedProducts: ReportProductSummary[];
  groupsUnderTarget: ReportGroupSummary[];
  basketPairs: ReportBasketPair[];
  projects: ReportProjectSummary[];
  projectByOwner: ReportOwnerSummary[];
  projectStages: ReportProjectStageSummary[];
  acceptedWithoutActualization: QuoteFamilySummary[];
  revisionDistribution: ReportRevisionDistributionItem[];
  stalledRevisionFamilies: QuoteFamilySummary[];
  actions: Record<ReportActionGroupKey, ReportActionItem[]>;
}

interface RevisionComputation {
  quote: Quote;
  calculation: ReturnType<typeof calculateQuote>;
  rowInsights: ReportRowInsight[];
  activityAt: string;
}

const EMPTY_GROUP = 'Ei hintaryhmää';
const EMPTY_CATEGORY = 'Ei tuoteryhmää';
const OPEN_STATUSES: QuoteStatus[] = ['draft', 'sent'];
const TODAY_WARNING_DAYS = 7;
const STALE_DAYS = 7;
const DORMANT_CUSTOMER_DAYS = 45;

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ratioPercent(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return roundCurrency((numerator / denominator) * 100);
}

function toDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maxDateValue(...values: Array<string | Date | null | undefined>) {
  const timestamps = values
    .map((value) => toDate(value))
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());

  if (timestamps.length === 0) {
    return new Date(0).toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function withinRange(value: string, from?: Date, to?: Date) {
  const date = toDate(value);
  if (!date) {
    return false;
  }

  if (!from && !to) {
    return true;
  }

  return isWithinInterval(date, {
    start: from ? startOfDay(from) : new Date(0),
    end: to ? endOfDay(to) : new Date(8640000000000000),
  });
}

function daysFromNow(value: string | undefined, now: Date) {
  const date = toDate(value);
  if (!date) {
    return null;
  }

  return differenceInCalendarDays(date, now);
}

function ageInDays(value: string, now: Date) {
  const date = toDate(value);
  if (!date) {
    return 0;
  }

  return Math.max(0, differenceInCalendarDays(now, date));
}

function getStatusLabel(status: QuoteStatus) {
  switch (status) {
    case 'accepted':
      return 'Hyväksytty';
    case 'rejected':
      return 'Hylätty';
    case 'sent':
      return 'Lähetetty';
    default:
      return 'Luonnos';
  }
}

function getStatusVariant(status: QuoteStatus): ReportBadgeVariant {
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

function getProjectStageVariant(stage: string): ReportBadgeVariant {
  if (stage === 'Riskissä') {
    return 'destructive';
  }

  if (stage === 'Toteutuksessa' || stage === 'Hyväksytty, odottaa toteumaa') {
    return 'outline';
  }

  if (stage === 'Laskutettu') {
    return 'default';
  }

  return 'secondary';
}

function getAgingBucket(ageDays: number) {
  if (ageDays <= 7) {
    return '0-7';
  }

  if (ageDays <= 14) {
    return '8-14';
  }

  if (ageDays <= 30) {
    return '15-30';
  }

  return '30+';
}

function getAgingLabel(bucket: string) {
  switch (bucket) {
    case '0-7':
      return '0–7 päivää';
    case '8-14':
      return '8–14 päivää';
    case '15-30':
      return '15–30 päivää';
    default:
      return 'Yli 30 päivää';
  }
}

function getRevisionBucket(revisionCount: number) {
  if (revisionCount <= 1) {
    return '1';
  }

  if (revisionCount === 2) {
    return '2';
  }

  if (revisionCount === 3) {
    return '3';
  }

  return '4+';
}

function getRevisionBucketLabel(bucket: string) {
  switch (bucket) {
    case '1':
      return '1 revisio';
    case '2':
      return '2 revisiota';
    case '3':
      return '3 revisiota';
    default:
      return '4+ revisiota';
  }
}

function buildProductKey(row: QuoteRow) {
  return row.productId || row.productCode || row.productName.trim().toLowerCase();
}

function normalizeInstallationGroupId(groupId?: string) {
  return groupId || '__unassigned__';
}

function compareByValueDesc<T extends { value: number; label?: string; name?: string }>(left: T, right: T) {
  const secondaryLeft = left.label || left.name || '';
  const secondaryRight = right.label || right.name || '';
  return right.value - left.value || secondaryLeft.localeCompare(secondaryRight, 'fi');
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function createOwnerSummary(ownerUserId: string, ownerLabel: string): ReportOwnerSummary {
  return {
    ownerUserId,
    ownerLabel,
    quoteCount: 0,
    quoteValue: 0,
    acceptanceRatePercent: 0,
    averageMarginPercent: 0,
    averageQuoteSize: 0,
    expiredQuoteCount: 0,
    sourceIds: [],
  };
}

function filterContextCustomers(customers: Customer[], filters: ReportingFilters) {
  return customers.filter((customer) => {
    if (filters.ownerUserId && customer.ownerUserId !== filters.ownerUserId) {
      return false;
    }

    if (filters.customerId && customer.id !== filters.customerId) {
      return false;
    }

    return true;
  });
}

function deriveProjectStage(input: {
  latestStatus: QuoteStatus;
  invoiceCount: number;
  openInvoiceCount: number;
  paidInvoiceCount: number;
  overdueInvoiceCount: number;
  actualValue: number | null;
}) {
  if (input.overdueInvoiceCount > 0) {
    return 'Riskissä';
  }

  if (input.invoiceCount > 0 && (input.openInvoiceCount > 0 || input.actualValue !== null)) {
    return input.paidInvoiceCount === input.invoiceCount ? 'Laskutettu' : 'Toteutuksessa';
  }

  if (input.latestStatus === 'accepted') {
    return 'Hyväksytty, odottaa toteumaa';
  }

  if (input.latestStatus === 'sent') {
    return 'Tarjous lähetetty';
  }

  if (input.latestStatus === 'draft') {
    return 'Tarjous työn alla';
  }

  return 'Päättynyt';
}

function derivePrimaryDeviationReason(input: {
  latestStatus: QuoteStatus;
  belowTargetMargin: boolean;
  missingOwner: boolean;
  expiresInDays: number | null;
  ageDays: number;
  actualValue: number | null;
  actualMarginPercent: number | null;
  latestSubtotal: number;
  latestMarginPercent: number;
  quoteToActualDeltaPercent: number | null;
  marginDeltaPercent: number | null;
  overdueInvoiceCount: number;
  valueDelta: number;
}) {
  if (input.overdueInvoiceCount > 0) {
    return 'Toteumaa kuormittavat avoimet laskut eräpäivän jälkeen';
  }

  if (input.actualValue !== null && input.quoteToActualDeltaPercent !== null && Math.abs(input.quoteToActualDeltaPercent) >= 10) {
    return input.quoteToActualDeltaPercent > 0
      ? 'Toteuma ylittää tarjotun arvon'
      : 'Toteuma jää tarjotusta arvosta';
  }

  if (input.actualMarginPercent !== null && input.marginDeltaPercent !== null && input.marginDeltaPercent <= -5) {
    return 'Toteutunut kate jää tarjotusta katteesta';
  }

  if (input.latestStatus === 'accepted' && input.actualValue === null) {
    return 'Hyväksytty tarjous odottaa toteumaa';
  }

  if (input.belowTargetMargin) {
    return 'Tarjouskate alittaa tavoitteen';
  }

  if (input.missingOwner) {
    return 'Tarjoukselta puuttuu vastuuhenkilö';
  }

  if (input.expiresInDays !== null && input.expiresInDays >= 0 && input.expiresInDays <= TODAY_WARNING_DAYS) {
    return 'Tarjouksen voimassaolo päättyy pian';
  }

  if (input.ageDays > 30 && OPEN_STATUSES.includes(input.latestStatus)) {
    return 'Tarjous ei ole edennyt yli 30 päivään';
  }

  if (input.valueDelta < 0) {
    return 'Tarjouksen arvo on pienentynyt revisioissa';
  }

  return 'Seurattava tarjousketju';
}

function buildCustomerProfileLabels(summary: {
  averageRevisionCount: number;
  acceptanceRatePercent: number;
  totalValue: number;
  marginPercent: number;
  quoteCount: number;
}, portfolioAverageMarginPercent: number) {
  const labels: string[] = [];

  if (summary.quoteCount >= 2 && summary.acceptanceRatePercent >= 70) {
    labels.push('Korkea hyväksyntä');
  }

  if (summary.quoteCount >= 2 && summary.averageRevisionCount <= 1.5 && summary.acceptanceRatePercent >= 50) {
    labels.push('Nopea ostaja');
  }

  if (summary.averageRevisionCount >= 3) {
    labels.push('Paljon revisioita');
  }

  if (summary.totalValue > 0 && summary.marginPercent < portfolioAverageMarginPercent - 5) {
    labels.push('Korkea arvo / matala kate');
  }

  return labels.slice(0, 2);
}

function getSourceFamilyIds(families: QuoteFamilySummary[]) {
  return families.map((family) => family.id);
}

export function buildReportingModel(input: ReportingInput): ReportingModel {
  const now = input.now ?? new Date();
  const filters = input.filters ?? {};
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const customerById = new Map(input.customers.map((customer) => [customer.id, customer]));
  const productById = new Map(input.products.map((product) => [product.id, product]));
  const groupById = new Map(input.installationGroups.map((group) => [group.id, group]));
  const rowsByQuoteId = new Map<string, QuoteRow[]>();
  const quotesByFamilyId = new Map<string, Quote[]>();
  const invoicesByQuoteId = new Map<string, Invoice[]>();

  input.quoteRows.forEach((row) => {
    const current = rowsByQuoteId.get(row.quoteId) ?? [];
    current.push(row);
    rowsByQuoteId.set(row.quoteId, current);
  });

  input.quotes.forEach((quote) => {
    const familyId = quote.parentQuoteId || quote.id;
    const current = quotesByFamilyId.get(familyId) ?? [];
    current.push(quote);
    quotesByFamilyId.set(familyId, current);
  });

  input.invoices.forEach((invoice) => {
    const current = invoicesByQuoteId.get(invoice.sourceQuoteId) ?? [];
    current.push(invoice);
    invoicesByQuoteId.set(invoice.sourceQuoteId, current);
  });

  const allFamilies = Array.from(quotesByFamilyId.entries())
    .map(([familyId, quotes]) => {
      const revisions: RevisionComputation[] = [...quotes]
        .sort((left, right) =>
          left.revisionNumber - right.revisionNumber ||
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        )
        .map((quote) => {
          const quoteRows = (rowsByQuoteId.get(quote.id) ?? []).filter((row) => row.mode !== 'section');
          const calculation = calculateQuote(quote, rowsByQuoteId.get(quote.id) ?? []);
          const project = projectById.get(quote.projectId);
          const customer = project ? customerById.get(project.customerId) : undefined;
          const ownerUserId = quote.ownerUserId || project?.ownerUserId || customer?.ownerUserId;
          const ownerLabel = getResponsibleUserLabel(ownerUserId, input.users);
          const rowInsights = quoteRows
            .filter((row) => row.mode !== 'charge')
            .map((row) => {
              const product = row.productId ? productById.get(row.productId) : undefined;
              const installationGroupId = row.installationGroupId || product?.installationGroupId;
              const installationGroup = installationGroupId ? groupById.get(installationGroupId) : undefined;
              const rowCalculation = calculateQuoteRow(row);
              const targetMarginPercent =
                product?.defaultMarginPercent ??
                product?.defaultSalesMarginPercent ??
                installationGroup?.defaultMarginPercent ??
                quote.selectedMarginPercent ??
                0;
              const defaultCost = product?.defaultCostPrice ?? product?.purchasePrice ?? row.purchasePrice;
              const purchaseDeltaValue = Math.max(0, row.purchasePrice - defaultCost) * Math.max(0, row.quantity || 0);

              return {
                id: row.id,
                familyId,
                quoteId: quote.id,
                projectId: quote.projectId,
                projectName: project?.name || 'Tuntematon projekti',
                customerId: project?.customerId || '',
                customerName: customer?.name || 'Ei asiakasta',
                ownerUserId,
                ownerLabel,
                productId: row.productId,
                productKey: buildProductKey(row),
                productName: row.productName,
                productCode: row.productCode,
                categoryName: product?.category || installationGroup?.category || EMPTY_CATEGORY,
                installationGroupId,
                installationGroupName: installationGroup?.name || EMPTY_GROUP,
                quantity: row.quantity,
                value: rowCalculation.rowTotal,
                cost: rowCalculation.costTotal,
                margin: rowCalculation.marginAmount,
                marginPercent: rowCalculation.marginPercent,
                targetMarginPercent,
                belowTargetMargin: rowCalculation.rowTotal > 0 && rowCalculation.marginPercent < targetMarginPercent,
                adjustmentValue: roundCurrency(row.priceAdjustment ?? 0),
                discountImpact: Math.abs(Math.min(0, row.priceAdjustment ?? 0)),
                purchaseDeltaValue: roundCurrency(purchaseDeltaValue),
                manualPricing: Boolean(row.manualSalesPrice),
              } satisfies ReportRowInsight;
            });

          return {
            quote,
            calculation,
            rowInsights,
            activityAt: maxDateValue(
              quote.lastAutoSavedAt,
              quote.acceptedAt,
              quote.sentAt,
              quote.rejectedAt,
              quote.updatedAt,
              quote.createdAt
            ),
          };
        });

      const latestRevision = revisions[revisions.length - 1];
      const originalRevision = revisions[0];
      if (!latestRevision || !originalRevision) {
        return null;
      }

      const latestQuote = latestRevision.quote;
      const project = projectById.get(latestQuote.projectId);
      const customer = project ? customerById.get(project.customerId) : undefined;
      const ownerUserId = latestQuote.ownerUserId || project?.ownerUserId || customer?.ownerUserId;
      const ownerLabel = getResponsibleUserLabel(ownerUserId, input.users);
      const familyInvoices = quotes.flatMap((quote) => invoicesByQuoteId.get(quote.id) ?? []);
      const invoiceSummaries = familyInvoices.map((invoice) => {
        const calculation = calculateQuote(invoiceToQuoteLike(invoice), invoice.rows);
        return {
          invoice,
          calculation,
          overdue: isInvoiceOverdue(invoice),
        };
      });
      const actualValue = invoiceSummaries.length > 0
        ? roundCurrency(invoiceSummaries.reduce((sum, item) => sum + item.calculation.subtotal, 0))
        : null;
      const actualMargin = invoiceSummaries.length > 0
        ? roundCurrency(invoiceSummaries.reduce((sum, item) => sum + item.calculation.totalMargin, 0))
        : null;
      const actualMarginPercent = actualValue && actualMargin !== null ? ratioPercent(actualMargin, actualValue) : null;
      const quoteToActualDelta = actualValue !== null ? roundCurrency(actualValue - latestRevision.calculation.subtotal) : null;
      const quoteToActualDeltaPercent =
        actualValue !== null && latestRevision.calculation.subtotal > 0
          ? ratioPercent(actualValue - latestRevision.calculation.subtotal, latestRevision.calculation.subtotal)
          : null;
      const actualMarginDeltaPercent =
        actualMarginPercent !== null
          ? roundCurrency(actualMarginPercent - latestRevision.calculation.marginPercent)
          : null;
      const expiresInDays = daysFromNow(latestQuote.validUntil, now);
      const ageDays = ageInDays(latestRevision.activityAt, now);
      const openInvoiceCount = invoiceSummaries.filter((item) => item.invoice.status === 'draft' || item.invoice.status === 'issued').length;
      const paidInvoiceCount = invoiceSummaries.filter((item) => item.invoice.status === 'paid').length;
      const overdueInvoiceCount = invoiceSummaries.filter((item) => item.overdue).length;
      const marginTargetPercent = latestQuote.selectedMarginPercent ?? 0;
      const belowTargetMargin = latestRevision.calculation.subtotal > 0 && latestRevision.calculation.marginPercent < marginTargetPercent;
      const projectStage = deriveProjectStage({
        latestStatus: latestQuote.status,
        invoiceCount: invoiceSummaries.length,
        openInvoiceCount,
        paidInvoiceCount,
        overdueInvoiceCount,
        actualValue,
      });
      const projectRisk =
        overdueInvoiceCount > 0 ||
        (quoteToActualDeltaPercent !== null && Math.abs(quoteToActualDeltaPercent) >= 10) ||
        (actualMarginDeltaPercent !== null && actualMarginDeltaPercent <= -5) ||
        (latestQuote.status === 'accepted' && invoiceSummaries.length === 0 && ageDays > 14);
      const valueDelta = roundCurrency(latestRevision.calculation.subtotal - originalRevision.calculation.subtotal);
      const valueDeltaPercent =
        originalRevision.calculation.subtotal > 0
          ? ratioPercent(latestRevision.calculation.subtotal - originalRevision.calculation.subtotal, originalRevision.calculation.subtotal)
          : 0;
      const allRowIds = uniqueStrings(revisions.flatMap((revision) => revision.rowInsights.map((row) => row.id)));
      const latestStatusLabel = getStatusLabel(latestQuote.status);
      const latestStatusVariant = getStatusVariant(latestQuote.status);

      return {
        id: familyId,
        projectId: latestQuote.projectId,
        projectName: project?.name || 'Tuntematon projekti',
        projectSite: project?.site || '-',
        customerId: project?.customerId || '',
        customerName: customer?.name || 'Ei asiakasta',
        ownerUserId,
        ownerLabel,
        latestQuoteId: latestQuote.id,
        latestQuoteNumber: latestQuote.quoteNumber,
        latestQuoteTitle: latestQuote.title,
        latestRevisionNumber: latestQuote.revisionNumber,
        latestStatus: latestQuote.status,
        latestStatusLabel,
        latestStatusVariant,
        revisionCount: revisions.length,
        originalQuoteId: originalRevision.quote.id,
        originalQuoteNumber: originalRevision.quote.quoteNumber,
        originalSubtotal: originalRevision.calculation.subtotal,
        originalMarginPercent: originalRevision.calculation.marginPercent,
        latestSubtotal: latestRevision.calculation.subtotal,
        latestMargin: latestRevision.calculation.totalMargin,
        latestMarginPercent: latestRevision.calculation.marginPercent,
        marginTargetPercent,
        marginGapPercent: roundCurrency(latestRevision.calculation.marginPercent - marginTargetPercent),
        valueDelta,
        valueDeltaPercent,
        weightedForecast: roundCurrency(latestRevision.calculation.subtotal * REPORT_STATUS_WEIGHTS[latestQuote.status]),
        isOpen: OPEN_STATUSES.includes(latestQuote.status),
        isDecided: latestQuote.status === 'accepted' || latestQuote.status === 'rejected',
        ageDays,
        agingBucket: getAgingBucket(ageDays),
        lastActivityAt: maxDateValue(latestRevision.activityAt, ...invoiceSummaries.map((item) => item.invoice.updatedAt || item.invoice.issueDate)),
        validUntil: latestQuote.validUntil,
        expiresInDays,
        actualValue,
        actualMargin,
        actualMarginPercent,
        quoteToActualDelta,
        quoteToActualDeltaPercent,
        actualMarginDeltaPercent,
        invoiceCount: invoiceSummaries.length,
        invoiceStatusLabels: uniqueStrings(invoiceSummaries.map((item) => getInvoiceStatusLabel(item.invoice.status))),
        projectStage,
        projectStageVariant: getProjectStageVariant(projectStage),
        projectRisk,
        primaryDeviationReason: derivePrimaryDeviationReason({
          latestStatus: latestQuote.status,
          belowTargetMargin,
          missingOwner: !ownerUserId,
          expiresInDays,
          ageDays,
          actualValue,
          actualMarginPercent,
          latestSubtotal: latestRevision.calculation.subtotal,
          latestMarginPercent: latestRevision.calculation.marginPercent,
          quoteToActualDeltaPercent,
          marginDeltaPercent: actualMarginDeltaPercent,
          overdueInvoiceCount,
          valueDelta,
        }),
        belowTargetMargin,
        hasOwner: Boolean(ownerUserId),
        revisionImpactLabel:
          revisions.length > 1
            ? valueDelta >= 0
              ? 'Revisiot kasvattivat arvoa'
              : 'Revisiot pienensivät arvoa'
            : 'Ei revisiomuutosta',
        sourceQuoteIds: quotes.map((quote) => quote.id),
        revisions: revisions.map((revision) => ({
          id: revision.quote.id,
          quoteNumber: revision.quote.quoteNumber,
          title: revision.quote.title,
          revisionNumber: revision.quote.revisionNumber,
          status: revision.quote.status,
          statusLabel: getStatusLabel(revision.quote.status),
          statusVariant: getStatusVariant(revision.quote.status),
          createdAt: revision.quote.createdAt,
          updatedAt: revision.quote.updatedAt,
          activityAt: revision.activityAt,
          validUntil: revision.quote.validUntil,
          subtotal: revision.calculation.subtotal,
          total: revision.calculation.total,
          margin: revision.calculation.totalMargin,
          marginPercent: revision.calculation.marginPercent,
          targetMarginPercent: revision.quote.selectedMarginPercent ?? 0,
          discountAmount: revision.calculation.discountAmount,
          extraChargesTotal: getQuoteExtraChargeLines(revision.quote).reduce((sum, charge) => sum + charge.amount, 0),
          rowCount: revision.rowInsights.length,
        })),
        rowIds: allRowIds,
      } satisfies QuoteFamilySummary;
    })
    .filter((f) => f !== null) as QuoteFamilySummary[];

  allFamilies.sort((left, right) => {
      const riskWeight = Number(right.projectRisk) - Number(left.projectRisk);
      if (riskWeight !== 0) {
        return riskWeight;
      }

      return new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
    });

  const latestRows = allFamilies.flatMap((family) => {
    const latestRevision = family.revisions[family.revisions.length - 1];
    const rawRows = rowsByQuoteId.get(latestRevision.id) ?? [];
    return rawRows
      .filter((row) => row.mode !== 'section' && row.mode !== 'charge')
      .map((row) => {
        const product = row.productId ? productById.get(row.productId) : undefined;
        const installationGroupId = row.installationGroupId || product?.installationGroupId;
        const installationGroup = installationGroupId ? groupById.get(installationGroupId) : undefined;
        const rowCalculation = calculateQuoteRow(row);
        const targetMarginPercent =
          product?.defaultMarginPercent ??
          product?.defaultSalesMarginPercent ??
          installationGroup?.defaultMarginPercent ??
          family.marginTargetPercent;
        const defaultCost = product?.defaultCostPrice ?? product?.purchasePrice ?? row.purchasePrice;
        const purchaseDeltaValue = Math.max(0, row.purchasePrice - defaultCost) * Math.max(0, row.quantity || 0);

        return {
          id: row.id,
          familyId: family.id,
          quoteId: latestRevision.id,
          projectId: family.projectId,
          projectName: family.projectName,
          customerId: family.customerId,
          customerName: family.customerName,
          ownerUserId: family.ownerUserId,
          ownerLabel: family.ownerLabel,
          productId: row.productId,
          productKey: buildProductKey(row),
          productName: row.productName,
          productCode: row.productCode,
          categoryName: product?.category || installationGroup?.category || EMPTY_CATEGORY,
          installationGroupId,
          installationGroupName: installationGroup?.name || EMPTY_GROUP,
          quantity: row.quantity,
          value: rowCalculation.rowTotal,
          cost: rowCalculation.costTotal,
          margin: rowCalculation.marginAmount,
          marginPercent: rowCalculation.marginPercent,
          targetMarginPercent,
          belowTargetMargin: rowCalculation.rowTotal > 0 && rowCalculation.marginPercent < targetMarginPercent,
          adjustmentValue: roundCurrency(row.priceAdjustment ?? 0),
          discountImpact: Math.abs(Math.min(0, row.priceAdjustment ?? 0)),
          purchaseDeltaValue: roundCurrency(purchaseDeltaValue),
          manualPricing: Boolean(row.manualSalesPrice),
        } satisfies ReportRowInsight;
      });
  });

  const familyMatchesFilters = (family: QuoteFamilySummary) => {
    if (filters.ownerUserId && family.ownerUserId !== filters.ownerUserId) {
      return false;
    }

    if (filters.quoteStatus && filters.quoteStatus !== 'all' && family.latestStatus !== filters.quoteStatus) {
      return false;
    }

    if (filters.customerId && family.customerId !== filters.customerId) {
      return false;
    }

    if (filters.projectId && family.projectId !== filters.projectId) {
      return false;
    }

    if (filters.projectStage && family.projectStage !== filters.projectStage) {
      return false;
    }

    if (filters.installationGroupId) {
      const hasGroup = latestRows.some(
        (row) =>
          row.familyId === family.id &&
          normalizeInstallationGroupId(row.installationGroupId) === normalizeInstallationGroupId(filters.installationGroupId)
      );

      if (!hasGroup) {
        return false;
      }
    }

    if ((filters.from || filters.to) && !withinRange(family.lastActivityAt, filters.from, filters.to)) {
      return false;
    }

    return true;
  };

  const filteredFamilies = allFamilies.filter(familyMatchesFilters);
  const filteredFamilyIds = new Set(filteredFamilies.map((family) => family.id));
  const filteredRows = latestRows.filter((row) => filteredFamilyIds.has(row.familyId));
  const familiesById = new Map(filteredFamilies.map((family) => [family.id, family]));

  const kpis: ReportKpis = {
    openQuoteBookValue: roundCurrency(
      filteredFamilies.filter((family) => family.isOpen).reduce((sum, family) => sum + family.latestSubtotal, 0)
    ),
    weightedForecastValue: roundCurrency(
      filteredFamilies.reduce((sum, family) => sum + family.weightedForecast, 0)
    ),
    averageMarginPercent: ratioPercent(
      filteredFamilies.reduce((sum, family) => sum + family.latestMargin, 0),
      filteredFamilies.reduce((sum, family) => sum + family.latestSubtotal, 0)
    ),
    acceptanceRatePercent: ratioPercent(
      filteredFamilies.filter((family) => family.latestStatus === 'accepted').length,
      filteredFamilies.filter((family) => family.isDecided).length
    ),
    staleQuotesCount: filteredFamilies.filter((family) => family.isOpen && family.ageDays > STALE_DAYS).length,
    atRiskProjectsCount: new Set(filteredFamilies.filter((family) => family.projectRisk).map((family) => family.projectId)).size,
  };

  const statusSummary: ReportStatusSummary[] = (['draft', 'sent', 'accepted', 'rejected'] as QuoteStatus[])
    .map((status) => {
      const families = filteredFamilies.filter((family) => family.latestStatus === status);
      return {
        status,
        label: getStatusLabel(status),
        variant: getStatusVariant(status),
        count: families.length,
        value: roundCurrency(families.reduce((sum, family) => sum + family.latestSubtotal, 0)),
        weightedForecast: roundCurrency(families.reduce((sum, family) => sum + family.weightedForecast, 0)),
        averageMarginPercent: ratioPercent(
          families.reduce((sum, family) => sum + family.latestMargin, 0),
          families.reduce((sum, family) => sum + family.latestSubtotal, 0)
        ),
        sourceIds: getSourceFamilyIds(families),
      } satisfies ReportStatusSummary;
    });

  const agingSummary: ReportAgingSummary[] = ['0-7', '8-14', '15-30', '30+'].map((bucket) => {
    const families = filteredFamilies.filter((family) => family.isOpen && family.agingBucket === bucket);
    return {
      bucket,
      label: getAgingLabel(bucket),
      count: families.length,
      value: roundCurrency(families.reduce((sum, family) => sum + family.latestSubtotal, 0)),
      sourceIds: getSourceFamilyIds(families),
    } satisfies ReportAgingSummary;
  });

  const ownerSummaryMap = new Map<string, ReportOwnerSummary>();
  filteredFamilies.forEach((family) => {
    const ownerKey = family.ownerUserId || '__unassigned__';
    const summary = ownerSummaryMap.get(ownerKey) ?? createOwnerSummary(ownerKey, family.ownerLabel);
    summary.quoteCount += 1;
    summary.quoteValue = roundCurrency(summary.quoteValue + family.latestSubtotal);
    summary.expiredQuoteCount += Number(Boolean(family.isOpen && family.expiresInDays !== null && family.expiresInDays < 0));
    summary.sourceIds = uniqueStrings([...summary.sourceIds, family.id]);
    ownerSummaryMap.set(ownerKey, summary);
  });

  const ownerSummary = Array.from(ownerSummaryMap.values())
    .map((summary) => {
      const families = summary.sourceIds.map((id) => familiesById.get(id)).filter((family): family is QuoteFamilySummary => Boolean(family));
      return {
        ...summary,
        acceptanceRatePercent: ratioPercent(
          families.filter((family) => family.latestStatus === 'accepted').length,
          families.filter((family) => family.isDecided).length
        ),
        averageMarginPercent: ratioPercent(
          families.reduce((sum, family) => sum + family.latestMargin, 0),
          families.reduce((sum, family) => sum + family.latestSubtotal, 0)
        ),
        averageQuoteSize: families.length > 0 ? roundCurrency(summary.quoteValue / families.length) : 0,
      } satisfies ReportOwnerSummary;
    })
    .sort((left, right) => right.quoteValue - left.quoteValue || left.ownerLabel.localeCompare(right.ownerLabel, 'fi'));

  const marginByOwner: ReportMarginSummary[] = ownerSummary.map((summary) => ({
    id: summary.ownerUserId,
    label: summary.ownerLabel,
    value: summary.quoteValue,
    margin: roundCurrency(
      summary.sourceIds
        .map((id) => familiesById.get(id))
        .filter((family): family is QuoteFamilySummary => Boolean(family))
        .reduce((sum, family) => sum + family.latestMargin, 0)
    ),
    marginPercent: summary.averageMarginPercent,
    belowTargetCount: summary.sourceIds
      .map((id) => familiesById.get(id))
      .filter((family): family is QuoteFamilySummary => Boolean(family))
      .filter((family) => family.belowTargetMargin).length,
    sourceIds: summary.sourceIds,
  }));

  const customerSummaryMap = new Map<string, ReportCustomerSummary>();
  filteredFamilies.forEach((family) => {
    const summary = customerSummaryMap.get(family.customerId) ?? {
      id: family.customerId,
      name: family.customerName,
      ownerUserId: family.ownerUserId,
      ownerLabel: family.ownerLabel,
      quoteCount: 0,
      decidedCount: 0,
      acceptedCount: 0,
      acceptedValue: 0,
      totalValue: 0,
      totalMargin: 0,
      marginPercent: 0,
      acceptanceRatePercent: 0,
      averageRevisionCount: 0,
      lastActivityAt: null,
      daysSinceActivity: null,
      profileLabels: [],
      sourceIds: [],
    } satisfies ReportCustomerSummary;

    summary.quoteCount += 1;
    summary.decidedCount += Number(family.isDecided);
    summary.acceptedCount += Number(family.latestStatus === 'accepted');
    summary.acceptedValue = roundCurrency(summary.acceptedValue + (family.latestStatus === 'accepted' ? family.latestSubtotal : 0));
    summary.totalValue = roundCurrency(summary.totalValue + family.latestSubtotal);
    summary.totalMargin = roundCurrency(summary.totalMargin + family.latestMargin);
    summary.averageRevisionCount = roundCurrency(((summary.averageRevisionCount * (summary.quoteCount - 1)) + family.revisionCount) / summary.quoteCount);
    summary.lastActivityAt = maxDateValue(summary.lastActivityAt, family.lastActivityAt);
    summary.sourceIds = uniqueStrings([...summary.sourceIds, family.id]);
    customerSummaryMap.set(family.customerId, summary);
  });

  const customerPortfolio = Array.from(customerSummaryMap.values())
    .map((summary) => {
      const marginPercent = ratioPercent(summary.totalMargin, summary.totalValue);
      const lastActivityAt = summary.lastActivityAt;
      const daysSinceActivity = lastActivityAt ? ageInDays(lastActivityAt, now) : null;
      return {
        ...summary,
        marginPercent,
        acceptanceRatePercent: ratioPercent(summary.acceptedCount, summary.decidedCount),
        daysSinceActivity,
      } satisfies ReportCustomerSummary;
    })
    .sort((left, right) => right.totalValue - left.totalValue || left.name.localeCompare(right.name, 'fi'));

  const portfolioAverageMarginPercent = ratioPercent(
    customerPortfolio.reduce((sum, customer) => sum + customer.totalMargin, 0),
    customerPortfolio.reduce((sum, customer) => sum + customer.totalValue, 0)
  );

  const customers = customerPortfolio.map((customer) => ({
    ...customer,
    profileLabels: buildCustomerProfileLabels(customer, portfolioAverageMarginPercent),
  }));

  const marginByCustomer: ReportMarginSummary[] = customers
    .map((customer) => ({
      id: customer.id,
      label: customer.name,
      ownerLabel: customer.ownerLabel,
      value: customer.totalValue,
      margin: customer.totalMargin,
      marginPercent: customer.marginPercent,
      belowTargetCount: customer.sourceIds
        .map((id) => familiesById.get(id))
        .filter((family): family is QuoteFamilySummary => Boolean(family))
        .filter((family) => family.belowTargetMargin).length,
      sourceIds: customer.sourceIds,
    }))
    .sort((left, right) => compareByValueDesc(left, right));

  const contextCustomers = filterContextCustomers(input.customers, filters);
  const contextFamilies = allFamilies.filter((family) => {
    if (filters.ownerUserId && family.ownerUserId !== filters.ownerUserId) {
      return false;
    }
    if (filters.customerId && family.customerId !== filters.customerId) {
      return false;
    }
    if (filters.projectId && family.projectId !== filters.projectId) {
      return false;
    }
    if (filters.projectStage && family.projectStage !== filters.projectStage) {
      return false;
    }
    return true;
  });
  const contextCustomerIds = new Set(contextFamilies.map((family) => family.customerId));
  const familyLastActivityByCustomer = new Map<string, string>();
  contextFamilies.forEach((family) => {
    familyLastActivityByCustomer.set(
      family.customerId,
      maxDateValue(familyLastActivityByCustomer.get(family.customerId), family.lastActivityAt)
    );
  });

  const dormantCustomers = contextCustomers
    .filter((customer) => contextCustomerIds.size === 0 || contextCustomerIds.has(customer.id))
    .map((customer) => {
      const lastActivityAt = maxDateValue(familyLastActivityByCustomer.get(customer.id), customer.updatedAt);
      const existingSummary = customers.find((item) => item.id === customer.id);
      return {
        id: customer.id,
        name: customer.name,
        ownerUserId: customer.ownerUserId,
        ownerLabel: getResponsibleUserLabel(customer.ownerUserId, input.users),
        quoteCount: existingSummary?.quoteCount ?? 0,
        decidedCount: existingSummary?.decidedCount ?? 0,
        acceptedCount: existingSummary?.acceptedCount ?? 0,
        acceptedValue: existingSummary?.acceptedValue ?? 0,
        totalValue: existingSummary?.totalValue ?? 0,
        totalMargin: existingSummary?.totalMargin ?? 0,
        marginPercent: existingSummary?.marginPercent ?? 0,
        acceptanceRatePercent: existingSummary?.acceptanceRatePercent ?? 0,
        averageRevisionCount: existingSummary?.averageRevisionCount ?? 0,
        lastActivityAt,
        daysSinceActivity: ageInDays(lastActivityAt, now),
        profileLabels: existingSummary?.profileLabels ?? [],
        sourceIds: existingSummary?.sourceIds ?? [],
      } satisfies ReportCustomerSummary;
    })
    .filter((customer) => customer.daysSinceActivity !== null && customer.daysSinceActivity >= DORMANT_CUSTOMER_DAYS)
    .sort((left, right) => (right.daysSinceActivity ?? 0) - (left.daysSinceActivity ?? 0));

  const highAcceptanceCustomers = customers
    .filter((customer) => customer.decidedCount >= 2 && customer.acceptanceRatePercent >= 60)
    .slice(0, 8);

  const revisionHeavyCustomers = customers
    .filter((customer) => customer.quoteCount >= 2 && customer.averageRevisionCount >= 2.5 && customer.acceptanceRatePercent < 35)
    .sort((left, right) => right.averageRevisionCount - left.averageRevisionCount || left.acceptanceRatePercent - right.acceptanceRatePercent)
    .slice(0, 8);

  const customerOwnerMap = new Map<string, ReportCustomerOwnerSummary>();
  customers.forEach((customer) => {
    const ownerKey = customer.ownerUserId || '__unassigned__';
    const summary = customerOwnerMap.get(ownerKey) ?? {
      ownerUserId: ownerKey,
      ownerLabel: customer.ownerLabel,
      customerCount: 0,
      totalValue: 0,
      acceptanceRatePercent: 0,
      sourceIds: [],
    };
    summary.customerCount += 1;
    summary.totalValue = roundCurrency(summary.totalValue + customer.totalValue);
    summary.sourceIds = uniqueStrings([...summary.sourceIds, customer.id]);
    customerOwnerMap.set(ownerKey, summary);
  });

  const customerByOwner = Array.from(customerOwnerMap.values())
    .map((summary) => {
      const ownerCustomers = customers.filter((customer) => (customer.ownerUserId || '__unassigned__') === summary.ownerUserId);
      return {
        ...summary,
        acceptanceRatePercent: ratioPercent(
          ownerCustomers.reduce((sum, customer) => sum + customer.acceptedCount, 0),
          ownerCustomers.reduce((sum, customer) => sum + customer.decidedCount, 0)
        ),
      } satisfies ReportCustomerOwnerSummary;
    })
    .sort((left, right) => right.totalValue - left.totalValue || left.ownerLabel.localeCompare(right.ownerLabel, 'fi'));

  const totalCustomerValue = customers.reduce((sum, customer) => sum + customer.totalValue, 0);
  const topFiveCustomerValue = customers.slice(0, 5).reduce((sum, customer) => sum + customer.totalValue, 0);
  const topCustomerValue = customers[0]?.totalValue ?? 0;
  const customerConcentration: ReportCustomerConcentration = {
    topFiveSharePercent: ratioPercent(topFiveCustomerValue, totalCustomerValue),
    topCustomerSharePercent: ratioPercent(topCustomerValue, totalCustomerValue),
  };

  const productSummaryMap = new Map<string, ReportProductSummary>();
  filteredRows.forEach((row) => {
    const summary = productSummaryMap.get(row.productKey) ?? {
      id: row.productKey,
      productId: row.productId,
      name: row.productName,
      code: row.productCode || '',
      categoryName: row.categoryName,
      installationGroupId: row.installationGroupId,
      installationGroupName: row.installationGroupName,
      quantity: 0,
      value: 0,
      cost: 0,
      margin: 0,
      marginPercent: 0,
      discountImpact: 0,
      belowTargetCount: 0,
      acceptedUsageCount: 0,
      acceptedValue: 0,
      revisionAddCount: 0,
      sourceIds: [],
      sourceRowIds: [],
    } satisfies ReportProductSummary;
    summary.quantity += row.quantity;
    summary.value = roundCurrency(summary.value + row.value);
    summary.cost = roundCurrency(summary.cost + row.cost);
    summary.margin = roundCurrency(summary.margin + row.margin);
    summary.discountImpact = roundCurrency(summary.discountImpact + row.discountImpact);
    summary.belowTargetCount += Number(row.belowTargetMargin);
    summary.sourceIds = uniqueStrings([...summary.sourceIds, row.familyId]);
    summary.sourceRowIds = uniqueStrings([...summary.sourceRowIds, row.id]);

    const family = familiesById.get(row.familyId);
    if (family?.latestStatus === 'accepted') {
      summary.acceptedUsageCount += 1;
      summary.acceptedValue = roundCurrency(summary.acceptedValue + row.value);
    }

    productSummaryMap.set(row.productKey, summary);
  });

  allFamilies.forEach((family) => {
    if (family.revisions.length < 2) {
      return;
    }

    const seenByRevision = family.revisions.map((revision) => {
      const revisionRows = (rowsByQuoteId.get(revision.id) ?? []).filter((row) => row.mode !== 'section' && row.mode !== 'charge');
      return new Map(revisionRows.map((row) => [buildProductKey(row), row]));
    });

    for (let index = 1; index < seenByRevision.length; index += 1) {
      const previous = seenByRevision[index - 1];
      const current = seenByRevision[index];
      current.forEach((row, key) => {
        if (previous.has(key)) {
          return;
        }

        const summary = productSummaryMap.get(key) ?? {
          id: key,
          productId: row.productId,
          name: row.productName,
          code: row.productCode || '',
          categoryName: EMPTY_CATEGORY,
          installationGroupName: EMPTY_GROUP,
          quantity: 0,
          value: 0,
          cost: 0,
          margin: 0,
          marginPercent: 0,
          discountImpact: 0,
          belowTargetCount: 0,
          acceptedUsageCount: 0,
          acceptedValue: 0,
          revisionAddCount: 0,
          sourceIds: [],
          sourceRowIds: [],
        } satisfies ReportProductSummary;
        summary.revisionAddCount += 1;
        summary.sourceIds = uniqueStrings([...summary.sourceIds, family.id]);
        productSummaryMap.set(key, summary);
      });
    }
  });

  const products = Array.from(productSummaryMap.values())
    .map((product) => ({
      ...product,
      marginPercent: ratioPercent(product.margin, product.value),
    }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'fi'));

  const profitableProducts = [...products]
    .filter((product) => product.value > 0)
    .sort((left, right) => right.margin - left.margin || right.marginPercent - left.marginPercent)
    .slice(0, 10);
  const weakMarginProducts = [...products]
    .filter((product) => product.value > 0)
    .sort((left, right) => left.marginPercent - right.marginPercent || right.value - left.value)
    .slice(0, 10);
  const discountedProducts = [...products]
    .filter((product) => product.discountImpact > 0)
    .sort((left, right) => right.discountImpact - left.discountImpact)
    .slice(0, 10);
  const wonProducts = [...products]
    .filter((product) => product.acceptedUsageCount > 0)
    .sort((left, right) => right.acceptedValue - left.acceptedValue || right.acceptedUsageCount - left.acceptedUsageCount)
    .slice(0, 10);
  const revisionAddedProducts = [...products]
    .filter((product) => product.revisionAddCount > 0)
    .sort((left, right) => right.revisionAddCount - left.revisionAddCount || right.value - left.value)
    .slice(0, 10);

  const groupSummaryMap = new Map<string, ReportGroupSummary>();
  filteredRows.forEach((row) => {
    const groupId = normalizeInstallationGroupId(row.installationGroupId);
    const summary = groupSummaryMap.get(groupId) ?? {
      id: groupId,
      label: row.installationGroupName,
      value: 0,
      margin: 0,
      marginPercent: 0,
      belowTargetCount: 0,
      underTargetSharePercent: 0,
      sourceIds: [],
      sourceRowIds: [],
    } satisfies ReportGroupSummary;
    summary.value = roundCurrency(summary.value + row.value);
    summary.margin = roundCurrency(summary.margin + row.margin);
    summary.belowTargetCount += Number(row.belowTargetMargin);
    summary.sourceIds = uniqueStrings([...summary.sourceIds, row.familyId]);
    summary.sourceRowIds = uniqueStrings([...summary.sourceRowIds, row.id]);
    groupSummaryMap.set(groupId, summary);
  });

  const groupsUnderTarget = Array.from(groupSummaryMap.values())
    .map((group) => {
      const totalRows = filteredRows.filter((row) => normalizeInstallationGroupId(row.installationGroupId) === group.id).length;
      return {
        ...group,
        marginPercent: ratioPercent(group.margin, group.value),
        underTargetSharePercent: ratioPercent(group.belowTargetCount, totalRows),
      } satisfies ReportGroupSummary;
    })
    .sort((left, right) => right.underTargetSharePercent - left.underTargetSharePercent || right.value - left.value);

  const marginByGroup = groupsUnderTarget;

  const basketPairMap = new Map<string, ReportBasketPair>();
  filteredFamilies
    .filter((family) => family.latestStatus === 'accepted')
    .forEach((family) => {
      const keys = uniqueStrings(
        filteredRows
          .filter((row) => row.familyId === family.id)
          .map((row) => row.productKey)
      ).sort((left, right) => left.localeCompare(right, 'fi'));

      for (let leftIndex = 0; leftIndex < keys.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < keys.length; rightIndex += 1) {
          const leftProduct = products.find((product) => product.id === keys[leftIndex]);
          const rightProduct = products.find((product) => product.id === keys[rightIndex]);
          const id = `${keys[leftIndex]}::${keys[rightIndex]}`;
          const summary = basketPairMap.get(id) ?? {
            id,
            label: `${leftProduct?.name || keys[leftIndex]} + ${rightProduct?.name || keys[rightIndex]}`,
            count: 0,
            sourceIds: [],
          };
          summary.count += 1;
          summary.sourceIds = uniqueStrings([...summary.sourceIds, family.id]);
          basketPairMap.set(id, summary);
        }
      }
    });

  const basketPairs = Array.from(basketPairMap.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'fi'))
    .slice(0, 8);

  const projectSummaryMap = new Map<string, ReportProjectSummary>();
  filteredFamilies.forEach((family) => {
    const summary = projectSummaryMap.get(family.projectId) ?? {
      id: family.projectId,
      name: family.projectName,
      customerName: family.customerName,
      ownerUserId: family.ownerUserId,
      ownerLabel: family.ownerLabel,
      projectStage: family.projectStage,
      projectStageVariant: family.projectStageVariant,
      quoteValue: 0,
      actualValue: 0,
      quoteMarginPercent: 0,
      actualMarginPercent: 0,
      quoteToActualDelta: 0,
      quoteToActualDeltaPercent: 0,
      actualMarginDeltaPercent: 0,
      riskFlag: false,
      riskReason: family.primaryDeviationReason,
      familyCount: 0,
      sourceIds: [],
    } satisfies ReportProjectSummary;

    summary.quoteValue = roundCurrency(summary.quoteValue + family.latestSubtotal);
    summary.actualValue = roundCurrency((summary.actualValue ?? 0) + (family.actualValue ?? 0));
    summary.familyCount += 1;
    summary.sourceIds = uniqueStrings([...summary.sourceIds, family.id]);
    summary.riskFlag = summary.riskFlag || family.projectRisk;
    if (family.projectRisk) {
      summary.riskReason = family.primaryDeviationReason;
    }

    const projectFamilies = summary.sourceIds.map((id) => familiesById.get(id)).filter((item): item is QuoteFamilySummary => Boolean(item));
    const totalQuoteMargin = projectFamilies.reduce((sum, item) => sum + item.latestMargin, 0);
    const totalActualMargin = projectFamilies.reduce((sum, item) => sum + (item.actualMargin ?? 0), 0);
    const totalActualValue = projectFamilies.reduce((sum, item) => sum + (item.actualValue ?? 0), 0);
    summary.quoteMarginPercent = ratioPercent(totalQuoteMargin, summary.quoteValue);
    summary.actualMarginPercent = totalActualValue > 0 ? ratioPercent(totalActualMargin, totalActualValue) : null;
    summary.quoteToActualDelta = totalActualValue > 0 ? roundCurrency(totalActualValue - summary.quoteValue) : null;
    summary.quoteToActualDeltaPercent = totalActualValue > 0 ? ratioPercent(totalActualValue - summary.quoteValue, summary.quoteValue) : null;
    summary.actualMarginDeltaPercent = summary.actualMarginPercent !== null ? roundCurrency(summary.actualMarginPercent - summary.quoteMarginPercent) : null;
    summary.projectStage = projectFamilies.some((item) => item.projectRisk)
      ? 'Riskissä'
      : projectFamilies.some((item) => item.projectStage === 'Toteutuksessa')
        ? 'Toteutuksessa'
        : projectFamilies.some((item) => item.projectStage === 'Hyväksytty, odottaa toteumaa')
          ? 'Hyväksytty, odottaa toteumaa'
          : projectFamilies.some((item) => item.projectStage === 'Laskutettu')
            ? 'Laskutettu'
            : projectFamilies[0]?.projectStage || 'Tarjous työn alla';
    summary.projectStageVariant = getProjectStageVariant(summary.projectStage);
    projectSummaryMap.set(family.projectId, summary);
  });

  const projects = Array.from(projectSummaryMap.values())
    .sort((left, right) => Number(right.riskFlag) - Number(left.riskFlag) || right.quoteValue - left.quoteValue || left.name.localeCompare(right.name, 'fi'));

  const projectByOwnerMap = new Map<string, ReportOwnerSummary>();
  projects.forEach((project) => {
    const ownerKey = project.ownerUserId || '__unassigned__';
    const summary = projectByOwnerMap.get(ownerKey) ?? createOwnerSummary(ownerKey, project.ownerLabel);
    summary.quoteCount += project.familyCount;
    summary.quoteValue = roundCurrency(summary.quoteValue + project.quoteValue);
    summary.sourceIds = uniqueStrings([...summary.sourceIds, project.id]);
    projectByOwnerMap.set(ownerKey, summary);
  });

  const projectByOwner = Array.from(projectByOwnerMap.values())
    .map((summary) => {
      const ownerProjects = projects.filter((project) => (project.ownerUserId || '__unassigned__') === summary.ownerUserId);
      const invoicedProjectCount = ownerProjects.filter((candidate) => candidate.projectStage === 'Laskutettu').length;
      return {
        ...summary,
        acceptanceRatePercent: ratioPercent(
          invoicedProjectCount,
          Math.max(ownerProjects.length, 1)
        ),
        averageMarginPercent: ratioPercent(
          ownerProjects.reduce((sum, project) => sum + (project.actualMarginPercent ?? project.quoteMarginPercent) * project.quoteValue, 0),
          ownerProjects.reduce((sum, project) => sum + project.quoteValue, 0)
        ),
        averageQuoteSize: ownerProjects.length > 0 ? roundCurrency(summary.quoteValue / ownerProjects.length) : 0,
      } satisfies ReportOwnerSummary;
    })
    .sort((left, right) => right.quoteValue - left.quoteValue || left.ownerLabel.localeCompare(right.ownerLabel, 'fi'));

  const projectStageMap = new Map<string, ReportProjectStageSummary>();
  projects.forEach((project) => {
    const summary = projectStageMap.get(project.projectStage) ?? {
      stage: project.projectStage,
      variant: project.projectStageVariant,
      count: 0,
      value: 0,
      sourceIds: [],
    } satisfies ReportProjectStageSummary;
    summary.count += 1;
    summary.value = roundCurrency(summary.value + project.quoteValue);
    summary.sourceIds = uniqueStrings([...summary.sourceIds, project.id]);
    projectStageMap.set(project.projectStage, summary);
  });

  const projectStages = Array.from(projectStageMap.values())
    .sort((left, right) => right.count - left.count || right.value - left.value);

  const lowMarginFamilies = filteredFamilies
    .filter((family) => family.belowTargetMargin)
    .sort((left, right) => left.marginGapPercent - right.marginGapPercent || right.latestSubtotal - left.latestSubtotal);

  const revisionImpactFamilies = filteredFamilies
    .filter((family) => family.revisionCount > 1)
    .sort((left, right) => Math.abs(right.valueDeltaPercent) - Math.abs(left.valueDeltaPercent) || Math.abs(right.marginGapPercent) - Math.abs(left.marginGapPercent));

  const acceptedWithoutActualization = filteredFamilies
    .filter((family) => family.latestStatus === 'accepted' && family.actualValue === null)
    .sort((left, right) => right.ageDays - left.ageDays || right.latestSubtotal - left.latestSubtotal);

  const discountLeakageIds = filteredFamilies
    .filter((family) => family.revisions.some((revision) => revision.discountAmount > 0))
    .map((family) => family.id);
  const discountLeakageValue = roundCurrency(
    filteredFamilies.reduce(
      (sum, family) =>
        sum + family.revisions.reduce((revisionSum, revision) => revisionSum + revision.discountAmount, 0),
      0
    ) + filteredRows.reduce((sum, row) => sum + row.discountImpact, 0)
  );
  const revisionLeakageFamilies = filteredFamilies.filter((family) => family.valueDelta < 0);
  const lowMarginRows = filteredRows.filter((row) => row.belowTargetMargin);
  const costAnomalyRows = filteredRows.filter((row) => row.purchaseDeltaValue > 0);

  const leakageSummary: ReportLeakageSummary[] = [
    {
      id: 'discounts',
      title: 'Rivialennukset ja tarjousalennukset',
      explanation: 'Kate vuotaa riveillä annettujen alennusten ja tarjouskohtaisen diskonttauksen kautta.',
      impactValue: discountLeakageValue,
      occurrenceCount: discountLeakageIds.length + filteredRows.filter((row) => row.discountImpact > 0).length,
      severity: (discountLeakageValue > 0 ? 'high' : 'low') as ReportSeverity,
      sourceKind: 'families' as ReportSourceKind,
      sourceIds: uniqueStrings(discountLeakageIds),
    },
    {
      id: 'revision-drop',
      title: 'Revisioissa pienentynyt tarjousarvo',
      explanation: 'Tarjouksen nykyinen arvo on alempi kuin alkuperäisessä revisiossa.',
      impactValue: roundCurrency(revisionLeakageFamilies.reduce((sum, family) => sum + Math.abs(Math.min(0, family.valueDelta)), 0)),
      occurrenceCount: revisionLeakageFamilies.length,
      severity: (revisionLeakageFamilies.length > 0 ? 'medium' : 'low') as ReportSeverity,
      sourceKind: 'families' as ReportSourceKind,
      sourceIds: revisionLeakageFamilies.map((family) => family.id),
    },
    {
      id: 'group-margin',
      title: 'Hintaryhmät alittavat tavoitteen',
      explanation: 'Sama hintaryhmä osuu toistuvasti riveihin, joissa toteutunut kate jää tavoitteen alle.',
      impactValue: roundCurrency(
        lowMarginRows.reduce(
          (sum, row) =>
            sum + Math.max(0, ((row.targetMarginPercent - row.marginPercent) / 100) * row.value),
          0
        )
      ),
      occurrenceCount: groupsUnderTarget.filter((group) => group.belowTargetCount > 0).length,
      severity: (groupsUnderTarget.some((group) => group.underTargetSharePercent >= 40) ? 'high' : 'medium') as ReportSeverity,
      sourceKind: 'rows' as ReportSourceKind,
      sourceIds: lowMarginRows.map((row) => row.id),
    },
    {
      id: 'purchase-anomaly',
      title: 'Poikkeavat ostohinnat riveillä',
      explanation: 'Rivin ostohinta ylittää tuotteen oletuskustannuksen, mikä syö katetta ennen alennuksia.',
      impactValue: roundCurrency(costAnomalyRows.reduce((sum, row) => sum + row.purchaseDeltaValue, 0)),
      occurrenceCount: costAnomalyRows.length,
      severity: (costAnomalyRows.length > 0 ? 'medium' : 'low') as ReportSeverity,
      sourceKind: 'rows' as ReportSourceKind,
      sourceIds: costAnomalyRows.map((row) => row.id),
    },
  ].sort((left, right) => right.impactValue - left.impactValue || right.occurrenceCount - left.occurrenceCount);

  const revisionDistribution = ['1', '2', '3', '4+'].map((bucket) => {
    const families = filteredFamilies.filter((family) => getRevisionBucket(family.revisionCount) === bucket);
    return {
      bucket,
      label: getRevisionBucketLabel(bucket),
      familyCount: families.length,
      acceptanceRatePercent: ratioPercent(
        families.filter((family) => family.latestStatus === 'accepted').length,
        families.filter((family) => family.isDecided).length
      ),
      sourceIds: families.map((family) => family.id),
    } satisfies ReportRevisionDistributionItem;
  });

  const stalledRevisionFamilies = filteredFamilies
    .filter((family) => family.revisionCount >= 3 && family.isOpen)
    .sort((left, right) => right.revisionCount - left.revisionCount || right.ageDays - left.ageDays);

  const actions: Record<ReportActionGroupKey, ReportActionItem[]> = {
    sales: [],
    margin: [],
    customers: [],
    projects: [],
    data: [],
  };

  const expiringFamilies = filteredFamilies.filter(
    (family) => family.isOpen && family.expiresInDays !== null && family.expiresInDays >= 0 && family.expiresInDays <= TODAY_WARNING_DAYS
  );
  if (expiringFamilies.length > 0) {
    actions.sales.push({
      id: 'expiring-quotes',
      group: 'sales',
      title: 'Tarjouksia vanhenemassa pian',
      description: 'Voimassaolo päättyy viikon sisällä ja kaupan riski kasvaa nopeasti.',
      severity: expiringFamilies.some((family) => (family.expiresInDays ?? 0) <= 3) ? 'high' : 'medium',
      metricLabel: `${expiringFamilies.length} tarjousta`,
      sourceKind: 'families',
      sourceIds: expiringFamilies.map((family) => family.id),
    });
  }

  const staleFamilies = filteredFamilies.filter((family) => family.isOpen && family.ageDays > 14);
  if (staleFamilies.length > 0) {
    actions.sales.push({
      id: 'stale-quotes',
      group: 'sales',
      title: 'Tarjouksiin ei ole koskettu pitkään aikaan',
      description: 'Putki hidastuu, kun avoimet tarjoukset jäävät ilman seuraavaa kontaktia.',
      severity: staleFamilies.some((family) => family.ageDays > 30) ? 'high' : 'medium',
      metricLabel: `${staleFamilies.length} tarjousta`,
      sourceKind: 'families',
      sourceIds: staleFamilies.map((family) => family.id),
    });
  }

  if (lowMarginFamilies.length > 0) {
    actions.margin.push({
      id: 'low-margin-families',
      group: 'margin',
      title: 'Tarjouskate alittaa tavoitteen',
      description: 'Tarkista tarjouskohtainen hinnoittelu, alennukset ja rivien katteet ennen päätöstä.',
      severity: lowMarginFamilies.some((family) => family.marginGapPercent <= -10) ? 'high' : 'medium',
      metricLabel: `${lowMarginFamilies.length} tarjousta`,
      sourceKind: 'families',
      sourceIds: lowMarginFamilies.map((family) => family.id),
    });
  }

  if (lowMarginRows.length > 0) {
    actions.margin.push({
      id: 'low-margin-rows',
      group: 'margin',
      title: 'Riveillä on tavoitetta heikompi kate',
      description: 'Hintaryhmä, ostohinta tai manuaalinen hinnoittelu syö katetta rivitasolla.',
      severity: lowMarginRows.some((row) => row.targetMarginPercent - row.marginPercent >= 10) ? 'high' : 'medium',
      metricLabel: `${lowMarginRows.length} riviä`,
      sourceKind: 'rows',
      sourceIds: lowMarginRows.map((row) => row.id),
    });
  }

  if (dormantCustomers.length > 0) {
    actions.customers.push({
      id: 'dormant-customers',
      group: 'customers',
      title: 'Asiakkaat ilman viimeaikaista aktiviteettia',
      description: 'Nämä asiakkaat eivät ole näkyneet tarjousketjussa viime aikoina.',
      severity: dormantCustomers.some((customer) => (customer.daysSinceActivity ?? 0) > 90) ? 'high' : 'medium',
      metricLabel: `${dormantCustomers.length} asiakasta`,
      sourceKind: 'customers',
      sourceIds: dormantCustomers.map((customer) => customer.id),
    });
  }

  if (acceptedWithoutActualization.length > 0) {
    actions.projects.push({
      id: 'accepted-without-actualization',
      group: 'projects',
      title: 'Hyväksytyt tarjoukset odottavat toteumaa',
      description: 'Projektia ei tässä datamallissa avata erikseen, joten puuttuva laskutus tai toteuma kertoo pysähdyksestä.',
      severity: acceptedWithoutActualization.some((family) => family.ageDays > 30) ? 'high' : 'medium',
      metricLabel: `${acceptedWithoutActualization.length} ketjua`,
      sourceKind: 'families',
      sourceIds: acceptedWithoutActualization.map((family) => family.id),
    });
  }

  const riskProjects = projects.filter((project) => project.riskFlag);
  if (riskProjects.length > 0) {
    actions.projects.push({
      id: 'risk-projects',
      group: 'projects',
      title: 'Projektit, joissa poikkeama kasvaa',
      description: 'Tarjous vastaan toteuma tai toteutunut kate näyttää selkeää poikkeamaa.',
      severity: riskProjects.some((project) => (project.quoteToActualDeltaPercent ?? 0) >= 15 || (project.actualMarginDeltaPercent ?? 0) <= -8)
        ? 'high'
        : 'medium',
      metricLabel: `${riskProjects.length} projektia`,
      sourceKind: 'projects',
      sourceIds: riskProjects.map((project) => project.id),
    });
  }

  const ownerlessFamilies = filteredFamilies.filter((family) => !family.hasOwner);
  if (ownerlessFamilies.length > 0) {
    actions.data.push({
      id: 'ownerless-families',
      group: 'data',
      title: 'Tarjouksilta puuttuu vastuuhenkilö',
      description: 'Omistajuus puuttuu, jolloin seuranta ja raportointi hajoavat useisiin näkymiin.',
      severity: 'high',
      metricLabel: `${ownerlessFamilies.length} tarjousta`,
      sourceKind: 'families',
      sourceIds: ownerlessFamilies.map((family) => family.id),
    });
  }

  const missingValidityFamilies = filteredFamilies.filter((family) => family.isOpen && !family.validUntil);
  if (missingValidityFamilies.length > 0) {
    actions.data.push({
      id: 'missing-validity',
      group: 'data',
      title: 'Tarjouksilta puuttuu voimassaoloaika',
      description: 'Voimassaolo ohjaa myyntityön kiireellisyyttä ja ennusteen luotettavuutta.',
      severity: 'medium',
      metricLabel: `${missingValidityFamilies.length} tarjousta`,
      sourceKind: 'families',
      sourceIds: missingValidityFamilies.map((family) => family.id),
    });
  }

  Object.keys(actions).forEach((groupKey) => {
    actions[groupKey as ReportActionGroupKey] = actions[groupKey as ReportActionGroupKey].sort((left, right) => {
      const severityOrder: Record<ReportSeverity, number> = { high: 0, medium: 1, low: 2 };
      return severityOrder[left.severity] - severityOrder[right.severity] || left.title.localeCompare(right.title, 'fi');
    });
  });

  return {
    generatedAt: now.toISOString(),
    filters,
    meta: {
      totalFamilies: allFamilies.length,
      filteredFamilies: filteredFamilies.length,
      totalRows: latestRows.length,
      filteredRows: filteredRows.length,
      hasQuotes: allFamilies.length > 0,
      hasInvoices: input.invoices.length > 0,
      hasProducts: input.products.length > 0,
    },
    kpis,
    families: filteredFamilies,
    rows: filteredRows,
    overviewChains: filteredFamilies.slice(0, 12),
    statusSummary,
    agingSummary,
    ownerSummary,
    marginByOwner,
    marginByCustomer,
    marginByGroup,
    leakageSummary,
    lowMarginFamilies,
    revisionImpactFamilies,
    customers,
    dormantCustomers,
    highAcceptanceCustomers,
    revisionHeavyCustomers,
    customerByOwner,
    customerConcentration,
    products,
    profitableProducts,
    weakMarginProducts,
    discountedProducts,
    wonProducts,
    revisionAddedProducts,
    groupsUnderTarget,
    basketPairs,
    projects,
    projectByOwner,
    projectStages,
    acceptedWithoutActualization,
    revisionDistribution,
    stalledRevisionFamilies,
    actions,
  };
}
