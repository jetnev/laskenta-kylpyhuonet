import { describe, expect, it } from 'vitest';

import { buildDashboardData } from './dashboard-data';
import type { Customer, Invoice, Project, Quote, QuoteRow } from './types';

const TODAY = new Date('2026-04-06T12:00:00.000Z');

function createCustomer(id: string, name: string): Customer {
  return {
    id,
    ownerUserId: 'user-1',
    name,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
  };
}

function createProject(id: string, customerId: string, name: string): Project {
  return {
    id,
    ownerUserId: 'user-1',
    customerId,
    name,
    site: `${name} työmaa`,
    regionCoefficient: 1,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-02T08:00:00.000Z',
  };
}

function createQuote(id: string, projectId: string, title: string, status: Quote['status']): Quote {
  return {
    id,
    ownerUserId: 'user-1',
    projectId,
    title,
    quoteNumber: `TAR-${id}`,
    revisionNumber: 1,
    status,
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
    scheduleMilestones: [],
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-04T08:00:00.000Z',
  };
}

function createRow(id: string, quoteId: string): QuoteRow {
  return {
    id,
    ownerUserId: 'user-1',
    quoteId,
    sortOrder: 0,
    mode: 'product',
    pricingModel: 'unit_price',
    source: 'manual',
    productName: 'Laatta',
    productCode: 'LAA-1',
    quantity: 10,
    unit: 'm2',
    purchasePrice: 20,
    salesPrice: 35,
    installationPrice: 0,
    marginPercent: 0,
    priceAdjustment: 0,
    regionMultiplier: 1,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
  };
}

function createInvoice(id: string, projectId: string, customerId: string, sourceQuoteId: string, status: Invoice['status'], dueDate: string): Invoice {
  return {
    id,
    ownerUserId: 'user-1',
    projectId,
    customerId,
    sourceQuoteId,
    sourceQuoteNumber: `TAR-${sourceQuoteId}`,
    sourceQuoteRevisionNumber: 1,
    invoiceNumber: `L-${id}`,
    referenceNumber: `REF-${id}`,
    title: `Lasku ${id}`,
    status,
    issueDate: '2026-04-03',
    dueDate,
    paymentTermDays: 14,
    currency: 'EUR',
    vatPercent: 25.5,
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
    customer: {
      name: `Asiakas ${customerId}`,
    },
    project: {
      name: `Projekti ${projectId}`,
      site: 'Työmaa',
    },
    company: {
      companyName: 'Projekta Oy',
      companyAddress: 'Katu 1',
      companyPhone: '0400000000',
      companyEmail: 'info@projekta.fi',
    },
    rows: [createRow(`invoice-row-${id}`, sourceQuoteId)],
    createdAt: '2026-04-03T08:00:00.000Z',
    updatedAt: '2026-04-05T08:00:00.000Z',
  };
}

describe('buildDashboardData', () => {
  it('builds action-driven KPI, recent, and alert data from workspace records', () => {
    const customers = [createCustomer('customer-1', 'Asiakas Oy'), createCustomer('customer-2', 'Rakennus Oy')];
    const projects = [createProject('project-1', 'customer-1', 'Kylpyhuoneremontti'), createProject('project-2', 'customer-2', 'Saunaprojekti')];
    const quotes = [
      createQuote('quote-1', 'project-1', 'Kylpyhuoneen tarjous', 'draft'),
      createQuote('quote-2', 'project-2', 'Saunan tarjous', 'accepted'),
    ];
    const quoteRows = [createRow('row-1', 'quote-1'), createRow('row-2', 'quote-2')];
    const invoices = [createInvoice('invoice-1', 'project-1', 'customer-1', 'quote-1', 'issued', '2026-04-05')];

    const dashboard = buildDashboardData({
      customers,
      invoices,
      products: [],
      projects,
      quoteRows,
      quotes,
      today: TODAY,
    });

    expect(dashboard.kpis).toHaveLength(4);
    expect(dashboard.kpis[0]?.label).toBe('Avoimet');
    expect(dashboard.kpis[1]?.value).toBe('1');
    expect(dashboard.kpis[2]?.detail).toContain('1 hyväksyttyä tarjousta ilman laskua');
    expect(dashboard.nextAction?.title).toBe('Tarjous: Kylpyhuoneremontti');
    expect(dashboard.nextAction?.actions[0].label).toBe('Viimeistele tarjous');
    expect(dashboard.recentItems).toHaveLength(3);
    expect(dashboard.projectStats.find((item) => item.id === 'active-projects')?.value).toBe(2);
    expect(dashboard.alerts.some((item) => item.title.includes('erääntynyt'))).toBe(true);
  });
});