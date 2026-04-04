import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const useProductsMock = vi.fn();
const useProjectsMock = vi.fn();
const useQuotesMock = vi.fn();
const useCustomersMock = vi.fn();
const useQuoteRowsMock = vi.fn();

vi.mock('../../hooks/use-data', () => ({
  useProducts: () => useProductsMock(),
  useProjects: () => useProjectsMock(),
  useQuotes: () => useQuotesMock(),
  useCustomers: () => useCustomersMock(),
  useQuoteRows: () => useQuoteRowsMock(),
}));

vi.mock('../../lib/calculations', () => ({
  calculateQuote: vi.fn(() => ({ total: 1200 })),
  formatCurrency: (value: number) => `${value.toLocaleString('fi-FI')} €`,
}));

vi.mock('../DeadlineNotifications', () => ({
  default: () => React.createElement('div', null, 'deadline-notifications'),
}));

import Dashboard from './Dashboard';

beforeEach(() => {
  useProductsMock.mockReturnValue({ products: [] });
  useProjectsMock.mockReturnValue({ projects: [] });
  useQuotesMock.mockReturnValue({ quotes: [] });
  useCustomersMock.mockReturnValue({ customers: [] });
  useQuoteRowsMock.mockReturnValue({ getRowsForQuote: vi.fn(() => []) });
});

describe('Dashboard', () => {
  it('renders the start state when no workspace data exists', () => {
    const html = renderToStaticMarkup(<Dashboard />);

    expect(html).toContain('Uusi työ alkaa projektista');
    expect(html).toContain('Avaa projektityötila');
    expect(html).not.toContain('Jatka keskeneräisiä tarjouksia');
  });

  it('renders the workspace state when projects and quotes exist', () => {
    useProjectsMock.mockReturnValue({
      projects: [
        {
          id: 'project-1',
          customerId: 'customer-1',
          name: 'Pääurakka',
          site: 'Helsinki',
          regionCoefficient: 1,
          updatedAt: '2026-04-04T10:00:00.000Z',
        },
      ],
    });
    useCustomersMock.mockReturnValue({
      customers: [
        {
          id: 'customer-1',
          name: 'Asiakas Oy',
        },
      ],
    });
    useQuotesMock.mockReturnValue({
      quotes: [
        {
          id: 'quote-1',
          projectId: 'project-1',
          title: 'Pääurakan tarjous',
          quoteNumber: 'TAR-1001',
          revisionNumber: 1,
          status: 'draft',
          validUntil: '2026-05-01',
          updatedAt: '2026-04-04T12:00:00.000Z',
        },
      ],
    });
    useQuoteRowsMock.mockReturnValue({
      getRowsForQuote: vi.fn(() => [{ id: 'row-1', mode: 'product' }]),
    });

    const html = renderToStaticMarkup(<Dashboard />);

    expect(html).toContain('Jatka keskeneräisiä tarjouksia');
    expect(html).toContain('Viimeisimmät tarjoukset');
    expect(html).toContain('Pääurakan tarjous');
  });
});
