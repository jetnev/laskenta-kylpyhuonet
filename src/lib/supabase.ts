import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';
export type OrganizationRole = 'owner' | 'employee';
export type AppKvScope = 'shared' | 'organization' | 'user';
export type LegalDocumentType = 'terms' | 'privacy' | 'dpa' | 'cookies';
export type LegalDocumentStatus = 'draft' | 'active' | 'archived';
export type LegalDocumentAcceptanceRequirement = 'all-users' | 'organization-owner' | 'none';
export type LegalAcceptanceSource = 'signup' | 'invited-user-first-login' | 'reacceptance' | 'admin-flow';

export interface OrganizationRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  organization_id?: string | null;
  organization_role?: OrganizationRole | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface AppKvRow<T = unknown> {
  id: string;
  storage_key: string;
  scope: AppKvScope;
  organization_id: string | null;
  owner_user_id: string | null;
  value: T;
  updated_at: string;
}

export interface LegalDocumentVersionRow {
  id: string;
  document_type: LegalDocumentType;
  title: string;
  version_label: string;
  effective_at: string;
  status: LegalDocumentStatus;
  acceptance_requirement: LegalDocumentAcceptanceRequirement;
  requires_reacceptance: boolean;
  change_summary?: string | null;
  locale: string;
  content_md: string;
  content_hash: string;
  created_by_user_id?: string | null;
  updated_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface LegalDocumentAcceptanceRow {
  id: string;
  document_version_id: string;
  document_type: LegalDocumentType;
  version_label: string;
  content_hash: string;
  user_id: string;
  organization_id?: string | null;
  accepted_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  acceptance_source: LegalAcceptanceSource;
  locale?: string | null;
  accepted_on_behalf_of_organization: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseConfigError() {
  return 'Supabase-asetukset puuttuvat. Määritä VITE_SUPABASE_URL ja VITE_SUPABASE_ANON_KEY ennen web-julkaisua.';
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export function createIsolatedSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error(getSupabaseConfigError());
  }

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(getSupabaseConfigError());
  }
  return supabase;
}

