export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type QuoteRowMode = 'product' | 'installation' | 'product_installation';
export type UnitType = 'm2' | 'm²' | 'm' | 'jm' | 'kpl' | 'pkt' | 'ltv' | 'erä';

export interface RegionData {
  name: string;
  coefficient: number;
}

export const DEFAULT_REGIONS: RegionData[] = [
  { name: 'Pääkaupunkiseutu', coefficient: 1.15 },
  { name: 'Etelä-Suomi', coefficient: 1.05 },
  { name: 'Länsi-Suomi', coefficient: 1.0 },
  { name: 'Itä-Suomi', coefficient: 0.95 },
  { name: 'Pohjois-Suomi', coefficient: 0.9 },
];

export interface Product {
  id: string;
  code: string;
  name: string;
  category?: string;
  unit: string;
  purchasePrice: number;
  installationGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallationGroup {
  id: string;
  name: string;
  category?: string;
  defaultPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubstituteProduct {
  id: string;
  originalProductId?: string;
  manualOriginalCode?: string;
  manualOriginalName?: string;
  substituteProductId: string;
  createdAt: string;
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

export interface CustomOption {
  id: string;
  label: string;
  value: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  site: string;
  region?: string;
  regionCoefficient: number;
  notes?: string;
  customOptions?: CustomOption[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleMilestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  type: 'deadline' | 'delivery' | 'start' | 'completion' | 'other';
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
  schedule?: string;
  scheduleMilestones?: ScheduleMilestone[];
  termsId?: string;
  createdAt: string;
  updatedAt: string;
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
  unit: string;
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
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string;
  defaultVatPercent: number;
  defaultMarginPercent: number;
}
