# Laskenta-sovelluksen julkaisu verkkoon

## Yleiskatsaus

Tämä Spark-sovellus on kehitetty GitHub Sparkin ympäristössä. Spark-sovellukset ovat valmiiksi julkaistuja ja saatavilla verkon kautta GitHub-tilisi kautta.

## Sovelluksen käyttöönotto

### 1. Spark-sovelluksen jakaminen

Spark-sovelluksesi on automaattisesti saatavilla GitHub Sparkin kautta. Jokaisella Spark-sovelluksella on oma URL-osoite, joka seuraa muotoa:

```text
https://spark.github.com/{käyttäjänimi}/{sovelluksen-nimi}
```

### 2. Oman domainin liittäminen

GitHub Spark ei tällä hetkellä tue suoraan omien domainien liittämistä. Jos haluat käyttää omaa domainia, sinun täytyy viedä sovellus toiselle hosting-palvelulle:

#### Vaihtoehto A: Vercel (Suositeltu)

1. **Valmistele projekti vientiin:**
   - Luo uusi GitHub-repositorio
   - Siirrä kaikki sovelluksen tiedostot repositorioon

2. **Luo Vercel-tili:**
   - Mene osoitteeseen [vercel.com](https://vercel.com)
   - Rekisteröidy GitHub-tilillä

3. **Julkaise sovellus:**
   - Klikkaa "New Project"
   - Valitse GitHub-repositoriosi
   - Vercel tunnistaa automaattisesti Vite-projektin
   - Klikkaa "Deploy"

4. **Liitä oma domain:**
   - Mene projektisi asetuksiin
   - Valitse "Domains"
   - Lisää oma domainisi
   - Seuraa Vercelin ohjeita DNS-asetusten määrittämiseen

**Huomio Spark API:sta:** Vercel-deploymentti ei tue suoraan `spark.kv` tai `spark.user()` API:a. Nämä pitää korvata:

- `spark.kv` → Vercel KV tai Supabase
- `spark.user()` → GitHub OAuth tai muu autentikointi

#### Vaihtoehto B: Netlify

1. **Valmistele projekti:**
   - Luo GitHub-repositorio ja siirrä tiedostot sinne

2. **Luo Netlify-tili:**
   - Mene osoitteeseen [netlify.com](https://netlify.com)
   - Rekisteröidy

3. **Julkaise:**
   - Klikkaa "Add new site"
   - Valitse "Import an existing project"
   - Yhdistä GitHub-repositorio
   - Build-asetukset:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Klikkaa "Deploy"

4. **Oma domain:**
   - Mene sivuston asetuksiin
   - Valitse "Domain management"
   - Lisää custom domain

**Huomio:** Sama Spark API -rajoitus kuin Vercelissä.

#### Vaihtoehto C: GitHub Pages

1. **Muokkaa vite.config.ts:**

```typescript
export default defineConfig({
  base: '/repo-nimi/',
  // ... muut asetukset
})
```

1. **Lisää deploy-skripti package.json:**

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

1. **Asenna gh-pages:**

```bash
npm install --save-dev gh-pages
```

1. **Julkaise:**

```bash
npm run deploy
```

1. **Oma domain:**

   - Lisää `CNAME`-tiedosto `/public` -kansioon domainillasi
   - Aseta DNS-asetukset osoittamaan GitHub Pagesiin

### 3. Spark-spesifisten ominaisuuksien korvaaminen

Jos viet sovelluksen pois Sparkista, korvaa seuraavat:

#### KV Storage (spark.kv)

**Supabase:**

```typescript
// Asenna: npm install @supabase/supabase-js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Käyttö:
await supabase.from('kv_store').upsert({ key: 'avain', value: data })
const { data } = await supabase.from('kv_store').select('value').eq('key', 'avain')
```

**Vercel KV:**

```typescript
import { kv } from '@vercel/kv'

await kv.set('avain', data)
const data = await kv.get('avain')
```

#### User Authentication (spark.user)

**GitHub OAuth:**

```typescript
// Käytä NextAuth.js tai Auth.js
import { signIn, useSession } from 'next-auth/react'

const { data: session } = useSession()
// session.user sisältää käyttäjätiedot
```

## Suositeltava ratkaisu

**Spark-sovelluksena:**

- Yksinkertaisin vaihtoehto
- Ei vaadi ylimääräistä konfiguraatiota
- Automaattinen hosting
- Kaikki Spark-ominaisuudet toimivat
- Rajoitus: ei omaa domainia

**Vercel + Supabase:**

- Oma domain mahdollinen
- Ilmainen tier useimmille käyttötarkoituksille
- Helppo deployment
- Vaatii Spark API:en korvaamisen

## Domain-ostaminen

Jos sinulla ei ole vielä domainia:

1. **Namecheap** (namecheap.com)
1. **Cloudflare Registrar** (cloudflare.com)
1. **Google Domains / Squarespace Domains** (domains.squarespace.com)
1. **Suomalainen: Louhi** (louhi.fi)

Hinnat noin 10-15€/vuosi .com-domaineille, .fi-domainit noin 15-20€/vuosi.

## DNS-asetukset omalle domainille

Kun olet ostanut domainin, aseta DNS-tietueet:

**Vercel:**

- A-tietue: `76.76.21.21`
- CNAME-tietue: `cname.vercel-dns.com`

**Netlify:**

- A-tietue: `75.2.60.5`
- CNAME-tietue: `<sitename>.netlify.app`

**GitHub Pages:**

- A-tietueet: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- CNAME-tietue: `<käyttäjä>.github.io`

## Tuki ja lisätiedot

- GitHub Spark dokumentaatio: [GitHub Spark Docs](https://githubnext.com/projects/spark)
- Vercel dokumentaatio: [vercel.com/docs](https://vercel.com/docs)
- Netlify dokumentaatio: [docs.netlify.com](https://docs.netlify.com)

---

**Huomautus:** Tämä sovellus käyttää `spark.kv` ja `spark.user()` API:a tietojen tallennukseen ja käyttäjien hallintaan. Nämä toimivat vain GitHub Spark -ympäristössä. Jos viet sovelluksen muualle, sinun täytyy korvata nämä vaihtoehtoisilla ratkaisuilla.
