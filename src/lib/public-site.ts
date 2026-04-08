import { APP_CANONICAL_URL, APP_MARKETING_META_DESCRIPTION, APP_NAME, APP_SUPPORT_EMAIL } from './site-brand';

export interface PublicSiteLink {
  label: string;
  href: string;
  description?: string;
}

export interface PublicFooterGroup {
  title: string;
  links: PublicSiteLink[];
}

export interface PublicFaqItem {
  question: string;
  answer: string;
}

export interface PublicMarketingSection {
  id?: string;
  title: string;
  body: string[];
  bullets?: string[];
  links?: PublicSiteLink[];
}

export interface PublicMarketingPageDefinition {
  key: 'features' | 'pricing' | 'industry' | 'guide' | 'demo' | 'contact';
  path: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  trustPoints: string[];
  primaryCta: PublicSiteLink;
  secondaryCta: PublicSiteLink;
  sections: PublicMarketingSection[];
}

export const PUBLIC_SITE_PATHS = {
  home: '/',
  features: '/ominaisuudet',
  pricing: '/hinnat',
  industry: '/rakennusala',
  guide: '/opas',
  demo: '/demo',
  contact: '/yhteystiedot',
  login: '/login',
} as const;

export const PUBLIC_FEATURE_LINKS = {
  tarjouseditori: `${PUBLIC_SITE_PATHS.features}#tarjouseditori`,
  tarjouspyynnot: `${PUBLIC_SITE_PATHS.features}#tarjouspyyntojen-katselmointi`,
  kateohjaus: `${PUBLIC_SITE_PATHS.features}#kateohjaus`,
  projektiseuranta: `${PUBLIC_SITE_PATHS.features}#projektiseuranta`,
  exports: `${PUBLIC_SITE_PATHS.features}#pdf-ja-excel-viennit`,
} as const;

export const PUBLIC_HOME_TITLE = `${APP_NAME} | Tarjouslaskentaohjelma rakennusalan yrityksille`;

export const PUBLIC_PRIMARY_NAV_LINKS: PublicSiteLink[] = [
  {
    label: 'Ominaisuudet',
    href: PUBLIC_SITE_PATHS.features,
    description: 'Tarjouseditori, kateohjaus, projektiseuranta ja viennit.',
  },
  {
    label: 'Rakennusala',
    href: PUBLIC_SITE_PATHS.industry,
    description: 'Kenelle Projekta sopii rakennusalalla.',
  },
  {
    label: 'Hinnat',
    href: PUBLIC_SITE_PATHS.pricing,
    description: 'Miten kaupallinen malli ja käyttöönotto käydään läpi.',
  },
  {
    label: 'Opas',
    href: PUBLIC_SITE_PATHS.guide,
    description: 'Sisältöä tarjouslaskennan ja projektin hallinnan tueksi.',
  },
  {
    label: 'Yhteystiedot',
    href: PUBLIC_SITE_PATHS.contact,
    description: 'Demo ja yhteydenotto tarjouslaskentaohjelman arviointiin.',
  },
];

export const PUBLIC_FOOTER_GROUPS: PublicFooterGroup[] = [
  {
    title: 'Ominaisuudet',
    links: [
      { label: 'Tutustu tarjouseditoriin', href: PUBLIC_FEATURE_LINKS.tarjouseditori },
      { label: 'Katso tarjouspyyntöjen katselmointi', href: PUBLIC_FEATURE_LINKS.tarjouspyynnot },
      { label: 'Näe kateohjaus', href: PUBLIC_FEATURE_LINKS.kateohjaus },
      { label: 'Tutustu projektiseurantaan', href: PUBLIC_FEATURE_LINKS.projektiseuranta },
      { label: 'Katso PDF- ja Excel-viennit', href: PUBLIC_FEATURE_LINKS.exports },
    ],
  },
  {
    title: 'Hinnat ja demo',
    links: [
      { label: 'Katso hinnat ja käyttöönotto', href: PUBLIC_SITE_PATHS.pricing },
      { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
      { label: 'Ota yhteyttä', href: PUBLIC_SITE_PATHS.contact },
    ],
  },
  {
    title: 'Rakennusala',
    links: [
      { label: 'Näe miten Projekta sopii rakennusalalle', href: PUBLIC_SITE_PATHS.industry },
      { label: 'Kenelle Projekta sopii', href: `${PUBLIC_SITE_PATHS.home}#kenelle` },
      { label: 'Katso miten Projekta toimii', href: `${PUBLIC_SITE_PATHS.home}#miten-se-toimii` },
    ],
  },
  {
    title: 'Opas ja sisällöt',
    links: [
      { label: 'Lue opas tarjouslaskentaan', href: PUBLIC_SITE_PATHS.guide },
      { label: 'Palaa etusivun FAQ-osioon', href: `${PUBLIC_SITE_PATHS.home}#faq` },
      { label: 'Palaa etusivun käyttöpolkuun', href: `${PUBLIC_SITE_PATHS.home}#miten-se-toimii` },
    ],
  },
  {
    title: 'Yhteystiedot',
    links: [
      { label: 'Avaa yhteystiedot', href: PUBLIC_SITE_PATHS.contact },
      { label: 'Pyydä demo sähköpostilla', href: PUBLIC_SITE_PATHS.demo },
      { label: APP_SUPPORT_EMAIL, href: `mailto:${APP_SUPPORT_EMAIL}` },
    ],
  },
];

export const PUBLIC_HOME_FAQ_ITEMS: PublicFaqItem[] = [
  {
    question: 'Mitä tarjouslaskentaohjelma tekee?',
    answer:
      'Tarjouslaskentaohjelma kokoaa tarjouksen lähtötiedot, rivit, versiot, kate- ja yhteenvetotiedot samaan työtilaan. Tavoite on, että tarjous voidaan valmistella, tarkistaa ja viedä ulos ilman että tieto hajoaa erillisiin Excel-tiedostoihin, PDF:iin ja muistiinpanoihin.',
  },
  {
    question: 'Kenelle Projekta sopii?',
    answer:
      'Projekta on tarkoitettu rakennusalan yrityksille, urakoitsijoille ja tiimeille, jotka laativat tarjouksia, tarkistavat katetta ja jatkavat hyväksytyn tarjouksen projektin lähtötiedoksi.',
  },
  {
    question: 'Voiko tiedot viedä PDF- ja Excel-muotoon?',
    answer:
      'Kyllä. Projektan kokonaisuuteen kuuluvat PDF- ja Excel-viennit, jotta tarjous voidaan jakaa ulos oikeassa muodossa ja sisäinen tarkistus voidaan tehdä ilman erillistä käsityötä.',
  },
  {
    question: 'Soveltuuko Projekta rakennusalalle?',
    answer:
      'Kyllä. Etusivun ja ominaisuussisällön koko intentti on rakennusalan tarjouslaskenta, kateohjaus ja projektiseuranta. Tämän takia myös sanasto, käyttöpolku ja julkinen viesti on rakennettu rakennusalan yrityskäyttöön.',
  },
  {
    question: 'Miten Projekta eroaa Excel-pohjaisesta tarjouslaskennasta?',
    answer:
      'Keskeinen ero on se, että tarjous ei jää irralliseksi tiedostoksi. Tarjouslaskenta, tarjouspyyntöjen katselmointi, kateohjaus, projektiseuranta ja viennit kuuluvat samaan ohjelmistoon, jolloin tieto ei elä erillään Excelissä, PDF:issä ja muistiinpanoissa.',
  },
];

export const PUBLIC_MARKETING_PAGES: PublicMarketingPageDefinition[] = [
  {
    key: 'features',
    path: PUBLIC_SITE_PATHS.features,
    title: `${APP_NAME} | Tarjouseditori, kateohjaus ja PDF- ja Excel-viennit`,
    metaDescription:
      'Tutustu Projektan ominaisuuksiin: tarjouseditori, tarjouspyyntöjen katselmointi, kateohjaus, projektiseuranta sekä PDF- ja Excel-viennit rakennusalan yrityksille.',
    eyebrow: 'Ominaisuudet',
    h1: 'Tarjouseditori, kateohjaus ja viennit samassa ohjelmistossa',
    intro:
      'Projektan ominaisuudet on rakennettu tilanteisiin, joissa tarjouslaskennan tieto ei saa hajota Exceliin, PDF:iin ja erillisiin muistiinpanoihin. Siksi tarjouksen muokkaus, katselmointi, kate ja viennit kuuluvat samaan kokonaisuuteen.',
    trustPoints: ['Tarjouseditori', 'Kateohjaus', 'Projektiseuranta', 'PDF- ja Excel-viennit'],
    primaryCta: { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
    secondaryCta: { label: 'Katso hinnat ja käyttöönotto', href: PUBLIC_SITE_PATHS.pricing },
    sections: [
      {
        id: 'tarjouseditori',
        title: 'Tarjouseditori rakennusalan tarjouslaskentaan',
        body: [
          'Tarjouseditori on paikka, jossa tarjousrivit, tuotteet, vaihtoehdot ja versiot pidetään hallittuna ilman että sama työ alkaa jokaisella kierroksella alusta.',
          'Kun tarjouseditori kuuluu samaan työtilaan kuin muu tarjouslaskenta, myös asiakkaan, kohteen ja sisäisen tarkistuksen tiedot pysyvät samassa ketjussa.',
        ],
        bullets: [
          'Tarjousrivit ja vaihtoehdot samassa kokonaisuudessa.',
          'Versiot pysyvät luettavina ilman tiedostokaaosta.',
          'Tarjous ei jää irralliseksi dokumentiksi.',
        ],
      },
      {
        id: 'tarjouspyyntojen-katselmointi',
        title: 'Tarjouspyyntöjen katselmointi ennen varsinaista tarjousta',
        body: [
          'Tarjouspyyntöjen katselmointi auttaa kokoamaan dokumentit, vaatimukset, riskit ja puuttuvat tiedot samaan työtilaan ennen varsinaista tarjousta.',
          'Tämä vähentää sitä riskiä, että tarjous valmistellaan hajanaisesta aineistosta tai että olennaiset huomiot jäävät vain sähköpostiketjuihin.',
        ],
        bullets: [
          'Tarjouspyyntöpaketin koonti samaan paikkaan.',
          'Vaatimukset, riskit ja evidenssi katselmoitavaksi.',
          'Hallittu siirto tarjousvalmisteluun.',
        ],
      },
      {
        id: 'kateohjaus',
        title: 'Kateohjaus ennen lähetyspäätöstä',
        body: [
          'Kateohjaus kuuluu tarjouslaskennan ytimeen silloin, kun lähetyspäätös pitää tehdä läpinäkyvän tiedon perusteella eikä vasta projektin aikana paljastuvien lukujen varassa.',
          'Projektassa lisäkulut, loppusumma ja kate voidaan tarkistaa samassa näkymässä, jossa tarjous muutenkin valmistellaan.',
        ],
        bullets: [
          'Kate näkyy ennen päätöstä.',
          'Lisäkulut ja yhteenveto pysyvät samassa työtilassa.',
          'Sisäinen tarkistus ei vaadi erillistä laskentatiedostoa.',
        ],
      },
      {
        id: 'projektiseuranta',
        title: 'Projektiseuranta samasta lähtötiedosta',
        body: [
          'Projektiseuranta hyötyy eniten siitä, että hyväksytty tarjous jatkuu samasta datasta eikä katoa uuden työvaiheen alussa toiseen tiedostoketjuun.',
          'Kun tarjous ja projekti kuuluvat samaan ohjelmistoon, kohdetieto, määräajat ja laskutuksen viitepiste voidaan pitää yhdessä.',
        ],
        bullets: [
          'Hyväksytty tarjous voi jatkua projektin lähtötietona.',
          'Deadline-seuranta liittyy samaan kokonaisuuteen.',
          'Snapshot-ajattelu tukee laskutuksen hallintaa.',
        ],
      },
      {
        id: 'pdf-ja-excel-viennit',
        title: 'PDF- ja Excel-viennit ilman erillistä tiedostoketjua',
        body: [
          'PDF- ja Excel-viennit ovat tärkeä osa käytännön tarjousprosessia, mutta niiden ei pitäisi olla varsinainen työtila. Projekta pitää lähdetiedon ohjelmistossa ja vie tarvittavat dokumentit ulos oikeassa muodossa.',
          'Tämä auttaa pitämään asiakkaalle lähtevän materiaalin ja sisäisen tarkistuksen samassa ohjatussa polussa.',
        ],
        bullets: [
          'Asiakasnäkyvä tarjous voidaan viedä ulos selkeässä muodossa.',
          'Sisäinen tarkistus ei jää pelkkien export-tiedostojen varaan.',
          'Excel palvelee vientiä, ei koko tarjousprosessin hallintaa.',
        ],
      },
    ],
  },
  {
    key: 'pricing',
    path: PUBLIC_SITE_PATHS.pricing,
    title: `${APP_NAME} | Hinnat ja käyttöönotto tarjouslaskentaohjelmalle`,
    metaDescription:
      'Katso miten Projektan hinnat ja käyttöönotto käydään läpi rakennusalan yrityksille. Arvioi tarjouslaskentaohjelman sopivuutta demossa ja yhteydenotossa.',
    eyebrow: 'Hinnat',
    h1: 'Hinnat ja käyttöönotto tarjouslaskentaohjelmalle',
    intro:
      'Projektan hinnat ja käyttöönotto käydään läpi keskustelussa, jossa huomioidaan yrityksen tarjousprosessi, käytettävät työvaiheet ja se, mitä kokonaisuudelta oikeasti tarvitaan.',
    trustPoints: ['Rakennusalan yrityskäyttö', 'Demo ennen päätöstä', 'Käyttöönotto osana keskustelua'],
    primaryCta: { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
    secondaryCta: { label: 'Avaa yhteystiedot', href: PUBLIC_SITE_PATHS.contact },
    sections: [
      {
        title: 'Mitä hinnan arvioinnissa kannattaa katsoa',
        body: [
          'Tarjouslaskentaohjelman hinnan arviointi on järkevää tehdä vasta, kun on selvää mitä nykyisessä mallissa pitää korjata: onko pullonkaula tarjouseditorissa, kateohjauksessa, tarjouspyyntöjen katselmoinnissa vai projektin jatkossa.',
          'Siksi Projektan kaupallinen keskustelu kannattaa sitoa siihen, mitä työvaiheita yritys haluaa saada saman ohjelmiston alle.',
        ],
        bullets: [
          'Missä tieto on nyt hajallaan.',
          'Kuinka monta työvaihetta halutaan samaan työtilaan.',
          'Miten PDF- ja Excel-viennit sekä käyttöönotto liittyvät kokonaisuuteen.',
        ],
      },
      {
        title: 'Mitä demossa käydään läpi',
        body: [
          'Demossa voidaan käydä läpi, miten tarjous syntyy, miten kate tarkistetaan, miten tarjouspyyntöjen katselmointi liittyy mukaan ja miten projekti voi jatkua samasta tietopohjasta.',
          'Tarkoitus ei ole näyttää geneeristä tuotekierrosta, vaan arvioida sopiiko ohjelmisto juuri rakennusalan tarjousprosessiinne.',
        ],
      },
      {
        title: 'Miten käyttöönottoon kannattaa valmistautua',
        body: [
          'Ennen käyttöönottoa kannattaa kuvata lyhyesti nykyinen tarjousprosessi, käytettävät exportit, sisäinen tarkistustapa ja se, missä kohtaa tieto tällä hetkellä katkeaa.',
          'Näin keskustelu pysyy käytännöllisenä ja hinnasta voidaan puhua oikean laajuuden perusteella.',
        ],
      },
    ],
  },
  {
    key: 'industry',
    path: PUBLIC_SITE_PATHS.industry,
    title: `${APP_NAME} | Tarjouslaskentaohjelma rakennusalalle`,
    metaDescription:
      'Näe miten Projekta toimii tarjouslaskentaohjelmana rakennusalalle. Ratkaisu on suunnattu urakoitsijoille, talotekniikkaan ja projektimyyntiä tekeville rakennusalan yrityksille.',
    eyebrow: 'Rakennusala',
    h1: 'Tarjouslaskentaohjelma rakennusalalle',
    intro:
      'Projekta on suunnattu rakennusalan yrityksille, joille tarjous ei ole vain dokumentti vaan työn käynnistymisen, katteen ja projektiseurannan kriittinen päätöspiste.',
    trustPoints: ['Urakoitsijat', 'Talotekniikka', 'Projektimyynti', 'Rakennusalan palveluyritykset'],
    primaryCta: { label: 'Tutustu ominaisuuksiin', href: PUBLIC_SITE_PATHS.features },
    secondaryCta: { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
    sections: [
      {
        id: 'urakoitsijat',
        title: 'Urakoitsijoille, joilla tarjous käynnistää työn',
        body: [
          'Urakoitsijoilla tarjous toimii usein käytännön lähtöpisteenä toimitukselle, resursoinnille ja projektin käynnistymiselle. Siksi tarjouslaskentaohjelman pitää tukea myös seuraavia vaiheita.',
        ],
      },
      {
        id: 'talotekniikka',
        title: 'Talotekniikkaan ja teknisiin kohteisiin',
        body: [
          'Talotekniikan ja muiden teknisten kohteiden tarjousprosessissa lähtötiedot, vaihtoehdot ja tarkennukset voivat muuttua nopeasti. Hallittu tarjouseditori ja katselmointi auttavat pitämään kokonaisuuden luettavana.',
        ],
      },
      {
        id: 'projektimyynti',
        title: 'Projektimyyntiä tekeville yrityksille',
        body: [
          'Kun myynti, tarjouslaskenta ja projektivastuu liittyvät samaan työketjuun, myös ohjelmiston pitää tukea koko jatkumoa eikä vain yhtä tiedostoa kerrallaan.',
        ],
      },
    ],
  },
  {
    key: 'guide',
    path: PUBLIC_SITE_PATHS.guide,
    title: `${APP_NAME} | Opas tarjouslaskentaan rakennusalalla`,
    metaDescription:
      'Lue opas tarjouslaskentaan rakennusalalla. Käsittelemme, missä Excel-malli hidastaa, miten kate kannattaa tarkistaa ja miksi tarjous pitäisi sitoa projektin lähtötietoon.',
    eyebrow: 'Opas',
    h1: 'Opas tarjouslaskentaan rakennusalalla',
    intro:
      'Tämä sivu kokoaa yhteen ne kysymykset, jotka nousevat esiin ennen ohjelmistovalintaa: missä tarjouslaskenta yleensä hidastuu, mitä ennen lähetystä pitää nähdä ja miksi tarjous pitäisi sitoa samaan kokonaisuuteen kuin projektin alku.',
    trustPoints: ['Tarjouslaskenta', 'Kateohjaus', 'Projektiseuranta'],
    primaryCta: { label: 'Tutustu tarjouseditoriin', href: PUBLIC_FEATURE_LINKS.tarjouseditori },
    secondaryCta: { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
    sections: [
      {
        title: 'Missä Excel alkaa hidastaa tarjouslaskentaa',
        body: [
          'Excel toimii monessa yrityksessä lähtökohtana, mutta ongelma syntyy siinä vaiheessa kun versiot, lisäkulut, vientitiedostot ja projektin jatkotiedot alkavat elää eri paikoissa.',
          'Silloin kyse ei ole enää vain laskentatavasta vaan siitä, että yhteinen näkyvyys katoaa.',
        ],
      },
      {
        title: 'Mitä ennen lähettämistä pitäisi nähdä',
        body: [
          'Ennen kuin tarjous lähetetään, pitäisi nähdä vähintään sisältö, lisäkulut, kate, loppusumma ja mahdolliset avoimet riskit. Jos nämä tiedot ovat eri tiedostoissa, päätös hidastuu ja epävarmuus kasvaa.',
        ],
      },
      {
        title: 'Miksi tarjous kannattaa sitoa projektin lähtötietoon',
        body: [
          'Jos hyväksytty tarjous irtoaa heti projektin käynnistyessä, samaa tietoa joudutaan siivoamaan ja kokoamaan uudelleen. Siksi tarjouslaskentaohjelman kannattaa tukea myös projektiseurantaa ja laskutuksen lähtöpistettä.',
        ],
      },
    ],
  },
  {
    key: 'demo',
    path: PUBLIC_SITE_PATHS.demo,
    title: `${APP_NAME} | Pyydä demo tarjouslaskentaohjelmasta`,
    metaDescription:
      'Pyydä demo Projektasta ja käy läpi, miten tarjouslaskenta, tarjouseditori, kateohjaus ja projektiseuranta toimivat rakennusalan yrityksille samassa ohjelmistossa.',
    eyebrow: 'Demo',
    h1: 'Pyydä demo tarjouslaskentaohjelmasta',
    intro:
      'Demo kannattaa käyttää siihen, että oma tarjousprosessi käydään läpi konkreettisesti. Tavoite on nähdä, miten tarjouslaskenta, kate, projektiseuranta ja viennit asettuvat samaan työtilaan.',
    trustPoints: ['Tarjouseditori', 'Kateohjaus', 'Rakennusala', 'PDF- ja Excel-viennit'],
    primaryCta: { label: 'Avaa demopyyntö sähköpostissa', href: `mailto:${APP_SUPPORT_EMAIL}?subject=Pyydä%20demo%20Projektasta` },
    secondaryCta: { label: 'Avaa yhteystiedot', href: PUBLIC_SITE_PATHS.contact },
    sections: [
      {
        title: 'Mitä demossa käydään läpi',
        body: [
          'Demossa voidaan näyttää tarjouseditori, tarjouspyyntöjen katselmointi, kateohjaus, projektiseuranta sekä PDF- ja Excel-viennit. Näin kokonaisuus nähdään oikeassa käyttöjärjestyksessä, ei pelkkinä irrallisina ominaisuuksina.',
        ],
      },
      {
        title: 'Kenelle demo on hyödyllinen',
        body: [
          'Demo on hyödyllinen erityisesti silloin, kun tarjouksia laativa tiimi, johto tai projektivastuu haluaa arvioida, miten nykyinen Excel- ja PDF-pohjainen malli korvataan hallitummalla ohjelmistolla.',
        ],
      },
      {
        title: 'Mitä kannattaa kertoa etukäteen',
        body: [
          'Nopein tapa saada hyödyllinen demo on kuvata lyhyesti, missä kohdassa tarjousprosessi nyt katkeaa: tarjouseditorissa, tarjouspyyntöjen katselmoinnissa, katteen tarkistuksessa, viennissä tai projektin käynnistyksessä.',
        ],
      },
    ],
  },
  {
    key: 'contact',
    path: PUBLIC_SITE_PATHS.contact,
    title: `${APP_NAME} | Yhteystiedot`,
    metaDescription:
      'Avaa Projektan yhteystiedot ja ota yhteyttä tarjouslaskentaohjelman, demopyynnön tai rakennusalan käyttöön liittyvissä kysymyksissä.',
    eyebrow: 'Yhteystiedot',
    h1: 'Yhteystiedot',
    intro:
      'Yhteydenotto kannattaa käyttää silloin, kun haluat arvioida sopiiko Projekta tarjouslaskentaohjelmaksi juuri teidän rakennusalan käyttöönne tai kun haluat varata demon oikeilla lähtötiedoilla.',
    trustPoints: ['Demo', 'Rakennusala', APP_SUPPORT_EMAIL],
    primaryCta: { label: 'Lähetä sähköposti', href: `mailto:${APP_SUPPORT_EMAIL}` },
    secondaryCta: { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
    sections: [
      {
        title: 'Miten yhteydenotosta saa hyödyllisen',
        body: [
          'Kerro lyhyesti, mitä rakennusalan tarjousprosessia haluatte parantaa ja missä nykyinen toimintatapa nojaa Exceliin, PDF:iin tai hajallaan olevaan tietoon. Näin keskustelu voidaan aloittaa suoraan oikeasta ongelmasta.',
        ],
      },
      {
        title: 'Milloin kannattaa pyytää demo ja milloin yhteydenotto riittää',
        body: [
          'Jos haluat nähdä ohjelmiston käytössä, pyydä demo. Jos taas haluat ensin varmistaa sopivuuden, käyttötapauksen tai seuraavat askeleet, tavallinen yhteydenotto riittää hyvin.',
        ],
      },
      {
        title: 'Julkiset linkit',
        body: [
          'Etusivun lisäksi käytössä ovat myös ominaisuudet, hinnat, rakennusala ja opas -sivut, joiden avulla voit arvioida kokonaisuutta ennen varsinaista keskustelua.',
        ],
        links: [
          { label: 'Avaa ominaisuudet', href: PUBLIC_SITE_PATHS.features },
          { label: 'Avaa hinnat', href: PUBLIC_SITE_PATHS.pricing },
          { label: 'Avaa opas', href: PUBLIC_SITE_PATHS.guide },
        ],
      },
    ],
  },
];

const PUBLIC_MARKETING_PAGE_BY_PATH = PUBLIC_MARKETING_PAGES.reduce<Record<string, PublicMarketingPageDefinition>>(
  (result, page) => {
    result[page.path] = page;
    return result;
  },
  {}
);

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

export function resolvePublicMarketingPage(pathname: string) {
  return PUBLIC_MARKETING_PAGE_BY_PATH[normalizePathname(pathname)] ?? null;
}

export function getPublicPrerenderRoutes() {
  return [PUBLIC_SITE_PATHS.home, ...PUBLIC_MARKETING_PAGES.map((page) => page.path)];
}

export function buildOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    url: APP_CANONICAL_URL,
    email: APP_SUPPORT_EMAIL,
    description: 'Tarjouslaskentaohjelma rakennusalan yrityksille.',
  };
}

export function buildWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_NAME,
    url: APP_CANONICAL_URL,
    inLanguage: 'fi-FI',
    description: APP_MARKETING_META_DESCRIPTION,
  };
}

export function buildSoftwareApplicationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: APP_CANONICAL_URL,
    inLanguage: 'fi-FI',
    areaServed: 'FI',
    audience: {
      '@type': 'BusinessAudience',
      audienceType: 'Rakennusalan yritykset',
    },
    description: APP_MARKETING_META_DESCRIPTION,
    featureList: [
      'Tarjouslaskenta',
      'Tarjouseditori',
      'Tarjouspyyntöjen katselmointi',
      'Kateohjaus',
      'Projektiseuranta',
      'PDF-viennit',
      'Excel-viennit',
    ],
  };
}

export function buildFaqStructuredData(items: PublicFaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function getHomeStructuredData() {
  return [
    buildOrganizationStructuredData(),
    buildWebsiteStructuredData(),
    buildSoftwareApplicationStructuredData(),
    buildFaqStructuredData(PUBLIC_HOME_FAQ_ITEMS),
  ];
}

export function getPublicPageStructuredData() {
  return [buildOrganizationStructuredData(), buildWebsiteStructuredData(), buildSoftwareApplicationStructuredData()];
}