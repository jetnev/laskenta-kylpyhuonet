import { describe, expect, it } from 'vitest';

import { buildProjectWorkspaceContext, buildWorkspaceActionCenter, resolveWorkspaceTaskExecution } from './workspace-flow';
import type { Customer, Invoice, Product, Project, Quote, QuoteRow } from './types';

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'customer-1',
    ownerUserId: 'user-1',
    name: 'Asiakas Oy',
    contactPerson: 'Aino Asiakas',
    email: 'aino@example.com',
    phone: '+35840111222',
    address: 'Asiakaskatu 1',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    ownerUserId: 'user-1',
    customerId: 'customer-1',
    name: 'Kylpyhuoneremontti',
    site: 'Työmaa 12',
    regionCoefficient: 1,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-02T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

function createQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    title: 'Kylpyhuoneen tarjous',
    quoteNumber: 'TAR-1',
    revisionNumber: 1,
    status: 'draft',
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
    selectedMarginPercent: 30,
    pricingMode: 'manual',
    scheduleMilestones: [],
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-02T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

function createQuoteRow(overrides: Partial<QuoteRow> = {}): QuoteRow {
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
    description: 'Testirivi',
    quantity: 10,
    unit: 'm2',
    purchasePrice: 20,
    salesPrice: 35,
    installationPrice: 0,
    marginPercent: 0,
    priceAdjustment: 0,
    regionMultiplier: 1,
    notes: '',
    manualSalesPrice: true,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

function createInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    customerId: 'customer-1',
    sourceQuoteId: 'quote-1',
    sourceQuoteNumber: 'TAR-1',
    sourceQuoteRevisionNumber: 1,
    invoiceNumber: 'LASKU-1',
    referenceNumber: '1234561',
    title: 'Lasku: Kylpyhuoneen tarjous',
    status: 'draft',
    issueDate: '2026-04-01',
    dueDate: '2026-04-14',
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
      name: 'Asiakas Oy',
      contactPerson: 'Aino Asiakas',
      email: 'aino@example.com',
      phone: '+35840111222',
      address: 'Asiakaskatu 1',
      businessId: '1234567-8',
    },
    project: {
      name: 'Kylpyhuoneremontti',
      site: 'Työmaa 12',
      region: 'Pääkaupunkiseutu',
      notes: '',
    },
    company: {
      companyName: 'Rakennus Oy',
      companyAddress: 'Yrityskatu 1',
      companyPhone: '+358401234567',
      companyEmail: 'info@example.com',
      companyLogo: '',
      businessId: '7654321-0',
      iban: 'FI2112345600000785',
      bic: 'NDEAFIHH',
      invoiceNumberPrefix: 'LASKU',
      defaultInvoiceDueDays: 14,
      lateInterestPercent: 8,
    },
    rows: [createQuoteRow()],
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-02T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    code: 'LAA-1',
    name: 'Laatta',
    unit: 'm2',
    purchasePrice: 20,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

describe('buildWorkspaceActionCenter', () => {
  it('prioritizes overdue schedule milestones ahead of invoice tasks', () => {
    const customer = createCustomer();
    const project = createProject();
    const quote = createQuote({
      id: 'quote-deadline',
      status: 'accepted',
      scheduleMilestones: [
        {
          id: 'milestone-1',
          title: 'Työmaan aloitus',
          type: 'start',
          targetDate: '2026-04-08',
        },
      ],
    });
    const invoice = createInvoice({
      id: 'invoice-overdue',
      status: 'issued',
      sourceQuoteId: quote.id,
      dueDate: '2026-04-01',
      updatedAt: '2026-04-09T08:00:00.000Z',
    });

    const actionCenter = buildWorkspaceActionCenter({
      customers: [customer],
      invoices: [invoice],
      products: [createProduct()],
      projects: [project],
      quoteRows: [createQuoteRow({ quoteId: quote.id })],
      quotes: [quote],
      today: new Date('2026-04-10T12:00:00.000Z'),
    });

    expect(actionCenter.nextAction?.id).toBe('deadline-overdue-quote-deadline-milestone-1');
    expect(actionCenter.tasks[1]?.id).toBe('invoice-overdue-invoice-overdue');
    expect(actionCenter.summary.deadlines).toBe(1);
    expect(actionCenter.summary.invoiceActions).toBe(1);
  });

  it('ranks ready draft work above sent quote follow-up', () => {
    const customer = createCustomer();
    const project = createProject();
    const readyDraft = createQuote({
      id: 'quote-ready',
      title: 'Valmis luonnos',
      validUntil: '2026-05-10',
      status: 'draft',
      updatedAt: '2026-04-09T08:00:00.000Z',
    });
    const sentQuote = createQuote({
      id: 'quote-follow-up',
      title: 'Seurantaa odottava tarjous',
      status: 'sent',
      sentAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-08T08:00:00.000Z',
    });

    const actionCenter = buildWorkspaceActionCenter({
      customers: [customer],
      invoices: [],
      products: [createProduct()],
      projects: [project],
      quoteRows: [
        createQuoteRow({ quoteId: readyDraft.id }),
        createQuoteRow({ id: 'row-2', quoteId: sentQuote.id }),
      ],
      quotes: [readyDraft, sentQuote],
      today: new Date('2026-04-10T12:00:00.000Z'),
    });

    expect(actionCenter.tasks.slice(0, 2).map((task) => task.id)).toEqual([
      'quote-ready-quote-ready',
      'quote-followup-quote-follow-up',
    ]);
    expect(actionCenter.summary.blockedDrafts).toBe(1);
    expect(actionCenter.summary.followUps).toBe(1);
  });

  it('returns an empty action center when workspace data does not exist yet', () => {
    const actionCenter = buildWorkspaceActionCenter({
      customers: [],
      invoices: [],
      products: [],
      projects: [],
      quoteRows: [],
      quotes: [],
      today: new Date('2026-04-10T12:00:00.000Z'),
    });

    expect(actionCenter.hasWorkspace).toBe(false);
    expect(actionCenter.nextAction).toBeNull();
    expect(actionCenter.tasks).toEqual([]);
    expect(actionCenter.hasProductGap).toBe(true);
  });
});

describe('buildProjectWorkspaceContext', () => {
  it('summarizes invoice state and accepted quotes without invoices per project', () => {
    const customer = createCustomer();
    const project = createProject();
    const acceptedWithoutInvoice = createQuote({
      id: 'quote-no-invoice',
      status: 'accepted',
      updatedAt: '2026-04-07T08:00:00.000Z',
    });
    const acceptedWithDraftInvoice = createQuote({
      id: 'quote-with-invoice',
      status: 'accepted',
      updatedAt: '2026-04-08T08:00:00.000Z',
    });
    const draftInvoice = createInvoice({
      id: 'invoice-draft',
      status: 'draft',
      sourceQuoteId: acceptedWithDraftInvoice.id,
      updatedAt: '2026-04-09T08:00:00.000Z',
    });

    const context = buildProjectWorkspaceContext(project.id, {
      customers: [customer],
      invoices: [draftInvoice],
      products: [createProduct()],
      projects: [project],
      quoteRows: [
        createQuoteRow({ quoteId: acceptedWithoutInvoice.id }),
        createQuoteRow({ id: 'row-2', quoteId: acceptedWithDraftInvoice.id }),
      ],
      quotes: [acceptedWithoutInvoice, acceptedWithDraftInvoice],
      today: new Date('2026-04-10T12:00:00.000Z'),
    });

    expect(context.nextAction?.id).toBe('invoice-draft-invoice-draft');
    expect(context.latestInvoice?.id).toBe('invoice-draft');
    expect(context.draftInvoiceCount).toBe(1);
    expect(context.overdueInvoiceCount).toBe(0);
    expect(context.acceptedWithoutInvoiceCount).toBe(1);
  });

  it('marks an empty project next action as create-quote work', () => {
    const customer = createCustomer();
    const project = createProject();

    const context = buildProjectWorkspaceContext(project.id, {
      customers: [customer],
      invoices: [],
      products: [createProduct()],
      projects: [project],
      quoteRows: [],
      quotes: [],
      today: new Date('2026-04-10T12:00:00.000Z'),
    });

    expect(context.nextAction).toMatchObject({
      id: 'project-empty-project-1',
      ctaLabel: 'Luo tarjous',
      actionKind: 'create-quote',
      projectId: project.id,
    });
    expect(resolveWorkspaceTaskExecution(context.nextAction!)).toEqual({
      kind: 'create-quote',
      projectId: project.id,
    });
  });

  it('keeps navigation tasks as navigation actions', () => {
    const customer = createCustomer();
    const project = createProject();
    const acceptedQuote = createQuote({
      id: 'quote-accepted',
      status: 'accepted',
      updatedAt: '2026-04-07T08:00:00.000Z',
    });

    const context = buildProjectWorkspaceContext(project.id, {
      customers: [customer],
      invoices: [],
      products: [createProduct()],
      projects: [project],
      quoteRows: [createQuoteRow({ quoteId: acceptedQuote.id })],
      quotes: [acceptedQuote],
      today: new Date('2026-04-10T12:00:00.000Z'),
    });

    expect(resolveWorkspaceTaskExecution(context.nextAction!)).toEqual({
      kind: 'navigate',
      target: { page: 'invoices' },
    });
  });
});