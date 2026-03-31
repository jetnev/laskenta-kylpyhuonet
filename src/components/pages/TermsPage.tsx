import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const termsContent = [
  {
    number: 1,
    text: 'Asennun on tarjolla urakkana tarjouksen sisältämille varusteille. Asennustarpoja ei ole voinnassa lisämättä ilman varustetoimitusta.'
  },
  {
    number: 2,
    text: 'Muiden kuin tarjouksessa eriteltyjen varustetoimitusten tai töiden lisääminen (liisä-/muutostyöt).'
  },
  {
    number: 3,
    text: 'Kokonaisinta sisältää: työnjohto, dokumentoint, tüstteiden johtamisen keroitessa, ahleiden poistamsen työimaan jatekasayksen, asennukset, kiinnityksenkohdet, tiivistykset, perustuslvouken (tastaputnet, H-tivkan muu), maalikalut ja päivähdat.'
  },
  {
    number: 4,
    text: 'Perustusrautuset sisältyvät kokonaishintaan edellytten, että kohleessa on käydettävissä haja ja sirtoretti ovat esinetniah.'
  },
  {
    number: 5,
    text: 'Mahdolliset huoneet sisältyvät rinteen sovittaun laajatuessa.'
  },
  {
    number: 6,
    text: 'Hinta sisältää: normimukina asenrusteluiätte. Tinaraitekonkaodituukaa vaativat reel. lisahik 4 00 E/nalko (alv 0%).'
  },
  {
    number: 7,
    text: 'Tilaga vaatae asennusukäijän suoruutuista: kaninnuudiesta sekä rakenteiden sisältäisiä vahvokkeita.'
  },
  {
    number: 8,
    text: 'Asennukskahdein ehteiden kuco sitta tazsin vämii ennen alskulua. Mahdelliset urakkaun kyckinnenttomat allaat ja WC-tinumat atomalluna olkuteen.'
  },
  {
    number: 9,
    text: 'Tiloihin esikelon kulja ja lisä ybjemenly ritiäkerantis ennen asennuksia: tarvillesssa lekjeniya itaätyötä.'
  },
  {
    number: 10,
    text: 'Eritteet täytvat tlaastata pitjutusta svielä rilikmestai ei viamitti: tuntiiyö, mv. 4 hk/ppiv.'
  },
  {
    number: 11,
    text: 'Lisä- ja muutostyö sekä erilliset käynnit: 55,00 €/h (alv 0%), min. 4 h/käynti.'
  },
  {
    number: 12,
    text: 'Tarjouksen voskiaikkhnat pryvyvät muutomelarhalla risytuntuta tsiesurureta rissata. Laskutus tapahtuu totetuneiden määrän mukaan terputuksen akzäpotiteista joätäien.'
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
            <p className="font-medium mb-4">Aikataulun: Aikatauesti alkäisen noin vko 42</p>
            
            <div className="space-y-3">
              {termsContent.map((term) => (
                <div key={term.number} className="flex gap-3">
                  <span className="font-medium text-foreground flex-shrink-0">{term.number}.</span>
                  <p className="text-foreground leading-relaxed">{term.text}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
