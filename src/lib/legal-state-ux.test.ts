import { describe, expect, it } from 'vitest';
import { getLegalAcceptanceSubjectKey, sanitizeLegalLoadError, shouldBlockAppForLegalState } from './legal-state-ux';

describe('getLegalAcceptanceSubjectKey', () => {
  it('stays stable across auth rehydrations when user identity and role stay the same', () => {
    const first = getLegalAcceptanceSubjectKey({
      id: 'user-1',
      organizationRole: 'owner',
    });

    const second = getLegalAcceptanceSubjectKey({
      id: 'user-1',
      organizationRole: 'owner',
    });

    expect(second).toBe(first);
  });

  it('changes when the user or organization role changes', () => {
    expect(
      getLegalAcceptanceSubjectKey({
        id: 'user-1',
        organizationRole: 'owner',
      })
    ).not.toBe(
      getLegalAcceptanceSubjectKey({
        id: 'user-2',
        organizationRole: 'owner',
      })
    );

    expect(
      getLegalAcceptanceSubjectKey({
        id: 'user-1',
        organizationRole: 'owner',
      })
    ).not.toBe(
      getLegalAcceptanceSubjectKey({
        id: 'user-1',
        organizationRole: 'employee',
      })
    );
  });
});

describe('shouldBlockAppForLegalState', () => {
  it('blocks during the initial unresolved load', () => {
    expect(
      shouldBlockAppForLegalState({
        hasResolvedState: false,
        loading: true,
        error: null,
      })
    ).toBe(true);
  });

  it('does not block during a background refresh after state has already resolved', () => {
    expect(
      shouldBlockAppForLegalState({
        hasResolvedState: true,
        loading: true,
        error: null,
      })
    ).toBe(false);
  });

  it('does not replace the current view with an error after a background refresh failure', () => {
    expect(
      shouldBlockAppForLegalState({
        hasResolvedState: true,
        loading: false,
        error: 'refresh failed',
      })
    ).toBe(false);
  });

  it('blocks when the initial legal-state fetch fails before any state is resolved', () => {
    expect(
      shouldBlockAppForLegalState({
        hasResolvedState: false,
        loading: false,
        error: 'initial load failed',
      })
    ).toBe(true);
  });
});

describe('sanitizeLegalLoadError', () => {
  it('returns the Error message when an Error instance is provided', () => {
    expect(sanitizeLegalLoadError(new Error('stack depth limit exceeded'))).toBe(
      'stack depth limit exceeded'
    );
  });

  it('returns a generic Finnish message for non-Error values', () => {
    expect(sanitizeLegalLoadError('raw string')).toBe(
      'Sopimusasiakirjojen tarkistus epäonnistui.'
    );
    expect(sanitizeLegalLoadError(null)).toBe(
      'Sopimusasiakirjojen tarkistus epäonnistui.'
    );
    expect(sanitizeLegalLoadError(undefined)).toBe(
      'Sopimusasiakirjojen tarkistus epäonnistui.'
    );
  });

  it('returns a generic Finnish message when Error has an empty message', () => {
    expect(sanitizeLegalLoadError(new Error(''))).toBe(
      'Sopimusasiakirjojen tarkistus epäonnistui.'
    );
  });
});