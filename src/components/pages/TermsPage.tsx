import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const termsContent = [
  {
    number: 1,
    text: 'Asennus on tarjolla urakkana tarjouksen sisältämille varusteille. Asennustöitä ei ole mahdollista lisätä ilman varustetoimitusta.'
  },
  {
    number: 2,
    text: 'Muiden kuin tarjouksessa eriteltyjen varustetoimitusten tai töiden lisääminen (lisä-/muutostyöt) laskutetaan erikseen.'
  },
  {
    number: 3,
    text: 'Kokonaishinta sisältää: työnjohdon, dokumentoinnin, tarvitteiden kuljetuksen, vanhojen kalusteiden poistamisen työmaalta jätelavalle, asennukset, kiinnitystyöt, tiivistykset, peruslaudan (tasapuutyö, H-teline tms.), mallikalut ja työvälineet.'
  },
  {
    number: 4,
    text: 'Perustyökalut sisältyvät kokonaishintaan edellyttäen, että kohteessa on käytettävissä vesi ja sähkövirta asennusaikana.'
  },
  {
    number: 5,
    text: 'Mahdolliset vuokrat sisältyvät erikseen sovittuun kokonaishintaan.'
  },
  {
    number: 6,
    text: 'Hinta sisältää normaalimukaiset asennustyöt. Erikoisasennukset tai muut vaativat työt lisähinta 55,00 €/h (alv 0%).'
  },
  {
    number: 7,
    text: 'Tilaus vaatii asennuskohteen sopivuuden varmistamisen: kantavuuden sekä rakenteiden sisältämät vahvikkeet.'
  },
  {
    number: 8,
    text: 'Asennuskohteen edellytetään olevan siisti, valmis ja tyhjä ennen asennusta. Mahdolliset urakkaan kuulumattomat altaat ja WC-istuimet asetetaan sivuun kohteeseen.'
  },
  {
    number: 9,
    text: 'Tiloihin edellytetään kulku ja sähköjännite riittävästi ennen asennuksia. Tarvittaessa ylimääräistä työtä laskutetaan erikseen.'
  },
  {
    number: 10,
    text: 'Erikoistyöt täytyy ilmoittaa etukäteen, muuten niitä ei voida tehdä. Tuntityö 55,00 €/h (alv 0%), min. 4 h/päivä.'
  },
  {
    number: 11,
    text: 'Lisä- ja muutostyö sekä erilliset käynnit: 55,00 €/h (alv 0%), min. 4 h/käynti.'
  },
  {
    number: 12,
    text: 'Tarjouksen voimassaoloaika on 30 päivää. Hinnat perustuvat tarjouksen tekohetken hintoihin. Laskutus tapahtuu toteutuneiden määrien mukaan tarjouksen määristä poiketen.'
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
          <div className="space-y-3">
            {termsContent.map((term) => (
              <div key={term.number} className="flex gap-3">
                <span className="font-medium text-foreground flex-shrink-0">{term.number}.</span>
                <p className="text-foreground leading-relaxed">{term.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
