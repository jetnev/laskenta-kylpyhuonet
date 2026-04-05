import { buildSearchableText, normalizeComparableText } from './catalog-types';
import type { Product } from './types';

type ProductSearchSource = Partial<
  Pick<
    Product,
    | 'code'
    | 'internalCode'
    | 'name'
    | 'normalizedName'
    | 'description'
    | 'category'
    | 'brand'
    | 'manufacturer'
    | 'manufacturerSku'
    | 'ean'
    | 'searchableText'
    | 'sourceNames'
    | 'tags'
  >
>;

const SEARCH_SPACE_PATTERN = /\s+/g;

export type NormalizedProductSearchQuery = {
  normalizedText: string;
  compactText: string;
};

export function normalizeProductSearchQuery(query: string): NormalizedProductSearchQuery {
  const normalizedText = normalizeComparableText(query);

  return {
    normalizedText,
    compactText: normalizedText.replace(SEARCH_SPACE_PATTERN, ''),
  };
}

export function buildProductSearchText(
  product: ProductSearchSource,
  options?: { includeStoredText?: boolean }
) {
  return buildSearchableText([
    product.code,
    product.internalCode,
    product.name,
    product.normalizedName,
    product.description,
    product.category,
    product.brand,
    product.manufacturer,
    product.manufacturerSku,
    product.ean,
    ...(product.tags ?? []),
    ...(product.sourceNames ?? []),
    options?.includeStoredText ? product.searchableText : undefined,
  ]);
}

export function buildProductSearchIndex(product: ProductSearchSource) {
  const normalizedText = buildProductSearchText(product, { includeStoredText: true });

  return {
    normalizedText,
    compactText: normalizedText.replace(SEARCH_SPACE_PATTERN, ''),
  };
}

export function matchesProductSearch(
  product: ProductSearchSource,
  query: string | NormalizedProductSearchQuery
) {
  const normalizedQuery = typeof query === 'string' ? normalizeProductSearchQuery(query) : query;
  if (!normalizedQuery.normalizedText) {
    return true;
  }

  const searchIndex = buildProductSearchIndex(product);
  return (
    searchIndex.normalizedText.includes(normalizedQuery.normalizedText) ||
    searchIndex.compactText.includes(normalizedQuery.compactText)
  );
}