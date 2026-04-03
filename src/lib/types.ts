export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';
export type QuoteDiscountType = 'none' | 'percent' | 'amount';
export type QuotePricingMode = 'margin' | 'manual';
export type QuoteRowMode = 'product' | 'installation' | 'product_installation' | 'section' | 'charge';
export type QuoteRowPricingModel = 'unit_price' | 'line_total';
export type TermTemplateCustomerSegment = 'consumer' | 'business';
export type TermTemplateScopeType = 'product_only' | 'product_install' | 'installation_contract' | 'project';
export type QuoteChargeType =
  | 'project'
  | 'delivery'
  | 'installation'
  | 'travel'
  | 'disposal'
  | 'demolition'
  | 'protection'
  | 'permit'
  | 'other';
export type UnitType = 'm2' | 'm²' | 'm' | 'm3' | 'jm' | 'kpl' | 'pkt' | 'ltv' | 'kg' | 'l' | 'erä' | 'h' | 'palvelu';

export interface RegionData {
  name: string;
  coefficient: number;
}

export interface AuditFields {
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  updatedByUserId?: string;
}

export interface OwnedFields extends AuditFields {
  ownerUserId: string;
}

export const DEFAULT_REGIONS: RegionData[] = [
  { name: 'Pääkaupunkiseutu', coefficient: 1.15 },
  { name: 'Etelä-Suomi', coefficient: 1.05 },
  { name: 'Länsi-Suomi', coefficient: 1.0 },
  { name: 'Itä-Suomi', coefficient: 0.95 },
  { name: 'Pohjois-Suomi', coefficient: 0.9 },
];

export interface Product extends AuditFields {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  internalCode?: string;
  brand?: string;
  manufacturer?: string;
  manufacturerSku?: string;
  ean?: string;
  normalizedName?: string;
  packageSize?: number;
  packageUnit?: string;
  unit: UnitType | string;
  salesUnit?: string;
  baseUnit?: string;
  purchasePrice: number;
  defaultCostPrice?: number;
  defaultSalePrice?: number;
  defaultSalesMarginPercent?: number;
  defaultInstallationPrice?: number;
  defaultMarginPercent?: number;
  defaultInstallPrice?: number;
  categoryId?: string;
  subcategoryId?: string;
  installationGroupId?: string;
  isActive?: boolean;
  active?: boolean;
  searchableText?: string;
  sourceNames?: string[];
  sourceCount?: number;
  tags?: string[];
}

export interface InstallationGroup extends AuditFields {
  id: string;
  name: string;
  category?: string;
  description?: string;
  defaultPrice: number;
  defaultMarginPercent?: number;
  defaultInstallationPrice?: number;
}

export type InstallationGroupIndustryPreset =
  | 'construction'
  | 'electrical'
  | 'plumbing'
  | 'furniture'
  | 'general'
  | 'custom';

export interface InstallationGroupCategoryPreference {
  name: string;
  visible: boolean;
  favorite: boolean;
  sortOrder: number;
}

export interface InstallationGroupCategorySettings {
  industryPreset?: InstallationGroupIndustryPreset;
  hideEmptyCategories: boolean;
  showFavoritesOnly: boolean;
  preferences: InstallationGroupCategoryPreference[];
}

export interface SubstituteProduct extends AuditFields {
  id: string;
  originalProductId?: string;
  manualOriginalCode?: string;
  manualOriginalName?: string;
  substituteProductId: string;
  notes?: string;
}

export interface Customer extends OwnedFields {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  businessId?: string;
  notes?: string;
}

export interface CustomOption {
  id: string;
  label: string;
  value: string;
}

export interface Project extends OwnedFields {
  id: string;
  customerId: string;
  name: string;
  site: string;
  region?: string;
  regionCoefficient: number;
  notes?: string;
  customOptions?: CustomOption[];
}

export interface ScheduleMilestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  type: 'deadline' | 'delivery' | 'start' | 'completion' | 'other';
}

export interface Quote extends OwnedFields {
  id: string;
  projectId: string;
  title: string;
  quoteNumber: string;
  revisionNumber: number;
  parentQuoteId?: string;
  status: QuoteStatus;
  vatPercent: number;
  validUntil?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  notes?: string;
  internalNotes?: string;
  schedule?: string;
  scheduleMilestones?: ScheduleMilestone[];
  termsId?: string;
  termsSnapshotName?: string;
  termsSnapshotContentMd?: string;
  discountType: QuoteDiscountType;
  discountValue: number;
  projectCosts: number;
  deliveryCosts: number;
  installationCosts: number;
  travelKilometers: number;
  travelRatePerKm: number;
  disposalCosts: number;
  demolitionCosts: number;
  protectionCosts: number;
  permitCosts: number;
  selectedMarginPercent: number;
  pricingMode: QuotePricingMode;
  lastAutoSavedAt?: string;
}

export interface QuoteRow extends OwnedFields {
  id: string;
  quoteId: string;
  sortOrder: number;
  mode: QuoteRowMode;
  pricingModel?: QuoteRowPricingModel;
  chargeType?: QuoteChargeType;
  source?: 'manual' | 'catalog';
  productId?: string;
  productName: string;
  productCode?: string;
  description?: string;
  quantity: number;
  unit: UnitType | string;
  purchasePrice: number;
  salesPrice: number;
  installationPrice: number;
  marginPercent: number;
  overridePrice?: number;
  priceAdjustment?: number;
  regionMultiplier: number;
  installationGroupId?: string;
  notes?: string;
  manualSalesPrice?: boolean;
}

export interface QuoteTerms extends AuditFields {
  id: string;
  name: string;
  slug: string;
  description: string;
  customerSegment: TermTemplateCustomerSegment;
  scopeType: TermTemplateScopeType;
  contentMd: string;
  isSystem: boolean;
  baseTemplateId?: string;
  version: number;
  isActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  ownerUserId?: string;
}

export interface InvoiceCustomerSnapshot {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  businessId?: string;
}

export interface InvoiceProjectSnapshot {
  name: string;
  site: string;
  region?: string;
  notes?: string;
}

export interface InvoiceCompanySnapshot {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string;
  businessId?: string;
  iban?: string;
  bic?: string;
  invoiceNumberPrefix?: string;
  defaultInvoiceDueDays?: number;
  lateInterestPercent?: number;
}

export interface Invoice extends OwnedFields {
  id: string;
  projectId: string;
  customerId: string;
  sourceQuoteId: string;
  sourceQuoteNumber: string;
  sourceQuoteRevisionNumber: number;
  invoiceNumber: string;
  referenceNumber: string;
  title: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paymentTermDays: number;
  currency: string;
  vatPercent: number;
  discountType: QuoteDiscountType;
  discountValue: number;
  projectCosts: number;
  deliveryCosts: number;
  installationCosts: number;
  travelKilometers: number;
  travelRatePerKm: number;
  disposalCosts: number;
  demolitionCosts: number;
  protectionCosts: number;
  permitCosts: number;
  notes?: string;
  internalNotes?: string;
  termsSnapshotName?: string;
  termsSnapshotContentMd?: string;
  customer: InvoiceCustomerSnapshot;
  project: InvoiceProjectSnapshot;
  company: InvoiceCompanySnapshot;
  rows: QuoteRow[];
  issuedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  lastAutoSavedAt?: string;
}

export interface CompanyProfile {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string;
  businessId?: string;
  iban?: string;
  bic?: string;
  invoiceNumberPrefix?: string;
  defaultInvoiceDueDays?: number;
  lateInterestPercent?: number;
}

export interface Settings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  updateFeedUrl?: string;
  companyLogo?: string;
  defaultVatPercent: number;
  defaultMarginPercent: number;
  defaultValidityDays: number;
  quoteNumberPrefix: string;
  currency: string;
}
