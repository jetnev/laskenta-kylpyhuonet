# Projekta

Projekta on suomenkielinen tarjouslaskennan, projektiseurannan ja laskutuksen sovellus kylpyhuone- ja remonttikohteisiin. Samassa tuotteessa yhdistyvät tarjouseditori, asiakas- ja projektidata, snapshot-pohjainen laskutus, juridisten dokumenttien hyväksyntäketju sekä Tarjousäly-työtila tarjouspyyntöpakettien analysointiin ja hallittuun importtiin.

## Nykyinen tuotantoarkkitehtuuri

- Frontend: React 19 + TypeScript + Vite
- Hosting: Cloudflare Pages
- Auth ja taustadata: Supabase
- Sovellusdata: Supabase Auth + `app_kv` sekä juridisten dokumenttien taulut
- Desktop-jakelu: Electron + `gh-pages`-pohjainen update feed

Vanhemmat Spark-viittaukset eivät enää kuvaa tämän repositorion todellista runtimea. Ajantasaiset käyttöönotto- ja migraatio-ohjeet löytyvät tiedostoista `docs/cloudflare-pages-supabase.md` ja `supabase/README.md`.

## Keskeiset osa-alueet

- Tarjoukset, rivit, revisiot ja vienti
- Asiakkaat, projektit, tuoterekisteri ja hintaryhmät
- Snapshot-pohjainen laskutus hyväksytyistä tarjouksista
- Juridiset dokumentit, hyväksyntätilat ja julkiset dokumenttisivut
- Tarjousäly: tarjouspyyntöpaketit, analyysitulokset, draft package -vientipolku ja hallittu reimport quote-editoriin
- Desktop-paketointi ja päivitysfeed tuotantojulkaisuille

## Paikallinen kehitys

- Asenna riippuvuudet.

```bash
npm ci
```

- Määritä vähintään seuraavat ympäristömuuttujat esimerkiksi `.env.local`-tiedostoon.

```bash
VITE_SITE_URL=http://localhost:5173
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173/auth/callback
```

- Käynnistä kehityspalvelin.

```bash
npm run dev
```

## Laadunvarmistus

Käytä näitä komentoja ennen mergeä tai julkaisua:

```bash
npm run lint
npm run typecheck
npm run test
npm run validate
```

`npm run build` tekee edelleen Vite-tuotantobuildin, mutta se käyttää `tsc -b --noCheck`-asetusta build-nopeuden vuoksi. Siksi varsinainen tyyppitarkistus kuuluu aina `npm run typecheck`- tai `npm run validate` -ajoon.

Julkaisua varten käytä:

```bash
npm run validate:release
```

## Supabase-työnkulku

- Käynnistä paikallinen stack tarvittaessa: `npm run supabase:start`
- Luo uudet tietokantamuutokset aina `supabase/migrations/`-hakemistoon
- Käytä `supabase/schema.sql`-tiedostoa snapshot/reference-baselinena, ei uutena muutoskanavana
- Tarkista linked-projektiin menevä rollout aina dry-runilla ennen pushia

Yksityiskohtainen ohje: `supabase/README.md`

## Deployment ja julkaisut

- Web-tuotanto: `main`-haaran push käynnistää Cloudflare Pages -deploymentin
- CI-validointi: GitHub Actions ajaa `npm run validate` pull requesteille ja `main`-pushille
- Desktop-julkaisu: versionumeroitu tagi `v*` käynnistää update feed -julkaisun

Tarkemmat ohjeet:

- `DEPLOYMENT.md`
- `docs/cloudflare-pages-supabase.md`
- `docs/release-checklist.md`

## Dokumentaatio

- `PRD.md` kuvaa tuotteen tavoitetilaa
- `STABLE_STATE.md` kuvaa repoa ja toimintaa yksityiskohtaisemmin
- `supabase/README.md` kuvaa Supabase-migraatioiden ja linked-ympäristöjen turvallisen työnkulun
- `docs/cloudflare-pages-supabase.md` kuvaa Cloudflare Pages + Supabase -käyttöönoton
- `docs/release-checklist.md` on operatiivinen tarkistuslista julkaisuhetkeen

## Lisenssi

Projektin lisenssi löytyy tiedostosta `LICENSE`.