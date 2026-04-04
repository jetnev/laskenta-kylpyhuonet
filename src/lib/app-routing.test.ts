import { describe, expect, it } from 'vitest';

import { getAppPagePath, resolveAccessibleAppPage, resolveAppPage, resolveAppRoute } from './app-routing';

describe('resolveAppRoute', () => {
  it('treats nested app paths as authenticated routes', () => {
    expect(resolveAppRoute('/app')).toBe('app');
    expect(resolveAppRoute('/app/juridiset-dokumentit')).toBe('app');
    expect(resolveAppRoute('/app/sopimusasiat')).toBe('app');
    expect(resolveAppRoute('/login')).toBe('login');
  });
});

describe('resolveAppPage', () => {
  it('maps tarjousehdot and juridiset dokumentit to different pages', () => {
    expect(resolveAppPage('/app/tarjousehdot')).toBe('terms');
    expect(resolveAppPage('/app/juridiset-dokumentit')).toBe('legal');
  });

  it('supports the legacy sopimusasiat alias and dashboard root', () => {
    expect(resolveAppPage('/app')).toBe('dashboard');
    expect(resolveAppPage('/app/sopimusasiat')).toBe('legal');
  });
});

describe('resolveAccessibleAppPage', () => {
  it('redirects ordinary users away from juridiset dokumentit', () => {
    expect(
      resolveAccessibleAppPage('legal', {
        canManageSharedData: false,
        canManageUsers: false,
      })
    ).toBe('dashboard');
  });

  it('keeps juridiset dokumentit available for owner/admin users', () => {
    expect(
      resolveAccessibleAppPage('legal', {
        canManageSharedData: true,
        canManageUsers: true,
      })
    ).toBe('legal');
  });

  it('keeps tarjousehdot untouched as a separate page', () => {
    const quoteTermsPath = getAppPagePath('terms');
    const legalDocumentsPath = getAppPagePath('legal');

    expect(resolveAccessibleAppPage('terms', { canManageSharedData: false, canManageUsers: false })).toBe('terms');
    expect(quoteTermsPath).toBe('/app/tarjousehdot');
    expect(legalDocumentsPath).toBe('/app/juridiset-dokumentit');
  });
});