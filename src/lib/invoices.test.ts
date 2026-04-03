import { describe, expect, it } from 'vitest';
import { createFinnishReferenceNumber, createInvoiceSnapshotFromQuote } from './invoices';
import type { CompanyProfile, Customer, Project, Quote, QuoteRow, Settings } from './types';

const settings: Settings = {
  companyName: 'Rakennus Oy',
  companyAddress: 'Testikatu 1',
  companyPhone: '+358401234567',
  companyEmail: 'myynti@rakennus.fi',
  companyLogo: '',
  updateFeedUrl: '',
  defaultVatPercent: 25.5,
  defaultMarginPercent: 30,
  defaultValidityDays: 30,
  quoteNumberPrefix: 'TAR',
  currency: 'EUR',
};

const companyProfile: CompanyProfile = {
  companyName: 'Rakennus Oy',
  companyAddress: 'Testikatu 1',
  companyPhone: '+358401234567',
  companyEmail: 'myynti@rakennus.fi',
  companyLogo: '',
  businessId: '1234567-8',
  iban: 'FI2112345600000785',
  bic: 'NDEAFIHH',
  invoiceNumberPrefix: 'LASKU',
  defaultInvoiceDueDays: 14,
  lateInterestPercent: 8,
};

const customer: Customer = {
  id: 'customer-1',
  ownerUserId: 'user-1',
  name: 'Malliasiakas Oy',
  contactPerson: 'Maija Mallinen',
  email: 'maija@example.com',
  phone: '+35840111222',
  address: 'Asiakaskatu 2',
  businessId: '2345678-9',
  createdAt: '2026-04-03T00:00:00.000Z',
  updatedAt: '2026-04-03T00:00:00.000Z',
  createdByUserId: 'user-1',
  updatedByUserId: 'user-1',
};

const project: Project = {
  id: 'project-1',
  ownerUserId: 'user-1',
  customerId: 'customer-1',
  name: 'Kylpyhuoneremontti',
  site: 'Tyomaakatu 3',
  region: 'Etelä-Suomi',
  regionCoefficient: 1,
  notes: 'Kohde valmis laskutukseen.',
  createdAt: '2026-04-03T00:00:00.000Z',
  updatedAt: '2026-04-03T00:00:00.000Z',
  createdByUserId: 'user-1',
  updatedByUserId: 'user-1',
};

const quote: Quote = {
  id: 'quote-1',
  ownerUserId: 'user-1',
  projectId: 'project-1',
  title: 'Kylpyhuoneremontin tarjous',
  quoteNumber: 'TAR-20260403-AAA111',
  revisionNumber: 1,
  status: 'accepted',
  vatPercent: 25.5,
  validUntil: '2026-04-30',
  notes: 'Maksu 14 pv netto.',
  internalNotes: 'Sisainen huomio.',
  scheduleMilestones: [],
  discountType: 'none',
  discountValue: 0,
  projectCosts: 120,
  deliveryCosts: 50,
  installationCosts: 0,
  travelKilometers: 10,
  travelRatePerKm: 0.57,
  disposalCosts: 0,
  demolitionCosts: 0,
  protectionCosts: 0,
  permitCosts: 0,
  selectedMarginPercent: 30,
  pricingMode: 'margin',
  createdAt: '2026-04-03T00:00:00.000Z',
  updatedAt: '2026-04-03T00:00:00.000Z',
  createdByUserId: 'user-1',
  updatedByUserId: 'user-1',
};

const rows: QuoteRow[] = [
  {
    id: 'row-1',
    ownerUserId: 'user-1',
    quoteId: 'quote-1',
    sortOrder: 1,
    mode: 'product_installation',
    source: 'manual',
    productName: 'Laatoitus',
    productCode: 'LAT-1',
    description: 'Seinä- ja lattialaatoitus',
    quantity: 12,
    unit: 'm²',
    purchasePrice: 20,
    salesPrice: 35,
    installationPrice: 30,
    marginPercent: 30,
    regionMultiplier: 1,
    notes: '',
    createdAt: '2026-04-03T00:00:00.000Z',
    updatedAt: '2026-04-03T00:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
  },
];

describe('invoice helpers', () => {
  it('creates a Finnish reference number with a valid checksum digit', () => {
    const reference = createFinnishReferenceNumber('LASKU-20260403-ABC123');
    expect(reference).toMatch(/^\d+$/);
    expect(reference.length).toBeGreaterThan(4);

    const base = reference.slice(0, -1);
    const checkDigit = Number(reference.slice(-1));
    const weights = [7, 3, 1];
    const sum = base
      .split('')
      .reverse()
      .reduce((total, digit, index) => total + Number(digit) * weights[index % weights.length], 0);
    expect((sum + checkDigit) % 10).toBe(0);
  });

  it('creates an invoice snapshot from an accepted quote', () => {
    const invoice = createInvoiceSnapshotFromQuote({
      quote,
      rows,
      customer,
      project,
      settings,
      companyProfile,
      issueDate: '2026-04-03',
      invoiceNumber: 'LASKU-20260403-ABC123',
    });

    expect(invoice.status).toBe('draft');
    expect(invoice.sourceQuoteId).toBe('quote-1');
    expect(invoice.invoiceNumber).toBe('LASKU-20260403-ABC123');
    expect(invoice.referenceNumber).toMatch(/^\d+$/);
    expect(invoice.dueDate).toBe('2026-04-17');
    expect(invoice.company.iban).toBe('FI2112345600000785');
    expect(invoice.customer.name).toBe('Malliasiakas Oy');
    expect(invoice.rows).toHaveLength(1);
  });

  it('keeps invoice rows independent from later quote row changes', () => {
    const invoice = createInvoiceSnapshotFromQuote({
      quote,
      rows,
      customer,
      project,
      settings,
      companyProfile,
      issueDate: '2026-04-03',
      invoiceNumber: 'LASKU-20260403-ABC123',
    });

    rows[0].productName = 'Muokattu tarjousrivi';
    expect(invoice.rows[0].productName).toBe('Laatoitus');
  });

  it('rejects invoice creation from a non-accepted quote', () => {
    expect(() =>
      createInvoiceSnapshotFromQuote({
        quote: { ...quote, status: 'sent' },
        rows,
        customer,
        project,
        settings,
        companyProfile,
      })
    ).toThrow('Laskun voi luoda vain hyväksytystä tarjouksesta.');
  });
});