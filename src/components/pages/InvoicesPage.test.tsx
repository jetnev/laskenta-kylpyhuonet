import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dataHooks = vi.hoisted(() => ({
  useCustomers: vi.fn(),
  useInvoices: vi.fn(),
  useProjects: vi.fn(),
  useQuoteRows: vi.fn(),
  useQuotes: vi.fn(),
}));

vi.mock('../../hooks/use-data', () => ({
  useCustomers: dataHooks.useCustomers,
  useInvoices: dataHooks.useInvoices,
  useProjects: dataHooks.useProjects,
  useQuoteRows: dataHooks.useQuoteRows,
  useQuotes: dataHooks.useQuotes,
}));

vi.mock('../InvoiceEditor', () => ({
  default: () => null,
}));

import InvoicesPage from './InvoicesPage';

function createQuoteRow(quoteId: string) {
  return {
    id: `row-${quoteId}`,
    ownerUserId: 'user-1',
    quoteId,
    sortOrder: 0,
    mode: 'product' as const,
    pricingModel: 'unit_price' as const,
    source: 'manual' as const,
    productName: 'Seinälaatta 60x60',
    productCode: 'LAA-60',
    description: 'Testirivi',
    quantity: 18,
    unit: 'm2',
    purchasePrice: 20,
    salesPrice: 45,
    installationPrice: 0,
    marginPercent: 0,
    priceAdjustment: 0,
    regionMultiplier: 1,
    notes: '',
    manualSalesPrice: true,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
  };
}

function createAcceptedQuote(id: string, projectId: string, title: string, quoteNumber: string) {
  return {
    id,
    ownerUserId: 'user-1',
    projectId,
    title,
    quoteNumber,
    revisionNumber: 1,
    status: 'accepted' as const,
    vatPercent: 25.5,
    acceptedAt: '2026-04-04T10:00:00.000Z',
    discountType: 'none' as const,
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
    pricingMode: 'manual' as const,
    scheduleMilestones: [],
    createdAt: '2026-04-02T08:00:00.000Z',
    updatedAt: '2026-04-04T10:00:00.000Z',
  };
}

function renderInvoicesPage() {
  return renderToStaticMarkup(<InvoicesPage onNavigate={() => undefined} />);
}

describe('InvoicesPage', () => {
  beforeEach(() => {
    dataHooks.useQuotes.mockReturnValue({ quotes: [] });
    dataHooks.useQuoteRows.mockReturnValue({ getRowsForQuote: () => [] });
    dataHooks.useCustomers.mockReturnValue({ getCustomer: () => undefined });
    dataHooks.useProjects.mockReturnValue({ getProject: () => undefined });
    dataHooks.useInvoices.mockReturnValue({
      invoices: [],
      createInvoiceFromQuote: vi.fn(),
      deleteInvoice: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders guided empty states when there are no eligible quotes or invoices', () => {
    const markup = renderInvoicesPage();

    expect(markup).toContain('Snapshot-laskutus');
    expect(markup).toContain('Miten laskutus käynnistyy');
    expect(markup).toContain('Laskutettavia hyväksyttyjä tarjouksia ei vielä ole');
    expect(markup).toContain('Ensimmäinen lasku syntyy hyväksytystä tarjouksesta');
    expect(markup).toContain('Avaa projektit');
  });

  it('renders dashboard metrics, pending quotes, and recent invoices when data exists', () => {
    const quote = {
      id: 'quote-1',
      ownerUserId: 'user-1',
      projectId: 'project-1',
      title: 'Kylpyhuoneen perusremontti',
      quoteNumber: 'TAR-2026-15',
      revisionNumber: 1,
      status: 'accepted' as const,
      vatPercent: 25.5,
      acceptedAt: '2026-04-04T10:00:00.000Z',
      discountType: 'none' as const,
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
      pricingMode: 'manual' as const,
      scheduleMilestones: [],
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: '2026-04-04T10:00:00.000Z',
    };

    const invoiceRows = [createQuoteRow('quote-2')];
    const customer = {
      id: 'customer-1',
      ownerUserId: 'user-1',
      name: 'Asiakas Oy',
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-01T08:00:00.000Z',
    };
    const project = {
      id: 'project-1',
      ownerUserId: 'user-1',
      customerId: 'customer-1',
      name: 'Munkkivuoren kohde',
      site: 'Työmaa 1',
      regionCoefficient: 1,
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-03T08:00:00.000Z',
    };
    const invoices = [
      {
        id: 'invoice-1',
        ownerUserId: 'user-1',
        createdAt: '2026-04-04T08:00:00.000Z',
        updatedAt: '2026-04-05T12:00:00.000Z',
        projectId: 'project-1',
        customerId: 'customer-1',
        sourceQuoteId: 'quote-2',
        sourceQuoteNumber: 'TAR-2026-14',
        sourceQuoteRevisionNumber: 1,
        invoiceNumber: 'LASKU-20260405-0001',
        referenceNumber: '1234561',
        title: 'Lasku: Saunaremontti',
        status: 'draft' as const,
        issueDate: '2026-04-05',
        dueDate: '2026-04-19',
        paymentTermDays: 14,
        currency: 'EUR',
        vatPercent: 25.5,
        discountType: 'none' as const,
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
        },
        project: {
          name: 'Munkkivuoren kohde',
          site: 'Työmaa 1',
        },
        company: {
          companyName: 'Testi Oy',
          companyAddress: 'Testikatu 1',
          companyPhone: '+358401234567',
          companyEmail: 'myynti@testi.fi',
        },
        rows: invoiceRows,
      },
      {
        id: 'invoice-2',
        ownerUserId: 'user-1',
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-03T09:00:00.000Z',
        projectId: 'project-1',
        customerId: 'customer-1',
        sourceQuoteId: 'quote-3',
        sourceQuoteNumber: 'TAR-2026-13',
        sourceQuoteRevisionNumber: 1,
        invoiceNumber: 'LASKU-20260403-0002',
        referenceNumber: '1234562',
        title: 'Lasku: Pintaremontti',
        status: 'issued' as const,
        issueDate: '2026-03-20',
        dueDate: '2026-03-31',
        paymentTermDays: 11,
        currency: 'EUR',
        vatPercent: 25.5,
        discountType: 'none' as const,
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
        },
        project: {
          name: 'Munkkivuoren kohde',
          site: 'Työmaa 1',
        },
        company: {
          companyName: 'Testi Oy',
          companyAddress: 'Testikatu 1',
          companyPhone: '+358401234567',
          companyEmail: 'myynti@testi.fi',
        },
        rows: invoiceRows,
      },
    ];

    dataHooks.useQuotes.mockReturnValue({ quotes: [quote] });
    dataHooks.useQuoteRows.mockReturnValue({
      getRowsForQuote: (quoteId: string) => (quoteId === 'quote-1' ? [createQuoteRow('quote-1')] : []),
    });
    dataHooks.useCustomers.mockReturnValue({
      getCustomer: (customerId: string) => (customerId === 'customer-1' ? customer : undefined),
    });
    dataHooks.useProjects.mockReturnValue({
      getProject: (projectId: string) => (projectId === 'project-1' ? project : undefined),
    });
    dataHooks.useInvoices.mockReturnValue({
      invoices,
      createInvoiceFromQuote: vi.fn(),
      deleteInvoice: vi.fn(),
    });

    const markup = renderInvoicesPage();

    expect(markup).toContain('Hyväksytyt tarjoukset ilman laskua');
    expect(markup).toContain('Kylpyhuoneen perusremontti');
    expect(markup).toContain('Luonnokset');
    expect(markup).toContain('LASKU-20260405-0001');
    expect(markup).toContain('Viimeksi päivitetyt laskut');
    expect(markup).toContain('Näytä erääntyneet');
  });

  it('surfaces accepted quotes whose project or customer reference is missing', () => {
    const project = {
      id: 'project-2',
      ownerUserId: 'user-1',
      customerId: 'customer-2',
      name: 'Puuttuva asiakas -kohde',
      site: 'Työmaa 2',
      regionCoefficient: 1,
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-03T08:00:00.000Z',
    };
    const quotes = [
      createAcceptedQuote('quote-missing-project', 'missing-project', 'Orpo tarjous', 'TAR-2026-16'),
      createAcceptedQuote('quote-missing-customer', 'project-2', 'Asiakas puuttuu tarjoukselta', 'TAR-2026-17'),
    ];

    dataHooks.useQuotes.mockReturnValue({ quotes });
    dataHooks.useQuoteRows.mockReturnValue({
      getRowsForQuote: (quoteId: string) => [createQuoteRow(quoteId)],
    });
    dataHooks.useProjects.mockReturnValue({
      getProject: (projectId: string) => (projectId === 'project-2' ? project : undefined),
    });
    dataHooks.useCustomers.mockReturnValue({
      getCustomer: () => undefined,
    });

    const markup = renderInvoicesPage();

    expect(markup).toContain('Hyväksytyissä tarjouksissa on puuttuvia viitteitä');
    expect(markup).toContain('2 hyväksyttyä tarjousta ei voi näyttää laskutettavana');
    expect(markup).toContain('Orpo tarjous');
    expect(markup).toContain('Asiakas puuttuu tarjoukselta');
    expect(markup).toContain('Projekti puuttuu');
    expect(markup).toContain('Asiakas puuttuu');
    expect(markup).toContain('Avaa projektityötila');
  });
});