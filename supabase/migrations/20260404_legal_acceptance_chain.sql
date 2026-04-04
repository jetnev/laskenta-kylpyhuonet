create extension if not exists pgcrypto;

create or replace function public.current_request_headers()
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
$$;

create or replace function public.current_request_ip()
returns inet
language plpgsql
stable
set search_path = public
as $$
declare
  headers jsonb;
  candidate text;
begin
  headers := public.current_request_headers();
  candidate := coalesce(
    nullif(trim(headers ->> 'cf-connecting-ip'), ''),
    nullif(trim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    nullif(trim(headers ->> 'x-real-ip'), '')
  );

  if candidate is null then
    return null;
  end if;

  begin
    return candidate::inet;
  exception
    when others then
      return null;
  end;
end;
$$;

create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('terms', 'privacy', 'dpa', 'cookies')),
  title text not null,
  version_label text not null,
  effective_at timestamptz not null default timezone('utc', now()),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  acceptance_requirement text not null default 'all-users' check (acceptance_requirement in ('all-users', 'organization-owner', 'none')),
  requires_reacceptance boolean not null default false,
  change_summary text,
  locale text not null default 'fi-FI',
  content_md text not null,
  content_hash text not null default '',
  created_by_user_id uuid references public.profiles(id) on delete set null,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz
);

create unique index if not exists legal_document_versions_type_version_idx
on public.legal_document_versions(document_type, version_label);

create unique index if not exists legal_document_versions_one_active_idx
on public.legal_document_versions(document_type)
where status = 'active';

create index if not exists legal_document_versions_document_type_idx
on public.legal_document_versions(document_type, status, effective_at desc);

create or replace function public.prepare_legal_document_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.title := trim(new.title);
  new.version_label := trim(new.version_label);
  new.locale := coalesce(nullif(trim(new.locale), ''), 'fi-FI');
  new.content_md := coalesce(new.content_md, '');
  new.content_hash := encode(extensions.digest(new.content_md, 'sha256'), 'hex');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
    new.created_by_user_id := coalesce(new.created_by_user_id, auth.uid());
  end if;

  new.updated_by_user_id := coalesce(auth.uid(), new.updated_by_user_id, new.created_by_user_id);

  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    new.published_at := coalesce(new.published_at, timezone('utc', now()));
  end if;

  return new;
end;
$$;

create or replace function public.guard_legal_document_version_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('active', 'archived') then
    if new.document_type is distinct from old.document_type
      or new.title is distinct from old.title
      or new.version_label is distinct from old.version_label
      or new.effective_at is distinct from old.effective_at
      or new.acceptance_requirement is distinct from old.acceptance_requirement
      or new.requires_reacceptance is distinct from old.requires_reacceptance
      or new.change_summary is distinct from old.change_summary
      or new.locale is distinct from old.locale
      or new.content_md is distinct from old.content_md
    then
      raise exception 'Julkaistua tai arkistoitua dokumenttiversiota ei voi muokata.';
    end if;
  end if;

  if old.status = 'active' and new.status not in ('active', 'archived') then
    raise exception 'Voimassa oleva dokumenttiversio voidaan vain arkistoida.';
  end if;

  if old.status = 'archived' and new.status <> 'archived' then
    raise exception 'Arkistoitua dokumenttiversiota ei voi palauttaa muokattavaksi.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_published_legal_document_version_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'draft' then
    raise exception 'Vain luonnoksen voi poistaa.';
  end if;

  return old;
end;
$$;

drop trigger if exists legal_document_versions_prepare on public.legal_document_versions;
create trigger legal_document_versions_prepare
before insert or update on public.legal_document_versions
for each row
execute function public.prepare_legal_document_version();

drop trigger if exists legal_document_versions_guard on public.legal_document_versions;
create trigger legal_document_versions_guard
before update on public.legal_document_versions
for each row
execute function public.guard_legal_document_version_update();

drop trigger if exists legal_document_versions_delete_guard on public.legal_document_versions;
create trigger legal_document_versions_delete_guard
before delete on public.legal_document_versions
for each row
execute function public.prevent_published_legal_document_version_delete();

alter table public.legal_document_versions enable row level security;

drop policy if exists legal_document_versions_select_active_public on public.legal_document_versions;
create policy legal_document_versions_select_active_public
on public.legal_document_versions
for select
to anon, authenticated
using (status = 'active');

drop policy if exists legal_document_versions_select_all_admin on public.legal_document_versions;
create policy legal_document_versions_select_all_admin
on public.legal_document_versions
for select
to authenticated
using ((select public.is_admin()));

drop policy if exists legal_document_versions_insert_admin on public.legal_document_versions;
create policy legal_document_versions_insert_admin
on public.legal_document_versions
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists legal_document_versions_update_admin on public.legal_document_versions;
create policy legal_document_versions_update_admin
on public.legal_document_versions
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists legal_document_versions_delete_admin on public.legal_document_versions;
create policy legal_document_versions_delete_admin
on public.legal_document_versions
for delete
to authenticated
using ((select public.is_admin()));

create table if not exists public.legal_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.legal_document_versions(id) on delete restrict,
  document_type text not null check (document_type in ('terms', 'privacy', 'dpa', 'cookies')),
  version_label text not null,
  content_hash text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  accepted_at timestamptz not null default timezone('utc', now()),
  ip_address inet,
  user_agent text,
  acceptance_source text not null check (acceptance_source in ('signup', 'invited-user-first-login', 'reacceptance', 'admin-flow')),
  locale text,
  accepted_on_behalf_of_organization boolean not null default false
);

create unique index if not exists legal_document_acceptances_user_version_idx
on public.legal_document_acceptances(user_id, document_version_id);

create index if not exists legal_document_acceptances_user_type_idx
on public.legal_document_acceptances(user_id, document_type, accepted_at desc);

create index if not exists legal_document_acceptances_org_idx
on public.legal_document_acceptances(organization_id, accepted_at desc);

create or replace function public.prepare_legal_document_acceptance()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_document public.legal_document_versions;
  current_profile public.profiles;
  headers jsonb;
begin
  select *
  into target_document
  from public.legal_document_versions
  where id = new.document_version_id;

  if target_document.id is null then
    raise exception 'Dokumenttiversiota ei löytynyt.';
  end if;

  if target_document.status <> 'active' then
    raise exception 'Vain voimassa olevan dokumenttiversion voi hyväksyä.';
  end if;

  if target_document.acceptance_requirement = 'none' then
    raise exception 'Tälle dokumentille ei tallenneta erillistä hyväksyntää.';
  end if;

  new.user_id := coalesce(new.user_id, auth.uid());
  if new.user_id is null then
    raise exception 'Kirjautuminen vaaditaan.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = new.user_id;

  if current_profile.id is null or current_profile.status <> 'active' then
    raise exception 'Käyttäjäprofiilia ei löytynyt tai tili ei ole aktiivinen.';
  end if;

  if target_document.acceptance_requirement = 'organization-owner'
    and (current_profile.organization_role <> 'owner' or current_profile.organization_id is null)
  then
    raise exception 'Tämän dokumentin hyväksyntä vaatii organisaation omistajan oikeudet.';
  end if;

  if new.accepted_on_behalf_of_organization
    and (current_profile.organization_role <> 'owner' or current_profile.organization_id is null)
  then
    raise exception 'Hyväksyntää ei voi kirjata organisaation puolesta ilman omistajan oikeuksia.';
  end if;

  headers := public.current_request_headers();
  new.document_type := target_document.document_type;
  new.version_label := target_document.version_label;
  new.content_hash := target_document.content_hash;
  new.organization_id := coalesce(new.organization_id, current_profile.organization_id);
  new.accepted_at := coalesce(new.accepted_at, timezone('utc', now()));
  new.locale := coalesce(nullif(trim(new.locale), ''), target_document.locale, 'fi-FI');
  new.user_agent := coalesce(nullif(trim(new.user_agent), ''), nullif(trim(headers ->> 'user-agent'), ''));
  new.ip_address := coalesce(new.ip_address, public.current_request_ip());

  return new;
end;
$$;

drop trigger if exists legal_document_acceptances_prepare on public.legal_document_acceptances;
create trigger legal_document_acceptances_prepare
before insert on public.legal_document_acceptances
for each row
execute function public.prepare_legal_document_acceptance();

alter table public.legal_document_acceptances enable row level security;

drop policy if exists legal_document_acceptances_select_self_admin_or_owner on public.legal_document_acceptances;
create policy legal_document_acceptances_select_self_admin_or_owner
on public.legal_document_acceptances
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
);

create or replace function public.record_signup_legal_acceptances(
  p_user_id uuid,
  p_organization_id uuid,
  p_acceptance_bundle jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_document_ids uuid[];
  required_document_ids uuid[];
  requested_count integer;
  required_count integer;
  accepted_at timestamptz;
  locale_value text;
  user_agent_value text;
  authority_confirmed boolean;
begin
  if p_acceptance_bundle is null then
    raise exception 'Rekisteröityminen edellyttää ajantasaisten sopimusasiakirjojen hyväksyntää.';
  end if;

  authority_confirmed := coalesce((p_acceptance_bundle ->> 'authority_confirmed')::boolean, false);
  if authority_confirmed is not true then
    raise exception 'Organisaation puolesta hyväksyminen on vahvistettava rekisteröitymisen yhteydessä.';
  end if;

  begin
    requested_document_ids := array(
      select distinct value::uuid
      from jsonb_array_elements_text(coalesce(p_acceptance_bundle -> 'accepted_document_version_ids', '[]'::jsonb)) as value
    );
  exception
    when invalid_text_representation then
      raise exception 'Rekisteröitymisen hyväksyntätiedot olivat virheelliset.';
  end;

  required_document_ids := array(
    select id
    from public.legal_document_versions
    where status = 'active'
      and acceptance_requirement in ('all-users', 'organization-owner')
    order by document_type
  );

  requested_count := coalesce(array_length(requested_document_ids, 1), 0);
  required_count := coalesce(array_length(required_document_ids, 1), 0);

  if required_count = 0 then
    raise exception 'Rekisteröityminen ei ole mahdollista ilman julkaistuja sopimusasiakirjoja.';
  end if;

  if requested_count <> required_count then
    raise exception 'Rekisteröitymisen hyväksyntä ei kata kaikkia vaadittuja dokumentteja.';
  end if;

  if not (requested_document_ids <@ required_document_ids and required_document_ids <@ requested_document_ids) then
    raise exception 'Rekisteröitymisen hyväksyntä ei vastaa voimassa olevia dokumenttiversioita.';
  end if;

  accepted_at := coalesce(
    nullif(p_acceptance_bundle ->> 'accepted_at', '')::timestamptz,
    timezone('utc', now())
  );
  locale_value := coalesce(nullif(trim(p_acceptance_bundle ->> 'locale'), ''), 'fi-FI');
  user_agent_value := nullif(trim(p_acceptance_bundle ->> 'user_agent'), '');

  insert into public.legal_document_acceptances (
    document_version_id,
    user_id,
    organization_id,
    accepted_at,
    user_agent,
    acceptance_source,
    locale,
    accepted_on_behalf_of_organization
  )
  select
    version_id,
    p_user_id,
    p_organization_id,
    accepted_at,
    user_agent_value,
    'signup',
    locale_value,
    true
  from unnest(required_document_ids) as version_id
  on conflict (user_id, document_version_id) do nothing;
end;
$$;

create or replace function public.accept_legal_documents(
  p_document_version_ids uuid[],
  p_acceptance_source text,
  p_locale text default 'fi-FI',
  p_user_agent text default null,
  p_accept_on_behalf_of_organization boolean default false
)
returns setof public.legal_document_acceptances
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  requested_document_ids uuid[];
  requested_count integer;
  active_count integer;
  has_non_acceptance_document boolean;
begin
  if p_acceptance_source not in ('signup', 'invited-user-first-login', 'reacceptance', 'admin-flow') then
    raise exception 'Virheellinen hyväksynnän lähde.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null or current_profile.status <> 'active' then
    raise exception 'Kirjautuminen vaaditaan.';
  end if;

  requested_document_ids := array(select distinct unnest(coalesce(p_document_version_ids, array[]::uuid[])));
  requested_count := coalesce(array_length(requested_document_ids, 1), 0);

  if requested_count = 0 then
    raise exception 'Anna vähintään yksi dokumenttiversio hyväksyttäväksi.';
  end if;

  select count(*)
  into active_count
  from public.legal_document_versions
  where id = any(requested_document_ids)
    and status = 'active';

  if active_count <> requested_count then
    raise exception 'Kaikki hyväksyttävät dokumentit eivät ole voimassa olevia versioita.';
  end if;

  select exists (
    select 1
    from public.legal_document_versions
    where id = any(requested_document_ids)
      and acceptance_requirement = 'none'
  )
  into has_non_acceptance_document;

  if has_non_acceptance_document then
    raise exception 'Mukaan annettiin dokumentti, jolle ei tallenneta erillistä hyväksyntää.';
  end if;

  if p_accept_on_behalf_of_organization
    and (current_profile.organization_role <> 'owner' or current_profile.organization_id is null)
  then
    raise exception 'Organisaation puolesta hyväksyminen vaatii omistajan oikeudet.';
  end if;

  insert into public.legal_document_acceptances (
    document_version_id,
    user_id,
    organization_id,
    user_agent,
    acceptance_source,
    locale,
    accepted_on_behalf_of_organization
  )
  select
    version.id,
    current_profile.id,
    current_profile.organization_id,
    nullif(trim(p_user_agent), ''),
    p_acceptance_source,
    coalesce(nullif(trim(p_locale), ''), 'fi-FI'),
    p_accept_on_behalf_of_organization
  from public.legal_document_versions version
  where version.id = any(requested_document_ids)
  on conflict (user_id, document_version_id) do nothing;

  return query
  select *
  from public.legal_document_acceptances
  where user_id = current_profile.id
    and document_version_id = any(requested_document_ids)
  order by accepted_at desc;
end;
$$;

grant execute on function public.accept_legal_documents(uuid[], text, text, text, boolean) to authenticated;

create or replace function public.publish_legal_document_version(
  p_document_version_id uuid
)
returns public.legal_document_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  next_version public.legal_document_versions;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null or current_profile.role <> 'admin' or current_profile.status <> 'active' then
    raise exception 'Dokumenttiversion julkaisu vaatii pääkäyttäjän oikeudet.';
  end if;

  select *
  into next_version
  from public.legal_document_versions
  where id = p_document_version_id;

  if next_version.id is null then
    raise exception 'Dokumenttiversiota ei löytynyt.';
  end if;

  if next_version.status <> 'draft' then
    raise exception 'Vain luonnoksen voi julkaista.';
  end if;

  update public.legal_document_versions
  set status = 'archived',
      updated_at = timezone('utc', now()),
      updated_by_user_id = current_profile.id
  where document_type = next_version.document_type
    and status = 'active';

  update public.legal_document_versions
  set status = 'active',
      published_at = coalesce(published_at, timezone('utc', now())),
      updated_at = timezone('utc', now()),
      updated_by_user_id = current_profile.id
  where id = p_document_version_id
  returning * into next_version;

  return next_version;
end;
$$;

grant execute on function public.publish_legal_document_version(uuid) to authenticated;

insert into public.legal_document_versions (
  document_type,
  title,
  version_label,
  effective_at,
  status,
  acceptance_requirement,
  requires_reacceptance,
  change_summary,
  locale,
  content_md
)
values (
  'terms',
  'Käyttöehdot',
  '1.0.0',
  '2026-04-04T00:00:00+00',
  'active',
  'all-users',
  false,
  'Ensijulkaisu versionoidulle käyttöehtokokonaisuudelle.',
  'fi-FI',
  $terms$
# 1. Sopijapuolet
Nämä käyttöehdot koskevat palvelua [PALVELU_NIMI], jota tarjoaa [PALVELUNTARJOAJA_YRITYS], Y-tunnus [PALVELUNTARJOAJA_Y_TUNNUS], osoite [PALVELUNTARJOAJA_OSOITE] ("Palveluntarjoaja").

Palvelun käyttäjä voi toimia omissa nimissään tai sen organisaation puolesta, jonka käyttöön tili tai työtila luodaan ("Asiakas"). Jos käyttäjä hyväksyy ehdot organisaation puolesta, käyttäjä vakuuttaa, että hänellä on oikeus sitoa kyseinen organisaatio näihin ehtoihin.

# 2. Palvelun tarkoitus
Palvelu on yrityskäyttöön tarkoitettu SaaS-palvelu projektinhallintaan, tarjouslaskentaan, raportointiin, käyttäjähallintaan sekä näihin liittyvien tietojen käsittelyyn.

Palveluntarjoaja voi kehittää, päivittää, muuttaa, korjata, automatisoida, korvata tai poistaa palvelun ominaisuuksia, tietorakenteita, käyttöliittymiä, integraatioita ja toimintalogiikkaa oman tuote- ja turvallisuuslinjauksensa mukaisesti.

# 3. Yrityskäyttö
Palvelu on tarkoitettu ensisijaisesti yritys- ja organisaatiokäyttöön. Jos Palveluntarjoaja ei ole kirjallisesti hyväksynyt muuta käyttötarkoitusta, palvelua ei tarjota kuluttajakäyttöön eikä kuluttajansuojalainsäädäntöön perustuvin erityisehdoin.

# 4. Tunnukset ja käyttöoikeudet
Käyttäjä vastaa omien tunnustensa, salasanojensa, monivaiheisen tunnistautumisen välineidensä, päätelaitteidensa ja muiden pääsynhallintakeinojen asianmukaisesta suojaamisesta.

Asiakas vastaa omista käyttäjistään, heidän käyttöoikeuksistaan, käyttöoikeuksien ajantasaisuudesta, henkilöstömuutoksista, omista sisäisistä hyväksymisprosesseistaan sekä siitä, että vain valtuutetut henkilöt käyttävät palvelua.

Palveluntarjoajalla on oikeus keskeyttää, rajoittaa tai estää pääsy palveluun, jos on perusteltu syy epäillä väärinkäyttöä, tietoturvauhkaa, ehtorikkomusta, maksujen laiminlyöntiä, virheellisiä käyttäjätietoja tai muuta palvelun, muiden asiakkaiden tai Palveluntarjoajan kannalta haitallista toimintaa.

# 5. Asiakkaan data ja sisältö
Asiakas säilyttää omistusoikeuden omaan dataansa, sisältöönsä, syöttämiinsä asiakas- ja projektitietoihin, tarjouksiin, laskuihin, liitetietoihin, käyttäjätietoihin sekä muihin asiakkaan järjestelmään tuomiin aineistoihin.

Asiakas antaa Palveluntarjoajalle rajatun oikeuden käsitellä dataa siltä osin kuin se on tarpeen palvelun tuottamiseksi, ylläpitämiseksi, suojaamiseksi, vianmääritykseksi, varmuuskopioimiseksi, palautusyritysten tekemiseksi, lakisääteisten velvoitteiden täyttämiseksi ja palvelun kehittämiseksi lain sallimissa rajoissa.

Asiakas vastaa siitä, että sillä on oikeus tuoda, tallentaa, käsitellä, käyttää ja poistaa palvelussa käsiteltävä data, että data on käyttötarkoitukseensa nähden riittävän oikeaa ja ajantasaista, eikä data sisällä lainvastaista, loukkaavaa, harhaanjohtavaa tai oikeudettomasti käsiteltyä sisältöä.

# 6. Tietoturva ja palvelun suojaus
Palveluntarjoaja käyttää kohtuullisia teknisiä ja organisatorisia suojatoimia palvelun suojaamiseksi. Tällaisia voivat olla esimerkiksi käyttöoikeuksien hallinta, lokitus, tekninen valvonta, ohjelmistopäivitykset, kolmansien osapuolten infrastruktuuriturvatoimet sekä rajatut palautus- ja häiriönhallintamenettelyt.

Palveluntarjoaja ei kuitenkaan takaa, että palvelu olisi keskeytyksetön, virheetön, haavoittumaton tai kaikissa tilanteissa täysin suojattu. Tietoturvapoikkeamia, väärinkäyttöyrityksiä, integraatiohäiriöitä, infrastruktuurikatkoja, ohjelmistovirheitä ja inhimillisiä virheitä voi esiintyä kohtuullisista suojatoimista huolimatta.

# 7. Varmuuskopiot, datan säilyminen ja palautus
Palveluntarjoaja voi tehdä varmuuskopioita, palautuspisteitä, teknisiä replikoita tai muita palautustoimia oman käytäntönsä mukaan, mutta niiden olemassaoloa, kattavuutta, virheettömyyttä, jatkuvuutta tai tietyn palautusajan toteutumista ei taata, ellei siitä ole erikseen kirjallisesti sovittu.

Asiakas vastaa liiketoimintakriittisen datansa omasta viennistä, tarkastamisesta, hyväksymisestä ja tarvittaessa omista varmuuskopioistaan. Asiakkaan tulee käyttää palvelun mahdollisia vientiominaisuuksia, omia sisäisiä kontrollejaan ja muuta asianmukaista menettelyä varmistaakseen, että data on saatavilla myös poikkeustilanteissa.

Lain sallimissa rajoissa Palveluntarjoaja ei vastaa datan katoamisesta, korruptoitumisesta, virheellisestä poistosta, yliajosta, käyttäjän omasta toiminnasta, virheellisistä käyttäjätiedoista, käyttövirheestä, asiakkaan puutteellisesta pääsynhallinnasta, kolmannen osapuolen häiriöstä, ulkoisesta kyberhäiriöstä tai muusta Palveluntarjoajan kohtuullisen vaikutusvallan ulkopuolella olevasta syystä aiheutuvista seurauksista.

Jos dataa on teknisesti mahdollista palauttaa, Palveluntarjoajan velvollisuus rajoittuu kohtuulliseen best effort -tasoiseen palautusyritykseen, ellei erillisessä SLA-, backup- tai ylläpitosopimuksessa ole nimenomaisesti sovittu laajemmasta palvelutasosta.

# 8. Saatavuus ja ylläpito
Palvelu tarjotaan lain sallimissa rajoissa "sellaisena kuin se on" ja "saatavuuden mukaan". Palveluntarjoaja ei takaa palvelun jatkuvaa käytettävyyttä, virheettömyyttä, yhteensopivuutta kaikkien laitteiden, selainten tai toimintaympäristöjen kanssa tai sitä, että jokin ominaisuus säilyy muuttumattomana.

Palvelussa voi esiintyä huoltokatkoja, suunniteltuja ylläpitoikkunoita, kapasiteettirajoitteita, kolmansien osapuolten häiriöitä, tietokantakatkoja, sähköposti- tai tunnistautumishäiriöitä sekä muita saatavuuteen vaikuttavia tapahtumia.

# 9. Kielletty käyttö
Palvelua ei saa käyttää lainvastaisesti, vilpillisesti, harhaanjohtavasti tai tavalla, joka vaarantaa palvelun, Palveluntarjoajan, muiden asiakkaiden tai kolmansien osapuolten oikeudet tai turvallisuuden.

Kiellettyä käyttöä ovat muun muassa:
- tietoturvan ohittaminen, kiertäminen tai testaaminen ilman lupaa
- automaattinen väärinkäyttö, scraping, kuormitushyökkäykset, bottikäyttö tai haittakoodin tuonti
- toisten tietojen oikeudeton käsittely, kopiointi, poistaminen tai muuttaminen
- immateriaalioikeuksien loukkaaminen
- palvelun käyttäminen tavalla, joka voi aiheuttaa kohtuutonta kuormaa tai häiriötä kolmansien osapuolten infrastruktuurille

# 10. Immateriaalioikeudet
Palvelu, ohjelmisto, käyttöliittymä, brändi, lähdekoodi, dokumentaatio, tietorakenne, mallipohjat, julkaistu sisältörakenne ja muu palveluun kuuluva aineisto kuuluvat Palveluntarjoajalle tai sen lisenssinantajille, ellei toisin ole nimenomaisesti ilmoitettu.

Asiakkaalle annetaan sopimuksen voimassaolon ajaksi rajattu, ei-yksinomainen, ei-siirrettävä ja peruutettavissa oleva oikeus käyttää palvelua omassa sisäisessä liiketoiminnassaan näiden ehtojen ja mahdollisten erillisten tilaussopimusten mukaisesti.

# 11. Maksut, tilauskausi ja hinnanmuutokset
Jos palvelusta tai sen lisäpalveluista sovitaan maksullinen tilaus, hinnat, laskutuskausi, maksuehdot, verot, mahdollinen automaattinen uusiminen, viivästyskorko ja hinnanmuutosmekanismi määräytyvät erillisen tarjouksen, hinnaston, tilausvahvistuksen tai muun kirjallisen sopimusasiakirjan mukaan.

Ellei maksullisuudesta ole kirjallisesti sovittu, nämä käyttöehdot eivät yksin synnytä asiakkaalle maksuvelvollisuutta eikä Palveluntarjoajalle oikeutta veloittaa palvelusta muuta kuin erikseen sovitut kulut.

# 12. Vastuunrajoitus
Lain sallimissa rajoissa Palveluntarjoaja ei vastaa välillisistä vahingoista, kuten menetetystä voitosta, liikevaihdosta, katteesta, liiketoiminnan keskeytymisestä, goodwill-menetyksestä, odotetun säästön menetyksestä, sijaishankintakuluista tai datan menetyksestä.

Lain sallimissa rajoissa Palveluntarjoajan kokonaisvastuu kaikista samaan sopimussuhteeseen liittyvistä vahingoista ja vaatimuksista rajoittuu määrään, joka vastaa asiakkaan Palveluntarjoajalle palvelusta tosiasiallisesti maksamia maksuja vahinkoa välittömästi edeltäneiden kahdentoista (12) kuukauden aikana. Jos palvelu on ollut asiakkaalle maksuton, kokonaisvastuun enimmäismäärä on [VASTUUKATTO_MAKSUTON_EUR] euroa.

Tätä vastuunrajoitusta ei sovelleta siltä osin kuin pakottava laki nimenomaisesti kieltää vastuun rajoittamisen.

# 13. Asiakkaan vastuu ja korvausvelvollisuus
Asiakas vastaa omasta käytöstään, omista käyttäjistään, omista sopimuksistaan asiakkaidensa kanssa sekä siitä, että palveluun syötetty data, tiedostot, yhteystiedot, raportit, tarjoussisällöt, laskutiedot ja muut aineistot ovat laillisia ja käytettävissä oikeudellisesti hyväksyttävällä tavalla.

Asiakas sitoutuu korvaamaan Palveluntarjoajalle kohtuulliset kulut, vahingot ja vastuut siltä osin kuin ne johtuvat asiakkaan tai asiakkaan käyttäjän näiden ehtojen rikkomisesta, lainvastaisesta sisällöstä, oikeudettomasta henkilötietojen käsittelystä, käyttöoikeuksien väärinkäytöstä tai siitä, että asiakkaalla ei ole ollut oikeutta palveluun tuomaansa dataan.

# 14. Sopimuksen päättyminen
Asiakas voi lopettaa palvelun käytön milloin tahansa. Palveluntarjoajalla on oikeus keskeyttää tai päättää asiakkaan tai yksittäisen käyttäjän käyttöoikeus, jos:
- asiakas rikkoo näitä ehtoja
- palvelusta sovitut maksut jätetään maksamatta
- palvelussa havaitaan väärinkäyttöä tai turvallisuusuhka
- virheelliset käyttäjätiedot estävät palvelun turvallisen käytön
- Palveluntarjoaja lopettaa palvelun tai sen osan

Sopimuksen päättyessä asiakas voi käyttää palvelun mahdollisia vientiominaisuuksia tai pyytää kohtuullista tietojen luovutusta [DATA_EXPORT_WINDOW_DAYS] päivän ajan, ellei laista tai erillisestä sopimuksesta johdu muuta. Tämän jälkeen data voidaan poistaa tai anonymisoida aktiivisista järjestelmistä [DATA_DELETE_RETENTION_DAYS] päivän kuluessa, ja teknisiin varmuuskopioihin jäävä data poistuu tai ylikirjoittuu normaalin retention mukaisesti viimeistään [BACKUP_RETENTION_DAYS] päivän kuluessa.

# 15. Palvelun muutokset ja lopettaminen
Palveluntarjoajalla on oikeus muuttaa palvelua, sen ominaisuuksia, tietorakenteita, käyttöliittymää, integraatioita, dokumentaatiota, hinnastoa, tukimallia, tarjottavia jakelukanavia sekä näitä käyttöehtoja.

Palveluntarjoajalla on oikeus lopettaa palvelu tai sen osa kohtuullisella ennakkoilmoituksella, ellei välitön lopettaminen ole tarpeen turvallisuussyistä, lain, viranomaismääräyksen tai kolmannen osapuolen palveluriippuvuuden muutoksen vuoksi.

# 16. Kolmannen osapuolen palvelut
Palvelu voi hyödyntää kolmannen osapuolen tunnistautumis-, tietokanta-, hosting-, sähköposti-, päivitys-, analytiikka-, integraatio- tai muita infrastruktuuripalveluja. Nykyiseen teknologiakokonaisuuteen voi kuulua esimerkiksi Supabase-pohjainen tunnistautuminen ja tietovarasto, Cloudflare Pages -hosting sekä sähköpostipalvelut tunnistautumiseen ja salasanan palautukseen.

Palveluntarjoaja ei vastaa sellaisista häiriöistä, käyttökatkoista, viiveistä, tietojen viivästyneestä toimituksesta tai muista ongelmista, jotka johtuvat kolmannen osapuolen palvelusta Palveluntarjoajan kohtuullisen vaikutusvallan ulkopuolella.

# 17. Force majeure
Osapuoli ei vastaa viivästyksestä tai vahingosta siltä osin kuin se johtuu ylivoimaisesta esteestä tai vastaavasta osapuolen vaikutusmahdollisuuksien ulkopuolella olevasta syystä, kuten laajasta tietoliikenne- tai sähkönjakeluhäiriöstä, viranomaisen toimesta, työtaistelutoimesta, kyberhyökkäyksestä, alihankkijan laajasta häiriöstä, tulipalosta, luonnonilmiöstä tai vastaavasta poikkeuksellisesta tapahtumasta.

# 18. Sovellettava laki ja riidanratkaisu
Näihin käyttöehtoihin sovelletaan lakia [SOVELLETTAVA_LAKI], pois lukien lainvalintasäännöt siltä osin kuin ne johtaisivat muun lain soveltamiseen.

Osapuolet pyrkivät ensisijaisesti ratkaisemaan erimielisyydet neuvotteluteitse. Ellei ratkaisua saavuteta, riidat ratkaistaan tuomioistuimessa [TOIMIVALTAINEN_TUOMIOISTUIN], ellei pakottava laki edellytä muuta menettelyä.

# 19. Yhteystiedot
Yleinen tuki: [SUPPORT_EMAIL]

Lakiasiat: [LEGAL_EMAIL]

Tietosuoja: [PRIVACY_EMAIL]

Tietoturvailmoitukset: [SECURITY_EMAIL]
  $terms$
)
on conflict (document_type, version_label) do nothing;

insert into public.legal_document_versions (
  document_type,
  title,
  version_label,
  effective_at,
  status,
  acceptance_requirement,
  requires_reacceptance,
  change_summary,
  locale,
  content_md
)
values (
  'privacy',
  'Tietosuojaseloste',
  '1.0.0',
  '2026-04-04T00:00:00+00',
  'active',
  'all-users',
  false,
  'Ensijulkaisu versionoidulle tietosuojaselosteelle.',
  'fi-FI',
  $privacy$
# 1. Rekisterinpitäjä
Tämän tietosuojaselosteen mukainen rekisterinpitäjä on [PALVELUNTARJOAJA_YRITYS], Y-tunnus [PALVELUNTARJOAJA_Y_TUNNUS], osoite [PALVELUNTARJOAJA_OSOITE] ("Palveluntarjoaja").

Tietosuojaan liittyvät yhteydenotot: [PRIVACY_EMAIL]

Tietoturvapoikkeamien ilmoitukset: [SECURITY_EMAIL]

# 2. Mitä tämä seloste koskee
Tämä seloste kuvaa, miten Palveluntarjoaja käsittelee henkilötietoja omassa roolissaan rekisterinpitäjänä, kun käyttäjä rekisteröi tilin, käyttää palvelua, pyytää tukea, hallinnoi työtilaa, hyväksyy sopimusasiakirjoja tai muuten asioi Palveluntarjoajan kanssa.

Jos asiakasorganisaatio käyttää palvelua omien asiakkaidensa, yhteyshenkilöidensä tai työntekijöidensä henkilötietojen käsittelyyn, asiakasorganisaatio toimii lähtökohtaisesti näiden tietojen rekisterinpitäjänä ja Palveluntarjoaja henkilötietojen käsittelijänä erillisen tietojenkäsittelyliitteen mukaisesti.

# 3. Käsiteltävät henkilötiedot
Palveluntarjoaja voi käsitellä muun muassa seuraavia henkilötietoryhmiä:
- käyttäjätilin perustiedot, kuten nimi, sähköpostiosoite, käyttäjärooli, työtila, käyttäjätilan tila ja kirjautumisen ajankohdat
- tunnistautumiseen liittyvät tiedot, kuten sähköpostivahvistukset, salasanan palautus ja muut todennustapahtumat siltä osin kuin ne ovat Palveluntarjoajan saatavilla
- organisaatio- ja työtilatiedot, kuten yrityksen tai työtilan nimi sekä siihen liitetyt käyttäjät
- asiakkaan palveluun syöttämät yhteys- ja projektitiedot, kuten yhteyshenkilöiden nimet, sähköpostiosoitteet, puhelinnumerot, osoitteet, työmaiden tiedot, tarjousten ja laskujen sisältö sekä raportointitiedot
- yritysprofiilin tiedot, kuten yhteystiedot, Y-tunnus ja mahdolliset laskutustiedot
- tuonnit, viennit ja käyttäjän toimesta ladatut tai muodostetut dokumentit siltä osin kuin niissä on henkilötietoja
- hyväksyntä- ja auditointitiedot, kuten hyväksytty dokumenttityyppi, versio, sisältöhash, hyväksyntäajankohta, käyttäjätunniste, organisaatio, mahdollinen IP-osoite, selain- tai laitetieto ja hyväksynnän lähde
- tekniset loki- ja käyttötiedot, kuten virhetilanteet, käyttökatkot, laitetiedot, selaintiedot ja muut tietoturvan tai palvelun toimivuuden kannalta tarpeelliset tapahtumatiedot

# 4. Mistä tiedot saadaan
Henkilötietoja saadaan pääasiassa:
- rekisteröityvältä käyttäjältä itseltään
- käyttäjän organisaation omistajalta tai ylläpitäjältä, jos tili luodaan organisaation toimesta
- käyttäjän tai asiakasorganisaation palveluun syöttämistä tiedoista, tiedostotuonneista ja käyttötoimenpiteistä
- tunnistautumisen, kirjautumisen, sähköpostivahvistuksen ja salasanan palautuksen yhteydessä käytettäviltä palveluntarjoajilta
- loki- ja suojausjärjestelmistä sekä käyttöympäristöstä automaattisesti

# 5. Käyttötarkoitukset
Henkilötietoja käsitellään seuraaviin tarkoituksiin:
- käyttäjätilien luominen, ylläpito ja pääsynhallinta
- työtilojen, käyttäjäroolien ja organisaatiorakenteen hallinta
- palvelun toimittaminen, ylläpito, vianmääritys, kehittäminen ja suojaaminen
- tarjousten, projektien, raporttien, laskujen ja muiden palvelussa käsiteltävien tietojen tallentaminen ja näyttäminen käyttäjälle
- palvelun käyttöehtojen, tietosuojaselosteen, tietojenkäsittelyliitteen ja muiden versionoitujen dokumenttien hyväksynnän todentaminen
- tietoturvan, väärinkäytösten ehkäisyn, petosten torjunnan ja palvelun luotettavan käytön varmistaminen
- asiakasviestintä, tukipyynnöt, reklamaatiot ja palvelun hallinnollinen toteuttaminen
- lakisääteisten velvoitteiden täyttäminen, oikeudellisten vaatimusten selvittäminen ja puolustaminen

# 6. Käsittelyn oikeusperusteet
Henkilötietojen käsittelyn oikeusperusteita voivat olla:
- sopimuksen täytäntöönpano tai sopimuksen tekemistä edeltävät toimenpiteet
- Palveluntarjoajan oikeutettu etu palvelun turvalliseen tuottamiseen, kehittämiseen, asiakassuhteiden hallintaan, lokitukseen ja väärinkäytösten estämiseen
- lakisääteinen velvoite, esimerkiksi kirjanpitoon, tietoturvaan, viranomaispyyntöihin tai oikeudellisiin vaatimuksiin liittyen
- suostumus, jos myöhemmin otetaan käyttöön erillisiä vapaaehtoisia toimintoja, kuten markkinointiviestintä

# 7. Vastaanottajat ja alikäsittelijät
Henkilötietoja voidaan luovuttaa tai antaa käsiteltäväksi sellaisille palveluntarjoajille ja alihankkijoille, jotka tarvitsevat tietoja palvelun toteuttamiseksi, ylläpitämiseksi, suojaamiseksi tai tukemiseksi.

Vastaanottajaryhmiä voivat olla esimerkiksi:
- tunnistautumis- ja tietovarastopalvelut
- hosting- ja jakelupalvelut
- sähköpostipalvelut kirjautumisen, vahvistusten ja salasanan palautuksen yhteydessä
- teknisen valvonnan, tietoturvan, ylläpidon ja tuen palveluntarjoajat

Nykyinen tekninen toteutus voi hyödyntää esimerkiksi Supabase-pohjaista tunnistautumista ja tietovarastoa sekä Cloudflare Pages -hosting-ympäristöä. Alihankkijoiden käyttö voi muuttua palvelun elinkaaren aikana.

# 8. Tietojen siirrot EU- tai ETA-alueen ulkopuolelle
Palveluntarjoaja pyrkii ensisijaisesti käsittelemään tietoja EU- tai ETA-alueella. Jos käyttämämme palveluntarjoaja tai sen alikäsittelijä käsittelee tietoja EU- tai ETA-alueen ulkopuolella, käytämme soveltuvan tietosuojalainsäädännön edellyttämiä asianmukaisia siirtomekanismeja, kuten Euroopan komission mallisopimuslausekkeita tai muuta lain sallimaa perustetta.

# 9. Säilytysajat
Henkilötietoja säilytetään vain niin kauan kuin se on tarpeen tässä selosteessa kuvattuihin tarkoituksiin tai lain velvoitteiden täyttämiseksi.

Arvioituja säilytysperiaatteita:
- käyttäjätilin perustiedot säilytetään tilin voimassaolon ajan ja enintään [ACCOUNT_RETENTION_DAYS] päivää tilin päättymisestä, ellei pidempi säilytys ole tarpeen lakisääteisen velvoitteen tai oikeudellisen vaatimuksen vuoksi
- sopimusasiakirjojen hyväksyntälokit säilytetään niin kauan kuin se on tarpeen sopimussuhteen todentamiseksi, vähintään [LEGAL_LOG_RETENTION_YEARS] vuotta viimeisestä hyväksynnästä tai sopimussuhteen päättymisestä
- tekniset lokit, turvallisuuslokit ja virhelokit säilytetään yleensä enintään [SECURITY_LOG_RETENTION_DAYS] päivää, ellei pidempi säilytys ole tarpeen tietoturvapoikkeaman tai oikeudellisen vaatimuksen käsittelemiseksi
- aktiivisista järjestelmistä poistettu data voi säilyä varmuuskopioissa ja palautusmedioissa enintään [BACKUP_RETENTION_DAYS] päivää normaalin teknisen retention mukaisesti

# 10. Rekisteröidyn oikeudet
Rekisteröidyllä on soveltuvan tietosuojalainsäädännön mukaisesti oikeus:
- saada tieto henkilötietojensa käsittelystä
- pyytää pääsy omiin tietoihinsa
- pyytää virheellisten tai puutteellisten tietojen oikaisua
- pyytää tietojensa poistamista, jos poistamiselle on laillinen peruste
- pyytää käsittelyn rajoittamista
- vastustaa käsittelyä siltä osin kuin käsittely perustuu oikeutettuun etuun
- pyytää tietojen siirtoa järjestelmästä toiseen siltä osin kuin oikeus soveltuu
- peruuttaa antamansa suostumus, jos käsittely perustuu suostumukseen

Pyynnöt voi lähettää osoitteeseen [PRIVACY_EMAIL]. Palveluntarjoaja voi pyytää lisätietoja henkilöllisyyden varmistamiseksi ennen pyynnön toteuttamista.

# 11. Oikeus valittaa valvontaviranomaiselle
Rekisteröidyllä on oikeus tehdä valitus toimivaltaiselle tietosuojaviranomaiselle, jos hän katsoo henkilötietojensa käsittelyn rikkovan soveltuvaa lainsäädäntöä.

# 12. Tietoturvan yleinen kuvaus
Palveluntarjoaja käyttää kohtuullisia teknisiä ja organisatorisia suojatoimia, kuten käyttöoikeuksien hallintaa, lokitusta, ohjelmistopäivityksiä, infrastruktuuripalveluiden suojausmekanismeja, rajattuja palautusmenettelyjä ja muita hallinnollisia suojatoimia.

Täydellistä turvallisuutta ei voida kuitenkaan taata. Palveluun liittyvät kolmannen osapuolen häiriöt, infrastruktuurikatkot, ohjelmistovirheet, väärinkäytöt ja tietoturvapoikkeamat voivat vaikuttaa henkilötietojen käsittelyyn.

# 13. Lokitiedot, IP-osoitteet ja käyttödata
Palveluntarjoaja voi käsitellä lokitietoja, IP-osoitteita, selaimen tai laitteen tunnistetietoja, käyttöaikoja, käyttäjäagenttia ja muuta teknistä käyttödataa palvelun turvallisen käytön varmistamiseksi, väärinkäytösten ehkäisemiseksi, virheiden selvittämiseksi sekä hyväksyntä- ja auditointiketjun todentamiseksi.

# 14. Evästeet ja tekniset tallenteet
Palvelu ei nykyisessä versiossa käytä markkinointi- tai analytiikkaevästeitä. Palvelu voi kuitenkin käyttää teknisesti välttämättömiä istunto- ja selaintallenteita, paikallista tallennustilaa, välimuisteja ja virhetilanteiden palautustietoja palvelun toiminnan varmistamiseksi.

Lisätietoja annetaan erillisellä sivulla "Evästeet ja tekniset tallenteet".

# 15. Muutokset tähän selosteeseen
Palveluntarjoaja voi päivittää tätä selostetta palvelun, lainsäädännön, tietoturvavaatimusten tai käsittelytoimien muuttuessa. Voimassa oleva versio julkaistaan palvelussa versionumerolla ja voimaantulopäivällä.
  $privacy$
)
on conflict (document_type, version_label) do nothing;

insert into public.legal_document_versions (
  document_type,
  title,
  version_label,
  effective_at,
  status,
  acceptance_requirement,
  requires_reacceptance,
  change_summary,
  locale,
  content_md
)
values (
  'dpa',
  'Tietojenkäsittelyliite (DPA)',
  '1.0.0',
  '2026-04-04T00:00:00+00',
  'active',
  'organization-owner',
  false,
  'Ensijulkaisu versionoidulle tietojenkäsittelyliitteelle.',
  'fi-FI',
  $dpa$
# 1. Soveltaminen ja osapuolet
Tämä tietojenkäsittelyliite ("DPA") on osa [PALVELU_NIMI]-palvelua koskevaa sopimuskokonaisuutta Palveluntarjoajan ja asiakasorganisaation välillä.

Siltä osin kuin asiakasorganisaatio käyttää palvelua omien asiakkaidensa, työntekijöidensä, yhteyshenkilöidensä tai muiden rekisteröityjen henkilötietojen käsittelyyn, asiakasorganisaatio toimii rekisterinpitäjänä ja [PALVELUNTARJOAJA_YRITYS] henkilötietojen käsittelijänä.

# 2. Käsittelyn kohde, luonne ja tarkoitus
Käsittelyn kohteena ovat ne henkilötiedot, jotka asiakasorganisaatio tai sen käyttäjät syöttävät, tuovat, muodostavat tai muuten käsittelevät palvelussa projektinhallinnan, tarjouslaskennan, raportoinnin, käyttäjähallinnan, laskutuksen valmistelun, dokumentoinnin ja niihin liittyvän liiketoimintaprosessin toteuttamiseksi.

Käsittelyn luonne voi sisältää tietojen keräämistä, tallentamista, jäsentämistä, hakemista, tarkastelua, muokkaamista, järjestämistä, näyttämistä, vientiä, poistamista sekä teknistä suojaamista, ylläpitoa, lokitusta ja palautusyrityksiä.

# 3. Henkilötietotyypit ja rekisteröityjen ryhmät
Palvelussa käsiteltäviä henkilötietotyyppejä voivat olla esimerkiksi:
- nimi- ja yhteystiedot
- organisaatio- ja tehtäväroolitiedot
- projektien, työmaiden, tilausten, tarjousten ja laskujen yhteyshenkilötiedot
- käyttäjätilien tunnistetiedot ja käyttöoikeustiedot
- viestintä-, loki- ja tapahtumatiedot siltä osin kuin ne liittyvät asiakkaan käyttöön

Rekisteröityjen ryhmiä voivat olla esimerkiksi:
- asiakasorganisaation käyttäjät ja työntekijät
- asiakasorganisaation asiakkaat, tilaajat, yhteyshenkilöt ja edustajat
- työmaihin, projekteihin, tarjousprosesseihin tai laskutukseen liittyvät muut yksilöt, joiden tiedot asiakasorganisaatio tuo palveluun

# 4. Rekisterinpitäjän velvollisuudet
Asiakasorganisaatio vastaa siitä, että sillä on käsittelylle asianmukainen oikeusperuste, että se noudattaa rekisterinpitäjän velvollisuuksia, että se antaa rekisteröidyille asianmukaiset tiedot käsittelystä ja että palveluun tuodut henkilötiedot ovat tarpeellisia, laillisia ja asianmukaisia.

Asiakasorganisaatio vastaa omien käyttäjiensä ohjeistamisesta, käyttöoikeuksien hallinnasta, henkilöstömuutoksista, tietojen minimoinnista sekä siitä, mitä henkilötietoja palveluun ylipäätään tallennetaan.

# 5. Käsittelijän velvollisuudet
Palveluntarjoaja käsittelee henkilötietoja ainoastaan asiakasorganisaation dokumentoitujen ohjeiden mukaisesti, ellei sovellettava laki edellytä muuta. Näissä käyttöehdoissa, palveludokumentaatiossa ja asiakkaan hyväksymässä käyttölogiikassa kuvatut käsittelytoimet muodostavat ensisijaiset dokumentoidut ohjeet palvelun tavanomaiselle käytölle.

Palveluntarjoaja varmistaa, että henkilötietoja käsittelevät henkilöt ovat sitoutuneet asianmukaiseen salassapitoon tai heitä koskee lakisääteinen salassapitovelvollisuus.

# 6. Alikäsittelijät
Palveluntarjoaja saa käyttää alikäsittelijöitä palvelun tuottamiseen, ylläpitämiseen, suojaamiseen, hostingiin, tunnistautumiseen, tietovarastoon, sähköpostiviestintään ja tekniseen valvontaan liittyviin tarkoituksiin.

Alihankkijaryhmiä voivat olla esimerkiksi:
- tunnistautumis- ja tietovarastopalvelut
- hosting- ja jakelupalvelut
- sähköpostipalvelut tunnistautumiseen ja salasanan palautukseen
- teknisen tuen, tietoturvan ja valvonnan palvelut

Nykyinen ratkaisu voi hyödyntää esimerkiksi Supabase-pohjaista tunnistautumista ja tietovarastoa sekä Cloudflare Pages -hosting-ympäristöä. Palveluntarjoaja voi vaihtaa tai lisätä alikäsittelijöitä, kunhan se varmistaa sopimuksin olennaisesti vastaavan tietosuojan tason. Olennaisista muutoksista ilmoitetaan asiakkaalle kohtuullisen ajan kuluessa ja lähtökohtaisesti vähintään [SUBPROCESSOR_CHANGE_NOTICE_DAYS] päivää ennen muutoksen voimaantuloa, ellei välitön muutos ole tarpeen turvallisuus- tai saatavuussyistä.

# 7. Tietoturvatoimet
Palveluntarjoaja toteuttaa käsittelyn luonteeseen nähden kohtuullisia teknisiä ja organisatorisia turvatoimia. Näitä voivat olla esimerkiksi:
- käyttöoikeuksien hallinta ja roolipohjainen pääsynrajaus
- lokitus ja häiriöiden seuranta
- tietoliikenteen suojaaminen ja ympäristön tekninen kovennus siltä osin kuin se kuuluu Palveluntarjoajan vastuulle
- ohjelmisto- ja infrastruktuuripäivitykset
- palautus- ja jatkuvuusmenettelyt siinä laajuudessa kuin ne ovat osa normaalia palvelunhallintaa

Palveluntarjoaja ei kuitenkaan takaa tietoturvan täydellisyyttä, häiriöttömyyttä tai sitä, että mikään yksittäinen turvatoimi poistaisi kaikki riskit.

# 8. Rekisteröityjen oikeuksien tukeminen
Palveluntarjoaja avustaa asiakasorganisaatiota kohtuullisessa laajuudessa ja asiakkaan kustannuksella niissä toimenpiteissä, jotka liittyvät rekisteröityjen oikeuksien toteuttamiseen, mikäli asiakas ei voi toteuttaa pyyntöä palvelun tavanomaisin omatoimisin toiminnoin.

# 9. Tietoturvaloukkaukset
Jos Palveluntarjoaja havaitsee henkilötietojen tietoturvaloukkauksen, joka koskee asiakasorganisaation tietoja, se ilmoittaa asiasta asiakkaalle ilman aiheetonta viivytystä sen jälkeen, kun loukkaus on tullut sen tietoon siinä laajuudessa kuin ilmoittaminen on käytännössä mahdollista käytettävissä olevin tiedoin.

# 10. Avustaminen vaikutustenarvioinneissa ja viranomaisasioissa
Palveluntarjoaja avustaa asiakasorganisaatiota kohtuullisessa laajuudessa tietosuojaa koskevissa vaikutustenarvioinneissa, ennakkokuulemisissa ja viranomaiskyselyissä siltä osin kuin avustaminen liittyy palvelun kautta tapahtuvaan käsittelyyn ja on kohtuullisesti Palveluntarjoajan hallittavissa.

# 11. Tietojen palautus ja poisto
Sopimussuhteen päättyessä asiakasorganisaatio voi käyttää palvelun mahdollisia vientiominaisuuksia tai pyytää kohtuullista tietojen luovutusta [DATA_EXPORT_WINDOW_DAYS] päivän ajan, ellei laista tai erillisestä sopimuksesta johdu muuta.

Tämän jälkeen henkilötiedot poistetaan tai anonymisoidaan aktiivisista järjestelmistä [DATA_DELETE_RETENTION_DAYS] päivän kuluessa, ja varmuuskopioihin jäävä data poistuu normaalin teknisen retention mukaisesti viimeistään [BACKUP_RETENTION_DAYS] päivän kuluessa, ellei laki edellytä pidempää säilytystä.

# 12. Auditointi ja selvitykset
Asiakasorganisaatiolla on oikeus pyytää kohtuullisia kirjallisia selvityksiä tästä DPA:sta ja palvelun yleisistä tietoturvakäytännöistä. Paikan päällä tehtävät auditoinnit tai muut laajemmat tarkastukset edellyttävät erillistä kirjallista sopimusta, kohtuullista ennakkoilmoitusta, salassapitovelvoitetta sekä sitä, etteivät tarkastukset vaaranna muiden asiakkaiden tietoturvaa tai palvelun jatkuvuutta.

# 13. Kansainväliset siirrot
Jos Palveluntarjoaja tai sen alikäsittelijä käsittelee henkilötietoja EU- tai ETA-alueen ulkopuolella, Palveluntarjoaja varmistaa, että siirrolle on käytettävissä soveltuvan lainsäädännön mukainen siirtoperuste.

# 14. Etusijajärjestys
Jos tämän DPA:n ja muiden sopimusasiakirjojen välillä on ristiriita henkilötietojen käsittelyä koskevissa kysymyksissä, tätä DPA:ta sovelletaan ensisijaisesti siltä osin kuin ristiriita koskee henkilötietojen käsittelyä.
  $dpa$
)
on conflict (document_type, version_label) do nothing;

insert into public.legal_document_versions (
  document_type,
  title,
  version_label,
  effective_at,
  status,
  acceptance_requirement,
  requires_reacceptance,
  change_summary,
  locale,
  content_md
)
values (
  'cookies',
  'Evästeet ja tekniset tallenteet',
  '1.0.0',
  '2026-04-04T00:00:00+00',
  'active',
  'none',
  false,
  'Ensijulkaisu teknisiä tallenteita kuvaavalle sivulle.',
  'fi-FI',
  $cookies$
# 1. Nykyinen linjaus
Palvelu ei nykyisessä versiossa käytä markkinointi- tai analytiikkaevästeitä eikä muuta erillistä seurantaa, joka edellyttäisi vapaaehtoista suostumusta.

# 2. Teknisiä tallenteita voidaan käyttää
Palvelu voi käyttää teknisesti välttämättömiä tallenteita ja selaimen paikallista tallennustilaa esimerkiksi seuraaviin tarkoituksiin:
- kirjautumisen ja istunnon ylläpito
- käyttöliittymän tilan palauttaminen
- virhetilanteista toipuminen ja turvallinen uudelleenlataus
- paikallisten välimuistien ja varatallenteiden ylläpito silloin, kun se on tarpeen palvelun toimintavarmuuden kannalta

Tallennemuoto voi olla esimerkiksi selainistuntoon sidottu tieto, localStorage-, sessionStorage- tai muu vastaava tekninen selainvarasto. Tallenteiden tarkka toteutus voi muuttua palvelun kehittyessä.

# 3. Mihin teknisiä tallenteita ei käytetä
Teknisiä tallenteita ei nykyisessä versiossa käytetä kohdennettuun mainontaan, erilliseen käyttäjäprofilointiin, kolmannen osapuolen markkinointiverkostoihin eikä vapaaehtoiseen analytiikkaan.

# 4. Mitä tapahtuu, jos tekniset tallenteet estetään
Jos selain estää teknisesti välttämättömät tallenteet tai paikallisen selaintallennuksen, palvelun kirjautuminen, istunnon ylläpito, virhetilanteiden palautuminen tai muut olennaiset toiminnot eivät välttämättä toimi oikein.

# 5. Tulevat muutokset
Jos palveluun myöhemmin lisätään ei-välttämätöntä analytiikkaa, mittausta tai markkinointiin liittyviä evästeitä, tästä sivusta tehdään uusi versio ja mahdollinen suostumus pyydetään erikseen selkeästi erotettuna käyttöehtojen hyväksynnästä.
  $cookies$
)
on conflict (document_type, version_label) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_name text;
  next_role text;
  next_signup_flow text;
  next_organization_name text;
  next_organization public.organizations;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  next_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(new.email, 'Kayttaja'), '@', 1)
  );

  next_role := case
    when not exists (select 1 from public.profiles) then 'admin'
    else 'user'
  end;

  insert into public.profiles (id, email, display_name, role, status, created_at, updated_at)
  values (
    new.id,
    coalesce(lower(new.email), ''),
    next_name,
    next_role,
    'active',
    timezone('utc', now()),
    timezone('utc', now())
  );

  next_signup_flow := coalesce(new.raw_user_meta_data ->> 'signup_flow', '');
  if next_signup_flow = 'self-service-owner' then
    next_organization_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');
    if next_organization_name is null then
      next_organization_name := concat(next_name, ' työtila');
    end if;

    insert into public.organizations (name)
    values (next_organization_name)
    returning * into next_organization;

    update public.profiles
    set organization_id = next_organization.id,
        organization_role = 'owner',
        updated_at = timezone('utc', now())
    where id = new.id;

    perform public.record_signup_legal_acceptances(
      new.id,
      next_organization.id,
      new.raw_user_meta_data -> 'legal_acceptance_bundle'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
