import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const termsContent = [
  {
    number: 1,
    title: 'Asennuspalvelun yleiskuvaus',
    text: 'Asennus tarjotaan kokonaisurakkana tarjouksen sisältämille tuotteille ja varusteille. Asennustöitä ei ole mahdollista tilata erikseen ilman varustetoimitusta.'
  },
  {
    number: 2,
    title: 'Lisä- ja muutostyöt',
    text: 'Muiden kuin tarjouksessa eriteltyjen varustetoimitusten tai asennustöiden lisääminen (lisä- ja muutostyöt) laskutetaan erikseen sovitun tuntihinnan mukaan.'
  },
  {
    number: 3,
    title: 'Kokonaishinnan sisältö',
    text: 'Tarjouksen kokonaishinta sisältää: työnjohdon, asennusten dokumentoinnin, tarvikkeiden kuljetuksen työmaalle, vanhojen kalusteiden purkamisen ja poiskuljetuksen jätelavalle, kaikki asennustyöt, kiinnitystyöt, tiivistykset, peruslaudan asennuksen (tasapuutyö, H-teline tms.), asennuskalustot sekä työvälineet.'
  },
  {
    number: 4,
    title: 'Työmaaolosuhteet',
    text: 'Työn suorittaminen edellyttää, että asennuskohteessa on käytettävissä riittävä sähkövirta (230V) sekä käyttövesi asennusaikana. Mikäli näitä ei ole saatavilla, asiasta tulee ilmoittaa etukäteen.'
  },
  {
    number: 5,
    title: 'Erikoisvälineet ja -laitteet',
    text: 'Mahdolliset erikoistyövälineiden, koneiden tai telineiden vuokrakulut sisältyvät erikseen sovittuun kokonaishintaan ja eritellään tarjouksessa.'
  },
  {
    number: 6,
    title: 'Erikoistyöt ja vaativat asennukset',
    text: 'Tarjouksen hinta kattaa normaalimittaiset asennustyöt. Erikoisasennukset, vaativat rakenteet tai poikkeukselliset työolosuhteet hinnoitellaan erikseen hintaan 55,00 €/h (alv 0%).'
  },
  {
    number: 7,
    title: 'Asennuskohteen edellytykset',
    text: 'Tilaaminen edellyttää asennuskohteen soveltuvuuden varmistamista. Tilaajan tulee varmistaa rakenteiden riittävä kantavuus sekä tarvittavat rakenteiden vahvikkeet (esim. kipsilevy vahvikkeilla, vaakasuorat vahvikkeet tukikahvoille).'
  },
  {
    number: 8,
    title: 'Työmaan valmiustaso',
    text: 'Asennuskohteen tulee olla siisti, valmis asennukselle ja tyhjä ennen asennusryhmän saapumista. Mahdolliset urakkaan kuulumattomat tuotteet (esim. pesualtaat, WC-istuimet) siirretään sivuun kohteessa, mikäli ne eivät häiritse asennustyötä.'
  },
  {
    number: 9,
    title: 'Kulkuyhteydet ja infrastruktuuri',
    text: 'Asennuskohteeseen tulee olla esteetön kulkuyhteys asennusvälineille ja materiaaleille. Sähkövirran tulee olla käytettävissä koko asennustyön ajan. Mikäli edellytykset eivät täyty, ylimääräisestä työstä laskutetaan erikseen.'
  },
  {
    number: 10,
    title: 'Erikoistöiden ennakkoilmoitus',
    text: 'Kaikista erikoistöistä tai poikkeavista asennuskohteista tulee ilmoittaa kirjallisesti etukäteen. Ilmoittamattomia erikoistöitä ei voida suorittaa ilman erillistä sopimusta. Tuntityöveloitus 55,00 €/h (alv 0%), vähintään 4 tuntia/työpäivä.'
  },
  {
    number: 11,
    title: 'Lisäkäynnit ja jälkityöt',
    text: 'Tarjouksen ulkopuoliset lisä- ja muutostyöt sekä erilliset työmaakäynnit laskutetaan hintaan 55,00 €/h (alv 0%), vähintään 4 tuntia per käynti.'
  },
  {
    number: 12,
    title: 'Maksu- ja voimassaoloehdot',
    text: 'Tarjouksen voimassaoloaika on 30 päivää tarjouspäivämäärästä. Hinnat perustuvat tarjouksen tekohetken hintatasoon. Laskutus tapahtuu toteutuneiden määrien ja töiden mukaan, mikäli ne poikkeavat tarjouksen määristä.'
  },
  {
    number: 13,
    title: 'Maksuehdot',
    text: 'Maksuehto 14 päivää netto. Viivästyskorko vuotuinen viitekorko + 8 %. Perintäkulut peritään kulloinkin voimassa olevan lain mukaan.'
  },
  {
    number: 14,
    title: 'Takuu',
    text: 'Asennustöille myönnetään 12 kuukauden takuu asennuspäivämäärästä lukien. Takuu kattaa asennusvirheet ja materiaaliviat, jotka johtuvat asennustoiminnasta. Takuu ei kata normaalia kulumista, väärinkäyttöä tai kolmannen osapuolen aiheuttamia vaurioita.'
  },
  {
    number: 15,
    title: 'Reklamaatiot',
    text: 'Mahdolliset reklamaatiot tulee tehdä kirjallisesti 7 päivän kuluessa työn valmistumisesta. Piilossa olevat virheet tulee reklamoida kohtuullisessa ajassa niiden havaitsemisesta.'
  }
];

export default function TermsPage() {
  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-semibold">Sopimusehdot</h1>
        <p className="text-muted-foreground mt-1">Yleisehdot tarjouksille</p>
      </div>

      <Card>
        <CardHeader className="bg-destructive text-destructive-foreground">
          <CardTitle className="text-lg font-semibold">ASENNUSTEN EHDOT</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {termsContent.map((term) => (
              <div key={term.number} className="flex gap-3">
                <span className="font-semibold text-foreground flex-shrink-0 w-6">{term.number}.</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">{term.title}</h4>
                  <p className="text-foreground/90 leading-relaxed text-sm">{term.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
