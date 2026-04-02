import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';
export type AppKvScope = 'shared' | 'user';

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface AppKvRow<T = unknown> {
  id: string;
  storage_key: string;
  scope: AppKvScope;
  owner_user_id: string | null;
  value: T;
  updated_at: string;
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

export function requireSupabase() {
  if (!supabase) {
    throw new Error(getSupabaseConfigError());
  }
  return supabase;
}

