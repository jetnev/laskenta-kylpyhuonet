import type { Customer, Project } from './types';

export interface OwnershipUserLike {
  id: string;
  displayName: string;
}

export interface SalesOwnershipQuoteLike {
  ownerUserId?: string | null;
  subtotal: number;
}

export interface SalesOwnershipSummary {
  userId: string;
  displayName: string;
  customerCount: number;
  projectCount: number;
  quoteCount: number;
  totalQuoteValue: number;
}

export function getResponsibleUserLabel(
  ownerUserId: string | null | undefined,
  users: OwnershipUserLike[]
) {
  if (!ownerUserId) {
    return 'Ei vastuuhenkilöä';
  }

  return users.find((user) => user.id === ownerUserId)?.displayName || 'Tuntematon käyttäjä';
}

export function filterOwnedRecords<T extends { ownerUserId?: string | null }>(
  records: T[],
  ownerFilter: string
) {
  if (!ownerFilter || ownerFilter === 'all') {
    return records;
  }

  return records.filter((record) => record.ownerUserId === ownerFilter);
}

export function buildSalesOwnershipSummary(input: {
  customers: Array<Pick<Customer, 'ownerUserId'>>;
  projects: Array<Pick<Project, 'ownerUserId'>>;
  quotes: SalesOwnershipQuoteLike[];
  users: OwnershipUserLike[];
}) {
  const summaryByUserId = new Map<string, SalesOwnershipSummary>();

  input.users.forEach((user) => {
    summaryByUserId.set(user.id, {
      userId: user.id,
      displayName: user.displayName,
      customerCount: 0,
      projectCount: 0,
      quoteCount: 0,
      totalQuoteValue: 0,
    });
  });

  const ensureSummary = (ownerUserId?: string | null) => {
    const key = ownerUserId || '__unassigned__';
    if (!summaryByUserId.has(key)) {
      summaryByUserId.set(key, {
        userId: key,
        displayName: ownerUserId ? 'Tuntematon käyttäjä' : 'Ei vastuuhenkilöä',
        customerCount: 0,
        projectCount: 0,
        quoteCount: 0,
        totalQuoteValue: 0,
      });
    }

    return summaryByUserId.get(key)!;
  };

  input.customers.forEach((customer) => {
    ensureSummary(customer.ownerUserId).customerCount += 1;
  });

  input.projects.forEach((project) => {
    ensureSummary(project.ownerUserId).projectCount += 1;
  });

  input.quotes.forEach((quote) => {
    const summary = ensureSummary(quote.ownerUserId);
    summary.quoteCount += 1;
    summary.totalQuoteValue += quote.subtotal;
  });

  return Array.from(summaryByUserId.values())
    .filter((summary) =>
      summary.customerCount > 0 ||
      summary.projectCount > 0 ||
      summary.quoteCount > 0 ||
      summary.totalQuoteValue > 0
    )
    .sort((left, right) => right.totalQuoteValue - left.totalQuoteValue || left.displayName.localeCompare(right.displayName, 'fi'));
}
