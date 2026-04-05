import { useMemo } from 'react';
import { ChartBar, CheckCircle, FilePdf, FileText, Folder, FolderOpen, Package, User, Warning } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { useAuth } from '../../hooks/use-auth';
import { useCustomers, useDocumentSettings, useProjects, useQuotes } from '../../hooks/use-data';
import { cn } from '../../lib/utils';

type HelpTarget = 'account' | 'projects' | 'products' | 'reports';

interface HelpPageProps {
  onNavigate?: (page: HelpTarget) => void;
}

type OnboardingStep = {
  title: string;
  description: string;
  actionLabel: string;
  target: HelpTarget;
  isComplete: boolean;
  countLabel?: string;
  permissionNote?: string;
};

const heroHighlights = [
  {
    value: '6',
    label: 'askelta ensimmäiseen tarjoukseen',
  },
  {
    value: '4',
    label: 'FAQ-kokonaisuutta yhdessä näkymässä',
  },
  {
    value: '3',
    label: 'vientiä eri käyttötarkoituksiin',
  },
];

const quickStartSteps = [
  {
    title: 'Täytä omat yritystiedot',
    description:
      'Avaa Oma tili ja lisää yrityksen nimi sekä yhteystiedot. Näitä käytetään automaattisesti PDF- ja Excel-vienneissä.',
    target: 'account' as const,
    actionLabel: 'Avaa oma tili',
  },
  {
    title: 'Lisää asiakas',
    description:
      'Siirry Projektit-sivulle ja luo ensin asiakas. Sama asiakas toimii pohjana useille projekteille ja tarjouksille.',
    target: 'projects' as const,
    actionLabel: 'Siirry projektteihin',
  },
  {
    title: 'Luo projekti',
    description:
      'Luo projekti asiakkaan alle ja täytä vähintään projektin nimi sekä työkohde. Tarjoukset rakennetaan aina projektin sisälle.',
    target: 'projects' as const,
    actionLabel: 'Luo projekti',
  },
  {
    title: 'Tee tarjouspohja valmiiksi',
    description:
      'Avaa projekti ja luo uusi tarjous tai muokkaa mallitarjousta. Lisää rivit, väliotsikot ja lisäkulut samaan näkymään.',
    target: 'projects' as const,
    actionLabel: 'Luo tarjous',
  },
  {
    title: 'Vie asiakkaalle sopivaan muotoon',
    description:
      'Käytä PDF:ää asiakaslähetykseen, asiakas-Exceliä jaettavaan taulukkoon ja sisäistä Exceliä omalle tiimille.',
    target: 'projects' as const,
    actionLabel: 'Avaa vienti',
  },
  {
    title: 'Tarkista ennen lähetystä',
    description:
      'Varmista vielä asiakkaan tiedot, työkohde, loppusumma ja valittu vientimuoto ennen lähetystä.',
    target: 'projects' as const,
    actionLabel: 'Viimeistele',
  },
];

const reminders = [
  {
    title: 'Mallisisältö on vain lähtökohta',
    description: 'Malliasiakas, malliprojekti ja mallitarjous kannattaa muokata tai poistaa ennen omaa käyttöä.',
  },
  {
    title: 'Loppusumma muodostuu useasta osasta',
    description: 'Tarjouksen summa syntyy riveistä, lisäkuluista, mahdollisesta alennuksesta ja arvonlisäverosta.',
  },
  {
    title: 'Tarkista tiedot ennen vientiä',
    description: 'Kun viet dokumentin asiakkaalle, varmista yritystiedot, asiakas ja työkohde ennen lähetystä.',
  },
  {
    title: 'Sisäinen Excel on laajempi',
    description: 'Sisäinen Excel sisältää enemmän laskentatietoa kuin asiakkaalle tarkoitettu vienti.',
  },
];

const quickLinks = [
  {
    title: 'Oma tili',
    description: 'Yritystiedot, yhteystiedot ja salasana.',
    target: 'account' as const,
    actionLabel: 'Avaa',
    icon: User,
  },
  {
    title: 'Projektit',
    description: 'Asiakkaat, projektit, tarjoukset ja revisiot.',
    target: 'projects' as const,
    actionLabel: 'Siirry',
    icon: FolderOpen,
  },
  {
    title: 'Tuotteet',
    description: 'Tuotekatalogi, hinnat ja valikoiman ylläpito.',
    target: 'products' as const,
    actionLabel: 'Hallitse',
    icon: Package,
  },
  {
    title: 'Raportointi',
    description: 'Myynnin kehitys, kate ja tarjousmäärät yhdestä näkymästä.',
    target: 'reports' as const,
    actionLabel: 'Avaa',
    icon: ChartBar,
  },
];

const faqSections = [
  {
    title: 'Aloittaminen',
    description: 'Ensimmäiset asetukset, mallisisällön käyttö ja yritystietojen täyttö.',
    icon: FileText,
    items: [
      {
        question: 'Miten pääsen alkuun, jos näkymä on tyhjä?',
        answer:
          'Aloita täyttämällä omat yritystietosi Oma tili -sivulla. Sen jälkeen mene Projektit-sivulle, luo asiakas, luo projekti asiakkaan alle ja tee ensimmäinen tarjous projektin sisälle. Jos tilillä on valmiiksi mallisisältöä, voit käyttää sitä pohjana.',
      },
      {
        question: 'Miten käytän mallitarjousta oman tarjouksen pohjana?',
        answer:
          'Avaa mallitarjous, vaihda asiakkaan ja projektin tiedot oikeiksi, muokkaa rivit vastaamaan oikeaa kohdetta ja tarkista lopuksi hinnat ja yritystiedot ennen vientiä.',
      },
      {
        question: 'Missä täytän omat yritystiedot tarjoukselle?',
        answer:
          'Avaa Oma tili ja tallenna yrityksen nimi, sähköposti, puhelin, osoite ja tarvittaessa logon URL. Näitä tietoja käytetään automaattisesti PDF- ja Excel-vienneissä.',
      },
    ],
  },
  {
    title: 'Tarjouksen tekeminen',
    description: 'Asiakkaat, projektit, tarjousrivit, loppusummat ja revisiot.',
    icon: Folder,
    items: [
      {
        question: 'Miten lisään asiakkaan ja projektin?',
        answer:
          'Projektit-sivulla voit lisätä ensin asiakkaan ja sen jälkeen uuden projektin. Projekti kuuluu aina yhdelle asiakkaalle, joten asiakkaan luonti kannattaa tehdä ensin.',
      },
      {
        question: 'Miten lisään rivejä, väliotsikoita ja lisäkuluja?',
        answer:
          'Tarjouseditorissa voit lisätä normaalin tuoterivin, asennusrivin, yhdistetyn tuote ja asennus -rivin, väliotsikon tai erillisen veloitusrivin. Väliotsikko auttaa ryhmittelemään tarjouksen sisällön selkeästi asiakkaalle.',
      },
      {
        question: 'Miten hinnat ja loppusumma muodostuvat?',
        answer:
          'Jokainen tarjousrivi kasvattaa rivien välisummaa. Sen päälle lisätään mahdolliset lisäkulut, vähennetään mahdollinen alennus ja lopuksi lasketaan ALV. Lopputulos näkyy yhteenvedossa reaaliajassa.',
      },
      {
        question: 'Mitä revisio tarkoittaa?',
        answer:
          'Revisio tarkoittaa tarjouksen uutta versiota. Käytä revisiota silloin, kun haluat jatkaa aiemmin lähetetystä tai valmiista tarjouksesta ilman että alkuperäinen versio katoaa.',
      },
    ],
  },
  {
    title: 'PDF ja Excel',
    description: 'Oikea vientimuoto oikeaan tilanteeseen ja yritystietojen tarkistus.',
    icon: FilePdf,
    items: [
      {
        question: 'Milloin käytän PDF:ää?',
        answer:
          'PDF sopii asiakkaalle lähetettävään viralliseen tarjoukseen. Se on selkein vaihtoehto silloin, kun haluat asiakkaalle helppolukuisen dokumentin ilman muokattavaa taulukkoa.',
      },
      {
        question: 'Mitä eroa on asiakas-Excelillä ja sisäisellä Excelillä?',
        answer:
          'Asiakas-Excel on kevyempi, siistimpi ja tarkoitettu jaettavaksi asiakkaalle. Sisäinen Excel sisältää laajemmat laskentatiedot, kuten ostohintoja, katetta tai muuta omaan käyttöön sopivaa tietoa.',
      },
      {
        question: 'Miksi PDF:ssä tai Excelissä näkyy väärät yritystiedot?',
        answer:
          'Tarkista ensin Oma tili -sivun yritystiedot. Jos omia tietoja ei ole tallennettu, sovellus voi käyttää yhteisiä oletustietoja. Päivitä tiedot ja vie dokumentti uudelleen.',
      },
    ],
  },
  {
    title: 'Ongelmatilanteet',
    description: 'Kirjautuminen, salasanat, poistot ja vanhojen tarjousten haku.',
    icon: Warning,
    items: [
      {
        question: 'Mitä teen, jos kirjautuminen ei onnistu?',
        answer:
          'Tarkista ensin sähköpostiosoite ja salasana. Jos ongelma jatkuu, kokeile salasanan vaihtoa Unohtuiko salasana? -toiminnolla. Jos saat edelleen virheen, ota yhteys järjestelmän ylläpitäjään.',
      },
      {
        question: 'Miten vaihdan salasanani?',
        answer:
          'Avaa Oma tili -sivu, syötä nykyinen salasana ja uusi salasana sekä vahvistus. Tallenna muutos lopuksi samalta sivulta.',
      },
      {
        question: 'Voinko poistaa virheellisen tarjouksen?',
        answer:
          'Kyllä. Avaa oikea projekti, etsi tarjous listasta ja poista se. Tarkista ennen poistamista, ettei kyseessä ole tarjous, jonka haluatkin säilyttää revisiohistorian vuoksi.',
      },
      {
        question: 'Mistä löydän vanhat tarjoukset ja projektit?',
        answer:
          'Projektit-sivulla jokaisen projektin alta näkyvät siihen liittyvät tarjoukset. Hae projektin nimellä, asiakkaalla tai tarjousnumerolla, jos et löydä oikeaa kohdetta heti.',
      },
    ],
  },
];

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function HelpPage({ onNavigate }: HelpPageProps) {
  const { canEdit, canManageSharedData } = useAuth();
  const { customers, customersLoaded } = useCustomers();
  const { projects, projectsLoaded } = useProjects();
  const { quotes, quotesLoaded } = useQuotes();
  const { companyProfile, companyProfileLoaded } = useDocumentSettings();

  const companyBasicsCompleted = Boolean(
    companyProfile.companyName.trim() &&
    (companyProfile.companyEmail.trim() || companyProfile.companyPhone.trim() || companyProfile.companyAddress.trim())
  );

  const onboardingLoaded = companyProfileLoaded && customersLoaded && projectsLoaded && quotesLoaded;

  const onboardingSteps = useMemo<OnboardingStep[]>(
    () => [
      {
        title: 'Yritystiedot täytetty',
        description: companyBasicsCompleted
          ? 'Yrityksen perustiedot ovat valmiina PDF- ja Excel-vienteihin.'
          : 'Lisää vähintään yrityksen nimi ja yksi yhteystieto, jotta viennit näyttävät valmiilta.',
        actionLabel: 'Täytä yritystiedot',
        target: 'account',
        isComplete: companyBasicsCompleted,
        permissionNote: canManageSharedData ? undefined : 'Yritystietoja voi päivittää vain yrityksen pääkäyttäjä tai Projektan ylläpito.',
      },
      {
        title: 'Asiakas lisätty',
        description: customers.length > 0
          ? 'Järjestelmästä löytyy jo asiakas, johon voit liittää projekteja ja tarjouksia.'
          : 'Luo ensimmäinen asiakas ennen projektin ja tarjouksen rakentamista.',
        actionLabel: 'Lisää asiakas',
        target: 'projects',
        isComplete: customers.length > 0,
        countLabel: formatCountLabel(customers.length, 'asiakas', 'asiakasta'),
        permissionNote: canEdit ? undefined : 'Tilillä ei ole muokkausoikeutta asiakkaiden lisäämiseen.',
      },
      {
        title: 'Projekti luotu',
        description: projects.length > 0
          ? 'Ainakin yksi projekti on jo luotu asiakkaan alle.'
          : 'Luo projekti asiakkaan alle, jotta voit rakentaa tarjouksen oikeaan kohteeseen.',
        actionLabel: 'Luo projekti',
        target: 'projects',
        isComplete: projects.length > 0,
        countLabel: formatCountLabel(projects.length, 'projekti', 'projektia'),
        permissionNote: canEdit ? undefined : 'Tilillä ei ole muokkausoikeutta projektien luomiseen.',
      },
      {
        title: 'Tarjous luotu',
        description: quotes.length > 0
          ? 'Ensimmäinen tarjous on olemassa ja voit jatkaa sen viimeistelyä tai revisioita.'
          : 'Luo projektin sisään ensimmäinen tarjous ja lisää rivit, lisäkulut sekä vienti.',
        actionLabel: 'Luo tarjous',
        target: 'projects',
        isComplete: quotes.length > 0,
        countLabel: formatCountLabel(quotes.length, 'tarjous', 'tarjousta'),
        permissionNote: canEdit ? undefined : 'Tilillä ei ole muokkausoikeutta tarjousten luomiseen.',
      },
    ],
    [canEdit, canManageSharedData, companyBasicsCompleted, customers.length, projects.length, quotes.length]
  );

  const completedOnboardingSteps = onboardingSteps.filter((step) => step.isComplete).length;
  const nextPendingStepIndex = onboardingSteps.findIndex((step) => !step.isComplete);
  const nextPendingStep = nextPendingStepIndex >= 0 ? onboardingSteps[nextPendingStepIndex] : null;
  const onboardingProgressValue = onboardingSteps.length > 0
    ? (completedOnboardingSteps / onboardingSteps.length) * 100
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-4 sm:space-y-12 sm:p-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-[0_30px_80px_-56px_rgba(15,23,42,0.35)]">
        <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div className="space-y-6">
            <Badge variant="outline" className="h-8 rounded-full border-slate-300 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
              Ohjekeskus
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Ohjeet ensimmäiseen tarjoukseen ja sujuvaan käyttöön
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                Avaa oikea näkymä, etene selkeän aloituspolun mukaan ja löydä tavallisimmat vastaukset ilman erillistä opastusta.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">Yritystiedot</Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">Projektit ja tarjoukset</Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">PDF ja Excel</Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">UKK ja ongelmatilanteet</Badge>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.3)] backdrop-blur">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Aloita tästä</div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Nopein reitti ensimmäiseen tarjoukseen</h2>
              <p className="text-sm leading-6 text-slate-600">
                Jos haluat päästä suoraan tekemiseen, avaa projektit ja etene alla olevan pika-aloituksen mukaan.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button className="h-11 justify-start gap-2" onClick={() => onNavigate?.('projects')}>
                <FileText className="h-4 w-4" />
                Luo tarjous
              </Button>
              <Button variant="outline" className="h-11 justify-start gap-2 border-slate-300 bg-white/80" onClick={() => onNavigate?.('projects')}>
                <Folder className="h-4 w-4" />
                Avaa projektit
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {heroHighlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                  <div className="text-2xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200/70 bg-white/90 p-4 shadow-[0_30px_80px_-56px_rgba(15,23,42,0.28)] sm:p-6 xl:p-8">
        <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <div className="space-y-5">
            <div className="space-y-3">
              <Badge variant="outline" className="h-8 rounded-full border-slate-300 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
                Aloituksen eteneminen
              </Badge>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Näin pitkällä käyttöönotto on</h2>
                <p className="mt-2 text-base leading-8 text-slate-600">
                  Ohjesivu seuraa nyt oikeaa järjestelmätilaa ja näyttää heti, mitä on jo tehty ja mikä puuttuu seuraavaksi.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] bg-slate-50/90 p-5 ring-1 ring-slate-200/70">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Yhteenveto</div>
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                    {onboardingLoaded ? `${completedOnboardingSteps} / ${onboardingSteps.length}` : '...'}
                  </div>
                </div>
                <Badge variant={completedOnboardingSteps === onboardingSteps.length ? 'default' : 'secondary'}>
                  {!onboardingLoaded
                    ? 'Tarkistetaan'
                    : nextPendingStep
                      ? `Seuraava: ${nextPendingStep.title}`
                      : 'Käyttöönotto valmis'}
                </Badge>
              </div>

              <Progress className="mt-4 h-2.5 bg-slate-200" value={onboardingLoaded ? onboardingProgressValue : 10} />

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {!onboardingLoaded
                  ? 'Haetaan nykyistä tilannetta yritystiedoista, asiakkaista, projekteista ja tarjouksista.'
                  : nextPendingStep
                    ? `Seuraava suositeltu vaihe on ${nextPendingStep.title.toLowerCase()}.` 
                    : 'Perusasiat ovat kunnossa ja käyttäjä voi jatkaa tarjousten viimeistelyyn ja raportointiin.'}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {!onboardingLoaded
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid gap-4 rounded-[26px] bg-slate-50/80 p-5 ring-1 ring-slate-200/70 sm:grid-cols-[84px_minmax(0,1fr)_auto] sm:items-center animate-pulse">
                    <div className="h-16 w-16 rounded-2xl bg-slate-200" />
                    <div className="space-y-3">
                      <div className="h-5 w-40 rounded bg-slate-200" />
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </div>
                    <div className="h-9 w-28 rounded-xl bg-slate-200" />
                  </div>
                ))
              : onboardingSteps.map((step, index) => {
                  const isNextPending = !step.isComplete && index === nextPendingStepIndex;

                  return (
                    <div
                      key={step.title}
                      className={cn(
                        'grid gap-4 rounded-[26px] p-5 ring-1 transition-colors sm:grid-cols-[84px_minmax(0,1fr)_auto] sm:items-center',
                        step.isComplete && 'bg-emerald-50/80 ring-emerald-200/70',
                        isNextPending && 'bg-primary/5 ring-primary/20 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.3)]',
                        !step.isComplete && !isNextPending && 'bg-slate-50/80 ring-slate-200/70'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold tracking-tight',
                          step.isComplete && 'bg-emerald-100 text-emerald-700',
                          !step.isComplete && 'bg-white text-slate-700 ring-1 ring-slate-200'
                        )}
                      >
                        {step.isComplete ? <CheckCircle className="h-7 w-7" weight="fill" /> : String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-lg font-semibold tracking-tight text-slate-950">{step.title}</h3>
                          <Badge variant={step.isComplete ? 'default' : isNextPending ? 'secondary' : 'outline'}>
                            {step.isComplete ? 'Valmis' : isNextPending ? 'Seuraava' : 'Kesken'}
                          </Badge>
                          {step.countLabel && <Badge variant="outline">{step.countLabel}</Badge>}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                        {!step.isComplete && step.permissionNote && (
                          <p className="mt-2 text-xs font-medium text-slate-500">{step.permissionNote}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:items-end">
                        {step.isComplete ? (
                          <div className="text-sm font-medium text-emerald-700">Valmis</div>
                        ) : (
                          <Button
                            type="button"
                            variant={isNextPending ? 'default' : 'outline'}
                            className="min-w-[148px]"
                            onClick={() => onNavigate?.(step.target)}
                          >
                            {step.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_360px] xl:items-start">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_36px_90px_-56px_rgba(15,23,42,0.75)] sm:p-8">
          <div className="max-w-3xl space-y-4">
            <Badge variant="secondary" className="h-8 rounded-full bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white hover:bg-white/10">
              Pika-aloitus
            </Badge>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kuusi askelta ensimmäiseen tarjoukseen</h2>
              <p className="text-sm leading-7 text-slate-300 sm:text-base">
                Koko aloituspolku yhdestä näkymästä: yritystiedot, asiakas, projekti, tarjous, vienti ja viimeinen tarkistus.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {quickStartSteps.map((step, index) => (
              <div
                key={step.title}
                className="grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="text-4xl font-semibold tracking-tight text-white/90 sm:text-5xl">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-tight text-white">{step.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{step.description}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center sm:w-auto"
                  onClick={() => onNavigate?.(step.target)}
                >
                  {step.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-slate-200/70 bg-white/90 p-6 shadow-[0_22px_60px_-46px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                <Warning className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Hyvä muistaa</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Tarkista nämä asiat ennen vientiä, lähetystä tai mallisisällön käyttöönottoa.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {reminders.map((item) => (
                <div key={item.title} className="grid gap-1.5 border-l border-slate-200 pl-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CheckCircle className="h-4 w-4 text-emerald-600" weight="fill" />
                    {item.title}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[28px] border-slate-200/70 bg-white/90 p-6 shadow-[0_22px_60px_-46px_rgba(15,23,42,0.28)]">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Missä mikäkin tehdään?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Kun oikea näkymä löytyy heti, ensimmäinen tarjous syntyy huomattavasti nopeammin.
              </p>
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    type="button"
                    className="group flex w-full items-start gap-4 py-4 text-left first:pt-0 last:pb-0"
                    onClick={() => onNavigate?.(item.target)}
                  >
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 transition-colors group-hover:bg-slate-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-base font-semibold tracking-tight text-slate-950">{item.title}</div>
                        <span className="text-sm font-medium text-primary">{item.actionLabel}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <Badge variant="outline" className="h-8 rounded-full border-slate-300 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
            FAQ
          </Badge>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">Usein kysytyt kysymykset</h2>
            <p className="mt-2 text-base leading-8 text-slate-600">
              Vastaukset yleisimpiin kysymyksiin aloituksesta, tarjouseditorista, viennistä ja tavallisista ongelmatilanteista.
            </p>
          </div>
        </div>

        <Card className="rounded-[32px] border-slate-200/70 bg-slate-50/80 p-4 shadow-[0_30px_80px_-56px_rgba(15,23,42,0.3)] sm:p-6 xl:p-8">
          <div className="grid gap-6 xl:grid-cols-2">
            {faqSections.map((section) => {
              const Icon = section.icon;

              return (
                <div key={section.title} className="rounded-[28px] bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">{section.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{section.description}</p>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="mt-5 space-y-3">
                    {section.items.map((item, index) => (
                      <AccordionItem
                        key={item.question}
                        value={`${section.title}-${index}`}
                        className="rounded-2xl border-0 bg-slate-50/85 px-5 ring-1 ring-slate-200/70"
                      >
                        <AccordionTrigger className="py-5 text-base font-semibold leading-7 text-slate-950 hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 text-[15px] leading-7 text-slate-600">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}