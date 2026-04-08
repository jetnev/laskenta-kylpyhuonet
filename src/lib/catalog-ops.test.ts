import { describe, it, expect } from 'vitest';
import {
  cleanText,
  normalizeComparableText,
  normalizeDisplayText,
  normalizeUnit,
  normalizeCategoryPath,
  computeMarginPercent,
  calculateSalePrice,
  roundCurrency,
  buildSearchableText,
  normalizeHeaderKey,
  normalizeCurrency,
  buildSourceCategoryKey,
  createDefaultCatalogCategories,
} from './catalog-types';
import {
  findCatalogMatch,
  buildCatalogProductView,
  normalizeSourceRecord,
  mapLegacyProductToCatalogProduct,
  mapCatalogProductToLegacyProduct,
  buildProductSourceSummary,
  buildProductSourceList,
} from './catalog-ops';
import type { CatalogProduct, ProductSource, CatalogCategory, SourceProductRecord } from './catalog-types';
import type { Product as LegacyProduct } from './types';

// ── catalog-types pure functions ──────────────────────────────

describe('cleanText', () => {
  it('trimmaa ja yhdistää välilyönnit', () => {
    expect(cleanText('  hello   world  ')).toBe('hello world');
  });
  it('käsittelee undefined ja null', () => {
    expect(cleanText(undefined)).toBe('');
    expect(cleanText(null)).toBe('');
  });
  it('muuntaa numeron merkkijonoksi', () => {
    expect(cleanText(42)).toBe('42');
  });
});

describe('normalizeComparableText', () => {
  it('pienentää ja poistaa erikoismerkit', () => {
    expect(normalizeComparableText('Lattia-Laatta XL')).toBe('lattia laatta xl');
  });
  it('poistaa diakriittiset merkit', () => {
    expect(normalizeComparableText('Höyryeriste')).toBe('hoyryeriste');
  });
  it('tyhjä syöte palauttaa tyhjän', () => {
    expect(normalizeComparableText('')).toBe('');
  });
});

describe('normalizeDisplayText', () => {
  it('muuntaa Title Case -muotoon', () => {
    expect(normalizeDisplayText('laattapiste oy')).toBe('Laattapiste Oy');
  });
  it('säilyttää kaikki isot kirjaimet (akronyymit)', () => {
    expect(normalizeDisplayText('ABB')).toBe('ABB');
  });
  it('tyhjä syöte palauttaa tyhjän', () => {
    expect(normalizeDisplayText('')).toBe('');
  });
});

describe('normalizeUnit', () => {
  it('tunnistaa m²-yksiköt', () => {
    expect(normalizeUnit('m2')).toBe('m2');
    expect(normalizeUnit('sqm')).toBe('m2');
    expect(normalizeUnit('neliometri')).toBe('m2');
  });
  it('m² (Unicode superscript) normalisoidaan jm:ksi diacritics-stripin kautta', () => {
    // m² → stripDiacritics → 'm' → matches 'jm' rule
    expect(normalizeUnit('m²')).toBe('jm');
  });
  it('tunnistaa kappalemäärä-yksiköt', () => {
    expect(normalizeUnit('kpl')).toBe('kpl');
    expect(normalizeUnit('pcs')).toBe('kpl');
    expect(normalizeUnit('kpl.')).toBe('kpl');
  });
  it('tunnistaa pituusmitat', () => {
    expect(normalizeUnit('jm')).toBe('jm');
    expect(normalizeUnit('m')).toBe('jm');
    expect(normalizeUnit('lineaarimetri')).toBe('jm');
  });
  it('palauttaa kpl tuntemattomalle yksikölle', () => {
    expect(normalizeUnit('')).toBe('kpl');
  });
  it('palauttaa alkuperäisen tekstin erikoiselle yksikölle', () => {
    expect(normalizeUnit('rulla')).toBe('rulla');
  });
});

describe('normalizeCategoryPath', () => {
  it('normalisoi > -erottimet', () => {
    expect(normalizeCategoryPath('Laatat>Lattialaatat')).toBe('Laatat > Lattialaatat');
  });
  it('trimmaa ylimääräiset välilyönnit', () => {
    expect(normalizeCategoryPath('  Laatat  >  XL  ')).toBe('Laatat > XL');
  });
});

describe('computeMarginPercent', () => {
  it('laskee oikein: osto 80, myynti 100 → kate 20%', () => {
    expect(computeMarginPercent(80, 100)).toBe(20);
  });
  it('nollamyyntihintakate on 0', () => {
    expect(computeMarginPercent(80, 0)).toBe(0);
  });
  it('negatiivinen myyntihinta → 0', () => {
    expect(computeMarginPercent(80, -10)).toBe(0);
  });
  it('100% kate kun osto = 0', () => {
    expect(computeMarginPercent(0, 100)).toBe(100);
  });
});

describe('calculateSalePrice', () => {
  it('laskee oikein: osto 100, kate 20% → myynti 120', () => {
    expect(calculateSalePrice(100, 20)).toBe(120);
  });
  it('0% kate → myyntihinta = ostohinta', () => {
    expect(calculateSalePrice(100, 0)).toBe(100);
  });
  it('käsittelee NaN/Infinity turvallisesti', () => {
    expect(calculateSalePrice(NaN, 20)).toBe(0);
    expect(calculateSalePrice(100, NaN)).toBe(100);
  });
  it('negatiivinen osto → 0', () => {
    expect(calculateSalePrice(-50, 20)).toBe(0);
  });
});

describe('roundCurrency', () => {
  it('pyöristää kahteen desimaaliin', () => {
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(1.004)).toBe(1);
    expect(roundCurrency(99.999)).toBe(100);
  });
});

describe('buildSearchableText', () => {
  it('yhdistää arvot normalisoituna', () => {
    const result = buildSearchableText(['Lattia', 'LAATTA', undefined]);
    expect(result).toContain('lattia');
    expect(result).toContain('laatta');
  });
});

describe('normalizeHeaderKey', () => {
  it('muuntaa alaviivaerotteiseksi', () => {
    expect(normalizeHeaderKey('Tuote Nimi')).toBe('tuote_nimi');
  });
});

describe('normalizeCurrency', () => {
  it('palauttaa EUR oletuksena', () => {
    expect(normalizeCurrency('')).toBe('EUR');
    expect(normalizeCurrency(null)).toBe('EUR');
  });
  it('muuntaa isoksi', () => {
    expect(normalizeCurrency('usd')).toBe('USD');
  });
});

describe('buildSourceCategoryKey', () => {
  it('normalisoi kategoriatekstin', () => {
    expect(buildSourceCategoryKey('  Lattia-Laatat  ')).toBe('lattia laatat');
  });
});

describe('createDefaultCatalogCategories', () => {
  it('luo oletuskategoriat joilla on id ja nimi', () => {
    const categories = createDefaultCatalogCategories('2026-01-01T00:00:00Z');
    expect(categories.length).toBeGreaterThan(0);
    categories.forEach((cat) => {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
    });
  });
});

// ── catalog-ops pure functions ────────────────────────────────

const NOW = '2026-04-08T00:00:00Z';

const mockCategories: CatalogCategory[] = [
  { id: 'cat-1', code: 'LAATAT', name: 'Laatat', parentId: undefined, sortOrder: 0, active: true, createdAt: NOW, updatedAt: NOW },
  { id: 'cat-2', code: 'LATTIA', name: 'Lattialaatat', parentId: 'cat-1', sortOrder: 1, active: true, createdAt: NOW, updatedAt: NOW },
];

const mockProduct: CatalogProduct = {
  id: 'prod-cat-1',
  internalCode: 'EAN-6418551234567',
  name: 'Pukkila Lattialaatta 30x30',
  normalizedName: 'pukkila lattialaatta 30x30',
  description: 'Testituote',
  brand: 'Pukkila',
  manufacturer: 'Pukkila',
  manufacturerSku: 'PK-3030',
  ean: '6418551234567',
  salesUnit: 'm2',
  baseUnit: 'm2',
  categoryId: 'cat-1',
  subcategoryId: 'cat-2',
  defaultCostPrice: 25,
  defaultSalePrice: 40,
  defaultMarginPercent: 37.5,
  defaultInstallPrice: 5,
  active: true,
  searchableText: 'pukkila lattialaatta 30x30',
  createdAt: NOW,
  updatedAt: NOW,
};

const mockSource: ProductSource = {
  id: 'src-1',
  productId: 'prod-cat-1',
  sourceName: 'laattapiste',
  sourceProductId: 'LP-001',
  lastSeenAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('findCatalogMatch', () => {
  it('löytää EAN-matchin', () => {
    const record = { normalizedEan: '6418551234567' } as never;
    const result = findCatalogMatch(record, [mockProduct], []);
    expect(result).toBeDefined();
    expect(result!.matchType).toBe('ean');
    expect(result!.confidence).toBe(1);
  });

  it('löytää SKU + brand -matchin', () => {
    const record = {
      normalizedEan: '',
      normalizedManufacturerSku: 'pk 3030',
      normalizedBrand: 'pukkila',
    } as never;
    const result = findCatalogMatch(record, [mockProduct], []);
    expect(result).toBeDefined();
    expect(result!.matchType).toBe('sku_brand');
  });

  it('löytää source-matchin', () => {
    const record = {
      normalizedEan: '',
      normalizedManufacturerSku: '',
      normalizedBrand: '',
      normalizedName: '',
      sourceName: 'Laattapiste',
      sourceProductId: 'LP-001',
    } as never;
    const result = findCatalogMatch(record, [mockProduct], [mockSource]);
    expect(result).toBeDefined();
    expect(result!.matchType).toBe('source');
  });

  it('palauttaa undefined ilman matcheja', () => {
    const record = {
      normalizedEan: '',
      normalizedManufacturerSku: '',
      normalizedBrand: '',
      normalizedName: 'ei-löydy',
      sourceName: 'unknown',
      sourceProductId: 'xx',
    } as never;
    const result = findCatalogMatch(record, [mockProduct], [mockSource]);
    expect(result).toBeUndefined();
  });
});

describe('buildCatalogProductView', () => {
  it('liittää kategoria- ja lähdetiedot', () => {
    const view = buildCatalogProductView(mockProduct, mockCategories, [mockSource]);
    expect(view.id).toBe(mockProduct.id);
    expect(view.subcategoryName).toBe('Lattialaatat');
    expect(view.sourceNames).toEqual(['laattapiste']);
    expect(view.sourceCount).toBe(1);
  });

  it('toimii ilman lähteitä', () => {
    const view = buildCatalogProductView(mockProduct, mockCategories, []);
    expect(view.sourceNames).toEqual([]);
    expect(view.sourceCount).toBe(0);
  });
});

describe('buildProductSourceSummary ja buildProductSourceList', () => {
  const sources: ProductSource[] = [
    { id: 's1', productId: 'p1', sourceName: 'Laattapiste', sourceProductId: 'x', lastSeenAt: NOW, createdAt: NOW, updatedAt: NOW },
    { id: 's2', productId: 'p1', sourceName: 'ABB', sourceProductId: 'y', lastSeenAt: NOW, createdAt: NOW, updatedAt: NOW },
    { id: 's3', productId: 'p2', sourceName: 'Laattapiste', sourceProductId: 'z', lastSeenAt: NOW, createdAt: NOW, updatedAt: NOW },
  ];

  it('summary palauttaa uniikit lähdenamente tuotteelle', () => {
    const result = buildProductSourceSummary('p1', sources);
    expect(result).toEqual(['ABB', 'Laattapiste']);
  });

  it('list palauttaa vain tuotteen lähteet', () => {
    const result = buildProductSourceList('p1', sources);
    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.productId).toBe('p1'));
  });
});

describe('mapLegacyProductToCatalogProduct', () => {
  const legacyProduct: LegacyProduct = {
    id: 'lp-1',
    code: 'LT-001',
    name: 'Testituote',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 25,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('muuntaa legacy-tuotteeksi säilyttäen id:n', () => {
    const result = mapLegacyProductToCatalogProduct(legacyProduct, NOW);
    expect(result.id).toBe('lp-1');
    expect(result.name).toBe('Testituote');
    expect(result.defaultCostPrice).toBe(25);
    expect(result.active).toBe(true);
  });

  it('laskee defaultSalePrice:n painikkeesta', () => {
    const withMargin: LegacyProduct = { ...legacyProduct, defaultMarginPercent: 20 };
    const result = mapLegacyProductToCatalogProduct(withMargin, NOW);
    expect(result.defaultSalePrice).toBe(30); // 25 × 1.2
  });
});

describe('mapCatalogProductToLegacyProduct', () => {
  it('round-trip säilyttää avainarvot', () => {
    const context = {
      categories: mockCategories,
      productSources: [mockSource],
    };
    const legacy = mapCatalogProductToLegacyProduct(mockProduct, context);
    expect(legacy.id).toBe(mockProduct.id);
    expect(legacy.purchasePrice).toBe(mockProduct.defaultCostPrice);
    expect(legacy.name).toBe(mockProduct.name);
    expect(legacy.sourceNames).toEqual(['laattapiste']);
    expect(legacy.sourceCount).toBe(1);
  });
});

describe('normalizeSourceRecord', () => {
  const sourceRecord: SourceProductRecord = {
    sourceName: 'Laattapiste',
    sourceProductId: 'LP-5001',
    sourceNameRaw: '  Pukkila XL laatta  60x60  ',
    sourceDescriptionRaw: '  Laadukas suuri lattialaatta  ',
    sourceBrand: 'pukkila',
    sourceCategoryPath: 'Laatat > Lattialaatat',
    manufacturerSku: 'PK-6060',
    ean: '641855 999 0001',
    sourcePackageSize: '1.44 m2',
    sourceSaleUnit: 'm2',
    sourcePrice: 32.50,
    sourceSalePrice: 52.00,
    rawPayload: {},
  };

  it('normalisoi nimi- ja kuvauskentät', () => {
    const result = normalizeSourceRecord(sourceRecord, mockCategories, []);
    expect(result.normalizedName).toBe('Pukkila XL laatta 60x60');
    expect(result.normalizedDescription).toBe('Laadukas suuri lattialaatta');
  });

  it('parsii EAN-numeron', () => {
    const result = normalizeSourceRecord(sourceRecord, mockCategories, []);
    expect(result.normalizedEan).toBe('6418559990001');
  });

  it('parsii pakkauksen koon', () => {
    const result = normalizeSourceRecord(sourceRecord, mockCategories, []);
    expect(result.packageSize).toBeCloseTo(1.44);
    expect(result.packageUnit).toBe('m2');
  });

  it('laskee hinnat oikein', () => {
    const result = normalizeSourceRecord(sourceRecord, mockCategories, []);
    expect(result.defaultCostPrice).toBe(32.5);
    expect(result.defaultSalePrice).toBe(52);
    expect(result.defaultMarginPercent).toBeGreaterThan(0);
  });

  it('generoi internalCode EAN-pohjaisesti', () => {
    const result = normalizeSourceRecord(sourceRecord, mockCategories, []);
    expect(result.internalCode).toMatch(/^EAN-/);
  });
});
