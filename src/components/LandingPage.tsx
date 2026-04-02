import { ArrowRight, ChartBar, CheckCircle, FileText, Folder, Package, SignIn } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

const benefitCards = [
  {
    title: 'Nopeampi tarjousprosessi',
    description: 'Keskitetty tuoterekisteri, projektikohtaiset tarjoukset ja selkeä laskentanäkymä yhdessä paikassa.',
  },
  {
    title: 'Parempi katehallinta',
    description: 'Näe ostohinnat, myyntihinnat ja marginaalit selkeästi ilman hajanaista Excel-työtä.',
  },
  {
    title: 'Hallittu projektiseuranta',
    description: 'Pidä tarjousversiot, projektit ja asiakaskohtaiset tiedot järjestyksessä koko prosessin ajan.',
  },
  {
    title: 'Yrityskäyttöön suunniteltu',
    description: 'Selkeä käyttöoikeusmalli, turvallinen kirjautuminen ja ammattimainen käyttöliittymä.',
  },
];

const previewRows = [
  { quote: 'TAR-20260403-8F3A12', customer: 'Rakennusliike Laine', status: 'Lähetetty', margin: '18,4 %', amount: '48 200 €' },
  { quote: 'TAR-20260403-71B8E4', customer: 'KVR Sisärakenne', status: 'Luonnos', margin: '21,1 %', amount: '16 890 €' },
  { quote: 'TAR-20260402-2A66BA', customer: 'Talotekniikka Aalto', status: 'Hyväksytty', margin: '17,6 %', amount: '92 400 €' },
  { quote: 'TAR-20260401-54CD21', customer: 'Korjausurakka Niemi', status: 'Luonnos', margin: '19,9 %', amount: '33 750 €' },
];

const audienceItems = [
  'urakoitsijat',
  'rakennusalan yritykset',
  'projektimyyntiä tekevät organisaatiot',
  'yritykset, joilla tarjouslaskenta on edelleen hajallaan Excelissä ja sähköposteissa',
];

function handleRequestDemo() {
  window.location.href = 'mailto:myynti@tarjouslaskenta.fi?subject=Pyydä%20esittely%20Tarjouslaskenta-palvelusta';
}

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_42%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_34%)] pointer-events-none" />

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f8fb]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          <button className="text-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} type="button">
            <div className="text-lg font-semibold tracking-tight text-slate-950">Tarjouslaskenta</div>
          </button>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 lg:flex">
            <a className="transition hover:text-slate-950" href="#ominaisuudet">Ominaisuudet</a>
            <a className="transition hover:text-slate-950" href="#kenelle">Kenelle</a>
            <a className="transition hover:text-slate-950" href="#hyodyt">Hyödyt</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onNavigateToLogin}>
              Kirjaudu sisään
            </Button>
            <Button className="gap-2" onClick={handleRequestDemo}>
              Pyydä esittely
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-28 lg:pt-20">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="max-w-2xl"
            >
              <Badge variant="outline" className="mb-6 rounded-full border-slate-300 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Yritysohjelmisto tarjouslaskentaan
              </Badge>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
                Tarjouslaskenta rakennusalan yrityksille
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Hallitse tuotteet, projektit, tarjousversiot ja hinnoittelu yhdessä järjestelmässä. Nopeampi laskenta, vähemmän virheitä ja parempi katehallinta.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 gap-2 px-6 text-sm" onClick={handleRequestDemo}>
                  Pyydä esittely
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="h-11 px-6 text-sm" variant="outline" onClick={onNavigateToLogin}>
                  <SignIn className="h-4 w-4" />
                  Kirjaudu sisään
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Keskitetty tieto</div>
                  <div className="mt-2 text-sm text-slate-700">Tuotteet, projektit ja tarjoukset samassa näkymässä.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kate hallinnassa</div>
                  <div className="mt-2 text-sm text-slate-700">Osto, myynti ja marginaali näkyvät päätöksiä varten.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Yrityskäyttöön</div>
                  <div className="mt-2 text-sm text-slate-700">Vakaa käyttöliittymä päivittäiseen tarjousprosessiin.</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              id="ominaisuudet"
              initial={{ opacity: 0, y: 20, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: 'easeOut', delay: 0.12 }}
              className="relative"
            >
              <div className="absolute inset-x-10 top-8 -z-10 h-[88%] rounded-[32px] bg-slate-950/8 blur-3xl" />
              <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_44px_90px_-42px_rgba(15,23,42,0.48)]">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Tarjouslaskenta</div>
                    <div className="mt-1 text-xs text-slate-500">Aktiiviset tarjoukset ja projektiseuranta</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full bg-slate-950 px-3 py-1 text-xs text-white hover:bg-slate-950">Hyväksyntä 62 %</Badge>
                    <Badge variant="outline" className="rounded-full border-slate-300 px-3 py-1 text-xs text-slate-600">Päivitetty tänään</Badge>
                  </div>
                </div>

                <div className="grid min-h-[560px] lg:grid-cols-[220px_1fr]">
                  <aside className="border-r border-slate-200 bg-slate-50/70 px-5 py-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Työtila</div>
                    <div className="mt-5 space-y-2">
                      {[
                        { icon: Folder, label: 'Projektit', active: true },
                        { icon: FileText, label: 'Tarjoukset' },
                        { icon: Package, label: 'Tuoterekisteri' },
                        { icon: ChartBar, label: 'Raportointi' },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm ${item.active ? 'bg-slate-950 text-white shadow-[0_14px_30px_-18px_rgba(15,23,42,0.75)]' : 'text-slate-600'}`}
                          >
                            <Icon className="h-4 w-4" weight={item.active ? 'fill' : 'regular'} />
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kate-ennuste</div>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">18,4 %</div>
                      <p className="mt-2 text-sm text-slate-600">Kokonaisnäkymä tarjouksen myyntiin, kuluihin ja marginaaliin.</p>
                    </div>
                  </aside>

                  <div className="space-y-5 px-5 py-6 sm:px-6">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avoimet tarjoukset</div>
                        <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">24</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Aktiiviset projektit</div>
                        <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">13</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tuotteita rekisterissä</div>
                        <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">12 480</div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-slate-200">
                      <div className="grid grid-cols-[1.5fr_1.3fr_0.9fr_0.8fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <div>Tarjous</div>
                        <div>Asiakas</div>
                        <div>Status</div>
                        <div>Kate</div>
                        <div>Arvo</div>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {previewRows.map((row) => (
                          <motion.div
                            key={row.quote}
                            whileHover={{ backgroundColor: 'rgba(248,250,252,1)' }}
                            className="grid grid-cols-[1.5fr_1.3fr_0.9fr_0.8fr_0.9fr] gap-4 px-5 py-4 text-sm text-slate-700"
                          >
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-950">{row.quote}</div>
                              <div className="text-xs text-slate-500">Kylpyhuone- ja korjausrakentaminen</div>
                            </div>
                            <div className="self-center">{row.customer}</div>
                            <div className="self-center">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                row.status === 'Hyväksytty'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : row.status === 'Lähetetty'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                              }`}>
                                {row.status}
                              </span>
                            </div>
                            <div className="self-center font-medium">{row.margin}</div>
                            <div className="self-center font-medium text-slate-950">{row.amount}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
                      <div className="rounded-[24px] border border-slate-200 px-5 py-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Projektin tarjousrivit</div>
                            <div className="mt-2 text-lg font-semibold text-slate-950">Kylpyhuoneremontti / As Oy Merituuli</div>
                          </div>
                          <Badge variant="outline" className="rounded-full border-slate-300 px-3 py-1 text-xs text-slate-600">Revisio 3</Badge>
                        </div>
                        <div className="mt-5 space-y-3">
                          {[
                            { label: 'Seinälaatat ja kiinnitystarvikkeet', amount: '6 420 €' },
                            { label: 'Kalusteet ja suihkutila', amount: '4 860 €' },
                            { label: 'Purkutyö ja jätekulut', amount: '1 280 €' },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                              <span className="text-slate-600">{item.label}</span>
                              <span className="font-semibold text-slate-950">{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-950 px-5 py-5 text-white">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Yhteenveto</div>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-white/70">Rivien välisumma</span>
                            <span className="font-semibold">12 560 €</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/70">Lisäkulut</span>
                            <span className="font-semibold">1 280 €</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/70">ALV 25,5 %</span>
                            <span className="font-semibold">3 528 €</span>
                          </div>
                        </div>
                        <div className="mt-6 border-t border-white/10 pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-white/70">Loppusumma</span>
                            <span className="text-2xl font-semibold tracking-[-0.03em]">17 368 €</span>
                          </div>
                          <p className="mt-3 text-sm text-white/60">Tarjousversio, kulut ja kate pysyvät samassa työnkulussa ilman rinnakkaisia Excel-taulukoita.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="hyodyt" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Hyödyt</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Suunniteltu poistamaan tarjouslaskennan kitka
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Tarjouslaskenta kokoaa hajallaan olevan tiedon yhteen työnkulkuun, jossa tarjous saadaan ulos nopeammin ja johdonmukaisemmin.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              {benefitCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  className="rounded-[24px] border border-slate-200 bg-[#f9fbfd] px-5 py-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.35)]"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">0{index + 1}</div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="kenelle" className="border-t border-slate-200 bg-[#f6f8fb]">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Kenelle</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Suunniteltu yrityksille, jotka laskevat tarjouksia tosissaan
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Kun tarjouslaskenta on kriittinen osa myyntiä, järjestelmän pitää näyttää kokonaiskuva yhdellä silmäyksellä ja tukea arjen päätöksiä ilman manuaalista tiedon metsästystä.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {audienceItems.map((item) => (
                <div key={item} className="flex gap-3 rounded-[22px] border border-slate-200 bg-white px-5 py-5">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" weight="fill" />
                  <span className="text-sm leading-7 text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-950">Tarjouslaskenta</div>
            <div className="mt-1 text-sm text-slate-500">Yrityksille suunniteltu tarjouslaskennan käyttöjärjestelmä.</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={onNavigateToLogin}>
              Kirjaudu sisään
            </Button>
            <Button onClick={handleRequestDemo}>
              Pyydä esittely
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
