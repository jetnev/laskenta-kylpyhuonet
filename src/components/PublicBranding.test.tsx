import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LandingPage from './LandingPage';
import PublicMarketingPage from './public/PublicMarketingPage';
import PublicLegalDocumentPage from './legal/PublicLegalDocumentPage';
import { PUBLIC_SITE_PATHS, resolvePublicMarketingPage } from '../lib/public-site';

describe('public branding surfaces', () => {
  it('renders the Projekta brand and support email on the landing page', () => {
    const markup = renderToStaticMarkup(<LandingPage onNavigateToLogin={() => undefined} />);

    expect(markup).toContain('Projekta');
    expect(markup).toContain('Tarjouslaskentaohjelma rakennusalan yrityksille');
    expect(markup).toContain('Pyydä demo');
    expect(markup).toContain('application/ld+json');
    expect(markup).toContain(PUBLIC_SITE_PATHS.features);
  });

  it('renders the public features marketing page with crawlable links', () => {
    const page = resolvePublicMarketingPage(PUBLIC_SITE_PATHS.features);

    expect(page).not.toBeNull();

    const markup = renderToStaticMarkup(<PublicMarketingPage page={page!} />);

    expect(markup).toContain('Tarjouseditori, kateohjaus ja viennit samassa ohjelmistossa');
    expect(markup).toContain(PUBLIC_SITE_PATHS.demo);
    expect(markup).toContain('Tarjouseditori rakennusalan tarjouslaskentaan');
  });

  it('renders the Projekta brand in the public legal shell', () => {
    const markup = renderToStaticMarkup(<PublicLegalDocumentPage documentType="privacy" />);

    expect(markup).toContain('Projekta');
    expect(markup).not.toContain('Tarjouslaskenta');
  });
});