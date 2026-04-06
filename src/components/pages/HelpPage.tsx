import { ChartBar, FilePdf, FileText, Folder, FolderOpen, Package, User, Warning } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

type HelpTarget = 'account' | 'projects' | 'products' | 'reports';

interface HelpPageProps {
  onNavigate?: (page: HelpTarget) => void;
}

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
    value: '4',
    label: 'pikanavigointia oikeaan työtilaan',
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
    actionLabel: 'Siirry projekteihin',
  },
  {
    title: 'Luo projekti',
    description:
      'Luo projekti asiakkaan alle ja täytä vähintään projektin nimi sekä työkohde. Tarjoukset rakennetaan aina projektin sisälle.',
    target: 'projects' as const,
    actionLabel: 'Luo projekti',
  },
  {
    title: 'Tee tarjous valmiiksi',
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
      'Varmista asiakkaan tiedot, työkohde, loppusumma ja valittu vientimuoto ennen lähetystä.',
    target: 'projects' as const,
    actionLabel: 'Viimeistele',
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

export default function HelpPage({ onNavigate }: HelpPageProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-10 p-4 sm:space-y-12 sm:p-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-[0_30px_80px_-56px_rgba(15,23,42,0.35)]">
        <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div className="space-y-6">
            <Badge variant="outline" className="h-8 rounded-full border-slate-300 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
              UKK & ohjeet
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Selkeä aloituspolku ja vastaukset yleisimpiin kysymyksiin
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                Tämä sivu keskittyy käytännön käyttöohjeisiin: mitä tehdään ensin, mistä löydät oikean näkymän ja miten ratkaiset yleisimmät tilanteet nopeasti.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">Aloita tästä</Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">Projektit ja tarjoukset</Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">PDF ja Excel</Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">UKK</Badge>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.3)] backdrop-blur">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pikanavigointi</div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Siirry oikeaan paikkaan heti</h2>
              <p className="text-sm leading-6 text-slate-600">
                Avaa yleisimmät työvaiheet yhdellä klikkauksella.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button className="h-11 justify-start gap-2" onClick={() => onNavigate?.('projects')}>
                <Folder className="h-4 w-4" />
                Avaa projektit
              </Button>
              <Button variant="outline" className="h-11 justify-start gap-2 border-slate-300 bg-white/80" onClick={() => onNavigate?.('account')}>
                <User className="h-4 w-4" />
                Täytä yritystiedot
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

      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_36px_90px_-56px_rgba(15,23,42,0.75)] sm:p-8">
        <div className="max-w-3xl space-y-4">
          <Badge variant="secondary" className="h-8 rounded-full bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white hover:bg-white/10">
            Aloita tästä
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kuusi askelta ensimmäiseen tarjoukseen</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Etene järjestyksessä, niin saat ensimmäisen tarjouksen nopeasti valmiiksi ilman ylimääräistä säätöä.
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

      <section className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <Badge variant="outline" className="h-8 rounded-full border-slate-300 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
            Missä mikäkin tehdään?
          </Badge>
          <p className="text-sm leading-7 text-slate-600 sm:text-base">
            Jos etsit oikeaa näkymää, käytä tätä karttaa: tili, projektit, tuotteet ja raportointi.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                type="button"
                className="group rounded-[24px] border border-slate-200/70 bg-white/90 p-5 text-left shadow-[0_18px_42px_-34px_rgba(15,23,42,0.26)] transition-colors hover:bg-slate-50"
                onClick={() => onNavigate?.(item.target)}
              >
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 transition-colors group-hover:bg-slate-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-base font-semibold tracking-tight text-slate-950">{item.title}</div>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{item.actionLabel}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

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
