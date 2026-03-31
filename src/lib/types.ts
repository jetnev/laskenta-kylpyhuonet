export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type QuoteRowMode = 'product' | 'installation' | 'product_installation';

export interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  purchasePrice: number;
  installationGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallationGroup {
  id: string;
  name: string;
  defaultPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubstituteProduct {
  id: string;
  originalProductId: string;
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

export interface Project {
  id: string;
  customerId: string;
  name: string;
  site: string;
  regionCoefficient: number;
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
