# Deployment

Tämä repositorio julkaistaan nykytilassa Cloudflare Pagesiin, ja sovelluksen auth- sekä taustadata kulkevat Supabasen kautta. Tämä tiedosto kuvaa käytännön rollout-järjestyksen. Yksityiskohtainen alustakonfiguraatio löytyy tiedostoista `docs/cloudflare-pages-supabase.md` ja `supabase/README.md`.

## 1. Ennen julkaisua

Varmista paikallisesti vähintään:

```bash
npm ci
npm run validate
npm run build
```

Jos julkaisu sisältää tietokantamuutoksia, aja lisäksi:

```bash
npm run supabase:db:lint
npm run supabase:db:push:dry-run
```

## 2. Ympäristömuuttujat

Cloudflare Pagesin tuotantoympäristössä pitää olla vähintään:

- `VITE_SITE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_REDIRECT_URL`

Auth callbackin on vastattava Supabase Dashboardin sallittuja redirect-osoitteita.

## 3. Julkaisujärjestys

1. Tee ja validoi tietokantamuutos ensin migraationa.
2. Tarkista linked Supabase -projektiin menevä rollout dry-runilla.
3. Julkaise frontend vasta, kun tietokantamuutos on testattu tai dry-runattu oikeaa ympäristöä vasten.
4. Merge tai push `main`-haaraan.
5. GitHub Actions ajaa validoinnin ja sen jälkeen Cloudflare Pages -deploymentin.
6. Tee tuotannossa smoke test vähintään kirjautumiselle, juridisille julkisille sivuille, projektityötilalle ja Tarjousälyn pääpolulle.

## 4. GitHub Actions

Repossa on nyt kolme olennaista workflowta:

- `validate.yml`: ajaa `npm run validate` pull requesteille ja `main`-pushille
- `deploy-cloudflare-pages.yml`: ajaa validoinnin ja deployaa `dist`-hakemiston Cloudflare Pagesiin
- `publish-update-feed.yml`: ajaa validoinnin, paketoi desktop-version ja julkaisee update feedin `gh-pages`-haaraan

Tämä tarkoittaa, että `npm run build` ei enää ole ainoa laatuportti tuotantojulkaisussa.

## 5. Desktop-julkaisu

Desktop-update feed julkaistaan workflowlla `publish-update-feed.yml`, kun repo vastaanottaa tagin muodossa `vX.Y.Z`.

Suositeltu järjestys:

1. Varmista että `main` on julkaistavassa kunnossa.
2. Aja paikallisesti `npm run validate`.
3. Luo versionumeroitu tagi.
4. Pushaa tagi origin-repoon.
5. Tarkista että workflow tuotti artefaktit ja päivitti `gh-pages`-feedin.

## 6. Julkaisun jälkeiset tarkistukset

Tee vähintään nämä tarkistukset:

- kirjautuminen owner-käyttäjänä
- uusi tai olemassa oleva organisaatiokonteksti latautuu oikein
- julkiset juridiset reitit avautuvat
- tarjouseditori ja laskutusnäkymä latautuvat
- Tarjousäly avaa draft package -näkymän ilman virheitä
- jos julkaisu koski desktopia, update feed vastaa uutta versiota

## 7. Muut ohjeet

- Operatiivinen julkaisun tarkistuslista: `docs/release-checklist.md`
- Cloudflare + Supabase -asennus: `docs/cloudflare-pages-supabase.md`
- Supabase-migraatiot ja turvallinen linked rollout: `supabase/README.md`