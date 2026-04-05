import { marked } from 'marked';
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  requireSupabase,
  type LegalAcceptanceSource,
  type LegalDocumentAcceptanceRequirement,
  type LegalDocumentAcceptanceRow,
  type LegalDocumentStatus,
  type LegalDocumentType,
  type LegalDocumentVersionRow,
  type OrganizationRole,
  type OrganizationRow,
  type ProfileRow,
} from './supabase';

export const LEGAL_DOCUMENT_ROUTE_BY_TYPE: Record<LegalDocumentType, string> = {
  terms: '/kayttoehdot',
  privacy: '/tietosuoja',
  dpa: '/tietojenkasittely',
  cookies: '/evasteet',
};

const LEGAL_DOCUMENT_TYPE_BY_PATH: Record<string, LegalDocumentType> = {
  '/kayttoehdot': 'terms',
  '/tietosuoja': 'privacy',
  '/tietojenkasittely': 'dpa',
  '/dpa': 'dpa',
  '/evasteet': 'cookies',
};

export const LEGAL_PUBLIC_LINKS = [
  { type: 'terms' as const, href: LEGAL_DOCUMENT_ROUTE_BY_TYPE.terms, label: 'Käyttöehdot' },
  { type: 'privacy' as const, href: LEGAL_DOCUMENT_ROUTE_BY_TYPE.privacy, label: 'Tietosuojaseloste' },
  { type: 'dpa' as const, href: LEGAL_DOCUMENT_ROUTE_BY_TYPE.dpa, label: 'Tietojenkäsittelyliite' },
  { type: 'cookies' as const, href: LEGAL_DOCUMENT_ROUTE_BY_TYPE.cookies, label: 'Evästeet ja tekniset tallenteet' },
];

const LEGAL_DOCUMENT_TYPE_ORDER: LegalDocumentType[] = ['terms', 'privacy', 'dpa', 'cookies'];
const LEGAL_STATUS_ORDER: LegalDocumentStatus[] = ['active', 'draft', 'archived'];

export interface LegalAcceptanceEvaluationOptions {
  organizationRole?: OrganizationRole | null;
}

export interface RequiredLegalDocument extends LegalDocumentVersionRow {
  accepted_current_version: boolean;
  last_accepted_at?: string | null;
  last_accepted_version_label?: string | null;
}

export interface LegalAcceptanceState {
  required_documents: RequiredLegalDocument[];
  pending_documents: RequiredLegalDocument[];
  latest_acceptance_by_type: Partial<Record<LegalDocumentType, LegalDocumentAcceptanceRow>>;
  current_active_by_type: Partial<Record<LegalDocumentType, LegalDocumentVersionRow>>;
  requires_blocking_acceptance: boolean;
  pending_source: LegalAcceptanceSource | null;
}

export interface SignupLegalAcceptanceBundle {
  accepted_document_version_ids: string[];
  accepted_at: string;
  locale: string;
  user_agent: string;
  authority_confirmed: boolean;
}

export interface LegalDocumentDraftInput {
  documentType: LegalDocumentType;
  title: string;
  versionLabel: string;
  effectiveAt: string;
  acceptanceRequirement: LegalDocumentAcceptanceRequirement;
  requiresReacceptance: boolean;
  changeSummary?: string;
  locale?: string;
  contentMd: string;
}

export interface LegalAcceptanceAuditRow extends LegalDocumentAcceptanceRow {
  profile?: Pick<ProfileRow, 'id' | 'display_name' | 'email' | 'organization_role'> | null;
  organization?: Pick<OrganizationRow, 'id' | 'name'> | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeDocumentContent(value: string) {
  return value.replace(/\r\n/g, '\n').trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äå]/g, 'a')
    .replace(/[öø]/g, 'o')
    .replace(/[ü]/g, 'u')
    .replace(/&amp;/g, 'ja')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function addHeadingIds(html: string): string {
  const usedIds = new Set<string>();
  return html.replace(/<h([1-4])>(.*?)<\/h\1>/gs, (_, level, innerHtml) => {
    const textForSlug = innerHtml
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, 'ja')
      .replace(/&[a-z]+;|&#\d+;/g, '');
    let id = slugify(textForSlug);
    if (!id) {
      id = `section-${level}`;
    }
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    usedIds.add(id);
    return `<h${level} id="${id}">${innerHtml}</h${level}>`;
  });
}

function highlightPlaceholders(html: string): string {
  return html.replace(/\[([A-ZÄÖÅ][A-ZÄÖÅ0-9_]{1,})\]/g, '<mark class="legal-placeholder">[$1]</mark>');
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function requireConfiguredSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(getSupabaseConfigError());
  }

  return requireSupabase();
}

function getDocumentTypeSortIndex(documentType: LegalDocumentType) {
  const index = LEGAL_DOCUMENT_TYPE_ORDER.indexOf(documentType);
  return index === -1 ? LEGAL_DOCUMENT_TYPE_ORDER.length : index;
}

function getStatusSortIndex(status: LegalDocumentStatus) {
  const index = LEGAL_STATUS_ORDER.indexOf(status);
  return index === -1 ? LEGAL_STATUS_ORDER.length : index;
}

function ensureNonEmpty(value: string, message: string) {
  if (!value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

export function getLegalDocumentTypeLabel(documentType: LegalDocumentType) {
  if (documentType === 'terms') {
    return 'Käyttöehdot';
  }

  if (documentType === 'privacy') {
    return 'Tietosuojaseloste';
  }

  if (documentType === 'dpa') {
    return 'Tietojenkäsittelyliite';
  }

  return 'Evästeet ja tekniset tallenteet';
}

export function getLegalRequirementLabel(requirement: LegalDocumentAcceptanceRequirement) {
  if (requirement === 'all-users') {
    return 'Pakollinen kaikille käyttäjille';
  }

  if (requirement === 'organization-owner') {
    return 'Pakollinen organisaation omistajalle';
  }

  return 'Ei erillistä hyväksyntää';
}

export function getLegalDocumentStatusLabel(status: LegalDocumentStatus) {
  if (status === 'active') {
    return 'Voimassa';
  }

  if (status === 'draft') {
    return 'Luonnos';
  }

  return 'Arkistoitu';
}

export function getLegalAcceptanceSourceLabel(source: LegalAcceptanceSource) {
  if (source === 'signup') {
    return 'Rekisteröityminen';
  }

  if (source === 'invited-user-first-login') {
    return 'Ensimmäinen kirjautuminen';
  }

  if (source === 'reacceptance') {
    return 'Uudelleenehyväksyntä';
  }

  return 'Hallinnollinen hyväksyntä';
}

export function resolveLegalDocumentTypeFromPath(pathname: string) {
  return LEGAL_DOCUMENT_TYPE_BY_PATH[normalizePathname(pathname)] ?? null;
}

export interface LegalTocEntry {
  id: string;
  text: string;
  depth: number;
}

export function extractLegalToc(contentMd: string): LegalTocEntry[] {
  const normalized = normalizeDocumentContent(contentMd);
  const usedIds = new Set<string>();
  return normalized
    .split('\n')
    .flatMap<LegalTocEntry>((line) => {
      const match = /^(#{1,4})\s+(.+)$/.exec(line);
      if (!match) return [];
      const depth = match[1].length;
      const text = match[2].trim();
      let id = slugify(text);
      if (!id) id = `section-${depth}`;
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);
      return [{ id, text, depth }];
    });
}

export function renderLegalDocumentHtml(contentMd: string) {
  const escaped = escapeHtml(normalizeDocumentContent(contentMd));
  const rawHtml = marked.parse(escaped, { breaks: true }) as string;
  return highlightPlaceholders(addHeadingIds(rawHtml));
}

export function formatLegalHash(hash?: string | null) {
  if (!hash) {
    return '-';
  }

  if (hash.length <= 24) {
    return hash;
  }

  return `${hash.slice(0, 12)}...${hash.slice(-10)}`;
}

export function sortLegalDocumentVersions(versions: LegalDocumentVersionRow[]) {
  return [...versions].sort((left, right) => {
    const documentTypeDifference = getDocumentTypeSortIndex(left.document_type) - getDocumentTypeSortIndex(right.document_type);
    if (documentTypeDifference !== 0) {
      return documentTypeDifference;
    }

    const statusDifference = getStatusSortIndex(left.status) - getStatusSortIndex(right.status);
    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

export function groupLegalDocumentVersionsByType(versions: LegalDocumentVersionRow[]) {
  return LEGAL_DOCUMENT_TYPE_ORDER.reduce<Record<LegalDocumentType, LegalDocumentVersionRow[]>>(
    (result, documentType) => {
      result[documentType] = sortLegalDocumentVersions(
        versions.filter((version) => version.document_type === documentType)
      );
      return result;
    },
    {
      terms: [],
      privacy: [],
      dpa: [],
      cookies: [],
    }
  );
}

export function getRequiredLegalDocuments(
  activeDocuments: LegalDocumentVersionRow[],
  options: LegalAcceptanceEvaluationOptions = {}
) {
  return activeDocuments.filter((document) => {
    if (document.acceptance_requirement === 'none') {
      return false;
    }

    if (document.acceptance_requirement === 'organization-owner') {
      return options.organizationRole === 'owner';
    }

    return true;
  });
}

export function getLatestAcceptanceByType(acceptances: LegalDocumentAcceptanceRow[]) {
  return acceptances.reduce<Partial<Record<LegalDocumentType, LegalDocumentAcceptanceRow>>>((result, acceptance) => {
    const current = result[acceptance.document_type];
    if (!current) {
      result[acceptance.document_type] = acceptance;
      return result;
    }

    if (new Date(acceptance.accepted_at).getTime() > new Date(current.accepted_at).getTime()) {
      result[acceptance.document_type] = acceptance;
    }

    return result;
  }, {});
}

export function evaluateLegalAcceptanceState(
  activeDocuments: LegalDocumentVersionRow[],
  acceptances: LegalDocumentAcceptanceRow[],
  options: LegalAcceptanceEvaluationOptions = {}
): LegalAcceptanceState {
  const requiredDocuments = getRequiredLegalDocuments(activeDocuments, options);
  const latestAcceptanceByType = getLatestAcceptanceByType(acceptances);
  const acceptedDocumentIds = new Set(acceptances.map((acceptance) => acceptance.document_version_id));

  const requiredWithState: RequiredLegalDocument[] = requiredDocuments.map((document) => {
    const latestAcceptance = latestAcceptanceByType[document.document_type];
    return {
      ...document,
      accepted_current_version: acceptedDocumentIds.has(document.id),
      last_accepted_at: latestAcceptance?.accepted_at || null,
      last_accepted_version_label: latestAcceptance?.version_label || null,
    };
  });

  const pendingDocuments = requiredWithState.filter((document) => {
    if (document.accepted_current_version) {
      return false;
    }

    const previousAcceptance = latestAcceptanceByType[document.document_type];
    return !previousAcceptance || document.requires_reacceptance;
  });

  const requiresBlockingAcceptance = pendingDocuments.length > 0;
  const pendingSource = !requiresBlockingAcceptance
    ? null
    : pendingDocuments.some((document) => !latestAcceptanceByType[document.document_type])
      ? 'invited-user-first-login'
      : 'reacceptance';

  return {
    required_documents: requiredWithState,
    pending_documents: pendingDocuments,
    latest_acceptance_by_type: latestAcceptanceByType,
    current_active_by_type: activeDocuments.reduce<Partial<Record<LegalDocumentType, LegalDocumentVersionRow>>>(
      (result, document) => {
        result[document.document_type] = document;
        return result;
      },
      {}
    ),
    requires_blocking_acceptance: requiresBlockingAcceptance,
    pending_source: pendingSource,
  };
}

export function shouldRequestOrganizationAuthorityConfirmation(
  documents: LegalDocumentVersionRow[],
  organizationRole?: OrganizationRole | null
) {
  return organizationRole === 'owner' && documents.some((document) => document.acceptance_requirement === 'organization-owner');
}

export function buildSignupLegalAcceptanceBundle(
  activeDocuments: LegalDocumentVersionRow[],
  options: {
    acceptedTermsAndPrivacy: boolean;
    authorityConfirmed: boolean;
    acceptedAt?: string;
    locale?: string;
    userAgent?: string;
  }
): SignupLegalAcceptanceBundle {
  if (!options.acceptedTermsAndPrivacy) {
    throw new Error('Hyväksy käyttöehdot ja vahvista lukeneesi tietosuojaselosteen.');
  }

  const requiredDocuments = getRequiredLegalDocuments(activeDocuments, {
    organizationRole: 'owner',
  });

  if (requiredDocuments.length === 0) {
    throw new Error('Rekisteröityminen ei ole käytettävissä ilman julkaistuja sopimusasiakirjoja.');
  }

  if (shouldRequestOrganizationAuthorityConfirmation(requiredDocuments, 'owner') && !options.authorityConfirmed) {
    throw new Error('Vahvista oikeutesi hyväksyä ehdot organisaation puolesta.');
  }

  return {
    accepted_document_version_ids: requiredDocuments.map((document) => document.id),
    accepted_at: options.acceptedAt || new Date().toISOString(),
    locale: options.locale?.trim() || 'fi-FI',
    user_agent: options.userAgent?.trim() || 'Tuntematon selain',
    authority_confirmed: options.authorityConfirmed,
  };
}

export function suggestNextLegalVersionLabel(previousVersionLabel?: string | null) {
  const current = previousVersionLabel?.trim();
  if (!current) {
    return '1.0.0';
  }

  const match = current.match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) {
    return `${current}-2`;
  }

  const [, prefix, numericPart, suffix] = match;
  const nextNumber = String(Number.parseInt(numericPart, 10) + 1).padStart(numericPart.length, '0');
  return `${prefix}${nextNumber}${suffix}`;
}

export async function listPublicActiveLegalDocuments() {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('legal_document_versions')
    .select('*')
    .eq('status', 'active')
    .order('effective_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('listPublicActiveLegalDocuments failed:', error);
    throw new Error('Sopimusasiakirjojen lataus epäonnistui.');
  }

  return sortLegalDocumentVersions((data as LegalDocumentVersionRow[]) || []);
}

export async function listCurrentUserLegalAcceptances() {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('legal_document_acceptances')
    .select('*')
    .order('accepted_at', { ascending: false });

  if (error) {
    console.error('listCurrentUserLegalAcceptances failed:', error);
    throw new Error('Hyväksyntätietojen lataus epäonnistui.');
  }

  return (data as LegalDocumentAcceptanceRow[]) || [];
}

export async function listLegalDocumentVersionsForManagement() {
  const client = requireConfiguredSupabase();
  const { data, error } = await client
    .from('legal_document_versions')
    .select('*')
    .order('document_type', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Dokumenttiversioiden lataus epäonnistui.');
  }

  return sortLegalDocumentVersions((data as LegalDocumentVersionRow[]) || []);
}

export async function listLegalAcceptanceAudit(organizationId?: string | null) {
  const client = requireConfiguredSupabase();
  let query = client
    .from('legal_document_acceptances')
    .select(`
      *,
      profile:profiles!legal_document_acceptances_user_id_fkey(id, display_name, email, organization_role),
      organization:organizations(id, name)
    `)
    .order('accepted_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Hyväksyntäauditoinnin lataus epäonnistui.');
  }

  return (data as LegalAcceptanceAuditRow[]) || [];
}

export async function createLegalDocumentDraft(input: LegalDocumentDraftInput) {
  const client = requireConfiguredSupabase();
  const payload = {
    document_type: input.documentType,
    title: ensureNonEmpty(input.title, 'Anna dokumentille otsikko.'),
    version_label: ensureNonEmpty(input.versionLabel, 'Anna dokumentille versiotunniste.'),
    effective_at: input.effectiveAt,
    status: 'draft' as const,
    acceptance_requirement: input.acceptanceRequirement,
    requires_reacceptance: input.requiresReacceptance,
    change_summary: input.changeSummary?.trim() || null,
    locale: input.locale?.trim() || 'fi-FI',
    content_md: ensureNonEmpty(input.contentMd, 'Anna dokumentille sisältö.'),
  };

  const { data, error } = await client.from('legal_document_versions').insert(payload).select('*').single();

  if (error) {
    throw new Error(error.message || 'Dokumenttiluonnoksen luonti epäonnistui.');
  }

  return data as LegalDocumentVersionRow;
}

export async function updateLegalDocumentDraft(documentId: string, input: LegalDocumentDraftInput) {
  const client = requireConfiguredSupabase();
  const payload = {
    title: ensureNonEmpty(input.title, 'Anna dokumentille otsikko.'),
    version_label: ensureNonEmpty(input.versionLabel, 'Anna dokumentille versiotunniste.'),
    effective_at: input.effectiveAt,
    acceptance_requirement: input.acceptanceRequirement,
    requires_reacceptance: input.requiresReacceptance,
    change_summary: input.changeSummary?.trim() || null,
    locale: input.locale?.trim() || 'fi-FI',
    content_md: ensureNonEmpty(input.contentMd, 'Anna dokumentille sisältö.'),
  };

  const { data, error } = await client
    .from('legal_document_versions')
    .update(payload)
    .eq('id', documentId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Dokumenttiluonnoksen päivitys epäonnistui.');
  }

  return data as LegalDocumentVersionRow;
}

export async function deleteLegalDocumentDraft(documentId: string) {
  const client = requireConfiguredSupabase();
  const { error } = await client.from('legal_document_versions').delete().eq('id', documentId);

  if (error) {
    throw new Error(error.message || 'Dokumenttiluonnoksen poisto epäonnistui.');
  }
}

export async function publishLegalDocumentVersion(documentId: string) {
  const client = requireConfiguredSupabase();
  const { error } = await client.rpc('publish_legal_document_version', {
    p_document_version_id: documentId,
  });

  if (error) {
    throw new Error(error.message || 'Dokumenttiversion julkaisu epäonnistui.');
  }
}

export async function acceptLegalDocuments(options: {
  documentVersionIds: string[];
  acceptanceSource: LegalAcceptanceSource;
  locale?: string;
  userAgent?: string;
  acceptOnBehalfOfOrganization?: boolean;
}) {
  const client = requireConfiguredSupabase();
  const { data, error } = await client.rpc('accept_legal_documents', {
    p_document_version_ids: options.documentVersionIds,
    p_acceptance_source: options.acceptanceSource,
    p_locale: options.locale?.trim() || 'fi-FI',
    p_user_agent: options.userAgent?.trim() || null,
    p_accept_on_behalf_of_organization: Boolean(options.acceptOnBehalfOfOrganization),
  });

  if (error) {
    throw new Error(error.message || 'Dokumenttien hyväksyntä epäonnistui.');
  }

  return (data as LegalDocumentAcceptanceRow[]) || [];
}
