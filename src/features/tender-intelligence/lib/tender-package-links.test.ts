import { describe, expect, it } from 'vitest';

import type { Customer, Project, Quote } from '@/lib/types';

import { buildTenderPackageCreateInput, buildTenderPackageLinkItems } from './tender-package-links';

const customers: Customer[] = [
  {
    id: 'customer-1',
    name: 'As Oy Aurinkopiha',
    ownerUserId: 'user-1',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-01T12:00:00.000Z',
  },
  {
    id: 'customer-2',
    name: 'Kiinteistö Oy Satamapiha',
    ownerUserId: 'user-1',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-01T12:00:00.000Z',
  },
];

const projects: Project[] = [
  {
    id: 'project-1',
    customerId: 'customer-1',
    name: 'Aurinkopihan linjasaneeraus',
    site: 'Helsinki',
    regionCoefficient: 1,
    ownerUserId: 'user-1',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-01T12:00:00.000Z',
  },
];

const quotes: Quote[] = [
  {
    id: 'quote-1',
    projectId: 'project-1',
    title: 'Tarjous A',
    quoteNumber: 'TAR-2026-001',
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
    pricingMode: 'margin',
    ownerUserId: 'user-1',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-01T12:00:00.000Z',
  },
];

describe('tender-package-links', () => {
  it('derives customer from the selected project', () => {
    const result = buildTenderPackageCreateInput({
      values: {
        name: 'Aurinkopiha / tarjouspyyntö',
        customerId: '',
        projectId: 'project-1',
        quoteId: '',
      },
      customers,
      projects,
      quotes,
    });

    expect(result).toEqual({
      name: 'Aurinkopiha / tarjouspyyntö',
      linkedCustomerId: 'customer-1',
      linkedProjectId: 'project-1',
      linkedQuoteId: null,
    });
  });

  it('derives project and customer from the selected quote', () => {
    const result = buildTenderPackageCreateInput({
      values: {
        name: 'Aurinkopiha / tarjouspyyntö',
        customerId: '',
        projectId: '',
        quoteId: 'quote-1',
      },
      customers,
      projects,
      quotes,
    });

    expect(result).toEqual({
      name: 'Aurinkopiha / tarjouspyyntö',
      linkedCustomerId: 'customer-1',
      linkedProjectId: 'project-1',
      linkedQuoteId: 'quote-1',
    });
  });

  it('rejects a customer and project mismatch', () => {
    expect(() => buildTenderPackageCreateInput({
      values: {
        name: 'Virheellinen linkitys',
        customerId: 'customer-2',
        projectId: 'project-1',
        quoteId: '',
      },
      customers,
      projects,
      quotes,
    })).toThrow('Valittu projekti ei kuulu valitulle asiakkaalle.');
  });

  it('builds visible link items from stored linkage ids', () => {
    const result = buildTenderPackageLinkItems({
      linkedCustomerId: 'customer-1',
      linkedProjectId: 'project-1',
      linkedQuoteId: 'quote-1',
    }, {
      customerNameById: { 'customer-1': 'As Oy Aurinkopiha' },
      projectNameById: { 'project-1': 'Aurinkopihan linjasaneeraus' },
      quoteLabelById: { 'quote-1': 'TAR-2026-001 • Tarjous A' },
    });

    expect(result).toEqual([
      { key: 'customer', label: 'Asiakas', value: 'As Oy Aurinkopiha' },
      { key: 'project', label: 'Projekti', value: 'Aurinkopihan linjasaneeraus' },
      { key: 'quote', label: 'Tarjous', value: 'TAR-2026-001 • Tarjous A' },
    ]);
  });
});