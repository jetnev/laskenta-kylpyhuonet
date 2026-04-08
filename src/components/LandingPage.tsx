import { useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ArrowRight,
  Buildings,
  CalendarBlank,
  CalendarCheck,
  ChartBar,
  CheckCircle,
  CurrencyCircleDollar,
  FileText,
  FolderOpen,
  HardHat,
  ListChecks,
  MagnifyingGlass,
  Package,
  PlayCircle,
  Warning,
  Wrench,
  X,
} from '@phosphor-icons/react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import PublicStructuredData from './public/PublicStructuredData';
import { PublicSiteFooter, PublicSiteHeader } from './public/PublicSiteChrome';
import { applyDocumentMetadata } from '../lib/document-metadata';
import {
  PUBLIC_FEATURE_LINKS,
  PUBLIC_HOME_FAQ_ITEMS,
  PUBLIC_HOME_TITLE,
  PUBLIC_SITE_PATHS,
  getHomeStructuredData,
} from '../lib/public-site';
import { APP_MARKETING_META_DESCRIPTION } from '../lib/site-brand';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

type Tone = 'slate' | 'sky' | 'amber' | 'emerald';

interface SignalItem {
  icon: typeof FileText;
  title: string;
  text: string;
}

interface WorkspaceMetric {
  label: string;
  value: string;
  tone: Tone;
}

interface WorkspaceRow {
  label: string;
  detail: string;
  value: string;
}

interface WorkspaceNote {
  title: string;
  text: string;
}

interface WorkspaceView {
  value: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  metrics: WorkspaceMetric[];
  rows: WorkspaceRow[];
  notes: WorkspaceNote[];
}

const topSignals: SignalItem[] = [
  {
    icon: FileText,
    title: 'Tarjouseditori yrityskayttoon',
    text: 'Tarjous ei jaa irralliseksi dokumentiksi, vaan pysyy samassa tyotilassa kohde-, asiakas- ja versioketjun kanssa.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Tarjouspyyntojen katselmointi',
    text: 'Dokumentit, havainnot, riskit ja puuttuvat tiedot voidaan kayda lapi ennen varsinaista tarjousta.',
  },
  {
    icon: CurrencyCircleDollar,
    title: 'Kateohjaus ennen paatosta',
    text: 'Kate, lisakulut ja loppusumma nakyvat samassa nakymassa ennen kuin tarjous lahtee ulos.',
  },
  {
    icon: CalendarCheck,
    title: 'Projektiseuranta ja viennit',
    text: 'Hyvaksytty tarjous voi jatkua projektiksi ja tiedot voidaan vieda ulos PDF- ja Excel-muotoon.',
  },
];

const workspaceViews: WorkspaceView[] = [
  {
    value: 'tarjouseditori',
    label: 'Tarjouseditori',
    eyebrow: 'Tarjouslaskentaohjelma',
    title: 'Muokkaa tarjous samassa editorissa, jossa lahtotieto, rivit ja versiot pysyvat hallinnassa.',
    description:
      'Kun tarjouseditori kuuluu samaan tyotilaan kuin muu tarjouslaskenta, tiedot eivat ela erikseen Excelissa, PDF:issa ja muistiinpanoissa. Siksi myos versiot pysyvat luettavina ilman tiedostokaaosta.',
    highlights: ['Tarjouseditori', 'Versiot', 'Tuoterekisteri'],
    metrics: [
      { label: 'Tarjous', value: 'TAR-20260408-02', tone: 'sky' },
      { label: 'Kohde', value: 'Julkisivun korjaus / vaihe 2', tone: 'slate' },
      { label: 'Status', value: 'Valmis tarkistukseen', tone: 'amber' },
    ],
    rows: [
      { label: 'Tuoterivi', detail: 'Laatta 60x60 matt / 42 m2', value: '5 980 EUR' },
      { label: 'Asennus', detail: 'Asennus, suojaus ja viimeistely', value: '3 920 EUR' },
      { label: 'Vaihtoehto', detail: 'Korvaava pintamateriaali perusteluineen', value: '1 480 EUR' },
      { label: 'Yhteenveto', detail: 'Tarjous säilyy samassa tyotilassa asiakas- ja kohdetiedon kanssa', value: '17 368 EUR' },
    ],
    notes: [
      {
        title: 'Versiointi pysyy luettavana',
        text: 'Uudet tarjouskierrokset eivat irtoa historiasta, vaan sama kokonaisuus sailyy hallittuna.',
      },
      {
        title: 'Tuotetieto ei ala alusta',
        text: 'Tuote- ja hintapohja voidaan yllapitaa yhdessa rekisterissa koko tiimille.',
      },
      {
        title: 'Tarjous pysyy ohjelmistossa',
        text: 'PDF ja Excel ovat vientimuotoja, eivat varsinainen tarjousprosessin tyotila.',
      },
    ],
  },
  {
    value: 'katselmointi',
    label: 'Tarjouspyynnot',
    eyebrow: 'Tarjouspyyntojen katselmointi',
    title: 'Kokoa tarjouspyynto, nosta olennaiset havainnot ja vie valmisteltu sisalto hallitusti tarjouksen pohjaksi.',
    description:
      'Tarjouspyyntojen katselmointi on tarkea osa tarjouslaskentaa silloin, kun dokumentit, vaatimukset ja puuttuvat tiedot pitaa saada samaan paikkaan ennen varsinaista hintapaatosta.',
    highlights: ['Dokumentit', 'Riskit', 'Katselmointi'],
    metrics: [
      { label: 'Paketti', value: '14 dokumenttia', tone: 'slate' },
      { label: 'Nostot', value: '12 kohtaa', tone: 'amber' },
      { label: 'Tuonti', value: 'Valmis luonnokseen', tone: 'emerald' },
    ],
    rows: [
      { label: 'Vaatimukset', detail: 'Toimitusrajat, vastuukohdat ja tekniset ehdot', value: '6 havaintoa' },
      { label: 'Riskit', detail: 'Puuttuvat tiedot, tarkennettavat kohdat ja huomautukset', value: '3 nostoa' },
      { label: 'Evidenssi', detail: 'Dokumentoitavat lahteet katselmointia varten', value: '8 viitetta' },
      { label: 'Luonnos', detail: 'Valmisteltu sisalto voidaan siirtaa hallitusti tarjouseditoriin', value: 'Valmis' },
    ],
    notes: [
      {
        title: 'Tarjouspyynto ei jaa sahkopostiin',
        text: 'Katselmointi voidaan tehda samassa ymparistossa kuin varsinainen tarjouslaskenta.',
      },
      {
        title: 'Ei mustan laatikon lupausta',
        text: 'Tavoite on tehda loydokset katselmoitaviksi ennen varsinaista tarjousta.',
      },
      {
        title: 'Hallittu siirto editoriin',
        text: 'Valmistelun tulos voidaan vieda versiona normaalin tarjouspolun jatkoksi.',
      },
    ],
  },
  {
    value: 'kateohjaus',
    label: 'Kateohjaus',
    eyebrow: 'Kateohjaus',
    title: 'Tarkista paatos ennen lahetysta, ei vasta projektin aikana.',
    description:
      'Kun tarjouskohtainen kate, lisakulut ja loppusumma ovat samassa nakymassa, lahetyspaatos voidaan tehda lapinakyvan tiedon perusteella eika erillisten laskentatiedostojen varassa.',
    highlights: ['Lisakulut', 'Kertoimet', 'Sisainen audit trail'],
    metrics: [
      { label: 'Kate-ennuste', value: '18,4 %', tone: 'emerald' },
      { label: 'Lisakulut', value: '1 280 EUR', tone: 'amber' },
      { label: 'Paatostila', value: 'Valmis tarkistukseen', tone: 'sky' },
    ],
    rows: [
      { label: 'Materiaalikate', detail: 'Ostot, kerroin ja varmuusvara', value: '11,2 %' },
      { label: 'Tyokate', detail: 'Asennusryhma, kesto ja lisatyovaraus', value: '7,2 %' },
      { label: 'Lisakulut', detail: 'Nostot, suojaus, matkakulut, poikkeamat', value: '1 280 EUR' },
      { label: 'Lahetyspaatos', detail: 'Kate ja loppusumma tarkistettu ennen lahetysta', value: 'Hyvaksytty' },
    ],
    notes: [
      {
        title: 'Kate nakyy oikeassa kohdassa',
        text: 'Marginaali tarkistetaan ennen lahetysta eika vasta silloin, kun projekti on jo kaynnissa.',
      },
      {
        title: 'Sisainen tarkistus pysyy dokumentoituna',
        text: 'Lisakulut, kertoimet ja poikkeamat voidaan kayda lapi samassa nakymassa.',
      },
      {
        title: 'Paatos ei ela muistilapuissa',
        text: 'Kun lahetyspiste on ohjattu, paatos ei jaa yksittaisen ihmisen oman taulukon varaan.',
      },
    ],
  },
  {
    value: 'projektiseuranta',
    label: 'Projektiseuranta',
    eyebrow: 'Projektiseuranta ja viennit',
    title: 'Jatka hyvaksytty tarjous projektiksi ilman kasin tehtavaa siivousta ja vie dokumentit ulos oikeassa muodossa.',
    description:
      'Kun tarjous jatkuu samasta datasta projektin lahtotiedoksi, myos maarajat, kohdetieto ja PDF- tai Excel-viennit pysyvat samassa ohjatussa kokonaisuudessa.',
    highlights: ['Projektiseuranta', 'PDF-vienti', 'Excel-vienti'],
    metrics: [
      { label: 'Aloitus', value: '15.4.2026', tone: 'sky' },
      { label: 'Toimitus', value: '23.4.2026', tone: 'amber' },
      { label: 'Laskutus', value: 'Snapshot aktiivinen', tone: 'emerald' },
    ],
    rows: [
      { label: 'Projekti', detail: 'Tarjouksesta avattu projektikortti kohde- ja yhteystiedoilla', value: 'Aktiivinen' },
      { label: 'Deadline', detail: 'Tilausvahvistus, aloitus ja toimitus samassa aikajanassa', value: '3 vaihetta' },
      { label: 'PDF-vienti', detail: 'Asiakasnakyva tarjousdokumentti ulos samasta lahteesta', value: 'Valmis' },
      { label: 'Excel-vienti', detail: 'Sisainen jatkokasittely tai raportointivienti hallitusti', value: 'Valmis' },
    ],
    notes: [
      {
        title: 'Hyvaksytty tarjous ei katkea',
        text: 'Projektin lahtotieto on sama kuin myyntivaiheessa hyvaksytty kokonaisuus.',
      },
      {
        title: 'Aikataulut pysyvat nakyvissa',
        text: 'Maaraajat, toimitus ja tyon kaynnistys voidaan seurata samassa ymparistossa.',
      },
      {
        title: 'Viennit palvelevat prosessia',
        text: 'PDF- ja Excel-viennit tukevat asiakkaalle lahtevaa materiaalia ja sisaista tarkistusta ilman etta koko tyo jaa exporttien varaan.',
      },
    ],
  },
];

const operationalRisks = [
  'Tarjousversiot hajaantuvat kansioihin, sahkoposteihin ja tyopoydille.',
  'Hinnat, lisakulut ja huomiot elavat erikseen Excelissa, PDF:issa ja muistiinpanoissa.',
  'Tarjouspyynnon katselmointi jaa irrallisiksi huomioiksi eika osaksi samaa tyotilaa.',
  'Kate tarkistetaan liian myohaan tai vain osittaisen tiedon perusteella.',
  'Hyvaksytyn tarjouksen tieto katkeaa juuri siina kohdassa, jossa tyo pitaisi kaynnistaa.',
];

const operationalOutcomes = [
  'Tarjouslaskenta, tarjouseditori ja versiot pysyvat samassa tyotilassa.',
  'Tarjouspyynnon dokumentit, havainnot ja siirtopolku voidaan katselmoida hallitusti.',
  'Kate, lisakulut ja loppusumma ovat nakyvissa ennen lahetyspaatosta.',
  'Hyvaksytty tarjous voi jatkua projektiksi ja laskutuksen viitepisteeksi ilman kasityota.',
  'PDF- ja Excel-viennit syntyvat ohjelmistosta, eivat erillisesta tiedostoketjusta.',
];

const capabilityCards = [
  {
    icon: FileText,
    title: 'Tarjouseditori',
    text: 'Muokkaa tarjousta samassa editorissa, jossa rivit, vaihtoehdot, kohdetieto ja versiot pysyvat luettavina.',
    bullets: [
      'Tarjousrivit, vaihtoehdot ja versiot saman tyoketjun sisalla.',
      'Asiakas- ja kohdetieto pysyy mukana koko valmistelun ajan.',
      'Tarjous ei jaa irralliseksi dokumentiksi.',
    ],
    href: PUBLIC_FEATURE_LINKS.tarjouseditori,
    linkLabel: 'Tutustu tarjouseditoriin',
  },
  {
    icon: MagnifyingGlass,
    title: 'Tarjouspyyntojen katselmointi',
    text: 'Kokoa tarjouspyyntopaketti, nosta havainnot ja siirra valmisteltu sisalto hallitusti tarjouksen pohjaksi.',
    bullets: [
      'Dokumentit, vaatimukset ja riskit samaan paikkaan.',
      'Katselmointi ei jaa erillisiksi muistiinpanoiksi.',
      'Hallittu siirto tarjouseditoriin.',
    ],
    href: PUBLIC_FEATURE_LINKS.tarjouspyynnot,
    linkLabel: 'Katso tarjouspyyntojen katselmointi',
  },
  {
    icon: CurrencyCircleDollar,
    title: 'Kateohjaus',
    text: 'Pida marginaali, lisakulut ja loppusumma nakyvissa siella, missa lahetyspaatos tehdaan.',
    bullets: [
      'Tarjouskohtainen kate ennen lahettamista.',
      'Lisakulut, kertoimet ja yhteenveto samassa nakymassa.',
      'Sisainen tarkistus ei vaadi erillista laskentatiedostoa.',
    ],
    href: PUBLIC_FEATURE_LINKS.kateohjaus,
    linkLabel: 'Nae kateohjaus',
  },
  {
    icon: CalendarBlank,
    title: 'Projektiseuranta',
    text: 'Hyvaksytty tarjous voi jatkua projektinakymään ilman, etta lahtotieto katoaa matkalla.',
    bullets: [
      'Toimitus-, aloitus- ja valmistumispaivat saman kohteen yhteydessa.',
      'Maaraajat nakyviin tyotilan sisalla, ei vain kalenterimuistioissa.',
      'Kohteen lahtotieto pysyy sidottuna alkuperaiseen tarjoukseen.',
    ],
    href: PUBLIC_FEATURE_LINKS.projektiseuranta,
    linkLabel: 'Tutustu projektiseurantaan',
  },
  {
    icon: Package,
    title: 'PDF- ja Excel-viennit',
    text: 'Vie tarjous ulos oikeassa muodossa ilman etta varsinainen tyo jaa export-tiedostojen varaan.',
    bullets: [
      'Asiakasnakyva materiaali saadaan ulos selkeasti.',
      'Excel voi palvella vientia ilman etta koko prosessi asuu Excelissa.',
      'Sisainen tarkistus ja ulkoinen dokumentti pysyvat saman lahdetiedon alla.',
    ],
    href: PUBLIC_FEATURE_LINKS.exports,
    linkLabel: 'Katso PDF- ja Excel-viennit',
  },
  {
    icon: ChartBar,
    title: 'Raportointi ja johdon tilannekuva',
    text: 'Nosta johdon, laskennan ja projektivastuun tarvitsema yhteinen nakyvyys samasta tietopohjasta.',
    bullets: [
      'Tarjousten, projektien ja katteen kehitysta voidaan tarkastella samassa ymparistossa.',
      'Johto ei joudu kokoamaan tilannekuvaa hajanaisista lahteista.',
      'Yhteinen nakyvyys tukee myyntia, laskentaa ja projektin kaynnistysta.',
    ],
    href: PUBLIC_SITE_PATHS.features,
    linkLabel: 'Tutustu ominaisuuksiin',
  },
];

const processSteps = [
  {
    step: '01',
    icon: FolderOpen,
    title: 'Kokoa tarjous ja lahtotiedot',
    text: 'Tuo kohde, asiakkaan tiedot, tarjouspyynto ja tarjouksen lahtorivit samaan tyotilaan heti alussa.',
  },
  {
    step: '02',
    icon: FileText,
    title: 'Muokkaa ja tarkista tarjous',
    text: 'Tarjouseditori, katselmointi ja kateohjaus pitavat sisallon, riskit ja lahetyspaatoksen samassa nakymassa.',
  },
  {
    step: '03',
    icon: CalendarCheck,
    title: 'Seuraa katetta ja vie dokumentit ulos',
    text: 'Hyvaksytty tarjous voi jatkua projektin lahtotiedoksi ja tiedot voidaan vieda PDF- ja Excel-muotoon oikeassa kohdassa.',
  },
];

const roleCards = [
  {
    icon: ChartBar,
    title: 'Johdolle',
    text: 'Kun tarvitset nakyvyyden siihen, miten tarjouskanta, kate ja kaynnissa olevat kohteet oikeasti liikkuvat.',
    bullets: [
      'Tilannekuva tarjouksista, projekteista ja raporteista samassa ymparistossa.',
      'Vahemman tulkinnanvaraa siita, milla tiedolla paatoksia tehdaan.',
      'Selkeampi tapa ohjata liiketoiminnan kriittista paatospistetta.',
    ],
  },
  {
    icon: CurrencyCircleDollar,
    title: 'Tarjouslaskennalle',
    text: 'Kun tarvitset paikan, jossa tarjous, tuoterivit, kate ja versiot pysyvat hallitusti yhdessa.',
    bullets: [
      'Vahemman tiedostoversioiden metsaystysta.',
      'Kate, lisakulut ja sisalto tarkistettavissa samassa nakymassa.',
      'Tarjouspyynnon katselmointi voidaan kytkea valmistelun alkuun.',
    ],
  },
  {
    icon: CalendarCheck,
    title: 'Projektin kaynnistajille',
    text: 'Kun hyvaksytty tarjous pitaa saada siirtymaan kaytannon tekemisen lahtopisteeksi ilman kasin tehtavaa siivousta.',
    bullets: [
      'Kohde- ja aikataulutieto pysyy mukana hyvaksyinnasta eteenpain.',
      'Snapshot-pohjainen laskutusviite sailyttaa yhteyden alkuperaiseen tarjoukseen.',
      'Vahemman epaselvyytta siita, mika versio lopulta hyvaksyttiin.',
    ],
  },
];

const industryItems = [
  { icon: HardHat, label: 'Rakennusalan yritykset' },
  { icon: HardHat, label: 'Urakoitsijat' },
  { icon: Wrench, label: 'Talotekniikka' },
  { icon: Buildings, label: 'Remontointi' },
  { icon: ListChecks, label: 'Tarjouksia laativat tiimit' },
  { icon: Package, label: 'Projektimyyntia tekevat yritykset' },
];

const destinationCards = [
  {
    icon: FileText,
    title: 'Tutustu tarjouseditoriin',
    text: 'Katso miten tarjouseditori, versiot ja tarjousrivit rakentuvat saman ohjelmiston sisaan.',
    href: PUBLIC_FEATURE_LINKS.tarjouseditori,
  },
  {
    icon: CurrencyCircleDollar,
    title: 'Katso hinnat ja kayttoonotto',
    text: 'Arvioi, miten tarjouslaskentaohjelman kayttoonotto kannattaa kayda lapi omasta prosessista kasin.',
    href: PUBLIC_SITE_PATHS.pricing,
  },
  {
    icon: Buildings,
    title: 'Nae miten Projekta sopii rakennusalalle',
    text: 'Lue kenelle ohjelmisto sopii ja miksi sen sanasto seka kayttopolku on rakennettu rakennusalan tarpeisiin.',
    href: PUBLIC_SITE_PATHS.industry,
  },
  {
    icon: ListChecks,
    title: 'Lue opas tarjouslaskentaan',
    text: 'Avaa sisaltosivu, joka kasittelee Excel-mallin rajoja, katepaatosta ja projektijatkumoa.',
    href: PUBLIC_SITE_PATHS.guide,
  },
  {
    icon: PlayCircle,
    title: 'Pyydä demo',
    text: 'Kay demo lapi oman tarjousprosessin nakokulmasta eika geneerisen tuotekerroksen kautta.',
    href: PUBLIC_SITE_PATHS.demo,
  },
];

function getMetricClasses(tone: Tone) {
  switch (tone) {
    case 'sky':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-900';
  }
}

function handleLoginAnchorClick(event: ReactMouseEvent<HTMLAnchorElement>, onNavigateToLogin: () => void) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  onNavigateToLogin();
}

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  useEffect(() => {
    applyDocumentMetadata({
      title: PUBLIC_HOME_TITLE,
      description: APP_MARKETING_META_DESCRIPTION,
      pathname: '/',
      siteUrl: import.meta.env.VITE_SITE_URL?.trim(),
    });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f2ed] text-slate-950">
      <PublicStructuredData items={getHomeStructuredData()} />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.10),transparent_34%),radial-gradient(circle_at_84%_4%,rgba(180,83,9,0.10),transparent_26%),linear-gradient(180deg,#f3f2ed_0%,#f8fafc_52%,#ffffff_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[540px] bg-[linear-gradient(180deg,rgba(15,23,42,0.04),transparent)]" />

      <PublicSiteHeader currentPath={PUBLIC_SITE_PATHS.home} />

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-start lg:gap-12 lg:pb-28 lg:pt-20">
            <div className="max-w-2xl">
              <Badge className="rounded-full border border-slate-300 bg-white/[0.85] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm hover:bg-white">
                Projekta tarjouslaskentaohjelma rakennusalalle
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[3.45rem] lg:text-[4.1rem]">
                Tarjouslaskentaohjelma rakennusalan yrityksille
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Projekta on yrityskayttoon tehty ohjelmisto, jossa tarjouseditori, tarjouspyyntojen katselmointi, kateohjaus, projektiseuranta seka PDF- ja Excel-viennit kuuluvat samaan tyotilaan. Tarjous ei jaa irralliseksi dokumentiksi eika tieto ela erikseen Excelissa, PDF:issa ja muistiinpanoissa.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild className="h-12 gap-2 rounded-full px-7 text-sm shadow-[0_24px_40px_-22px_rgba(15,23,42,0.8)]">
                  <a href={PUBLIC_SITE_PATHS.demo}>
                    Pyydä demo
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-slate-300 bg-white/70 px-7 text-sm text-slate-700 hover:bg-white">
                  <a href={PUBLIC_FEATURE_LINKS.tarjouseditori}>Tutustu tarjouseditoriin</a>
                </Button>
                <Button asChild variant="ghost" className="h-12 rounded-full px-5 text-sm text-slate-700 hover:bg-white/70">
                  <a href="#miten-se-toimii">
                    <PlayCircle className="h-4 w-4" />
                    Katso miten se toimii
                  </a>
                </Button>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Nykyinen käyttäjä?{' '}
                <a
                  href={PUBLIC_SITE_PATHS.login}
                  className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950"
                  onClick={(event) => handleLoginAnchorClick(event, onNavigateToLogin)}
                >
                  Kirjaudu sisään työtilaan.
                </a>
              </p>

              <nav aria-label="Etusivun pikalinkit" className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
                {[
                  { label: 'Tarjouseditori', href: '#tyotila' },
                  { label: 'Miksi vaihtaa Excelistä', href: '#ratkaisu' },
                  { label: 'Näin Projekta toimii', href: '#miten-se-toimii' },
                  { label: 'FAQ', href: '#faq' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 transition hover:border-slate-300 hover:bg-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {topSignals.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={item.title}
                      className="rounded-[26px] border border-slate-200 bg-white/82 p-5 shadow-[0_26px_55px_-42px_rgba(15,23,42,0.34)] backdrop-blur-sm"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon className="h-5 w-5" weight="bold" />
                      </div>
                      <h2 className="mt-5 text-base font-semibold tracking-[-0.025em] text-slate-950">{item.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-8 top-10 -z-10 h-[88%] rounded-[40px] bg-slate-950/12 blur-3xl" />
              <Tabs defaultValue={workspaceViews[0].value} className="gap-0">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[24px] border border-slate-200 bg-white/75 p-2 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.38)] backdrop-blur lg:grid-cols-4">
                  {workspaceViews.map((view) => (
                    <TabsTrigger
                      key={view.value}
                      value={view.value}
                      className="min-h-[4.5rem] flex-col items-start justify-center rounded-[18px] border border-transparent px-4 py-3 text-left data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{view.eyebrow}</span>
                      <span className="mt-1 text-sm font-semibold text-slate-950">{view.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {workspaceViews.map((view) => (
                  <TabsContent key={view.value} value={view.value} className="mt-4 rounded-[34px] border border-slate-200 bg-white p-7 shadow-[0_30px_70px_-46px_rgba(15,23,42,0.45)] sm:p-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {view.eyebrow}
                      </Badge>
                      {view.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 max-w-2xl">
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2rem]">{view.title}</h2>
                      <p className="mt-4 text-base leading-8 text-slate-600">{view.description}</p>
                    </div>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      {view.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className={`rounded-[24px] border px-4 py-4 shadow-sm ${getMetricClasses(metric.tone)}`}
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{metric.label}</div>
                          <div className="mt-2 text-sm font-semibold leading-6">{metric.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-[#f6f7f3]">
                      <div className="grid grid-cols-[1.1fr_1.4fr_auto] gap-4 border-b border-slate-200 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <span>Osio</span>
                        <span>Selite</span>
                        <span className="text-right">Arvo</span>
                      </div>
                      {view.rows.map((row) => (
                        <div key={row.label} className="grid grid-cols-[1.1fr_1.4fr_auto] gap-4 border-b border-slate-200/80 px-5 py-4 text-sm leading-7 last:border-b-0">
                          <div className="font-semibold text-slate-950">{row.label}</div>
                          <div className="text-slate-600">{row.detail}</div>
                          <div className="text-right font-semibold text-slate-950">{row.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 grid gap-4 lg:grid-cols-3">
                      {view.notes.map((note) => (
                        <div key={note.title} className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                          <div className="text-sm font-semibold text-slate-950">{note.title}</div>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{note.text}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </section>

        <section id="ratkaisu" className="border-t border-slate-200 bg-white/70">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
              <div className="max-w-xl">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Miksi tämä tarvitaan</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  Miksi Excel-, PDF- ja sahkopostipohjainen tarjouslaskenta hidastaa rakennusalan tyota
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Tarjous on tyon kaynnistymisen kriittinen paatospiste. Jos tieto ela eri kansioissa, eri laskelmissa ja eri ihmisilla, ongelma ei ole vain hitaus vaan myos se, etta tarjous, kate ja projektin lahtotieto eivat enaa kohtaa samassa paatoshetkessa.
                </p>

                <div className="mt-8 rounded-[28px] border border-amber-200/80 bg-amber-50/80 p-6 shadow-[0_18px_42px_-32px_rgba(120,53,15,0.35)]">
                  <div className="flex items-center gap-3 text-sm font-semibold text-amber-950">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Warning className="h-4 w-4" weight="bold" />
                    </span>
                    Kun tarjous elaa eri tiedostoissa
                  </div>
                  <p className="mt-4 text-sm leading-7 text-amber-950/80">
                    paatos tehdaan usein ennen kuin kate, riskit, toimitusrajat tai projektin kaynnistamiseen tarvittava lahtotieto ovat oikeasti samalla poydalla.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[32px] border border-rose-200 bg-[#fff4f3] p-7 shadow-[0_28px_60px_-40px_rgba(190,24,93,0.18)]">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-rose-900">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                      <X className="h-4 w-4" weight="bold" />
                    </span>
                    Hajanaisessa mallissa
                  </div>
                  <ul className="mt-6 space-y-4">
                    {operationalRisks.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-7 text-rose-950/80">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[32px] border border-emerald-200 bg-[#f2fbf6] p-7 shadow-[0_28px_60px_-40px_rgba(5,150,105,0.28)]">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-900">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <CheckCircle className="h-4 w-4" weight="fill" />
                    </span>
                    Projektalla tarjous pysyy ohjelmistossa
                  </div>
                  <ul className="mt-6 space-y-4">
                    {operationalOutcomes.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-7 text-emerald-950/80">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tyotila" className="border-t border-slate-200 bg-[#f6f7f3]">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ominaisuudet</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Tarjouseditori, tarjouspyyntojen katselmointi, kateohjaus, projektiseuranta ja PDF- ja Excel-viennit
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Projekta ei yrita piilottaa toimintaa geneerisen tyotilapuheen taakse. Alla ovat ne kokonaisuudet, joilla rakennusalan tarjouslaskentaohjelma ratkaisee arjen kaytannon tyon.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {capabilityCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.3)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-slate-950">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.text}</p>
                    <ul className="mt-5 space-y-3">
                      {card.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm leading-7 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={card.href}
                      className="mt-6 inline-flex text-sm font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950"
                    >
                      {card.linkLabel}
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="miten-se-toimii" className="border-y border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#162033_52%,#1f2937_100%)] text-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Nain Projekta toimii</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Kolme vaihetta, joilla tarjous pysyy hallittuna koko matkalla.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/75">
                Kun etsit tarjouslaskentaohjelmaa rakennusalan yrityksille, tarkeinta ei ole yksi nayttava nakyma vaan se, etta kayttopolku kestaa tarjouspyynnosta ulos vietavaan dokumenttiin ja projektin alkuun asti.
              </p>
            </div>

            <div className="mt-14 grid gap-5 xl:grid-cols-3">
              {processSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.step}
                    className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_28px_55px_-40px_rgba(15,23,42,0.65)] backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Vaihe {step.step}</span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <Icon className="h-5 w-5" weight="bold" />
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/72">{step.text}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.06] px-6 py-5 text-sm leading-7 text-white/75 backdrop-blur-sm">
              Tarjouspyyntojen katselmointi voidaan kytkea ketjun alkuun silloin, kun tarjouspyyntopaketin koonti, havaintojen jasentaminen ja hallittu siirto tarjousvalmisteluun halutaan tuoda saman ohjelmiston alle.
            </div>
          </div>
        </section>

        <section id="kenelle" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Kenelle tama on tehty</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Kenelle Projekta sopii
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Projekta on tehty yrityksille, joille tarjous ei ole hallinnollinen liite vaan liiketoiminnan, katteen ja projektin kaynnistymisen ohjauspiste.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {roleCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="rounded-[30px] border border-slate-200 bg-[#f6f7f3] p-6 shadow-[0_24px_50px_-42px_rgba(15,23,42,0.22)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-slate-950">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.text}</p>
                    <ul className="mt-5 space-y-3">
                      {card.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm leading-7 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {industryItems.map((item) => {
                const Icon = item.icon;

                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    <Icon className="h-4 w-4 text-slate-500" weight="bold" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        <section id="tarjousaly" className="border-t border-slate-200 bg-[#f6f7f3]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.86fr_1.14fr] lg:items-start lg:py-24">
            <div className="max-w-xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Tarjouspyyntojen katselmointi</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Tarjouspyyntojen katselmointi osaksi hallittua tarjousprosessia
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Tarjouspyyntojen katselmointi on tarkoitettu tilanteisiin, joissa tarjouspyyntopaketin sisalto, vaatimukset ja riskit pitaa saada samaan tyotilaan ennen varsinaista tarjousta. Se vahvistaa tarjouslaskentaa, ei korvaa harkintaa epamaaraisella automaatiolupauksella.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {['Ei mustaa laatikkoa', 'Katselmoitava polku', 'Hallittu siirto tarjoukseen'].map((item) => (
                  <span key={item} className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: FolderOpen,
                  title: 'Tarjouspyyntopaketin koonti',
                  text: 'Dokumentit, liitteet ja valmistelun kannalta olennainen lahtotieto kootaan samaan tyotilaan.',
                },
                {
                  icon: MagnifyingGlass,
                  title: 'Deterministinen katselmointi',
                  text: 'Vaatimukset, riskit, puutteet ja evidenssi voidaan jasentaa katselmointia varten ilman mustan laatikon lupausta.',
                },
                {
                  icon: FileText,
                  title: 'Hallittu siirto tarjoukseen',
                  text: 'Valmisteltu sisalto voidaan vieda tarjouksen luonnokseen versiona, jota jatketaan normaalissa tyovirrassa.',
                },
              ].map((step) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.title}
                    className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.22)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-6 text-lg font-semibold tracking-[-0.03em] text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white/70">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Tutustu tarkemmin</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Jatka siita sisallosta, joka vastaa omaa hakuintenttiasi.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Etusivun ei tarvitse kantaa koko domainin nakyvyytta yksin. Siksi tarkeimmille kaupallisille ja sisallollisille aiheille on omat crawlattavat sivut.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {destinationCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article key={card.href} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.24)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.025em] text-slate-950">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.text}</p>
                    <a href={card.href} className="mt-5 inline-flex text-sm font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950">
                      Avaa sivu
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">FAQ</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  Usein kysyttyä tarjouslaskentaohjelmasta rakennusalalle
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  FAQ toimii seka ostamisen etta hakukoneen nakokulmasta vain silloin, kun kysymykset ovat oikeita eika keinotekoisesti keksittyja SEO-otsikoita.
                </p>

                <div className="mt-8 rounded-[28px] border border-slate-200 bg-[#f6f7f3] px-6 py-3">
                  <Accordion type="single" collapsible>
                    {PUBLIC_HOME_FAQ_ITEMS.map((item) => (
                      <AccordionItem key={item.question} value={item.question} className="border-slate-200">
                        <AccordionTrigger className="py-5 text-base font-semibold text-slate-950 hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 text-sm leading-7 text-slate-600">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-[#0f172a] p-7 text-white shadow-[0_32px_70px_-42px_rgba(15,23,42,0.78)]">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Luottamus ja jatkopolku</div>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Virallinen, kaupallinen ja hakukelpoinen etuovi samassa palvelussa.
                </h3>
                <div className="mt-7 space-y-4 text-sm leading-7 text-white/75">
                  <p>
                    Etusivu kertoo nyt suoraan, että Projekta on tarjouslaskentaohjelma rakennusalan yrityksille. Lisäksi tärkeimmät ominaisuudet, hinnat, opas ja yhteyspolut ovat omilla crawlattavilla sivuillaan.
                  </p>
                  <p>
                    Näin sekä käyttäjä että hakukone näkevät selkeämmin mitä ohjelmisto tekee, kenelle se on tehty ja miksi se on vaihtoehto hajanaiselle Excel- ja PDF-mallille.
                  </p>
                  <div className="grid gap-3 pt-2">
                    <a className="rounded-[20px] border border-white/10 bg-white/[0.06] px-4 py-3 transition hover:bg-white/[0.10]" href={PUBLIC_SITE_PATHS.features}>
                      Tutustu ominaisuuksiin
                    </a>
                    <a className="rounded-[20px] border border-white/10 bg-white/[0.06] px-4 py-3 transition hover:bg-white/[0.10]" href={PUBLIC_SITE_PATHS.pricing}>
                      Katso hinnat ja kayttoonotto
                    </a>
                    <a className="rounded-[20px] border border-white/10 bg-white/[0.06] px-4 py-3 transition hover:bg-white/[0.10]" href={PUBLIC_SITE_PATHS.contact}>
                      Avaa yhteystiedot
                    </a>
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-12 gap-2 rounded-full bg-white px-6 text-sm text-slate-950 hover:bg-white/90">
                    <a href={PUBLIC_SITE_PATHS.demo}>
                      Pyydä demo
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-6 text-sm text-white hover:bg-white/10">
                    <a href={PUBLIC_SITE_PATHS.features}>Tutustu ominaisuuksiin</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[linear-gradient(135deg,#111827_0%,#1f2937_100%)]">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Seuraava askel</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Kun tarjous on tyon lahtopiste, sita ei kannata ohjata irrallisilla tiedostoilla.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/[0.72]">
                Jos arvioit uutta tarjouslaskentaohjelmaa rakennusalalle, seuraava askel on nahda miten oma tarjousprosessi, katepaatos ja dokumenttiviennit saadaan samaan kokonaisuuteen. Nykyinen käyttäjä pääsee edelleen suoraan kirjautumiseen.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild className="h-12 gap-2 rounded-full bg-white px-7 text-sm text-slate-950 hover:bg-white/[0.92]">
                  <a href={PUBLIC_SITE_PATHS.demo}>
                    Pyydä demo
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-7 text-sm text-white hover:bg-white/10">
                  <a href={PUBLIC_SITE_PATHS.pricing}>Katso hinnat ja kayttoonotto</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
