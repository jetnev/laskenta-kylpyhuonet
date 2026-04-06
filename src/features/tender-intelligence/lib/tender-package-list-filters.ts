import type { TenderPackage } from '../types/tender-intelligence';
import type { TenderPackageLinkLookups } from './tender-package-links';

export type TenderPackageListFilter = 'all' | 'linked' | 'analysis' | 'review' | 'completed';

function normalizeSearchValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function buildTenderPackageSearchText(
  tenderPackage: TenderPackage,
  lookups: TenderPackageLinkLookups = {},
) {
  return [
    tenderPackage.name,
    tenderPackage.description ?? '',
    tenderPackage.linkedCustomerId ? lookups.customerNameById?.[tenderPackage.linkedCustomerId] ?? '' : '',
    tenderPackage.linkedProjectId ? lookups.projectNameById?.[tenderPackage.linkedProjectId] ?? '' : '',
    tenderPackage.linkedQuoteId ? lookups.quoteLabelById?.[tenderPackage.linkedQuoteId] ?? '' : '',
  ]
    .join(' ')
    .toLowerCase();
}

export function matchesTenderPackageListFilter(tenderPackage: TenderPackage, filter: TenderPackageListFilter) {
  switch (filter) {
    case 'linked':
      return Boolean(tenderPackage.linkedCustomerId || tenderPackage.linkedProjectId || tenderPackage.linkedQuoteId);
    case 'analysis':
      return tenderPackage.status === 'ready-for-analysis' || tenderPackage.status === 'analysis-pending';
    case 'review':
      return tenderPackage.status === 'review-needed' || tenderPackage.summary.reviewTaskCount > 0;
    case 'completed':
      return tenderPackage.status === 'completed';
    case 'all':
    default:
      return true;
  }
}

export function filterTenderPackages(options: {
  packages: TenderPackage[];
  filter: TenderPackageListFilter;
  search: string;
  lookups?: TenderPackageLinkLookups;
}) {
  const normalizedSearch = normalizeSearchValue(options.search);

  return options.packages.filter((tenderPackage) => {
    if (!matchesTenderPackageListFilter(tenderPackage, options.filter)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return buildTenderPackageSearchText(tenderPackage, options.lookups).includes(normalizedSearch);
  });
}