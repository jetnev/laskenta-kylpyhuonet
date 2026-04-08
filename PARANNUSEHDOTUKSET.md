# Laskenta - Parannusehdotukset

> Päivitetty: 2026-04-08 — Toteutetut ominaisuudet merkitty ✅, osittain toteutetut ⚠️

---

## ✅ Toteutetut Ominaisuudet

Seuraavat parannusehdotukset on jo toteutettu ja ne ovat tuotantokäytössä:

### 1. Roolipohjainen Käyttöoikeushallinta ✅

Toteutettu `src/lib/access-control.ts`. Roolit: platform admin, organization owner, employee.
Oikeudet: `canEdit`, `canDelete`, `canManageUsers`, `canManageSharedData`, `canManageLegalDocuments`.

### 2. Yhtenäinen Laskentalogiikka ✅

Toteutettu `src/lib/calculations.ts`. Keskitetyt funktiot:
- `calculateQuoteRow()` — yksittäisen rivin laskenta
- `calculateQuote()` — tarjouksen kokonaissummat
- `calculateRowMargin()` — rivin kate
- ALV-käsittely ja alueellinen kerroin sisäänrakennettu

### 5. Tuontitoiminnallisuus ✅

Toteutettu `src/components/pages/ImportPage.tsx` ja `src/lib/catalog-io.ts`.
Tukee CSV, XLSX, JSON, HTML -formaatteja. Esikatselu tilastoineen (luotu/päivitetty/ohitettu).
Useita lähteitä: K-Rauta, STARK, yleinen.

### 6. Deadline- ja Aikatauluhallinta ✅

Toteutettu `src/components/DeadlineNotifications.tsx` ja `src/hooks/use-deadline-notifications.ts`.
Konfiguoitavat ennakkovaroituspäivät, sähköposti-ilmoitukset.

### 7. Joukkotoiminnot ✅

Toteutettu `src/components/pages/ProductsPage.tsx`.
Monivalinta: joukkoaktivoi/-deaktivoi, joukkopoisto, vie valitut CSV:ksi.

### 9. Hakutoiminto ✅

Toteutettu `src/components/pages/ProjectsPage.tsx` ja `ProductsPage.tsx`.
Haku koodi, nimi, kategoria, brändi. Tallennetut suodatinpresetit.

### 10. Tarjousmallien (Templates) Tuki ✅

Toteutettu `src/lib/term-templates.ts`.
Mallit kattavat ehtopohjat asiakassegmenteittäin ja scope-tyypeittäin.

### 12. Dashboard ✅

Toteutettu `src/components/pages/Dashboard.tsx`.
KPI-kortit (avoimet projektit, lähetysvalmiit tarjoukset, laskutusvalmiit),
konversiomittarit, viimeaikaiset kohteet, projektistatistiikat, hälytykset.

### 13. Mobiilioptimointi ✅

Toteutettu `src/hooks/use-mobile.ts` ja `src/components/ResponsiveTable.tsx`.
Responsive breakpoint 768px, mukautuvat taulukot ja dialogit.

---

## ⚠️ Osittain Toteutetut (Jatkokehitys)

### 3. Cascade Delete ja Datan Eheys

**Nykytila**: `ProjectsPage.tsx` käyttää nyt yhteistä cascade-delete -suunnittelua (`src/lib/project-cascade-delete.ts`) projektien ja tarjousten poistossa, ja tarjousrivit poistetaan bulk-operaationa ennen ylätason tietoja. Varsinainen hook-tason `deleteProjectCascade()` / `deleteQuoteCascade()` API puuttuu silti vielä, joten muu kutsujakoodi ei saa ketjupoistoa automaattisesti.

**Jäljellä**:
- Lisää `deleteQuoteCascade(quoteId)` — poistaa tarjouksen JA kaikki sen rivit yhdellä kutsulla
- Lisää `deleteProjectCascade(projectId)` — poistaa projektin, tarjoukset ja rivit
- Lisää `repairOrphanedQuoteRows()` ja `repairOrphanedQuotes()` -siivoukset

### 4. Vientimuodot (PDF/XLSX)

**Nykytila**: XLSX-vienti toimii xlsx-kirjastolla. PDF-vienti generoi HTML-dokumentin selaimen tulostunäkymään (`window.print()`), ei natiiveja PDF-tiedostoja.

**Jäljellä**:
- Korvaa HTML-pohjainen PDF-vienti oikealla PDF-generoinnilla (esim. jsPDF tai server-side)
- Varmista pidemmällä aikavälillä suora `.pdf`-tiedoston tallennus

### 11. Audit-loki ja Muutoshistoria

**Nykytila**: `legal.ts` sisältää `listLegalAcceptanceAudit()` sopimusehtojen hyväksyntäketjulle. Yleinen muutosloki (kuka muutti mitä, milloin) puuttuu.

**Jäljellä**:
- Lisää yleinen muutosloki tarjouksille ja tuotteille
- Näytä loki tarjouksen yhteydessä ja asetussivulla
- Filtteröinti käyttäjän ja päivämäärän mukaan

---

## 💡 Toteuttamattomat Lisäykset

### 8. Tuotteiden Kopiointi

**Ongelma**: Samankaltaisten tuotteiden luonti vaatii manuaalista syöttöä.

**Ratkaisu**:
- Lisää "Kopioi tuote" -painike tuotteen muokkausnäkymään
- Kopioi kaikki kentät ja lisää "(kopio)" nimen perään
- Avaa heti muokkausnäkymä kopioidulle tuotteelle

**Vaikutus**: Helpottaa samankaltaisten tuotteiden luontia.

### 14. Kieliversiot

**Ongelma**: Sovellus on kokonaan suomenkielinen.

**Ratkaisu**:
- Lisää tuki englannin kielelle vientiasiakirjoihin
- Asiakkaan kielivalinta vaikuttaa tarjousten, ehtojen ja vientien kieleen
- Käyttöliittymä voi jäädä suomenkieliseksi

**Vaikutus**: Kansainvälisten asiakkaiden palvelu helpottuu.

### 15. Offline-tuki

**Ongelma**: Sovellus vaatii jatkuvaa verkkoyhteyttä.

**Ratkaisu**:
- Käytä Service Workeriä välimuistiin
- Mahdollista tarjousten katselu ja luonnosten muokkaus offline-tilassa
- Synkronoi muutokset kun yhteys palautuu

**Vaikutus**: Sovellus toimii myös huonolla yhteydellä tai rakennustyömaalla.

---

## 🎨 UX/UI -Parannukset

### 16. Paremmat Empty States

- Tyhjissä listauksissa näytä visuaalinen ikoni
- Selkeä call-to-action: "Lisää ensimmäinen tuotteesi"
- Linkki dokumentaatioon tai tutoriaaliin

### 17. Keyboard Shortcuts

- Pikakomennot yleisimpiin toimintoihin (uusi tarjous, tallenna, vie)

### 18. Paremmat Latausilmaisimet

- Käytä skeleton loadereita taulukoissa
- Progress bar pitkissä operaatioissa (tuonti, vienti)
- Optimistinen UI: näytä muutos heti, peruuta jos virhe

---

## 📝 Huomiot

- Kaikki muutokset säilyttävät nykyisen toiminnallisuuden
- Priorisoi muutokset liiketoiminnan tarpeiden mukaan
- Testaa jokainen muutos huolellisesti ennen tuotantoon viemistä
