# Tarjousäly — roadmap ja nykytila

## Tarkoitus

Tämä tiedosto on Tarjousälyn elävä master-roadmap. Tätä ei pidetä historiadokumenttina vaan ohjausdokumenttina, jota päivitetään aina kun vaihe etenee, suunta muuttuu tai commit/push muuttaa toteutunutta tilaa.

Tämä tiedosto kertoo:

- missä Tarjousäly menee juuri nyt
- mitä on jo oikeasti toteutettu
- mitä seuraavaksi tehdään
- mitä ei vielä tehdä
- millä periaatteilla muutoksia viedään eteenpäin

## Ei-neuvoteltavat periaatteet

1. Tarjousäly elää omassa feature-boundaryssaan.
2. QuoteEditor-, calculations-, export-, reporting- ja use-data-ydintä ei muuteta ilman nimenomaista, perusteltua vaihetta.
3. Kaikki uudet tietorakenteet lisätään additive-mallilla.
4. Kaikista vaiheista vaaditaan kohdennetut testit ja full build ennen commitia.
5. Roadmap tarkistetaan ennen commitia ja päivitetään samassa commitissa aina kun toteutunut tila tai seuraava suunta muuttuu.

## Nykyinen toteutunut tila

### Vaiheet 1–17 valmiina

Tarjousälyssä on tällä hetkellä toteutettuna seuraavat kyvykkyydet:

#### Phase 1 — pysyvä dataperusta

- tarjouspakettien pysyvä Supabase-domain
- organisaatiosidottu RLS-malli
- feature-local repository

#### Phase 2 — dokumentit ja storage

- dokumenttien upload
- storage-polut ja metadata
- dokumenttipaneeli

#### Phase 3 — analyysijobin runko

- analyysijobit
- statusmalli
- ensimmäinen server-boundary analyysin käynnistämiseen

#### Phase 4 — pysyvä result-domain

- requirements
- missing items
- risk flags
- reference suggestions
- draft artifacts
- review tasks
- pysyvä result-taulurakenne

#### Phase 5 — server-side analysis runner boundary

- analyysin orkestrointi omalla serveripuolen rajapinnalla
- ei enää pelkkää client-side placeholder-ajoa

#### Phase 6 — extraction-domain

- dokumenttien extraction-domain
- chunkit ja extraction-status
- tuetut kevyet formaatit kuten txt, markdown, csv ja xlsx

#### Phase 7 — evidence / provenance

- analyysitulosten näyttö dokumenttichunkeihin sidotulla evidenssillä
- readiness riippuu extracted-chunkeista, ei vain dokumentin olemassaolosta

#### Phase 8 — deterministinen baseline-analyysi

- sääntöpohjainen baseline-analyysi
- ei vielä LLM-pohjainen analyysi
- toistettava ja deterministinen tulos

#### Phase 9 — review workflow

- hyväksy/hylkää/vaatii huomiota
- open/in progress/resolved/won't fix
- rivikohtainen käsittelytila ja audit-meta

#### Phase 10 — reference corpus baseline

- organisaation referenssikorpus
- deterministinen referenssimatchaus
- suggestionit tarjousvaatimuksiin

#### Phase 11 — draft package export foundation

- draft package -staging-domain
- draft package -itemit
- versionoitu export payload

#### Phase 12 — editor import boundary

- turvallinen import quote-editoriin
- vain hallitulle pinnalle kirjoittaminen
- ei syvää kosketusta quote-ytimeen

#### Phase 13 — import reconciliation boundary

- re-importin diffi
- aiemmin importoidun quoten tunnistus
- imported quote handoff

#### Phase 14 — managed import surface hardening

- versionoitu managed block -contract
- block-aware sync
- vain omistettujen lohkojen päivitys

#### Phase 15 — ownership registry

- persisted ownership registry
- selective re-import
- UI block-valinnoille

#### Phase 16 — protected re-import conflicts

- drift detection
- protected conflict -malli
- konfliktiblokkien oletussuojaus
- eksplisiittinen override per block
- audit-metadata import-runille

#### Phase 17 — editor import run audit / history hardening

- import-runien operatiivinen historiayhteenveto draft package -paneelissa
- blokkitasoinen näkyvyys siihen mitä päivitettiin, poistettiin, yliajettiin tai skipattiin
- syyperusteinen audit siitä miksi konflikteja suojattiin, miksi blokki puuttui tai mikä repair-toiminto ajettiin

## Mitä Tarjousäly pystyy nyt käytännössä tekemään

- luomaan tarjouspaketteja
- vastaanottamaan tarjousdokumentteja
- purkamaan tuettujen dokumenttien tekstiä
- ajamaan deterministisen baseline-analyysin
- tallentamaan analyysitulokset pysyvästi
- näyttämään evidenssin tuloksille
- tarjoamaan review-workflow'n löydöksille
- hyödyntämään organisaation referenssikorpusta
- muodostamaan draft package -stagingin
- tuottamaan versionoidun export payloadin
- importoimaan draft package -sisältöä turvallisesti quote-editorin hallitulle pinnalle
- tekemään re-importin hallitusti
- suojaamaan drift- ja konfliktitilanteita
- kohdistamaan selective re-importin vain valittuihin lohkoihin
- näyttämään import-runien onnistumis- ja virhehistorian blokkitasoisine audit-syineen

## Mitä ei ole vielä tuotantovalmiina

- vahva PDF/DOCX/OCR-purku
- LLM-pohjainen tarjoussisällön tulkinta
- automaattinen täydellinen quote-rivitys editoriin
- täysi kaksisuuntainen synkronointi editorin koko sisältöön
- laaja audit/event log kaikkiin toimintoihin
- deployment-smoketestit staging-/tuotantoympäristössä

## Käynnissä oleva tuotannollistava työpakettirunko

Tarjousälyn seuraava eteneminen ei ole enää vain syvempiä analyysi- ja import-vaiheita, vaan myös tuotannollistamista. Nykyinen toteutuspolku jatkuu seuraavilla työpaketeilla:

1. tarjouspyyntöpaketin kytkentä asiakkaaseen, projektiin ja quoteen
2. operatiivinen paketti-inboxi: haku, suodatus ja työjono
3. ympäristö- ja deployment-readiness Tarjousälylle
4. vahvempi PDF/DOCX-extraction
5. dokumenttien intake-luokittelu
6. review-workflown bulk-toiminnot
7. draft-paketin laatugate ennen editorivientiä
8. Go / No-Go -päätöstuki
9. referenssikorpuksen tuonti ja deduplikointi
10. myöhempi intelligent drafting vasta vahvemman dataperustan päälle

### Työpaketti 1 — tarjouspyyntöpaketin kontekstilinkitys

Valmis:

- paketin luonti voi linkittää tarjouspyyntöpaketin olemassa olevaan asiakkaaseen, projektiin ja tarjousluonnokseen
- projektivalinta ohjaa asiakas- ja tarjouskontekstia jo luontivaiheessa
- Tarjousälyn paketti-lista ja valitun paketin työtila näyttävät tallennetun liiketoimintakontekstin näkyvästi

### Työpaketti 2 — paketti-inboxin operatiivinen löydettävyys

Ensimmäinen inkrementti valmis:

- paketti-listassa on nyt haku paketin nimen, asiakkaan, projektin ja tarjouksen perusteella
- paketti-listaa voi rajata operatiivisilla suodattimilla: linkitetyt, analyysi, katselmointi ja valmiit
- juuri lisätty liiketoimintakonteksti toimii nyt myös Tarjousälyn listan löydettävyys- ja työjonopintana

## Seuraava tavoitesuunta

Tarjousälyn seuraavien syventävien vaiheiden tulee jatkua tästä järjestyksestä tuotannollistavien työpakettien rinnalla, ellei erikseen päätetä muuta:

### Phase 18 — editor import idempotency and resume

Tavoite:

- turvallinen uudelleensuoritus
- parempi käsittely keskeytyneille importeille
- mahdollisuus jatkaa hallitusti ilman uutta epäselvää tilaa

### Phase 19 — stronger extraction for PDF/DOCX

Tavoite:

- oikea tuotantotason dokumenttipurku
- nykyisen kevyen extractionin laajennus
- OCR vain harkitusti, ei oletusarvoisesti

### Phase 20 — intelligent drafting beyond deterministic baseline

Tavoite:

- mahdollinen LLM-kerros vasta tämän jälkeen
- vain vahvan evidenssi- ja review-pohjan päälle
- ei ennen kuin nykyinen sääntöpohjainen pipeline ja import-polku ovat vakaita

## Toteutusperiaatteet jatkovaiheille

- jokainen vaihe pidetään mahdollisimman additiivisena
- yksi vaihe = yksi selkeä capability
- jokaisesta vaiheesta jää commit, build-varmistus ja kohdennettu testipeitto
- kaikki uudet rajapinnat dokumentoidaan tähän tiedostoon

## Päivityssääntö

Tämä tiedosto pitää päivittää aina kun jokin näistä muuttuu:

- uusi phase valmistuu
- vaiheiden järjestys muuttuu
- nykyinen toteutunut tila muuttuu olennaisesti
- seuraavan vaiheen tavoite tai rajaus muuttuu
- syntyy uusi pysyvä arkkitehtuurisääntö

## Käytännön sääntö commit/push-vaiheeseen

Ennen commitia tarkista:

1. vastaako tämä roadmap toteutunutta tilaa
2. puuttuuko nykyisestä vaiheesta kuvaus
3. pitääkö "Seuraava tavoitesuunta" päivittää

Jos vastaus johonkin on kyllä, päivitä tämä tiedosto samassa commitissa.
