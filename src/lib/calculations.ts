import { Quote, QuoteRow, Customer, Project } from './types';

export interface QuoteRowCalculation {
  productTotal: number;
  installationTotal: number;
  rowTotal: number;
}

export interface QuoteCalculation {
  subtotal: number;
  vat: number;
  total: number;
  totalMargin: number;
  marginPercent: number;
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

export function calculateQuoteRow(row: QuoteRow): QuoteRowCalculation {
  const productTotal = row.mode !== 'installation' 
    ? row.salesPrice * row.quantity 
    : 0;
  
  const installationTotal = row.mode !== 'product'
    ? row.installationPrice * row.quantity * row.regionMultiplier
    : 0;
  
  const rowTotal = row.overridePrice !== undefined
    ? row.overridePrice
    : productTotal + installationTotal;
  
  return {
    productTotal,
    installationTotal,
    rowTotal,
  };
}

export function calculateQuote(quote: Quote, rows: QuoteRow[]): QuoteCalculation {
  const subtotal = rows.reduce((sum, row) => {
    const calc = calculateQuoteRow(row);
    return sum + calc.rowTotal;
  }, 0);
  
  const vat = subtotal * (quote.vatPercent / 100);
  const total = subtotal + vat;
  
  const totalCost = rows.reduce((sum, row) => {
    const productCost = row.mode !== 'installation'
      ? row.purchasePrice * row.quantity
      : 0;
    const installationCost = row.mode !== 'product'
      ? row.installationPrice * row.quantity * row.regionMultiplier
      : 0;
    return sum + productCost + installationCost;
  }, 0);
  
  const totalMargin = subtotal - totalCost;
  const marginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
  
  return {
    subtotal,
    vat,
    total,
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
  
  if (!customer) {
    errors.push({ field: 'customer', message: 'Asiakas puuttuu' });
  }
  
  if (!project) {
    errors.push({ field: 'project', message: 'Projekti puuttuu' });
  }
  
  if (rows.length === 0) {
    errors.push({ field: 'rows', message: 'Tarjouksella ei ole yhtään riviä' });
  }
  
  if (hasNewerRevision) {
    errors.push({ field: 'revision', message: 'Tarjouksesta on olemassa uudempi revisio' });
  }
  
  rows.forEach((row, index) => {
    if (!row.productName || row.productName.trim() === '') {
      warnings.push({ field: `row-${index}`, message: `Rivi ${index + 1}: Tuotenimi puuttuu` });
    }
    if (row.quantity <= 0) {
      errors.push({ field: `row-${index}`, message: `Rivi ${index + 1}: Määrä on nolla tai negatiivinen` });
    }
  });
  
  const calc = calculateQuote(quote, rows);
  if (calc.marginPercent < 0) {
    warnings.push({ field: 'margin', message: 'Tarjouksen kate on negatiivinen' });
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
