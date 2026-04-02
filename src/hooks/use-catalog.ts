import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useKV } from './use-kv';
import {
  CatalogCategory,
  CatalogImportPreviewRow,
  CatalogProduct,
  CatalogQueryOptions,
  CatalogStoreState,
  ImportRun,
  ProductSource,
  RawImportRecord,
  SourceCategoryMapping,
  createDefaultCatalogCategories,
  createDefaultSourceCategoryMappings,
  normalizeComparableText,
  normalizeUnit,
  nowIso,
  parseCatalogFile,
  parseCatalogDemo,
  prepareCatalogImportPreview,
  commitCatalogImportPreview,
  queryCatalogProducts,
  mapLegacyProductToCatalogProduct,
  buildProductSourceSummary,
  buildProductSourceList,
} from '../lib/catalog';
import { Product as LegacyProduct } from '../lib/types';

interface CatalogBootstrapState {
  version: number;
  legacyMigrated: boolean;
  demoSeeded: boolean;
}

const AUTO_SEED_DELAY_MS = 1500;
const AUTO_SEED_PRODUCTS_PER_SOURCE = 180;

const DEFAULT_BOOTSTRAP_STATE: CatalogBootstrapState = {
  version: 1,
  legacyMigrated: false,
  demoSeeded: false,
};

function sameComparableProduct(left: CatalogProduct, right: CatalogProduct) {
  return (
    normalizeComparableText(left.internalCode) === normalizeComparableText(right.internalCode) ||
    normalizeComparableText(left.ean || '') === normalizeComparableText(right.ean || '') ||
    normalizeComparableText(left.name) === normalizeComparableText(right.name)
  );
}

function buildManualCatalogProduct(input: Partial<CatalogProduct> & { name: string; internalCode: string }, now = nowIso()): CatalogProduct {
  const name = input.name.trim();
  const normalizedName = input.normalizedName?.trim() || name;
  const defaultCostPrice = Number.isFinite(input.defaultCostPrice as number) ? Number(input.defaultCostPrice) : 0;
  const defaultSalePrice = Number.isFinite(input.defaultSalePrice as number)
    ? Number(input.defaultSalePrice)
    : defaultCostPrice;
  const defaultMarginPercent = Number.isFinite(input.defaultMarginPercent as number)
    ? Number(input.defaultMarginPercent)
    : defaultSalePrice > 0
      ? ((defaultSalePrice - defaultCostPrice) / defaultSalePrice) * 100
      : 0;

  return {
    id: input.id || crypto.randomUUID(),
    internalCode: input.internalCode.trim(),
    name,
    normalizedName,
    description: input.description?.trim() || '',
    brand: input.brand?.trim() || undefined,
    manufacturer: input.manufacturer?.trim() || undefined,
    manufacturerSku: input.manufacturerSku?.trim() || undefined,
    ean: input.ean?.replace(/\D/g, '') || undefined,
    packageSize: input.packageSize,
    packageUnit: input.packageUnit?.trim() || undefined,
    salesUnit: normalizeUnit(input.salesUnit || input.unit || 'kpl'),
    baseUnit: normalizeUnit(input.baseUnit || input.unit || 'kpl'),
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    defaultCostPrice,
    defaultSalePrice,
    defaultMarginPercent,
    defaultInstallPrice: Number.isFinite(input.defaultInstallPrice as number) ? Number(input.defaultInstallPrice) : 0,
    installationGroupId: input.installationGroupId,
    active: input.active ?? input.isActive ?? true,
    searchableText: `${normalizedName} ${input.description || ''} ${input.brand || ''} ${input.manufacturer || ''} ${input.ean || ''}`
      .trim()
      .toLowerCase(),
    createdAt: input.createdAt || now,
    updatedAt: now,
    archivedAt: input.active === false ? input.archivedAt || now : undefined,
  };
}

function toCatalogStoreState(args: {
  products: CatalogProduct[];
  productSources: ProductSource[];
  importRuns: ImportRun[];
  rawImportRecords: RawImportRecord[];
  categories: CatalogCategory[];
  sourceCategoryMappings: SourceCategoryMapping[];
}): CatalogStoreState {
  return {
    products: args.products,
    productSources: args.productSources,
    importRuns: args.importRuns,
    rawImportRecords: args.rawImportRecords,
    categories: args.categories,
    sourceCategoryMappings: args.sourceCategoryMappings,
  };
}

export function useCatalog() {
  const [products = [], setProducts] = useKV<CatalogProduct[]>('catalog-products', []);
  const [productSources = [], setProductSources] = useKV<ProductSource[]>('catalog-product-sources', []);
  const [importRuns = [], setImportRuns] = useKV<ImportRun[]>('catalog-import-runs', []);
  const [rawImportRecords = [], setRawImportRecords] = useKV<RawImportRecord[]>('catalog-raw-import-records', []);
  const [categories = [], setCategories] = useKV<CatalogCategory[]>('catalog-categories', []);
  const [sourceCategoryMappings = [], setSourceCategoryMappings] = useKV<SourceCategoryMapping[]>(
    'catalog-source-category-mappings',
    []
  );
  const [bootstrapState, setBootstrapState] = useKV<CatalogBootstrapState>(
    'catalog-bootstrap-state',
    DEFAULT_BOOTSTRAP_STATE
  );
  const [legacyProducts = []] = useKV<LegacyProduct[]>('products', []);
  const autoSeedStartedRef = useRef(false);
  const migrationStartedRef = useRef(false);

  useEffect(() => {
    if (categories.length === 0) {
      setCategories(createDefaultCatalogCategories());
    }
  }, [categories.length, setCategories]);

  useEffect(() => {
    if (sourceCategoryMappings.length === 0) {
      setSourceCategoryMappings(createDefaultSourceCategoryMappings());
    }
  }, [setSourceCategoryMappings, sourceCategoryMappings.length]);

  useEffect(() => {
    if (
      migrationStartedRef.current ||
      bootstrapState.legacyMigrated ||
      legacyProducts.length === 0 ||
      products.length > 0
    ) {
      return;
    }

    migrationStartedRef.current = true;
    const now = nowIso();
    const migratedProducts = legacyProducts.map((product) => mapLegacyProductToCatalogProduct(product, now));
    const migratedSources = legacyProducts.map((product) => ({
      id: crypto.randomUUID(),
      productId: product.id,
      sourceName: 'legacy',
      sourceProductId: product.code,
      sourceNameRaw: product.name,
      sourceDescriptionRaw: product.description,
      sourcePrice: product.purchasePrice,
      sourceSalePrice: product.defaultSalePrice,
      sourceInstallPrice: product.defaultInstallPrice ?? product.defaultInstallationPrice,
      sourceSaleUnit: product.salesUnit || product.unit,
      sourcePackageSize: product.packageSize ? `${product.packageSize} ${product.packageUnit || product.salesUnit || product.unit}` : undefined,
      sourceCurrency: 'EUR',
      availabilityText: product.active === false ? 'Passiivinen' : 'Aktiivinen',
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    }));

    setProducts(migratedProducts);
    setProductSources(migratedSources);
    setBootstrapState((current = DEFAULT_BOOTSTRAP_STATE) => ({ ...current, legacyMigrated: true }));
  }, [
    bootstrapState.legacyMigrated,
    categories,
    legacyProducts,
    products.length,
    setBootstrapState,
    setProductSources,
    setProducts,
  ]);

  const state = useMemo(
    () =>
      toCatalogStoreState({
        products,
        productSources,
        importRuns,
        rawImportRecords,
        categories,
        sourceCategoryMappings,
      }),
    [categories, importRuns, productSources, products, rawImportRecords, sourceCategoryMappings]
  );

  const queryProducts = useCallback(
    (options: CatalogQueryOptions = {}) =>
      queryCatalogProducts(
        {
          products,
          productSources,
          categories,
        },
        options
      ),
    [categories, productSources, products]
  );

  const getProductById = useCallback(
    (productId: string) => products.find((product) => product.id === productId),
    [products]
  );

  const getSourcesForProduct = useCallback(
    (productId: string) => buildProductSourceList(productId, productSources),
    [productSources]
  );

  const getSourceSummaryForProduct = useCallback(
    (productId: string) => buildProductSourceSummary(productId, productSources),
    [productSources]
  );

  const saveCatalogProduct = useCallback(
    (input: Partial<CatalogProduct> & { name: string; internalCode: string }) => {
      const now = nowIso();
      const nextProduct = buildManualCatalogProduct(input, now);
      setProducts((current = []) => {
        const existingIndex = current.findIndex((product) => product.id === nextProduct.id || sameComparableProduct(product, nextProduct));
        if (existingIndex >= 0) {
          const existing = current[existingIndex];
          const merged = {
            ...existing,
            ...nextProduct,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
          };
          const updated = [...current];
          updated[existingIndex] = merged;
          return updated;
        }
        return [...current, nextProduct];
      });
      return nextProduct;
    },
    [setProducts]
  );

  const updateCatalogProduct = useCallback(
    (productId: string, updates: Partial<CatalogProduct>) => {
      const now = nowIso();
      setProducts((current = []) =>
        current.map((product) => {
          if (product.id !== productId) return product;
          const next: CatalogProduct = {
            ...product,
            ...updates,
            name: updates.name?.trim() || product.name,
            normalizedName: updates.normalizedName?.trim() || updates.name?.trim() || product.normalizedName,
            description: updates.description !== undefined ? updates.description.trim() : product.description,
            brand: updates.brand !== undefined ? updates.brand?.trim() || undefined : product.brand,
            manufacturer: updates.manufacturer !== undefined ? updates.manufacturer?.trim() || undefined : product.manufacturer,
            manufacturerSku: updates.manufacturerSku !== undefined ? updates.manufacturerSku?.trim() || undefined : product.manufacturerSku,
            ean: updates.ean !== undefined ? updates.ean.replace(/\D/g, '') || undefined : product.ean,
            salesUnit: updates.salesUnit !== undefined ? normalizeUnit(updates.salesUnit || product.salesUnit || product.baseUnit || 'kpl') : product.salesUnit,
            baseUnit: updates.baseUnit !== undefined ? normalizeUnit(updates.baseUnit || product.baseUnit || product.salesUnit || 'kpl') : product.baseUnit,
            defaultCostPrice: Number.isFinite(updates.defaultCostPrice as number) ? Number(updates.defaultCostPrice) : product.defaultCostPrice,
            defaultSalePrice: Number.isFinite(updates.defaultSalePrice as number) ? Number(updates.defaultSalePrice) : product.defaultSalePrice,
            defaultMarginPercent: Number.isFinite(updates.defaultMarginPercent as number)
              ? Number(updates.defaultMarginPercent)
              : product.defaultMarginPercent,
            defaultInstallPrice: Number.isFinite(updates.defaultInstallPrice as number)
              ? Number(updates.defaultInstallPrice)
              : product.defaultInstallPrice,
            categoryId: updates.categoryId !== undefined ? updates.categoryId : product.categoryId,
            subcategoryId: updates.subcategoryId !== undefined ? updates.subcategoryId : product.subcategoryId,
            installationGroupId: updates.installationGroupId !== undefined ? updates.installationGroupId : product.installationGroupId,
            active: updates.active !== undefined ? updates.active : updates.isActive !== undefined ? updates.isActive : product.active,
            searchableText:
              updates.searchableText?.trim() ||
              `${updates.name || product.name} ${updates.description || product.description} ${updates.brand || product.brand || ''} ${
                updates.manufacturer || product.manufacturer || ''
              } ${updates.ean || product.ean || ''}`
                .trim()
                .toLowerCase(),
            updatedAt: now,
            archivedAt:
              updates.active === false || updates.isActive === false
                ? product.archivedAt || now
                : updates.active === true || updates.isActive === true
                  ? undefined
                  : product.archivedAt,
          };
          return next;
        })
      );
    },
    [setProducts]
  );

  const archiveCatalogProduct = useCallback(
    (productId: string) => {
      const now = nowIso();
      setProducts((current = []) =>
        current.map((product) =>
          product.id === productId
            ? {
                ...product,
                active: false,
                archivedAt: product.archivedAt || now,
                updatedAt: now,
              }
            : product
        )
      );
    },
    [setProducts]
  );

  const restoreCatalogProduct = useCallback(
    (productId: string) => {
      const now = nowIso();
      setProducts((current = []) =>
        current.map((product) =>
          product.id === productId
            ? {
                ...product,
                active: true,
                archivedAt: undefined,
                updatedAt: now,
              }
            : product
        )
      );
    },
    [setProducts]
  );

  const bulkUpdateProducts = useCallback(
    (productIds: string[], updates: Partial<CatalogProduct>) => {
      const now = nowIso();
      const idSet = new Set(productIds);
      setProducts((current = []) =>
        current.map((product) => {
          if (!idSet.has(product.id)) return product;
          return {
            ...product,
            ...updates,
            active: updates.active !== undefined ? updates.active : updates.isActive !== undefined ? updates.isActive : product.active,
            archivedAt:
              updates.active === false || updates.isActive === false
                ? product.archivedAt || now
                : updates.active === true || updates.isActive === true
                  ? undefined
                  : product.archivedAt,
            updatedAt: now,
          };
        })
      );
    },
    [setProducts]
  );

  const previewImportFile = useCallback(
    async (file: File, sourceName: string) => {
      const records = await parseCatalogFile(file, sourceName);
      return prepareCatalogImportPreview(records, state);
    },
    [state]
  );

  const previewDemoImport = useCallback(
    (sourceName: string, count = 1200) => {
      const records = parseCatalogDemo(sourceName, count);
      return prepareCatalogImportPreview(records, state);
    },
    [state]
  );

  const commitImportPreview = useCallback(
    (previewRows: CatalogImportPreviewRow[], sourceName: string, importType: CatalogImportType) => {
      const result = commitCatalogImportPreview(previewRows, state, sourceName, importType);
      setProducts(result.products);
      setProductSources(result.productSources);
      setImportRuns(result.importRuns);
      setRawImportRecords(result.rawImportRecords);
      return result;
    },
    [state, setImportRuns, setProductSources, setProducts, setRawImportRecords]
  );

  const seedDemoSources = useCallback(
    (count = 1200) => {
      const kRautaPreview = previewDemoImport('k_rauta_demo', count);
      const kRautaResult = commitImportPreview(kRautaPreview, 'k_rauta_demo', 'demo');
      const starkPreview = prepareCatalogImportPreview(parseCatalogDemo('stark_demo', count), {
        products: kRautaResult.products,
        productSources: kRautaResult.productSources,
        categories: categories.length > 0 ? categories : createDefaultCatalogCategories(),
        sourceCategoryMappings: sourceCategoryMappings.length > 0 ? sourceCategoryMappings : createDefaultSourceCategoryMappings(),
      });
      return commitImportPreview(starkPreview, 'stark_demo', 'demo');
    },
    [categories, commitImportPreview, previewDemoImport, sourceCategoryMappings]
  );

  const upsertSourceCategoryMapping = useCallback(
    (mapping: Partial<SourceCategoryMapping> & { sourceName: string; sourceCategoryPath: string }) => {
      const now = nowIso();
      const nextMapping: SourceCategoryMapping = {
        id: mapping.id || crypto.randomUUID(),
        sourceName: mapping.sourceName,
        sourceCategoryPath: mapping.sourceCategoryPath,
        categoryId: mapping.categoryId,
        subcategoryId: mapping.subcategoryId,
        createdAt: mapping.createdAt || now,
        updatedAt: now,
      };

      setSourceCategoryMappings((current = []) => {
        const index = current.findIndex(
          (candidate) =>
            candidate.id === nextMapping.id ||
            (normalizeComparableText(candidate.sourceName) === normalizeComparableText(nextMapping.sourceName) &&
              normalizeComparableText(candidate.sourceCategoryPath) === normalizeComparableText(nextMapping.sourceCategoryPath))
        );
        if (index >= 0) {
          const updated = [...current];
          updated[index] = { ...current[index], ...nextMapping, createdAt: current[index].createdAt };
          return updated;
        }
        return [...current, nextMapping];
      });

      return nextMapping;
    },
    [setSourceCategoryMappings]
  );

  const deleteSourceCategoryMapping = useCallback(
    (mappingId: string) => {
      setSourceCategoryMappings((current = []) => current.filter((mapping) => mapping.id !== mappingId));
    },
    [setSourceCategoryMappings]
  );

  const updateBootstrapState = useCallback(
    (updates: Partial<CatalogBootstrapState>) => {
      setBootstrapState((current = DEFAULT_BOOTSTRAP_STATE) => ({ ...current, ...updates }));
    },
    [setBootstrapState]
  );

  useEffect(() => {
    const shouldSeedDemo =
      categories.length > 0 &&
      sourceCategoryMappings.length > 0 &&
      legacyProducts.length === 0 &&
      products.length === 0 &&
      importRuns.length === 0;

    if (autoSeedStartedRef.current || !shouldSeedDemo) {
      return;
    }

    autoSeedStartedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      const result = seedDemoSources(AUTO_SEED_PRODUCTS_PER_SOURCE);
      if (result.createdProducts + result.updatedProducts > 0) {
        updateBootstrapState({ demoSeeded: true });
      }
    }, AUTO_SEED_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    bootstrapState.demoSeeded,
    categories.length,
    importRuns.length,
    legacyProducts.length,
    products.length,
    seedDemoSources,
    sourceCategoryMappings.length,
    updateBootstrapState,
  ]);

  return {
    products,
    productSources,
    importRuns,
    rawImportRecords,
    categories,
    sourceCategoryMappings,
    bootstrapState,
    queryProducts,
    getProductById,
    getSourcesForProduct,
    getSourceSummaryForProduct,
    saveCatalogProduct,
    updateCatalogProduct,
    archiveCatalogProduct,
    restoreCatalogProduct,
    bulkUpdateProducts,
    previewImportFile,
    previewDemoImport,
    commitImportPreview,
    seedDemoSources,
    upsertSourceCategoryMapping,
    deleteSourceCategoryMapping,
    updateBootstrapState,
  };
}
