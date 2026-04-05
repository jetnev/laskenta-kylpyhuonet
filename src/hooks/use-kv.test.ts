import { describe, expect, it } from 'vitest';

import { resolvePreferredRecordValue } from './use-kv';

describe('resolvePreferredRecordValue', () => {
  it('prefers a pending optimistic value over a stale persisted value', () => {
    expect(
      resolvePreferredRecordValue({
        fallback: [],
        pendingValue: ['new-quote'],
        persistedValue: ['old-quote'],
      }),
    ).toEqual(['new-quote']);
  });

  it('uses the persisted value when there is no pending write', () => {
    expect(
      resolvePreferredRecordValue({
        fallback: [],
        persistedValue: ['old-quote'],
      }),
    ).toEqual(['old-quote']);
  });

  it('falls back when neither pending nor persisted value exists', () => {
    expect(
      resolvePreferredRecordValue({
        fallback: ['fallback-quote'],
      }),
    ).toEqual(['fallback-quote']);
  });
});