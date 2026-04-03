import { CheckCircle, FilePdf, FileText, Folder, Warning } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const quickStartSteps = [
  {
    title: 'Täytä omat yritystiedot',
    description:
      'Avaa Oma tili ja lisää yrityksen nimi, sähköposti, puhelin ja osoite. Näitä tietoja käytetään PDF- ja Excel-vienneissä.',
  },
  {
    title: 'Lisää asiakas',
    description:
      'Siirry Projektit-sivulle ja luo ensin asiakas. Sen jälkeen samaan asiakkaaseen on helppo liittää useita projekteja ja tarjouksia.',
  },
  {
    title: 'Luo projekti',
    description:
      'Luo projekti asiakkaan alle ja täytä ainakin projektin nimi ja työkohde. Tarjoukset rakennetaan aina projektin sisälle.',
  },
  {
    title: 'Tee tarjouspohja valmiiksi',
    description:
      'Avaa projekti ja luo uusi tarjous tai muokkaa valmista mallitarjousta. Voit lisätä rivejä, väliotsikoita ja lisäkuluja samaan tarjoukseen.',
  },
  {
    title: 'Vie asiakkaalle sopivaan muotoon',
    description:
      'Käytä PDF:ää asiakaslähetykseen, asiakas-Exceliä jaettavaan taulukkoon ja sisäistä Exceliä omalle tiimille tai tarkempaan kustannusseurantaan.',
  },
];

const reminders = [
  'Malliasiakas, malliprojekti ja mallitarjous ovat vain aloitusta varten. Muokkaa tai poista ne ennen omaa käyttöä.',
  'Tarjouksen loppusumma muodostuu tarjousriveistä, lisäkuluista, mahdollisesta alennuksesta ja arvonlisäverosta.',
  'Jos viet dokumentin asiakkaalle, tarkista ensin yritystiedot, asiakas ja työkohde.',
  'Sisäinen Excel sisältää enemmän tietoa kuin asiakkaalle tarkoitettu vienti.',
];

const faqSections = [
  {
    title: 'Aloittaminen',
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

export default function HelpPage() {
  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
      <div className="space-y-3">
        <Badge variant="outline" className="uppercase tracking-[0.2em] text-xs">Ohjeet</Badge>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Pika-aloitus ja UKK</h1>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            Tämän sivun tarkoitus on auttaa käyttäjää pääsemään nopeasti alkuun, luomaan ensimmäinen tarjous ja ratkaisemaan tavallisimmat ongelmat ilman erillistä opastusta.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-primary" weight="fill" />
              Pika-aloitus
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quickStartSteps.map((step, index) => (
                <div key={step.title} className="rounded-xl border bg-background p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {index + 1}
                    </div>
                    <h2 className="font-semibold leading-snug">{step.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-6">{step.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Warning className="h-5 w-5 text-primary" weight="fill" />
              Hyvä muistaa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {reminders.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border bg-background p-4">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" weight="fill" />
                <p className="text-sm text-muted-foreground leading-6">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {faqSections.map((section) => (
          <Card key={section.title} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                {section.title === 'Tarjouksen tekeminen' && <Folder className="h-5 w-5 text-primary" weight="fill" />}
                {section.title === 'PDF ja Excel' && <FilePdf className="h-5 w-5 text-primary" weight="fill" />}
                {(section.title === 'Aloittaminen' || section.title === 'Ongelmatilanteet') && <FileText className="h-5 w-5 text-primary" weight="fill" />}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Accordion type="single" collapsible>
                {section.items.map((item, index) => (
                  <AccordionItem key={item.question} value={`${section.title}-${index}`}>
                    <AccordionTrigger className="text-base font-medium">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-7 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}