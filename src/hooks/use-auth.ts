import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { deriveAccessState } from '../lib/access-control';
import { resolveAuthRedirectUrl } from '../lib/auth-callback';
import type { SignupLegalAcceptanceBundle } from '../lib/legal';
import {
  createIsolatedSupabaseClient,
  getSupabaseConfigError,
  isSupabaseConfigured,
  OrganizationRow,
  ProfileRow,
  requireSupabase,
  type OrganizationRole,
  type UserRole,
  type UserStatus,
} from '../lib/supabase';

export type { OrganizationRole, OrganizationRow, UserRole, UserStatus } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId?: string | null;
  organizationRole?: OrganizationRole | null;
  organizationName?: string | null;
  initials: string;
  createdAt: string;
  lastLoginAt?: string;
  status: UserStatus;
}

interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  organizationName: string;
  legalAcceptance: SignupLegalAcceptanceBundle;
}

export interface RegisterResult {
  requiresEmailConfirmation: boolean;
}

type AuthActionErrorCode = 'email-not-confirmed';

export class AuthActionError extends Error {
  readonly code: AuthActionErrorCode;

  constructor(code: AuthActionErrorCode, message: string) {
    super(message);
    this.name = 'AuthActionError';
    this.code = code;
  }
}

interface LoginInput {
  email: string;
  password: string;
}

interface ProfileInput {
  displayName: string;
  email: string;
}

interface AdminCreateUserInput {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
}

interface OrganizationEmployeeInput {
  displayName: string;
  email: string;
  password: string;
  status: UserStatus;
}

interface AuthContextValue {
  user: AuthUser | null;
  users: AuthUser[];
  organization: OrganizationRow | null;
  role: UserRole | null;
  organizationRole: OrganizationRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageSharedData: boolean;
  requiresPasswordReset: boolean;
  backendConfigError: string | null;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  resendEmailConfirmation: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (_unused: string, nextPassword: string) => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  createUserByAdmin: (input: AdminCreateUserInput) => Promise<void>;
  createOrganizationEmployee: (input: OrganizationEmployeeInput) => Promise<void>;
  updateUserRole: (userId: string, nextRole: UserRole) => Promise<void>;
  updateUserStatus: (userId: string, nextStatus: UserStatus) => Promise<void>;
  updateOrganizationEmployeeStatus: (userId: string, nextStatus: UserStatus) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
let profileSchemaCompatibility: 'unknown' | 'legacy' | 'organization' = 'unknown';
let adminBootstrapFunctionState: 'unknown' | 'available' | 'missing' = 'unknown';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8;
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === 'string') {
    return error.trim();
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0
    );

    if (parts.length > 0) {
      return Array.from(new Set(parts)).join(' ').trim();
    }
  }

  return '';
}

function toError(error: unknown, fallbackMessage = 'Toiminto epäonnistui.') {
  return new Error(extractErrorMessage(error) || fallbackMessage);
}

function isLegacyOrganizationSchemaError(error: unknown) {
  const candidate = error && typeof error === 'object' ? (error as { code?: unknown }) : null;
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const message = extractErrorMessage(error).toLowerCase();

  if (code === '42703' || code === 'PGRST204') {
    return true;
  }

  return (
    (message.includes('organization_id') || message.includes('organization_role')) &&
    (message.includes('column') || message.includes('schema cache') || message.includes('does not exist'))
  );
}

function isMissingFunctionError(error: unknown, functionName: string) {
  const candidate = error && typeof error === 'object' ? (error as { code?: unknown }) : null;
  const code = typeof candidate?.code === 'string' ? candidate.code.toUpperCase() : '';
  const message = extractErrorMessage(error).toLowerCase();

  if (code === '42883' || code === 'PGRST202') {
    return true;
  }

  return message.includes(functionName.toLowerCase()) && (message.includes('does not exist') || message.includes('could not find'));
}

function normalizeProfileRow(profile: Partial<ProfileRow>): ProfileRow {
  return {
    id: typeof profile.id === 'string' ? profile.id : '',
    email: normalizeEmail(typeof profile.email === 'string' ? profile.email : ''),
    display_name: typeof profile.display_name === 'string' ? profile.display_name : 'Käyttäjä',
    role: profile.role === 'admin' ? 'admin' : 'user',
    organization_id: typeof profile.organization_id === 'string' ? profile.organization_id : null,
    organization_role:
      profile.organization_role === 'owner' || profile.organization_role === 'employee'
        ? profile.organization_role
        : null,
    status: profile.status === 'disabled' ? 'disabled' : 'active',
    created_at:
      typeof profile.created_at === 'string' && profile.created_at.trim().length > 0
        ? profile.created_at
        : new Date().toISOString(),
    updated_at:
      typeof profile.updated_at === 'string' && profile.updated_at.trim().length > 0
        ? profile.updated_at
        : new Date().toISOString(),
    last_login_at: typeof profile.last_login_at === 'string' ? profile.last_login_at : null,
  };
}

function isRecoverableProfileError(error: unknown) {
  const candidate = error && typeof error === 'object' ? (error as { code?: unknown }) : null;
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const message = extractErrorMessage(error).toLowerCase();

  if (code === '42P01' || code === '42501' || code === '57014') {
    return true;
  }

  if (
    message.includes('statement timeout') ||
    message.includes('canceling statement') ||
    message.includes('timeout') ||
    message.includes('stack depth') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed')
  ) {
    return true;
  }

  return (
    message.includes('profiles') &&
    (message.includes('does not exist') ||
      message.includes('permission denied') ||
      message.includes('row-level security') ||
      message.includes('policy') ||
      message.includes('schema cache'))
  );
}

function mapLoginErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Kirjautuminen epäonnistui. Yritä uudelleen.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('email not confirmed')) {
    return 'Vahvista sähköpostiosoite ennen kirjautumista.';
  }
  if (message.includes('invalid login credentials')) {
    return 'Virheellinen sähköposti tai salasana.';
  }
  if (message.includes('user already registered')) {
    return 'Tälle sähköpostiosoitteelle on jo olemassa käyttäjätili.';
  }
  if (message.includes('too many requests') || message.includes('over_email_send_rate_limit')) {
    return 'Liian monta yritystä lyhyessä ajassa. Odota hetki ja yritä uudelleen.';
  }
  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Yhteys palveluun epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.';
  }

  return error.message;
}

function mapConfirmationResendErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Vahvistusviestin lähettäminen epäonnistui. Yritä uudelleen.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('too many requests') || message.includes('over_email_send_rate_limit')) {
    return 'Liian monta vahvistusviestiä lyhyessä ajassa. Odota hetki ja yritä uudelleen.';
  }
  if (message.includes('invalid email')) {
    return 'Anna kelvollinen sähköpostiosoite.';
  }
  if (message.includes('email not confirmed')) {
    return 'Sähköpostiosoite odottaa vielä vahvistusta. Uusi vahvistusviesti voidaan lähettää samaan osoitteeseen.';
  }

  return error.message;
}

function mapProvisioningErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Kayttajan luonti epaonnistui.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'Talle sahkopostiosoitteelle on jo olemassa kayttajatili.';
  }
  if (message.includes('invalid email')) {
    return 'Anna kelvollinen sahkopostiosoite.';
  }
  if (message.includes('password')) {
    return 'Salasanan on oltava vahintaan 8 merkkia.';
  }

  return error.message;
}

function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'US';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getAuthRedirectUrl() {
  return resolveAuthRedirectUrl({
    redirectUrl: import.meta.env.VITE_SUPABASE_REDIRECT_URL?.trim(),
    siteUrl: import.meta.env.VITE_SITE_URL?.trim(),
    currentOrigin: window.location.origin,
  });
}

function toDisplayName(user: User, fallbackDisplayName?: string) {
  const rawName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : fallbackDisplayName;

  if (rawName?.trim()) {
    return rawName.trim();
  }

  return user.email?.split('@')[0] || 'Käyttäjä';
}

function resolveSeedOrganizationName(user: User, profile: ProfileRow) {
  const metadataName =
    typeof user.user_metadata?.organization_name === 'string'
      ? user.user_metadata.organization_name.trim()
      : '';

  if (metadataName) {
    return metadataName;
  }

  const displayName = profile.display_name.trim();
  if (displayName) {
    return `${displayName} työtila`;
  }

  return `${user.email?.split('@')[0] || 'Yritys'} työtila`;
}

function toAuthUser(profile: ProfileRow, organization?: OrganizationRow | null): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
    organizationId: profile.organization_id ?? null,
    organizationRole: profile.organization_role ?? null,
    organizationName: organization?.name ?? null,
    initials: getInitials(profile.display_name),
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at || undefined,
    status: profile.status,
  };
}

function buildFallbackAuthUser(user: User, markLogin = false): AuthUser {
  const displayName = toDisplayName(user);
  return {
    id: user.id,
    email: normalizeEmail(user.email || ''),
    displayName,
    role: 'user',
    organizationId: null,
    organizationRole: null,
    organizationName: null,
    initials: getInitials(displayName),
    createdAt: user.created_at || new Date().toISOString(),
    lastLoginAt: markLogin ? new Date().toISOString() : undefined,
    status: 'active',
  };
}

function getCachedAuthUserStorageKey(userId: string) {
  return `laskenta:auth-user:${userId}`;
}

function getPinnedAdminIdsStorageKey() {
  return 'laskenta:known-admin-user-ids';
}

function readPinnedAdminUserIds() {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const raw = window.localStorage.getItem(getPinnedAdminIdsStorageKey());
    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(
      parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    );
  } catch {
    return new Set<string>();
  }
}

function hasPinnedAdminRole(userId: string) {
  if (!userId) {
    return false;
  }

  return readPinnedAdminUserIds().has(userId);
}

function pinAdminRole(userId: string) {
  if (typeof window === 'undefined' || !userId) {
    return;
  }

  const nextIds = readPinnedAdminUserIds();
  nextIds.add(userId);
  window.localStorage.setItem(getPinnedAdminIdsStorageKey(), JSON.stringify(Array.from(nextIds)));
}

function readCachedAuthUser(userId: string) {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getCachedAuthUserStorageKey(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed.id !== userId || typeof parsed.email !== 'string' || typeof parsed.displayName !== 'string') {
      return null;
    }

    const preserveAdminRole = hasPinnedAdminRole(userId);

    return {
      id: parsed.id,
      email: normalizeEmail(parsed.email),
      displayName: parsed.displayName,
      role: parsed.role === 'admin' || preserveAdminRole ? 'admin' : 'user',
      organizationId: parsed.organizationId ?? null,
      organizationRole:
        parsed.organizationRole === 'owner' || parsed.organizationRole === 'employee'
          ? parsed.organizationRole
          : null,
      organizationName: typeof parsed.organizationName === 'string' ? parsed.organizationName : null,
      initials:
        typeof parsed.initials === 'string' && parsed.initials.trim().length > 0
          ? parsed.initials
          : getInitials(parsed.displayName),
      createdAt:
        typeof parsed.createdAt === 'string' && parsed.createdAt.trim().length > 0
          ? parsed.createdAt
          : new Date().toISOString(),
      lastLoginAt: typeof parsed.lastLoginAt === 'string' ? parsed.lastLoginAt : undefined,
      status: parsed.status === 'disabled' ? 'disabled' : 'active',
    } satisfies AuthUser;
  } catch {
    return null;
  }
}

function writeCachedAuthUser(user: AuthUser) {
  if (typeof window === 'undefined') {
    return;
  }

  if (user.role === 'admin') {
    pinAdminRole(user.id);
  }

  window.localStorage.setItem(getCachedAuthUserStorageKey(user.id), JSON.stringify(user));
}

function buildRecoverableFallbackAuthUser(user: User, markLogin = false): AuthUser {
  const cachedUser = readCachedAuthUser(user.id);
  if (!cachedUser) {
    return buildFallbackAuthUser(user, markLogin);
  }

  const displayName = toDisplayName(user, cachedUser.displayName);
  return {
    ...cachedUser,
    email: normalizeEmail(user.email || cachedUser.email),
    displayName,
    initials: getInitials(displayName),
    createdAt: cachedUser.createdAt || user.created_at || new Date().toISOString(),
    lastLoginAt: markLogin ? new Date().toISOString() : cachedUser.lastLoginAt,
  };
}

async function getProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw toError(error, 'Käyttäjäprofiilin haku epäonnistui.');
  }

  return data ? normalizeProfileRow(data as Partial<ProfileRow>) : null;
}

async function getOrganization(organizationId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) {
    throw toError(error, 'Yritystyötilan haku epäonnistui.');
  }

  return data as OrganizationRow | null;
}

async function getOrganizationsByIds(organizationIds: string[]) {
  const uniqueIds = Array.from(new Set(organizationIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, OrganizationRow>();
  }

  const client = requireSupabase();
  const { data, error } = await client.from('organizations').select('*').in('id', uniqueIds);

  if (error) {
    throw toError(error, 'Yritystyötilojen lataus epäonnistui.');
  }

  return new Map((data as OrganizationRow[]).map((organization) => [organization.id, organization]));
}

async function upsertProfile(row: ProfileRow) {
  const client = requireSupabase();
  const basePayload = {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at ?? null,
  };

  const runUpsert = async (payload: typeof basePayload | ProfileRow) => {
    const { data, error } = await client.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single();
    if (error) {
      throw error;
    }

    return normalizeProfileRow(data as Partial<ProfileRow>);
  };

  if (profileSchemaCompatibility === 'legacy') {
    try {
      return await runUpsert(basePayload);
    } catch (error) {
      throw toError(error, 'Käyttäjäprofiilin tallennus epäonnistui.');
    }
  }

  try {
    const nextProfile = await runUpsert(row);
    profileSchemaCompatibility = 'organization';
    return nextProfile;
  } catch (error) {
    if (!isLegacyOrganizationSchemaError(error)) {
      throw toError(error, 'Käyttäjäprofiilin tallennus epäonnistui.');
    }

    profileSchemaCompatibility = 'legacy';

    try {
      return await runUpsert(basePayload);
    } catch (fallbackError) {
      throw toError(fallbackError, 'Käyttäjäprofiilin tallennus epäonnistui.');
    }
  }
}

async function ensureProfile(user: User, fallbackDisplayName?: string) {
  const existing = await getProfile(user.id);
  if (existing) {
    return existing;
  }

  const preferredRole: UserRole = hasPinnedAdminRole(user.id) ? 'admin' : 'user';

  return upsertProfile({
    id: user.id,
    email: normalizeEmail(user.email || ''),
    display_name: toDisplayName(user, fallbackDisplayName),
    role: preferredRole,
    organization_id: null,
    organization_role: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null,
  });
}

async function refreshProfileFromAuthUser(user: User, profile: ProfileRow, markLogin = false) {
  const nextProfile: ProfileRow = {
    ...profile,
    email: normalizeEmail(user.email || profile.email),
    display_name: toDisplayName(user, profile.display_name),
    updated_at: new Date().toISOString(),
    last_login_at: markLogin ? new Date().toISOString() : profile.last_login_at ?? null,
  };

  return upsertProfile(nextProfile);
}

async function createOrganizationForCurrentUser(organizationName: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_organization_for_current_user', {
    p_organization_name: organizationName,
  });

  if (error) {
    throw toError(error, 'Yritystyötilan luonti epäonnistui.');
  }

  return data as OrganizationRow | null;
}

async function ensureCurrentUserAdminIfNoAdminExists() {
  if (adminBootstrapFunctionState === 'missing') {
    return null;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('ensure_current_user_admin_if_no_admin_exists');

  if (error) {
    if (isMissingFunctionError(error, 'ensure_current_user_admin_if_no_admin_exists')) {
      adminBootstrapFunctionState = 'missing';
      return null;
    }

    throw toError(error, 'Pääkäyttäjän bootstrap epäonnistui.');
  }

  adminBootstrapFunctionState = 'available';
  return data ? normalizeProfileRow(data as Partial<ProfileRow>) : null;
}

async function repairProfileRoleFromLocalHints(profile: ProfileRow) {
  if (profile.role === 'admin' || !hasPinnedAdminRole(profile.id)) {
    return profile;
  }

  try {
    return await upsertProfile({
      ...profile,
      role: 'admin',
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    if (!isRecoverableProfileError(error)) {
      throw error;
    }

    console.error('Local admin role recovery failed, continuing with current role.', error);
    return profile;
  }
}

async function assignEmployeeToCurrentOrganization(userId: string, status: UserStatus) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('assign_employee_to_current_organization', {
    p_user_id: userId,
    p_status: status,
  });

  if (error) {
    throw toError(error, 'Työntekijän liittäminen yritykseen epäonnistui.');
  }

  return data as ProfileRow;
}

async function updateEmployeeStatusInCurrentOrganization(userId: string, status: UserStatus) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('update_employee_status_in_current_organization', {
    p_user_id: userId,
    p_status: status,
  });

  if (error) {
    throw toError(error, 'Työntekijän tilan päivitys epäonnistui.');
  }

  return data as ProfileRow;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [organization, setOrganization] = useState<OrganizationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const backendConfigError = isSupabaseConfigured ? null : getSupabaseConfigError();

  const clearAuthState = useCallback(() => {
    setRequiresPasswordReset(false);
    setUser(null);
    setUsers([]);
    setOrganization(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      writeCachedAuthUser(user);
    }
  }, [user]);

  const loadUsers = useCallback(async (currentUser?: AuthUser | null, currentOrganization?: OrganizationRow | null) => {
    if (!isSupabaseConfigured) {
      setUsers(currentUser ? [currentUser] : []);
      return;
    }

    if (!currentUser) {
      setUsers([]);
      return;
    }

    if (currentUser.role !== 'admin' && currentUser.organizationRole !== 'owner') {
      setUsers([currentUser]);
      return;
    }

    const client = requireSupabase();
    let query = client.from('profiles').select('*').order('created_at', { ascending: true });

    if (currentUser.role !== 'admin' && currentUser.organizationId) {
      query = query.eq('organization_id', currentUser.organizationId);
    }

    const { data, error } = await query;
    if (error) {
      throw toError(error, 'Käyttäjälistan lataus epäonnistui.');
    }

    const profileRows = data as ProfileRow[];
    const organizationMap = await getOrganizationsByIds(
      profileRows.map((profile) => profile.organization_id ?? '').filter(Boolean)
    );

    if (currentOrganization) {
      organizationMap.set(currentOrganization.id, currentOrganization);
    }

    setUsers(profileRows.map((profile) => toAuthUser(profile, organizationMap.get(profile.organization_id ?? ''))));
  }, []);

  const hydrateSession = useCallback(
    async (session: Session | null, options?: { markLogin?: boolean }) => {
      if (!session?.user) {
        setUser(null);
        setUsers([]);
        setOrganization(null);
        return null;
      }

      try {
        let profile = await ensureProfile(session.user);
        profile = await refreshProfileFromAuthUser(session.user, profile, options?.markLogin);
        profile = await repairProfileRoleFromLocalHints(profile);

        if (profile.role !== 'admin' && profile.status === 'active') {
          try {
            profile = (await ensureCurrentUserAdminIfNoAdminExists()) ?? profile;
          } catch (error) {
            if (!isRecoverableProfileError(error)) {
              throw error;
            }

            console.error('Admin bootstrap check failed, continuing with current role.', error);
          }
        }

        if (profile.status === 'disabled') {
          await requireSupabase().auth.signOut();
          throw new Error('Käyttäjätili on poistettu käytöstä.');
        }

        let currentOrganization: OrganizationRow | null = null;

        if (profileSchemaCompatibility !== 'legacy' && profile.organization_id) {
          try {
            currentOrganization = await getOrganization(profile.organization_id);
          } catch (error) {
            if (!isRecoverableProfileError(error)) {
              throw error;
            }

            console.error('Supabase organization lookup failed, continuing without organization context.', error);
          }
        }

        if (profileSchemaCompatibility !== 'legacy' && !currentOrganization && !profile.organization_id) {
          try {
            currentOrganization = await createOrganizationForCurrentUser(resolveSeedOrganizationName(session.user, profile));
            profile = (await getProfile(session.user.id)) ?? profile;
          } catch (error) {
            if (!isRecoverableProfileError(error)) {
              throw error;
            }

            console.error('Supabase organization bootstrap failed, continuing without organization context.', error);
          }
        }

        const nextUser = toAuthUser(profile, currentOrganization);
        setOrganization(currentOrganization);
        setUser(nextUser);
        setUsers([nextUser]);

        void loadUsers(nextUser, currentOrganization).catch((error) => {
          console.error('Supabase user directory bootstrap failed, continuing with current user only.', error);
          setUsers([nextUser]);
        });

        return nextUser;
      } catch (error) {
        if (!isRecoverableProfileError(error)) {
          throw toError(error, 'Kirjautuminen epäonnistui.');
        }

        console.error('Supabase profile bootstrap failed, continuing with auth fallback.', error);
        const nextUser = buildRecoverableFallbackAuthUser(session.user, options?.markLogin);
        setOrganization(null);
        setUser(nextUser);
        setUsers([nextUser]);
        return nextUser;
      }
    },
    [loadUsers]
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const client = requireSupabase();

    void client.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) {
        return;
      }

      try {
        if (error) {
          throw toError(error, 'Kirjautumistilan tarkistus epäonnistui.');
        }

        await hydrateSession(data.session);
      } catch (authError) {
        console.error('Supabase auth bootstrap failed.', authError);
        setUser(null);
        setUsers([]);
        setOrganization(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setRequiresPasswordReset(true);
      }

      if (event === 'SIGNED_OUT') {
        clearAuthState();
        return;
      }

      queueMicrotask(() => {
        void hydrateSession(session, { markLogin: event === 'SIGNED_IN' })
          .catch((authError) => {
            console.error('Supabase auth event handling failed.', authError);
          })
          .finally(() => {
            if (mounted) {
              setLoading(false);
            }
          });
      });
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [clearAuthState, hydrateSession]);

  const register = async ({ displayName, email, password, organizationName, legalAcceptance }: RegisterInput) => {
    const trimmedName = displayName.trim();
    const normalizedEmail = normalizeEmail(email);
    const trimmedOrganizationName = organizationName.trim();

    if (trimmedName.length < 2) {
      throw new Error('Anna vähintään kaksimerkkinen nimi.');
    }
    if (trimmedOrganizationName.length < 2) {
      throw new Error('Anna yritykselle tai työtilalle nimi.');
    }
    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sähköpostiosoite.');
    }
    if (!validatePassword(password)) {
      throw new Error('Salasanan on oltava vähintään 8 merkkiä.');
    }
    if (!legalAcceptance.accepted_document_version_ids.length) {
      throw new Error('Ajantasaiset sopimusasiakirjat on hyväksyttävä ennen tilin luontia.');
    }

    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          display_name: trimmedName,
          organization_name: trimmedOrganizationName,
          signup_flow: 'self-service-owner',
          legal_acceptance_bundle: legalAcceptance,
        },
      },
    });

    if (error) {
      throw new Error(mapProvisioningErrorMessage(error));
    }

    if (data.session) {
      return { requiresEmailConfirmation: false };
    }

    return { requiresEmailConfirmation: true };
  };

  const login = async ({ email, password }: LoginInput) => {
    const normalizedEmail = normalizeEmail(email);
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const message = mapLoginErrorMessage(error);

      if (message === 'Vahvista sähköpostiosoite ennen kirjautumista.') {
        throw new AuthActionError('email-not-confirmed', message);
      }

      throw new Error(message);
    }

    if (!data.session?.user) {
      throw new Error('Kirjautuminen epäonnistui.');
    }
  };

  const resendEmailConfirmation = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);

    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sähköpostiosoite.');
    }

    const client = requireSupabase();
    const { error } = await client.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      throw new Error(mapConfirmationResendErrorMessage(error));
    }
  };

  const logout = async () => {
    clearAuthState();

    if (!isSupabaseConfigured) {
      return;
    }

    const client = requireSupabase();

    queueMicrotask(() => {
      void client.auth
        .signOut({ scope: 'local' })
        .then(({ error }) => {
          if (error) {
            console.error('Supabase local sign-out cleanup failed after optimistic logout.', error);
          }
        })
        .catch((error) => {
          console.error('Supabase local sign-out cleanup failed after optimistic logout.', error);
        });
    });
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sähköpostiosoite.');
    }

    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getAuthRedirectUrl(),
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (_unused: string, nextPassword: string) => {
    if (!validatePassword(nextPassword)) {
      throw new Error('Uuden salasanan on oltava vähintään 8 merkkiä.');
    }
    if (!requiresPasswordReset && !user) {
      throw new Error('Avaa ensin sähköpostiin lähetetty palautuslinkki.');
    }

    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password: nextPassword });
    if (error) {
      throw new Error(error.message);
    }
    setRequiresPasswordReset(false);
  };

  const updateProfile = async ({ displayName, email }: ProfileInput) => {
    if (!user) {
      throw new Error('Et ole kirjautunut sisään.');
    }

    const trimmedName = displayName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (trimmedName.length < 2) {
      throw new Error('Anna vähintään kaksimerkkinen nimi.');
    }
    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sähköpostiosoite.');
    }

    const client = requireSupabase();
    const authPayload: { email?: string; data?: { display_name: string } } = {
      data: { display_name: trimmedName },
    };

    if (normalizedEmail !== user.email) {
      authPayload.email = normalizedEmail;
    }

    const { error: authError } = await client.auth.updateUser(authPayload);
    if (authError) {
      throw new Error(authError.message);
    }

    const currentProfile = await getProfile(user.id);
    if (!currentProfile) {
      throw new Error('Käyttäjäprofiilia ei löytynyt.');
    }

    const updatedProfile = await upsertProfile({
      ...currentProfile,
      email: normalizedEmail,
      display_name: trimmedName,
      updated_at: new Date().toISOString(),
    });

    const nextUser = toAuthUser(updatedProfile, organization);
    setUser(nextUser);
    await loadUsers(nextUser, organization);
  };

  const changePassword = async (currentPassword: string, nextPassword: string) => {
    if (!user) {
      throw new Error('Et ole kirjautunut sisään.');
    }
    if (!validatePassword(nextPassword)) {
      throw new Error('Uuden salasanan on oltava vähintään 8 merkkiä.');
    }

    const client = requireSupabase();
    const verification = await client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verification.error) {
      throw new Error('Nykyinen salasana on virheellinen.');
    }

    const { error } = await client.auth.updateUser({ password: nextPassword });
    if (error) {
      throw new Error(error.message);
    }
  };

  const requirePlatformAdmin = () => {
    if (!user || user.role !== 'admin') {
      throw new Error('Toiminto vaatii pääkäyttäjän oikeudet.');
    }
  };

  const requireOrganizationOwner = () => {
    if (!user || user.organizationRole !== 'owner') {
      throw new Error('Toiminto vaatii yrityksen omistajan oikeudet.');
    }
  };

  const createUserByAdmin = async ({ displayName, email, password, role, status }: AdminCreateUserInput) => {
    requirePlatformAdmin();

    const trimmedName = displayName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (trimmedName.length < 2) {
      throw new Error('Anna vahintaan kaksimerkkinen nimi.');
    }
    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sahkopostiosoite.');
    }
    if (!validatePassword(password)) {
      throw new Error('Salasanan on oltava vahintaan 8 merkkia.');
    }

    const authClient = createIsolatedSupabaseClient();
    const { data, error } = await authClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          display_name: trimmedName,
        },
      },
    });

    if (error) {
      throw new Error(mapProvisioningErrorMessage(error));
    }

    const createdUser = data.user;
    const identities = (createdUser as { identities?: unknown[] } | null)?.identities;
    if (!createdUser?.id || (Array.isArray(identities) && identities.length === 0)) {
      throw new Error('Talle sahkopostiosoitteelle on jo olemassa kayttajatili.');
    }

    await upsertProfile({
      id: createdUser.id,
      email: normalizedEmail,
      display_name: trimmedName,
      role,
      organization_id: null,
      organization_role: null,
      status,
      created_at: createdUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: null,
    });

    await loadUsers(user, organization);
  };

  const createOrganizationEmployee = async ({ displayName, email, password, status }: OrganizationEmployeeInput) => {
    requireOrganizationOwner();

    const trimmedName = displayName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (!organization?.id) {
      throw new Error('Yritystyötilaa ei löytynyt.');
    }
    if (trimmedName.length < 2) {
      throw new Error('Anna vahintaan kaksimerkkinen nimi.');
    }
    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sahkopostiosoite.');
    }
    if (!validatePassword(password)) {
      throw new Error('Salasanan on oltava vahintaan 8 merkkia.');
    }

    const authClient = createIsolatedSupabaseClient();
    const { data, error } = await authClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          display_name: trimmedName,
        },
      },
    });

    if (error) {
      throw new Error(mapProvisioningErrorMessage(error));
    }

    const createdUser = data.user;
    const identities = (createdUser as { identities?: unknown[] } | null)?.identities;
    if (!createdUser?.id || (Array.isArray(identities) && identities.length === 0)) {
      throw new Error('Talle sahkopostiosoitteelle on jo olemassa kayttajatili.');
    }

    await assignEmployeeToCurrentOrganization(createdUser.id, status);
    await loadUsers(user, organization);
  };

  const updateUserRole = async (userId: string, nextRole: UserRole) => {
    requirePlatformAdmin();
    const currentProfile = await getProfile(userId);
    if (!currentProfile) {
      throw new Error('Käyttäjää ei löytynyt.');
    }

    const updatedProfile = await upsertProfile({
      ...currentProfile,
      role: nextRole,
      updated_at: new Date().toISOString(),
    });

    const nextCurrentUser = user?.id === updatedProfile.id ? toAuthUser(updatedProfile, organization) : user;
    if (nextCurrentUser) {
      setUser(nextCurrentUser);
    }
    await loadUsers(nextCurrentUser, organization);
  };

  const updateUserStatus = async (userId: string, nextStatus: UserStatus) => {
    requirePlatformAdmin();
    if (user?.id === userId && nextStatus === 'disabled') {
      throw new Error('Et voi poistaa omaa käyttäjätiliäsi käytöstä.');
    }

    const currentProfile = await getProfile(userId);
    if (!currentProfile) {
      throw new Error('Käyttäjää ei löytynyt.');
    }

    const updatedProfile = await upsertProfile({
      ...currentProfile,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });

    const nextCurrentUser = user?.id === updatedProfile.id ? toAuthUser(updatedProfile, organization) : user;
    if (nextCurrentUser) {
      setUser(nextCurrentUser);
    }
    await loadUsers(nextCurrentUser, organization);
  };

  const updateOrganizationEmployeeStatus = async (userId: string, nextStatus: UserStatus) => {
    requireOrganizationOwner();
    await updateEmployeeStatusInCurrentOrganization(userId, nextStatus);
    await loadUsers(user, organization);
  };

  const accessState = deriveAccessState({
    platformRole: user?.role,
    organizationRole: user?.organizationRole,
    status: user?.status,
  });

  const value: AuthContextValue = {
    user,
    users,
    organization,
    role: user?.role ?? null,
    organizationRole: user?.organizationRole ?? null,
    loading,
    isAuthenticated: Boolean(user),
    isPlatformAdmin: accessState.isPlatformAdmin,
    canEdit: accessState.canEdit,
    canDelete: accessState.canDelete,
    canManageUsers: accessState.canManageUsers,
    canManageSharedData: accessState.canManageSharedData,
    requiresPasswordReset,
    backendConfigError,
    register,
    login,
    logout,
    resendEmailConfirmation,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
    createUserByAdmin,
    createOrganizationEmployee,
    updateUserRole,
    updateUserStatus,
    updateOrganizationEmployeeStatus,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
