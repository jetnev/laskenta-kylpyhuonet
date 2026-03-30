# Laattapiste-tuonti - Dokumentaatio

## Yleiskuvaus

Laattapiste-tuonti on turvallinen ja vaiheittain etenevä työkalu Laattapisteen tuotteiden tuomiseen Laskenta-järjestelmän tuoterekisteriin. Toteutus noudattaa tiukkoja turvallisuusperiaatteita eikä tee hiljaisia ylikirjoituksia.

## A. Muutetut tiedostot

### 1. Uudet tiedostot:
- **`/src/components/pages/LaattapisteImportPage.tsx`** - Pääkomponentti Laattapiste-tuontia varten
- **`/LAATTAPISTE_TUONTI.md`** - Tämä dokumentaatio

### 2. Muokatut tiedostot:
- **`/src/App.tsx`** - Lisätty navigaatio Laattapiste-tuonti -sivulle

## B. Tietolähteet

**TÄRKEÄ HUOMIO**: Toteutus EI hae tuotteita automaattisesti Laattapisteen verkkosivuilta.

### Syy tekniseen rajaukseen:
- Sovellus on selainpohjainen (frontend-only)
- Ei backend-palvelinta, joka voisi tehdä web scraping -toimintoja
- CORS-rajoitukset estävät suorat HTTP-kutsut kolmannen osapuolen sivuille
- Automaattinen scraping voisi rikkoa Laattapisteen käyttöehtoja

### Turvallinen lähestymistapa:
Käyttäjä hankkii tuotetiedot **virallisista Laattapisteen lähteistä**:

1. **Laattapisteen verkkokauppa** (www.laattapiste.fi)
   - Käyttäjä kopioi tuotetiedot manuaalisesti
   
2. **Laattapisteen tuotekatalogit**
   - PDF/Excel -katalogit toimittajalta
   
3. **Laattapisteen toimittama tuotedata**
   - Virallinen CSV/Excel-tiedosto
   
4. **Laattapisteen asiakaspalvelu**
   - Erikseen tilattu tuotelistaus

### Syöttömuoto:
Käyttäjä syöttää tai liittää tuotetiedot CSV-muodossa järjestelmään. Järjestelmä validoi ja käsittelee tiedot ennen tuontia.

## C. Deduplikointi

### Deduplikointilogiikka:

1. **Ensimmäinen vaihe - Syötteen sisäinen deduplikointi:**
   ```typescript
   const uniqueData = new Map<string, LaattapisteRow>();
   rawData.forEach(row => {
     if (row.product_code) {
       if (uniqueData.has(row.product_code)) {
         console.warn(`Deduplikointi: tuotekoodi ${row.product_code} esiintyy useasti`);
       } else {
         uniqueData.set(row.product_code, row);
       }
     }
   });
   ```
   - Jos sama tuotekoodi esiintyy useasti syötteessä, otetaan vain ensimmäinen
   - Käytetään Map-rakennetta varmistaaksemme uniikit tuotekoodit

2. **Toinen vaihe - Olemassa olevien tuotteiden tunnistus:**
   ```typescript
   const existingProduct = products.find(p => p.code === row.product_code);
   const isDuplicate = !!existingProduct;
   ```
   - Tarkistetaan jokainen tuotekoodi nykyistä tuoterekisteriä vastaan
   - Merkitään duplikaatit varoituksella

3. **Kolmas vaihe - Tuonti:**
   ```typescript
   const rowsToImport = importData.filter(r => r.isValid && r.isNew);
   ```
   - Tuodaan VAIN uudet tuotteet (`isNew === true`)
   - Olemassa olevat tuotteet (`isDuplicate === true`) ohitetaan automaattisesti

### Deduplikointiavain:
- **`product_code`** (tuotekoodi) on uniikki tunniste
- Case-sensitive vertailu
- Ei whitespace-trimmausta koodista (säilytetään alkuperäinen muoto)

## D. Kenttämappaus

### Tuoterekisterin vähimmäiskentät:
1. **product_code** (pakollinen) → `Product.code`
2. **name** (pakollinen) → `Product.name`

### Tuetut lisäkentät:
3. **category** (valinnainen) → `Product.category`
4. **brand** (valinnainen) → Ei suoraa kenttää, voidaan lisätä `notes`-kenttään
5. **unit** (valinnainen) → `Product.unit` (kpl, m², jm, m)
6. **notes** (valinnainen) → Ei tuettu tällä hetkellä (tulevaisuutta varten)
7. **install_group_code** (valinnainen) → Ei tuettu tällä hetkellä (tulevaisuutta varten)

### Kenttäkäsittely:

#### product_code (Tuotekoodi):
```typescript
if (!row.product_code) {
  errors.push('Tuotekoodi puuttuu');
}
```
- Pakollinen kenttä
- Ei oletusarvoa
- Tyhjä → virhe, rivi ohitetaan

#### name (Nimi):
```typescript
if (!row.name) {
  errors.push('Nimi puuttuu');
}
```
- Pakollinen kenttä
- Ei oletusarvoa
- Tyhjä → virhe, rivi ohitetaan

#### category (Kategoria):
```typescript
if (!row.category) {
  warnings.push('Kategoria puuttuu');
}
// Tuonnissa:
category: row.category || 'Kategorisoimaton'
```
- Valinnainen kenttä
- Oletusarvo: `'Kategorisoimaton'` jos tyhjä
- Tyhjä → varoitus, mutta rivi hyväksytään

#### brand (Merkki):
```typescript
if (!row.brand) {
  warnings.push('Merkki puuttuu');
}
```
- Valinnainen kenttä
- Ei tallenneta erikseen (ei kenttää Product-tyypissä)
- Näytetään esikatselussa
- Tyhjä → varoitus

#### unit (Yksikkö):
```typescript
const validUnits: UnitType[] = ['kpl', 'm²', 'jm', 'm'];
if (row.unit && validUnits.includes(row.unit as UnitType)) {
  unit = row.unit as UnitType;
} else if (row.unit && !validUnits.includes(row.unit as UnitType)) {
  warnings.push(`Yksikkö "${row.unit}" ei tuettu, käytetään oletusta "kpl"`);
} else {
  warnings.push('Yksikkö puuttuu, käytetään oletusta "kpl"');
}
```
- Valinnainen kenttä
- Oletusarvo: `'kpl'`
- Sallitut arvot: kpl, m², jm, m
- Virheellinen arvo → oletusarvo + varoitus
- Tyhjä → oletusarvo + varoitus

#### notes (Huomiot):
- Ei tuettu tällä hetkellä
- Tulevaisuuden laajennus
- Ohitetaan

#### install_group_code (Hintaryhmäkoodi):
- Ei tuettu tällä hetkellä
- Tulevaisuuden laajennus
- Ohitetaan

### Puuttuva kenttä - Ostohinta:
```typescript
purchasePrice: 0
```
- Kaikki tuodut tuotteet saavat oletushinnan **0 €**
- Syy: Hintatiedot ovat kaupallisesti arkaluontoisia
- Käyttäjä päivittää hinnat manuaalisesti Tuoterekisteri-sivulla

## E. Olemassa olevien tuotteiden käsittely

### Periaate: Ei automaattisia ylikirjoituksia

```typescript
const rowsToImport = importData.filter(r => r.isValid && r.isNew);
```

### Käsittely vaiheittain:

1. **Tunnistus:**
   - Duplikaatit tunnistetaan tuotekoodin perusteella
   - Merkitään `isDuplicate = true`
   - Lisätään varoitus: "Tuotekoodi on jo olemassa"

2. **Esikatselu:**
   - Duplikaatit näytetään keltaisella taustalla
   - Keltainen varoitusikoni
   - Selkeä merkintä: "→ Ohitetaan (duplikaatti)"

3. **Tuonti:**
   - Duplikaatteja EI tuoda
   - Olemassa olevia tuotteita EI päivitetä
   - Tuontilaskurissa: "Tuo X uutta tuotetta" (ei duplikaatteja)

4. **Tulevaisuuden laajennus:**
   - Mahdollinen "Update-tila" vaatii erikseen:
     - Eksplisiittisen käyttäjän valinnan
     - Erillisen checkbox-valinnan per tuote
     - Vahvistusdialogin
     - Change preview (mitä muuttuu)

### Turvallisuustakeet:
- ✅ Ei hiljaisia ylikirjoituksia
- ✅ Duplikaatit näytetään aina esikatselussa
- ✅ Käyttäjä näkee tarkat lukumäärät ennen tuontia
- ✅ Duplikaattien määrä näkyy statistiikassa
- ✅ Vain uudet tuotteet tuodaan

## F. Esikatselun toiminta

### Esikatselunäkymä aktivoituu:
```typescript
const handleProcessInput = () => {
  // ... käsittely ...
  setShowPreview(true);
}
```

### Esikatselu sisältää:

#### 1. Tilastoruudukko (5 KPI:tä):
```typescript
const stats = {
  new: number,           // Uusia tuotteita (vihreä)
  duplicate: number,     // Duplikaatteja (keltainen)
  withWarnings: number,  // Varoituksia (oranssi)
  invalid: number,       // Virheellisiä (punainen)
  total: number          // Yhteensä
}
```

#### 2. Tuotetaulukko:
Jokainen rivi näyttää:
- **Tila-ikoni:**
  - ✓ (vihreä) = Valmis tuotavaksi
  - ⚠ (oranssi) = Varoituksia, mutta kelvollinen
  - ⚠ (keltainen) = Duplikaatti
  - ✗ (punainen) = Virheellinen
  
- **Tuotetiedot:**
  - Koodi (monospace font)
  - Nimi
  - Kategoria
  - Merkki
  - Yksikkö
  
- **Huomautukset:**
  - Virheet (punainen teksti)
  - Varoitukset (keltainen teksti)
  - Duplikaattimerkintä (keltainen, bold)

#### 3. Footer-toiminnot:
```
[Peruuta] [Tuo X uutta tuotetta]
```
- "Peruuta" sulkee esikatselun, ei tuo mitään
- "Tuo X uutta tuotetta" suorittaa tuonnin
- Tuontipainike disabloituu jos:
  - Ei uusia tuotteita (`stats.new === 0`)
  - Tuonti käynnissä (`isProcessing === true`)

### Esikatselun tarkoitus:
- ✅ Läpinäkyvyys: Käyttäjä näkee tarkalleen mitä tapahtuu
- ✅ Turvallisuus: Ei yllätyksiä tuonnin jälkeen
- ✅ Kontrolli: Käyttäjä voi perua milloin tahansa
- ✅ Tiedonsaanti: Tilastot ja yksityiskohtaiset rivikohtaiset tiedot

## G. Tuonnin käynnistäminen

### Vaihe 1: Navigoi sivulle
- Valitse sivuvalikosta: **"Laattapiste-tuonti"**
- Ikoni: ShoppingBag (ostoskassi)

### Vaihe 2: Hanki tuotetiedot
**Vaihtoehto A - Lataa esimerkki:**
```
[Lataa esimerkki] -painike
```
- Lataa demo-datan suoraan tekstikenttään
- Hyvä testaamista varten

**Vaihtoehto B - Lataa pohja:**
```
[Lataa tuontipohja] -painike
```
- Lataa CSV-pohjan omalle tietokoneelle
- Täytä pohja Laattapisteen virallisilla tuotetiedoilla
- Kopioi täytetty sisältö tekstikenttään

**Vaihtoehto C - Liitä suoraan:**
- Kopioi Laattapisteen tuotetiedot
- Liitä tekstikenttään
- Muoto: CSV (puolipiste tai sarkain)

### Vaihe 3: Käsittele tiedot
```
[Käsittele ja esikatsele] -painike
```
- Parsii CSV-syötteen
- Deduplikoi tuotekoodin perusteella
- Validoi jokaisen rivin
- Avaa esikatselunäkymän

### Vaihe 4: Tarkista esikatselu
- Tarkista tilastot (uudet, duplikaatit, virheelliset)
- Selaa tuotetaulukkoa
- Tarkista varoitukset ja virheet
- Varmista että lukumäärät ovat oikein

### Vaihe 5: Vahvista tuonti
```
[Tuo X uutta tuotetta] -painike
```
- Tuo vain uudet ja kelvolliset tuotteet
- Ohittaa duplikaatit ja virheelliset
- Näyttää toast-ilmoituksen: "X tuotetta tuotu onnistuneesti"

### Vaihe 6: Päivitä hinnat
- Siirry **"Tuoterekisteri"**-sivulle
- Etsi tuodut tuotteet (esim. hakusanalla "LP-")
- Muokkaa tuotteita yksi kerrallaan
- Päivitä ostohinta oikeaksi

## H. Riskit ja puutteet

### Tunnistetut riskit:

#### 1. Manuaalinen datasyöttö
**Riski:** Käyttäjä voi syöttää virheellisiä tietoja
**Mitigaatio:**
- Validointi jokaiselle riville
- Esikatselu ennen tuontia
- Selkeät virheilmoitukset
- Varoitukset puuttuvista kentistä

#### 2. Ei automaattista päivitystä
**Riski:** Tuotetiedot voivat vanhentua
**Mitigaatio:**
- Ei tällä hetkellä mitigaatiota
- Käyttäjä vastaa tietojen ajantasaisuudesta
- Tulevaisuudessa: "Update-tila" olemassa oleville tuotteille

#### 3. Ostohinta on aina 0 €
**Riski:** Käyttäjä voi unohtaa päivittää hinnat
**Mitigaatio:**
- Selkeä ohjeistus dokumentaatiossa
- Blue alert-box esikatselussa muistuttaa tästä
- Tulevaisuudessa: Varoitus raportoinnissa tuotteista joiden hinta on 0 €

#### 4. Ei virallista Laattapiste-integraatiota
**Riski:** Tiedot voivat olla virheellisiä tai vanhentuneita
**Mitigaatio:**
- Dokumentaatio korostaa virallisten lähteiden käyttöä
- Käyttäjä on vastuussa tietojen oikeellisuudesta
- Tulevaisuudessa: Mahdollinen API-integraatio Laattapisteen kanssa

### Tärkeimmät puutteet:

#### 1. Ei hintatietoja
- Tuodut tuotteet saavat oletushinnan 0 €
- Käyttäjän on päivitettävä hinnat manuaalisesti
- **Korjaus tulevaisuudessa:** Salli hinnan syöttö CSV:ssä

#### 2. Ei bulk-päivitystä
- Olemassa olevia tuotteita ei voi päivittää bulk-tuonnilla
- **Korjaus tulevaisuudessa:** "Update-tila" esikatselussa

#### 3. Ei hintaryhmälinkitystä
- `install_group_code` parsitaan mutta ei käytetä
- **Korjaus tulevaisuudessa:** Linkitä tuotteet hintaryhmiin automaattisesti

#### 4. Ei brand-kenttää
- Merkki parsitaan ja näytetään, mutta ei tallenneta
- **Korjaus tulevaisuudessa:** Lisää `brand`-kenttä Product-tyyppiin

#### 5. Ei automaattista harausta
- Ei mahdollisuutta automaattiseen web scraping -toimintoon
- **Ei korjattavissa:** Tekninen rajoitus (frontend-only, CORS)

### Ratkaisemattomat ongelmat:

#### 1. Tuotekuvat
- Ei tukea tuotekuvien tuonnille
- **Tulevaisuus:** Lisää `imageUrl`-kenttä ja kuvan upload

#### 2. Tuotevariantit
- Ei tukea varianteille (esim. eri värit, koot)
- **Tulevaisuus:** Variant-logiikka Product-malliin

#### 3. Kategoriarakenne
- Kategoria on vapaa teksti, ei hierarkiaa
- **Tulevaisuus:** Predefined-kategoriat dropdown-valikossa

#### 4. Versionhallinta
- Ei tukea tuotteen version/muutosten seurannalle
- **Tulevaisuus:** Audit trail tuotemuutoksille

### Laatuvaraukset:

1. **Deduplikointi toimii vain tuotekoodin perusteella**
   - Samaa tuotetta eri nimellä ei tunnisteta
   - Vaatii käyttäjältä huolellisuutta

2. **Ei automaattista validointia tuotekoodien formaatin suhteen**
   - Kaikki tuotekoodit hyväksytään
   - Ei tarkistusta LP-prefix:lle tms.

3. **CSV-parsinta on yksinkertainen**
   - Ei tukea quoted-fields:lle
   - Ei tukea monirivikkisille kentille
   - Toimii vain puolipisteellä tai tabulaattorilla

## Yhteenveto

### Toteutuksen vahvuudet:
✅ Turvallinen (ei hiljaisia ylikirjoituksia)
✅ Läpinäkyvä (täysi esikatselu)
✅ Deduplikointi toimii luotettavasti
✅ Selkeä käyttöliittymä
✅ Hyvä virheenkäsittely
✅ Ei riko nykyistä bulk import -toimintoa
✅ Helppo laajentaa tulevaisuudessa

### Toteutuksen rajoitukset:
⚠️ Manuaalinen datasyöttö (ei automaattista haku)
⚠️ Ei hintatietoja tuonnissa
⚠️ Ei bulk-päivitystä
⚠️ Ei kaikkia kenttiä tuettu
⚠️ Yksinkertainen CSV-parsinta

### Suositukset seuraaviin vaiheisiin:
1. Lisää ostohinta CSV-syötteeseen
2. Toteuta "Update-tila" olemassa oleville tuotteille
3. Lisää brand-kenttä Product-tyyppiin
4. Toteuta hintaryhmälinkitys install_group_code:n perusteella
5. Paranna CSV-parsintaa (quoted fields, multiline)
6. Lisää tuotekuvien tuki
7. Selvitä mahdollisuus viralliseen Laattapiste API-integraatioon
