import { describe, expect, it } from 'vitest';

import { formatCurrency } from './calculations';
import { buildQuoteCustomerDocumentHtml, buildQuoteCustomerExcelData } from './export';
import type { Customer, Project, Quote, QuoteRow, QuoteTerms, Settings } from './types';

function createQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    title: 'Kylpyhuoneremontti',
    quoteNumber: 'TAR-2026-0001',
    revisionNumber: 1,
    status: 'draft',
    vatPercent: 25.5,
    validUntil: '2026-05-01',
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
    selectedMarginPercent: 30,
    pricingMode: 'manual',
    notes: '',
    internalNotes: '',
    scheduleMilestones: [],
    createdAt: '2026-04-04T08:00:00.000Z',
    updatedAt: '2026-04-04T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

function createRow(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: 'row-1',
    ownerUserId: 'user-1',
    quoteId: 'quote-1',
    sortOrder: 0,
    mode: 'product',
    pricingModel: 'unit_price',
    source: 'manual',
    productName: 'Laatta',
    productCode: 'LAA-1',
    description: 'Mattapintainen laatta',
    quantity: 2,
    unit: 'm2',
    purchasePrice: 50,
    salesPrice: 100,
    installationPrice: 0,
    marginPercent: 0,
    regionMultiplier: 1,
    priceAdjustment: 0,
    notes: '',
    manualSalesPrice: true,
    createdAt: '2026-04-04T08:00:00.000Z',
    updatedAt: '2026-04-04T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

const customer: Customer = {
  id: 'customer-1',
  ownerUserId: 'user-1',
  name: 'Malliasiakas Oy',
  address: 'Esimerkkikatu 1, Helsinki',
  createdAt: '2026-04-04T08:00:00.000Z',
  updatedAt: '2026-04-04T08:00:00.000Z',
};

const project: Project = {
  id: 'project-1',
  ownerUserId: 'user-1',
  customerId: 'customer-1',
  name: 'Malliprojekti',
  site: 'Esimerkkikatu 1 A 1',
  regionCoefficient: 1,
  createdAt: '2026-04-04T08:00:00.000Z',
  updatedAt: '2026-04-04T08:00:00.000Z',
};

const settings: Settings = {
  companyName: 'Projekta Oy',
  companyAddress: 'Testikatu 5',
  companyPhone: '+35840111222',
  companyEmail: 'myynti@projekta.fi',
  updateFeedUrl: 'https://projekta.fi/',
  defaultVatPercent: 25.5,
  defaultMarginPercent: 30,
  defaultValidityDays: 30,
  quoteNumberPrefix: 'TAR',
  currency: 'EUR',
};

const legacyTerms: QuoteTerms = {
  id: 'terms-1',
  name: 'B2B',
  slug: 'b2b',
  description: 'Vakioehdot',
  customerSegment: 'business',
  scopeType: 'installation_contract',
  contentMd: '# Hinnat\nYksikköhinnat ja kokonaishinnat määräytyvät tarjouksen mukaan. Ellei toisin ilmoiteta, hinnat ovat ALV 0 %.',
  isSystem: true,
  version: 1,
  isActive: true,
  sortOrder: 1,
  isDefault: false,
  createdAt: '2026-04-04T08:00:00.000Z',
  updatedAt: '2026-04-04T08:00:00.000Z',
};

describe('quote export', () => {
  it('uses a customer-facing unit price heading in the quote PDF', () => {
    const html = buildQuoteCustomerDocumentHtml(createQuote(), [createRow()], customer, project, undefined, settings);

    expect(html).toContain('<th class="number-cell">Yksikköhinta</th>');
    expect(html).not.toContain('Syötetty hinta');
  });

  it('renders the selected VAT rate and amount in the customer PDF summary and migrated terms', () => {
    const html = buildQuoteCustomerDocumentHtml(
      createQuote({ vatPercent: 10 }),
      [createRow()],
      customer,
      project,
      legacyTerms,
      settings
    );

    expect(html).toContain('ALV 10 %');
    expect(html).toContain(formatCurrency(20));
    expect(html).not.toContain('ALV 0 %');
  });

  it('builds customer Excel rows with the VAT label and derived unit price for line-total rows', () => {
    const data = buildQuoteCustomerExcelData(
      createQuote({ vatPercent: 25.5 }),
      [createRow({ pricingModel: 'line_total', quantity: 2, overridePrice: 180, salesPrice: 999 })],
      customer,
      project,
      undefined,
      settings
    );

    expect(data.lineRows[0]).toContain('Yksikköhinta (EUR)');
    expect(data.overviewRows.flat().join(' ')).toContain('ALV 25,5 %');
    expect(data.lineRows[1][6]).toBe(90);
  });

  it('keeps a tax-free quote at ALV 0 % in customer PDF and Excel exports', () => {
    const quote = createQuote({ vatPercent: 0 });
    const rows = [createRow({ quantity: 1, salesPrice: 250 })];
    const html = buildQuoteCustomerDocumentHtml(quote, rows, customer, project, undefined, settings);
    const data = buildQuoteCustomerExcelData(quote, rows, customer, project, undefined, settings);

    expect(html).toContain('ALV 0 %');
    expect(html).toContain(formatCurrency(0));
    expect(data.overviewRows.flat().join(' ')).toContain('ALV 0 %');
  });
});