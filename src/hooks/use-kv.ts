import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { AppKvScope, isSupabaseConfigured, requireSupabase } from '../lib/supabase';

type SetValueAction<T> = T | ((current: T) => T);
type PendingWrite = {
  recordId: string;
  key: string;
  scope: AppKvScope;
  userId?: string | null;
  value: unknown;
  snapshot: string | null;
};

const REMOTE_WRITE_DEBOUNCE_MS = 600;

const SHARED_KEYS = new Set<string>([
  'installation-groups',
  'quote-terms',
  'settings',
  'catalog-products',
  'catalog-product-sources',
  'catalog-import-runs',
  'catalog-raw-import-records',
  'catalog-categories',
  'catalog-source-category-mappings',
  'catalog-bootstrap-state',
]);

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<(value: unknown) => void>>();
const persistedSnapshots = new Map<string, string | null>();
const pendingWrites = new Map<string, PendingWrite>();
const pendingWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getScopeForKey(key: string): AppKvScope {
  return SHARED_KEYS.has(key) ? 'shared' : 'user';
}

function getRecordId(key: string, scope: AppKvScope, userId?: string | null) {
  return scope === 'shared' ? `shared:${key}` : `user:${userId}:${key}`;
}

function getLocalFallbackKey(recordId: string) {
  return `laskenta:kv:${recordId}`;
}

function subscribe(recordId: string, callback: (value: unknown) => void) {
  const bucket = listeners.get(recordId) ?? new Set<(value: unknown) => void>();
  bucket.add(callback);
  listeners.set(recordId, bucket);
  return () => {
    const current = listeners.get(recordId);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) {
      listeners.delete(recordId);
    }
  };
}

function emit(recordId: string, value: unknown) {
  cache.set(recordId, value);
  const bucket = listeners.get(recordId);
  bucket?.forEach((listener) => listener(value));
}

function safeSerialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function readFallbackValue<T>(recordId: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(getLocalFallbackKey(recordId));
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeFallbackValue<T>(recordId: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(getLocalFallbackKey(recordId), JSON.stringify(value));
}

async function readRemoteValue<T>(recordId: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured) {
    const nextValue = readFallbackValue(recordId, fallback);
    persistedSnapshots.set(recordId, safeSerialize(nextValue));
    return nextValue;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('app_kv')
    .select('value')
    .eq('id', recordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.value === null || data.value === undefined) {
    persistedSnapshots.set(recordId, safeSerialize(fallback));
    return fallback;
  }

  const nextValue = data.value as T;
  persistedSnapshots.set(recordId, safeSerialize(nextValue));
  writeFallbackValue(recordId, nextValue);
  return nextValue;
}

async function writeRemoteValue<T>(args: {
  recordId: string;
  key: string;
  scope: AppKvScope;
  userId?: string | null;
  value: T;
}) {
  if (!isSupabaseConfigured) {
    writeFallbackValue(args.recordId, args.value);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from('app_kv').upsert(
    {
      id: args.recordId,
      storage_key: args.key,
      scope: args.scope,
      owner_user_id: args.scope === 'user' ? args.userId ?? null : null,
      value: args.value,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    throw error;
  }
}

async function flushPendingWrite(recordId: string) {
  const pending = pendingWrites.get(recordId);
  pendingWrites.delete(recordId);

  const existingTimer = pendingWriteTimers.get(recordId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingWriteTimers.delete(recordId);
  }

  if (!pending) {
    return;
  }

  if (pending.snapshot === persistedSnapshots.get(recordId)) {
    return;
  }

  try {
    await writeRemoteValue({
      recordId: pending.recordId,
      key: pending.key,
      scope: pending.scope,
      userId: pending.userId,
      value: pending.value,
    });
    persistedSnapshots.set(recordId, pending.snapshot);
  } catch (error) {
    console.error(`Failed to persist KV key "${pending.key}".`, error);
  }
}

function scheduleRemoteWrite(write: PendingWrite) {
  writeFallbackValue(write.recordId, write.value);

  if (!isSupabaseConfigured) {
    persistedSnapshots.set(write.recordId, write.snapshot);
    return;
  }

  pendingWrites.set(write.recordId, write);

  const existingTimer = pendingWriteTimers.get(write.recordId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  pendingWriteTimers.set(
    write.recordId,
    setTimeout(() => {
      void flushPendingWrite(write.recordId);
    }, REMOTE_WRITE_DEBOUNCE_MS)
  );
}

export function useKV<T>(key: string, defaultValue: T): [T, (value: SetValueAction<T>) => void, boolean] {
  const { user } = useAuth();
  const scope = useMemo(() => getScopeForKey(key), [key]);
  const userId = user?.id ?? null;
  const recordId = useMemo(() => {
    if (scope === 'shared') {
      return getRecordId(key, scope, null);
    }
    if (!userId) {
      return null;
    }
    return getRecordId(key, scope, userId);
  }, [key, scope, userId]);

  const defaultRef = useRef(defaultValue);
  useEffect(() => {
    defaultRef.current = defaultValue;
  }, [defaultValue]);

  const [value, setValueState] = useState<T>(() => {
    if (!recordId) {
      return defaultValue;
    }
    if (cache.has(recordId)) {
      return cache.get(recordId) as T;
    }
    return readFallbackValue(recordId, defaultValue);
  });
  const [isLoaded, setIsLoaded] = useState(() => Boolean(recordId && persistedSnapshots.has(recordId)));
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!recordId) {
      setValueState(defaultRef.current);
      setIsLoaded(false);
      return;
    }

    let cancelled = false;
    const unsubscribe = subscribe(recordId, (nextValue) => {
      if (!cancelled) {
        setValueState(nextValue as T);
      }
    });

    if (cache.has(recordId)) {
      setValueState(cache.get(recordId) as T);
    }

    setIsLoaded(persistedSnapshots.has(recordId));

    void readRemoteValue<T>(recordId, defaultRef.current)
      .then((nextValue) => {
        if (cancelled) {
          return;
        }
        emit(recordId, nextValue);
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error(`Failed to load KV key "${key}".`, error);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key, recordId]);

  const setValue = useCallback(
    (nextValue: SetValueAction<T>) => {
      if (!recordId) {
        return;
      }

      const previousValue = valueRef.current;
      const resolvedValue =
        typeof nextValue === 'function'
          ? (nextValue as (current: T) => T)(previousValue)
          : nextValue;
      const previousSnapshot = safeSerialize(previousValue);
      const nextSnapshot = safeSerialize(resolvedValue);

      if (nextSnapshot === previousSnapshot) {
        return;
      }

      valueRef.current = resolvedValue;
      emit(recordId, resolvedValue);
      scheduleRemoteWrite({
        recordId,
        key,
        scope,
        userId,
        value: resolvedValue,
        snapshot: nextSnapshot,
      });
    },
    [key, recordId, scope, userId]
  );

  return [value, setValue, isLoaded];
}

