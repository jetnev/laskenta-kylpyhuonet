# Release Checklist

## Ennen mergeä

- [ ] Muutos on dokumentoitu tarvittaviin tiedostoihin
- [ ] Uusi tietokantamuutos on `supabase/migrations/`-hakemistossa
- [ ] Paikallinen validointi menee läpi: `npm run validate`
- [ ] Tarvittaessa tuotantobuildi menee läpi: `npm run build`

## Jos mukana on Supabase-muutos

- [ ] `npm run supabase:db:lint`
- [ ] `npm run supabase:db:push:dry-run`
- [ ] Rollout-järjestys on mietitty niin, että tietokantamuutos menee ensin
- [ ] Auth redirect URL:t ja muut dashboard-asetukset on tarkistettu, jos muutos koskee authia

## Web-julkaisu

- [ ] `main` sisältää vain julkaisuun tarkoitetut muutokset
- [ ] GitHub Actions `validate.yml` onnistuu
- [ ] GitHub Actions `deploy-cloudflare-pages.yml` onnistuu
- [ ] Cloudflare Pagesin tuotantoversio päivittyy odotettuun commit SHA:han

## Desktop-julkaisu

- [ ] Versionumero on päätetty
- [ ] Tagi on muotoa `vX.Y.Z`
- [ ] `publish-update-feed.yml` onnistuu
- [ ] `gh-pages`-haaran update feed sisältää uuden version artefaktit

## Smoke test tuotannossa

- [ ] `/login` avautuu
- [ ] `/auth/callback` toimii odotetusti
- [ ] julkiset juridiset dokumenttisivut avautuvat
- [ ] owner-kirjautuminen toimii
- [ ] projektit, tarjoukset ja laskut latautuvat
- [ ] Tarjousälyyn siirtyminen ja draft package -näkymä toimivat
- [ ] Tarjousälyn upload -> extraction -> analysis -> results smoke on ajettu runbookin mukaan (`docs/tender-intelligence-smoke-test.md`)

## Julkaisun jälkeen

- [ ] Mahdolliset monitorointi- tai käyttäjäraportit tarkistettu
- [ ] Tarvittaessa `supabase/schema.sql` päivitetty hallitun rolloutin jälkeen
- [ ] Julkaisumuistiinpanot tai sisäinen changelog päivitetty
