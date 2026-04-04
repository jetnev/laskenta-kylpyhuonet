# Projekta - Tarjouslaskenta ja projektiseuranta

**Status**: ✅ STABLE - WORKING STATE LOCKED

Projekta on kattava suomenkielinen tarjouslaskennan ja projektiseurannan jarjestelma esteettomien kylpyhuonetuotteiden ja asennusprojektien hallintaan.

## 📋 Yleiskatsaus

Sovellus mahdollistaa myynti- ja tarjoushenkilöstön luoda, hallinnoida ja viedä ammattitasoisia asiakastarjouksia joustavalla hinnoittelulogiikalla ja yksityiskohtaisilla kustannuslaskelmilla.

## ✨ Keskeiset Ominaisuudet

### 🔐 Tunnistautuminen ja Käyttöoikeudet
- GitHub-pohjainen autentikointi Spark user API:n kautta
- Omistajapohjainen käyttöoikeuksien hallinta
- Katselutila muille käyttäjille
- Muokkausoikeudet vain sovelluksen omistajalle

### 📦 Tiedonhallinta

- **Tuoterekisteri** - Tuotteiden CRUD-toiminnot koodeineen, nimineen ja hinnoitteluineen
- **Hintaryhmät** - Uudelleenkäytettävät asennushinnoitteluryhmät
- **Korvaavat tuotteet** - Vaihtoehtoisten tuotteiden määrittely ja hallinta
- **Projektit & Asiakkaat** - Asiakastietojen ja projektien organisointi
- **Ehdot** - Tarjousehtojen hallinta ja oletusehtojen asetus

### 💼 Tarjousten Hallinta

- **Kolme rivimuotoa**:
  - Tuote (vain tuote)
  - Asennus (vain asennus)
  - Tuote + asennus (molemmat)
- Joustavat määrä- ja hinnoittelukontrollit
- Katteen ohitusmahdollisuus
- Alueellisten kertoimien automaattinen soveltaminen
- Versiointi- ja revisiojärjestelmä
- Validointijärjestelmä ennen lähettämistä

### 📊 Vienti ja Raportointi

- **Asiakasvienti**: PDF ja Excel (sisäiset hinnat piilotettu)
- **Sisäinen vienti**: Täydelliset hinnoittelutiedot Excel-muodossa
- **Raporttinäkymä**: KPI-kortit, myyntianalyysit, top-tuotteet
- **Tuonti**: Massatuonti Excel-tiedostosta esikatselulla

## 🛠️ Tekninen Toteutus

### Stack
- **React 19.2.0** + TypeScript
- **Vite 7.2.6** - Build tool
- **Tailwind CSS 4.1.17** - Tyylittely
- **shadcn/ui v4** - Komponenttikirjasto
- **Spark KV Store** - Tiedon pysyvyys

### Tärkeimmät Kirjastot
- `@phosphor-icons/react` - Ikonit
- `react-hook-form` + `zod` - Lomakkeiden käsittely
- `sonner` - Toast-ilmoitukset
- `framer-motion` - Animaatiot
- `recharts` - Kaavioiden visualisointi

## 📁 Rakenne

```
src/
├── App.tsx                    # Pääsovellus
├── index.css                  # Teemat ja globaalit tyylit
├── components/
│   ├── pages/                 # Sivukomponentit
│   │   ├── Dashboard.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── InstallationGroupsPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   └── ...
│   └── ui/                    # shadcn-komponentit
├── hooks/
│   ├── use-auth.ts           # Autentikointi
│   ├── use-data.ts           # Tiedonhallinta
│   └── use-mobile.ts         # Responsiivisuus
└── lib/
    ├── types.ts              # TypeScript-tyypit
    ├── calculations.ts       # Hinnoittelulaskenta
    └── export.ts             # Vientitoiminnot
```

## 🎨 Muotoilu

### Värit (OKLCH)
- **Background**: Vaalea lämmin harmaa
- **Primary**: Syvä pohjoismainen sininen
- **Accent**: Kirkas turkoosi
- **Foreground**: Tumma siniharmaa

### Typografia
- **Pääfontti**: IBM Plex Sans
- **Monospace**: JetBrains Mono (koodit ja hinnat)

## 🗺️ Navigaatio

1. **Etusivu** - Yleiskatsaus ja KPI:t
2. **Tuoterekisteri** - Tuotteiden hallinta
3. **Hintaryhmät** - Asennushinnoitteluryhmät
4. **Korvaavat tuotteet** - Vaihtoehtotuotteet
5. **Projektit** - Projektien ja asiakkaiden hallinta
6. **Ehdot** - Tarjousehtojen hallinta
7. **Asetukset** - Sovelluksen asetukset
8. **Raportointi** - Analytiikka ja raportit

## 💾 Tietomallit

Kaikki data tallennetaan Spark KV -tallennukseen:
- `products` - Tuotteet
- `installation-groups` - Hintaryhmät
- `substitute-products` - Korvaavat tuotteet
- `customers` - Asiakkaat
- `projects` - Projektit
- `quotes` - Tarjoukset
- `quote-rows` - Tarjousrivit
- `quote-terms` - Ehdot
- `settings` - Asetukset

## 🚀 Käyttöönotto

1. Sovellus käynnistyy automaattisesti Sparkissa
2. Kirjaudu sisään GitHub-tilillä
3. Omistajalla on täydet muokkausoikeudet
4. Muut käyttäjät näkevät datan vain luku -tilassa

## 📝 Dokumentaatio

- **PRD.md** - Tuotevaatimusmääritelmä
- **STABLE_STATE.md** - Yksityiskohtainen tekninen dokumentaatio nykyisestä tilasta
- **LAATTAPISTE_TUONTI.md** - Tuonti-ohjeet

## 🧹 Kehitys ja Testaus

Sovellus on testattu ja vahvistettu toimivaksi. Kaikki keskeiset ominaisuudet on toteutettu ja validoitu.

🚀 Sovellus on käytettävissä ja valmis tuotantokäyttöön!

---

📄 License For Spark Template Resources 

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
