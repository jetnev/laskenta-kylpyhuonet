/**
 * Realistic user-scenario fixtures for integration testing.
 *
 * Simulates: Virtasen Remontti Oy (sole trader, 1 user)
 *   - 3 customers  (home, housing co., SME)
 *   - 5 projects   (Helsinki 1.0, Espoo 1.1, Tampere 0.95, Vantaa 1.05, Turku 0.9)
 *   - 7 products + 4 installation groups
 *   - 10 quotes    (4 draft, 2 sent, 2 accepted, 2 rejected)
 */

import type {
  Customer,
  InstallationGroup,
  Product,
  Project,
  Quote,
  QuoteRow,
  Settings,
} from '../types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const OWNER_USER_ID = 'user-juhani-001';
const NOW = '2026-04-08T12:00:00.000Z';

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────

export const testSettings: Settings = {
  companyName: 'Virtasen Remontti Oy',
  companyAddress: 'Remonttipolku 1, 00100 Helsinki',
  companyPhone: '+358 40 123 4567',
  companyEmail: 'info@virtasenremontti.fi',
  defaultVatPercent: 25.5,
  defaultMarginPercent: 35,
  defaultValidityDays: 30,
  quoteNumberPrefix: 'TAR',
  currency: 'EUR',
};

// ─────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────

export const customerHome: Customer = {
  id: 'cust-001',
  name: 'Matti Meikäläinen',
  contactPerson: 'Matti Meikäläinen',
  email: 'matti@example.fi',
  phone: '+358 40 111 2222',
  address: 'Kotikatu 5, 00200 Helsinki',
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const customerHousingCo: Customer = {
  id: 'cust-002',
  name: 'As Oy Koivula',
  contactPerson: 'Leena Korpi',
  email: 'leena.korpi@koivula.fi',
  phone: '+358 9 555 6677',
  address: 'Koivulankuja 3, 00300 Helsinki',
  businessId: '1234567-8',
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const customerSME: Customer = {
  id: 'cust-003',
  name: 'Renki Oy',
  contactPerson: 'Pekka Renki',
  email: 'pekka@renki.fi',
  phone: '+358 50 999 8888',
  address: 'Yritystie 10, 01600 Vantaa',
  businessId: '9876543-2',
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const allCustomers = [customerHome, customerHousingCo, customerSME];

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────

export const productFloorTile: Product = {
  id: 'prod-001',
  code: 'LAA-001',
  name: 'Keraaminen lattialaatta 30x30cm',
  category: 'Laatat',
  unit: 'm2',
  purchasePrice: 25.5,
  createdAt: NOW,
  updatedAt: NOW,
};

export const productWallTile: Product = {
  id: 'prod-002',
  code: 'LAA-002',
  name: 'Keraaminen seinälaatta 25x40cm',
  category: 'Laatat',
  unit: 'm2',
  purchasePrice: 32.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const productLargeTile: Product = {
  id: 'prod-003',
  code: 'LAA-003',
  name: 'Porcelain lattialaatta 60x60cm',
  category: 'Laatat',
  unit: 'm2',
  purchasePrice: 48.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const productShowerFaucet: Product = {
  id: 'prod-004',
  code: 'KAL-001',
  name: 'Suihkuhana termostaatilla',
  category: 'Vesikalusteet',
  unit: 'kpl',
  purchasePrice: 245.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const productShowerWall: Product = {
  id: 'prod-005',
  code: 'SUH-001',
  name: 'Suihkuseinä 80x200cm',
  category: 'Suihkutilat',
  unit: 'kpl',
  purchasePrice: 385.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const productSink: Product = {
  id: 'prod-006',
  code: 'KAL-002',
  name: 'Pesuallas 60cm',
  category: 'Kalusteet',
  unit: 'kpl',
  purchasePrice: 125.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const productGrout: Product = {
  id: 'prod-007',
  code: 'MAT-001',
  name: 'Saumausmassa valkoinen',
  category: 'Materiaalit',
  unit: 'pkt',
  purchasePrice: 12.5,
  createdAt: NOW,
  updatedAt: NOW,
};

export const allProducts = [
  productFloorTile, productWallTile, productLargeTile,
  productShowerFaucet, productShowerWall, productSink, productGrout,
];

// ─────────────────────────────────────────────
// Installation Groups
// ─────────────────────────────────────────────

export const installGroupTiling: InstallationGroup = {
  id: 'inst-001',
  name: 'Laatoitus',
  category: 'Laatat',
  defaultPrice: 35.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const installGroupFixture: InstallationGroup = {
  id: 'inst-002',
  name: 'Kalusteen asennus',
  category: 'Kalusteet',
  defaultPrice: 75.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const installGroupShower: InstallationGroup = {
  id: 'inst-003',
  name: 'Suihkuseinän asennus',
  category: 'Suihkutilat',
  defaultPrice: 95.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const installGroupFaucet: InstallationGroup = {
  id: 'inst-004',
  name: 'Hanojen asennus',
  category: 'Vesikalusteet',
  defaultPrice: 95.0,
  createdAt: NOW,
  updatedAt: NOW,
};

export const allInstallationGroups = [
  installGroupTiling, installGroupFixture, installGroupShower, installGroupFaucet,
];

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────

export const projectHelsinki: Project = {
  id: 'proj-001',
  customerId: 'cust-001',
  name: 'Kylpyhuoneremontti Helsinki',
  site: 'Kotikatu 5, 00200 Helsinki',
  region: 'Pääkaupunkiseutu',
  regionCoefficient: 1.0,
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const projectEspoo: Project = {
  id: 'proj-002',
  customerId: 'cust-002',
  name: 'Taloyhtiön kylpyhuonesaneeraus',
  site: 'Koivulankuja 3, 00300 Helsinki',
  region: 'Etelä-Suomi',
  regionCoefficient: 1.1,
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const projectTampere: Project = {
  id: 'proj-003',
  customerId: 'cust-001',
  name: 'WC-remontti Tampere',
  site: 'Tampereentie 8, 33100 Tampere',
  region: 'Itä-Suomi',
  regionCoefficient: 0.95,
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const projectVantaa: Project = {
  id: 'proj-004',
  customerId: 'cust-003',
  name: 'Toimistokylpyhuone',
  site: 'Yritystie 10, 01600 Vantaa',
  region: 'Etelä-Suomi',
  regionCoefficient: 1.05,
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const projectTurku: Project = {
  id: 'proj-005',
  customerId: 'cust-002',
  name: 'Pesuhuoneen pinnoitus Turku',
  site: 'Turunraitti 2, 20100 Turku',
  region: 'Länsi-Suomi',
  regionCoefficient: 0.9,
  ownerUserId: OWNER_USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

export const allProjects = [
  projectHelsinki, projectEspoo, projectTampere, projectVantaa, projectTurku,
];

export const projectById: Record<string, Project> = Object.fromEntries(allProjects.map(p => [p.id, p]));
export const customerById: Record<string, Customer> = Object.fromEntries(allCustomers.map(c => [c.id, c]));

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function baseQuote(
  overrides: Partial<Quote> & Pick<Quote, 'id' | 'projectId' | 'quoteNumber' | 'status'>
): Quote {
  return {
    revisionNumber: 1,
    title: 'Kylpyhuoneremontti',
    vatPercent: 25.5,
    validUntil: '2026-05-08',
    discountType: 'none',
    discountValue: 0,
    projectCosts: 0,
    deliveryCosts: 0,
    installationCosts: 0,
    travelKilometers: 0,
    travelRatePerKm: 0,
    disposalCosts: 0,
    demolitionCosts: 0,
    protectionCosts: 0,
    permitCosts: 0,
    selectedMarginPercent: 35,
    pricingMode: 'margin',
    ownerUserId: OWNER_USER_ID,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function baseRow(
  overrides: Partial<QuoteRow> & Pick<QuoteRow, 'id' | 'quoteId' | 'mode' | 'sortOrder'>
): QuoteRow {
  return {
    productName: '',
    quantity: 1,
    unit: 'kpl',
    purchasePrice: 0,
    salesPrice: 0,
    installationPrice: 0,
    marginPercent: 35,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
    ownerUserId: OWNER_USER_ID,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// Quote 1: Draft — Helsinki, margin pricing, unit_price
// ─────────────────────────────────────────────

export const quoteDraft1 = baseQuote({
  id: 'quote-001',
  projectId: 'proj-001',
  quoteNumber: 'TAR-20260408-001',
  status: 'draft',
  title: 'Kylpyhuoneremontti Helsinki',
  selectedMarginPercent: 35,
  pricingMode: 'margin',
});

export const quoteDraft1Rows: QuoteRow[] = [
  baseRow({
    id: 'row-001-1', quoteId: 'quote-001', sortOrder: 1,
    mode: 'section',
    productName: 'Lattia',
    purchasePrice: 0, salesPrice: 0, installationPrice: 0,
    quantity: 0, unit: 'erä',
  }),
  baseRow({
    id: 'row-001-2', quoteId: 'quote-001', sortOrder: 2,
    mode: 'product_installation',
    productId: 'prod-001',
    productName: 'Keraaminen lattialaatta 30x30cm',
    productCode: 'LAA-001',
    quantity: 8.5, unit: 'm2',
    purchasePrice: 25.5,
    salesPrice: 93.08,    // 35% margin over combined cost (25.5+35.0)*1.0/0.65
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-001-3', quoteId: 'quote-001', sortOrder: 3,
    mode: 'section',
    productName: 'Seinät',
    purchasePrice: 0, salesPrice: 0, installationPrice: 0,
    quantity: 0, unit: 'erä',
  }),
  baseRow({
    id: 'row-001-4', quoteId: 'quote-001', sortOrder: 4,
    mode: 'product_installation',
    productId: 'prod-002',
    productName: 'Keraaminen seinälaatta 25x40cm',
    productCode: 'LAA-002',
    quantity: 14.0, unit: 'm2',
    purchasePrice: 32.0,
    salesPrice: 103.08,   // 35% margin over combined cost (32+35)*1.0/0.65
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-001-5', quoteId: 'quote-001', sortOrder: 5,
    mode: 'product',
    productId: 'prod-004',
    productName: 'Suihkuhana termostaatilla',
    productCode: 'KAL-001',
    quantity: 1, unit: 'kpl',
    purchasePrice: 245.0,
    salesPrice: 376.92,
    installationPrice: 0,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-001-6', quoteId: 'quote-001', sortOrder: 6,
    mode: 'installation',
    productName: 'Suihkuhanan asennus',
    quantity: 1, unit: 'kpl',
    purchasePrice: 0,
    salesPrice: 146.15,   // 35% margin over installation cost 95/0.65
    installationPrice: 95.0,
    installationGroupId: 'inst-004',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-001-7', quoteId: 'quote-001', sortOrder: 7,
    mode: 'charge',
    chargeType: 'disposal',
    productName: 'Jätemaksu',
    quantity: 1, unit: 'erä',
    purchasePrice: 0,
    salesPrice: 150.0,
    installationPrice: 0,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 2: Draft — Helsinki, manual pricing + percent discount
// ─────────────────────────────────────────────

export const quoteDraft2 = baseQuote({
  id: 'quote-002',
  projectId: 'proj-001',
  quoteNumber: 'TAR-20260408-002',
  status: 'draft',
  title: 'Kylpyhuoneremontti Helsinki — premium',
  pricingMode: 'manual',
  discountType: 'percent',
  discountValue: 10,
});

export const quoteDraft2Rows: QuoteRow[] = [
  baseRow({
    id: 'row-002-1', quoteId: 'quote-002', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-003',
    productName: 'Porcelain lattialaatta 60x60cm',
    quantity: 8.5, unit: 'm2',
    purchasePrice: 48.0,
    salesPrice: 125.0,    // manual price — combined product+installation at ~29.6% margin
    installationPrice: 40.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
    unitPricingMode: 'manual',
    manualSalesPrice: true,
  }),
  baseRow({
    id: 'row-002-2', quoteId: 'quote-002', sortOrder: 2,
    mode: 'product',
    productId: 'prod-005',
    productName: 'Suihkuseinä 80x200cm',
    quantity: 1, unit: 'kpl',
    purchasePrice: 385.0,
    salesPrice: 620.0,
    installationPrice: 0,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
    unitPricingMode: 'manual',
    manualSalesPrice: true,
  }),
  baseRow({
    id: 'row-002-3', quoteId: 'quote-002', sortOrder: 3,
    mode: 'installation',
    productName: 'Suihkuseinän asennus',
    quantity: 1, unit: 'kpl',
    purchasePrice: 0,
    salesPrice: 120.0,    // manual price — installation with ~20.8% margin
    installationPrice: 95.0,
    installationGroupId: 'inst-003',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-002-4', quoteId: 'quote-002', sortOrder: 4,
    mode: 'product',
    productId: 'prod-006',
    productName: 'Pesuallas 60cm',
    quantity: 1, unit: 'kpl',
    purchasePrice: 125.0,
    salesPrice: 220.0,
    installationPrice: 0,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
    unitPricingMode: 'manual',
    manualSalesPrice: true,
  }),
];

// ─────────────────────────────────────────────
// Quote 3: Draft — Espoo, region coefficient 1.1 on rows
// ─────────────────────────────────────────────

export const quoteDraft3 = baseQuote({
  id: 'quote-003',
  projectId: 'proj-002',
  quoteNumber: 'TAR-20260408-003',
  status: 'draft',
  title: 'Taloyhtiön kylpyhuonesaneeraus',
  selectedMarginPercent: 30,
  pricingMode: 'margin',
  disposalCosts: 200,
  demolitionCosts: 350,
});

export const quoteDraft3Rows: QuoteRow[] = [
  baseRow({
    id: 'row-003-1', quoteId: 'quote-003', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-001',
    productName: 'Keraaminen lattialaatta 30x30cm',
    quantity: 6.0, unit: 'm2',
    purchasePrice: 25.5,
    salesPrice: 95.07,    // 30% margin over combined cost (25.5+35)*1.1/0.70
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.1,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-003-2', quoteId: 'quote-003', sortOrder: 2,
    mode: 'product_installation',
    productId: 'prod-002',
    productName: 'Keraaminen seinälaatta 25x40cm',
    quantity: 12.0, unit: 'm2',
    purchasePrice: 32.0,
    salesPrice: 105.29,   // 30% margin over combined cost (32+35)*1.1/0.70
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.1,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 4: Draft — Tampere, line_total pricing model
// ─────────────────────────────────────────────

export const quoteDraft4 = baseQuote({
  id: 'quote-004',
  projectId: 'proj-003',
  quoteNumber: 'TAR-20260408-004',
  status: 'draft',
  title: 'WC-remontti Tampere — kokonaishinnoin',
  pricingMode: 'manual',
});

export const quoteDraft4Rows: QuoteRow[] = [
  baseRow({
    id: 'row-004-1', quoteId: 'quote-004', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-001',
    productName: 'Keraaminen lattialaatta (lattia)',
    quantity: 3.5, unit: 'm2',
    purchasePrice: 25.5,
    salesPrice: 0,
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    overridePrice: 375.0,   // total line price overrides unit
    regionMultiplier: 0.95,
    pricingModel: 'line_total',
  }),
  baseRow({
    id: 'row-004-2', quoteId: 'quote-004', sortOrder: 2,
    mode: 'product',
    productId: 'prod-007',
    productName: 'Saumausmassa valkoinen',
    quantity: 4, unit: 'pkt',
    purchasePrice: 12.5,
    salesPrice: 18.27,    // 35% margin over product cost 12.5*0.95/0.65
    installationPrice: 0,
    regionMultiplier: 0.95,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-004-3', quoteId: 'quote-004', sortOrder: 3,
    mode: 'charge',
    chargeType: 'travel',
    productName: 'Matkakustannukset',
    quantity: 1, unit: 'erä',
    purchasePrice: 0,
    salesPrice: 80.0,
    installationPrice: 0,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 5: Sent — Vantaa SME, 40% margin
// ─────────────────────────────────────────────

export const quoteSent1 = baseQuote({
  id: 'quote-005',
  projectId: 'proj-004',
  quoteNumber: 'TAR-20260401-005',
  status: 'sent',
  sentAt: '2026-04-01T09:00:00.000Z',
  title: 'Toimistokylpyhuone Vantaa',
  selectedMarginPercent: 40,
  pricingMode: 'margin',
  validUntil: '2026-05-01',
});

export const quoteSent1Rows: QuoteRow[] = [
  baseRow({
    id: 'row-005-1', quoteId: 'quote-005', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-002',
    productName: 'Keraaminen seinälaatta 25x40cm',
    quantity: 20.0, unit: 'm2',
    purchasePrice: 32.0,
    salesPrice: 117.25,   // 40% margin over combined cost (32+35)*1.05/0.60
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.05,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-005-2', quoteId: 'quote-005', sortOrder: 2,
    mode: 'product_installation',
    productId: 'prod-004',
    productName: 'Suihkuhana termostaatilla',
    quantity: 2, unit: 'kpl',
    purchasePrice: 245.0,
    salesPrice: 595.0,    // 40% margin over combined cost (245+95)*1.05/0.60
    installationPrice: 95.0,
    installationGroupId: 'inst-004',
    regionMultiplier: 1.05,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-005-3', quoteId: 'quote-005', sortOrder: 3,
    mode: 'product',
    productId: 'prod-006',
    productName: 'Pesuallas 60cm',
    quantity: 2, unit: 'kpl',
    purchasePrice: 125.0,
    salesPrice: 218.75,   // 40% margin over product cost 125*1.05/0.60
    installationPrice: 0,
    regionMultiplier: 1.05,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-005-4', quoteId: 'quote-005', sortOrder: 4,
    mode: 'charge',
    chargeType: 'permit',
    productName: 'Lupamaksu',
    quantity: 1, unit: 'erä',
    purchasePrice: 0,
    salesPrice: 250.0,
    installationPrice: 0,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 6: Sent — Turku, region 0.9, travel costs
// ─────────────────────────────────────────────

export const quoteSent2 = baseQuote({
  id: 'quote-006',
  projectId: 'proj-005',
  quoteNumber: 'TAR-20260325-006',
  status: 'sent',
  sentAt: '2026-03-25T08:00:00.000Z',
  title: 'Pesuhuoneen pinnoitus Turku',
  selectedMarginPercent: 35,
  pricingMode: 'margin',
  validUntil: '2026-04-25',
  travelKilometers: 180,
  travelRatePerKm: 0.25,
});

export const quoteSent2Rows: QuoteRow[] = [
  baseRow({
    id: 'row-006-1', quoteId: 'quote-006', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-001',
    productName: 'Keraaminen lattialaatta 30x30cm',
    quantity: 10.0, unit: 'm2',
    purchasePrice: 25.5,
    salesPrice: 83.77,    // 35% margin over combined cost (25.5+35)*0.9/0.65
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 0.9,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-006-2', quoteId: 'quote-006', sortOrder: 2,
    mode: 'product_installation',
    productId: 'prod-002',
    productName: 'Keraaminen seinälaatta 25x40cm',
    quantity: 18.0, unit: 'm2',
    purchasePrice: 32.0,
    salesPrice: 92.77,    // 35% margin over combined cost (32+35)*0.9/0.65
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 0.9,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-006-3', quoteId: 'quote-006', sortOrder: 3,
    mode: 'product',
    productId: 'prod-007',
    productName: 'Saumausmassa valkoinen',
    quantity: 6, unit: 'pkt',
    purchasePrice: 12.5,
    salesPrice: 17.31,    // 35% margin over product cost 12.5*0.9/0.65
    installationPrice: 0,
    regionMultiplier: 0.9,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 7: Accepted — Helsinki, used for invoice tests
// ─────────────────────────────────────────────

export const quoteAccepted1 = baseQuote({
  id: 'quote-007',
  projectId: 'proj-001',
  quoteNumber: 'TAR-20260310-007',
  status: 'accepted',
  sentAt: '2026-03-10T09:00:00.000Z',
  acceptedAt: '2026-03-15T14:00:00.000Z',
  title: 'Kylpyhuoneremontti Helsinki — hyväksytty',
  selectedMarginPercent: 35,
  pricingMode: 'margin',
  validUntil: '2026-04-10',
  notes: 'Asiakas toivoo aloitusta huhtikuussa',
  disposalCosts: 150,
});

export const quoteAccepted1Rows: QuoteRow[] = [
  baseRow({
    id: 'row-007-1', quoteId: 'quote-007', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-001',
    productName: 'Keraaminen lattialaatta 30x30cm',
    quantity: 7.5, unit: 'm2',
    purchasePrice: 25.5,
    salesPrice: 93.08,    // 35% margin over combined cost (25.5+35)*1.0/0.65
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-007-2', quoteId: 'quote-007', sortOrder: 2,
    mode: 'product_installation',
    productId: 'prod-002',
    productName: 'Keraaminen seinälaatta 25x40cm',
    quantity: 12.0, unit: 'm2',
    purchasePrice: 32.0,
    salesPrice: 103.08,   // 35% margin over combined cost (32+35)*1.0/0.65
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-007-3', quoteId: 'quote-007', sortOrder: 3,
    mode: 'product',
    productId: 'prod-006',
    productName: 'Pesuallas 60cm',
    quantity: 1, unit: 'kpl',
    purchasePrice: 125.0,
    salesPrice: 192.31,
    installationPrice: 0,
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-007-4', quoteId: 'quote-007', sortOrder: 4,
    mode: 'installation',
    productName: 'Pesualtaan asennus',
    quantity: 1, unit: 'kpl',
    purchasePrice: 0,
    salesPrice: 115.38,   // 35% margin over installation cost 75/0.65
    installationPrice: 75.0,
    installationGroupId: 'inst-002',
    regionMultiplier: 1.0,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 8: Accepted — Espoo, amount discount 200€
// ─────────────────────────────────────────────

export const quoteAccepted2 = baseQuote({
  id: 'quote-008',
  projectId: 'proj-002',
  quoteNumber: 'TAR-20260301-008',
  status: 'accepted',
  sentAt: '2026-03-01T09:00:00.000Z',
  acceptedAt: '2026-03-10T11:00:00.000Z',
  title: 'Taloyhtiön saneeraus — hyväksytty',
  selectedMarginPercent: 30,
  pricingMode: 'margin',
  discountType: 'amount',
  discountValue: 200,
  validUntil: '2026-04-01',
});

export const quoteAccepted2Rows: QuoteRow[] = [
  baseRow({
    id: 'row-008-1', quoteId: 'quote-008', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-003',
    productName: 'Porcelain lattialaatta 60x60cm',
    quantity: 5.0, unit: 'm2',
    purchasePrice: 48.0,
    salesPrice: 130.43,   // 30% margin over combined cost (48+35)*1.1/0.70
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.1,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-008-2', quoteId: 'quote-008', sortOrder: 2,
    mode: 'product_installation',
    productId: 'prod-005',
    productName: 'Suihkuseinä 80x200cm',
    quantity: 1, unit: 'kpl',
    purchasePrice: 385.0,
    salesPrice: 754.29,   // 30% margin over combined cost (385+95)*1.1/0.70
    installationPrice: 95.0,
    installationGroupId: 'inst-003',
    regionMultiplier: 1.1,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 9: Rejected — Tampere, expired
// ─────────────────────────────────────────────

export const quoteRejected1 = baseQuote({
  id: 'quote-009',
  projectId: 'proj-003',
  quoteNumber: 'TAR-20260201-009',
  status: 'rejected',
  sentAt: '2026-02-01T09:00:00.000Z',
  rejectedAt: '2026-02-20T10:00:00.000Z',
  title: 'WC-remontti Tampere — hylätty',
  selectedMarginPercent: 35,
  validUntil: '2026-03-01',
});

export const quoteRejected1Rows: QuoteRow[] = [
  baseRow({
    id: 'row-009-1', quoteId: 'quote-009', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-001',
    productName: 'Keraaminen lattialaatta',
    quantity: 4.0, unit: 'm2',
    purchasePrice: 25.5,
    salesPrice: 88.42,    // 35% margin over combined cost (25.5+35)*0.95/0.65
    installationPrice: 35.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 0.95,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Quote 10: Rejected — Vantaa, too expensive
// ─────────────────────────────────────────────

export const quoteRejected2 = baseQuote({
  id: 'quote-010',
  projectId: 'proj-004',
  quoteNumber: 'TAR-20260215-010',
  status: 'rejected',
  sentAt: '2026-02-15T09:00:00.000Z',
  rejectedAt: '2026-03-01T10:00:00.000Z',
  title: 'Toimistokylpyhuone v2 — hylätty',
  selectedMarginPercent: 45,
  validUntil: '2026-03-15',
});

export const quoteRejected2Rows: QuoteRow[] = [
  baseRow({
    id: 'row-010-1', quoteId: 'quote-010', sortOrder: 1,
    mode: 'product_installation',
    productId: 'prod-003',
    productName: 'Porcelain lattialaatta 60x60cm',
    quantity: 8.0, unit: 'm2',
    purchasePrice: 48.0,
    salesPrice: 168.0,    // 45% margin over combined cost (48+40)*1.05/0.55
    installationPrice: 40.0,
    installationGroupId: 'inst-001',
    regionMultiplier: 1.05,
    pricingModel: 'unit_price',
  }),
  baseRow({
    id: 'row-010-2', quoteId: 'quote-010', sortOrder: 2,
    mode: 'product',
    productId: 'prod-004',
    productName: 'Suihkuhana termostaatilla',
    quantity: 1, unit: 'kpl',
    purchasePrice: 245.0,
    salesPrice: 467.73,   // 45% margin over product cost 245*1.05/0.55
    installationPrice: 0,
    regionMultiplier: 1.05,
    pricingModel: 'unit_price',
  }),
];

// ─────────────────────────────────────────────
// Aggregate collections
// ─────────────────────────────────────────────

export const allQuotes: Quote[] = [
  quoteDraft1, quoteDraft2, quoteDraft3, quoteDraft4,
  quoteSent1, quoteSent2,
  quoteAccepted1, quoteAccepted2,
  quoteRejected1, quoteRejected2,
];

export const quoteRowsMap: Record<string, QuoteRow[]> = {
  'quote-001': quoteDraft1Rows,
  'quote-002': quoteDraft2Rows,
  'quote-003': quoteDraft3Rows,
  'quote-004': quoteDraft4Rows,
  'quote-005': quoteSent1Rows,
  'quote-006': quoteSent2Rows,
  'quote-007': quoteAccepted1Rows,
  'quote-008': quoteAccepted2Rows,
  'quote-009': quoteRejected1Rows,
  'quote-010': quoteRejected2Rows,
};

export const allQuoteRowsFlat: QuoteRow[] = Object.values(quoteRowsMap).flat();
