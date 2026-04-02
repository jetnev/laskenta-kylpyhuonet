import { Product as LegacyProduct } from './types';

export type CatalogImportType = 'csv' | 'xlsx' | 'json' | 'html' | 'demo';
export type CatalogImportStatus = 'running' | 'completed' | 'completed_with_errors' | 'failed';
export type CatalogSortField =
  | 'name'
  | 'category'
  | 'brand'
  | 'updatedAt'
  | 'defaultCostPrice'
  | 'defaultSalePrice'
  | 'sourceCount'
  | 'internalCode';
export type CatalogFilterActive = 'all' | 'active' | 'inactive';

export interface CatalogCategory {
  id: string;
  parentId?: string | null;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCategoryMapping {
  id: string;
  sourceName: string;
  sourceCategoryPath: string;
  categoryId?: string;
  subcategoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogProduct {
  id: string;
  internalCode: string;
  name: string;
  normalizedName: string;
  description: string;
  brand?: string;
  manufacturer?: string;
  manufacturerSku?: string;
  ean?: string;
  packageSize?: number;
  packageUnit?: string;
  unit?: string;
  salesUnit?: string;
  baseUnit?: string;
  categoryId?: string;
  subcategoryId?: string;
  defaultCostPrice: number;
  defaultSalePrice: number;
  defaultMarginPercent: number;
  defaultInstallPrice: number;
  installationGroupId?: string;
  active: boolean;
  isActive?: boolean;
  searchableText: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface ProductSource {
  id: string;
  productId: string;
  sourceName: string;
  sourceProductId: string;
  sourceUrl?: string;
  sourceCategoryPath?: string;
  sourceBrand?: string;
  sourceNameRaw?: string;
  sourceDescriptionRaw?: string;
  sourcePrice?: number;
  sourceSalePrice?: number;
  sourceInstallPrice?: number;
  sourceSaleUnit?: string;
  sourcePackageSize?: string;
  sourceCurrency?: string;
  availabilityText?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRun {
  id: string;
  sourceName: string;
  importType: CatalogImportType;
  startedAt: string;
  finishedAt: string;
  status: CatalogImportStatus;
  totalRawRecords: number;
  createdProducts: number;
  updatedProducts: number;
  skippedProducts: number;
  failedProducts: number;
  logSummary: string;
}

export interface RawImportRecord {
  id: string;
  importRunId: string;
  sourceName: string;
  sourceProductId: string;
  rawPayload: Record<string, unknown>;
  rawHash: string;
  parsedOk: boolean;
  parseError?: string;
  matchedProductId?: string;
  createdAt: string;
}

export interface SourceProductRecord {
  sourceName: string;
  sourceProductId: string;
  sourceUrl?: string;
  sourceCategoryPath?: string;
  sourceBrand?: string;
  sourceNameRaw: string;
  sourceDescriptionRaw?: string;
  sourcePrice?: number;
  sourceSalePrice?: number;
  sourceInstallPrice?: number;
  sourceMarginPercent?: number;
  sourceSaleUnit?: string;
  sourcePackageSize?: string;
  sourceCurrency?: string;
  availabilityText?: string;
  manufacturerSku?: string;
  ean?: string;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedSourceRecord extends SourceProductRecord {
  normalizedName: string;
  normalizedDescription: string;
  normalizedBrand: string;
  normalizedManufacturer: string;
  normalizedManufacturerSku: string;
  normalizedEan: string;
  normalizedCategoryPath: string;
  packageSize?: number;
  packageUnit?: string;
  salesUnit: string;
  baseUnit: string;
  categoryId?: string;
  subcategoryId?: string;
  defaultCostPrice: number;
  defaultSalePrice: number;
  defaultMarginPercent: number;
  defaultInstallPrice: number;
  internalCode: string;
  searchableText: string;
  active: boolean;
}

export interface NormalizedSourceRecord extends SourceProductRecord {
  normalizedName: string;
  normalizedDescription: string;
  normalizedBrand: string;
  normalizedManufacturer: string;
  normalizedManufacturerSku: string;
  normalizedEan: string;
  normalizedCategoryPath: string;
  packageSize?: number;
  packageUnit?: string;
  salesUnit: string;
  baseUnit: string;
  categoryId?: string;
  subcategoryId?: string;
  defaultCostPrice: number;
  defaultSalePrice: number;
  defaultMarginPercent: number;
  defaultInstallPrice: number;
  internalCode: string;
  searchableText: string;
  active: boolean;
}

export interface CatalogImportMatch {
  productId: string;
  productName: string;
  matchType: 'ean' | 'sku_brand' | 'source' | 'name';
  confidence: number;
}

export interface CatalogImportPreviewRow {
  rawHash: string;
  sourceRecord: SourceProductRecord;
  normalized?: NormalizedSourceRecord;
  match?: CatalogImportMatch;
  action: 'create' | 'update' | 'skip' | 'error';
  reason: string;
  warnings: string[];
  parsedOk: boolean;
  parseError?: string;
}

export interface CatalogProductView extends CatalogProduct {
  categoryName: string;
  subcategoryName: string;
  sourceNames: string[];
  sourceCount: number;
}

export interface CatalogQueryOptions {
  search?: string;
  sourceName?: string | 'all';
  categoryId?: string | 'all';
  subcategoryId?: string | 'all';
  brand?: string | 'all';
  active?: CatalogFilterActive;
  sortBy?: CatalogSortField;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface CatalogQueryResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SourceAdapter {
  sourceName: string;
  displayName: string;
  supportedFormats: CatalogImportType[];
  parseFile: (file: File) => Promise<SourceProductRecord[]>;
  generateDemoRows?: (count: number) => SourceProductRecord[];
}

export interface CatalogStoreState {
  products: CatalogProduct[];
  productSources: ProductSource[];
  importRuns: ImportRun[];
  rawImportRecords: RawImportRecord[];
  categories: CatalogCategory[];
  sourceCategoryMappings: SourceCategoryMapping[];
}

export interface CatalogImportCommitResult extends CatalogStoreState {
  importRun: ImportRun;
  createdProducts: number;
  updatedProducts: number;
  skippedProducts: number;
  failedProducts: number;
}

export const DEFAULT_CURRENCY = 'EUR';

export function nowIso() {
  return new Date().toISOString();
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function cleanText(value: unknown) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeComparableText(value: unknown) {
  return stripDiacritics(cleanText(value).toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeHeaderKey(value: unknown) {
  return normalizeComparableText(value).replace(/\s+/g, '_');
}

export function normalizeDisplayText(value: unknown) {
  const cleaned = cleanText(value);
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((part) => {
      if (!part) return part;
      if (/^[A-Z0-9]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

export function normalizeCurrency(value: unknown) {
  const text = cleanText(value).toUpperCase();
  return text || DEFAULT_CURRENCY;
}

export function normalizeUnit(value: unknown): string {
  const raw = normalizeComparableText(value).replace(/\s+/g, '');
  if (!raw) return 'kpl';
  if (['m2', 'm²', 'sqm', 'neliometri', 'neliota'].includes(raw)) return 'm2';
  if (['m3', 'm³', 'kuutio', 'kuutiometri'].includes(raw)) return 'm3';
  if (['m', 'metri', 'metria', 'jm', 'jm.', 'lm', 'lineaarimetri', 'lineaarimetriä'].includes(raw)) return 'jm';
  if (['kpl', 'pcs', 'kpl.', 'kpll'].includes(raw)) return 'kpl';
  if (['pkt', 'pack', 'paketti', 'pak'].includes(raw)) return 'pkt';
  if (['ltv', 'l', 'litra', 'litre'].includes(raw)) return 'ltv';
  if (['kg', 'kilo', 'kilogramma'].includes(raw)) return 'kg';
  if (['erä', 'era', 'eraa'].includes(raw)) return 'erä';
  if (['h', 'h.', 'tunti', 'hour'].includes(raw)) return 'h';
  if (['palvelu', 'service'].includes(raw)) return 'palvelu';
  return cleanText(value) || 'kpl';
}

export function normalizeCategoryPath(value: unknown) {
  return cleanText(value)
    .replace(/[/>]+/g, ' > ')
    .replace(/\s*>\s*/g, ' > ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchableText(values: Array<unknown>) {
  return normalizeComparableText(values.map((value) => cleanText(value)).join(' '));
}

export function computeMarginPercent(costPrice: number, salePrice: number) {
  if (salePrice <= 0) return 0;
  return roundCurrency(((salePrice - costPrice) / salePrice) * 100);
}

export function calculateSalePrice(costPrice: number, marginPercent: number) {
  const safeCost = Number.isFinite(costPrice) ? Math.max(0, costPrice) : 0;
  const safeMargin = Number.isFinite(marginPercent) ? Math.max(0, marginPercent) : 0;
  return roundCurrency(safeCost * (1 + safeMargin / 100));
}

export function buildSourceCategoryKey(value: unknown) {
  return normalizeComparableText(value).replace(/\s+/g, ' ').trim();
}

export interface CatalogLegacyMappingContext {
  categories: CatalogCategory[];
  productSources: ProductSource[];
}

export interface CatalogProductSeed {
  internalCode: string;
  name: string;
  normalizedName: string;
  description: string;
  brand?: string;
  manufacturer?: string;
  manufacturerSku?: string;
  ean?: string;
  packageSize?: number;
  packageUnit?: string;
  salesUnit?: string;
  baseUnit?: string;
  categoryId?: string;
  subcategoryId?: string;
  defaultCostPrice: number;
  defaultSalePrice: number;
  defaultMarginPercent: number;
  defaultInstallPrice: number;
  installationGroupId?: string;
  active: boolean;
  searchableText: string;
}

export function createDefaultCatalogCategories(now = nowIso()) {
  return [
    { id: 'cat-building', parentId: null, code: 'BUILDING', name: 'Rakennusmateriaalit', sortOrder: 10, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-building-boards', parentId: 'cat-building', code: 'BOARDS', name: 'Levyt ja rungot', sortOrder: 20, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-building-fasteners', parentId: 'cat-building', code: 'FASTENERS', name: 'Kiinnikkeet', sortOrder: 30, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-building-tools', parentId: 'cat-building', code: 'TOOLS', name: 'Työkalut', sortOrder: 40, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-bathroom', parentId: null, code: 'BATHROOM', name: 'Kylpyhuone', sortOrder: 50, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-bathroom-tiles', parentId: 'cat-bathroom', code: 'TILES', name: 'Laatat', sortOrder: 60, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-bathroom-fixtures', parentId: 'cat-bathroom', code: 'FIXTURES', name: 'Vesikalusteet', sortOrder: 70, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-bathroom-furniture', parentId: 'cat-bathroom', code: 'FURNITURE', name: 'Kalusteet', sortOrder: 80, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-bathroom-showers', parentId: 'cat-bathroom', code: 'SHOWERS', name: 'Suihkuratkaisut', sortOrder: 90, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-bathroom-accessories', parentId: 'cat-bathroom', code: 'ACCESSORIES', name: 'Tarvikkeet', sortOrder: 100, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-plumbing', parentId: null, code: 'PLUMBING', name: 'LVI', sortOrder: 110, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-plumbing-pipes', parentId: 'cat-plumbing', code: 'PIPES', name: 'Putket', sortOrder: 120, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-plumbing-fittings', parentId: 'cat-plumbing', code: 'FITTINGS', name: 'Liittimet', sortOrder: 130, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-plumbing-valves', parentId: 'cat-plumbing', code: 'VALVES', name: 'Venttiilit', sortOrder: 140, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-electrical', parentId: null, code: 'ELECTRICAL', name: 'Sähkö', sortOrder: 150, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-electrical-lighting', parentId: 'cat-electrical', code: 'LIGHTING', name: 'Valaisimet', sortOrder: 160, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-electrical-switches', parentId: 'cat-electrical', code: 'SWITCHES', name: 'Kytkimet', sortOrder: 170, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-electrical-cables', parentId: 'cat-electrical', code: 'CABLES', name: 'Kaapelit', sortOrder: 180, active: true, createdAt: now, updatedAt: now },
    { id: 'cat-services', parentId: null, code: 'SERVICES', name: 'Palvelut', sortOrder: 190, active: true, createdAt: now, updatedAt: now },
  ] as CatalogCategory[];
}

export function createDefaultSourceCategoryMappings(now = nowIso()) {
  return [
    { id: 'map-bathroom-tiles', sourceName: 'generic', sourceCategoryPath: 'laatat', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-tiles', createdAt: now, updatedAt: now },
    { id: 'map-bathroom-fixtures', sourceName: 'generic', sourceCategoryPath: 'vesikalusteet', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-fixtures', createdAt: now, updatedAt: now },
    { id: 'map-bathroom-furniture', sourceName: 'generic', sourceCategoryPath: 'kalusteet', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-furniture', createdAt: now, updatedAt: now },
    { id: 'map-bathroom-showers', sourceName: 'generic', sourceCategoryPath: 'suihkut', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-showers', createdAt: now, updatedAt: now },
    { id: 'map-plumbing-pipes', sourceName: 'generic', sourceCategoryPath: 'putket', categoryId: 'cat-plumbing', subcategoryId: 'cat-plumbing-pipes', createdAt: now, updatedAt: now },
    { id: 'map-plumbing-fittings', sourceName: 'generic', sourceCategoryPath: 'liittimet', categoryId: 'cat-plumbing', subcategoryId: 'cat-plumbing-fittings', createdAt: now, updatedAt: now },
    { id: 'map-electrical-lighting', sourceName: 'generic', sourceCategoryPath: 'valaisimet', categoryId: 'cat-electrical', subcategoryId: 'cat-electrical-lighting', createdAt: now, updatedAt: now },
    { id: 'map-electrical-switches', sourceName: 'generic', sourceCategoryPath: 'kytkimet', categoryId: 'cat-electrical', subcategoryId: 'cat-electrical-switches', createdAt: now, updatedAt: now },
    { id: 'map-krauta-tiles', sourceName: 'k_rauta', sourceCategoryPath: 'laatat', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-tiles', createdAt: now, updatedAt: now },
    { id: 'map-krauta-fixtures', sourceName: 'k_rauta', sourceCategoryPath: 'vesikalusteet', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-fixtures', createdAt: now, updatedAt: now },
    { id: 'map-krauta-furniture', sourceName: 'k_rauta', sourceCategoryPath: 'kalusteet', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-furniture', createdAt: now, updatedAt: now },
    { id: 'map-krauta-showers', sourceName: 'k_rauta', sourceCategoryPath: 'suihkut', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-showers', createdAt: now, updatedAt: now },
    { id: 'map-stark-tiles', sourceName: 'stark', sourceCategoryPath: 'laatat', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-tiles', createdAt: now, updatedAt: now },
    { id: 'map-stark-fixtures', sourceName: 'stark', sourceCategoryPath: 'vesikalusteet', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-fixtures', createdAt: now, updatedAt: now },
    { id: 'map-stark-plumbing', sourceName: 'stark', sourceCategoryPath: 'putket', categoryId: 'cat-plumbing', subcategoryId: 'cat-plumbing-pipes', createdAt: now, updatedAt: now },
    { id: 'map-stark-electrical', sourceName: 'stark', sourceCategoryPath: 'sahko', categoryId: 'cat-electrical', subcategoryId: 'cat-electrical-lighting', createdAt: now, updatedAt: now },
    { id: 'map-krauta-demo-tiles', sourceName: 'k_rauta_demo', sourceCategoryPath: 'laatat', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-tiles', createdAt: now, updatedAt: now },
    { id: 'map-krauta-demo-fixtures', sourceName: 'k_rauta_demo', sourceCategoryPath: 'vesikalusteet', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-fixtures', createdAt: now, updatedAt: now },
    { id: 'map-krauta-demo-furniture', sourceName: 'k_rauta_demo', sourceCategoryPath: 'kalusteet', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-furniture', createdAt: now, updatedAt: now },
    { id: 'map-krauta-demo-plumbing', sourceName: 'k_rauta_demo', sourceCategoryPath: 'putket', categoryId: 'cat-plumbing', subcategoryId: 'cat-plumbing-pipes', createdAt: now, updatedAt: now },
    { id: 'map-stark-demo-tiles', sourceName: 'stark_demo', sourceCategoryPath: 'laatat', categoryId: 'cat-bathroom', subcategoryId: 'cat-bathroom-tiles', createdAt: now, updatedAt: now },
    { id: 'map-stark-demo-electrical', sourceName: 'stark_demo', sourceCategoryPath: 'sahko', categoryId: 'cat-electrical', subcategoryId: 'cat-electrical-lighting', createdAt: now, updatedAt: now },
  ] as SourceCategoryMapping[];
}

export function getCategoryById(categories: CatalogCategory[], categoryId?: string) {
  return categories.find((category) => category.id === categoryId);
}

export function getCategoryNameById(categories: CatalogCategory[], categoryId?: string) {
  return getCategoryById(categories, categoryId)?.name || '';
}

export function getCategoryPathLabel(categories: CatalogCategory[], categoryId?: string, subcategoryId?: string) {
  const category = getCategoryById(categories, categoryId);
  const subcategory = getCategoryById(categories, subcategoryId);
  if (!category && !subcategory) return '';
  if (category && subcategory) {
    return `${category.name} / ${subcategory.name}`;
  }
  return category?.name || subcategory?.name || '';
}

export function resolveSourceCategoryMapping(
  sourceName: string,
  sourceCategoryPath: string | undefined,
  mappings: SourceCategoryMapping[]
) {
  const normalizedSourceName = normalizeComparableText(sourceName);
  const normalizedPath = buildSourceCategoryKey(sourceCategoryPath || '');
  if (!normalizedPath) return undefined;

  const exact = mappings.find(
    (mapping) =>
      normalizeComparableText(mapping.sourceName) === normalizedSourceName &&
      buildSourceCategoryKey(mapping.sourceCategoryPath) === normalizedPath
  );
  if (exact) return exact;

  const pathMatch = mappings.find(
    (mapping) =>
      normalizeComparableText(mapping.sourceName) === normalizedSourceName &&
      normalizedPath.includes(buildSourceCategoryKey(mapping.sourceCategoryPath))
  );
  if (pathMatch) return pathMatch;

  const generic = mappings.find(
    (mapping) =>
      normalizeComparableText(mapping.sourceName) === 'generic' &&
      normalizedPath.includes(buildSourceCategoryKey(mapping.sourceCategoryPath))
  );
  return generic;
}

export interface CatalogStoreState {
  products: CatalogProduct[];
  productSources: ProductSource[];
  importRuns: ImportRun[];
  rawImportRecords: RawImportRecord[];
  categories: CatalogCategory[];
  sourceCategoryMappings: SourceCategoryMapping[];
}

export interface CatalogImportCommitResult extends CatalogStoreState {
  importRun: ImportRun;
  createdProducts: number;
  updatedProducts: number;
  skippedProducts: number;
  failedProducts: number;
}

export interface SourceAdapter {
  sourceName: string;
  displayName: string;
  supportedFormats: CatalogImportType[];
  parseFile: (file: File) => Promise<SourceProductRecord[]>;
  generateDemoRows?: (count: number) => SourceProductRecord[];
}

export interface CatalogQueryOptions {
  search?: string;
  sourceName?: string | 'all';
  categoryId?: string | 'all';
  subcategoryId?: string | 'all';
  brand?: string | 'all';
  active?: CatalogFilterActive;
  sortBy?: CatalogSortField;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface CatalogQueryResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CatalogProductView extends CatalogProduct {
  categoryName: string;
  subcategoryName: string;
  sourceNames: string[];
  sourceCount: number;
}

export interface CatalogImportMatch {
  productId: string;
  productName: string;
  matchType: 'ean' | 'sku_brand' | 'source' | 'name';
  confidence: number;
}

export interface CatalogImportPreviewRow {
  rawHash: string;
  sourceRecord: SourceProductRecord;
  normalized?: NormalizedSourceRecord;
  match?: CatalogImportMatch;
  action: 'create' | 'update' | 'skip' | 'error';
  reason: string;
  warnings: string[];
  parsedOk: boolean;
  parseError?: string;
}

export interface CatalogLegacyMappingContext {
  categories: CatalogCategory[];
  productSources: ProductSource[];
}

export interface CatalogProductSeed {
  internalCode: string;
  name: string;
  normalizedName: string;
  description: string;
  brand?: string;
  manufacturer?: string;
  manufacturerSku?: string;
  ean?: string;
  packageSize?: number;
  packageUnit?: string;
  salesUnit?: string;
  baseUnit?: string;
  categoryId?: string;
  subcategoryId?: string;
  defaultCostPrice: number;
  defaultSalePrice: number;
  defaultMarginPercent: number;
  defaultInstallPrice: number;
  installationGroupId?: string;
  active: boolean;
  searchableText: string;
}

export function isLegacyProduct(value: LegacyProduct | CatalogProduct): value is LegacyProduct {
  return 'code' in value;
}
