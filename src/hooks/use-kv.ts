import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { AppKvScope, isSupabaseConfigured, requireSupabase } from '../lib/supabase';

type SetValueAction<T> = T | ((current: T) => T);
type RecordContext = {
  recordId: string;
  key: string;
  scope: AppKvScope;
  userId?: string | null;
  organizationId?: string | null;
};

type PendingWrite = RecordContext & {
  value: unknown;
  snapshot: string | null;
};

type UseKVOptions = {
  userId?: string | null;
  organizationId?: string | null;
};

const REMOTE_WRITE_DEBOUNCE_MS = 2000;

const ORGANIZATION_KEYS = new Set<string>([
  'installation-groups',
  'settings',
  'term-templates',
  'company-profile',
  'tender-intelligence-billing',
  'tender-intelligence-billing-history',
  'catalog-products',
  'catalog-product-sources',
  'catalog-import-runs',
  'catalog-raw-import-records',
  'catalog-categories',
  'catalog-source-category-mappings',
  'catalog-bootstrap-state',
]);

const LEGACY_SHARED_KEYS = new Set<string>([
  'installation-groups',
  'settings',
  'term-templates',
  'catalog-products',
  'catalog-product-sources',
  'catalog-import-runs',
  'catalog-raw-import-records',
  'catalog-categories',
  'catalog-source-category-mappings',
  'catalog-bootstrap-state',
]);

const LEGACY_USER_TO_ORGANIZATION_KEYS = new Set<string>(['company-profile']);

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<(value: unknown) => void>>();
const persistedSnapshots = new Map<string, string | null>();
const pendingWrites = new Map<string, PendingWrite>();
const pendingWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function resolvePreferredRecordValue<T>(options: {
  fallback: T;
  pendingValue?: T;
  persistedValue?: T;
}) {
  if (options.pendingValue !== undefined) {
    return options.pendingValue;
  }

  if (options.persistedValue !== undefined) {
    return options.persistedValue;
  }

  return options.fallback;
}

function getScopeForKey(key: string): AppKvScope {
  return ORGANIZATION_KEYS.has(key) ? 'organization' : 'user';
}

function getRecordId(args: { key: string; scope: AppKvScope; userId?: string | null; organizationId?: string | null }) {
  if (args.scope === 'shared') {
    return `shared:${args.key}`;
  }

  if (args.scope === 'organization') {
    return `org:${args.organizationId}:${args.key}`;
  }

  return `user:${args.userId}:${args.key}`;
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
    if (!current) {
      return;
    }

    current.delete(callback);
    if (current.size === 0) {
      listeners.delete(recordId);
    }
  };
}

function emit(recordId: string, value: unknown) {
  cache.set(recordId, value);
  listeners.get(recordId)?.forEach((listener) => listener(value));
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

function getPendingValue<T>(recordId: string) {
  const pendingWrite = pendingWrites.get(recordId);
  return pendingWrite ? (pendingWrite.value as T) : undefined;
}

async function readRemoteRecordById<T>(recordId: string): Promise<T | undefined> {
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
    return undefined;
  }

  return data.value as T;
}

function getLegacyRecordIds(key: string, userId?: string | null) {
  const recordIds: string[] = [];

  if (LEGACY_SHARED_KEYS.has(key)) {
    recordIds.push(getRecordId({ key, scope: 'shared' }));
  }

  if (LEGACY_USER_TO_ORGANIZATION_KEYS.has(key) && userId) {
    recordIds.push(getRecordId({ key, scope: 'user', userId }));
  }

  return recordIds;
}

async function readLegacyValue<T>(key: string, userId: string | null | undefined, fallback: T) {
  const legacyRecordIds = getLegacyRecordIds(key, userId);

  for (const legacyRecordId of legacyRecordIds) {
    if (isSupabaseConfigured) {
      const remoteValue = await readRemoteRecordById<T>(legacyRecordId);
      if (remoteValue !== undefined) {
        return remoteValue;
      }
      continue;
    }

    const localValue = readFallbackValue<T | undefined>(legacyRecordId, undefined);
    if (localValue !== undefined) {
      return localValue;
    }
  }

  return fallback;
}

async function readRecordValue<T>(args: RecordContext & { fallback: T }): Promise<T> {
  const initialPendingValue = getPendingValue<T>(args.recordId);
  if (initialPendingValue !== undefined) {
    writeFallbackValue(args.recordId, initialPendingValue);
    return initialPendingValue;
  }

  if (!isSupabaseConfigured) {
    let nextValue = readFallbackValue(args.recordId, args.fallback);

    const latestPendingValue = getPendingValue<T>(args.recordId);
    if (latestPendingValue !== undefined) {
      writeFallbackValue(args.recordId, latestPendingValue);
      return latestPendingValue;
    }

    if (args.scope === 'organization' && safeSerialize(nextValue) === safeSerialize(args.fallback)) {
      nextValue = await readLegacyValue(args.key, args.userId, args.fallback);
      writeFallbackValue(args.recordId, nextValue);
    }

    persistedSnapshots.set(args.recordId, safeSerialize(nextValue));
    return nextValue;
  }

  const remoteValue = await readRemoteRecordById<T>(args.recordId);
  const latestPendingValue = getPendingValue<T>(args.recordId);
  if (latestPendingValue !== undefined) {
    writeFallbackValue(args.recordId, latestPendingValue);
    return latestPendingValue;
  }

  if (remoteValue !== undefined) {
    persistedSnapshots.set(args.recordId, safeSerialize(remoteValue));
    writeFallbackValue(args.recordId, remoteValue);
    return remoteValue;
  }

  let nextValue = args.fallback;
  if (args.scope === 'organization') {
    nextValue = await readLegacyValue(args.key, args.userId, args.fallback);
    if (safeSerialize(nextValue) !== safeSerialize(args.fallback)) {
      await writeRemoteValue({
        recordId: args.recordId,
        key: args.key,
        scope: args.scope,
        userId: args.userId,
        organizationId: args.organizationId,
        value: nextValue,
      });
    }
  }

  persistedSnapshots.set(args.recordId, safeSerialize(nextValue));
  writeFallbackValue(args.recordId, nextValue);
  return nextValue;
}

async function writeRemoteValue<T>(args: RecordContext & { value: T }) {
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
      organization_id: args.scope === 'organization' ? args.organizationId ?? null : null,
      owner_user_id: args.scope === 'user' ? args.userId ?? null : null,
      value: args.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
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

  if (!pending || pending.snapshot === persistedSnapshots.get(recordId)) {
    return;
  }

  try {
    await writeRemoteValue({
      recordId: pending.recordId,
      key: pending.key,
      scope: pending.scope,
      userId: pending.userId,
      organizationId: pending.organizationId,
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

  // Skip remote write if value hasn't changed since last persisted snapshot
  if (write.snapshot !== null && write.snapshot === persistedSnapshots.get(write.recordId)) {
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

function useRecordValue<T>(recordContext: RecordContext | null, defaultValue: T) {
  const defaultRef = useRef(defaultValue);
  useEffect(() => {
    defaultRef.current = defaultValue;
  }, [defaultValue]);

  const [value, setValueState] = useState<T>(() => {
    if (!recordContext) {
      return defaultValue;
    }

    if (cache.has(recordContext.recordId)) {
      return cache.get(recordContext.recordId) as T;
    }

    return readFallbackValue(recordContext.recordId, defaultValue);
  });
  const [isLoaded, setIsLoaded] = useState(() => Boolean(recordContext && persistedSnapshots.has(recordContext.recordId)));
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!recordContext) {
      setValueState(defaultRef.current);
      setIsLoaded(false);
      return;
    }

    let cancelled = false;
    const unsubscribe = subscribe(recordContext.recordId, (nextValue) => {
      if (!cancelled) {
        setValueState(nextValue as T);
      }
    });

    if (cache.has(recordContext.recordId)) {
      setValueState(cache.get(recordContext.recordId) as T);
    } else {
      const fallbackValue = readFallbackValue(recordContext.recordId, defaultRef.current);
      emit(recordContext.recordId, fallbackValue);
      setValueState(fallbackValue);
    }

    setIsLoaded(Boolean(persistedSnapshots.has(recordContext.recordId)));

    void readRecordValue({ ...recordContext, fallback: defaultRef.current })
      .then((nextValue) => {
        if (!cancelled) {
          emit(recordContext.recordId, nextValue);
          setIsLoaded(true);
        }
      })
      .catch((error) => {
        console.error(`Failed to load KV key "${recordContext.key}".`, error);
        if (!cancelled) {
          setIsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [recordContext]);

  const setValue = useCallback(
    (next: SetValueAction<T>) => {
      if (!recordContext) {
        return;
      }

      const nextValue =
        typeof next === 'function'
          ? (next as (current: T) => T)(valueRef.current)
          : next;

      valueRef.current = nextValue;
      emit(recordContext.recordId, nextValue);
      scheduleRemoteWrite({
        ...recordContext,
        value: nextValue,
        snapshot: safeSerialize(nextValue),
      });
      setIsLoaded(true);
    },
    [recordContext]
  );

  return [value, setValue, isLoaded] as const;
}

export function useKV<T>(key: string, defaultValue: T, options?: UseKVOptions): [T, (value: SetValueAction<T>) => void, boolean] {
  const { user, organization } = useAuth();
  const scope = useMemo(() => getScopeForKey(key), [key]);
  const userId = options && 'userId' in options ? options.userId ?? null : user?.id ?? null;
  const organizationId =
    options && 'organizationId' in options
      ? options.organizationId ?? null
      : organization?.id ?? null;

  const recordContext = useMemo(() => {
    if (scope === 'organization') {
      if (!organizationId) {
        return null;
      }

      return {
        recordId: getRecordId({ key, scope, organizationId, userId }),
        key,
        scope,
        organizationId,
        userId,
      } satisfies RecordContext;
    }

    if (!userId) {
      return null;
    }

    return {
      recordId: getRecordId({ key, scope, userId }),
      key,
      scope,
      userId,
    } satisfies RecordContext;
  }, [key, scope, organizationId, userId]);

  return useRecordValue(recordContext, defaultValue) as [T, (value: SetValueAction<T>) => void, boolean];
}

export function useUserScopedKVMany<T>(
  key: string,
  defaultValue: T,
  userIds: string[]
): [Record<string, T>, (userId: string, value: SetValueAction<T>) => void, boolean] {
  const normalizedUserIds = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort(),
    [userIds]
  );
  const records = useMemo(
    () =>
      normalizedUserIds.map((userId) => ({
        userId,
        recordId: getRecordId({ key, scope: 'user', userId }),
      })),
    [key, normalizedUserIds]
  );

  const defaultRef = useRef(defaultValue);
  useEffect(() => {
    defaultRef.current = defaultValue;
  }, [defaultValue]);

  const [valuesByUserId, setValuesByUserId] = useState<Record<string, T>>(() => {
    const initialValues: Record<string, T> = {};

    for (const record of records) {
      initialValues[record.userId] = cache.has(record.recordId)
        ? (cache.get(record.recordId) as T)
        : readFallbackValue(record.recordId, defaultValue);
    }

    return initialValues;
  });
  const [loadedRecordIds, setLoadedRecordIds] = useState<Set<string>>(
    () => new Set(records.filter((record) => persistedSnapshots.has(record.recordId)).map((record) => record.recordId))
  );

  useEffect(() => {
    const initialValues: Record<string, T> = {};
    for (const record of records) {
      initialValues[record.userId] = cache.has(record.recordId)
        ? (cache.get(record.recordId) as T)
        : readFallbackValue(record.recordId, defaultRef.current);
    }

    setValuesByUserId(initialValues);
    setLoadedRecordIds(
      new Set(records.filter((record) => persistedSnapshots.has(record.recordId)).map((record) => record.recordId))
    );

    let cancelled = false;
    const unsubscribers = records.map((record) =>
      subscribe(record.recordId, (nextValue) => {
        if (!cancelled) {
          setValuesByUserId((current) => ({
            ...current,
            [record.userId]: nextValue as T,
          }));
        }
      })
    );

    records.forEach((record) => {
      void readRecordValue({
        recordId: record.recordId,
        key,
        scope: 'user',
        userId: record.userId,
        fallback: defaultRef.current,
      })
        .then((nextValue) => {
          if (!cancelled) {
            emit(record.recordId, nextValue);
            setLoadedRecordIds((current) => new Set(current).add(record.recordId));
          }
        })
        .catch((error) => {
          console.error(`Failed to load KV key "${key}" for user ${record.userId}.`, error);
          if (!cancelled) {
            setLoadedRecordIds((current) => new Set(current).add(record.recordId));
          }
        });
    });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [key, records]);

  const setValueForUser = useCallback(
    (targetUserId: string, next: SetValueAction<T>) => {
      if (!targetUserId) {
        return;
      }

      const recordId = getRecordId({ key, scope: 'user', userId: targetUserId });
      const currentValue = (cache.has(recordId)
        ? cache.get(recordId)
        : valuesByUserId[targetUserId] ?? defaultRef.current) as T;
      const nextValue =
        typeof next === 'function'
          ? (next as (current: T) => T)(currentValue)
          : next;

      emit(recordId, nextValue);
      scheduleRemoteWrite({
        recordId,
        key,
        scope: 'user',
        userId: targetUserId,
        value: nextValue,
        snapshot: safeSerialize(nextValue),
      });
      setLoadedRecordIds((current) => new Set(current).add(recordId));
    },
    [key, valuesByUserId]
  );

  const isLoaded = records.every((record) => loadedRecordIds.has(record.recordId));
  return [valuesByUserId, setValueForUser, isLoaded];
}

