import { describe, expect, it } from 'vitest';
import { buildSalesOwnershipSummary, filterOwnedRecords, getResponsibleUserLabel } from './ownership';

describe('ownership helpers', () => {
  const users = [
    { id: 'user-1', displayName: 'Aada Myyjä' },
    { id: 'user-2', displayName: 'Beni Myyjä' },
  ];

  it('resolves responsible user names safely', () => {
    expect(getResponsibleUserLabel('user-1', users)).toBe('Aada Myyjä');
    expect(getResponsibleUserLabel(undefined, users)).toBe('Ei vastuuhenkilöä');
    expect(getResponsibleUserLabel('missing', users)).toBe('Tuntematon käyttäjä');
  });

  it('filters records by responsible user', () => {
    const records = [
      { id: '1', ownerUserId: 'user-1' },
      { id: '2', ownerUserId: 'user-2' },
      { id: '3', ownerUserId: 'user-1' },
    ];

    expect(filterOwnedRecords(records, 'all')).toHaveLength(3);
    expect(filterOwnedRecords(records, 'user-1').map((record) => record.id)).toEqual(['1', '3']);
  });

  it('builds seller summaries from customers, projects and quotes', () => {
    const summary = buildSalesOwnershipSummary({
      users,
      customers: [
        { ownerUserId: 'user-1' },
        { ownerUserId: 'user-1' },
        { ownerUserId: 'user-2' },
      ],
      projects: [
        { ownerUserId: 'user-1' },
        { ownerUserId: 'user-2' },
      ],
      quotes: [
        { ownerUserId: 'user-1', subtotal: 1200 },
        { ownerUserId: 'user-1', subtotal: 800 },
        { ownerUserId: 'user-2', subtotal: 500 },
      ],
    });

    expect(summary).toEqual([
      {
        userId: 'user-1',
        displayName: 'Aada Myyjä',
        customerCount: 2,
        projectCount: 1,
        quoteCount: 2,
        totalQuoteValue: 2000,
      },
      {
        userId: 'user-2',
        displayName: 'Beni Myyjä',
        customerCount: 1,
        projectCount: 1,
        quoteCount: 1,
        totalQuoteValue: 500,
      },
    ]);
  });
});
