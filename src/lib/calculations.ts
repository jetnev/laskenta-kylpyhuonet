import {
  QuoteRow,
  Quote,
  QuoteCalculation,
  QuoteRowCalculation,
  QuoteValidation,
  ValidationError,
  Product,
  Customer,
  Project,
} from './types';

export function calculateQuoteRow(row: QuoteRow): QuoteRowCalculation {
  const effectivePrice = row.overridePrice ?? row.salesPrice;
  
  let productTotal = 0;
  let installationTotal = 0;
  
  if (row.mode === 'product' || row.mode === 'product_installation') {
    productTotal = effectivePrice * row.quantity;
  }
  
  if (row.mode === 'installation' || row.mode === 'product_installation') {
    installationTotal = row.installationPrice * row.quantity * row.regionMultiplier;
  }
  
  const rowTotal = productTotal + installationTotal;
  const purchaseCost = row.purchasePrice * row.quantity;
  const margin = rowTotal - purchaseCost;
  
  return {
    productTotal,
    installationTotal,
    rowTotal,
    effectivePrice,
    purchaseCost,
    margin,
  };
}

export function calculateQuote(
  quote: Quote,
  rows: QuoteRow[]
): QuoteCalculation {
  let subtotal = 0;
  let totalPurchaseCost = 0;
  
  rows.forEach(row => {
    const calc = calculateQuoteRow(row);
    subtotal += calc.rowTotal;
    totalPurchaseCost += calc.purchaseCost;
  });
  
  const vat = subtotal * (quote.vatPercent / 100);
  const total = subtotal + vat;
  const totalMargin = subtotal - totalPurchaseCost;
  const marginPercent = totalPurchaseCost > 0 ? (totalMargin / totalPurchaseCost) * 100 : 0;
  
  return {
    subtotal,
    vat,
    total,
    totalPurchaseCost,
    totalMargin,
    marginPercent,
  };
}

export function calculateSalesPrice(
  purchasePrice: number,
  marginPercent: number
): number {
  return purchasePrice * (1 + marginPercent / 100);
}

export function calculateMarginPercent(
  purchasePrice: number,
  salesPrice: number
): number {
  if (purchasePrice === 0) return 0;
  return ((salesPrice - purchasePrice) / purchasePrice) * 100;
}

export function validateQuote(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer | undefined,
  project: Project | undefined
): QuoteValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  if (!customer) {
    errors.push({
      field: 'customer',
      message: 'Asiakas puuttuu',
      severity: 'error',
    });
  }
  
  if (!project || !project.site) {
    errors.push({
      field: 'site',
      message: 'Työmaa puuttuu',
      severity: 'error',
    });
  }
  
  if (rows.length === 0) {
    errors.push({
      field: 'rows',
      message: 'Tarjouksella ei ole yhtään riviä',
      severity: 'error',
    });
  }
  
  rows.forEach((row, index) => {
    if (row.quantity === 0) {
      errors.push({
        field: `row-${index}-quantity`,
        message: `Rivi ${index + 1}: Määrä ei voi olla nolla`,
        severity: 'error',
      });
    }
    
    if (row.mode === 'product' || row.mode === 'product_installation') {
      if (row.salesPrice === 0 && !row.overridePrice) {
        errors.push({
          field: `row-${index}-price`,
          message: `Rivi ${index + 1}: Myyntihinta puuttuu`,
          severity: 'error',
        });
      }
      
      if (row.purchasePrice === 0) {
        warnings.push({
          field: `row-${index}-purchase`,
          message: `Rivi ${index + 1}: Ostohinta puuttuu`,
          severity: 'warning',
        });
      }
    }
    
    if (row.mode === 'installation' || row.mode === 'product_installation') {
      if (row.installationPrice === 0) {
        errors.push({
          field: `row-${index}-installation`,
          message: `Rivi ${index + 1}: Asennushinta puuttuu`,
          severity: 'error',
        });
      }
    }
  });
  
  if (!quote.termsId) {
    warnings.push({
      field: 'terms',
      message: 'Sopimusehdot puuttuvat',
      severity: 'warning',
    });
  }
  
  if (!quote.notes || quote.notes.trim() === '') {
    warnings.push({
      field: 'notes',
      message: 'Tarjoushuomautukset puuttuvat',
      severity: 'warning',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function canSendQuote(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer | undefined,
  project: Project | undefined,
  hasNewerRevision: boolean
): QuoteValidation {
  const validation = validateQuote(quote, rows, customer, project);
  
  if (hasNewerRevision) {
    validation.errors.push({
      field: 'revision',
      message: 'Uudempi revisio on jo olemassa',
      severity: 'error',
    });
    validation.isValid = false;
  }
  
  if (quote.status !== 'draft') {
    validation.errors.push({
      field: 'status',
      message: 'Vain luonnos-tilaiset tarjoukset voidaan lähettää',
      severity: 'error',
    });
    validation.isValid = false;
  }
  
  return validation;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('fi-FI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(num: number): string {
  return `${formatNumber(num, 1)} %`;
}

export function parseNumber(value: string): number {
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
