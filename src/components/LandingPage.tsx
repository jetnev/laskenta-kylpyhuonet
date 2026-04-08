import { useEffect } from 'react';
import {
  ArrowRight,
  Buildings,
  CalendarBlank,
  CalendarCheck,
  ChartBar,
  CheckCircle,
  Clock,
  CurrencyCircleDollar,
  FileText,
  Folder,
  FolderOpen,
  Gear,
  HardHat,
  ListChecks,
  Lock,
  MagnifyingGlass,
  Package,
  PlayCircle,
  ShieldCheck,
  Warning,
  Wrench,
  X,
} from '@phosphor-icons/react';

import LegalDocumentLinks from './legal/LegalDocumentLinks';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { applyDocumentMetadata } from '../lib/document-metadata';
import { APP_MARKETING_META_DESCRIPTION, APP_NAME, buildDemoMailtoUrl, buildDocumentTitle } from '../lib/site-brand';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

type Tone = 'slate' | 'sky' | 'amber' | 'emerald';

interface SignalItem {
  icon: typeof FolderOpen;
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
    icon: FolderOpen,
    title: 'Tarjousversiot hallitusti',
    text: 'Luonnos, lähetetty ja hyväksytty tarjous pysyvät samassa jatkumossa ilman tiedostokaaosta.',
  },
  {
    icon: CurrencyCircleDollar,
    title: 'Kate näkyy ennen lähetystä',
    text: 'Marginaali, lisäkulut ja loppusumma voidaan tarkistaa ennen kuin tarjous lähtee asiakkaalle.',
  },
  {
    icon: CalendarCheck,
    title: 'Projekti jatkuu samasta datasta',
    text: 'Hyväksytty tarjous toimii projektin, määräaikojen ja laskutuksen lähtöpisteenä.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Tarjouspyynnöt samaan työtilaan',
    text: 'Tarjousäly tuo dokumentit, katselmoinnin ja siirtopolun osaksi samaa palvelukokonaisuutta.',
  },
];

const workspaceViews: WorkspaceView[] = [
  {
    value: 'tarjous',
    label: 'Tarjous',
    eyebrow: 'Tarjousvalmistelu',
    title: 'Rakenna tarjous samasta tietopohjasta, josta projekti jatkuu.',
    description:
      'Tuotteet, vaihtoehdot, hinnat ja versiot pysyvät yhdessä työtilassa. Sama tarjous ei katoa sähköpostiketjuun tai irrallisiin tiedostoihin.',
    highlights: ['Tuoterekisteri', 'Vaihtoehdot', 'Sisäinen yhteenveto'],
    metrics: [
      { label: 'Työtila', value: 'Julkisivun korjaus / vaihe 2', tone: 'slate' },
      { label: 'Versio', value: 'TAR-20260408-02', tone: 'sky' },
      { label: 'Status', value: 'Lähetetty', tone: 'amber' },
    ],
    rows: [
      { label: 'Tuoterivi', detail: 'Laatta 60x60 matt / 42 m²', value: '5 980 €' },
      { label: 'Asennus', detail: 'Asennus, suojaus ja viimeistely', value: '3 920 €' },
      { label: 'Vaihtoehto', detail: 'Korvaava pintamateriaali perusteluineen', value: '1 480 €' },
      { label: 'Yhteenveto', detail: 'Tarjous säilyy samassa työtilassa asiakas- ja kohdetiedon kanssa', value: '17 368 €' },
    ],
    notes: [
      {
        title: 'Versiointi pysyy luettavana',
        text: 'Uudet kierrokset eivät irtoa historiasta, vaan sama tarjousketju säilyy hallittuna.',
      },
      {
        title: 'Tuotetieto ei ala alusta',
        text: 'Tuote- ja hintapohja voidaan ylläpitää yhdessä rekisterissä koko tiimille.',
      },
      {
        title: 'Ammattimainen ulosvienti',
        text: 'Asiakasnäkyvä tarjous ja sisäinen tarkistusmateriaali voidaan erottaa samasta lähteestä.',
      },
    ],
  },
  {
    value: 'kate',
    label: 'Kate',
    eyebrow: 'Kateohjaus',
    title: 'Tarkista päätös ennen lähetystä, ei vasta projektin aikana.',
    description:
      'Kun tarjouskohtainen kate, lisäkulut ja loppusumma ovat samassa näkymässä, lähetyspäätös perustuu läpinäkyvään tietoon.',
    highlights: ['Lisäkulut', 'Kertoimet', 'Sisäinen audit trail'],
    metrics: [
      { label: 'Kate-ennuste', value: '18,4 %', tone: 'emerald' },
      { label: 'Lisäkulut', value: '1 280 €', tone: 'amber' },
      { label: 'Päätöstila', value: 'Valmis tarkistukseen', tone: 'sky' },
    ],
    rows: [
      { label: 'Rivien välisumma', detail: 'Tuotteet, asennus ja hyväksytyt vaihtoehdot', value: '12 560 €' },
      { label: 'Projektikerroin', detail: 'Kohteen laajuus ja alueellinen hinnoittelu', value: '+8 %' },
      { label: 'ALV 25,5 %', detail: 'Asiakasnäkyvä loppuerittely tarjousta varten', value: '3 528 €' },
      { label: 'Loppusumma', detail: 'Sama yhteenveto sisäiseen päätökseen ja ulkoiseen tarjoukseen', value: '17 368 €' },
    ],
    notes: [
      {
        title: 'Kate näkyy oikeassa kohdassa',
        text: 'Marginaali tarkistetaan ennen lähetystä eikä vasta silloin, kun projekti on jo käynnissä.',
      },
      {
        title: 'Sisäinen tarkistus pysyy dokumentoituna',
        text: 'Lisäkulut, kertoimet ja poikkeamat voidaan käydä läpi samassa näkymässä.',
      },
      {
        title: 'Päätöksenteko pysyy uskottavana',
        text: 'Myynti, laskenta ja johto katsovat samaa yhteenvetoa, eivät eri tiedostoja.',
      },
    ],
  },
  {
    value: 'projekti',
    label: 'Projekti',
    eyebrow: 'Projektin käynnistys',
    title: 'Jatka hyväksytty tarjous projektiksi ilman käsin tehtävää siivousta.',
    description:
      'Kohdetiedot, aikataulut, asiakkaan lähtötiedot ja laskutuksen pohja pysyvät kiinni samassa kokonaisuudessa.',
    highlights: ['Deadline-näkymä', 'Snapshot-laskutus', 'Kohdetieto'],
    metrics: [
      { label: 'Aloitus', value: '15.4.2026', tone: 'sky' },
      { label: 'Toimitus', value: '23.4.2026', tone: 'amber' },
      { label: 'Laskutus', value: 'Snapshot aktiivinen', tone: 'emerald' },
    ],
    rows: [
      { label: 'Kohde', detail: 'As Oy Merisilta / B-rappu / märkätilat', value: 'Valmis' },
      { label: 'Työvaiheet', detail: 'Toimitus, aloitus, valmistuminen ja vastuuhenkilöt', value: '4 vaihetta' },
      { label: 'Deadline-tuki', detail: 'Määräajat näkyvät samassa kokonaisuudessa tarjouksen kanssa', value: 'Seurannassa' },
      { label: 'Laskutuspohja', detail: 'Alkuperäinen tarjousdata säilyy snapshotissa laskutusta varten', value: 'Lukittu' },
    ],
    notes: [
      {
        title: 'Hyväksytty tarjous ei katkea',
        text: 'Projektin lähtötieto on sama kuin myyntivaiheessa hyväksytty kokonaisuus.',
      },
      {
        title: 'Aikataulut pysyvät näkyvissä',
        text: 'Määräajat, toimitus ja työn käynnistys voidaan seurata samassa ympäristössä.',
      },
      {
        title: 'Laskutus ei elä takautuvasti',
        text: 'Snapshot-pohja auttaa säilyttämään alkuperäisen tarjouksen laskutuksen viitepisteenä.',
      },
    ],
  },
  {
    value: 'tarjousaly',
    label: 'Tarjousäly',
    eyebrow: 'Tarjouspyyntöjen katselmointi',
    title: 'Kokoa tarjouspyyntö, nosta havainnot ja siirrä valmisteltu sisältö hallitusti tarjoukseen.',
    description:
      'Tarjousäly ei lupaa mustaa laatikkoa, vaan katselmoitavan valmistelupolun: dokumentit, havainnot, riskit ja tuonti samaan työtilaan.',
    highlights: ['Dokumenttikoonti', 'Deterministinen analyysi', 'Hallittu import'],
    metrics: [
      { label: 'Paketti', value: '14 dokumenttia', tone: 'slate' },
      { label: 'Nostot', value: '12 kohtaa', tone: 'amber' },
      { label: 'Tuonti', value: 'Valmis luonnokseen', tone: 'emerald' },
    ],
    rows: [
      { label: 'Vaatimukset', detail: 'Toimitusrajat, vastuukohdat ja tekniset ehdot', value: '6 havaintoa' },
      { label: 'Riskit', detail: 'Puuttuvat tiedot, tarkennettavat kohdat ja huomautukset', value: '3 nostoa' },
      { label: 'Evidenssi', detail: 'Dokumentoitavat lähteet katselmointia varten', value: '8 viitettä' },
      { label: 'Tuotava sisältö', detail: 'Valmistellut osat voidaan viedä tarjouksen pohjaksi hallitussa polussa', value: 'Luonnos valmis' },
    ],
    notes: [
      {
        title: 'Tarjouspyyntöpaketti yhteen paikkaan',
        text: 'Katselmointi ei jää irrallisten dokumenttien ja sähköpostien varaan.',
      },
      {
        title: 'Deterministinen, ei musta laatikko',
        text: 'Tavoite on tehdä löydökset läpinäkyviksi ja katselmoitaviksi ennen jatkotyötä.',
      },
      {
        title: 'Hallitusti tarjouksen pohjaksi',
        text: 'Valmistelun tulos voidaan siirtää tarjousvaiheeseen ilman irrallista kopiointia.',
      },
    ],
  },
];

const operationalRisks = [
  'Tarjousversiot hajaantuvat kansioihin, sähköposteihin ja työpöydille.',
  'Hinnat, lisäkulut ja huomautukset elävät eri paikoissa eri ihmisillä.',
  'Kate tarkistetaan liian myöhään tai vain osittaisen tiedon perusteella.',
  'Hyväksytyn tarjouksen tieto katkeaa juuri siinä kohdassa, jossa työ pitäisi käynnistää.',
];

const operationalOutcomes = [
  'Tarjoukset, versiot ja asiakaskohtainen konteksti pysyvät samassa työtilassa.',
  'Tuote- ja hintatieto voidaan keskittää yhden rekisterin alle.',
  'Kate, lisäkulut ja loppusumma ovat näkyvissä ennen lähetyspäätöstä.',
  'Hyväksytty tarjous voi jatkua projektiksi ja laskutuksen viitepisteeksi ilman käsityötä.',
];

const capabilityCards = [
  {
    icon: FileText,
    title: 'Tarjouslaskenta ja versiot',
    text: 'Muodosta tarjoukset hallitusta tietopohjasta ja pidä muutokset samassa versioidussa ketjussa.',
    bullets: [
      'Tarjousrivit, vaihtoehdot ja versiot saman projektin alla.',
      'Asiakas- ja kohdetieto pysyy mukana koko valmistelun ajan.',
      'Ammattimainen ulosvienti asiakkaalle ja sisäisesti tarkempaan reviewhyn.',
    ],
  },
  {
    icon: CurrencyCircleDollar,
    title: 'Kateohjaus päätöksen tueksi',
    text: 'Pidä marginaali, lisäkulut ja loppusumma näkyvissä siellä, missä päätös tehdään.',
    bullets: [
      'Tarjouskohtainen kate ennen lähettämistä.',
      'Lisäkulut, kertoimet ja yhteenveto samassa näkymässä.',
      'Sisäinen tarkistus ilman erillistä laskentatiedostoa.',
    ],
  },
  {
    icon: Package,
    title: 'Tuote- ja hintarekisteri',
    text: 'Ylläpidä tuotteet, hinnat, asennusryhmät ja korvaavat vaihtoehdot samassa palvelussa.',
    bullets: [
      'Yksi paikka tuotekoodeille, hintatiedolle ja ryhmittelylle.',
      'Korvaavat tuotteet ja perustelut pysyvät hallinnassa.',
      'Vähemmän käsin koottuja rivejä jokaiselle tarjouskierrokselle.',
    ],
  },
  {
    icon: CalendarBlank,
    title: 'Projekti ja deadline-seuranta',
    text: 'Hyväksytty tarjous voi jatkua projektinäkymään ilman, että lähtötieto katoaa matkalla.',
    bullets: [
      'Toimitus-, aloitus- ja valmistumispäivät saman kohteen yhteydessä.',
      'Määräajat näkyviin työtilan sisällä, ei vain kalenterimuistioissa.',
      'Kohteen lähtötieto pysyy sidottuna alkuperäiseen tarjoukseen.',
    ],
  },
  {
    icon: ChartBar,
    title: 'Raportointi ja tilannekuva',
    text: 'Nosta johdon, laskennan ja projektivastuullisten tarvitsema näkymä samasta tietopohjasta.',
    bullets: [
      'Tarjousten, projektien ja katteen kehitys yhdessä raportoinnissa.',
      'Tuote- ja myyntinäkymät saman palvelun sisällä.',
      'Johto ei joudu kokoamaan tilannekuvaa hajanaisista lähteistä.',
    ],
  },
  {
    icon: ListChecks,
    title: 'Tarjousäly ja katselmointi',
    text: 'Kokoa tarjouspyyntöpaketti samaan työtilaan ja vie valmisteltu sisältö hallitusti tarjouksen pohjaksi.',
    bullets: [
      'Dokumenttikoonti, havaintojen nosto ja riskien jäsennys.',
      'Deterministinen katselmointipolku ilman mustan laatikon lupauksia.',
      'Hallittu siirto normaalin tarjousprosessin jatkoksi.',
    ],
  },
];

const processSteps = [
  {
    step: '01',
    icon: Folder,
    title: 'Kokoa lähtötieto',
    text: 'Projektin asiakas-, kohde- ja tarjouspyyntötieto saadaan samaan työtilaan heti alussa.',
  },
  {
    step: '02',
    icon: FileText,
    title: 'Rakenna tarjous',
    text: 'Tarjous muodostetaan rekisteristä, versiot säilyvät luettavina ja sisältö pysyy hallittuna.',
  },
  {
    step: '03',
    icon: CurrencyCircleDollar,
    title: 'Tarkista kate',
    text: 'Marginaali, lisäkulut ja loppusumma tarkistetaan ennen lähetystä samalla kun sisältö lukitaan.',
  },
  {
    step: '04',
    icon: CalendarCheck,
    title: 'Käynnistä projekti',
    text: 'Hyväksytty tarjous jatkuu projektin lähtöpisteeksi, määräajoiksi ja laskutuksen viitepohjaksi.',
  },
];

const roleCards = [
  {
    icon: ChartBar,
    title: 'Johdolle',
    text: 'Kun tarvitset näkyvyyden siihen, miten tarjouskanta, kate ja käynnissä olevat kohteet oikeasti liikkuvat.',
    bullets: [
      'Tilannekuva tarjouksista, projekteista ja raporteista samassa ympäristössä.',
      'Vähemmän tulkinnanvaraa siitä, millä tiedolla päätöksiä tehdään.',
      'Selkeämpi tapa ohjata liiketoiminnan kriittistä päätöspistettä.',
    ],
  },
  {
    icon: HardHat,
    title: 'Tarjouslaskennalle',
    text: 'Kun tarjoukset pitää saada ulos hallitusti ilman jatkuvaa tiedostojen yhdistelemistä tai hintojen etsimistä.',
    bullets: [
      'Tuote- ja hintarekisteri tukee toistuvaa tarjousvalmistelua.',
      'Versiot, vaihtoehdot ja sisäinen yhteenveto pysyvät samassa ketjussa.',
      'Tarjousäly voi tuoda katselmoinnin osaksi samaa valmistelupolkua.',
    ],
  },
  {
    icon: Wrench,
    title: 'Projektivastuulle',
    text: 'Kun hyväksytyn tarjouksen pitää muuttua työn käynnistykseksi ilman, että tieto siivotaan käsin uusiksi.',
    bullets: [
      'Kohteen lähtötieto, aikataulu ja vastuupisteet saman polun jatkona.',
      'Deadline-seuranta kytkeytyy samaan kokonaisuuteen kuin tarjousvaihe.',
      'Snapshot-laskutus auttaa säilyttämään alkuperäisen tarjouksen viitepisteenä.',
    ],
  },
];

const industryItems = [
  { icon: HardHat, label: 'Urakoitsijat' },
  { icon: Wrench, label: 'Talotekniikka' },
  { icon: Buildings, label: 'Remontointi' },
  { icon: ListChecks, label: 'Asennusliiketoiminta' },
  { icon: Package, label: 'Rakennusalan palveluyritykset' },
];

const intelligenceSteps = [
  {
    icon: FolderOpen,
    title: 'Tarjouspyyntöpaketin koonti',
    text: 'Dokumentit, liitteet ja valmistelun kannalta olennainen lähtötieto kootaan samaan työtilaan.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Deterministinen katselmointi',
    text: 'Vaatimukset, riskit, puutteet ja evidenssi voidaan jäsentää katselmointia varten ilman mustan laatikon lupausta.',
  },
  {
    icon: FileText,
    title: 'Hallittu siirto tarjoukseen',
    text: 'Valmisteltu sisältö voidaan viedä tarjouksen luonnokseen versiona, jota jatketaan normaalissa työvirrassa.',
  },
];

const faqItems = [
  {
    question: 'Onko Projekta vain tarjouksen ulkoasun työkalu?',
    answer:
      'Ei. Tavoite on pitää tarjouslaskenta, kate, versiot, projektin käynnistys ja osa katselmointityöstä samassa hallitussa työtilassa. Asiakasnäkyvä lopputulos on vain yksi osa kokonaisuutta.',
  },
  {
    question: 'Pitääkö koko toimintamalli vaihtaa kerralla?',
    answer:
      'Ei välttämättä. Käyttö voi alkaa siitä kohdasta, jossa hajanaisuus sattuu eniten: tarjousversioista, kate-reviewsta, tuote- ja hintarekisteristä tai hyväksytyn tarjouksen siirrosta projektiksi.',
  },
  {
    question: 'Mitä Tarjousäly tarkoittaa käytännössä?',
    answer:
      'Tarjousäly tarkoittaa tarjouspyyntöpaketin koontia, havaintojen jäsentämistä ja katselmoitavaa siirtopolkua tarjousvalmisteluun. Se ei väitä korvaavansa päätöksentekoa mustalla laatikolla.',
  },
  {
    question: 'Voiko nykyinen käyttäjä tulla sivulta suoraan työtilaan?',
    answer:
      'Kyllä. Etusivu toimii samalla julkisena etuovena ja nopeana polkuna kirjautumiseen nykyisille käyttäjille.',
  },
  {
    question: 'Miksi tämä on kaupallisesti tärkeää?',
    answer:
      'Koska tarjous on monessa rakennusalan yrityksessä työn käynnistymisen kriittinen päätöspiste. Jos tieto on hajallaan juuri siinä kohdassa, riski siirtyy suoraan katteeseen, käynnistykseen ja johdon näkyvyyteen.',
  },
];

const trustItems = [
  {
    icon: ShieldCheck,
    title: 'Virallinen julkinen etuovi',
    text: 'Julkinen sivu, kirjautuminen ja työtilaan siirtyminen kuuluvat samaan palvelukokonaisuuteen.',
  },
  {
    icon: Lock,
    title: 'Julkiset juridiset dokumentit',
    text: 'Käyttöehdot, tietosuoja ja muut dokumentit voidaan tuoda luettaviksi saman domainin alla.',
  },
  {
    icon: Clock,
    title: 'Suoraan takaisin työn ääreen',
    text: 'Nykyinen käyttäjä ei tarvitse erillistä navigaatiokierrosta, vaan pääsee suoraan kirjautumiseen.',
  },
  {
    icon: Gear,
    title: 'Operatiiviseen käyttöön rakennettu',
    text: 'Palvelu on tarkoitettu tarjous- ja projektiohjauksen arkeen, ei pelkäksi markkinointikerrokseksi.',
  },
];

function handleRequestDemo() {
  window.location.href = buildDemoMailtoUrl();
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
}

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

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  useEffect(() => {
    applyDocumentMetadata({
      title: buildDocumentTitle('Rakennusalan tarjous- ja projektiohjaus'),
      description: APP_MARKETING_META_DESCRIPTION,
      pathname: '/',
      siteUrl: import.meta.env.VITE_SITE_URL?.trim(),
    });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f2ed] text-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.10),transparent_34%),radial-gradient(circle_at_84%_4%,rgba(180,83,9,0.10),transparent_26%),linear-gradient(180deg,#f3f2ed_0%,#f8fafc_52%,#ffffff_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[540px] bg-[linear-gradient(180deg,rgba(15,23,42,0.04),transparent)]" />

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f3f2ed]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-6">
          <button className="min-w-0 text-left" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold tracking-tight text-slate-950">{APP_NAME}</div>
              <Badge variant="outline" className="hidden rounded-full border-slate-300 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:inline-flex">
                Rakennusalan tarjous- ja projektiohjaus
              </Badge>
            </div>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            <a className="transition hover:text-slate-950" href="#ratkaisu">Miksi</a>
            <a className="transition hover:text-slate-950" href="#tyotila">Työtila</a>
            <a className="transition hover:text-slate-950" href="#tarjousaly">Tarjousäly</a>
            <a className="transition hover:text-slate-950" href="#faq">FAQ</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" className="hidden border-slate-300 bg-white/70 text-slate-700 hover:bg-white sm:inline-flex" onClick={handleRequestDemo}>
              Varaa esittely
            </Button>
            <Button className="h-10 gap-2 rounded-full px-5 text-sm shadow-[0_18px_30px_-18px_rgba(15,23,42,0.8)]" onClick={onNavigateToLogin}>
              Kirjaudu sisään
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-start lg:gap-12 lg:pb-28 lg:pt-20">
            <div className="max-w-2xl">
              <Badge className="rounded-full border border-slate-300 bg-white/[0.85] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm hover:bg-white">
                Projekta rakennusalan tarjous- ja projektiohjaukseen
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[3.45rem] lg:text-[4.1rem]">
                Ohjaa tarjous, kate, projekti ja tarjouspyynnön katselmointi samassa työtilassa.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Projekta on rakennusalan yrityksille suunniteltu palvelu, joka kokoaa tarjouslaskennan, tuote- ja hintatiedon, projektin käynnistyksen sekä Tarjousälyn saman hallitun kokonaisuuden alle. Kun tarjous ei hajoa irrallisiksi tiedostoiksi, myös päätös on helpompi tehdä oikein.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button className="h-12 gap-2 rounded-full px-7 text-sm shadow-[0_24px_40px_-22px_rgba(15,23,42,0.8)]" onClick={onNavigateToLogin}>
                  Kirjaudu sisään
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-12 rounded-full border-slate-300 bg-white/70 px-7 text-sm text-slate-700 hover:bg-white" onClick={handleRequestDemo}>
                  Varaa esittely
                </Button>
                <Button variant="ghost" className="h-12 rounded-full px-5 text-sm text-slate-700 hover:bg-white/70" onClick={() => scrollToSection('tyotila')}>
                  <PlayCircle className="h-4 w-4" />
                  Katso työtila
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {topSignals.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-slate-200/90 bg-white/80 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.38)] backdrop-blur"
                    >
                      <div className="flex items-center gap-3 text-sm font-semibold text-slate-950">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Icon className="h-5 w-5" weight="bold" />
                        </span>
                        {item.title}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                    </div>
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
                      className="min-h-[56px] rounded-[18px] border border-transparent px-4 py-3 text-left text-xs font-semibold leading-5 text-slate-600 data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-950"
                    >
                      {view.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {workspaceViews.map((view) => (
                  <TabsContent key={view.value} value={view.value} className="mt-4">
                    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_80px_-44px_rgba(15,23,42,0.42)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-6 py-5">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{view.eyebrow}</div>
                          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{view.title}</h2>
                        </div>
                        <Badge variant="outline" className="rounded-full border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          Esimerkkityötila
                        </Badge>
                      </div>

                      <div className="grid gap-6 p-6 lg:grid-cols-[1.18fr_0.82fr]">
                        <div>
                          <p className="max-w-2xl text-sm leading-7 text-slate-600">{view.description}</p>
                          <div className="mt-5 flex flex-wrap gap-2.5">
                            {view.highlights.map((highlight) => (
                              <span
                                key={highlight}
                                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>

                          <div className="mt-6 grid gap-3 md:grid-cols-3">
                            {view.metrics.map((metric) => (
                              <div key={metric.label} className={`rounded-[20px] border p-4 ${getMetricClasses(metric.tone)}`}>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{metric.label}</div>
                                <div className="mt-2 text-lg font-semibold tracking-[-0.02em]">{metric.value}</div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/75">
                            <div className="grid grid-cols-[0.85fr_1.4fr_auto] gap-3 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              <div>Ohjauspiste</div>
                              <div>Selite</div>
                              <div className="text-right">Arvo</div>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {view.rows.map((row) => (
                                <div key={`${view.value}-${row.label}`} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[0.85fr_1.4fr_auto] sm:items-center">
                                  <div className="font-semibold text-slate-950">{row.label}</div>
                                  <div className="text-slate-600">{row.detail}</div>
                                  <div className="text-right font-semibold text-slate-950">{row.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {view.notes.map((note) => (
                            <div key={`${view.value}-${note.title}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.3)]">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                                  <CheckCircle className="h-4 w-4" weight="fill" />
                                </span>
                                <div>
                                  <div className="text-sm font-semibold text-slate-950">{note.title}</div>
                                  <p className="mt-2 text-sm leading-7 text-slate-600">{note.text}</p>
                                </div>
                              </div>
                            </div>
                          ))}

                          <div className="rounded-[24px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.8)]">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Miksi tämä on tärkeää</div>
                            <p className="mt-3 text-sm leading-7 text-white/80">
                              Kun tarjous toimii työn todellisena lähtöpisteenä, myös myynnin, katselmoinnin ja projektin käynnistyksen pitää nojata samaan tietoon. Tässä kohtaa Projekta tekee arjesta hallitumman.
                            </p>
                          </div>
                        </div>
                      </div>
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
                  Tarjous on työn käynnistymisen kriittinen päätöspiste, ei irrallinen dokumentti.
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Jos tarjousprosessin tieto elää eri kansioissa, eri laskelmissa ja eri ihmisillä, kaupallinen riski syntyy jo ennen kuin työ on alkanut. Silloin ongelma ei ole vain hitaus, vaan ohjauksen puute.
                </p>

                <div className="mt-8 rounded-[28px] border border-amber-200/80 bg-amber-50/80 p-6 shadow-[0_18px_42px_-32px_rgba(120,53,15,0.35)]">
                  <div className="flex items-center gap-3 text-sm font-semibold text-amber-950">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Warning className="h-5 w-5" weight="fill" />
                    </span>
                    Kun tarjous ohjataan hajanaisesta tiedosta
                  </div>
                  <p className="mt-4 text-sm leading-7 text-amber-950/80">
                    päätös tehdään usein ennen kuin kate, riskit, toimitusrajat tai projektin käynnistämiseen tarvittava lähtötieto ovat oikeasti samalla pöydällä.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[32px] border border-[#5e2623] bg-[#271819] p-7 text-white shadow-[0_28px_60px_-38px_rgba(39,24,25,0.88)]">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/80">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <X className="h-4 w-4" weight="bold" />
                    </span>
                    Ilman hallittua työtilaa
                  </div>
                  <ul className="mt-6 space-y-4">
                    {operationalRisks.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-7 text-white/80">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-300" />
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
                    Projektalla
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
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Mitä tällä tehdään</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Projekta ei myy yhtä näkymää. Se kokoaa työvaiheet, joiden pitää pysyä yhdessä.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Etusivun pitää pystyä kertomaan nopeasti, mitä palvelulla oikeasti tehdään. Siksi alla ei ole geneerisiä hyötylauseita, vaan tuotteen toiminnalliset ydinalueet.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {capabilityCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.32)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{card.title}</h3>
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
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#162033_52%,#1f2937_100%)] text-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Ohjausketju</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Yksi työtila tarjouspyynnöstä projektin käynnistykseen.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/75">
                Paras etusivu ei vain lupaa hyötyä, vaan näyttää prosessin. Projektan kaupallinen ydin on siinä, että tarjouslaskenta, katselmointi, katepäätös ja projektin alku pysyvät kiinni samassa polussa.
              </p>
            </div>

            <div className="mt-14 grid gap-5 xl:grid-cols-4">
              {processSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <div key={step.step} className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/[0.55]">{step.step}</span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <Icon className="h-5 w-5" weight="bold" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-xl font-semibold tracking-[-0.025em] text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/[0.72]">{step.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.06] px-6 py-5 text-sm leading-7 text-white/75 backdrop-blur-sm">
              Tarjousäly voidaan kytkeä ketjun alkuun silloin, kun tarjouspyyntöpaketin koonti, havaintojen jäsentäminen ja hallittu siirto tarjousvalmisteluun halutaan tuoda saman palvelun alle.
            </div>
          </div>
        </section>

        <section id="kenelle" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Kenelle</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Hyöty näkyy heti siellä, missä tarjous vaikuttaa päivittäiseen työhön.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Projekta on tehty yrityksille, joille tarjous ei ole hallinnollinen liite vaan liiketoiminnan, katteen ja projektin käynnistymisen ohjauspiste.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {roleCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="rounded-[28px] border border-slate-200 bg-[#f6f7f3] p-6 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.26)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">{card.title}</h3>
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
                  <div key={item.label} className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
                    <Icon className="h-4 w-4 text-slate-500" weight="bold" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="tarjousaly" className="border-t border-slate-200 bg-[#f6f7f3]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.86fr_1.14fr] lg:items-start lg:py-24">
            <div className="max-w-xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Tarjousäly</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Tarjouspyyntöjen katselmointi osaksi hallittua tarjousprosessia.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Tarjousäly on tarkoitettu tilanteisiin, joissa tarjouspyyntöpaketin sisältö, vaatimukset ja riskit pitää saada samaan työtilaan ennen varsinaista tarjousta. Se vahvistaa tarjouksen valmistelua, ei korvaa harkintaa epämääräisellä automaatiolupauksella.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {['Ei mustaa laatikkoa', 'Katselmoitava polku', 'Hallittu siirto tarjoukseen'].map((item) => (
                  <span key={item} className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.25)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-950">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <MagnifyingGlass className="h-5 w-5" weight="bold" />
                  </span>
                  Mitä tämä tarkoittaa käytännössä?
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Sama palvelu voi tukea sekä varsinaista tarjouslaskentaa että tarjouspyynnön läpikäyntiä, jolloin vaatimukset, riskit, puuttuvat tiedot ja luonnokseen vietävä sisältö eivät jää erillisiksi muistiinpanoiksi.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {intelligenceSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.title}
                    className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.28)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
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
                  Vastauksia kysymyksiin, jotka ratkaisevat etusivun uskottavuuden.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Etusivun myyntipuheen pitää kestää myös kriittinen lukutapa. Siksi tärkeät vastaukset kannattaa sanoa suoraan ilman ylilupauksia.
                </p>

                <div className="mt-8 rounded-[28px] border border-slate-200 bg-[#f6f7f3] px-6 py-3">
                  <Accordion type="single" collapsible>
                    {faqItems.map((item) => (
                      <AccordionItem key={item.question} value={item.question} className="border-slate-200">
                        <AccordionTrigger className="py-5 text-base font-semibold text-slate-950 hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 pr-8 text-sm leading-7 text-slate-600">
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
                  Virallinen, kaupallinen ja käytännönläheinen etuovi samassa palvelussa.
                </h3>
                <div className="mt-7 grid gap-4">
                  {trustItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                            <Icon className="h-5 w-5" weight="bold" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                            <p className="mt-2 text-sm leading-7 text-white/75">{item.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button className="h-12 gap-2 rounded-full bg-white px-6 text-sm text-slate-950 hover:bg-white/90" onClick={onNavigateToLogin}>
                    Kirjaudu sisään
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-6 text-sm text-white hover:bg-white/10" onClick={handleRequestDemo}>
                    Varaa esittely
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
                Kun tarjous on työn lähtöpiste, sitä ei kannata ohjata irrallisilla tiedostoilla.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/[0.72]">
                Nykyinen käyttäjä pääsee tästä suoraan työtilaan. Jos arvioit ratkaisua ensimmäistä kertaa, esittelyssä voidaan käydä läpi tarjouslaskenta, kateohjaus, Tarjousäly ja projektin jatkovaiheet saman kokonaisuuden sisällä.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button className="h-12 gap-2 rounded-full bg-white px-7 text-sm text-slate-950 hover:bg-white/[0.92]" onClick={onNavigateToLogin}>
                  Kirjaudu sisään
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-7 text-sm text-white hover:bg-white/10" onClick={handleRequestDemo}>
                  Varaa esittely
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-lg font-semibold tracking-tight text-slate-950">{APP_NAME}</div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Projekta kokoaa tarjouslaskennan, kateohjauksen, projektin jatkovaiheet ja tarjouspyyntöjen katselmoinnin samaan hallittuun työtilaan rakennusalan yrityksille.
            </p>
            <LegalDocumentLinks className="mt-4" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={onNavigateToLogin}>
              Kirjaudu sisään
            </Button>
            <Button onClick={handleRequestDemo}>Varaa esittely</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}