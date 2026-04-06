import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dataHooks = vi.hoisted(() => ({
  useCustomers: vi.fn(),
  useInvoices: vi.fn(),
  useProducts: vi.fn(),
  useProjects: vi.fn(),
  useQuoteRows: vi.fn(),
  useQuotes: vi.fn(),
}));

vi.mock('../../hooks/use-data', () => ({
  useCustomers: dataHooks.useCustomers,
  useInvoices: dataHooks.useInvoices,
  useProducts: dataHooks.useProducts,
  useProjects: dataHooks.useProjects,
  useQuoteRows: dataHooks.useQuoteRows,
  useQuotes: dataHooks.useQuotes,
}));

import Dashboard from './Dashboard';

function createDashboardState() {
  return {
    customers: [],
    invoices: [],
    products: [],
    projects: [],
    quotes: [],
    rows: [],
  };
}

function createWorkspaceState() {
  return {
    customers: [
      {
        id: 'customer-1',
        ownerUserId: 'user-1',
        name: 'Asiakas Oy',
        contactPerson: 'Aino Asiakas',
        email: 'aino@example.com',
        phone: '+35840111222',
        address: 'Asiakaskatu 1',
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-01T08:00:00.000Z',
      },
    ],
    invoices: [],
    products: [
      {
        id: 'product-1',
        code: 'LAA-1',
        name: 'Laatta',
        unit: 'm2',
        purchasePrice: 20,
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-01T08:00:00.000Z',
      },
    ],
    projects: [
      {
        id: 'project-1',
        ownerUserId: 'user-1',
        customerId: 'customer-1',
        name: 'Kylpyhuoneremontti',
        site: 'Työmaa 12',
        regionCoefficient: 1,
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
      },
    ],
    quotes: [
      {
        id: 'quote-1',
        ownerUserId: 'user-1',
        projectId: 'project-1',
        title: 'Kylpyhuoneen tarjous',
        quoteNumber: 'TAR-1',
        revisionNumber: 1,
        status: 'draft',
        vatPercent: 25.5,
        validUntil: '2026-05-10',
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
        updatedAt: '2026-04-03T08:00:00.000Z',
      },
    ],
    rows: [
      {
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
      },
    ],
  };
}

function renderDashboard() {
  return renderToStaticMarkup(<Dashboard onNavigate={() => undefined} />);
}

describe('Dashboard', () => {
  beforeEach(() => {
    const emptyState = createDashboardState();
    dataHooks.useCustomers.mockReturnValue({ customers: emptyState.customers });
    dataHooks.useInvoices.mockReturnValue({ invoices: emptyState.invoices });
    dataHooks.useProducts.mockReturnValue({ products: emptyState.products });
    dataHooks.useProjects.mockReturnValue({ projects: emptyState.projects });
    dataHooks.useQuoteRows.mockReturnValue({ rows: emptyState.rows });
    dataHooks.useQuotes.mockReturnValue({ quotes: emptyState.quotes });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the onboarding empty state when workspace data is missing', () => {
    const markup = renderDashboard();

    expect(markup).toContain('Työtila tänään');
    expect(markup).toContain('Aloita ensimmäisestä tarjouksesta');
    expect(markup).toContain('Aloita tästä');
    expect(markup).toContain('Hae projekti, tarjous tai asiakas');
  });

  it('renders prioritized work guidance when workspace data exists', () => {
    const state = createWorkspaceState();
    dataHooks.useCustomers.mockReturnValue({ customers: state.customers });
    dataHooks.useInvoices.mockReturnValue({ invoices: state.invoices });
    dataHooks.useProducts.mockReturnValue({ products: state.products });
    dataHooks.useProjects.mockReturnValue({ projects: state.projects });
    dataHooks.useQuoteRows.mockReturnValue({ rows: state.rows });
    dataHooks.useQuotes.mockReturnValue({ quotes: state.quotes });

    const markup = renderDashboard();

    expect(markup).toContain('Työtila tänään');
    expect(markup).toContain('Seuraava tärkein työ');
    expect(markup).toContain('Tarjous: Kylpyhuoneremontti');
    expect(markup).toContain('Avoimet');
    expect(markup).toContain('Päivän tehtävät');
    expect(markup).toContain('Projektien tilanne');
    expect(markup).toContain('Määräajat ja esteet');
    expect(markup).toContain('Viimeistele tarjous');
    expect(markup).toContain('Jatka työskentelyä');
    expect(markup).toContain('Avaa tarjous');
  });
});
