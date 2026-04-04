import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LandingPage from './LandingPage';
import PublicLegalDocumentPage from './legal/PublicLegalDocumentPage';

describe('public branding surfaces', () => {
  it('renders the Projekta brand and support email on the landing page', () => {
    const markup = renderToStaticMarkup(<LandingPage onNavigateToLogin={() => undefined} />);

    expect(markup).toContain('Projekta');
    expect(markup).toContain('Varaa esittely');
  });

  it('renders the Projekta brand in the public legal shell', () => {
    const markup = renderToStaticMarkup(<PublicLegalDocumentPage documentType="privacy" />);

    expect(markup).toContain('Projekta');
    expect(markup).not.toContain('Tarjouslaskenta');
  });
});