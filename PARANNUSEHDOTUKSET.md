# Laskenta - Parannusehdotukset

## 🎯 Kriittiset Parannukset (Prioriteetti 1)

## 🎯 Kriittiset Parannukset (Prioriteetti 1)

- Lisää kunnollinen roolipohjainen kä
  - **Editor**: Voi muokata dataa, ei voi hallita käyttäjiä




**Ongelma**: Eri näkymät (tarjouseditori, dashboard, rap
**Ratkaisu**:
  - **Editor**: Voi muokata dataa, ei voi hallita käyttäjiä
  - `calculateQuoteTotals()` - ta
  - `calculateRowRevenue()` - rivin tuotto
- Dokumentoi tarkasti:

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

  - Miten kate lasketaan
- Käytä samaa logiikkaa kaikkialla (editori, dashboard, raportit)

**Vaikutus**: Varmistaa että kaikki luvut ovat johdonmukaisia kaikkialla sovelluksessa.

---

### 3. Cascade Delete ja Datan Eheys
**Ongelma**: Tarjouksen tai projektin poistaminen voi jättää "orporivejä" tietokantaan.


- Lisää ketjutetut poistofunktiot `use-data.ts`:ään:
  - `deleteQuoteCascade(quoteId)` - poistaa tarjouksen JA kaikki sen rivit
  - `deleteProjectCascade(projectId)` - poistaa projektin, sen tarjoukset JA tarjousrivit
- Lisää varmistusdialogia ennen isoja poistoja
**Ratkaisu**:
  - `repairOrphanedQuoteRows()` - siivoaa rivit ilman tarjousta
  - `repairOrphanedQuotes()` - siivoaa tarjoukset ilman projektia

**Vaikutus**: Estää datan korruptoitumisen ja pitää tietokannan eheänä.

  -



---
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
- Näytä valintojen määrä j
  - Keltaisella: päivitettävät rivit
  - Punaisella: virheelliset rivit
- Estä tuonti jos kriittisiä virheitä
- Näytä selkeä yhteenveto tuonnin jälkeen:
  - X uutta tuotetta lisätty
  - Y tuotetta päivitetty
  - Z riviä ohitettu virheiden vuoksi
- Lisää mahdollisuus ladata virheelliset rivit Excel-tiedostona korjausta varten

- Avaa heti muokkausnäkymä

---

### 6. Deadline- ja Aikatauluhallinta
**Ongelma**: Tarjouksille ei ole kunnollista määräajanseurantaa.

**Ratkaisu**:
  - Status (luonnos, lähetet
  - `validUntil` - tarjouksen voimassaoloaika
  - Hintaväli
  - `deadlines[]` - projektiin liittyvät määräajat
- Lisää dashboard-näkymään "Lähestyvät määräajat" -kortti
- Lisää ilmoitusjärjestelmä:
  - Näytä badge navigaatiossa jos määräajoja lähestyy
  - Näytä varoitus tarjouseditorissa jos tarjous on vanhentumassa
- Näytä mallit omassa listassaan

**Vaikutus**: Parempi projektienhallinta ja vähemmän myöhästyneitä tarjouksia.

---

---
**Ongelma**: Useiden tuotteiden muokkaus kerralla on työlästä.

- Filtteröint
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
---
- Lisää "(kopio)" nimen perään
**Ratkaisu**:
- Avaa heti muokkausnäkymä

**Vaikutus**: Helpottaa samankaltaisten tuotteiden luontia.

---

### 9. Tarjousten Hakutoiminto
### 14. Kieli
- Lisää hakukenttä projektilistaukseen
- Etsi projektien, asiakkaiden ja tarjousten nimistä
- Näytä hakutulokset reaaliajassa
- Lisää suodattimet:
  - Status (luonnos, lähetetty, hyväksytty)
  - Alue
  - Päivämääräväli
---

**Ratkaisu**:

---

### 10. Tarjousmallien (Templates) Tuki
**Ratkaisu**:
- Lisää mahdollisuus tallentaa tarjous malliksi
- Näytä mallit omassa listassaan

- Mallit voivat sisältää:
  - Vakiorivit (esim. perus kylpyhuonepaketti)
  - Vakioehdot
- Lisää integr

**Vaikutus**: Nopeampi vakiotarjousten luonti.

- P

  - `overridePrice` toiminta
**Ratkaisu**:

  - Kuka teki muutoksen
---
  - Mitä muutettiin
**Ratkaisu**:
- Näytä loki:
- Kirjoita käyttöohje:
  - Tarjouksen yhteydessä
  - Asetukset-sivulla (globaali loki)
- Filtteröinti käyttäjän ja päivämäärän mukaan

**Vaikutus**: Parempi auditointimahdollisuus ja virheiden jäljitys.

---

### 12. Dashboard-parannukset
**Ratkaisu**:
- Lisää interaktiiviset kaaviot:
- Tyhjissä listauksissa näytä v
  - Tarjousten conversion rate (lähetetty → hyväksytty)
- Linkki dokumentaatioon tai tutoriaaliin
- Lisää suodattimet:
  - Aikaväli (tämä kuukausi, viime kuukausi, Q1, Q2...)
  - Alue
  - Vastuuhenkilö
- Lisää vertailutiedot (esim. "20% enemmän kuin viime kuussa")

**Vaikutus**: Paremmat liiketoimintatiedot ja trendit näkyville.

---

### 13. Mobiilioptimointien Viimeistely

- Varmista että kaikki dialogit toimivat mobiilissa
- Lisää "swipe to delete" -toiminto rivien poistoon mobiilissa
- Paranna taulukoiden vieritystä pienillä näytöillä
- Optimoi tarjouseditori tabletille:
  - Split-view: tuotelista vasemmalla, tarjous oikealla


---



### 14. Kieliversiot
**Ratkaisu**:
### Vaihe 2 - Tärkeät Parannu
- Lisää tuki englannin kielelle
- Asiakkaan kielivalinta vaikuttaa:
  - Tarjousten vientikieleen
  - Ehtojen kieleen
  - PDF/Excel-vientien kieleen
- Käyttöliittymä voi olla edelleen suomeksi

**Vaikutus**: Kansainvälisten asiakkaiden palvelu helpottuu.

14.

### 15. Offline-tuki
**Ratkaisu**:
- Käytä Service Workeriä
- Tallenna data selaimen välimuistiin
1. **Lis
  - Tarjousten katselun offline-tilassa
  - Luonnosten muokkauksen offline-tilassa
  - Synkronointi kun yhteys palautuu
Yhteensä noin 1 viikko työtä, mutta merkitt

**Vaikutus**: Sovellus toimii myös huonolla yhteydellä tai rakennustyömaalla.

- K

- Ota käyttäjäpalaute huomioon ja itero


**Ratkaisu**:

- Lisää integraatiotestit CRUD-toiminnoille
- Lisää validointitestit tuonnille
- Lisää E2E-testit kriittisille user flowille:

  - Rivien lisäys ja laskenta
  - Tarjouksen vienti
- Pakolliset testit:
  - `calculateQuoteRow`
  - `calculateQuoteTotals`
  - `overridePrice` toiminta
  - `regionMultiplier` soveltaminen


**Vaikutus**: Varmistaa että uudet muutokset eivät riko olemassaolevia toimintoja.



### 17. Dokumentaation Päivitys
**Ratkaisu**:

- Poista vanhat "stable/locked" -väitteet jos ne eivät pidä paikkaansa

  - Ensimmäinen kirjautuminen

  - Ensimmäisen tarjouksen luonti

- Lisää arkkitehtuurikuvaus:

  - Tietomalli
  - Laskentalogiikka



---

## 🎨 UX/UI -Parannukset

### 18. Paremmat Empty States

- Tyhjissä listauksissa näytä visuaalinen ikoni
- Selkeä call-to-action: "Lisää ensimmäinen tuotteesi"
- Lyhyt ohje mitä kyseinen osio tekee
- Linkki dokumentaatioon tai tutoriaaliin

**Vaikutus**: Intuitiivisempi kokemus uusille käyttäjille.



### 19. Keyboard Shortcuts
**Ratkaisu**:









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
