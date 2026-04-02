import {
  CatalogCategory,
  CatalogImportCommitResult,
  CatalogImportMatch,
  CatalogImportPreviewRow,
  CatalogProduct,
  CatalogProductSeed,
  CatalogProductView,
  CatalogQueryOptions,
  CatalogQueryResult,
  CatalogStoreState,
  ImportRun,
  NormalizedSourceRecord,
  ProductSource,
  RawImportRecord,
  SourceCategoryMapping,
  SourceProductRecord,
  buildSearchableText,
  calculateSalePrice,
  cleanText,
  computeMarginPercent,
  createDefaultCatalogCategories,
  getCategoryNameById,
  getCategoryPathLabel,
  normalizeCategoryPath,
  normalizeComparableText,
  normalizeDisplayText,
  normalizeUnit,
  nowIso,
  roundCurrency,
  resolveSourceCategoryMapping,
} from './catalog-types';
import { parseCatalogDemo } from './catalog-io';
import { Product as LegacyProduct, UnitType } from './types';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

function simpleHash(value: string) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ charCode, 2654435761);
    h2 = Math.imul(h2 ^ charCode, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16)}${(h1 >>> 0).toString(16)}`;
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/[€]/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  if (!cleaned) return undefined;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePackageSize(value: unknown) {
  const text = cleanText(value);
  if (!text) return {};
  const match = text.match(/([\d.,]+)\s*([a-zA-Z²0-9]+)?/);
  if (!match) return {};
  const size = parseNumber(match[1]);
  const unit = normalizeUnit(match[2] || '');
  return {
    size,
    unit: unit || undefined,
  };
}

function sameBrand(left?: string, right?: string) {
  return normalizeComparableText(left) === normalizeComparableText(right);
}

function sameName(left?: string, right?: string) {
  return normalizeComparableText(left) === normalizeComparableText(right);
}

function getComparableBrand(product: Pick<CatalogProduct, 'brand' | 'manufacturer'> | Pick<LegacyProduct, 'brand' | 'manufacturer'>) {
  return cleanText(product.brand || product.manufacturer || '');
}

export function normalizeSourceRecord(
  record: SourceProductRecord,
  categories: CatalogCategory[],
  mappings: SourceCategoryMapping[]
): NormalizedSourceRecord {
  const normalizedName = cleanText(record.sourceNameRaw);
  const normalizedDescription = cleanText(record.sourceDescriptionRaw);
  const normalizedBrand = normalizeDisplayText(record.sourceBrand);
  const normalizedManufacturer = normalizeDisplayText(record.sourceBrand);
  const normalizedManufacturerSku = cleanText(record.manufacturerSku);
  const normalizedEan = cleanText(record.ean).replace(/\D/g, '');
  const normalizedCategoryPath = normalizeCategoryPath(record.sourceCategoryPath);
  const packageValue = parsePackageSize(record.sourcePackageSize);
  const salesUnit = normalizeUnit(record.sourceSaleUnit || packageValue.unit || 'kpl');
  const baseUnit = salesUnit === 'm2' ? 'm2' : salesUnit === 'm3' ? 'm3' : salesUnit;
  const mapping = resolveSourceCategoryMapping(record.sourceName, normalizedCategoryPath, mappings);
  const categoryId = mapping?.categoryId;
  const subcategoryId = mapping?.subcategoryId;
  const defaultCostPrice = parseNumber(record.sourcePrice) ?? 0;
  const defaultSalePrice = parseNumber(record.sourceSalePrice) ?? calculateSalePrice(defaultCostPrice, record.sourceMarginPercent ?? 0);
  const defaultMarginPercent =
    typeof record.sourceMarginPercent === 'number'
      ? roundCurrency(record.sourceMarginPercent)
      : computeMarginPercent(defaultCostPrice, defaultSalePrice);
  const defaultInstallPrice = parseNumber(record.sourceInstallPrice) ?? 0;
  const internalCode = cleanText(record.ean)
    ? `EAN-${normalizedEan}`
    : cleanText(record.manufacturerSku)
      ? `SKU-${normalizeComparableText(record.manufacturerSku).replace(/\s+/g, '-').toUpperCase()}`
      : `SRC-${normalizeComparableText(record.sourceName)}-${normalizeComparableText(record.sourceProductId).replace(/\s+/g, '-').toUpperCase()}`;

  return {
    ...record,
    normalizedName,
    normalizedDescription,
    normalizedBrand,
    normalizedManufacturer,
    normalizedManufacturerSku,
    normalizedEan,
    normalizedCategoryPath,
    packageSize: packageValue.size,
    packageUnit: packageValue.unit,
    salesUnit,
    baseUnit,
    categoryId,
    subcategoryId,
    defaultCostPrice,
    defaultSalePrice,
    defaultMarginPercent,
    defaultInstallPrice,
    internalCode,
    searchableText: buildSearchableText([
      normalizedName,
      normalizedDescription,
      normalizedBrand,
      normalizedManufacturer,
      normalizedManufacturerSku,
      normalizedEan,
      normalizedCategoryPath,
      salesUnit,
      baseUnit,
      record.sourceProductId,
      record.sourceName,
    ]),
    active: true,
  };
}

export function buildCatalogProductView(
  product: CatalogProduct,
  categories: CatalogCategory[],
  productSources: ProductSource[]
): CatalogProductView {
  const categoryName = getCategoryNameById(categories, product.categoryId);
  const subcategoryName = getCategoryNameById(categories, product.subcategoryId);
  const sourceNames = Array.from(
    new Set(productSources.filter((source) => source.productId === product.id).map((source) => source.sourceName))
  ).sort((left, right) => left.localeCompare(right, 'fi'));

  return {
    ...product,
    categoryName,
    subcategoryName,
    sourceNames,
    sourceCount: sourceNames.length,
  };
}

function hasComparableProductChanges(existing: CatalogProduct, normalized: NormalizedSourceRecord) {
  return (
    normalizeComparableText(existing.name) !== normalizeComparableText(normalized.normalizedName) ||
    normalizeComparableText(existing.description) !== normalizeComparableText(normalized.normalizedDescription) ||
    normalizeComparableText(existing.brand || existing.manufacturer || '') !== normalizeComparableText(normalized.normalizedBrand) ||
    normalizeComparableText(existing.manufacturerSku || '') !== normalizeComparableText(normalized.normalizedManufacturerSku) ||
    normalizeComparableText(existing.ean || '') !== normalizeComparableText(normalized.normalizedEan) ||
    existing.categoryId !== normalized.categoryId ||
    existing.subcategoryId !== normalized.subcategoryId ||
    Math.abs((existing.defaultCostPrice || 0) - (normalized.defaultCostPrice || 0)) > 0.001 ||
    Math.abs((existing.defaultSalePrice || 0) - (normalized.defaultSalePrice || 0)) > 0.001 ||
    Math.abs((existing.defaultMarginPercent || 0) - (normalized.defaultMarginPercent || 0)) > 0.001 ||
    Math.abs((existing.defaultInstallPrice || 0) - (normalized.defaultInstallPrice || 0)) > 0.001 ||
    (existing.salesUnit || '') !== (normalized.salesUnit || '') ||
    (existing.baseUnit || '') !== (normalized.baseUnit || '') ||
    Boolean(existing.active) !== Boolean(normalized.active)
  );
}

export function findCatalogMatch(
  normalized: NormalizedSourceRecord,
  products: CatalogProduct[],
  productSources: ProductSource[]
): CatalogImportMatch | undefined {
  if (normalized.normalizedEan) {
    const match = products.find((product) => normalizeComparableText(product.ean || '') === normalized.normalizedEan);
    if (match) {
      return { productId: match.id, productName: match.name, matchType: 'ean', confidence: 1 };
    }
  }

  if (normalized.normalizedManufacturerSku && normalized.normalizedBrand) {
    const match = products.find(
      (product) =>
        normalizeComparableText(product.manufacturerSku || '') === normalized.normalizedManufacturerSku &&
        sameBrand(getComparableBrand(product), normalized.normalizedBrand)
    );
    if (match) {
      return { productId: match.id, productName: match.name, matchType: 'sku_brand', confidence: 0.99 };
    }
  }

  const sourceMatch = productSources.find(
    (link) =>
      normalizeComparableText(link.sourceName) === normalizeComparableText(normalized.sourceName) &&
      normalizeComparableText(link.sourceProductId) === normalizeComparableText(normalized.sourceProductId)
  );
  if (sourceMatch) {
    const product = products.find((candidate) => candidate.id === sourceMatch.productId);
    if (product) {
      return { productId: product.id, productName: product.name, matchType: 'source', confidence: 1 };
    }
  }

  if (normalized.normalizedName) {
    const match = products.find((product) =>
      sameName(product.normalizedName || product.name, normalized.normalizedName) &&
      (
        !normalized.normalizedBrand ||
        !getComparableBrand(product) ||
        sameBrand(getComparableBrand(product), normalized.normalizedBrand)
      )
    );
    if (match) {
      return { productId: match.id, productName: match.name, matchType: 'name', confidence: 0.92 };
    }
  }

  return undefined;
}

export function prepareCatalogImportPreview(
  records: SourceProductRecord[],
  state: Pick<CatalogStoreState, 'products' | 'productSources' | 'categories' | 'sourceCategoryMappings'>
) {
  return records.map<CatalogImportPreviewRow>((record, index) => {
    const rawHash = simpleHash(stableStringify(record.rawPayload) + record.sourceName + record.sourceProductId + index);
    if (!cleanText(record.sourceNameRaw)) {
      return {
        rawHash,
        sourceRecord: record,
        action: 'error',
        reason: 'Tuotenimi puuttuu.',
        warnings: [],
        parsedOk: false,
        parseError: 'Tuotenimi puuttuu.',
      };
    }

    const normalized = normalizeSourceRecord(record, state.categories, state.sourceCategoryMappings);
    const match = findCatalogMatch(normalized, state.products, state.productSources);
    const warnings: string[] = [];

    if (!normalized.categoryId) {
      warnings.push('Kategoriaa ei löytynyt lähdemappauksesta.');
    }
    if (!normalized.normalizedBrand) {
      warnings.push('Brändi puuttuu.');
    }

    const existingProduct = match ? state.products.find((product) => product.id === match.productId) : undefined;
    if (existingProduct && !hasComparableProductChanges(existingProduct, normalized)) {
      return {
        rawHash,
        sourceRecord: record,
        normalized,
        match,
        action: 'skip',
        reason: 'Sama tuote löytyy jo eikä muutoksia havaittu.',
        warnings,
        parsedOk: true,
      };
    }

    return {
      rawHash,
      sourceRecord: record,
      normalized,
      match,
      action: match ? 'update' : 'create',
      reason: match ? `Päivitetään olemassa oleva tuote (${match.matchType}).` : 'Luodaan uusi tuote.',
      warnings,
      parsedOk: true,
    };
  });
}

function mergeProductWithNormalized(
  existing: CatalogProduct | undefined,
  normalized: NormalizedSourceRecord,
  now: string
): CatalogProduct {
  const createdAt = existing?.createdAt || now;
  return {
    id: existing?.id || crypto.randomUUID(),
    internalCode: normalized.internalCode,
    name: normalized.normalizedName,
    normalizedName: normalized.normalizedName,
    description: normalized.normalizedDescription,
    brand: normalized.normalizedBrand || undefined,
    manufacturer: normalized.normalizedManufacturer || undefined,
    manufacturerSku: normalized.normalizedManufacturerSku || undefined,
    ean: normalized.normalizedEan || undefined,
    packageSize: normalized.packageSize,
    packageUnit: normalized.packageUnit,
    salesUnit: normalized.salesUnit,
    baseUnit: normalized.baseUnit,
    categoryId: normalized.categoryId,
    subcategoryId: normalized.subcategoryId,
    defaultCostPrice: normalized.defaultCostPrice,
    defaultSalePrice: normalized.defaultSalePrice,
    defaultMarginPercent: normalized.defaultMarginPercent,
    defaultInstallPrice: normalized.defaultInstallPrice,
    installationGroupId: existing?.installationGroupId,
    active: normalized.active,
    searchableText: normalized.searchableText,
    createdAt,
    updatedAt: now,
    archivedAt: normalized.active ? undefined : existing?.archivedAt,
  };
}

function upsertSourceLink(
  links: ProductSource[],
  productId: string,
  normalized: NormalizedSourceRecord,
  now: string
) {
  const existing = links.find(
    (link) =>
      normalizeComparableText(link.sourceName) === normalizeComparableText(normalized.sourceName) &&
      normalizeComparableText(link.sourceProductId) === normalizeComparableText(normalized.sourceProductId)
  );
  if (existing) {
    return links.map((link) =>
      link.id === existing.id
        ? {
            ...link,
            productId,
            sourceCategoryPath: normalized.sourceCategoryPath,
            sourceBrand: normalized.sourceBrand,
            sourceNameRaw: normalized.sourceNameRaw,
            sourceDescriptionRaw: normalized.sourceDescriptionRaw,
            sourcePrice: normalized.sourcePrice,
            sourceSalePrice: normalized.sourceSalePrice,
            sourceInstallPrice: normalized.sourceInstallPrice,
            sourceSaleUnit: normalized.sourceSaleUnit,
            sourcePackageSize: normalized.sourcePackageSize,
            sourceCurrency: normalized.sourceCurrency,
            availabilityText: normalized.availabilityText,
            lastSeenAt: now,
            updatedAt: now,
          }
        : link
    );
  }

  const created: ProductSource = {
    id: crypto.randomUUID(),
    productId,
    sourceName: normalized.sourceName,
    sourceProductId: normalized.sourceProductId,
    sourceUrl: normalized.sourceUrl,
    sourceCategoryPath: normalized.sourceCategoryPath,
    sourceBrand: normalized.sourceBrand,
    sourceNameRaw: normalized.sourceNameRaw,
    sourceDescriptionRaw: normalized.sourceDescriptionRaw,
    sourcePrice: normalized.sourcePrice,
    sourceSalePrice: normalized.sourceSalePrice,
    sourceInstallPrice: normalized.sourceInstallPrice,
    sourceSaleUnit: normalized.sourceSaleUnit,
    sourcePackageSize: normalized.sourcePackageSize,
    sourceCurrency: normalized.sourceCurrency,
    availabilityText: normalized.availabilityText,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
  return [...links, created];
}

function buildRawImportRecord(
  previewRow: CatalogImportPreviewRow,
  importRunId: string,
  now: string
): RawImportRecord {
  return {
    id: crypto.randomUUID(),
    importRunId,
    sourceName: previewRow.sourceRecord.sourceName,
    sourceProductId: previewRow.sourceRecord.sourceProductId,
    rawPayload: previewRow.sourceRecord.rawPayload,
    rawHash: previewRow.rawHash,
    parsedOk: previewRow.parsedOk,
    parseError: previewRow.parseError,
    matchedProductId: previewRow.match?.productId,
    createdAt: now,
  };
}

export function commitCatalogImportPreview(
  previewRows: CatalogImportPreviewRow[],
  state: CatalogStoreState,
  sourceName: string,
  importType: CatalogImportType
): CatalogImportCommitResult {
  const startedAt = nowIso();
  const importRunId = crypto.randomUUID();
  let products = [...state.products];
  let productSources = [...state.productSources];
  const rawImportRecords = [...state.rawImportRecords];
  const importRuns = [...state.importRuns];
  let createdProducts = 0;
  let updatedProducts = 0;
  let skippedProducts = 0;
  let failedProducts = 0;

  previewRows.forEach((row) => {
    const now = nowIso();
    rawImportRecords.push(buildRawImportRecord(row, importRunId, now));

    if (!row.parsedOk || row.action === 'error' || !row.normalized) {
      failedProducts += 1;
      return;
    }

    if (row.action === 'skip') {
      skippedProducts += 1;
      if (row.match?.productId) {
        const existing = products.find((product) => product.id === row.match?.productId);
        if (existing) {
          products = products.map((product) =>
            product.id === existing.id
              ? {
                  ...product,
                  updatedAt: now,
                  archivedAt: product.active ? undefined : product.archivedAt,
                }
              : product
          );
        }
        productSources = upsertSourceLink(productSources, row.match.productId, row.normalized, now);
      }
      return;
    }

    if (row.match?.productId) {
      const existing = products.find((product) => product.id === row.match?.productId);
      const nextProduct = mergeProductWithNormalized(existing, row.normalized, now);
      products = products.map((product) => (product.id === nextProduct.id ? nextProduct : product));
      productSources = upsertSourceLink(productSources, nextProduct.id, row.normalized, now);
      updatedProducts += 1;
      return;
    }

    const nextProduct = mergeProductWithNormalized(undefined, row.normalized, now);
    products = [...products, nextProduct];
    productSources = upsertSourceLink(productSources, nextProduct.id, row.normalized, now);
    createdProducts += 1;
  });

  const finishedAt = nowIso();
  const status: ImportRun['status'] =
    failedProducts > 0
      ? createdProducts + updatedProducts > 0
        ? 'completed_with_errors'
        : 'failed'
      : 'completed';

  const importRun: ImportRun = {
    id: importRunId,
    sourceName,
    importType,
    startedAt,
    finishedAt,
    status,
    totalRawRecords: previewRows.length,
    createdProducts,
    updatedProducts,
    skippedProducts,
    failedProducts,
    logSummary: `Tuonti ${sourceName}: ${createdProducts} uutta, ${updatedProducts} päivitettyä, ${skippedProducts} ohitettua, ${failedProducts} virhettä.`,
  };

  importRuns.push(importRun);

  return {
    products,
    productSources,
    importRuns,
    rawImportRecords,
    categories: state.categories,
    sourceCategoryMappings: state.sourceCategoryMappings,
    importRun,
    createdProducts,
    updatedProducts,
    skippedProducts,
    failedProducts,
  };
}

export function queryCatalogProducts(
  state: Pick<CatalogStoreState, 'products' | 'productSources' | 'categories'>,
  options: CatalogQueryOptions = {}
): CatalogQueryResult<CatalogProductView> {
  const search = normalizeComparableText(options.search || '');
  const sourceName = options.sourceName || 'all';
  const categoryId = options.categoryId || 'all';
  const subcategoryId = options.subcategoryId || 'all';
  const brand = options.brand || 'all';
  const active = options.active || 'all';
  const sortBy = options.sortBy || 'updatedAt';
  const sortDirection = options.sortDirection || 'desc';
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 50);

  const sourceProductIds = new Map<string, Set<string>>();
  state.productSources.forEach((link) => {
    const bucket = sourceProductIds.get(link.sourceName) || new Set<string>();
    bucket.add(link.productId);
    sourceProductIds.set(link.sourceName, bucket);
  });

  let filtered = [...state.products];
  if (sourceName !== 'all') {
    const ids = sourceProductIds.get(sourceName) || new Set<string>();
    filtered = filtered.filter((product) => ids.has(product.id));
  }
  if (categoryId !== 'all') {
    filtered = filtered.filter((product) => product.categoryId === categoryId);
  }
  if (subcategoryId !== 'all') {
    filtered = filtered.filter((product) => product.subcategoryId === subcategoryId);
  }
  if (brand !== 'all') {
    filtered = filtered.filter((product) => normalizeComparableText(product.brand || product.manufacturer || '') === normalizeComparableText(brand));
  }
  if (active === 'active') {
    filtered = filtered.filter((product) => product.active);
  } else if (active === 'inactive') {
    filtered = filtered.filter((product) => !product.active);
  }
  if (search) {
    filtered = filtered.filter((product) => normalizeComparableText(product.searchableText).includes(search));
  }

  const viewItems = filtered.map((product) => buildCatalogProductView(product, state.categories, state.productSources));
  viewItems.sort((left, right) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name':
        return direction * left.name.localeCompare(right.name, 'fi');
      case 'category':
        return direction * `${left.categoryName} ${left.subcategoryName}`.localeCompare(`${right.categoryName} ${right.subcategoryName}`, 'fi');
      case 'brand':
        return direction * (left.brand || '').localeCompare(right.brand || '', 'fi');
      case 'defaultCostPrice':
        return direction * ((left.defaultCostPrice || 0) - (right.defaultCostPrice || 0));
      case 'defaultSalePrice':
        return direction * ((left.defaultSalePrice || 0) - (right.defaultSalePrice || 0));
      case 'sourceCount':
        return direction * (left.sourceCount - right.sourceCount);
      case 'internalCode':
        return direction * left.internalCode.localeCompare(right.internalCode, 'fi');
      case 'updatedAt':
      default:
        return direction * left.updatedAt.localeCompare(right.updatedAt);
    }
  });

  const total = viewItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = viewItems.slice(start, start + pageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function mapLegacyProductToCatalogProduct(product: LegacyProduct, now = nowIso()): CatalogProduct {
  const brand = cleanText(product.brand || product.manufacturer || '');
  const normalizedName = cleanText(product.normalizedName || product.name || product.code);
  const defaultCostPrice = parseNumber(product.defaultCostPrice ?? product.purchasePrice) ?? 0;
  const defaultSalePrice = parseNumber(product.defaultSalePrice) ?? calculateSalePrice(defaultCostPrice, product.defaultMarginPercent ?? product.defaultSalesMarginPercent ?? 0);
  const defaultMarginPercent = roundCurrency(
    product.defaultMarginPercent ?? product.defaultSalesMarginPercent ?? computeMarginPercent(defaultCostPrice, defaultSalePrice)
  );
  const internalCode = cleanText(product.internalCode || product.code || product.id);
  const searchableText = buildSearchableText([
    product.code,
    product.name,
    product.description,
    product.category,
    brand,
    product.manufacturer,
    product.manufacturerSku,
    product.ean,
    product.tags?.join(' '),
  ]);

  return {
    id: product.id,
    internalCode,
    name: cleanText(product.name),
    normalizedName,
    description: cleanText(product.description),
    brand: brand || undefined,
    manufacturer: cleanText(product.manufacturer || '') || undefined,
    manufacturerSku: cleanText(product.manufacturerSku || '') || undefined,
    ean: cleanText(product.ean || '').replace(/\D/g, '') || undefined,
    packageSize: product.packageSize,
    packageUnit: product.packageUnit,
    salesUnit: cleanText(product.salesUnit || product.unit),
    baseUnit: cleanText(product.baseUnit || product.unit),
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    defaultCostPrice,
    defaultSalePrice,
    defaultMarginPercent,
    defaultInstallPrice: parseNumber(product.defaultInstallPrice ?? product.defaultInstallationPrice) ?? 0,
    installationGroupId: product.installationGroupId,
    active: product.active ?? product.isActive ?? true,
    searchableText,
    createdAt: product.createdAt || now,
    updatedAt: product.updatedAt || now,
    archivedAt: product.archivedAt,
  };
}

export function mapCatalogProductToLegacyProduct(
  product: CatalogProduct,
  context: CatalogLegacyMappingContext
): LegacyProduct {
  const sourceNames = Array.from(
    new Set(context.productSources.filter((source) => source.productId === product.id).map((source) => source.sourceName))
  ).sort((left, right) => left.localeCompare(right, 'fi'));

  return {
    id: product.id,
    code: cleanText(product.internalCode || product.ean || product.id).slice(0, 48),
    name: product.name,
    description: product.description || undefined,
    category: getCategoryPathLabel(context.categories, product.categoryId, product.subcategoryId) || undefined,
    internalCode: product.internalCode,
    brand: product.brand,
    manufacturer: product.manufacturer,
    manufacturerSku: product.manufacturerSku,
    ean: product.ean,
    normalizedName: product.normalizedName,
    packageSize: product.packageSize,
    packageUnit: product.packageUnit,
    unit: (product.salesUnit || product.baseUnit || 'kpl') as UnitType | string,
    salesUnit: product.salesUnit,
    baseUnit: product.baseUnit,
    purchasePrice: product.defaultCostPrice,
    defaultCostPrice: product.defaultCostPrice,
    defaultSalePrice: product.defaultSalePrice,
    defaultSalesMarginPercent: product.defaultMarginPercent,
    defaultMarginPercent: product.defaultMarginPercent,
    defaultInstallationPrice: product.defaultInstallPrice,
    defaultInstallPrice: product.defaultInstallPrice,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    installationGroupId: product.installationGroupId,
    isActive: product.active,
    active: product.active,
    searchableText: product.searchableText,
    sourceNames,
    sourceCount: sourceNames.length,
    tags: sourceNames,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    archivedAt: product.archivedAt,
  };
}

export function buildProductSourceSummary(productId: string, productSources: ProductSource[]) {
  return Array.from(new Set(productSources.filter((source) => source.productId === productId).map((source) => source.sourceName))).sort((left, right) =>
    left.localeCompare(right, 'fi')
  );
}

export function buildProductSourceList(productId: string, productSources: ProductSource[]) {
  return productSources.filter((source) => source.productId === productId);
}

export function createCatalogProductFromSeed(seed: CatalogProductSeed, now = nowIso()): CatalogProduct {
  return {
    id: crypto.randomUUID(),
    internalCode: seed.internalCode,
    name: seed.name,
    normalizedName: seed.normalizedName,
    description: seed.description,
    brand: seed.brand,
    manufacturer: seed.manufacturer,
    manufacturerSku: seed.manufacturerSku,
    ean: seed.ean,
    packageSize: seed.packageSize,
    packageUnit: seed.packageUnit,
    salesUnit: seed.salesUnit,
    baseUnit: seed.baseUnit,
    categoryId: seed.categoryId,
    subcategoryId: seed.subcategoryId,
    defaultCostPrice: seed.defaultCostPrice,
    defaultSalePrice: seed.defaultSalePrice,
    defaultMarginPercent: seed.defaultMarginPercent,
    defaultInstallPrice: seed.defaultInstallPrice,
    installationGroupId: seed.installationGroupId,
    active: seed.active,
    searchableText: seed.searchableText,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDemoSeedPreview(sourceName: string, count = 1200) {
  const records = parseCatalogDemo(sourceName, count);
  const state: Pick<CatalogStoreState, 'products' | 'productSources' | 'categories' | 'sourceCategoryMappings'> = {
    products: [],
    productSources: [],
    categories: createDefaultCatalogCategories(),
    sourceCategoryMappings: [],
  };
  return prepareCatalogImportPreview(records, state);
}
