# Testiohjeet: Tuoterekisterin datan pysyvyys

## Tavoite
Testata että tuoterekisteriin lisätyt tuotteet pysyvät tallessa myös sivun päivityksen jälkeen.

## Testidatan lisääminen

### Vaihtoehto 1: Käsin lisääminen käyttöliittymästä

1. Kirjaudu sovellukseen
2. Siirry sivulle "Tuoterekisteri"
3. Klikkaa "Lisää tuote" -nappia
4. Täytä tuotetiedot:
   - **Tuotekoodi**: LAA-001
   - **Tuotenimi**: Keraaminen lattialaatta 30x30cm
   - **Kategoria**: Laatat
   - **Yksikkö**: m²
   - **Ostohinta**: 25.50
   - **Hintaryhmä**: (jätä tyhjäksi tai valitse sopiva)
5. Klikkaa "Tallenna"
6. Toista muutamalle muulle tuotteelle

### Vaihtoehto 2: Testidatan lisääminen konsolista

1. Avaa selaimen konsoli (F12 → Console)
2. Kopioi ja liitä seuraava koodi:

```javascript
(async () => {
  const testProducts = [
    {
      code: 'LAA-001',
      name: 'Keraaminen lattialaatta 30x30cm',
      category: 'Laatat',
      unit: 'm2',
      purchasePrice: 25.50,
    },
    {
      code: 'LAA-002',
      name: 'Keraaminen seinälaatta 25x40cm',
      category: 'Laatat',
      unit: 'm2',
      purchasePrice: 32.00,
    },
    {
      code: 'KAL-001',
      name: 'Peilikaappi 60cm',
      category: 'Kalusteet',
      unit: 'kpl',
      purchasePrice: 185.00,
    },
    {
      code: 'SUH-001',
      name: 'Suihkuseinä 80cm kirkas',
      category: 'Suihkutilat',
      unit: 'kpl',
      purchasePrice: 320.00,
    },
    {
      code: 'VES-001',
      name: 'Pesuallas 60cm',
      category: 'Vesikalusteet',
      unit: 'kpl',
      purchasePrice: 125.00,
    },
  ];
  
  const existingProducts = await spark.kv.get('products') || [];
  
  const newProducts = testProducts.map(p => ({
    ...p,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  
  await spark.kv.set('products', [...existingProducts, ...newProducts]);
  console.log('✅ Lisätty', newProducts.length, 'tuotetta');
  console.log('Päivitä sivu nähdäksesi muutokset (F5)');
})();
```

3. Paina Enter
4. Päivitä sivu (F5)

## Testattavat asiat

### 1. Tuotteen lisääminen
- ✅ Tuote näkyy heti lisäämisen jälkeen listassa
- ✅ Toast-ilmoitus: "Tuote lisätty"
- ✅ Dialogi sulkeutuu automaattisesti

### 2. Datan pysyvyys
- ✅ **TÄRKEIN TESTI**: Päivitä sivu (F5) ja varmista että lisätyt tuotteet näkyvät edelleen
- ✅ Sulje selain ja avaa uudelleen - tuotteet näkyvät edelleen
- ✅ Kirjaudu ulos ja sisään - tuotteet näkyvät edelleen

### 3. Tuotteen muokkaaminen
- ✅ Klikkaa tuotteen muokkaus-ikonia (kynä)
- ✅ Muuta esim. ostohinta tai kategoria
- ✅ Tallenna
- ✅ Päivitä sivu - muutos on tallessa

### 4. Tuotteen poistaminen
- ✅ Klikkaa tuotteen poisto-ikonia (roskakori)
- ✅ Vahvista poisto
- ✅ Tuote katoaa listasta
- ✅ Päivitä sivu - tuote on edelleen poistettu

### 5. Haku ja suodatus
- ✅ Hae tuotetta nimellä
- ✅ Suodata kategorialla
- ✅ Tyhjennä suodattimet - kaikki tuotteet näkyvät

### 6. Joukkotoiminnot
- ✅ Valitse useita tuotteita checkboxeilla
- ✅ Vaihda valittujen kategoria
- ✅ Kopioi valitut tuotteet
- ✅ Päivitä sivu - muutokset tallessa

## Mitä tarkkailla

### ✅ TOIMII OIKEIN jos:
- Tuotteet pysyvät tallessa sivun päivityksen jälkeen
- Muokkaukset tallentuvat
- Poistot toimivat
- Ei näy virheitä konsolissa

### ❌ EI TOIMI jos:
- Tuotteet katoavat sivun päivityksen yhteydessä
- Konsolissa näkyy virhe: `useKV` tai `spark.kv`
- Toasti näyttää "Tuote lisätty" mutta tuote ei näy listassa
- Muokkaukset eivät tallennu

## Tekninen tieto

### Miten data tallennetaan?
- Tuotteet tallennetaan Spark KV -tietokantaan avaimella `products`
- Käytetään `useKV` React hookia reaktiiviseen tilanhallintaan
- Jokainen tallennusoperaatio käyttää **funktionaalisia päivityksiä**: 
  ```typescript
  setProducts((current) => [...current, newProduct])
  ```
- Tämä varmistaa että aina käytetään tuoreinta dataa, ei vanhentuneita closureista

### Missä data on?
- Data on käyttäjäkohtainen
- Tallennetaan Spark-ympäristön KV-storeen
- Ei selaimen localStorage:ssa
- Säilyy istuntojen välillä

## Debuggaus

### Tarkista data konsolista:
```javascript
// Hae kaikki tuotteet
await spark.kv.get('products')

// Hae kaikki avaimet
await spark.kv.keys()

// Poista kaikki tuotteet (VAROITUS: Tyhjentää datan!)
await spark.kv.delete('products')
```

### Jos data ei pysy tallessa:
1. Avaa selaimen konsoli ja etsi virheitä
2. Tarkista että käyttäjä on kirjautunut sisään
3. Varmista että `spark.kv` on saatavilla konsolista
4. Tarkista että `useKV` hookia käytetään oikein koodissa

## Onnistunut testi

Jos saat lisättyä tuotteita, päivittää sivua (F5) ja tuotteet näkyvät edelleen, 
**data pysyy tallessa oikein** ✅

---

Päivitetty: ${new Date().toISOString()}
