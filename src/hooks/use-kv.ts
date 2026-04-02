import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { AppKvScope, isSupabaseConfigured, requireSupabase } from '../lib/supabase';

type SetValueAction<T> = T | ((current: T) => T);

const SHARED_KEYS = new Set<string>([
  'products',
  'installation-groups',
  'substitute-products',
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
    return readFallbackValue(recordId, fallback);
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
    return fallback;
  }

  return data.value as T;
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

export function useKV<T>(key: string, defaultValue: T): [T, (value: SetValueAction<T>) => void] {
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
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!recordId) {
      setValueState(defaultRef.current);
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

    void readRemoteValue<T>(recordId, defaultRef.current)
      .then((nextValue) => {
        if (cancelled) {
          return;
        }
        emit(recordId, nextValue);
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

      valueRef.current = resolvedValue;
      emit(recordId, resolvedValue);

      void writeRemoteValue({
        recordId,
        key,
        scope,
        userId,
        value: resolvedValue,
      }).catch((error) => {
        console.error(`Failed to persist KV key "${key}".`, error);
        valueRef.current = previousValue;
        emit(recordId, previousValue);
      });
    },
    [key, recordId, scope, userId]
  );

  return [value, setValue];
}

