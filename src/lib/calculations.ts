import { Customer, Project, Quote, QuoteRow, type QuotePricingMode, type QuoteRowPricingModel } from './types';

export interface QuoteRowCalculation {
  pricingModel: QuoteRowPricingModel;
  enteredUnitPrice: number | null;
  enteredLineTotal: number | null;
  derivedUnitPrice: number;
  baseTotal: number;
  adjustmentTotal: number;
  rowTotal: number;
  internalUnitCost: number;
  costTotal: number;
  marginAmount: number;
  marginPercent: number;
  hasInternalCostBasis: boolean;
  isUnitPriceDerived: boolean;
  usesLegacyPricing: boolean;
}

export interface QuoteRowPricingDetails {
  pricingModel: QuoteRowPricingModel;
  enteredUnitPrice: number | null;
  enteredLineTotal: number | null;
  derivedUnitPrice: number;
  baseTotal: number;
  adjustmentTotal: number;
  netTotal: number;
  vatAmount: number;
  grossTotal: number;
  isUnitPriceDerived: boolean;
  usesLegacyPricing: boolean;
}

export interface QuoteCalculation {
  lineSubtotal: number;
  extraChargesTotal: number;
  beforeDiscountSubtotal: number;
  discountAmount: number;
  subtotal: number;
  vat: number;
  total: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number;
}

export interface QuoteSummaryBreakdown {
  calculation: QuoteCalculation;
  extraChargeLines: QuoteExtraChargeLine[];
  subtotalLabel: string;
  vatPercent: number;
  vatLabel: string;
}

export interface QuoteExtraChargeLine {
  key:
    | 'projectCosts'
    | 'deliveryCosts'
    | 'installationCosts'
    | 'travelCosts'
    | 'disposalCosts'
    | 'demolitionCosts'
    | 'protectionCosts'
    | 'permitCosts';
  label: string;
  amount: number;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeVatPercent(value: number | null | undefined, fallback = 0) {
  if (!Number.isFinite(value)) {
    return Math.max(0, fallback);
  }

  return Math.max(0, value as number);
}

function normalizeNonNegativeNumber(value: number, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
}

function normalizeAdjustment(value?: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value as number;
}

function normalizeRegionMultiplier(row: Pick<QuoteRow, 'regionMultiplier'>) {
  return Number.isFinite(row.regionMultiplier) && row.regionMultiplier > 0 ? row.regionMultiplier : 1;
}

export function getQuoteRowUnitPricingMode(
  row: Pick<QuoteRow, 'unitPricingMode' | 'manualSalesPrice'>
): QuotePricingMode {
  if (row.unitPricingMode === 'manual') {
    return 'manual';
  }

  if (row.unitPricingMode === 'margin') {
    return 'margin';
  }

  return row.manualSalesPrice ? 'manual' : 'margin';
}

export function hasQuoteRowInternalCostBasis(
  row: Pick<QuoteRow, 'mode' | 'purchasePrice' | 'installationPrice'>
) {
  if (row.mode === 'section' || row.mode === 'charge') {
    return false;
  }

  return normalizeNonNegativeNumber(row.purchasePrice) > 0 || normalizeNonNegativeNumber(row.installationPrice) > 0;
}

export function getQuoteRowInternalUnitCost(
  row: Pick<QuoteRow, 'mode' | 'purchasePrice' | 'installationPrice' | 'regionMultiplier'>
) {
  if (row.mode === 'section' || row.mode === 'charge') {
    return 0;
  }

  const internalBaseCost = normalizeNonNegativeNumber(row.purchasePrice) + normalizeNonNegativeNumber(row.installationPrice);
  return roundCurrency(internalBaseCost * normalizeRegionMultiplier(row));
}

export function calculateQuoteRowTargetUnitPrice(
  row: Pick<QuoteRow, 'mode' | 'purchasePrice' | 'installationPrice' | 'regionMultiplier'>,
  marginPercent: number
) {
  const normalizedMarginPercent = Number.isFinite(marginPercent) ? Math.max(0, marginPercent) : 0;
  const safeDenominator = Math.max(0.01, 1 - (normalizedMarginPercent / 100));
  return roundCurrency(getQuoteRowInternalUnitCost(row) / safeDenominator);
}

export function getQuoteRowPricingModel(row: QuoteRow): QuoteRowPricingModel {
  return row.pricingModel === 'line_total' ? 'line_total' : 'unit_price';
}

export function getLegacyQuoteRowUnitPrice(row: QuoteRow) {
  if (row.mode === 'section') {
    return 0;
  }

  const salesUnitPrice = row.mode !== 'installation'
    ? normalizeNonNegativeNumber(row.salesPrice)
    : 0;
  const installationUnitPrice = row.mode !== 'product'
    ? roundCurrency(normalizeNonNegativeNumber(row.installationPrice) * normalizeRegionMultiplier(row))
    : 0;

  return roundCurrency(salesUnitPrice + installationUnitPrice);
}

export function getQuoteRowPricingDetails(
  row: QuoteRow,
  vatPercent: number = 0
): QuoteRowPricingDetails {
  const quantity = Number.isFinite(row.quantity) ? Math.max(0, row.quantity) : 0;
  const pricingModel = getQuoteRowPricingModel(row);
  const usesLegacyPricing = row.pricingModel !== 'unit_price' && row.pricingModel !== 'line_total';
  const adjustmentTotal = roundCurrency(normalizeAdjustment(row.priceAdjustment));
  const normalizedVatPercent = normalizeVatPercent(vatPercent);

  if (row.mode === 'section') {
    return {
      pricingModel,
      enteredUnitPrice: null,
      enteredLineTotal: null,
      derivedUnitPrice: 0,
      baseTotal: 0,
      adjustmentTotal: 0,
      netTotal: 0,
      vatAmount: 0,
      grossTotal: 0,
      isUnitPriceDerived: false,
      usesLegacyPricing,
    };
  }

  const storedOrLegacyUnitPrice = usesLegacyPricing
    ? getLegacyQuoteRowUnitPrice(row)
    : roundCurrency(normalizeNonNegativeNumber(row.salesPrice));

  if (pricingModel === 'line_total') {
    const enteredLineTotal = roundCurrency(
      normalizeNonNegativeNumber(
        row.overridePrice ?? (usesLegacyPricing ? roundCurrency(storedOrLegacyUnitPrice * quantity) : 0)
      )
    );
    const derivedUnitPrice = quantity > 0 ? roundCurrency(enteredLineTotal / quantity) : 0;
    const netTotal = roundCurrency(Math.max(0, enteredLineTotal + adjustmentTotal));

    return {
      pricingModel,
      enteredUnitPrice: null,
      enteredLineTotal,
      derivedUnitPrice,
      baseTotal: enteredLineTotal,
      adjustmentTotal,
      netTotal,
      vatAmount: roundCurrency(netTotal * (normalizedVatPercent / 100)),
      grossTotal: roundCurrency(netTotal + roundCurrency(netTotal * (normalizedVatPercent / 100))),
      isUnitPriceDerived: true,
      usesLegacyPricing,
    };
  }

  const enteredUnitPrice = storedOrLegacyUnitPrice;
  const baseTotal = roundCurrency(enteredUnitPrice * quantity);
  const netTotal = roundCurrency(Math.max(0, baseTotal + adjustmentTotal));
  const vatAmount = roundCurrency(netTotal * (normalizedVatPercent / 100));

  return {
    pricingModel,
    enteredUnitPrice,
    enteredLineTotal: null,
    derivedUnitPrice: enteredUnitPrice,
    baseTotal,
    adjustmentTotal,
    netTotal,
    vatAmount,
    grossTotal: roundCurrency(netTotal + vatAmount),
    isUnitPriceDerived: false,
    usesLegacyPricing,
  };
}

export function calculateTravelCosts(quote: Pick<Quote, 'travelKilometers' | 'travelRatePerKm'>) {
  return roundCurrency((quote.travelKilometers || 0) * (quote.travelRatePerKm || 0));
}

export function getQuoteExtraChargeLines(quote: Quote): QuoteExtraChargeLine[] {
  const travelCosts = calculateTravelCosts(quote);
  return [
    { key: 'projectCosts', label: 'Muut projektikulut', amount: roundCurrency(quote.projectCosts || 0) },
    { key: 'deliveryCosts', label: 'Toimituskulut', amount: roundCurrency(quote.deliveryCosts || 0) },
    { key: 'installationCosts', label: 'Asennuskulut', amount: roundCurrency(quote.installationCosts || 0) },
    { key: 'travelCosts', label: 'Kilometrikorvaukset', amount: travelCosts },
    { key: 'disposalCosts', label: 'Kaatopaikka- ja jätemaksut', amount: roundCurrency(quote.disposalCosts || 0) },
    { key: 'demolitionCosts', label: 'Purkutyön lisäkulut', amount: roundCurrency(quote.demolitionCosts || 0) },
    { key: 'protectionCosts', label: 'Suojaus- ja peittokulut', amount: roundCurrency(quote.protectionCosts || 0) },
    { key: 'permitCosts', label: 'Lupa- ja käsittelymaksut', amount: roundCurrency(quote.permitCosts || 0) },
  ];
}

export function calculateQuoteRow(row: QuoteRow): QuoteRowCalculation {
  const quantity = Number.isFinite(row.quantity) ? Math.max(0, row.quantity) : 0;
  const pricing = getQuoteRowPricingDetails(row);
  const internalUnitCost = getQuoteRowInternalUnitCost(row);
  const costTotal = roundCurrency(internalUnitCost * quantity);
  const marginAmount = roundCurrency(pricing.netTotal - costTotal);
  const marginPercent = pricing.netTotal > 0 ? roundCurrency((marginAmount / pricing.netTotal) * 100) : 0;

  return {
    pricingModel: pricing.pricingModel,
    enteredUnitPrice: pricing.enteredUnitPrice,
    enteredLineTotal: pricing.enteredLineTotal,
    derivedUnitPrice: pricing.derivedUnitPrice,
    baseTotal: pricing.baseTotal,
    adjustmentTotal: pricing.adjustmentTotal,
    rowTotal: pricing.netTotal,
    internalUnitCost,
    costTotal,
    marginAmount,
    marginPercent,
    hasInternalCostBasis: hasQuoteRowInternalCostBasis(row),
    isUnitPriceDerived: pricing.isUnitPriceDerived,
    usesLegacyPricing: pricing.usesLegacyPricing,
  };
}

export function calculateQuote(quote: Quote, rows: QuoteRow[]): QuoteCalculation {
  const lineSubtotal = roundCurrency(
    rows.reduce((sum, row) => sum + calculateQuoteRow(row).rowTotal, 0)
  );
  const totalCost = roundCurrency(
    rows.reduce((sum, row) => sum + calculateQuoteRow(row).costTotal, 0)
  );
  const extraChargesTotal = roundCurrency(
    getQuoteExtraChargeLines(quote).reduce((sum, charge) => sum + charge.amount, 0)
  );
  const beforeDiscountSubtotal = roundCurrency(lineSubtotal + extraChargesTotal);

  const rawDiscountAmount =
    quote.discountType === 'percent'
      ? beforeDiscountSubtotal * ((quote.discountValue || 0) / 100)
      : quote.discountType === 'amount'
        ? quote.discountValue || 0
        : 0;

  const discountAmount = roundCurrency(Math.min(beforeDiscountSubtotal, Math.max(0, rawDiscountAmount)));
  const subtotal = roundCurrency(Math.max(0, beforeDiscountSubtotal - discountAmount));
  const vatPercent = getQuoteVatPercent(quote);
  const vat = roundCurrency(subtotal * (vatPercent / 100));
  const total = roundCurrency(subtotal + vat);
  const totalMargin = roundCurrency(subtotal - totalCost);
  const marginPercent = subtotal > 0 ? roundCurrency((totalMargin / subtotal) * 100) : 0;

  return {
    lineSubtotal,
    extraChargesTotal,
    beforeDiscountSubtotal,
    discountAmount,
    subtotal,
    vat,
    total,
    totalCost,
    totalMargin,
    marginPercent,
  };
}

export function getQuoteVatPercent(
  quote: Pick<Quote, 'vatPercent'> | null | undefined,
  fallback = 0
) {
  return normalizeVatPercent(quote?.vatPercent, fallback);
}

export function formatVatPercent(value: number | null | undefined) {
  return new Intl.NumberFormat('fi-FI', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(normalizeVatPercent(value));
}

export function getQuoteVatLabel(quote: Pick<Quote, 'vatPercent'> | null | undefined) {
  return `ALV ${formatVatPercent(getQuoteVatPercent(quote))} %`;
}

export function getQuoteSummaryBreakdown(quote: Quote, rows: QuoteRow[]): QuoteSummaryBreakdown {
  const calculation = calculateQuote(quote, rows);
  const extraChargeLines = getQuoteExtraChargeLines(quote).filter((line) => line.amount > 0);
  const vatPercent = getQuoteVatPercent(quote);

  return {
    calculation,
    extraChargeLines,
    subtotalLabel: 'Veroton välisumma',
    vatPercent,
    vatLabel: `ALV ${formatVatPercent(vatPercent)} %`,
  };
}

export function canSendQuote(
  quote: Quote,
  rows: QuoteRow[],
  customer?: Customer,
  project?: Project,
  hasNewerRevision?: boolean
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!quote.title.trim()) {
    errors.push({ field: 'title', message: 'Tarjouksen otsikko puuttuu.' });
  }
  if (!quote.quoteNumber.trim()) {
    errors.push({ field: 'quoteNumber', message: 'Tarjousnumero puuttuu.' });
  }
  if (!customer) {
    errors.push({ field: 'customer', message: 'Asiakas puuttuu.' });
  }
  if (!project) {
    errors.push({ field: 'project', message: 'Projekti puuttuu.' });
  }
  if (!quote.validUntil) {
    warnings.push({ field: 'validUntil', message: 'Voimassaoloaikaa ei ole asetettu.' });
  }
  if (rows.filter((row) => row.mode !== 'section').length === 0) {
    errors.push({ field: 'rows', message: 'Tarjouksella ei ole laskutettavia rivejä.' });
  }
  if (hasNewerRevision) {
    errors.push({ field: 'revision', message: 'Tarjouksesta on jo olemassa uudempi revisio.' });
  }

  rows.forEach((row, index) => {
    if (row.mode === 'section') {
      if (!row.productName.trim()) {
        warnings.push({ field: `row-${index}`, message: `Väliotsikko ${index + 1} on tyhjä.` });
      }
      return;
    }

    if (!row.productName.trim()) {
      errors.push({ field: `row-${index}`, message: `Riviltä ${index + 1} puuttuu nimi.` });
    }
    if (row.quantity <= 0) {
      errors.push({ field: `row-${index}`, message: `Rivin ${index + 1} määrä on virheellinen.` });
    }
    if (getQuoteRowPricingModel(row) === 'unit_price' && normalizeNonNegativeNumber(row.salesPrice) <= 0) {
      errors.push({ field: `row-${index}`, message: `Rivin ${index + 1} yksikköhinta puuttuu tai on virheellinen.` });
    }
    if (getQuoteRowPricingModel(row) === 'line_total' && normalizeNonNegativeNumber(row.overridePrice ?? 0) <= 0) {
      errors.push({ field: `row-${index}`, message: `Rivin ${index + 1} kokonaishinta puuttuu tai on virheellinen.` });
    }
    if (calculateQuoteRow(row).marginAmount < 0) {
      warnings.push({ field: `row-${index}`, message: `Rivin ${index + 1} kate on negatiivinen.` });
    }
  });

  const calc = calculateQuote(quote, rows);
  if (calc.total <= 0) {
    errors.push({ field: 'total', message: 'Tarjouksen loppusumma on oltava positiivinen.' });
  }
  if (calc.marginPercent < 0) {
    warnings.push({ field: 'margin', message: 'Tarjouksen kokonaiskate on negatiivinen.' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fi-FI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
