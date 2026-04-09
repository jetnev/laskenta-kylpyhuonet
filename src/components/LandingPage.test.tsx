import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LandingPage from './LandingPage';
import { PUBLIC_FEATURE_LINKS, PUBLIC_HOME_FAQ_ITEMS, PUBLIC_SITE_PATHS } from '../lib/public-site';

describe('LandingPage', () => {
  it('renders primary public sections and in-page anchors', () => {
    const markup = renderToStaticMarkup(<LandingPage onNavigateToLogin={() => undefined} />);

    expect(markup).toContain('Tarjouslaskentaohjelma rakennusalan yrityksille');
    expect(markup).toContain(`href="${PUBLIC_SITE_PATHS.demo}"`);
    expect(markup).toContain(`href="${PUBLIC_SITE_PATHS.login}"`);

    expect(markup).toContain('href="#tyotila"');
    expect(markup).toContain('id="tyotila"');
    expect(markup).toContain('id="ratkaisu"');
    expect(markup).toContain('id="miten-se-toimii"');
    expect(markup).toContain('id="kenelle"');
    expect(markup).toContain('id="faq"');
  });

  it('renders all workspace tabs and panel content in static markup', () => {
    const markup = renderToStaticMarkup(<LandingPage onNavigateToLogin={() => undefined} />);

    expect(markup).toContain('Tarjouseditori');
    expect(markup).toContain('Tarjouspyynnöt');
    expect(markup).toContain('Kateohjaus');
    expect(markup).toContain('Projektiseuranta');

    expect(markup).toContain('Tarjous, rivit ja versiot samassa editorissa');
    expect(markup).toContain('Tarjouspyyntö samaan työtilaan ennen hintapäätöstä');
    expect(markup).toContain('Kate näkyy ennen päätöstä — ei projektin aikana');
    expect(markup).toContain('Hyväksytty tarjous jatkuu projektiksi ilman katkoa');
  });

  it('keeps public feature links and FAQ entries crawlable', () => {
    const markup = renderToStaticMarkup(<LandingPage onNavigateToLogin={() => undefined} />);

    expect(markup).toContain(PUBLIC_FEATURE_LINKS.tarjouseditori);
    expect(markup).toContain(PUBLIC_FEATURE_LINKS.tarjouspyynnot);
    expect(markup).toContain(PUBLIC_FEATURE_LINKS.kateohjaus);
    expect(markup).toContain(PUBLIC_FEATURE_LINKS.projektiseuranta);

    expect(markup).toContain(PUBLIC_HOME_FAQ_ITEMS[0].question);
    expect(markup).toContain(PUBLIC_HOME_FAQ_ITEMS[PUBLIC_HOME_FAQ_ITEMS.length - 1].question);
  });
});
