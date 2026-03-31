# Laskenta - Parannusehdotukset

Päivitetty: ${new Date().toISOString().split('T')[0]}

## 🎯 Kriittiset Parannukset (Prioriteetti 1)

### 1. Autentikointi ja Roolihallinta
**Ongelma**: Nykyinen autentikointi on puutteellinen ja ei tue useita käyttäjiä kunnolla.

**Ratkaisu**:
- Poista paikallinen sähköposti/salasana-kirjautuminen kokonaan
- Hyödynnä vain Spark/GitHub-autentikointia
- Lisää kunnollinen roolipohjainen käyttöoikeushallinta:
  - **Owner**: Täydet oikeudet (tiedon hallinta, käyttäjien hallinta)
  - **Editor**: Voi muokata dataa, ei voi hallita käyttäjiä
  - **Viewer**: Vain lukuoikeudet
- Päivitä UI näyttämään vain sallitut toiminnot kullekin roolille
- Poista kaikki selväkieliset salasanat KV-tallennuksesta

**Vaikutus**: Parantaa merkittävästi tietoturvaa ja mahdollistaa turvallisen monen käyttäjän käytön.

---

### 2. Yhtenäinen Laskentalogiikka
**Ongelma**: Eri näkymät (tarjouseditori, dashboard, raportointi) saattavat laskea lukuja eri tavalla.

**Ratkaisu**:
- Luo yksi keskitetty `src/lib/calculations.ts` tiedosto
- Määrittele selkeät funktiot:
  - `calculateQuoteRow()` - yksittäisen rivin laskenta
  - `calculateQuoteTotals()` - tarjouksen kokonaissummat
  - `calculateRowCost()` - rivin kustannus
  - `calculateRowRevenue()` - rivin tuotto
  - `calculateRowMargin()` - rivin kate
- Dokumentoi tarkasti:
  - Mitä `salesPrice` tarkoittaa
  - Mitä `installationPrice` tarkoittaa
  - Koskeeko `regionMultiplier` vain asennusta vai koko riviä
  - Miten `overridePrice` toimii
  - Miten kate lasketaan
- Käytä samaa logiikkaa kaikkialla (editori, dashboard, raportit)

**Vaikutus**: Varmistaa että kaikki luvut ovat johdonmukaisia kaikkialla sovelluksessa.

---

### 3. Cascade Delete ja Datan Eheys
**Ongelma**: Tarjouksen tai projektin poistaminen voi jättää "orporivejä" tietokantaan.

**Ratkaisu**:
- Lisää ketjutetut poistofunktiot `use-data.ts`:ään:
  - `deleteQuoteCascade(quoteId)` - poistaa tarjouksen JA kaikki sen rivit
  - `deleteProjectCascade(projectId)` - poistaa projektin, sen tarjoukset JA tarjousrivit
- Lisää varmistusdialogia ennen isoja poistoja
- Lisää korjaustyökalu vanhalle datalle:
  - `repairOrphanedQuoteRows()` - siivoaa rivit ilman tarjousta
  - `repairOrphanedQuotes()` - siivoaa tarjoukset ilman projektia

**Vaikutus**: Estää datan korruptoitumisen ja pitää tietokannan eheänä.

---

## 🔧 Tärkeät Parannukset (Prioriteetti 2)

### 4. Oikeat Vientiformaatit
**Ongelma**: "Vie PDF" ja "Vie Excel" -painikkeet eivät aina tuota oikeita tiedostomuotoja.

**Ratkaisu**:
- Korjaa XLSX-vienti käyttämään oikeaa Excel-kirjastoa
- Korjaa PDF-vienti tuottamaan oikeita PDF-tiedostoja (ei HTML-ikkunaa)
- Nimeä painikkeet oikein jos joku formaatti jää väliaikaisesti CSV:ksi
- Lisää sarakekartat vientiin selkeiksi
- Varmista että asiakasvienti piilottaa sisäiset hinnat oikein

**Vaikutus**: Asiakkaat saavat ammattimaisempia tarjouksia oikeissa formaateissa.

---

### 5. Tuontitoiminnallisuuden Parantaminen
**Ongelma**: Tuontitoiminto on piilossa ja voi aiheuttaa hiljaisia virheitä.

**Ratkaisu**:
- Lisää "Tuonti" navigaatioon näkyvästi
- Paranna esikatselunäkymää näyttämään:
  - Vihreällä: uudet rivit
  - Keltaisella: päivitettävät rivit
  - Punaisella: virheelliset rivit
- Estä tuonti jos kriittisiä virheitä
- Näytä selkeä yhteenveto tuonnin jälkeen:
  - X uutta tuotetta lisätty
  - Y tuotetta päivitetty
  - Z riviä ohitettu virheiden vuoksi
- Lisää mahdollisuus ladata virheelliset rivit Excel-tiedostona korjausta varten

**Vaikutus**: Turvallisempi ja luotettavampi massatuonti.

---

### 6. Deadline- ja Aikatauluhallinta
**Ongelma**: Tarjouksille ei ole kunnollista määräajanseurantaa.

**Ratkaisu**:
- Lisää tarjouksille kentät:
  - `validUntil` - tarjouksen voimassaoloaika
  - `estimatedDelivery` - arvioitu toimitusaika
  - `deadlines[]` - projektiin liittyvät määräajat
- Lisää dashboard-näkymään "Lähestyvät määräajat" -kortti
- Lisää ilmoitusjärjestelmä:
  - Näytä badge navigaatiossa jos määräajoja lähestyy
  - Näytä varoitus tarjouseditorissa jos tarjous on vanhentumassa
- Lisää suodattimet projektilistaukseen määräaikojen mukaan

**Vaikutus**: Parempi projektienhallinta ja vähemmän myöhästyneitä tarjouksia.

---

### 7. Joukkotoiminnot
**Ongelma**: Useiden tuotteiden muokkaus kerralla on työlästä.

**Ratkaisu**:
- Lisää valintaruudut taulukoihin (tuotteet, hintaryhmät, projektit)
- Lisää joukkotoimintopainikkeet:
  - "Vaihda kategoria" - monelle tuotteelle kerralla
  - "Päivitä hintaryhmä" - monelle tuotteelle kerralla
  - "Poista valitut" - monelle kohteelle kerralla
  - "Vie valitut" - vain valitut tuotteet Exceliin
- Näytä valintojen määrä ja yhteenveto ennen toimintoa
- Lisää "Valitse kaikki" ja "Tyhjennä valinnat" -painikkeet

**Vaikutus**: Merkittävästi nopeampi massapäivitysten tekeminen.

---

## 💡 Hyödylliset Lisäykset (Prioriteetti 3)

### 8. Tuotteiden Kopiointi
**Ratkaisu**:
- Lisää "Kopioi tuote" -painike tuotteen muokkausnäkymään
- Kopioi kaikki tiedot uudelle tuotteelle
- Lisää "(kopio)" nimen perään
- Luo uusi koodi automaattisesti
- Avaa heti muokkausnäkymä

**Vaikutus**: Helpottaa samankaltaisten tuotteiden luontia.

---

### 9. Tarjousten Hakutoiminto
**Ratkaisu**:
- Lisää hakukenttä projektilistaukseen
- Etsi projektien, asiakkaiden ja tarjousten nimistä
- Näytä hakutulokset reaaliajassa
- Lisää suodattimet:
  - Status (luonnos, lähetetty, hyväksytty)
  - Alue
  - Päivämääräväli
  - Hintaväli

**Vaikutus**: Nopea vanhojen tarjousten löytäminen.

---

### 10. Tarjousmallien (Templates) Tuki
**Ratkaisu**:
- Lisää mahdollisuus tallentaa tarjous malliksi
- Näytä mallit omassa listassaan
- "Luo tarjous mallista" -painike
- Mallit voivat sisältää:
  - Vakiorivit (esim. perus kylpyhuonepaketti)
  - Vakioehdot
  - Oletuskate

**Vaikutus**: Nopeampi vakiotarjousten luonti.

---

### 11. Aktiviteettiloki (Audit Trail)
**Ratkaisu**:
- Tallenna muutoshistoria:
  - Kuka teki muutoksen
  - Milloin
  - Mitä muutettiin
  - Vanhat ja uudet arvot
- Näytä loki:
  - Projektin yhteydessä
  - Tarjouksen yhteydessä
  - Asetukset-sivulla (globaali loki)
- Filtteröinti käyttäjän ja päivämäärän mukaan

**Vaikutus**: Parempi auditointimahdollisuus ja virheiden jäljitys.

---

### 12. Dashboard-parannukset
**Ratkaisu**:
- Lisää interaktiiviset kaaviot:
  - Kate-% kehitys ajan suhteen
  - Tarjousten conversion rate (lähetetty → hyväksytty)
  - Top 15 asiakkaat liikevaihdolla mitattuna
- Lisää suodattimet:
  - Aikaväli (tämä kuukausi, viime kuukausi, Q1, Q2...)
  - Alue
  - Vastuuhenkilö
- Lisää vertailutiedot (esim. "20% enemmän kuin viime kuussa")

**Vaikutus**: Paremmat liiketoimintatiedot ja trendit näkyville.

---

### 13. Mobiilioptimointien Viimeistely
**Ratkaisu**:
- Varmista että kaikki dialogit toimivat mobiilissa
- Lisää "swipe to delete" -toiminto rivien poistoon mobiilissa
- Paranna taulukoiden vieritystä pienillä näytöillä
- Optimoi tarjouseditori tabletille:
  - Split-view: tuotelista vasemmalla, tarjous oikealla
  - Drag & drop tuotteiden lisäämiseen

**Vaikutus**: Parempi käyttökokemus mobiililaitteilla.

---

### 14. Kieliversiot
**Ratkaisu**:
- Lisää tuki ruotsin kielelle
- Lisää tuki englannin kielelle
- Asiakkaan kielivalinta vaikuttaa:
  - Tarjousten vientikieleen
  - Ehtojen kieleen
  - PDF/Excel-vientien kieleen
- Käyttöliittymä voi olla edelleen suomeksi

**Vaikutus**: Kansainvälisten asiakkaiden palvelu helpottuu.

---

### 15. Offline-tuki
**Ratkaisu**:
- Käytä Service Workeriä
- Tallenna data selaimen välimuistiin
- Salli:
  - Tarjousten katselun offline-tilassa
  - Luonnosten muokkauksen offline-tilassa
  - Synkronointi kun yhteys palautuu
- Näytä selkeä indikaattori offline-tilasta

**Vaikutus**: Sovellus toimii myös huonolla yhteydellä tai rakennustyömaalla.

---

## 🧪 Testaus ja Laatu (Prioriteetti 4)

### 16. Automaattiset Testit
**Ratkaisu**:
- Lisää yksikkötestit laskentalogiikalle
- Lisää integraatiotestit CRUD-toiminnoille
- Lisää validointitestit tuonnille
- Lisää E2E-testit kriittisille user flowille:
  - Projektin ja tarjouksen luonti
  - Rivien lisäys ja laskenta
  - Tarjouksen vienti
- Pakolliset testit:
  - `calculateQuoteRow`
  - `calculateQuoteTotals`
  - `overridePrice` toiminta
  - `regionMultiplier` soveltaminen
  - Cascade delete -toiminnot

**Vaikutus**: Varmistaa että uudet muutokset eivät riko olemassaolevia toimintoja.

---

### 17. Dokumentaation Päivitys
**Ratkaisu**:
- Päivitä README vastaamaan todellista tilaa
- Poista vanhat "stable/locked" -väitteet jos ne eivät pidä paikkaansa
- Kirjoita käyttöohje:
  - Ensimmäinen kirjautuminen
  - Tuotteiden tuonti
  - Ensimmäisen tarjouksen luonti
  - Vientiformaattien käyttö
- Lisää arkkitehtuurikuvaus:
  - Komponenttirakenne
  - Tietomalli
  - Laskentalogiikka

**Vaikutus**: Uudet käyttäjät pääsevät helpommin alkuun.

---

## 🎨 UX/UI -Parannukset

### 18. Paremmat Empty States
**Ratkaisu**:
- Tyhjissä listauksissa näytä visuaalinen ikoni
- Selkeä call-to-action: "Lisää ensimmäinen tuotteesi"
- Lyhyt ohje mitä kyseinen osio tekee
- Linkki dokumentaatioon tai tutoriaaliin

**Vaikutus**: Intuitiivisempi kokemus uusille käyttäjille.

---

### 19. Keyboard Shortcuts
**Ratkaisu**:
- `Ctrl/Cmd + K` - Haku
- `Ctrl/Cmd + N` - Uusi (projekti/tuote kontekstista riippuen)
- `Ctrl/Cmd + S` - Tallenna
- `Ctrl/Cmd + E` - Vie
- `Esc` - Sulje dialogi
- `Tab` - Seuraava kenttä
- `Shift + Tab` - Edellinen kenttä
- Näytä lista shortcuteista `?` -napista

**Vaikutus**: Nopeampi käyttö power-usereille.

---

### 20. Paremmat Latausilmaisimet
**Ratkaisu**:
- Käytä skeleton loadereita taulukoissa
- Progress bar pitkissä operaatioissa (tuonti, vienti)
- Näytä estimaatti jäljellä olevasta ajasta
- Optimistinen UI: näytä muutos heti, peruuta jos virhe

**Vaikutus**: Sovellus tuntuu nopeammalta ja responsiivisemmalta.

---

## 📊 Toteutusjärjestys (Suositus)

### Vaihe 1 - Kriittiset Korjaukset (2-3 viikkoa)
1. Autentikointi ja roolihallinta (PR #1)
2. Yhtenäinen laskentalogiikka (PR #2)
3. Cascade delete ja datan eheys (PR #3)

### Vaihe 2 - Tärkeät Parannukset (2-3 viikkoa)
4. Oikeat vientiformaatit (PR #4)
5. Tuontitoiminnon parantaminen (PR #5)
6. Deadline- ja aikatauluhallinta (PR #6)
7. Joukkotoiminnot (PR #7)

### Vaihe 3 - Hyödylliset Lisäykset (2-4 viikkoa)
8. Tuotteiden kopiointi
9. Tarjousten hakutoiminto
10. Tarjousmallit
11. Aktiviteettiloki
12. Dashboard-parannukset

### Vaihe 4 - Laatu ja Testaus (1-2 viikkoa)
13. Automaattiset testit
14. Dokumentaation päivitys
15. UX/UI -hiominen

---

## 🚀 Välittömät Pikavoitot (Tee ensin)

Jos haluat nopeita parannuksia heti, aloita näistä:

1. **Lisää joukkotoiminnot tuotehallintaan** (1 päivä)
2. **Korjaa cascade delete tarjouksille** (1 päivä)
3. **Lisää deadline-kentät ja ilmoitukset** (2 päivää)
4. **Paranna tuontiesikatselua** (1 päivä)
5. **Lisää keyboard shortcutit** (1 päivä)

Yhteensä noin 1 viikko työtä, mutta merkittävä parannus käytettävyyteen.

---

## 📝 Huomiot

- Kaikki muutokset on suunniteltu säilyttämään nykyinen toiminnallisuus
- Priorisoi muutokset oman liiketoimintasi tarpeiden mukaan
- Testaa jokainen muutos huolellisesti ennen tuotantoon viemistä
- Ota käyttäjäpalaute huomioon ja iteroi

---

**Yhteenveto**: Sovellus on jo toimiva pohja, mutta näillä parannuksilla siitä tulee huomattavasti vakaampi, turvallisempi ja helppokäyttöisempi ammattityökalu.
