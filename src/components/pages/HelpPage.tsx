import { CheckCircle, FilePdf, FileText, Folder, Warning } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const quickStartSteps = [
  {
    title: 'Tayta omat yritystiedot',
    description:
      'Avaa Oma tili ja lisaa yrityksen nimi, sahkoposti, puhelin ja osoite. Naita tietoja kaytetaan PDF- ja Excel-vienneissa.',
  },
  {
    title: 'Lisaa asiakas',
    description:
      'Siirry Projektit-sivulle ja luo ensin asiakas. Sen jalkeen samaan asiakkaaseen on helppo liittaa useita projekteja ja tarjouksia.',
  },
  {
    title: 'Luo projekti',
    description:
      'Luo projekti asiakkaan alle ja tayta ainakin projektin nimi ja tyokohde. Tarjoukset rakennetaan aina projektin sisalle.',
  },
  {
    title: 'Tee tarjouspohja valmiiksi',
    description:
      'Avaa projekti ja luo uusi tarjous tai muokkaa valmista mallitarjousta. Voit lisata riveja, valiotsikoita ja lisakuluja samaan tarjoukseen.',
  },
  {
    title: 'Vie asiakkaalle sopivaan muotoon',
    description:
      'Kayta PDF:aa asiakaslahetykseen, asiakas-Excelia jaettavaan taulukkoon ja sisainen Excel omalle tiimille tai tarkempaan kustannusseurantaan.',
  },
];

const reminders = [
  'Malliasiakas, malliprojekti ja mallitarjous ovat vain aloitusta varten. Muokkaa tai poista ne ennen omaa kayttoa.',
  'Tarjouksen loppusumma muodostuu tarjousriveista, lisakuluista, mahdollisesta alennuksesta ja arvonlisaverosta.',
  'Jos viet dokumentin asiakkaalle, tarkista ensin yritystiedot, asiakas ja tyokohde.',
  'Sisainen Excel sisaltaa enemman tietoa kuin asiakkaalle tarkoitettu vienti.',
];

const faqSections = [
  {
    title: 'Aloittaminen',
    items: [
      {
        question: 'Miten paasen alkuun, jos nakyma on tyhja?',
        answer:
          'Aloita tayttamalla omat yritystietosi Oma tili -sivulla. Sen jalkeen mene Projektit-sivulle, luo asiakas, luo projekti asiakkaan alle ja tee ensimmainen tarjous projektin sisalle. Jos tililla on valmiiksi mallisisaltoa, voit kayttaa sita pohjana.',
      },
      {
        question: 'Miten kaytan mallitarjousta oman tarjouksen pohjana?',
        answer:
          'Avaa mallitarjous, vaihda asiakkaan ja projektin tiedot oikeiksi, muokkaa rivit vastaamaan oikeaa kohdetta ja tarkista lopuksi hinnat ja yritystiedot ennen vientia.',
      },
      {
        question: 'Missa taytan omat yritystiedot tarjoukselle?',
        answer:
          'Avaa Oma tili ja tallenna yrityksen nimi, sahkoposti, puhelin, osoite ja tarvittaessa logon URL. Naita tietoja kaytetaan automaattisesti PDF- ja Excel-vienneissa.',
      },
    ],
  },
  {
    title: 'Tarjouksen tekeminen',
    items: [
      {
        question: 'Miten lisaan asiakkaan ja projektin?',
        answer:
          'Projektit-sivulla voit lisata ensin asiakkaan ja sen jalkeen uuden projektin. Projekti kuuluu aina yhdelle asiakkaalle, joten asiakkaan luonti kannattaa tehda ensin.',
      },
      {
        question: 'Miten lisaan riveja, valiotsikoita ja lisakuluja?',
        answer:
          'Tarjouseditorissa voit lisata normaalin tuoterivin, asennusrivin, yhdistetyn tuote ja asennus -rivin, valiotsikon tai erillisen veloitusrivin. Valiotsikko auttaa ryhmittelemaan tarjouksen sisallon selkeasti asiakkaalle.',
      },
      {
        question: 'Miten hinnat ja loppusumma muodostuvat?',
        answer:
          'Jokainen tarjousrivi kasvattaa rivien valisummaa. Sen paalle lisataan mahdolliset lisakulut, vahennetaan mahdollinen alennus ja lopuksi lasketaan ALV. Lopputulos nakyy yhteenvedossa reaaliajassa.',
      },
      {
        question: 'Mita revisio tarkoittaa?',
        answer:
          'Revisio tarkoittaa tarjouksen uutta versiota. Kayta revisiota silloin, kun haluat jatkaa aiemmin lahetetysta tai valmiista tarjouksesta ilman etta alkuperainen versio katoaa.',
      },
    ],
  },
  {
    title: 'PDF ja Excel',
    items: [
      {
        question: 'Milloin kaytan PDF:aa?',
        answer:
          'PDF sopii asiakkaalle lahetettavaan viralliseen tarjoukseen. Se on selkein vaihtoehto silloin, kun haluat asiakkaalle helppolukuisen dokumentin ilman muokattavaa taulukkoa.',
      },
      {
        question: 'Mita eroa on asiakas-Excelilla ja sisaisella Excelilla?',
        answer:
          'Asiakas-Excel on kevyempi, siistimpi ja tarkoitettu jaettavaksi asiakkaalle. Sisainen Excel sisaltaa laajemmat laskentatiedot, kuten ostohintoja, katetta tai muuta omaan kayttoon sopivaa tietoa.',
      },
      {
        question: 'Miksi PDF:ssa tai Excelissa nakyy vaarat yritystiedot?',
        answer:
          'Tarkista ensin Oma tili -sivun yritystiedot. Jos omia tietoja ei ole tallennettu, sovellus voi kayttaa yhteisia oletustietoja. Paivita tiedot ja vie dokumentti uudelleen.',
      },
      {
        question: 'Miksi asiakkaalle tarkoitettu PDF ei nayta tilaa?',
        answer:
          'Asiakasversiossa ei nayteta luonnos- tai muita sisaisia tilatietoja, jotta dokumentti pysyy virallisena ja asiakkaalle selkeana.',
      },
    ],
  },
  {
    title: 'Ongelmatilanteet',
    items: [
      {
        question: 'Mita teen, jos kirjautuminen ei onnistu?',
        answer:
          'Tarkista ensin sahkopostiosoite ja salasana. Jos ongelma jatkuu, kokeile salasanan vaihtoa Unohtuiko salasana? -toiminnolla. Jos saat edelleen virheen, ota yhteys jarjestelman yllapitajaan.',
      },
      {
        question: 'Miten vaihdan salasanani?',
        answer:
          'Avaa Oma tili -sivu, syota nykyinen salasana ja uusi salasana seka vahvistus. Tallenna muutos lopuksi samalta sivulta.',
      },
      {
        question: 'Voinko poistaa virheellisen tarjouksen?',
        answer:
          'Kyllä. Avaa oikea projekti, etsi tarjous listasta ja poista se. Tarkista ennen poistamista, ettei kyseessa ole tarjous, jonka haluatkin sailyttaa revisiohistorian vuoksi.',
      },
      {
        question: 'Mista loydan vanhat tarjoukset ja projektit?',
        answer:
          'Projektit-sivulla jokaisen projektin alta nakyvat siihen liittyvat tarjoukset. Hae projektin nimella, asiakkaalla tai tarjousnumerolla, jos et loyda oikeaa kohdetta heti.',
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
            Taman sivun tarkoitus on auttaa kayttajaa paasemaan nopeasti alkuun, luomaan ensimmainen tarjous ja ratkaisemaan tavallisimmat ongelmat ilman erillista opastusta.
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
              Hyva muistaa
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