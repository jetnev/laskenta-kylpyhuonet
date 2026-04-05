import { describe, expect, it } from 'vitest';
import {
  buildProductSearchText,
  matchesProductSearch,
  normalizeProductSearchQuery,
} from './product-search';

describe('buildProductSearchText', () => {
  it('normalizes legacy product fields into a consistent searchable index', () => {
    const searchText = buildProductSearchText({
      code: 'LT-100',
      internalCode: 'LT 100',
      name: 'Laminaatti  Tammi-Classic 8 mm',
      description: 'Kova kulutusluokka / mattapinta',
      manufacturer: 'Aareva Oy',
      manufacturerSku: 'SKU-8MM',
      ean: '64 12345 67890 1',
    });

    expect(searchText).toBe(
      'lt 100 lt 100 laminaatti tammi classic 8 mm kova kulutusluokka mattapinta aareva oy sku 8mm 64 12345 67890 1'
    );
  });
});

describe('matchesProductSearch', () => {
  const product = {
    code: 'LT-100',
    internalCode: 'LT 100',
    name: 'Laminaatti Tammi Classic 8 mm',
    description: 'Säästölattia kosteisiin tiloihin',
    brand: 'Nordic Floors',
    manufacturer: 'Aareva Oy',
    manufacturerSku: 'SKU-8MM',
    ean: '6412345678901',
    searchableText: 'laminaatti tammi classic 8 mm säästölattia kosteisiin tiloihin',
  };

  it('matches reliable partial queries across normalized name text', () => {
    expect(matchesProductSearch(product, 'lamin')).toBe(true);
    expect(matchesProductSearch(product, 'tammi classic')).toBe(true);
    expect(matchesProductSearch(product, 'tammi-classic')).toBe(true);
  });

  it('matches compact code and size queries even when stored data uses separators', () => {
    expect(matchesProductSearch(product, 'lt100')).toBe(true);
    expect(matchesProductSearch(product, '8mm')).toBe(true);
  });

  it('matches diacritic-free queries against stored text', () => {
    const query = normalizeProductSearchQuery('saastolattia');
    expect(matchesProductSearch(product, query)).toBe(true);
  });

  it('does not match unrelated queries', () => {
    expect(matchesProductSearch(product, 'betoni')).toBe(false);
  });
});