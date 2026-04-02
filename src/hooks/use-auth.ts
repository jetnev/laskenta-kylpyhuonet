import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  ProfileRow,
  requireSupabase,
  type UserRole,
  type UserStatus,
} from '../lib/supabase';

export type { UserRole, UserStatus } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  initials: string;
  createdAt: string;
  lastLoginAt?: string;
  status: UserStatus;
}

interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface ProfileInput {
  displayName: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  users: AuthUser[];
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageSharedData: boolean;
  requiresPasswordReset: boolean;
  backendConfigError: string | null;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (_unused: string, nextPassword: string) => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  updateUserRole: (userId: string, nextRole: UserRole) => Promise<void>;
  updateUserStatus: (userId: string, nextStatus: UserStatus) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8;
}

function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function toDisplayName(user: User, fallbackDisplayName?: string) {
  const rawName = typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : fallbackDisplayName;
  if (rawName?.trim()) {
    return rawName.trim();
  }
  return user.email?.split('@')[0] || 'Käyttäjä';
}

function toAuthUser(profile: ProfileRow): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
    initials: getInitials(profile.display_name),
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at || undefined,
    status: profile.status,
  };
}

async function getProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProfileRow | null;
}

async function countProfiles() {
  const client = requireSupabase();
  const { count, error } = await client
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function upsertProfile(row: ProfileRow) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as ProfileRow;
}

async function ensureProfile(user: User, fallbackDisplayName?: string) {
  const existing = await getProfile(user.id);
  if (existing) {
    return existing;
  }

  const role: UserRole = (await countProfiles()) === 0 ? 'admin' : 'user';
  return upsertProfile({
    id: user.id,
    email: normalizeEmail(user.email || ''),
    display_name: toDisplayName(user, fallbackDisplayName),
    role,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const backendConfigError = isSupabaseConfigured ? null : getSupabaseConfigError();

  const clearAuthState = useCallback(() => {
    setRequiresPasswordReset(false);
    setUser(null);
    setUsers([]);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async (currentUser?: AuthUser | null) => {
    if (!isSupabaseConfigured) {
      setUsers(currentUser ? [currentUser] : []);
      return;
    }

    if (!currentUser || currentUser.role !== 'admin') {
      setUsers(currentUser ? [currentUser] : []);
      return;
    }

    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    setUsers((data as ProfileRow[]).map(toAuthUser));
  }, []);

  const hydrateSession = useCallback(
    async (session: Session | null, options?: { markLogin?: boolean }) => {
      if (!session?.user) {
        setUser(null);
        setUsers([]);
        return null;
      }

      let profile = await ensureProfile(session.user);
      profile = await refreshProfileFromAuthUser(session.user, profile, options?.markLogin);

      if (profile.status === 'disabled') {
        await requireSupabase().auth.signOut();
        throw new Error('Käyttäjätili on poistettu käytöstä.');
      }

      const nextUser = toAuthUser(profile);
      setUser(nextUser);
      await loadUsers(nextUser);
      return nextUser;
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
          throw error;
        }
        await hydrateSession(data.session);
      } catch (authError) {
        console.error('Supabase auth bootstrap failed.', authError);
        setUser(null);
        setUsers([]);
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

  const register = async ({ displayName, email, password }: RegisterInput) => {
    const trimmedName = displayName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (trimmedName.length < 2) {
      throw new Error('Anna vähintään kaksimerkkinen nimi.');
    }
    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sähköpostiosoite.');
    }
    if (!validatePassword(password)) {
      throw new Error('Salasanan on oltava vähintään 8 merkkiä.');
    }

    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          display_name: trimmedName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session) {
      await hydrateSession(data.session, { markLogin: true });
      return;
    }

    throw new Error('Tili luotiin. Vahvista sähköpostiosoitteesi Supabasen lähettämästä viestistä ennen kirjautumista.');
  };

  const login = async ({ email, password }: LoginInput) => {
    const normalizedEmail = normalizeEmail(email);
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw new Error('Virheellinen sähköposti tai salasana.');
    }

    const nextUser = await hydrateSession(data.session, { markLogin: true });
    if (!nextUser) {
      throw new Error('Kirjautuminen epäonnistui.');
    }
  };

  const logout = async () => {
    const client = requireSupabase();
    let signOutError: Error | null = null;

    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) {
        signOutError = new Error(error.message);
      }
    } catch (error) {
      signOutError = error instanceof Error ? error : new Error('Uloskirjautuminen epäonnistui.');
    } finally {
      clearAuthState();
    }

    if (signOutError) {
      throw signOutError;
    }
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!validateEmail(normalizedEmail)) {
      throw new Error('Anna kelvollinen sähköpostiosoite.');
    }

    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: import.meta.env.VITE_SUPABASE_REDIRECT_URL?.trim() || window.location.origin,
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

    const nextUser = toAuthUser(updatedProfile);
    setUser(nextUser);
    await loadUsers(nextUser);
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

  const requireAdmin = () => {
    if (!user || user.role !== 'admin') {
      throw new Error('Toiminto vaatii admin-oikeudet.');
    }
  };

  const updateUserRole = async (userId: string, nextRole: UserRole) => {
    requireAdmin();
    const currentProfile = await getProfile(userId);
    if (!currentProfile) {
      throw new Error('Käyttäjää ei löytynyt.');
    }

    const updatedProfile = await upsertProfile({
      ...currentProfile,
      role: nextRole,
      updated_at: new Date().toISOString(),
    });

    if (user?.id === updatedProfile.id) {
      setUser(toAuthUser(updatedProfile));
    }
    await loadUsers(user);
  };

  const updateUserStatus = async (userId: string, nextStatus: UserStatus) => {
    requireAdmin();
    if (user?.id === userId && nextStatus === 'disabled') {
      throw new Error('Et voi poistaa omaa käyttäjätiliäsi käytöstä.');
    }

    const currentProfile = await getProfile(userId);
    if (!currentProfile) {
      throw new Error('Käyttäjää ei löytynyt.');
    }

    await upsertProfile({
      ...currentProfile,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });

    await loadUsers(user);
  };

  const value: AuthContextValue = {
    user,
    users,
    role: user?.role ?? null,
    loading,
    isAuthenticated: Boolean(user),
    canEdit: Boolean(user && user.status === 'active'),
    canDelete: Boolean(user && user.status === 'active'),
    canManageUsers: user?.role === 'admin',
    canManageSharedData: user?.role === 'admin',
    requiresPasswordReset,
    backendConfigError,
    register,
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
    updateUserRole,
    updateUserStatus,
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
