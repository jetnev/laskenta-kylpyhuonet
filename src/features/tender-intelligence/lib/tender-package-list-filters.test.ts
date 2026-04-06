import { describe, expect, it } from 'vitest';

import type { TenderPackage } from '../types/tender-intelligence';

import { buildTenderPackageSearchText, filterTenderPackages, matchesTenderPackageListFilter } from './tender-package-list-filters';

const packages: TenderPackage[] = [
  {
    id: 'package-1',
    name: 'Aurinkopiha / tarjouspyyntö',
    description: 'Kylpyhuoneremontin tarjouspyyntö',
    status: 'review-needed',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-03T12:00:00.000Z',
    createdByUserId: 'user-1',
    linkedCustomerId: 'customer-1',
    linkedProjectId: 'project-1',
    linkedQuoteId: 'quote-1',
    currentJobId: null,
    summary: {
      documentCount: 2,
      requirementCount: 3,
      missingItemCount: 1,
      riskCount: 0,
      reviewTaskCount: 2,
    },
  },
  {
    id: 'package-2',
    name: 'Satamapiha / analyysi',
    description: null,
    status: 'analysis-pending',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-04T12:00:00.000Z',
    createdByUserId: 'user-1',
    linkedCustomerId: null,
    linkedProjectId: null,
    linkedQuoteId: null,
    currentJobId: null,
    summary: {
      documentCount: 1,
      requirementCount: 0,
      missingItemCount: 0,
      riskCount: 0,
      reviewTaskCount: 0,
    },
  },
  {
    id: 'package-3',
    name: 'Valmis paketti',
    description: null,
    status: 'completed',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-05T12:00:00.000Z',
    createdByUserId: 'user-1',
    linkedCustomerId: 'customer-2',
    linkedProjectId: null,
    linkedQuoteId: null,
    currentJobId: null,
    summary: {
      documentCount: 4,
      requirementCount: 8,
      missingItemCount: 0,
      riskCount: 0,
      reviewTaskCount: 0,
    },
  },
];

describe('tender-package-list-filters', () => {
  it('builds search text from package name, description and linked context', () => {
    const result = buildTenderPackageSearchText(packages[0], {
      customerNameById: { 'customer-1': 'As Oy Aurinkopiha' },
      projectNameById: { 'project-1': 'Aurinkopihan linjasaneeraus' },
      quoteLabelById: { 'quote-1': 'TAR-2026-001 • Tarjous A' },
    });

    expect(result).toContain('aurinkopiha / tarjouspyyntö');
    expect(result).toContain('as oy aurinkopiha');
    expect(result).toContain('tar-2026-001');
  });

  it('recognizes the operational package filters', () => {
    expect(matchesTenderPackageListFilter(packages[0], 'review')).toBe(true);
    expect(matchesTenderPackageListFilter(packages[1], 'analysis')).toBe(true);
    expect(matchesTenderPackageListFilter(packages[2], 'completed')).toBe(true);
    expect(matchesTenderPackageListFilter(packages[1], 'linked')).toBe(false);
  });

  it('filters packages by search term and selected filter', () => {
    const result = filterTenderPackages({
      packages,
      filter: 'linked',
      search: 'aurinkopiha',
      lookups: {
        customerNameById: { 'customer-1': 'As Oy Aurinkopiha', 'customer-2': 'Kiinteistö Oy Satamapiha' },
        projectNameById: { 'project-1': 'Aurinkopihan linjasaneeraus' },
        quoteLabelById: { 'quote-1': 'TAR-2026-001 • Tarjous A' },
      },
    });

    expect(result.map((item) => item.id)).toEqual(['package-1']);
  });
});