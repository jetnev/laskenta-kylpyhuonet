export type UnitType = 'kpl' | 'm²' | 'jm' | 'm';

export type QuoteRowMode = 'product' | 'installation' | 'product_installation';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: UnitType;
  purchasePrice: number;
  installationGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallationGroup {
  id: string;
  name: string;
  defaultPrice: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubstituteProduct {
  id: string;
  primaryProductId: string;
  substituteProductId: string;
  justification: string;
  dimensionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  site: string;
  region: string;
  regionCoefficient: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  projectId: string;
  title: string;
  revisionNumber: number;
  parentQuoteId?: string;
  status: QuoteStatus;
  vatPercent: number;
  notes?: string;
  termsId?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

export interface QuoteRow {
  id: string;
  quoteId: string;
  sortOrder: number;
  mode: QuoteRowMode;
  productId?: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unit: UnitType;
  purchasePrice: number;
  salesPrice: number;
  installationPrice: number;
  marginPercent: number;
  overridePrice?: number;
  regionMultiplier: number;
  notes?: string;
}

export interface QuoteTerms {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  defaultVatPercent: number;
  defaultMarginPercent: number;
  defaultRegionCoefficient: number;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
}

export interface Region {
  name: string;
  coefficient: number;
}

export const DEFAULT_REGIONS: Region[] = [
  { name: 'PK-seutu', coefficient: 1.15 },
  { name: 'Tampere', coefficient: 1.10 },
  { name: 'Turku', coefficient: 1.08 },
  { name: 'Oulu', coefficient: 1.05 },
  { name: 'Muu Suomi', coefficient: 1.00 },
];

export interface QuoteCalculation {
  subtotal: number;
  vat: number;
  total: number;
  totalPurchaseCost: number;
  totalMargin: number;
  marginPercent: number;
}

export interface QuoteRowCalculation {
  productTotal: number;
  installationTotal: number;
  rowTotal: number;
  effectivePrice: number;
  purchaseCost: number;
  margin: number;
}

export interface ImportRow {
  code: string;
  name: string;
  category: string;
  unit: UnitType;
  purchasePrice: number;
  installationGroup?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface QuoteValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface DashboardStats {
  projectCount: number;
  quoteCount: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  totalSales: number;
  totalMargin: number;
  avgMarginPercent: number;
}

export interface TopProduct {
  productId: string;
  productCode: string;
  productName: string;
  totalQuantity: number;
  unit: UnitType;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  customerName: string;
  quoteCount: number;
  totalValue: number;
  latestQuoteDate: string;
  status: QuoteStatus;
}
