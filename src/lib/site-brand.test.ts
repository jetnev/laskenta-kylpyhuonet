import { describe, expect, it } from 'vitest';

import {
  APP_CANONICAL_URL,
  APP_NAME,
  APP_SUPPORT_EMAIL,
  buildCanonicalUrl,
  buildDemoMailtoUrl,
  buildDocumentTitle,
  getWorkspacePageDescription,
  resolveSiteUrl,
} from './site-brand';

describe('site-brand helpers', () => {
  it('builds canonical URLs on the production domain by default', () => {
    expect(buildCanonicalUrl('/login')).toBe(`${APP_CANONICAL_URL}/login`);
    expect(buildCanonicalUrl('/reports/')).toBe(`${APP_CANONICAL_URL}/reports`);
  });

  it('resolves the runtime site URL from the current origin when no site URL is configured', () => {
    expect(resolveSiteUrl(undefined, 'https://preview.projekta.pages.dev')).toBe('https://preview.projekta.pages.dev/');
  });

  it('builds branded document titles and demo mailto links', () => {
    const mailto = decodeURIComponent(buildDemoMailtoUrl());

    expect(buildDocumentTitle('Kirjaudu')).toBe('Kirjaudu | Projekta');
    expect(buildDocumentTitle()).toBe(APP_NAME);
    expect(mailto).toContain(APP_SUPPORT_EMAIL);
    expect(mailto).toContain(`${APP_NAME}-palvelusta`);
  });

  it('returns workspace descriptions for authenticated pages', () => {
    expect(getWorkspacePageDescription('reports')).toContain('Projektan');
    expect(getWorkspacePageDescription('dashboard')).toContain('Projekta');
  });
});