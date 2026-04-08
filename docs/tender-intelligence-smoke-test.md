# Tarjousaly Live Smoke Test

Tama runbook varmistaa Tarjousalyn oikean live-polun ilman selain-E2E-pinoa.

## 1. Esiehdot

- rollout ajetaan ensin: `npm run supabase:tender:rollout`
- kayttajalla on owner-rooli organisaatiossa
- testidataa varten on saatavilla ainakin yksi tuettu dokumentti (PDF, DOCX, TXT, Markdown, CSV tai XLSX)

## 2. Ohjelmallinen verifiointi

`supabase/rollout-tender-intelligence.ps1` verifioi automaattisesti:

- migraatioversioiden uniikkiuden ennen rolloutia
- linked-projektin migraatioiden ajon
- edge-funktioiden deployn
- taulujen (`tender_packages`, `tender_documents`, `tender_document_extractions`, `tender_analysis_jobs`) saatavuuden
- `tender-intelligence`-bucketin olemassaolon
- edge-funktioiden ACTIVE-tilan ja smoke-vastauksen
- analyysi- ja extraction-statusten sopimusarvot

Jos jokin tarkistus epaonnistuu, rollout pitaa korjata ennen manuaalista UI-smokea.

## 3. Manuaalinen UI smoke

1. Kirjaudu sisaan owner-kayttajalla.
2. Siirry reitille `/app/tarjousaly`.
3. Vahvista, etta paketti- ja luonnospakettinakyma latautuu ilman virhetta.
4. Luo uusi tarjouspaketti.
5. Lataa yksi tuettu dokumentti pakettiin.
6. Kaynnista extraction dokumentille tai koko paketille.
7. Vahvista, etta tila paivittyy ilman sivun kovaa uudelleenlatausta (pending/extracting -> extracted tai failed).
8. Kaynnista analyysi.
9. Vahvista, etta analyysijobin tila paivittyy ilman reloadia (pending/queued/running -> completed tai failed).
10. Vahvista, etta tulosalue latautuu ja mahdolliset review-taskit/referenssiehdotukset/draft-artefaktit ovat kaytettavissa.

## 4. Virhepolku

- Jos extraction paattyy `failed`, korjaa dokumentin tyyppi/sisalto ja aja extraction uudelleen.
- Jos analyysi paattyy `failed`, tarkista edge-funktion lokit ja kaynnista analyysi uudelleen.
- Jos status ei paivity UI:ssa, varmista etta paketti on edelleen valittuna ja ettei selaimessa ole auth/session-virhetta.

## 5. Hyvaksyntakriteeri

Smoke katsotaan onnistuneeksi, kun:

- ohjelmallinen rollout-verifiointi menee lapi
- UI-polku (upload -> extraction -> analysis -> results) toimii samassa sessiossa ilman sivun kovaa reloadia