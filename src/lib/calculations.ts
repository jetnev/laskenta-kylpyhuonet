import { Quote, QuoteRow, Customer, Project } from './types';

export interface QuoteRowCalculation {
  productTotal: number;
  installationTotal: number;
  rowTotal: number;
  costTotal: number;
  marginAmount: number;
  marginPercent: number;
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
  if (row.mode === 'section') {
    return {
      productTotal: 0,
      installationTotal: 0,
      rowTotal: 0,
      costTotal: 0,
      marginAmount: 0,
      marginPercent: 0,
    };
  }

  const quantity = Number.isFinite(row.quantity) ? row.quantity : 0;
  const regionMultiplier = Number.isFinite(row.regionMultiplier) && row.regionMultiplier > 0 ? row.regionMultiplier : 1;
  const productTotal = row.mode !== 'installation' ? roundCurrency(row.salesPrice * quantity) : 0;
  const installationTotal = row.mode !== 'product'
    ? roundCurrency(row.installationPrice * quantity * regionMultiplier)
    : 0;

  const costTotal = row.mode !== 'installation'
    ? roundCurrency(row.purchasePrice * quantity)
    : 0;

  const rowTotal = row.overridePrice !== undefined
    ? roundCurrency(row.overridePrice)
    : roundCurrency(productTotal + installationTotal);

  const marginAmount = roundCurrency(rowTotal - costTotal);
  const marginPercent = rowTotal > 0 ? roundCurrency((marginAmount / rowTotal) * 100) : 0;

  return {
    productTotal,
    installationTotal,
    rowTotal,
    costTotal,
    marginAmount,
    marginPercent,
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
  const vat = roundCurrency(subtotal * ((quote.vatPercent || 0) / 100));
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
