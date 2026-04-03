import { ArrowRight, Buildings, CalendarCheck, ChartBar, CheckCircle, CurrencyCircleDollar, FileText, Folder, HardHat, ListChecks, Package, PlayCircle, ShieldCheck, Wrench, X } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

const previewRows = [
  { quote: 'TAR-20260403-8F3A12', project: 'Julkisivun korjaus / vaihe 2', customer: 'Rakennusliike Laine', status: 'Lähetetty', margin: '18,4 %', amount: '48 200 €' },
  { quote: 'TAR-20260403-71B8E4', project: 'KVR sisävalmistus', customer: 'KVR Sisärakenne', status: 'Luonnos', margin: '21,1 %', amount: '16 890 €' },
  { quote: 'TAR-20260402-2A66BA', project: 'Talotekniikan saneeraus', customer: 'Talotekniikka Aalto', status: 'Hyväksytty', margin: '17,6 %', amount: '92 400 €' },
];

function handleRequestDemo() {
  window.location.href = 'mailto:myynti@tarjouslaskenta.fi?subject=Pyydä%20esittely%20Tarjouslaskenta-palvelusta';
}

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_50%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.04),transparent_40%)] pointer-events-none" />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f8fb]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          <button className="text-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} type="button">
            <div className="text-lg font-semibold tracking-tight text-slate-950">Tarjouslaskenta</div>
          </button>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 lg:flex">
            <a className="transition hover:text-slate-950" href="#ongelma">Miksi</a>
            <a className="transition hover:text-slate-950" href="#hyodyt">Hyödyt</a>
            <a className="transition hover:text-slate-950" href="#kenelle">Kenelle</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onNavigateToLogin}>
              Kirjaudu sisään
            </Button>
            <Button className="gap-2" onClick={handleRequestDemo}>
              Varaa esittely
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── 1. HERO ── */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:pb-28 lg:pt-20">
            {/* Left copy */}
            <div className="max-w-xl">
              <h1 className="text-4xl font-semibold leading-[1.12] tracking-[-0.04em] text-slate-950 sm:text-[3.25rem]">
                Tarjoukset, katteet ja projektit samassa näkymässä.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Rakennusalan yrityksille suunniteltu järjestelmä, jolla hallitset tarjouslaskennan, tuotekannan ja projektiseurannan ilman Excel-rumbaa.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="h-12 gap-2 px-7 text-sm" onClick={handleRequestDemo}>
                  Varaa esittely
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="h-12 gap-2 px-7 text-sm" variant="outline" onClick={() => document.getElementById('nain-toimii')?.scrollIntoView({ behavior: 'smooth' })}>
                  <PlayCircle className="h-4 w-4" />
                  Katso miten se toimii
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  { icon: HardHat, text: 'Rakennusalalle suunniteltu' },
                  { icon: CurrencyCircleDollar, text: 'Kate näkyy ennen päätöstä' },
                  { icon: ShieldCheck, text: 'Tarjous ja projekti samassa järjestelmässä' },
                ].map((b) => {
                  const Icon = b.icon;
                  return (
                    <span key={b.text} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
                      <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" weight="bold" />
                      {b.text}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Right — product mockup with callouts */}
            <div className="relative">
              <div className="absolute inset-x-10 top-8 -z-10 h-[88%] rounded-[32px] bg-slate-950/8 blur-3xl" />
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_44px_90px_-42px_rgba(15,23,42,0.48)]">
                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-950">Tarjouslaskenta</div>
                    <div className="mt-0.5 text-xs text-slate-500">Tarjous, kate ja projekti yhdessä työtilassa</div>
                  </div>
                  <Badge variant="outline" className="rounded-full border-slate-300 px-3 py-1 text-xs text-slate-600">Esimerkkinäkymä</Badge>
                </div>

                <div className="grid min-h-[480px] lg:grid-cols-[200px_1fr]">
                  {/* Sidebar */}
                  <aside className="hidden border-r border-slate-200 bg-slate-50/70 px-4 py-5 lg:block">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Työtila</div>
                    <div className="mt-4 space-y-1.5">
                      {[
                        { icon: Folder, label: 'Projektit', active: true },
                        { icon: FileText, label: 'Tarjoukset' },
                        { icon: Package, label: 'Tuoterekisteri' },
                        { icon: ChartBar, label: 'Raportointi' },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${item.active ? 'bg-slate-950 text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.7)]' : 'text-slate-600'}`}>
                            <Icon className="h-4 w-4" weight={item.active ? 'fill' : 'regular'} />
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Kate card */}
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kate-ennuste</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">18,4 %</div>
                      <p className="mt-1.5 text-xs text-slate-500">Myynti, kulut ja marginaali yhdellä silmäyksellä.</p>
                    </div>
                  </aside>

                  {/* Main content */}
                  <div className="space-y-4 px-4 py-5 sm:px-5">
                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="hidden grid-cols-[1.3fr_1.4fr_0.8fr_0.7fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
                        <div>Tarjous</div>
                        <div>Projekti</div>
                        <div>Status</div>
                        <div>Kate</div>
                        <div>Arvo</div>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {previewRows.map((row) => (
                          <div key={row.quote} className="hidden grid-cols-[1.3fr_1.4fr_0.8fr_0.7fr_0.8fr] gap-3 px-4 py-3 text-sm text-slate-700 lg:grid">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-slate-950">{row.quote}</div>
                              <div className="mt-0.5 truncate text-[11px] text-slate-500">{row.customer}</div>
                            </div>
                            <div className="self-center truncate text-xs text-slate-700">{row.project}</div>
                            <div className="self-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                row.status === 'Hyväksytty' ? 'bg-emerald-50 text-emerald-700'
                                : row.status === 'Lähetetty' ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                              }`}>{row.status}</span>
                            </div>
                            <div className="self-center text-xs font-medium">{row.margin}</div>
                            <div className="self-center text-xs font-semibold text-slate-950">{row.amount}</div>
                          </div>
                        ))}
                        {/* Mobile table fallback */}
                        {previewRows.map((row) => (
                          <div key={`m-${row.quote}`} className="space-y-2 px-4 py-3 lg:hidden">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-slate-950">{row.quote}</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">{row.project}</div>
                              </div>
                              <span className={`inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                row.status === 'Hyväksytty' ? 'bg-emerald-50 text-emerald-700'
                                : row.status === 'Lähetetty' ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                              }`}>{row.status}</span>
                            </div>
                            <div className="flex gap-4 text-xs">
                              <span className="text-slate-500">Kate: <span className="font-medium text-slate-950">{row.margin}</span></span>
                              <span className="text-slate-500">Arvo: <span className="font-medium text-slate-950">{row.amount}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary card */}
                    <div className="rounded-xl border border-slate-200 bg-slate-950 px-4 py-4 text-white">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Yhteenveto</div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-white/60">Rivien välisumma</span><span className="font-semibold">12 560 €</span></div>
                        <div className="flex justify-between"><span className="text-white/60">Lisäkulut</span><span className="font-semibold">1 280 €</span></div>
                        <div className="flex justify-between"><span className="text-white/60">ALV 25,5 %</span><span className="font-semibold">3 528 €</span></div>
                      </div>
                      <div className="mt-4 border-t border-white/10 pt-3 flex justify-between items-center">
                        <span className="text-white/60 text-sm">Loppusumma</span>
                        <span className="text-xl font-semibold tracking-[-0.03em]">17 368 €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Callout labels (positioned over / near the mockup) */}
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {[
                  'Näe kate ennen tarjouksen lähetystä',
                  'Hallitse tarjousversioita ilman tiedostorumbaa',
                  'Seuraa projektin vaiheita samassa järjestelmässä',
                  'Pidä tuotekanta ja hinnat yhdessä paikassa',
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" weight="fill" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. ONGELMA → RATKAISU ── */}
        <section id="ongelma" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Tarjousprosessi ei saa hajota Exceliin, sähköposteihin ja erillisiin tiedostoihin.
              </h2>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {/* Without */}
              <div className="rounded-2xl border border-red-200/60 bg-red-50/40 px-6 py-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <X className="h-4 w-4" weight="bold" />
                  Ilman järjestelmää
                </div>
                <ul className="mt-5 space-y-3">
                  {[
                    'Tarjousversiot hajallaan kansioissa ja sähköposteissa',
                    'Hinnat eri paikoissa — Excel, PDF, muistiinpanot',
                    'Kate tarkistetaan liian myöhään tai ei ollenkaan',
                    'Projektin tiedot irtoavat tarjouksesta heti alussa',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-red-900/80">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* With */}
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 px-6 py-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle className="h-4 w-4" weight="bold" />
                  Tällä järjestelmällä
                </div>
                <ul className="mt-5 space-y-3">
                  {[
                    'Tarjouslaskenta yhdessä näkymässä, versiot tallessa',
                    'Tuote- ja hintatieto keskitetysti rekisterissä',
                    'Kate näkyy ennen päätöstä, ei jälkikäteen',
                    'Projekti jatkuu samasta datasta ilman katkoksia',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-emerald-900/80">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. KOLME PÄÄHYÖTYÄ ── */}
        <section id="hyodyt" className="border-t border-slate-200 bg-[#f6f8fb]">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Hyödyt</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Tarjous ei ole irrallinen dokumentti. Se on projektin lähtöpiste.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Siksi tarjouslaskenta, kate ja projektiseuranta kuuluvat samaan järjestelmään.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: FileText,
                  title: 'Nopeampi tarjouslaskenta',
                  text: 'Luo tarjoukset hallitusta tuote- ja hintapohjasta ilman käsityötä joka kierroksella.',
                },
                {
                  icon: ChartBar,
                  title: 'Parempi katehallinta',
                  text: 'Näe tarjouskohtainen kate, lisäkulut ja loppusumma ennen lähettämistä.',
                },
                {
                  icon: CalendarCheck,
                  title: 'Selkeä projektiseuranta',
                  text: 'Jatka tarjouksesta suoraan projektinäkymään ilman, että tieto katoaa matkalla.',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.3)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" weight="bold" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{card.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. NÄIN SE TOIMII ── */}
        <section id="nain-toimii" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Näin se toimii</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Tarjouksesta projektiin kolmessa vaiheessa
              </h2>
            </div>

            <div className="mt-14 grid gap-0 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Rakenna tarjous',
                  text: 'Valitse tuotteet rekisteristä, aseta hinnat ja muodosta tarjous muutamassa minuutissa.',
                },
                {
                  step: '02',
                  title: 'Tarkista kate ja sisältö',
                  text: 'Näe marginaali, lisäkulut ja loppusumma ennen kuin tarjous lähtee asiakkaalle.',
                },
                {
                  step: '03',
                  title: 'Seuraa projektia samassa palvelussa',
                  text: 'Hyväksytty tarjous muuttuu projektiksi. Tieto kulkee mukana ilman kopiointia.',
                },
              ].map((item, i) => (
                <div key={item.step} className="relative flex flex-col items-center text-center px-6 py-8">
                  {i < 2 && (
                    <div className="absolute right-0 top-1/2 hidden h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-300 to-transparent md:block" style={{ left: '50%' }} />
                  )}
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white shadow-[0_10px_30px_-16px_rgba(15,23,42,0.6)]">
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-7 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. KENELLE ── */}
        <section id="kenelle" className="border-t border-slate-200 bg-[#f6f8fb]">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Kenelle</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Tehty yrityksille, joille tarjous on liiketoiminnan lähtöpiste
              </h2>
            </div>

            <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: HardHat, label: 'Urakoitsijat' },
                { icon: Wrench, label: 'Talotekniikka' },
                { icon: Buildings, label: 'Remontointi' },
                { icon: ListChecks, label: 'Asennusliiketoiminta' },
                { icon: Package, label: 'Rakennusalan palveluyritykset' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
                    <Icon className="h-5 w-5 flex-shrink-0 text-slate-500" weight="bold" />
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 6. LOPUN CTA ── */}
        <section className="border-t border-slate-200 bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Näe, miten tarjouslaskenta ja projektiseuranta saadaan samaan näkymään
              </h2>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button className="h-12 gap-2 bg-white px-7 text-sm text-slate-950 hover:bg-white/90" onClick={handleRequestDemo}>
                  Varaa esittely
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="h-12 gap-2 border-white/20 px-7 text-sm text-white hover:bg-white/10" variant="outline" onClick={() => document.getElementById('nain-toimii')?.scrollIntoView({ behavior: 'smooth' })}>
                  <PlayCircle className="h-4 w-4" />
                  Katso käyttöesimerkki
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-950">Tarjouslaskenta</div>
            <div className="mt-1 text-sm text-slate-500">Tarjouslaskenta ja projektiseuranta rakennusalan yrityksille.</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={onNavigateToLogin}>
              Kirjaudu sisään
            </Button>
            <Button onClick={handleRequestDemo}>
              Varaa esittely
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
