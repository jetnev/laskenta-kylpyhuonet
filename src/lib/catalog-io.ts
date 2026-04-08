import * as XLSX from 'xlsx';
import {
  DEFAULT_CURRENCY,
  SourceAdapter,
  SourceProductRecord,
  calculateSalePrice,
  cleanText,
  normalizeComparableText,
  normalizeCurrency,
  normalizeHeaderKey,
  roundCurrency,
} from './catalog-types';

const adapterRegistry = new Map<string, SourceAdapter>();

function detectDelimiter(text: string) {
  const sample = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0) || '';
  const candidates: Array<',' | ';' | '\t'> = [';', '\t', ','];
  let best: ',' | ';' | '\t' = ';';
  let score = -1;
  candidates.forEach((candidate) => {
    const candidateScore = (sample.match(new RegExp(`\\${candidate}`, 'g')) || []).length;
    if (candidateScore > score) {
      score = candidateScore;
      best = candidate;
    }
  });
  return best;
}

function parseDelimitedText(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      if (row.some((part) => part.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((part) => part.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function rowsToObjects(rows: string[][]) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => normalizeHeaderKey(header));
  return rows.slice(1).map((row) =>
    headers.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header] = row[index]?.trim?.() ?? row[index] ?? '';
      return acc;
    }, {})
  );
}

function getField(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const normalized = normalizeHeaderKey(alias);
    if (normalized in row) {
      const value = row[normalized];
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        return value;
      }
    }
  }
  return undefined;
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

function objectRowToSourceRecord(row: Record<string, unknown>, sourceName: string, index: number): SourceProductRecord {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value])
  );

  const sourceProductId =
    cleanText(getField(normalizedRow, ['source_product_id', 'product_id', 'id', 'sku', 'tuotekoodi', 'code'])) ||
    `${sourceName}-${String(index + 1).padStart(6, '0')}`;
  const sourceNameRaw = cleanText(getField(normalizedRow, ['source_name_raw', 'name', 'nimi', 'product_name', 'tuotenimi']));
  const sourceDescriptionRaw = cleanText(getField(normalizedRow, ['source_description_raw', 'description', 'kuvaus', 'product_description']));
  const sourceCategoryPath = cleanText(getField(normalizedRow, ['source_category_path', 'category_path', 'kategoriapolku', 'category', 'kategoria']));
  const sourceBrand = cleanText(getField(normalizedRow, ['source_brand', 'brand', 'brandi', 'manufacturer', 'valmistaja']));
  const sourceUrl = cleanText(getField(normalizedRow, ['source_url', 'url', 'linkki']));
  const sourceSaleUnit = cleanText(getField(normalizedRow, ['source_sale_unit', 'sale_unit', 'unit', 'yksikko', 'yksikkö']));
  const sourcePackageSize = cleanText(getField(normalizedRow, ['source_package_size', 'package_size', 'pakkauskoko', 'package']));
  const sourceCurrency = normalizeCurrency(getField(normalizedRow, ['source_currency', 'currency', 'valuutta']));
  const availabilityText = cleanText(getField(normalizedRow, ['availability_text', 'availability', 'saatavuus']));
  const manufacturerSku = cleanText(getField(normalizedRow, ['manufacturer_sku', 'manufacturer_code', 'sku', 'tuotekoodi_valmistaja']));
  const ean = cleanText(getField(normalizedRow, ['ean', 'barcode', 'gtin']));
  const sourcePrice = parseNumber(getField(normalizedRow, ['source_price', 'price', 'cost_price', 'ostohinta', 'hinta']));
  const sourceSalePrice = parseNumber(getField(normalizedRow, ['source_sale_price', 'sale_price', 'myyntihinta', 'selling_price']));
  const sourceInstallPrice = parseNumber(getField(normalizedRow, ['source_install_price', 'install_price', 'asennushinta']));
  const sourceMarginPercent = parseNumber(getField(normalizedRow, ['source_margin_percent', 'margin_percent', 'kate', 'kateprosentti']));

  return {
    sourceName,
    sourceProductId,
    sourceUrl: sourceUrl || undefined,
    sourceCategoryPath: sourceCategoryPath || undefined,
    sourceBrand: sourceBrand || undefined,
    sourceNameRaw,
    sourceDescriptionRaw: sourceDescriptionRaw || undefined,
    sourcePrice,
    sourceSalePrice,
    sourceInstallPrice,
    sourceMarginPercent,
    sourceSaleUnit: sourceSaleUnit || undefined,
    sourcePackageSize: sourcePackageSize || undefined,
    sourceCurrency,
    availabilityText: availabilityText || undefined,
    manufacturerSku: manufacturerSku || undefined,
    ean: ean || undefined,
    rawPayload: Object.fromEntries(
      Object.entries(normalizedRow).filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== '')
    ),
  };
}

function parseJsonFile(text: string, sourceName: string) {
  const parsed = JSON.parse(text) as unknown;
  const rows: Record<string, unknown>[] = [];

  if (Array.isArray(parsed)) {
    parsed.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        rows.push(entry as Record<string, unknown>);
      }
    });
  } else if (parsed && typeof parsed === 'object') {
    const object = parsed as Record<string, unknown>;
    if (Array.isArray(object.items)) {
      object.items.forEach((entry) => {
        if (entry && typeof entry === 'object') {
          rows.push(entry as Record<string, unknown>);
        }
      });
    } else if (Array.isArray(object.products)) {
      object.products.forEach((entry) => {
        if (entry && typeof entry === 'object') {
          rows.push(entry as Record<string, unknown>);
        }
      });
    } else {
      rows.push(object);
    }
  }

  return rows.map((row, index) => objectRowToSourceRecord(row, sourceName, index));
}

function parseHtmlFile(text: string, sourceName: string) {
  if (typeof DOMParser === 'undefined') return [];
  const parser = new DOMParser();
  const document = parser.parseFromString(text, 'text/html');
  const table = document.querySelector('table');
  if (!table) return [];

  const headers = Array.from(table.querySelectorAll('thead th')).map((cell) => normalizeHeaderKey(cell.textContent || ''));
  const rows = Array.from(table.querySelectorAll('tbody tr'));

  const objects = rows.map((row) => {
    const cells = Array.from(row.querySelectorAll('td')).map((cell) => cleanText(cell.textContent));
    return headers.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});
  });

  return objects.map((row, index) => objectRowToSourceRecord(row, sourceName, index));
}

async function parseXlsxFile(file: File, sourceName: string) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  return rows.map((row, index) => objectRowToSourceRecord(row, sourceName, index));
}

async function parseDelimitedFile(file: File, sourceName: string) {
  const text = await file.text();
  const rows = parseDelimitedText(text);
  return rowsToObjects(rows).map((row, index) => objectRowToSourceRecord(row, sourceName, index));
}

function createGenericAdapter(sourceName: string, displayName: string): SourceAdapter {
  return {
    sourceName,
    displayName,
    supportedFormats: ['csv', 'xlsx', 'json', 'html'],
    async parseFile(file: File) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.json') || file.type.includes('json')) {
        return parseJsonFile(await file.text(), sourceName);
      }
      if (lower.endsWith('.html') || lower.endsWith('.htm') || file.type.includes('html')) {
        return parseHtmlFile(await file.text(), sourceName);
      }
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        return parseXlsxFile(file, sourceName);
      }
      return parseDelimitedFile(file, sourceName);
    },
  };
}

function makeSeededRandom(seed: string) {
  let h = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 1;
  return () => {
    h = Math.imul(1664525, h) + 1013904223;
    return ((h >>> 0) % 100000) / 100000;
  };
}

type DemoCategoryDefinition = {
  path: string;
  unit: string;
  packageUnit: string;
  key:
    | 'tiles-wall'
    | 'tiles-floor'
    | 'fixtures'
    | 'furniture'
    | 'showers'
    | 'pipes'
    | 'fittings'
    | 'lighting'
    | 'switches'
    | 'fasteners'
    | 'boards';
  brands: string[];
  templates: string[];
  basePriceRange: [number, number];
  installPriceRange?: [number, number];
};

const DEMO_CATEGORY_DEFINITIONS: DemoCategoryDefinition[] = [
  {
    key: 'tiles-wall',
    path: 'Laatat > Seinälaatat',
    unit: 'm2',
    packageUnit: 'm2',
    brands: ['Pukkila', 'Lasselsberger', 'Cersanit'],
    templates: ['Keraaminen seinälaatta', 'Mattapintainen seinälaatta', 'Kiiltävä seinälaatta'],
    basePriceRange: [18, 52],
    installPriceRange: [8, 22],
  },
  {
    key: 'tiles-floor',
    path: 'Laatat > Lattialaatat',
    unit: 'm2',
    packageUnit: 'm2',
    brands: ['Pukkila', 'Villeroy & Boch', 'Laattapiste'],
    templates: ['Keraaminen lattialaatta', 'Kivijäljitelmälaatta', 'Karheapintainen lattialaatta'],
    basePriceRange: [22, 68],
    installPriceRange: [9, 25],
  },
  {
    key: 'fixtures',
    path: 'Vesikalusteet > Hanat',
    unit: 'kpl',
    packageUnit: 'kpl',
    brands: ['Oras', 'Grohe', 'Hansgrohe'],
    templates: ['Pesuallashana', 'Suihkuhana', 'Termostaattihana'],
    basePriceRange: [95, 340],
    installPriceRange: [55, 145],
  },
  {
    key: 'furniture',
    path: 'Kalusteet > Allaskaapit',
    unit: 'kpl',
    packageUnit: 'kpl',
    brands: ['IDO', 'Hafa', 'Svedbergs'],
    templates: ['Allaskaappi', 'Peilikaappi', 'Laatikostoallas'],
    basePriceRange: [180, 620],
    installPriceRange: [40, 95],
  },
  {
    key: 'showers',
    path: 'Suihkuratkaisut > Suihkuseinät',
    unit: 'kpl',
    packageUnit: 'kpl',
    brands: ['Hietakari', 'Sanka', 'Bathlife'],
    templates: ['Suihkuseinä', 'Suihkunurkka', 'Kääntyvä suihkuseinä'],
    basePriceRange: [220, 740],
    installPriceRange: [65, 180],
  },
  {
    key: 'pipes',
    path: 'LVI > Putket',
    unit: 'm',
    packageUnit: 'm',
    brands: ['Uponor', 'Thermotech', 'LK'],
    templates: ['Monikerrosputki', 'PEX-putki', 'Suojaputki'],
    basePriceRange: [2.5, 18],
  },
  {
    key: 'fittings',
    path: 'LVI > Liittimet',
    unit: 'kpl',
    packageUnit: 'kpl',
    brands: ['Uponor', 'VSH', 'Geberit'],
    templates: ['Puserrusliitin', 'Kulmaliitin', 'Jatkoliitin'],
    basePriceRange: [3.5, 28],
  },
  {
    key: 'lighting',
    path: 'Sähkö > Valaisimet',
    unit: 'kpl',
    packageUnit: 'kpl',
    brands: ['Airam', 'Philips', 'Hide-a-lite'],
    templates: ['LED-valaisin', 'Peilivalaisin', 'Kattospotti'],
    basePriceRange: [18, 190],
  },
  {
    key: 'switches',
    path: 'Sähkö > Kytkimet',
    unit: 'kpl',
    packageUnit: 'kpl',
    brands: ['ABB', 'Schneider Electric', 'Ensto'],
    templates: ['Kytkin', 'Himmentin', 'Pistorasia'],
    basePriceRange: [6, 55],
  },
  {
    key: 'fasteners',
    path: 'Rakennusmateriaalit > Kiinnikkeet',
    unit: 'pkt',
    packageUnit: 'pkt',
    brands: ['Fischer', 'Essve', 'Senco'],
    templates: ['Porakärkiruuvi', 'Yleisruuvi', 'Kipsilevyruuvi'],
    basePriceRange: [4.5, 22],
  },
  {
    key: 'boards',
    path: 'Rakennusmateriaalit > Levyt ja rungot',
    unit: 'kpl',
    packageUnit: 'kpl',
    brands: ['Gyproc', 'Metsä Wood', 'Kronospan'],
    templates: ['Runkopuu', 'Kipsilevy', 'Rakennuslevy'],
    basePriceRange: [8, 42],
  },
];

function inferDemoCategory(index: number) {
  return DEMO_CATEGORY_DEFINITIONS[index % DEMO_CATEGORY_DEFINITIONS.length];
}

export function getDemoProductIndex(sourceProductId: string) {
  const match = sourceProductId.match(/-(\d{6})$/);
  if (!match) {
    return undefined;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value - 1 : undefined;
}

export function generateDemoSourceRecord(sourceName: string, index: number): SourceProductRecord {
  const category = inferDemoCategory(index);
  const random = makeSeededRandom(`demo-${index}`);
  const brand = category.brands[Math.floor(random() * category.brands.length) % category.brands.length];
  const template = category.templates[Math.floor(random() * category.templates.length) % category.templates.length];
  const variant = `${Math.floor(random() * 900) + 100}`;
  const productNumber = String(index + 1).padStart(6, '0');
  const [minPrice, maxPrice] = category.basePriceRange;
  const basePrice = roundCurrency(minPrice + random() * (maxPrice - minPrice));
  const marginPercent = roundCurrency(18 + random() * 32);
  const salePrice = roundCurrency(calculateSalePrice(basePrice, marginPercent));
  const installPrice = category.installPriceRange
    ? roundCurrency(category.installPriceRange[0] + random() * (category.installPriceRange[1] - category.installPriceRange[0]))
    : 0;
  const packageSize = category.packageUnit === 'm2' ? `${1 + Math.round(random() * 4)} ${category.packageUnit}` : `1 ${category.packageUnit}`;
  const name = `${brand} ${template} ${variant}`;
  const description = `${template} ${variant}, ${brand}, ${category.path.toLowerCase()}.`;

  return {
    sourceName,
    sourceProductId: `${sourceName}-${productNumber}`,
    sourceUrl: `https://example.invalid/${sourceName}/${productNumber}`,
    sourceCategoryPath: category.path,
    sourceBrand: brand,
    sourceNameRaw: name,
    sourceDescriptionRaw: description,
    sourcePrice: basePrice,
    sourceSalePrice: salePrice,
    sourceInstallPrice: installPrice,
    sourceMarginPercent: marginPercent,
    sourceSaleUnit: category.unit,
    sourcePackageSize: packageSize,
    sourceCurrency: DEFAULT_CURRENCY,
    availabilityText: index % 5 === 0 ? 'Rajallinen saatavuus' : index % 7 === 0 ? 'Tilaustuote' : 'Varastossa',
    manufacturerSku: `${brand.slice(0, 3).toUpperCase()}-${productNumber}`,
    ean: String(6400000000000 + index),
    rawPayload: {
      source_name: sourceName,
      source_product_id: `${sourceName}-${productNumber}`,
      category_path: category.path,
      brand,
      name,
      description,
      price: basePrice,
      sale_price: salePrice,
      install_price: installPrice,
      margin_percent: marginPercent,
      unit: category.unit,
      package_size: packageSize,
      availability: index % 5 === 0 ? 'Rajallinen saatavuus' : index % 7 === 0 ? 'Tilaustuote' : 'Varastossa',
    },
  };
}

export function generateDemoSourceRecords(sourceName: string, count = 1200): SourceProductRecord[] {
  return Array.from({ length: count }, (_, index) => generateDemoSourceRecord(sourceName, index));
}

function getAdapterDisplayName(sourceName: string) {
  switch (normalizeComparableText(sourceName)) {
    case 'k rauta':
      return 'K-Rauta';
    case 'stark':
      return 'STARK';
    case 'k rauta demo':
      return 'K-Rauta demo';
    case 'stark demo':
      return 'STARK demo';
    default:
      return cleanText(sourceName) || 'Lähde';
  }
}

export function registerCatalogAdapter(adapter: SourceAdapter) {
  adapterRegistry.set(adapter.sourceName, adapter);
  return adapter;
}

export function getCatalogAdapter(sourceName: string) {
  return adapterRegistry.get(sourceName) || createGenericAdapter(sourceName, getAdapterDisplayName(sourceName));
}

export function listCatalogAdapters() {
  return Array.from(adapterRegistry.values()).sort((left, right) => left.displayName.localeCompare(right.displayName, 'fi'));
}

export async function parseCatalogFile(file: File, sourceName: string) {
  return getCatalogAdapter(sourceName).parseFile(file);
}

export function parseCatalogDemo(sourceName: string, count = 1200) {
  const adapter = getCatalogAdapter(sourceName);
  if (adapter.generateDemoRows) {
    return adapter.generateDemoRows(count);
  }
  return generateDemoSourceRecords(sourceName, count);
}

function registerDefaultAdapters() {
  registerCatalogAdapter(createGenericAdapter('generic', 'Yleinen tiedosto'));
  registerCatalogAdapter(createGenericAdapter('k_rauta', 'K-Rauta'));
  registerCatalogAdapter(createGenericAdapter('stark', 'STARK'));
  registerCatalogAdapter({
    sourceName: 'k_rauta_demo',
    displayName: 'K-Rauta demo',
    supportedFormats: ['demo'],
    async parseFile() {
      return [];
    },
    generateDemoRows(count: number) {
      return generateDemoSourceRecords('k_rauta_demo', count);
    },
  });
  registerCatalogAdapter({
    sourceName: 'stark_demo',
    displayName: 'STARK demo',
    supportedFormats: ['demo'],
    async parseFile() {
      return [];
    },
    generateDemoRows(count: number) {
      return generateDemoSourceRecords('stark_demo', count);
    },
  });
}

registerDefaultAdapters();

export function getCatalogAdapterNames() {
  return listCatalogAdapters().map((adapter) => adapter.sourceName);
}

export function buildCatalogSourceDisplayName(sourceName: string) {
  return getAdapterDisplayName(sourceName);
}
