# Cloudflare Pages + Supabase käyttöönotto

## 1. Supabase

1. Luo Supabase-projekti tai linkitä olemassa oleva projekti CLI:llä.
2. Seuraa ensin hallittua migraatio- ja baseline-työnkulkua tiedostosta [supabase/README.md](../supabase/README.md).
3. Älä aloita tuotanto- tai olemassa olevan ympäristön muutoksia ajamalla SQL:ää suoraan Dashboardin SQL Editorissa, ellei kyse ole hallitusta palautus- tai adoptiotilanteesta, joka dokumentoidaan heti takaisin migraatioiksi.
4. Pidä `supabase/schema.sql` snapshot/reference-artifaktina. Kaikki uudet muutokset tehdään `supabase/migrations/`-tiedostoina.
5. Tarkista ennen tuotantoa myös juridiset placeholderit, joita nykyinen baseline ja historiallinen migration käyttävät, kuten yrityksen nimi, Y-tunnus, osoite, tukiosoitteet, retention-ajat ja toimivaltainen tuomioistuin.
6. Avaa `Project Settings -> API`.
7. Kopioi:
   - `Project URL`
   - `anon public key`

## 1.1 Julkaisujärjestys olemassa olevaan ympäristöön

1. Linkitä projekti ja tarkista migraatiohistoria ennen mitään rolloutia.
2. Ota authoritative baseline olemassa olevasta remotesta CLI:llä, jos historia ei ole luotettava.
3. Tarkista aina `npx supabase db push --linked --dry-run` ennen varsinaista pushia.
4. Vie tietokantamuutos ensin testi- tai preview-ympäristöön, jos sellainen on käytössä.
5. Julkaise frontend vasta sen jälkeen, kun tietokantamuutos on validoitu kyseisessä ympäristössä.
6. Tarkista julkaisemisen jälkeen vähintään:
   - uusi rekisteröityminen owner-käyttäjänä
   - ownerin ensimmäinen kirjautuminen ja DPA-hyväksyntä
   - organisaation työntekijän ensimmäinen kirjautuminen
   - julkiset reitit `/kayttoehdot`, `/tietosuoja`, `/tietojenkasittely` ja `/evasteet`
7. Älä käytä `npx supabase db reset --linked` tuotantoa tai muuta olemassa olevaa hosted-projektia vasten.

## 2. Supabase Auth

Supabase Dashboardissa:

1. Mene `Authentication -> Providers -> Email`.
2. Ota Email provider käyttöön.
3. Testiympäristössä voit poistaa `Confirm email` -vaatimuksen käytöstä, jotta rekisteröinti kirjautuu heti sisään.
4. Tuotannossa voit jättää vahvistuksen päälle.

## 3. Supabase URL Configuration

Supabase Dashboardissa:

1. Mene `Authentication -> URL Configuration`.
2. Aseta `Site URL` tuotantodomainiin `https://projekta.fi`.
3. Lisää `Redirect URLs` -listaan vähintään:
   - `https://projekta.fi/auth/callback`
   - `https://www.projekta.fi/auth/callback`
   - `http://localhost:5173/auth/callback`
4. Jos haluat testata authia myös Cloudflare Pagesin preview-osoitteella, lisää lisäksi kyseisen Pages-projektin todellinen callback-osoite, esimerkiksi `https://projekta.pages.dev/auth/callback`.
5. Ohjaa `www.projekta.fi` Cloudflaressa samaan tuotantoversioon tai tee siita 301-uudelleenohjaus apex-domainiin.

## 4. Cloudflare Pages

1. Mene Cloudflareen kohtaan `Workers & Pages -> Create application -> Pages`.
2. Valitse `Connect to Git`.
3. Valitse repo `jetnev/laskenta-kylpyhuonet`.
4. Build-asetukset:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Lisää Environment Variables:
   - `VITE_SITE_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_REDIRECT_URL`
6. Aseta `VITE_SITE_URL=https://projekta.fi` kaikille tuotantobuildeille, jotta canonical- ja some-metat osoittavat oikeaan domainiin.
7. Aseta `VITE_SUPABASE_REDIRECT_URL=https://projekta.fi/auth/callback`, ellei authin paluulinkkiä tarvitse erikseen ohjata johonkin muuhun sallittuun callback-osoitteeseen.
8. Callback-reitin on oltava julkinen, koska sekä sähköpostivahvistus että salasanan palautus palaavat siihen ennen kirjautumista.
9. GitHub Actionsin `validate.yml` kannattaa pitää pakollisena laatutarkistuksena ennen `main`-mergeä. `deploy-cloudflare-pages.yml` ajaa validoinnin vielä uudelleen ennen varsinaista deployta.

## 5. Password reset

Salasanan palautus käyttää Supabasen sähköpostilinkkiä.

1. Käyttäjä pyytää palautuslinkin sovelluksesta.
2. Supabase lähettää sähköpostin.
3. Linkki avaa julkisen reitin `/auth/callback`.
4. Callback käsittelee vahvistuksen eksplisiittisesti ja näyttää salasanan vaihtonäkymän ilman, että koko sovellus jää auth-spinneriin.

## 6. Ensimmäinen käyttäjä

Ensimmäinen kirjautuva käyttäjä saa `admin`-roolin triggerin kautta.

## 7. Päivitykset

Kun repo on kytketty Pagesiin:

1. tee tietokantamuutos migraationa ja validoi se ensin paikallisesti
2. aja dry-run linked-projektiin ennen varsinaista rolloutia
3. push GitHubiin vasta kun tietokantamuutos ja frontend-muutos ovat linjassa
4. Cloudflare buildaa uuden version automaattisesti
5. Pages-osoite päivittyy uuteen versioon
<!-- EOF -->

