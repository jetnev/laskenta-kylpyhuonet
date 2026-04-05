import type { SupabaseClient } from '@supabase/supabase-js';

import type { Customer, Project, Quote, QuoteRow } from '@/lib/types';

import type { TenderPackageDetails } from '../types/tender-intelligence';
import type {
  TenderEditorImportMode,
  TenderEditorImportPayload,
  TenderEditorImportPreview,
  TenderEditorImportResult,
} from '../types/tender-editor-import';

const DEFAULT_VAT_PERCENT = 25.5;
const DEFAULT_MARGIN_PERCENT = 30;
const DEFAULT_VALIDITY_DAYS = 30;
const DEFAULT_REGION_COEFFICIENT = 1;
const MANAGED_QUOTE_NOTES_BLOCK_ID = 'quote_notes';
const MANAGED_INTERNAL_NOTES_BLOCK_ID = 'quote_internal_notes';
const MANAGED_TEXT_BLOCK_PREFIX = 'tender-editor-import';
const MANAGED_SECTION_ROW_NOTE_PREFIX = 'tender-editor-import';

type UserBucketKey = 'customers' | 'projects' | 'quotes' | 'quote-rows';

interface ResolvedImportTarget {
  customerId: string | null;
  projectId: string | null;
  quoteId: string | null;
  quoteTitle: string | null;
  projectRegionCoefficient: number;
  willCreatePlaceholderTarget: boolean;
  importedQuoteMissing: boolean;
}

interface EnsuredImportTarget extends ResolvedImportTarget {
  customerId: string;
  projectId: string;
  createdPlaceholderTarget: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeContent(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactTextBlocks(value: string | null | undefined) {
  const nextValue = value?.replace(/\n{3,}/g, '\n\n').trim();
  return nextValue ? nextValue : undefined;
}

function getManagedTextBlockMarkers(blockId: string) {
  return {
    start: `<!-- ${MANAGED_TEXT_BLOCK_PREFIX}:${blockId}:start -->`,
    end: `<!-- ${MANAGED_TEXT_BLOCK_PREFIX}:${blockId}:end -->`,
  };
}

function buildManagedTextBlock(blockId: string, content: string | null | undefined) {
  const nextContent = normalizeContent(content);

  if (!nextContent) {
    return null;
  }

  const markers = getManagedTextBlockMarkers(blockId);
  return `${markers.start}\n${nextContent}\n${markers.end}`;
}

function upsertManagedTextBlock(options: {
  existingValue?: string | null;
  blockId: string;
  content: string | null | undefined;
  legacyCandidates?: Array<string | null | undefined>;
}) {
  const existingValue = options.existingValue ?? '';
  const nextBlock = buildManagedTextBlock(options.blockId, options.content);
  const markers = getManagedTextBlockMarkers(options.blockId);
  const blockPattern = new RegExp(`${escapeRegex(markers.start)}[\\s\\S]*?${escapeRegex(markers.end)}`, 'm');

  if (blockPattern.test(existingValue)) {
    const replaced = nextBlock ? existingValue.replace(blockPattern, nextBlock) : existingValue.replace(blockPattern, '');
    return compactTextBlocks(replaced);
  }

  if (!nextBlock) {
    return compactTextBlocks(existingValue);
  }

  const normalizedExisting = normalizeContent(existingValue);
  const normalizedLegacyCandidates = (options.legacyCandidates ?? [])
    .map((candidate) => normalizeContent(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  if (!normalizedExisting || normalizedLegacyCandidates.some((candidate) => candidate === normalizedExisting)) {
    return nextBlock;
  }

  return compactTextBlocks(`${nextBlock}\n\n${existingValue}`);
}

function buildManagedSectionRowNote(draftPackageId: string, sectionKey: string) {
  return `${MANAGED_SECTION_ROW_NOTE_PREFIX}:${draftPackageId}:${sectionKey}`;
}

function parseManagedSectionRowNote(value?: string | null) {
  const nextValue = value?.trim();

  if (!nextValue || !nextValue.startsWith(`${MANAGED_SECTION_ROW_NOTE_PREFIX}:`)) {
    return null;
  }

  const [, draftPackageId = '', sectionKey = ''] = nextValue.split(':');

  if (!draftPackageId || !sectionKey) {
    return null;
  }

  return { draftPackageId, sectionKey };
}

function isManagedSectionRow(row: QuoteRow, draftPackageId: string) {
  const marker = parseManagedSectionRowNote(row.notes);
  return row.mode === 'section' && marker?.draftPackageId === draftPackageId;
}

function isLikelyLegacyImportSectionRow(row: QuoteRow) {
  return row.mode === 'section'
    && row.quantity === 0
    && row.purchasePrice === 0
    && row.salesPrice === 0
    && row.installationPrice === 0
    && row.source === 'manual'
    && row.unit === 'erä';
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
    notes: upsertManagedTextBlock({
      blockId: MANAGED_QUOTE_NOTES_BLOCK_ID,
      content: options.preview.payload.sections.quote_notes_md,
    }),
    internalNotes: upsertManagedTextBlock({
      blockId: MANAGED_INTERNAL_NOTES_BLOCK_ID,
      content: options.preview.payload.sections.quote_internal_notes_md,
    }),
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
  draftPackageId: string;
  quoteId: string;
  regionCoefficient: number;
  preview: TenderEditorImportPreview;
  timestamp: string;
  existingRowsBySectionKey?: Map<string, QuoteRow>;
}): QuoteRow[] {
  return options.preview.sections
    .filter((section) => section.item_count > 0)
    .map((section, index) => {
      const existingRow = options.existingRowsBySectionKey?.get(section.key);

      return {
        id: existingRow?.id ?? crypto.randomUUID(),
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
        notes: buildManagedSectionRowNote(options.draftPackageId, section.key),
        manualSalesPrice: true,
        ownerUserId: existingRow?.ownerUserId ?? options.actorUserId,
        createdAt: existingRow?.createdAt ?? options.timestamp,
        updatedAt: options.timestamp,
        createdByUserId: existingRow?.createdByUserId ?? options.actorUserId,
        updatedByUserId: options.actorUserId,
      };
    });
}

function getQuoteRowSignature(row: QuoteRow) {
  return JSON.stringify({
    id: row.id,
    quoteId: row.quoteId,
    sortOrder: row.sortOrder,
    mode: row.mode,
    productName: row.productName,
    productCode: row.productCode ?? '',
    notes: row.notes ?? '',
    regionMultiplier: row.regionMultiplier,
  });
}

function replaceManagedSectionRows(options: {
  actorUserId: string;
  draftPackageId: string;
  quoteId: string;
  regionCoefficient: number;
  preview: TenderEditorImportPreview;
  existingRows: QuoteRow[];
  timestamp: string;
}) {
  const currentRows = options.existingRows
    .filter((row) => row.quoteId === options.quoteId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const managedRows = currentRows.filter((row) => isManagedSectionRow(row, options.draftPackageId));
  const legacyManagedRows = managedRows.length === 0 && currentRows.length > 0 && currentRows.every(isLikelyLegacyImportSectionRow)
    ? currentRows
    : [];
  const rowsToReplace = managedRows.length > 0 ? managedRows : legacyManagedRows;
  const insertionIndex = rowsToReplace.length > 0 ? Math.min(...rowsToReplace.map((row) => row.sortOrder)) : 0;
  const unmanagedRows = currentRows.filter((row) => !rowsToReplace.some((candidate) => candidate.id === row.id));
  const existingRowsBySectionKey = new Map<string, QuoteRow>();

  managedRows.forEach((row) => {
    const marker = parseManagedSectionRowNote(row.notes);

    if (marker) {
      existingRowsBySectionKey.set(marker.sectionKey, row);
    }
  });

  const nextManagedRows = buildSectionRows({
    actorUserId: options.actorUserId,
    draftPackageId: options.draftPackageId,
    quoteId: options.quoteId,
    regionCoefficient: options.regionCoefficient,
    preview: options.preview,
    timestamp: options.timestamp,
    existingRowsBySectionKey,
  });
  const beforeRows = unmanagedRows.filter((row) => row.sortOrder < insertionIndex);
  const afterRows = unmanagedRows.filter((row) => row.sortOrder >= insertionIndex);
  const nextRows = [...beforeRows, ...nextManagedRows, ...afterRows].map((row, index) => ({
    ...row,
    sortOrder: index,
    updatedAt: row.id === currentRows[index]?.id && row.sortOrder === index ? row.updatedAt : options.timestamp,
    updatedByUserId: row.id === currentRows[index]?.id && row.sortOrder === index ? row.updatedByUserId : options.actorUserId,
  }));
  const changed = currentRows.length !== nextRows.length
    || currentRows.some((row, index) => getQuoteRowSignature(row) !== getQuoteRowSignature(nextRows[index]));

  return { rows: nextRows, changed };
}

function buildImportSummary(options: {
  importMode: TenderEditorImportMode;
  resultStatus: TenderEditorImportResult['result_status'];
  quoteTitle: string;
}) {
  if (options.resultStatus === 'no_changes') {
    return `Importoitu tarjous “${options.quoteTitle}” oli jo ajan tasalla.`;
  }

  if (options.importMode === 'update_existing_quote') {
    return `Päivitettiin aiemmin importoitu tarjous “${options.quoteTitle}” Tarjousälyn managed surface -alueelta.`;
  }

  return `Luotiin uusi tarjousluonnos “${options.quoteTitle}” Tarjousälyn importia varten.`;
}

async function updateExistingImportedQuote(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  preview: TenderEditorImportPreview;
  actorUserId: string;
  quoteId: string;
  currentImportRevision: number;
  previousPayloadSnapshot?: TenderEditorImportPayload | null;
  resolvedTarget: ResolvedImportTarget;
}): Promise<TenderEditorImportResult | null> {
  const timestamp = nowIso();
  const quotes = await readUserBucket<Quote[]>(options.client, 'quotes', options.actorUserId, []);
  const existingRows = await readUserBucket<QuoteRow[]>(options.client, 'quote-rows', options.actorUserId, []);
  const quote = quotes.find((candidate) => candidate.id === options.quoteId) ?? null;

  if (!quote) {
    return null;
  }

  const nextNotes = upsertManagedTextBlock({
    existingValue: quote.notes,
    blockId: MANAGED_QUOTE_NOTES_BLOCK_ID,
    content: options.preview.payload.sections.quote_notes_md,
    legacyCandidates: [
      options.previousPayloadSnapshot?.sections.quote_notes_md,
      options.preview.payload.sections.quote_notes_md,
    ],
  });
  const nextInternalNotes = upsertManagedTextBlock({
    existingValue: quote.internalNotes,
    blockId: MANAGED_INTERNAL_NOTES_BLOCK_ID,
    content: options.preview.payload.sections.quote_internal_notes_md,
    legacyCandidates: [
      options.previousPayloadSnapshot?.sections.quote_internal_notes_md,
      options.preview.payload.sections.quote_internal_notes_md,
    ],
  });
  const nextManagedRows = replaceManagedSectionRows({
    actorUserId: options.actorUserId,
    draftPackageId: options.preview.payload.source_draft_package_id,
    quoteId: quote.id,
    regionCoefficient: options.resolvedTarget.projectRegionCoefficient,
    preview: options.preview,
    existingRows,
    timestamp,
  });
  const notesChanged = (quote.notes ?? '') !== (nextNotes ?? '');
  const internalNotesChanged = (quote.internalNotes ?? '') !== (nextInternalNotes ?? '');
  const changed = notesChanged || internalNotesChanged || nextManagedRows.changed;

  if (!changed) {
    return {
      draft_package_id: options.preview.payload.source_draft_package_id,
      imported_quote_id: quote.id,
      imported_project_id: quote.projectId,
      imported_customer_id: options.resolvedTarget.customerId,
      created_placeholder_target: false,
      import_mode: 'update_existing_quote',
      result_status: 'no_changes',
      payload_hash: options.preview.payload_hash,
      import_revision: options.currentImportRevision,
      summary: buildImportSummary({
        importMode: 'update_existing_quote',
        resultStatus: 'no_changes',
        quoteTitle: quote.title,
      }),
    };
  }

  const updatedQuote: Quote = {
    ...quote,
    notes: nextNotes,
    internalNotes: nextInternalNotes,
    updatedAt: timestamp,
    updatedByUserId: options.actorUserId,
    lastAutoSavedAt: timestamp,
  };
  const updatedQuotes = quotes.map((candidate) => (candidate.id === quote.id ? updatedQuote : candidate));
  const updatedRows = [
    ...existingRows.filter((row) => row.quoteId !== quote.id),
    ...nextManagedRows.rows,
  ];

  await writeUserBucket(options.client, 'quotes', options.actorUserId, updatedQuotes);
  await writeUserBucket(options.client, 'quote-rows', options.actorUserId, updatedRows);

  return {
    draft_package_id: options.preview.payload.source_draft_package_id,
    imported_quote_id: quote.id,
    imported_project_id: quote.projectId,
    imported_customer_id: options.resolvedTarget.customerId,
    created_placeholder_target: false,
    import_mode: 'update_existing_quote',
    result_status: 'updated',
    payload_hash: options.preview.payload_hash,
    import_revision: options.currentImportRevision + 1,
    summary: buildImportSummary({
      importMode: 'update_existing_quote',
      resultStatus: 'updated',
      quoteTitle: quote.title,
    }),
  };
}

export async function resolveTenderEditorImportTarget(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  actorUserId: string;
  importedQuoteId?: string | null;
}): Promise<ResolvedImportTarget> {
  const customers = await readUserBucket<Customer[]>(options.client, 'customers', options.actorUserId, []);
  const projects = await readUserBucket<Project[]>(options.client, 'projects', options.actorUserId, []);
  const quotes = await readUserBucket<Quote[]>(options.client, 'quotes', options.actorUserId, []);
  const importedQuote = options.importedQuoteId
    ? quotes.find((candidate) => candidate.id === options.importedQuoteId) ?? null
    : null;

  if (importedQuote) {
    const importedProject = projects.find((candidate) => candidate.id === importedQuote.projectId) ?? null;
    const importedCustomer = importedProject
      ? customers.find((candidate) => candidate.id === importedProject.customerId) ?? null
      : null;

    return {
      customerId: importedCustomer?.id ?? importedProject?.customerId ?? null,
      projectId: importedQuote.projectId,
      quoteId: importedQuote.id,
      quoteTitle: importedQuote.title,
      projectRegionCoefficient: importedProject?.regionCoefficient ?? DEFAULT_REGION_COEFFICIENT,
      willCreatePlaceholderTarget: false,
      importedQuoteMissing: false,
    };
  }

  const linkedCustomer = options.packageDetails.package.linkedCustomerId
    ? customers.find((candidate) => candidate.id === options.packageDetails.package.linkedCustomerId) ?? null
    : null;
  const linkedProject = options.packageDetails.package.linkedProjectId
    ? projects.find((candidate) => candidate.id === options.packageDetails.package.linkedProjectId) ?? null
    : null;

  return {
    customerId: linkedProject?.customerId ?? linkedCustomer?.id ?? null,
    projectId: linkedProject?.id ?? null,
    quoteId: null,
    quoteTitle: null,
    projectRegionCoefficient: linkedProject?.regionCoefficient ?? DEFAULT_REGION_COEFFICIENT,
    willCreatePlaceholderTarget: !linkedProject,
    importedQuoteMissing: Boolean(options.importedQuoteId),
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
    quoteId: null,
    quoteTitle: null,
    projectRegionCoefficient: project.regionCoefficient || DEFAULT_REGION_COEFFICIENT,
    willCreatePlaceholderTarget: createdPlaceholderTarget,
    importedQuoteMissing: false,
    createdPlaceholderTarget,
  };
}

async function createNewImportedQuote(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  preview: TenderEditorImportPreview;
  actorUserId: string;
  currentImportRevision: number;
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
    draftPackageId: options.preview.payload.source_draft_package_id,
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
    import_mode: 'create_new_quote' as const,
    result_status: 'created' as const,
    payload_hash: options.preview.payload_hash,
    import_revision: options.currentImportRevision + 1,
    summary: buildImportSummary({
      importMode: 'create_new_quote',
      resultStatus: 'created',
      quoteTitle: quote.title,
    }),
  };
}

export async function importTenderDraftPackageToEditor(options: {
  client: SupabaseClient;
  packageDetails: TenderPackageDetails;
  preview: TenderEditorImportPreview;
  actorUserId: string;
  currentImportRevision: number;
  previousPayloadSnapshot?: TenderEditorImportPayload | null;
}): Promise<TenderEditorImportResult> {
  const resolvedTarget = await resolveTenderEditorImportTarget({
    client: options.client,
    packageDetails: options.packageDetails,
    actorUserId: options.actorUserId,
    importedQuoteId: options.preview.payload.metadata.target_quote_id ?? options.preview.payload.metadata.imported_quote_id ?? null,
  });

  if (resolvedTarget.quoteId) {
    const updatedQuote = await updateExistingImportedQuote({
      client: options.client,
      packageDetails: options.packageDetails,
      preview: options.preview,
      actorUserId: options.actorUserId,
      quoteId: resolvedTarget.quoteId,
      currentImportRevision: options.currentImportRevision,
      previousPayloadSnapshot: options.previousPayloadSnapshot,
      resolvedTarget,
    });

    if (updatedQuote) {
      return updatedQuote;
    }
  }

  return createNewImportedQuote({
    client: options.client,
    packageDetails: options.packageDetails,
    preview: options.preview,
    actorUserId: options.actorUserId,
    currentImportRevision: options.currentImportRevision,
  });
}
