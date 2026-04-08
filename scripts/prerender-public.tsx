import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PUBLIC_FEATURE_LINKS,
  PUBLIC_FOOTER_GROUPS,
  PUBLIC_HOME_FAQ_ITEMS,
  PUBLIC_HOME_TITLE,
  PUBLIC_MARKETING_PAGES,
  PUBLIC_PRIMARY_NAV_LINKS,
  PUBLIC_SITE_PATHS,
  type PublicMarketingPageDefinition,
  type PublicSiteLink,
} from '../src/lib/public-site';
import { APP_CANONICAL_URL, APP_MARKETING_META_DESCRIPTION, APP_NAME, APP_SUPPORT_EMAIL, buildCanonicalUrl } from '../src/lib/site-brand';

interface StaticPage {
  path: string;
  title: string;
  description: string;
  markup: string;
}

interface HomeCard {
  title: string;
  text: string;
  href?: string;
  linkLabel?: string;
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const distDirectory = path.resolve(currentDirectory, '../dist');
const templatePath = path.join(distDirectory, 'index.html');

const legalLinks: PublicSiteLink[] = [
  { label: 'Kayttoehdot', href: '/kayttoehdot' },
  { label: 'Tietosuojaseloste', href: '/tietosuoja' },
  { label: 'Tietojenkasittelyliite', href: '/tietojenkasittely' },
  { label: 'Evasteet', href: '/evasteet' },
];

const homeHighlights = [
  'Tarjouseditori yrityskayttoon',
  'Tarjouspyyntojen katselmointi',
  'Kateohjaus ennen paatosta',
  'Projektiseuranta ja PDF- ja Excel-viennit',
];

const homePainPoints = [
  'Tarjousversiot hajaantuvat kansioihin, sahkoposteihin ja tyopoydille.',
  'Hinnat, lisakulut ja huomiot elavat erikseen Excelissa, PDF:issa ja muistiinpanoissa.',
  'Tarjouspyynnon katselmointi jaa irrallisiksi huomioiksi eika osaksi samaa tyotilaa.',
  'Kate tarkistetaan liian myohaan tai vain osittaisen tiedon perusteella.',
  'Hyvaksytyn tarjouksen tieto katkeaa juuri siina kohdassa, jossa tyo pitaisi kaynnistaa.',
];

const homeOutcomes = [
  'Tarjouslaskenta, tarjouseditori ja versiot pysyvat samassa tyotilassa.',
  'Tarjouspyynnon dokumentit, havainnot ja siirtopolku voidaan katselmoida hallitusti.',
  'Kate, lisakulut ja loppusumma ovat nakyvissa ennen lahetyspaatosta.',
  'Hyvaksytty tarjous voi jatkua projektiksi ja laskutuksen viitepisteeksi ilman kasityota.',
  'PDF- ja Excel-viennit syntyvat ohjelmistosta, eivat erillisesta tiedostoketjusta.',
];

const homeFeatureCards: HomeCard[] = [
  {
    title: 'Tarjouseditori',
    text: 'Muokkaa tarjousta samassa editorissa, jossa rivit, vaihtoehdot, kohdetieto ja versiot pysyvat luettavina.',
    href: PUBLIC_FEATURE_LINKS.tarjouseditori,
    linkLabel: 'Tutustu tarjouseditoriin',
  },
  {
    title: 'Tarjouspyyntojen katselmointi',
    text: 'Kokoa tarjouspyyntopaketti, nosta havainnot ja siirra valmisteltu sisalto hallitusti tarjouksen pohjaksi.',
    href: PUBLIC_FEATURE_LINKS.tarjouspyynnot,
    linkLabel: 'Katso tarjouspyyntojen katselmointi',
  },
  {
    title: 'Kateohjaus',
    text: 'Pida marginaali, lisakulut ja loppusumma nakyvissa siella, missa lahetyspaatos tehdaan.',
    href: PUBLIC_FEATURE_LINKS.kateohjaus,
    linkLabel: 'Nae kateohjaus',
  },
  {
    title: 'Projektiseuranta',
    text: 'Jatka hyvaksytty tarjous samasta lahtotiedosta ilman kasin tehtavaa siivousta.',
    href: PUBLIC_FEATURE_LINKS.projektiseuranta,
    linkLabel: 'Tutustu projektiseurantaan',
  },
  {
    title: 'PDF- ja Excel-viennit',
    text: 'Vie tarjous ulos oikeassa muodossa ilman etta koko prosessi asuu export-tiedostoissa.',
    href: PUBLIC_FEATURE_LINKS.exports,
    linkLabel: 'Katso PDF- ja Excel-viennit',
  },
  {
    title: 'Raportointi ja johdon nakyvyys',
    text: 'Nosta myynnin, laskennan ja projektivastuun yhteinen tilannekuva samasta tietopohjasta.',
    href: PUBLIC_SITE_PATHS.features,
    linkLabel: 'Tutustu ominaisuuksiin',
  },
];

const homeProcess = [
  {
    title: 'Kokoa tarjous ja lahtotiedot',
    text: 'Tuo kohde, asiakkaan tiedot, tarjouspyynto ja tarjouksen lahtorivit samaan tyotilaan heti alussa.',
  },
  {
    title: 'Muokkaa ja tarkista tarjous',
    text: 'Tarjouseditori, katselmointi ja kateohjaus pitavat sisallon, riskit ja lahetyspaatoksen samassa nakymassa.',
  },
  {
    title: 'Seuraa katetta ja vie dokumentit ulos',
    text: 'Hyvaksytty tarjous voi jatkua projektin lahtotiedoksi ja tiedot voidaan vieda PDF- ja Excel-muotoon oikeassa kohdassa.',
  },
];

const homeAudience = [
  'Rakennusalan yritykset',
  'Urakoitsijat',
  'Talotekniikka',
  'Remontointi',
  'Tarjouksia laativat tiimit',
  'Projektimyyntia tekevat yritykset',
];

const homeDestinationLinks: PublicSiteLink[] = [
  { label: 'Tutustu tarjouseditoriin', href: PUBLIC_FEATURE_LINKS.tarjouseditori },
  { label: 'Katso hinnat ja kayttoonotto', href: PUBLIC_SITE_PATHS.pricing },
  { label: 'Nae miten Projekta sopii rakennusalalle', href: PUBLIC_SITE_PATHS.industry },
  { label: 'Lue opas tarjouslaskentaan', href: PUBLIC_SITE_PATHS.guide },
  { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
  { label: 'Avaa yhteystiedot', href: PUBLIC_SITE_PATHS.contact },
];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function upsertTag(html: string, matcher: RegExp, tag: string) {
  if (matcher.test(html)) {
    return html.replace(matcher, tag);
  }

  return html.replace('</head>', `  ${tag}\n</head>`);
}

function replaceRootMarkup(html: string, markup: string) {
  const marker = '<div id="root"></div>';

  if (html.includes(marker)) {
    return html.replace(marker, `<div id="root">${markup}</div>`);
  }

  throw new Error('Could not locate the root container inside dist/index.html.');
}

function applyPageMetadata(html: string, page: Pick<StaticPage, 'path' | 'title' | 'description'>) {
  const canonicalUrl = buildCanonicalUrl(page.path, { siteUrl: APP_CANONICAL_URL });
  const escapedTitle = escapeHtml(page.title);
  const escapedDescription = escapeHtml(page.description);
  const escapedCanonicalUrl = escapeHtml(canonicalUrl);

  let nextHtml = html;
  nextHtml = upsertTag(nextHtml, /<title>.*?<\/title>/is, `<title>${escapedTitle}</title>`);
  nextHtml = upsertTag(nextHtml, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapedDescription}" />`);
  nextHtml = upsertTag(nextHtml, /<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="index,follow" />');
  nextHtml = upsertTag(nextHtml, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapedCanonicalUrl}" />`);
  nextHtml = upsertTag(nextHtml, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapedTitle}" />`);
  nextHtml = upsertTag(nextHtml, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapedDescription}" />`);
  nextHtml = upsertTag(nextHtml, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${escapedCanonicalUrl}" />`);
  nextHtml = upsertTag(nextHtml, /<meta\s+property=["']og:type["'][^>]*>/i, '<meta property="og:type" content="website" />');
  nextHtml = upsertTag(nextHtml, /<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${escapedTitle}" />`);
  nextHtml = upsertTag(nextHtml, /<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${escapedDescription}" />`);
  nextHtml = upsertTag(nextHtml, /<meta\s+name=["']twitter:card["'][^>]*>/i, '<meta name="twitter:card" content="summary_large_image" />');

  return nextHtml;
}

function resolveOutputPath(routePath: string) {
  if (routePath === PUBLIC_SITE_PATHS.home) {
    return path.join(distDirectory, 'index.html');
  }

  return path.join(distDirectory, routePath.replace(/^\//, ''), 'index.html');
}

function renderLink(link: PublicSiteLink, currentPath?: string) {
  const isActive = currentPath ? currentPath === link.href : false;
  return `<a href="${escapeHtml(link.href)}"${isActive ? ' aria-current="page"' : ''} style="color:${isActive ? '#0f172a' : '#334155'};font-weight:${isActive ? '700' : '500'};text-decoration:none;">${escapeHtml(link.label)}</a>`;
}

function renderList(items: string[], accentColor: string) {
  return `<ul style="margin:0;padding-left:1.25rem;color:#334155;line-height:1.8;">${items
    .map((item) => `<li style="margin:0.35rem 0;"><span style="color:${accentColor};">•</span> ${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
}

function renderHeader(currentPath: string) {
  return [
    '<header style="position:sticky;top:0;z-index:10;background:#f8fafc;border-bottom:1px solid #e2e8f0;">',
    '  <div style="max-width:1100px;margin:0 auto;padding:18px 24px;display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap;">',
    `    <a href="/" style="font-size:1.1rem;font-weight:700;color:#0f172a;text-decoration:none;">${escapeHtml(APP_NAME)}</a>`,
    `    <nav style="display:flex;gap:16px;flex-wrap:wrap;">${PUBLIC_PRIMARY_NAV_LINKS.map((link) => renderLink(link, currentPath)).join('')}</nav>`,
    '    <div style="display:flex;gap:12px;flex-wrap:wrap;">',
    `      <a href="${escapeHtml(PUBLIC_SITE_PATHS.demo)}" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:999px;color:#0f172a;text-decoration:none;font-weight:600;background:#ffffff;">Pyydä demo</a>`,
    `      <a href="${escapeHtml(PUBLIC_SITE_PATHS.login)}" style="padding:10px 16px;border-radius:999px;color:#ffffff;text-decoration:none;font-weight:600;background:#0f172a;">Kirjaudu sisaan</a>`,
    '    </div>',
    '  </div>',
    '</header>',
  ].join('');
}

function renderFooter() {
  return [
    '<footer style="border-top:1px solid #e2e8f0;background:#ffffff;">',
    '  <div style="max-width:1100px;margin:0 auto;padding:40px 24px;display:grid;gap:32px;">',
    '    <div>',
    `      <div style="font-size:1.1rem;font-weight:700;color:#0f172a;">${escapeHtml(APP_NAME)}</div>`,
    '      <p style="max-width:760px;margin:12px 0 0;color:#475569;line-height:1.8;">Projekta on tarjouslaskentaohjelma rakennusalan yrityksille. Se kokoaa tarjouseditorin, tarjouspyyntojen katselmoinnin, kateohjauksen, projektiseurannan seka PDF- ja Excel-viennit samaan hallittuun tyotilaan.</p>',
    `      <p style="margin:12px 0 0;color:#475569;line-height:1.8;">Yhteys: <a href="mailto:${escapeHtml(APP_SUPPORT_EMAIL)}">${escapeHtml(APP_SUPPORT_EMAIL)}</a></p>`,
    `      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">${legalLinks.map((link) => renderLink(link)).join('')}</div>`,
    '    </div>',
    '    <div style="display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">',
    ...PUBLIC_FOOTER_GROUPS.map(
      (group) =>
        `      <section><div style="font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${escapeHtml(group.title)}</div><div style="margin-top:12px;display:grid;gap:10px;">${group.links.map((link) => renderLink(link)).join('')}</div></section>`
    ),
    '    </div>',
    '  </div>',
    '</footer>',
  ].join('');
}

function renderCardGrid(cards: string[]) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;">${cards.join('')}</div>`;
}

function renderHomeMarkup() {
  const highlightMarkup = renderCardGrid(
    homeHighlights.map(
      (item) =>
        `<article style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(15,23,42,0.08);"><h2 style="margin:0 0 10px;font-size:1.05rem;color:#0f172a;">${escapeHtml(item)}</h2></article>`
    )
  );

  const featureMarkup = renderCardGrid(
    homeFeatureCards.map(
      (card) =>
        `<article style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,0.08);"><h3 style="margin:0 0 10px;font-size:1.05rem;color:#0f172a;">${escapeHtml(card.title)}</h3><p style="margin:0;color:#475569;line-height:1.8;">${escapeHtml(card.text)}</p>${card.href && card.linkLabel ? `<p style="margin:14px 0 0;"><a href="${escapeHtml(card.href)}">${escapeHtml(card.linkLabel)}</a></p>` : ''}</article>`
    )
  );

  const processMarkup = renderCardGrid(
    homeProcess.map(
      (step, index) =>
        `<article style="background:#0f172a;color:#ffffff;border-radius:20px;padding:22px;"><div style="font-size:0.8rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">Vaihe 0${index + 1}</div><h3 style="margin:12px 0 10px;font-size:1.05rem;">${escapeHtml(step.title)}</h3><p style="margin:0;color:#cbd5e1;line-height:1.8;">${escapeHtml(step.text)}</p></article>`
    )
  );

  const faqMarkup = PUBLIC_HOME_FAQ_ITEMS.map(
    (item) =>
      `<details style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;"><summary style="font-weight:700;color:#0f172a;cursor:pointer;">${escapeHtml(item.question)}</summary><p style="margin:12px 0 0;color:#475569;line-height:1.8;">${escapeHtml(item.answer)}</p></details>`
  ).join('');

  return [
    '<div data-prerender-page="home" style="font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#f8fafc;color:#0f172a;">',
    renderHeader(PUBLIC_SITE_PATHS.home),
    '  <main>',
    '    <section style="padding:56px 24px 32px;">',
    '      <div style="max-width:1100px;margin:0 auto;display:grid;gap:24px;">',
    '        <div>',
    '          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#ffffff;border:1px solid #cbd5e1;font-size:0.78rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#334155;">Projekta tarjouslaskentaohjelma rakennusalalle</div>',
    '          <h1 style="margin:18px 0 0;font-size:3rem;line-height:1.05;max-width:900px;">Tarjouslaskentaohjelma rakennusalan yrityksille</h1>',
    '          <p style="max-width:820px;margin:18px 0 0;color:#475569;font-size:1.1rem;line-height:1.9;">Projekta on yrityskayttoon tehty ohjelmisto, jossa tarjouseditori, tarjouspyyntojen katselmointi, kateohjaus, projektiseuranta seka PDF- ja Excel-viennit kuuluvat samaan tyotilaan. Tarjous ei jaa irralliseksi dokumentiksi eika tieto ela erikseen Excelissa, PDF:issa ja muistiinpanoissa.</p>',
    '          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px;">',
    `            <a href="${escapeHtml(PUBLIC_SITE_PATHS.demo)}" style="padding:12px 18px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Pyydä demo</a>`,
    `            <a href="${escapeHtml(PUBLIC_FEATURE_LINKS.tarjouseditori)}" style="padding:12px 18px;border-radius:999px;background:#ffffff;color:#0f172a;text-decoration:none;font-weight:700;border:1px solid #cbd5e1;">Tutustu tarjouseditoriin</a>`,
    `            <a href="#miten-se-toimii" style="padding:12px 18px;border-radius:999px;background:#e2e8f0;color:#0f172a;text-decoration:none;font-weight:700;">Katso miten se toimii</a>`,
    '          </div>',
    `          <p style="margin:18px 0 0;color:#475569;line-height:1.8;">Nykyinen kayttaja? <a href="${escapeHtml(PUBLIC_SITE_PATHS.login)}">Kirjaudu sisaan tyotilaan.</a></p>`,
    '          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">',
    '            <a href="#tyotila">Tarjouseditori</a>',
    '            <a href="#ratkaisu">Miksi vaihtaa Excelista</a>',
    '            <a href="#miten-se-toimii">Nain Projekta toimii</a>',
    '            <a href="#faq">FAQ</a>',
    '          </div>',
    '        </div>',
    `        ${highlightMarkup}`,
    '      </div>',
    '    </section>',
    '    <section id="ratkaisu" style="padding:24px 24px 48px;">',
    '      <div style="max-width:1100px;margin:0 auto;display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">',
    '        <article style="background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:24px;">',
    '          <h2 style="margin:0 0 12px;font-size:1.7rem;">Miksi Excel-, PDF- ja sahkopostipohjainen tarjouslaskenta hidastaa rakennusalan tyota</h2>',
    '          <p style="margin:0;color:#7c2d12;line-height:1.8;">Tarjous on tyon kaynnistymisen kriittinen paatospiste. Jos tieto ela eri kansioissa, eri laskelmissa ja eri ihmisilla, ongelma ei ole vain hitaus vaan myos se, etta tarjous, kate ja projektin lahtotieto eivat kohtaa samassa paatoshetkessa.</p>',
    '        </article>',
    `        <article style="background:#fff1f2;border:1px solid #fecdd3;border-radius:20px;padding:24px;"><h3 style="margin:0 0 12px;">Hajanaisessa mallissa</h3>${renderList(homePainPoints, '#e11d48')}</article>`,
    `        <article style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:24px;"><h3 style="margin:0 0 12px;">Projektalla tarjous pysyy ohjelmistossa</h3>${renderList(homeOutcomes, '#059669')}</article>`,
    '      </div>',
    '    </section>',
    '    <section id="tyotila" style="padding:0 24px 48px;">',
    '      <div style="max-width:1100px;margin:0 auto;">',
    '        <h2 style="font-size:2rem;margin:0 0 12px;">Tarjouseditori, tarjouspyyntojen katselmointi, kateohjaus, projektiseuranta ja PDF- ja Excel-viennit</h2>',
    '        <p style="margin:0 0 24px;color:#475569;line-height:1.8;max-width:900px;">Projekta ei yrita piilottaa toimintaa geneerisen tyotilapuheen taakse. Alla ovat ne kokonaisuudet, joilla rakennusalan tarjouslaskentaohjelma ratkaisee arjen kaytannon tyon.</p>',
    `        ${featureMarkup}`,
    '      </div>',
    '    </section>',
    '    <section id="miten-se-toimii" style="padding:0 24px 48px;">',
    '      <div style="max-width:1100px;margin:0 auto;">',
    '        <h2 style="font-size:2rem;margin:0 0 12px;">Kolme vaihetta, joilla tarjous pysyy hallittuna koko matkalla</h2>',
    '        <p style="margin:0 0 24px;color:#475569;line-height:1.8;max-width:900px;">Kun etsit tarjouslaskentaohjelmaa rakennusalan yrityksille, tarkeinta ei ole yksi nayttava nakyma vaan se, etta kayttopolku kestaa tarjouspyynnosta ulos vietavaan dokumenttiin ja projektin alkuun asti.</p>',
    `        ${processMarkup}`,
    '      </div>',
    '    </section>',
    '    <section id="kenelle" style="padding:0 24px 48px;">',
    '      <div style="max-width:1100px;margin:0 auto;">',
    '        <h2 style="font-size:2rem;margin:0 0 12px;">Kenelle Projekta sopii</h2>',
    '        <p style="margin:0 0 20px;color:#475569;line-height:1.8;max-width:900px;">Projekta on tehty yrityksille, joille tarjous ei ole hallinnollinen liite vaan liiketoiminnan, katteen ja projektin kaynnistymisen ohjauspiste.</p>',
    `        <div style="display:flex;gap:10px;flex-wrap:wrap;">${homeAudience.map((item) => `<span style="padding:10px 14px;border:1px solid #cbd5e1;border-radius:999px;background:#ffffff;color:#334155;font-weight:600;">${escapeHtml(item)}</span>`).join('')}</div>`,
    '      </div>',
    '    </section>',
    '    <section style="padding:0 24px 48px;">',
    '      <div style="max-width:1100px;margin:0 auto;">',
    '        <h2 style="font-size:2rem;margin:0 0 12px;">Jatka siita sisallosta, joka vastaa omaa hakuintenttiasi</h2>',
    '        <p style="margin:0 0 20px;color:#475569;line-height:1.8;max-width:900px;">Etusivun ei tarvitse kantaa koko domainin nakyvyytta yksin. Siksi tarkeimmille kaupallisille ja sisallollisille aiheille on omat crawlattavat sivut.</p>',
    `        <div style="display:flex;gap:12px;flex-wrap:wrap;">${homeDestinationLinks.map((link) => renderLink(link)).join('')}</div>`,
    '      </div>',
    '    </section>',
    '    <section id="faq" style="padding:0 24px 56px;">',
    '      <div style="max-width:1100px;margin:0 auto;display:grid;gap:24px;">',
    '        <div>',
    '          <h2 style="font-size:2rem;margin:0 0 12px;">Usein kysyttya tarjouslaskentaohjelmasta rakennusalalle</h2>',
    '          <p style="margin:0;color:#475569;line-height:1.8;max-width:900px;">FAQ toimii seka ostamisen etta hakukoneen nakokulmasta vain silloin, kun kysymykset ovat oikeita eika keinotekoisesti keksittyja SEO-otsikoita.</p>',
    '        </div>',
    `        <div style="display:grid;gap:12px;">${faqMarkup}</div>`,
    '      </div>',
    '    </section>',
    '  </main>',
    renderFooter(),
    '</div>',
  ].join('');
}

function renderMarketingMarkup(page: PublicMarketingPageDefinition) {
  const trustMarkup = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">${page.trustPoints
    .map((point) => `<span style="padding:8px 12px;border-radius:999px;background:#ffffff;border:1px solid #cbd5e1;color:#334155;font-weight:600;">${escapeHtml(point)}</span>`)
    .join('')}</div>`;

  const sectionMarkup = page.sections
    .map((section) => {
      const paragraphs = section.body
        .map((paragraph) => `<p style="margin:12px 0 0;color:#475569;line-height:1.8;">${escapeHtml(paragraph)}</p>`)
        .join('');
      const bullets = section.bullets ? `<div style="margin-top:14px;">${renderList(section.bullets, '#0f172a')}</div>` : '';
      const links = section.links
        ? `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">${section.links.map((link) => renderLink(link)).join('')}</div>`
        : '';

      return `<article id="${escapeHtml(section.id || '')}" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08);"><h2 style="margin:0;font-size:1.45rem;color:#0f172a;">${escapeHtml(section.title)}</h2>${paragraphs}${bullets}${links}</article>`;
    })
    .join('');

  return [
    `<div data-prerender-page="${escapeHtml(page.key)}" style="font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#f8fafc;color:#0f172a;">`,
    renderHeader(page.path),
    '  <main>',
    '    <section style="padding:56px 24px 32px;">',
    '      <div style="max-width:1100px;margin:0 auto;">',
    `        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#ffffff;border:1px solid #cbd5e1;font-size:0.78rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#334155;">${escapeHtml(page.eyebrow)}</div>`,
    `        <h1 style="margin:18px 0 0;font-size:3rem;line-height:1.05;max-width:900px;">${escapeHtml(page.h1)}</h1>`,
    `        <p style="max-width:820px;margin:18px 0 0;color:#475569;font-size:1.1rem;line-height:1.9;">${escapeHtml(page.intro)}</p>`,
    '        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px;">',
    `          <a href="${escapeHtml(page.primaryCta.href)}" style="padding:12px 18px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(page.primaryCta.label)}</a>`,
    `          <a href="${escapeHtml(page.secondaryCta.href)}" style="padding:12px 18px;border-radius:999px;background:#ffffff;color:#0f172a;text-decoration:none;font-weight:700;border:1px solid #cbd5e1;">${escapeHtml(page.secondaryCta.label)}</a>`,
    '        </div>',
    `        ${trustMarkup}`,
    '      </div>',
    '    </section>',
    '    <section style="padding:0 24px 56px;">',
    `      <div style="max-width:1100px;margin:0 auto;display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">${sectionMarkup}</div>`,
    '    </section>',
    '  </main>',
    renderFooter(),
    '</div>',
  ].join('');
}

async function writeStaticPage(templateHtml: string, page: StaticPage) {
  const routeHtml = replaceRootMarkup(templateHtml, page.markup);
  const withMetadata = applyPageMetadata(routeHtml, page);
  const outputPath = resolveOutputPath(page.path);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, withMetadata, 'utf8');
}

function buildSitemapXml(routes: string[]) {
  const lastModified = new Date().toISOString().split('T')[0];
  const urlEntries = routes
    .map((routePath) => {
      const location = buildCanonicalUrl(routePath, { siteUrl: APP_CANONICAL_URL });
      return [
        '  <url>',
        `    <loc>${escapeHtml(location)}</loc>`,
        `    <lastmod>${lastModified}</lastmod>`,
        `    <changefreq>${routePath === PUBLIC_SITE_PATHS.home ? 'weekly' : 'monthly'}</changefreq>`,
        `    <priority>${routePath === PUBLIC_SITE_PATHS.home ? '1.0' : '0.8'}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', urlEntries, '</urlset>', ''].join('\n');
}

function buildRobotsTxt() {
  const sitemapUrl = buildCanonicalUrl('/sitemap.xml', { siteUrl: APP_CANONICAL_URL });

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /login',
    'Disallow: /auth/',
    'Disallow: /app/',
    'Disallow: /dashboard',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');
}

async function main() {
  const templateHtml = await readFile(templatePath, 'utf8');

  const pages: StaticPage[] = [
    {
      path: PUBLIC_SITE_PATHS.home,
      title: PUBLIC_HOME_TITLE,
      description: APP_MARKETING_META_DESCRIPTION,
      markup: renderHomeMarkup(),
    },
    ...PUBLIC_MARKETING_PAGES.map((page) => ({
      path: page.path,
      title: page.title,
      description: page.metaDescription,
      markup: renderMarketingMarkup(page),
    })),
  ];

  for (const page of pages) {
    await writeStaticPage(templateHtml, page);
  }

  const sitemapXml = buildSitemapXml(pages.map((page) => page.path));
  await writeFile(path.join(distDirectory, 'sitemap.xml'), sitemapXml, 'utf8');
  await writeFile(path.join(distDirectory, 'robots.txt'), buildRobotsTxt(), 'utf8');
}

void main();
