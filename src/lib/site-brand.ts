import type { AppPage } from './app-routing';

export const APP_NAME = 'Projekta';
export const APP_OPERATOR_NAME = 'Jetnev Oy';
export const APP_DOMAIN = 'projekta.fi';
export const APP_SUPPORT_EMAIL = 'myynti@projekta.fi';
export const APP_CANONICAL_URL = `https://${APP_DOMAIN}`;
export const APP_DEFAULT_UPDATE_FEED_URL = `${APP_CANONICAL_URL}/`;

export const APP_META_DESCRIPTION =
  'Projekta on tarjouslaskennan ja projektiseurannan jarjestelma rakennusalan yrityksille.';

export const APP_MARKETING_META_DESCRIPTION =
  'Projekta on rakennusalan yrityksille suunniteltu jarjestelma, joka kokoaa tarjouslaskennan, kateohjauksen, projektiseurannan ja tarjouspyyntojen katselmoinnin yhteen hallittuun tyotilaan.';

export const APP_LOGIN_META_DESCRIPTION =
  'Kirjaudu Projekta-tyotilaan hallitsemaan tarjouksia, tuotteita ja projekteja samassa jarjestelmassa.';

export const APP_AUTH_CALLBACK_META_DESCRIPTION =
  'Vahvista sahkopostiosoite tai vaihda salasana Projektan turvallisen auth-callback-reitin kautta.';

const WORKSPACE_PAGE_DESCRIPTIONS: Record<AppPage, string> = {
  dashboard: 'Seuraa tarjousten, projektien ja avainlukujen tilannetta yhdesta Projekta-nakymasta.',
  help: 'FAQ ja kaytto-ohjeet: aloita nopeasti, ratkaise yleisimmat tilanteet ja etene ilman erillista opastusta.',
  projects: 'Hallitse asiakkaita, projekteja, tarjouksia ja etenemista Projekta-tyotilassa.',
  'tender-intelligence': 'Rakenna tarjouspyyntopaketeille oma analyysi- ja katselmointivalmis foundation Projektassa.',
  invoices: 'Seuraa laskuja, laskutustilanteita ja projektikohtaista toteumaa Projekta-tyotilassa.',
  products: 'Yllapida tuotekatalogia, hinnoittelua ja tuotekuvauksia Projekta-jarjestelmassa.',
  'installation-groups': 'Hallinnoi hintaryhmia ja asennuslogiikkaa Projekta-jarjestelmassa.',
  substitutes: 'Maarita korvaavat tuotteet ja niiden ohjaus Projektan tuotekannassa.',
  terms: 'Muokkaa tarjousehtoja ja vakiosisaltoja Projektan yhteisessa tyotilassa.',
  reports: 'Tarkastele myyntia, katetta ja projektien kehitysta Projektan raportoinnissa.',
  users: 'Hallinnoi kayttajia, rooleja ja tyotilan paasyja Projekta-palvelussa.',
  settings: 'Paivita Projekta-tyotilan yhteiset oletusarvot, yritystiedot ja paivitysasetukset.',
  legal: 'Yllapida Projektan juridisia dokumentteja ja hyvaksymisprosessia.',
  account: 'Paivita oma profiilisi, sahkopostisi ja salasanasi Projekta-palvelussa.',
};

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function resolveBaseUrl(configuredUrl?: string | null, fallbackOrigin = APP_CANONICAL_URL) {
  const baseUrl = new URL(configuredUrl?.trim() || fallbackOrigin, fallbackOrigin);
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl;
}

export function buildDocumentTitle(section?: string | null) {
  const normalizedSection = section?.trim();
  return normalizedSection ? `${normalizedSection} | ${APP_NAME}` : APP_NAME;
}

export function buildCanonicalUrl(pathname = '/', options?: { siteUrl?: string | null }) {
  const baseUrl = resolveBaseUrl(options?.siteUrl, APP_CANONICAL_URL);
  baseUrl.pathname = normalizePathname(pathname);
  return baseUrl.toString();
}

export function resolveSiteUrl(configuredUrl?: string | null, currentOrigin?: string) {
  const baseUrl = resolveBaseUrl(configuredUrl, currentOrigin?.trim() || APP_CANONICAL_URL);
  baseUrl.pathname = '/';
  return baseUrl.toString();
}

export function buildDemoMailtoUrl() {
  return `mailto:${APP_SUPPORT_EMAIL}?subject=${encodeURIComponent(`Pyydä esittely ${APP_NAME}-palvelusta`)}`;
}

export function getWorkspacePageDescription(page: AppPage) {
  return WORKSPACE_PAGE_DESCRIPTIONS[page] || APP_META_DESCRIPTION;
}

export function buildPublicLegalDescription(documentLabel: string) {
  return `${documentLabel} on luettavissa julkisessa ${APP_NAME}-dokumenttinakymassa ilman kirjautumista.`;
}