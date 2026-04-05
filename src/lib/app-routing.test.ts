import { describe, expect, it } from 'vitest';

import {
  buildAppUrl,
  getAppPagePath,
  resolveAccessibleAppLocation,
  resolveAccessibleAppPage,
  resolveAppLocation,
  resolveAppPage,
  resolveAppRoute,
} from './app-routing';

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
    expect(resolveAppPage('/app/tarjousaly')).toBe('tender-intelligence');
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
        canManageLegalDocuments: false,
      })
    ).toBe('account');
  });

  it('keeps juridiset dokumentit available for legal managers', () => {
    expect(
      resolveAccessibleAppPage('legal', {
        canManageLegalDocuments: true,
      })
    ).toBe('legal');
  });

  it('keeps tarjousehdot untouched as a separate page', () => {
    const quoteTermsPath = getAppPagePath('terms');
    const legalDocumentsPath = getAppPagePath('legal');
    const tenderIntelligencePath = getAppPagePath('tender-intelligence');

    expect(resolveAccessibleAppPage('terms', { canManageLegalDocuments: false })).toBe('terms');
    expect(quoteTermsPath).toBe('/app/tarjousehdot');
    expect(legalDocumentsPath).toBe('/app/juridiset-dokumentit');
    expect(tenderIntelligencePath).toBe('/app/tarjousaly');
  });
});

describe('resolveAppLocation', () => {
  it('restores deep project workspace state from the URL', () => {
    expect(resolveAppLocation('/app/projektit', '?project=project-1&quote=quote-1&editor=quote')).toEqual({
      page: 'projects',
      projectId: 'project-1',
      quoteId: 'quote-1',
      editor: 'quote',
    });
  });

  it('drops orphaned quote editor state when project selection is missing', () => {
    expect(resolveAppLocation('/app/projektit', '?quote=quote-1&editor=quote')).toEqual({
      page: 'projects',
      projectId: undefined,
      quoteId: undefined,
      editor: undefined,
    });
  });

  it('reads invoice selection from laskut page search params', () => {
    expect(resolveAppLocation('/app/laskut', '?invoice=invoice-9')).toEqual({
      page: 'invoices',
      invoiceId: 'invoice-9',
    });
  });
});

describe('buildAppUrl', () => {
  it('serializes project, quote and editor state into a shareable URL', () => {
    expect(
      buildAppUrl({
        page: 'projects',
        projectId: 'project-1',
        quoteId: 'quote-1',
        editor: 'quote',
      })
    ).toBe('/app/projektit?project=project-1&quote=quote-1&editor=quote');
  });

  it('drops invalid workspace params when there is no selected project', () => {
    expect(
      buildAppUrl({
        page: 'projects',
        quoteId: 'quote-1',
        editor: 'quote',
      })
    ).toBe('/app/projektit');
  });

  it('keeps invoice deep-links scoped to laskut', () => {
    expect(buildAppUrl({ page: 'invoices', invoiceId: 'invoice-9' })).toBe('/app/laskut?invoice=invoice-9');
  });
});

describe('resolveAccessibleAppLocation', () => {
  it('canonicalizes blocked legal routes back to dashboard without leaking workspace params', () => {
    expect(
      resolveAccessibleAppLocation(
        {
          page: 'legal',
          projectId: 'project-1',
          quoteId: 'quote-1',
          editor: 'quote',
        },
        {
          canManageLegalDocuments: false,
        }
      )
    ).toEqual({ page: 'account' });
  });

  it('keeps legal routes available for legal managers', () => {
    expect(
      resolveAccessibleAppLocation(
        {
          page: 'legal',
        },
        {
          canManageLegalDocuments: true,
        }
      )
    ).toEqual({ page: 'legal' });
  });
});