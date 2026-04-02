# Cloudflare Pages + Supabase käyttöönotto

## 1. Supabase

1. Luo Supabase-projekti.
2. Avaa SQL Editor.
3. Aja tiedosto [supabase/schema.sql](/C:/Users/jethr/Documents/Laskenta/laskenta-kylpyhuonet/supabase/schema.sql).
4. Avaa `Project Settings -> API`.
5. Kopioi:
   - `Project URL`
   - `anon public key`

## 2. Supabase Auth

Supabase Dashboardissa:

1. Mene `Authentication -> Providers -> Email`.
2. Ota Email provider käyttöön.
3. Testiympäristössä voit poistaa `Confirm email` -vaatimuksen käytöstä, jotta rekisteröinti kirjautuu heti sisään.
4. Tuotannossa voit jättää vahvistuksen päälle.

## 3. Supabase URL Configuration

Supabase Dashboardissa:

1. Mene `Authentication -> URL Configuration`.
2. Aseta `Site URL` Pages-osoitteeseen, esimerkiksi `https://laskenta-kylpyhuonet.pages.dev`.
3. Lisää `Redirect URLs` -listaan vähintään:
   - `https://laskenta-kylpyhuonet.pages.dev`
   - `http://localhost:5173`
4. Jos aiot käyttää myöhemmin omaa domainia, lisää myös se samaan listaan, esimerkiksi `https://app.yritys.fi`.

## 4. Cloudflare Pages

1. Mene Cloudflareen kohtaan `Workers & Pages -> Create application -> Pages`.
2. Valitse `Connect to Git`.
3. Valitse repo `jetnev/laskenta-kylpyhuonet`.
4. Build-asetukset:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Lisää Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_REDIRECT_URL`
6. Aseta `VITE_SUPABASE_REDIRECT_URL` samaan Pages-osoitteeseen kuin projekti saa, esimerkiksi `https://laskenta-kylpyhuonet.pages.dev`.

## 5. Password reset

Salasanan palautus käyttää Supabasen sähköpostilinkkiä.

1. Käyttäjä pyytää palautuslinkin sovelluksesta.
2. Supabase lähettää sähköpostin.
3. Linkki avaa tämän saman Pages-sovelluksen.
4. Sovellus näyttää salasanan reset-näkymän.

## 6. Ensimmäinen käyttäjä

Ensimmäinen kirjautuva käyttäjä saa `admin`-roolin triggerin kautta.

## 7. Päivitykset

Kun repo on kytketty Pagesiin:

1. tee muutos
2. push GitHubiin
3. Cloudflare buildaa uuden version automaattisesti
4. Pages-osoite päivittyy uuteen versioon

