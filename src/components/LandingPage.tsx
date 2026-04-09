import { useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ArrowRight,
  Buildings,
  CalendarCheck,
  ChartBar,
  CheckCircle,
  CurrencyCircleDollar,
  FileText,
  MagnifyingGlass,
  Package,
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

interface WorkspaceView {
  value: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  metrics: WorkspaceMetric[];
  rows: WorkspaceRow[];
}

const workspaceViews: WorkspaceView[] = [
  {
    value: 'tarjouseditori',
    label: 'Tarjouseditori',
    eyebrow: 'Tarjouslaskenta',
    title: 'Tarjous, rivit ja versiot samassa editorissa',
    description:
      'Tarjouseditori kuuluu samaan työtilaan kuin kohde-, asiakas- ja versioketju. Tieto ei elä erikseen Excelissä, PDF:ssä ja muistiinpanoissa.',
    highlights: ['Versiot', 'Tuoterekisteri'],
    metrics: [
      { label: 'Tarjous', value: 'TAR-20260408-02', tone: 'sky' },
      { label: 'Kohde', value: 'Julkisivun korjaus / vaihe 2', tone: 'slate' },
      { label: 'Status', value: 'Valmis tarkistukseen', tone: 'amber' },
    ],
    rows: [
      { label: 'Laatta 60×60 matt', detail: '42 m² — materiaali', value: '5 980 EUR' },
      { label: 'Asennus ja viimeistely', detail: 'Suojaus, siisteys, vastaanotto', value: '3 920 EUR' },
      { label: 'Vaihtoehto', detail: 'Korvaava pintamateriaali', value: '1 480 EUR' },
      { label: 'Yhteensä (alv 0 %)', detail: 'Tarkastettu, valmis lähetykseen', value: '17 368 EUR' },
    ],
  },
  {
    value: 'katselmointi',
    label: 'Tarjouspyynnöt',
    eyebrow: 'Katselmointi',
    title: 'Tarjouspyyntö samaan työtilaan ennen hintapäätöstä',
    description:
      'Dokumentit, vaatimukset, riskit ja puuttuvat tiedot käydään läpi ennen varsinaista tarjousta. Valmis sisältö siirtyy hallitusti tarjouseditoriin.',
    highlights: ['Riskit', 'Siirto editoriin'],
    metrics: [
      { label: 'Paketti', value: '14 dokumenttia', tone: 'slate' },
      { label: 'Nostot', value: '12 havaintoa', tone: 'amber' },
      { label: 'Valmius', value: 'Valmis luonnokseen', tone: 'emerald' },
    ],
    rows: [
      { label: 'Vaatimukset', detail: 'Toimitusrajat, vastuukohdat, tekn. ehdot', value: '6 havaintoa' },
      { label: 'Riskit', detail: 'Puuttuvat tiedot ja tarkennettavat kohdat', value: '3 nostoa' },
      { label: 'Evidenssi', detail: 'Dokumentoitavat lähteet katselmointia varten', value: '8 viitettä' },
      { label: 'Siirto', detail: 'Valmisteltu sisältö viedään tarjouseditoriin', value: 'Valmis' },
    ],
  },
  {
    value: 'kateohjaus',
    label: 'Kateohjaus',
    eyebrow: 'Kateohjaus',
    title: 'Kate näkyy ennen päätöstä — ei projektin aikana',
    description:
      'Tarjouskohtainen kate, lisäkulut ja loppusumma ovat samassa näkymässä. Lähetyspäätös tehdään läpinäkyvän tiedon perusteella.',
    highlights: ['Lisäkulut', 'Sisäinen audit'],
    metrics: [
      { label: 'Kate-ennuste', value: '18,4 %', tone: 'emerald' },
      { label: 'Lisäkulut', value: '1 280 EUR', tone: 'amber' },
      { label: 'Päätöstila', value: 'Valmis tarkistukseen', tone: 'sky' },
    ],
    rows: [
      { label: 'Materiaalikate', detail: 'Ostot, kerroin ja varmuusvara', value: '11,2 %' },
      { label: 'Työkate', detail: 'Asennusryhmä, kesto, lisätyövaraus', value: '7,2 %' },
      { label: 'Lisäkulut', detail: 'Nostot, suojaus, matkakulut, poikkeamat', value: '1 280 EUR' },
      { label: 'Lähetyspäätös', detail: 'Kate tarkistettu — valmis lähetettäväksi', value: 'Hyväksytty' },
    ],
  },
  {
    value: 'projektiseuranta',
    label: 'Projektiseuranta',
    eyebrow: 'Projektijatkumo',
    title: 'Hyväksytty tarjous jatkuu projektiksi ilman katkoa',
    description:
      'Sama data, jolla tarjous tehtiin, toimii projektin lähtötietona. Aikataulut, viennit ja laskutusviite pysyvät samassa kokonaisuudessa.',
    highlights: ['PDF-vienti', 'Excel-vienti'],
    metrics: [
      { label: 'Aloitus', value: '15.4.2026', tone: 'sky' },
      { label: 'Toimitus', value: '23.4.2026', tone: 'amber' },
      { label: 'Laskutus', value: 'Snapshot aktiivinen', tone: 'emerald' },
    ],
    rows: [
      { label: 'Projektikortti', detail: 'Tarjouksesta avattu, kohde- ja yhteystiedoilla', value: 'Aktiivinen' },
      { label: 'Deadline', detail: 'Tilausvahvistus, aloitus ja toimitus samassa näkymässä', value: '3 vaihetta' },
      { label: 'PDF-vienti', detail: 'Asiakkaalle näkyvä tarjousdokumentti ulos', value: 'Valmis' },
      { label: 'Excel-vienti', detail: 'Sisäinen jatkokäsittely tai raportointi', value: 'Valmis' },
    ],
  },
];

const operationalProblems = [
  'Tarjousversiot hajaantuvat kansioihin, sähköposteihin ja tallentumattomiin tiedostoihin.',
  'Hinnat, lisäkulut ja huomiot elävät erikseen Excelissä, PDF:ssä ja muistiinpanoissa.',
  'Kate tarkistetaan liian myöhään tai vain osittaisen tiedon perusteella.',
  'Hyväksytyn tarjouksen tieto katkeaa juuri siinä kohdassa, jossa työ pitäisi käynnistää.',
];

const operationalOutcomes = [
  'Tarjouslaskenta, tarjouseditori ja versiot pysyvät samassa työtilassa.',
  'Kate, lisäkulut ja loppusumma ovat näkyvissä ennen lähetyspäätöstä.',
  'Hyväksytty tarjous voi jatkua projektiksi ilman käsin tehtävää siivousta.',
  'PDF- ja Excel-viennit syntyvät ohjelmistosta, eivät erillisestä tiedostoketjusta.',
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

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 gap-2 rounded-full px-7 text-sm shadow-[0_16px_40px_-16px_rgba(15,23,42,0.55)]">
                  <a href={PUBLIC_SITE_PATHS.demo}>
                    Pyydä demo
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-slate-300 bg-white/70 px-7 text-sm text-slate-700 hover:bg-white">
                  <a href={PUBLIC_FEATURE_LINKS.tarjouseditori}>Tutustu tarjouseditoriin</a>
                </Button>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Nykyinen käyttäjä?{' '}
                <a
                  href={PUBLIC_SITE_PATHS.login}
                  className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950"
                  onClick={(event) => handleLoginAnchorClick(event, onNavigateToLogin)}
                >
                  Kirjaudu sisään työtilaan.
                </a>
              </p>

              <nav aria-label="Sivun sisältö" className="mt-6 flex flex-wrap gap-2 text-sm">
                {[
                  { label: 'Tuote-esittely', href: '#tyotila' },
                  { label: 'Miksi vaihtaa Excelistä', href: '#ratkaisu' },
                  { label: 'Näin se toimii', href: '#miten-se-toimii' },
                  { label: 'Kenelle', href: '#kenelle' },
                  { label: 'FAQ', href: '#faq' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-slate-200 bg-white/70 px-3.5 py-1.5 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
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

                    <div className="mt-4 overflow-x-auto rounded-[18px] border border-slate-200 bg-[#f6f7f3]">
                      <div className="min-w-[380px]">
                        <div className="grid grid-cols-[1fr_1.5fr_auto] gap-3 border-b border-slate-200 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          <span>Rivi</span>
                          <span>Selite</span>
                          <span className="text-right">Arvo</span>
                        </div>
                        {view.rows.map((row) => (
                          <div
                            key={row.label}
                            className="grid grid-cols-[1fr_1.5fr_auto] gap-3 border-b border-slate-200/60 px-4 py-3.5 text-sm last:border-b-0"
                          >
                            <div className="font-semibold text-slate-950">{row.label}</div>
                            <div className="text-slate-500">{row.detail}</div>
                            <div className="text-right font-semibold text-slate-950">{row.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </section>

        {/* ── PROOF STRIP ────────────────────────────────────────── */}
        <section aria-label="Mitä Projekta antaa" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="grid overflow-hidden rounded-[20px] border border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: FileText,
                  title: 'Tarjouseditori yrityskäyttöön',
                  text: 'Rivit, versiot ja kohdetieto pysyvät yhdessä — ei erillisiä Excel-tiedostoja.',
                },
                {
                  icon: MagnifyingGlass,
                  title: 'Tarjouspyyntöjen katselmointi',
                  text: 'Dokumentit ja riskit samaan paikkaan ennen hintapäätöstä.',
                },
                {
                  icon: CurrencyCircleDollar,
                  title: 'Kate näkyy ennen lähetystä',
                  text: 'Marginaali, lisäkulut ja loppusumma samassa näkymässä päätöshetkellä.',
                },
                {
                  icon: CalendarCheck,
                  title: 'Hyväksytty tarjous jatkuu projektiksi',
                  text: 'PDF ja Excel ovat vientimuotoja — projektin tiedot lähtevät samasta datasta.',
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`bg-white px-6 py-7 ${i > 0 ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l-0 sm:border-t lg:border-l lg:border-t-0' : ''}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-4 w-4" weight="bold" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PROBLEM → SOLUTION ─────────────────────────────────── */}
        <section id="ratkaisu" aria-labelledby="ratkaisu-heading" className="bg-[#f6f7f3]">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mb-12 max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Miksi tämä tarvitaan
              </div>
              <h2
                id="ratkaisu-heading"
                className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl"
              >
                Miksi Excel- ja PDF-pohjainen tarjouslaskenta ei riitä
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Tarjous on työn käynnistymisen kriittisin päätöspiste. Kun tieto elää eri kansioissa ja
                katoaa versioiden välissä, kate jää tarkistamatta ja projekti käynnistyy väärällä
                lähtötiedolla.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[26px] border border-rose-200 bg-[#fff4f3] p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                    <X className="h-4 w-4" weight="bold" />
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-900">
                    Hajanaisessa mallissa
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {operationalProblems.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-7 text-rose-950/80">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[26px] border border-emerald-200 bg-[#f2fbf6] p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle className="h-4 w-4" weight="fill" />
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-900">
                    Projektalla tarjous pysyy ohjelmistossa
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
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
        </section>

        <section aria-labelledby="ominaisuudet-heading" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mb-12 max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ominaisuudet</div>
              <h2 id="ominaisuudet-heading" className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Neljä kokonaisuutta, jotka pitävät tarjouksen hallinnassa
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Projekta ei yritä piilottaa toimintaa geneerisen työtilapuheen taakse. Nämä ovat ne osaset, joilla rakennusalan tarjouslaskenta pysyy hallinnassa alusta loppuun.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                {
                  number: '01',
                  icon: FileText,
                  title: 'Tarjouseditori',
                  text: 'Muokkaa tarjousta samassa editorissa, jossa rivit, vaihtoehdot, kohdetieto ja versiot pysyvät luettavina. Tarjous ei jää irralliseksi dokumentiksi.',
                  href: PUBLIC_FEATURE_LINKS.tarjouseditori,
                  link: 'Tutustu tarjouseditoriin',
                },
                {
                  number: '02',
                  icon: MagnifyingGlass,
                  title: 'Tarjouspyyntöjen katselmointi',
                  text: 'Kokoa tarjouspyyntöpaketti, nosta havainnot esiin ja siirrä valmisteltu sisältö hallitusti tarjouksen pohjaksi. Dokumentit, riskit ja puuttuvat tiedot samaan paikkaan.',
                  href: PUBLIC_FEATURE_LINKS.tarjouspyynnot,
                  link: 'Katso tarjouspyyntöjen katselmointi',
                },
                {
                  number: '03',
                  icon: CurrencyCircleDollar,
                  title: 'Kateohjaus',
                  text: 'Pidä marginaali, lisäkulut ja loppusumma näkyvissä siellä, missä lähetyspäätös tehdään. Kate tarkistetaan ennen lähetystä — ei projektin aikana.',
                  href: PUBLIC_FEATURE_LINKS.kateohjaus,
                  link: 'Näe kateohjaus',
                },
                {
                  number: '04',
                  icon: CalendarCheck,
                  title: 'Projektiseuranta ja viennit',
                  text: 'Hyväksytty tarjous voi jatkua projektiksi ilman käsin tehtävää siivousta. PDF- ja Excel-viennit syntyvät ohjelmistosta, eivät erillisestä tiedostoketjusta.',
                  href: PUBLIC_FEATURE_LINKS.projektiseuranta,
                  link: 'Tutustu projektiseurantaan',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.number} className="flex items-start gap-6 py-8 first:pt-0 last:pb-0">
                    <span className="hidden w-8 flex-shrink-0 pt-0.5 text-sm font-semibold text-slate-300 sm:block">{item.number}</span>
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-sm leading-7 text-slate-600">{item.text}</p>
                    </div>
                    <a
                      href={item.href}
                      className="hidden flex-shrink-0 text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950 hover:decoration-slate-950 lg:block"
                    >
                      {item.link}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="miten-se-toimii" className="border-y border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#162033_52%,#1f2937_100%)] text-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mb-12 max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Näin Projekta toimii</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Kolme vaihetta, joilla tarjous pysyy hallittuna koko matkalla.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/75">
                Kun etsit tarjouslaskentaohjelmaa rakennusalan yrityksille, tärkeintä ei ole yksi näyttävä näkymä vaan se, että käyttöpolku kestää tarjouspyynnöstä ulos vietävään dokumenttiin ja projektin alkuun asti.
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              {[
                {
                  step: '1',
                  icon: MagnifyingGlass,
                  title: 'Vastaanota ja katselmointi',
                  text: 'Kerää tarjouspyyntöpaketti, jaottele vaatimukset ja riskit ja siirrä hallitusti tarjouksen pohjaksi. Mitään ei jää muistilapuille.',
                },
                {
                  step: '2',
                  icon: CurrencyCircleDollar,
                  title: 'Laske ja ohjaa kate',
                  text: 'Täytä tarjousrivit, säädä marginaalit ja pidä loppusumma näkyvissä koko ajan — lähetyspäätös tehdään riittävällä tiedolla.',
                },
                {
                  step: '3',
                  icon: FileText,
                  title: 'Lähetä ja seuraa',
                  text: 'Vie tarjous PDF:ksi tai Exceliksi, seuraa tilannetta ja jatka hyväksytty tarjous projektiksi ilman erillistä käsityötä.',
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.step}
                    className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Vaihe {step.step}</span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <Icon className="h-5 w-5" weight="bold" />
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/75">{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="kenelle" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mb-12 max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Kenelle tämä on tehty</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Kenelle Projekta sopii
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Projekta on tehty yrityksille, joille tarjous ei ole hallinnollinen liite vaan liiketoiminnan, katteen ja projektin käynnistymisen ohjauspiste.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  icon: ChartBar,
                  title: 'Johdolle',
                  text: 'Näe tarjousten kate, tila ja historia yhdessä paikassa. Tee hinnoittelupäätökset tiedolla — ei muistilapuilla tai taulukkolaskennalla.',
                  bullets: [
                    'Tarjoushistoria ja -vertailu',
                    'Kateohjaukseen pohjautuva hinnoittelu',
                    'Tilannekuva ilman manuaalista raportointia',
                  ],
                },
                {
                  icon: CurrencyCircleDollar,
                  title: 'Tarjouslaskennalle',
                  text: 'Laadi tarjous laskentaympäristössä, jossa rivit, vaihtoehdot ja kate pysyvät hallinnassa — ei ulkoisissa Excel-tiedostoissa.',
                  bullets: [
                    'Rakenteinen tarjouseditori',
                    'Katteen reaaliaikainen seuranta',
                    'PDF- ja Excel-viennit automaattisesti',
                  ],
                },
                {
                  icon: CalendarCheck,
                  title: 'Projektin käynnistäjille',
                  text: 'Hyväksytty tarjous käynnistää projektin suoraan ohjelmistosta — ilman kopiointia, ilman erillistä projektiavausta.',
                  bullets: [
                    'Tarjouksesta projektiksi yhdellä toiminnolla',
                    'Aikataulut ja resurssit samassa tilassa',
                    'Dokumentit pysyvät projektissa',
                  ],
                },
              ].map((card) => {
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

            <div className="mt-10 flex flex-wrap gap-3">
              {[
                { icon: Buildings, label: 'Rakennusliikkeet' },
                { icon: Buildings, label: 'Talotekniikka' },
                { icon: Package, label: 'Alihankkijat' },
                { icon: FileText, label: 'Suunnittelu ja projektointi' },
                { icon: CalendarCheck, label: 'Saneeraus ja korjausrakentaminen' },
              ].map((item) => {
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


        <section id="faq" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">FAQ</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  Usein kysyttyä tarjouslaskentaohjelmasta rakennusalalle
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Nämä ovat ne kysymykset, jotka ostajat oikeasti esittävät ennen päätöstä — ei keinotekoisesti rakennettuja hakuotsikoita.
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

              <div className="flex flex-col gap-5">
                <div className="rounded-[32px] border border-slate-200 bg-[#f6f7f3] p-7">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    Haluatko nähdä Projektan käytännössä?
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Yhdessä katsomme, miten oma tarjousprosessisi sopii ohjelmistoon — ilman myyntipuhetta.
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button asChild className="h-11 gap-2 rounded-full bg-slate-950 px-6 text-sm text-white hover:bg-slate-800">
                      <a href={PUBLIC_SITE_PATHS.demo}>
                        Pyydä demo
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-full border-slate-300 px-6 text-sm text-slate-950 hover:bg-slate-100">
                      <a href={PUBLIC_SITE_PATHS.features}>Tutustu ominaisuuksiin</a>
                    </Button>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-7">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Jatka tutustumista</div>
                  <nav className="mt-4 flex flex-col gap-1">
                    {[
                      { label: 'Kaikki ominaisuudet', href: PUBLIC_SITE_PATHS.features },
                      { label: 'Hinnat ja käyttöönotto', href: PUBLIC_SITE_PATHS.pricing },
                      { label: 'Yhteystiedot', href: PUBLIC_SITE_PATHS.contact },
                      { label: 'Pyydä demo', href: PUBLIC_SITE_PATHS.demo },
                    ].map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        {link.label}
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </a>
                    ))}
                  </nav>
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
                Jos arvioit uutta tarjouslaskentaohjelmaa rakennusalalle, seuraava askel on nähdä miten oma tarjousprosessi, katepäätös ja dokumenttiviennit saadaan samaan kokonaisuuteen. Nykyinen käyttäjä pääsee edelleen suoraan kirjautumiseen.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild className="h-12 gap-2 rounded-full bg-white px-7 text-sm text-slate-950 hover:bg-white/[0.92]">
                  <a href={PUBLIC_SITE_PATHS.demo}>
                    Pyydä demo
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-7 text-sm text-white hover:bg-white/10">
                  <a href={PUBLIC_SITE_PATHS.pricing}>Katso hinnat ja käyttöönotto</a>
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
