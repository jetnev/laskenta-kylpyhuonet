import type { SupabaseClient } from '@supabase/supabase-js';

import type { Customer, Project, Quote, QuoteRow } from '@/lib/types';

import type { TenderPackageDetails } from '../types/tender-intelligence';
import type { TenderEditorImportPreview } from '../types/tender-editor-import';

const DEFAULT_VAT_PERCENT = 25.5;
const DEFAULT_MARGIN_PERCENT = 30;
const DEFAULT_VALIDITY_DAYS = 30;
const DEFAULT_REGION_COEFFICIENT = 1;

type UserBucketKey = 'customers' | 'projects' | 'quotes' | 'quote-rows';

interface ResolvedImportTarget {
  customerId: string | null;
  projectId: string | null;
  projectRegionCoefficient: number;
  willCreatePlaceholderTarget: boolean;
}

interface EnsuredImportTarget extends ResolvedImportTarget {
  customerId: string;
  projectId: string;
  createdPlaceholderTarget: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function buildOwnedAudit(userId: string, timestamp: string) {
  return {
    ownerUserId: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdByUserId: userId,
    updatedByUserId: userId,
  };
}

function getUserRecordId(key: UserBucketKey, userId: string) {
  return `user:${userId}:${key}`;
}

async function readUserBucket<T>(client: SupabaseClient, key: UserBucketKey, userId: string, fallback: T): Promise<T> {
  const { data, error } = await client
    .from('app_kv')
    .select('value')
    .eq('id', getUserRecordId(key, userId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.value == null) {
    return fallback;
  }

  return data.value as T;
}

async function writeUserBucket<T>(client: SupabaseClient, key: UserBucketKey, userId: string, value: T) {
  const { error } = await client.from('app_kv').upsert(
    {
      id: getUserRecordId(key, userId),
      storage_key: key,
      scope: 'user',
      owner_user_id: userId,
      organization_id: null,
      value,
      updated_at: nowIso(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw error;
  }
}

function generateQuoteNumber(prefix = 'TAR') {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  return `${prefix}-${datePart}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function buildPlaceholderCustomer(packageDetails: TenderPackageDetails, actorUserId: string, timestamp: string): Customer {
  return {
    id: crypto.randomUUID(),
    name: 'Tarjousäly-importit',
    contactPerson: undefined,
    email: undefined,
    phone: undefined,
    address: undefined,
    businessId: undefined,
    notes: `Luotu automaattisesti Tarjousälyn editor-importtia varten paketista “${packageDetails.package.name}”.`,
    ...buildOwnedAudit(actorUserId, timestamp),
  };
}

function buildPlaceholderProject(packageDetails: TenderPackageDetails, actorUserId: string, customerId: string, timestamp: string): Project {
  return {
    id: crypto.randomUUID(),
    customerId,
    name: packageDetails.package.name,
    site: packageDetails.package.name,
    region: 'Tarjousäly-import',
    regionCoefficient: DEFAULT_REGION_COEFFICIENT,
    notes: `Luotu automaattisesti Tarjousälyn editor-importtia varten draft packagesta “${packageDetails.package.name}”.`,
    customOptions: [],
    ...buildOwnedAudit(actorUserId, timestamp),
  };
}

function buildQuoteDraft(options: {
  actorUserId: string;
  projectId: string;
  quoteTitle: string;
  preview: TenderEditorImportPreview;
  timestamp: string;
}): Quote {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + DEFAULT_VALIDITY_DAYS);

  return {
    id: crypto.randomUUID(),
    projectId: options.projectId,
    title: options.quoteTitle,
    quoteNumber: generateQuoteNumber(),
    revisionNumber: 1,
    status: 'draft',
    vatPercent: DEFAULT_VAT_PERCENT,
    validUntil: validUntil.toISOString().slice(0, 10),
    sentAt: undefined,
    acceptedAt: undefined,
    rejectedAt: undefined,
    notes: options.preview.payload.sections.quote_notes_md ?? '',
    internalNotes: options.preview.payload.sections.quote_internal_notes_md ?? '',
    schedule: undefined,
    scheduleMilestones: [],
    termsId: undefined,
    termsSnapshotName: undefined,
    termsSnapshotContentMd: undefined,
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
    selectedMarginPercent: DEFAULT_MARGIN_PERCENT,
    pricingMode: 'margin',
    lastAutoSavedAt: options.timestamp,
    ...buildOwnedAudit(options.actorUserId, options.timestamp),
  };
}

function buildSectionRows(options: {
  actorUserId: string;
  quoteId: string;
  regionCoefficient: number;
  preview: TenderEditorImportPreview;
  timestamp: string;
}): QuoteRow[] {
  return options.preview.sections
    .filter((section) => section.item_count > 0)
    .map((section, index) => ({
      id: crypto.randomUUID(),
      quoteId: options.quoteId,
      sortOrder: index,
      mode: 'section',
      pricingModel: 'unit_price',
      unitPricingMode: 'manual',
      chargeType: undefined,
      source: 'manual',
      productId: undefined,
      productName: section.title,
      productCode: '',
      description: '',
      quantity: 0,
      unit: 'erä',
      purchasePrice: 0,
      salesPrice: 0,
      installationPrice: 0,
      marginPercent: 0,
      overridePrice: undefined,
      priceAdjustment: 0,
      regionMultiplier: options.regionCoefficient || DEFAULT_REGION_COEFFICIENT,
      installationGroupId: undefined,
      notes: '',
      manualSalesPrice: true,
      ...buildOwnedAudit(options.actorUserId, options.timestamp),
    }));
}

export async function resolveTenderEditorImportTarget(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  actorUserId: string;
}): Promise<ResolvedImportTarget> {
  const customers = await readUserBucket<Customer[]>(options.client, 'customers', options.actorUserId, []);
  const projects = await readUserBucket<Project[]>(options.client, 'projects', options.actorUserId, []);
  const linkedCustomer = options.packageDetails.package.linkedCustomerId
    ? customers.find((candidate) => candidate.id === options.packageDetails.package.linkedCustomerId) ?? null
    : null;
  const linkedProject = options.packageDetails.package.linkedProjectId
    ? projects.find((candidate) => candidate.id === options.packageDetails.package.linkedProjectId) ?? null
    : null;

  return {
    customerId: linkedProject?.customerId ?? linkedCustomer?.id ?? null,
    projectId: linkedProject?.id ?? null,
    projectRegionCoefficient: linkedProject?.regionCoefficient ?? DEFAULT_REGION_COEFFICIENT,
    willCreatePlaceholderTarget: !linkedProject,
  };
}

async function ensureTenderEditorImportTarget(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  actorUserId: string;
}): Promise<EnsuredImportTarget> {
  const timestamp = nowIso();
  const customers = await readUserBucket<Customer[]>(options.client, 'customers', options.actorUserId, []);
  const projects = await readUserBucket<Project[]>(options.client, 'projects', options.actorUserId, []);
  let nextCustomers = [...customers];
  let nextProjects = [...projects];
  let customer = options.packageDetails.package.linkedCustomerId
    ? nextCustomers.find((candidate) => candidate.id === options.packageDetails.package.linkedCustomerId) ?? null
    : null;
  let project = options.packageDetails.package.linkedProjectId
    ? nextProjects.find((candidate) => candidate.id === options.packageDetails.package.linkedProjectId) ?? null
    : null;
  let createdPlaceholderTarget = false;

  if (!customer && project) {
    customer = nextCustomers.find((candidate) => candidate.id === project.customerId) ?? null;
  }

  if (!customer) {
    customer = buildPlaceholderCustomer(options.packageDetails, options.actorUserId, timestamp);
    nextCustomers = [...nextCustomers, customer];
    await writeUserBucket(options.client, 'customers', options.actorUserId, nextCustomers);
    createdPlaceholderTarget = true;
  }

  if (!project) {
    project = buildPlaceholderProject(options.packageDetails, options.actorUserId, customer.id, timestamp);
    nextProjects = [...nextProjects, project];
    await writeUserBucket(options.client, 'projects', options.actorUserId, nextProjects);
    createdPlaceholderTarget = true;
  }

  return {
    customerId: customer.id,
    projectId: project.id,
    projectRegionCoefficient: project.regionCoefficient || DEFAULT_REGION_COEFFICIENT,
    willCreatePlaceholderTarget: createdPlaceholderTarget,
    createdPlaceholderTarget,
  };
}

export async function importTenderDraftPackageToEditor(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  preview: TenderEditorImportPreview;
  actorUserId: string;
}) {
  const timestamp = nowIso();
  const target = await ensureTenderEditorImportTarget({
    client: options.client,
    packageDetails: options.packageDetails,
    actorUserId: options.actorUserId,
  });
  const quotes = await readUserBucket<Quote[]>(options.client, 'quotes', options.actorUserId, []);
  const existingRows = await readUserBucket<QuoteRow[]>(options.client, 'quote-rows', options.actorUserId, []);
  const quote = buildQuoteDraft({
    actorUserId: options.actorUserId,
    projectId: target.projectId,
    quoteTitle: options.preview.payload.metadata.target_quote_title,
    preview: options.preview,
    timestamp,
  });
  const sectionRows = buildSectionRows({
    actorUserId: options.actorUserId,
    quoteId: quote.id,
    regionCoefficient: target.projectRegionCoefficient,
    preview: options.preview,
    timestamp,
  });

  await writeUserBucket(options.client, 'quotes', options.actorUserId, [...quotes, quote]);
  await writeUserBucket(options.client, 'quote-rows', options.actorUserId, [...existingRows, ...sectionRows]);

  return {
    draft_package_id: options.preview.payload.source_draft_package_id,
    imported_quote_id: quote.id,
    imported_project_id: target.projectId,
    imported_customer_id: target.customerId,
    created_placeholder_target: target.createdPlaceholderTarget,
  };
}