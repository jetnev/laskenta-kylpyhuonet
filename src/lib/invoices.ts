import {
  CompanyProfile,
  Customer,
  Invoice,
  InvoiceCompanySnapshot,
  Project,
  Quote,
  QuoteRow,
  Settings,
} from './types';

export const DEFAULT_INVOICE_DUE_DAYS = 14;
export const DEFAULT_LATE_INTEREST_PERCENT = 8;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function sanitizePrefix(value?: string) {
  const trimmed = value?.trim().toUpperCase();
  return trimmed || 'LASKU';
}

function extractDigits(value: string) {
  return value.replace(/\D/g, '');
}

function cloneInvoiceRows(rows: QuoteRow[]) {
  return rows.map((row) => ({ ...row }));
}

export function addDaysToIsoDate(dateString: string, days: number) {
  const base = new Date(`${dateString}T12:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return dateString;
  }

  base.setUTCDate(base.getUTCDate() + days);
  return toIsoDate(base);
}

export function generateInvoiceNumber(prefix?: string) {
  const date = new Date();
  const parts = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `${sanitizePrefix(prefix)}-${parts}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export function createFinnishReferenceNumber(seed: string) {
  const base = extractDigits(seed) || extractDigits(Date.now().toString()) || '1';
  const truncated = base.slice(-19);
  const weights = [7, 3, 1];

  const sum = truncated
    .split('')
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * weights[index % weights.length], 0);
  const checksum = (10 - (sum % 10)) % 10;

  return `${truncated}${checksum}`;
}

export function getInvoiceStatusLabel(status: Invoice['status']) {
  switch (status) {
    case 'issued':
      return 'Lähetetty';
    case 'paid':
      return 'Maksettu';
    case 'cancelled':
      return 'Mitätöity';
    default:
      return 'Luonnos';
  }
}

export function isInvoiceOverdue(invoice: Pick<Invoice, 'status' | 'dueDate'>) {
  if (invoice.status !== 'issued' || !invoice.dueDate) {
    return false;
  }

  const today = todayIsoDate();
  return invoice.dueDate < today;
}

export function buildInvoiceCompanySnapshot(
  settings?: Settings,
  companyProfile?: CompanyProfile
): InvoiceCompanySnapshot {
  return {
    companyName: companyProfile?.companyName?.trim() || settings?.companyName?.trim() || 'Yritys Oy',
    companyAddress: companyProfile?.companyAddress?.trim() || settings?.companyAddress?.trim() || '',
    companyPhone: companyProfile?.companyPhone?.trim() || settings?.companyPhone?.trim() || '',
    companyEmail: companyProfile?.companyEmail?.trim() || settings?.companyEmail?.trim() || '',
    companyLogo: companyProfile?.companyLogo?.trim() || settings?.companyLogo?.trim() || '',
    businessId: companyProfile?.businessId?.trim() || '',
    iban: companyProfile?.iban?.replace(/\s+/g, '').toUpperCase() || '',
    bic: companyProfile?.bic?.trim().toUpperCase() || '',
    invoiceNumberPrefix: sanitizePrefix(companyProfile?.invoiceNumberPrefix),
    defaultInvoiceDueDays: Math.max(0, Math.round(companyProfile?.defaultInvoiceDueDays || DEFAULT_INVOICE_DUE_DAYS)),
    lateInterestPercent:
      typeof companyProfile?.lateInterestPercent === 'number'
        ? companyProfile.lateInterestPercent
        : DEFAULT_LATE_INTEREST_PERCENT,
  };
}

export interface CreateInvoiceFromQuoteInput {
  quote: Quote;
  rows: QuoteRow[];
  customer: Customer;
  project: Project;
  settings?: Settings;
  companyProfile?: CompanyProfile;
  issueDate?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
}

export function createInvoiceSnapshotFromQuote(input: CreateInvoiceFromQuoteInput): Omit<Invoice, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt' | 'createdByUserId' | 'updatedByUserId'> {
  const { quote, rows, customer, project, settings, companyProfile } = input;

  if (quote.status !== 'accepted') {
    throw new Error('Laskun voi luoda vain hyväksytystä tarjouksesta.');
  }
  if (rows.filter((row) => row.mode !== 'section').length === 0) {
    throw new Error('Tarjouksella ei ole laskutettavia rivejä.');
  }

  const issueDate = input.issueDate || todayIsoDate();
  const company = buildInvoiceCompanySnapshot(settings, companyProfile);
  const paymentTermDays = company.defaultInvoiceDueDays || DEFAULT_INVOICE_DUE_DAYS;
  const invoiceNumber = input.invoiceNumber || generateInvoiceNumber(company.invoiceNumberPrefix);
  const referenceNumber = input.referenceNumber || createFinnishReferenceNumber(invoiceNumber);

  return {
    projectId: project.id,
    customerId: customer.id,
    sourceQuoteId: quote.id,
    sourceQuoteNumber: quote.quoteNumber,
    sourceQuoteRevisionNumber: quote.revisionNumber,
    invoiceNumber,
    referenceNumber,
    title: quote.title?.trim() ? `Lasku: ${quote.title}` : `Lasku: ${project.name}`,
    status: 'draft',
    issueDate,
    dueDate: addDaysToIsoDate(issueDate, paymentTermDays),
    paymentTermDays,
    currency: settings?.currency || 'EUR',
    vatPercent: quote.vatPercent,
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
    notes: quote.notes,
    internalNotes: quote.internalNotes,
    termsSnapshotName: quote.termsSnapshotName,
    termsSnapshotContentMd: quote.termsSnapshotContentMd,
    customer: {
      name: customer.name,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      businessId: customer.businessId,
    },
    project: {
      name: project.name,
      site: project.site,
      region: project.region,
      notes: project.notes,
    },
    company,
    rows: cloneInvoiceRows(rows),
    issuedAt: undefined,
    paidAt: undefined,
    cancelledAt: undefined,
    lastAutoSavedAt: new Date().toISOString(),
  };
}

export function invoiceToQuoteLike(invoice: Invoice): Quote {
  return {
    id: invoice.id,
    projectId: invoice.projectId,
    title: invoice.title,
    quoteNumber: invoice.invoiceNumber,
    revisionNumber: 1,
    status: 'accepted',
    vatPercent: invoice.vatPercent,
    validUntil: invoice.dueDate,
    notes: invoice.notes,
    internalNotes: invoice.internalNotes,
    schedule: undefined,
    scheduleMilestones: [],
    termsId: undefined,
    termsSnapshotName: invoice.termsSnapshotName,
    termsSnapshotContentMd: invoice.termsSnapshotContentMd,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    projectCosts: invoice.projectCosts,
    deliveryCosts: invoice.deliveryCosts,
    installationCosts: invoice.installationCosts,
    travelKilometers: invoice.travelKilometers,
    travelRatePerKm: invoice.travelRatePerKm,
    disposalCosts: invoice.disposalCosts,
    demolitionCosts: invoice.demolitionCosts,
    protectionCosts: invoice.protectionCosts,
    permitCosts: invoice.permitCosts,
    selectedMarginPercent: 0,
    pricingMode: 'manual',
    ownerUserId: invoice.ownerUserId,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    createdByUserId: invoice.createdByUserId,
    updatedByUserId: invoice.updatedByUserId,
    lastAutoSavedAt: invoice.lastAutoSavedAt,
  };
}