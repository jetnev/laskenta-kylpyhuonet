create table if not exists public.tender_provider_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null,
  business_id text,
  website_url text,
  headquarters text,
  summary text,
  service_area text,
  max_travel_km integer check (max_travel_km is null or max_travel_km >= 0),
  delivery_scope text not null default 'regional' check (delivery_scope in ('local', 'regional', 'national', 'international')),
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tender_provider_profiles_organization_id_uidx
on public.tender_provider_profiles(organization_id);

create index if not exists tender_provider_profiles_updated_at_idx
on public.tender_provider_profiles(updated_at desc);

create table if not exists public.tender_provider_contacts (
  id uuid primary key default gen_random_uuid(),
  tender_provider_profile_id uuid not null references public.tender_provider_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  role_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_provider_contacts_profile_id_idx
on public.tender_provider_contacts(tender_provider_profile_id, updated_at desc);

create table if not exists public.tender_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  tender_provider_profile_id uuid not null references public.tender_provider_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  issuer text,
  credential_type text not null default 'certificate' check (credential_type in ('certificate', 'qualification', 'insurance', 'license', 'other')),
  valid_until timestamptz,
  document_reference text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_provider_credentials_profile_id_idx
on public.tender_provider_credentials(tender_provider_profile_id, updated_at desc);

create table if not exists public.tender_provider_constraints (
  id uuid primary key default gen_random_uuid(),
  tender_provider_profile_id uuid not null references public.tender_provider_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  constraint_type text not null default 'other' check (constraint_type in ('eligibility', 'capacity', 'commercial', 'resourcing', 'compliance', 'other')),
  severity text not null default 'soft' check (severity in ('hard', 'soft', 'info')),
  rule_text text not null,
  mitigation_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_provider_constraints_profile_id_idx
on public.tender_provider_constraints(tender_provider_profile_id, updated_at desc);

create table if not exists public.tender_provider_documents (
  id uuid primary key default gen_random_uuid(),
  tender_provider_profile_id uuid not null references public.tender_provider_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  document_type text not null default 'other' check (document_type in ('case-study', 'certificate', 'insurance', 'cv', 'policy', 'other')),
  source_reference text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_provider_documents_profile_id_idx
on public.tender_provider_documents(tender_provider_profile_id, updated_at desc);

create table if not exists public.tender_provider_response_templates (
  id uuid primary key default gen_random_uuid(),
  tender_provider_profile_id uuid not null references public.tender_provider_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  template_type text not null default 'other' check (template_type in ('company-overview', 'technical-approach', 'delivery-plan', 'pricing-note', 'quality', 'other')),
  content_md text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_provider_response_templates_profile_id_idx
on public.tender_provider_response_templates(tender_provider_profile_id, updated_at desc);

create or replace function public.prepare_tender_provider_profile()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  creator_profile public.profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjoajaprofiilin tallentamiseen.';
  end if;

  new.company_name := trim(coalesce(new.company_name, ''));

  if new.company_name = '' then
    raise exception 'Tarjoajaprofiilin yritysnimi on pakollinen.';
  end if;

  new.business_id := nullif(trim(coalesce(new.business_id, '')), '');
  new.website_url := nullif(trim(coalesce(new.website_url, '')), '');
  new.headquarters := nullif(trim(coalesce(new.headquarters, '')), '');
  new.summary := nullif(trim(coalesce(new.summary, '')), '');
  new.service_area := nullif(trim(coalesce(new.service_area, '')), '');
  new.delivery_scope := coalesce(nullif(trim(coalesce(new.delivery_scope, '')), ''), 'regional');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := coalesce(new.organization_id, current_profile.organization_id);

    if new.organization_id <> current_profile.organization_id and not public.is_admin() then
      raise exception 'Et voi lisätä toisen organisaation tarjoajaprofiilia.';
    end if;

    new.created_by_user_id := coalesce(new.created_by_user_id, auth.uid());
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    if old.organization_id <> current_profile.organization_id and not public.is_admin() then
      raise exception 'Et voi muokata toisen organisaation tarjoajaprofiilia.';
    end if;

    new.organization_id := old.organization_id;
    new.created_by_user_id := old.created_by_user_id;
    new.created_at := old.created_at;
  end if;

  if new.created_by_user_id is not null then
    select *
    into creator_profile
    from public.profiles
    where id = new.created_by_user_id;

    if creator_profile.id is null or creator_profile.organization_id <> new.organization_id then
      raise exception 'Tarjoajaprofiilin luojan pitää kuulua samaan organisaatioon.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_provider_contact()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  provider_profile public.tender_provider_profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan yhteyshenkilön tallentamiseen.';
  end if;

  select *
  into provider_profile
  from public.tender_provider_profiles
  where id = coalesce(new.tender_provider_profile_id, old.tender_provider_profile_id);

  if provider_profile.id is null then
    raise exception 'Tarjoajaprofiilia ei löytynyt.';
  end if;

  if provider_profile.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjoajaprofiilin yhteyshenkilöitä.';
  end if;

  new.full_name := trim(coalesce(new.full_name, ''));

  if new.full_name = '' then
    raise exception 'Yhteyshenkilön nimi on pakollinen.';
  end if;

  new.role_title := nullif(trim(coalesce(new.role_title, '')), '');
  new.email := nullif(trim(coalesce(new.email, '')), '');
  new.phone := nullif(trim(coalesce(new.phone, '')), '');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := provider_profile.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_provider_profile_id := old.tender_provider_profile_id;
    new.organization_id := old.organization_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_provider_credential()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  provider_profile public.tender_provider_profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan pätevyyden tallentamiseen.';
  end if;

  select *
  into provider_profile
  from public.tender_provider_profiles
  where id = coalesce(new.tender_provider_profile_id, old.tender_provider_profile_id);

  if provider_profile.id is null then
    raise exception 'Tarjoajaprofiilia ei löytynyt.';
  end if;

  if provider_profile.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjoajaprofiilin pätevyyksiä.';
  end if;

  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Pätevyyden otsikko on pakollinen.';
  end if;

  new.issuer := nullif(trim(coalesce(new.issuer, '')), '');
  new.document_reference := nullif(trim(coalesce(new.document_reference, '')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  new.credential_type := coalesce(nullif(trim(coalesce(new.credential_type, '')), ''), 'certificate');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := provider_profile.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_provider_profile_id := old.tender_provider_profile_id;
    new.organization_id := old.organization_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_provider_constraint()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  provider_profile public.tender_provider_profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan rajoitteen tallentamiseen.';
  end if;

  select *
  into provider_profile
  from public.tender_provider_profiles
  where id = coalesce(new.tender_provider_profile_id, old.tender_provider_profile_id);

  if provider_profile.id is null then
    raise exception 'Tarjoajaprofiilia ei löytynyt.';
  end if;

  if provider_profile.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjoajaprofiilin rajoitteita.';
  end if;

  new.title := trim(coalesce(new.title, ''));
  new.rule_text := trim(coalesce(new.rule_text, ''));

  if new.title = '' then
    raise exception 'Rajoitteen otsikko on pakollinen.';
  end if;

  if new.rule_text = '' then
    raise exception 'Rajoitteen kuvaus on pakollinen.';
  end if;

  new.constraint_type := coalesce(nullif(trim(coalesce(new.constraint_type, '')), ''), 'other');
  new.severity := coalesce(nullif(trim(coalesce(new.severity, '')), ''), 'soft');
  new.mitigation_note := nullif(trim(coalesce(new.mitigation_note, '')), '');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := provider_profile.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_provider_profile_id := old.tender_provider_profile_id;
    new.organization_id := old.organization_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_provider_document()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  provider_profile public.tender_provider_profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan dokumenttiviitteen tallentamiseen.';
  end if;

  select *
  into provider_profile
  from public.tender_provider_profiles
  where id = coalesce(new.tender_provider_profile_id, old.tender_provider_profile_id);

  if provider_profile.id is null then
    raise exception 'Tarjoajaprofiilia ei löytynyt.';
  end if;

  if provider_profile.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjoajaprofiilin dokumentteja.';
  end if;

  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Dokumentin nimi on pakollinen.';
  end if;

  new.document_type := coalesce(nullif(trim(coalesce(new.document_type, '')), ''), 'other');
  new.source_reference := nullif(trim(coalesce(new.source_reference, '')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := provider_profile.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_provider_profile_id := old.tender_provider_profile_id;
    new.organization_id := old.organization_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_provider_response_template()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  provider_profile public.tender_provider_profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan vastauspohjan tallentamiseen.';
  end if;

  select *
  into provider_profile
  from public.tender_provider_profiles
  where id = coalesce(new.tender_provider_profile_id, old.tender_provider_profile_id);

  if provider_profile.id is null then
    raise exception 'Tarjoajaprofiilia ei löytynyt.';
  end if;

  if provider_profile.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjoajaprofiilin vastauspohjia.';
  end if;

  new.title := trim(coalesce(new.title, ''));
  new.content_md := trim(coalesce(new.content_md, ''));

  if new.title = '' then
    raise exception 'Vastauspohjan otsikko on pakollinen.';
  end if;

  if new.content_md = '' then
    raise exception 'Vastauspohjan sisältö on pakollinen.';
  end if;

  new.template_type := coalesce(nullif(trim(coalesce(new.template_type, '')), ''), 'other');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := provider_profile.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_provider_profile_id := old.tender_provider_profile_id;
    new.organization_id := old.organization_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists tender_provider_profiles_prepare on public.tender_provider_profiles;
create trigger tender_provider_profiles_prepare
before insert or update on public.tender_provider_profiles
for each row
execute function public.prepare_tender_provider_profile();

drop trigger if exists tender_provider_contacts_prepare on public.tender_provider_contacts;
create trigger tender_provider_contacts_prepare
before insert or update on public.tender_provider_contacts
for each row
execute function public.prepare_tender_provider_contact();

drop trigger if exists tender_provider_credentials_prepare on public.tender_provider_credentials;
create trigger tender_provider_credentials_prepare
before insert or update on public.tender_provider_credentials
for each row
execute function public.prepare_tender_provider_credential();

drop trigger if exists tender_provider_constraints_prepare on public.tender_provider_constraints;
create trigger tender_provider_constraints_prepare
before insert or update on public.tender_provider_constraints
for each row
execute function public.prepare_tender_provider_constraint();

drop trigger if exists tender_provider_documents_prepare on public.tender_provider_documents;
create trigger tender_provider_documents_prepare
before insert or update on public.tender_provider_documents
for each row
execute function public.prepare_tender_provider_document();

drop trigger if exists tender_provider_response_templates_prepare on public.tender_provider_response_templates;
create trigger tender_provider_response_templates_prepare
before insert or update on public.tender_provider_response_templates
for each row
execute function public.prepare_tender_provider_response_template();

alter table public.tender_provider_profiles enable row level security;
alter table public.tender_provider_contacts enable row level security;
alter table public.tender_provider_credentials enable row level security;
alter table public.tender_provider_constraints enable row level security;
alter table public.tender_provider_documents enable row level security;
alter table public.tender_provider_response_templates enable row level security;

drop policy if exists tender_provider_profiles_select_org_member_or_admin on public.tender_provider_profiles;
create policy tender_provider_profiles_select_org_member_or_admin
on public.tender_provider_profiles
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_profiles_insert_org_member_or_admin on public.tender_provider_profiles;
create policy tender_provider_profiles_insert_org_member_or_admin
on public.tender_provider_profiles
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_profiles_update_org_member_or_admin on public.tender_provider_profiles;
create policy tender_provider_profiles_update_org_member_or_admin
on public.tender_provider_profiles
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_profiles_delete_org_member_or_admin on public.tender_provider_profiles;
create policy tender_provider_profiles_delete_org_member_or_admin
on public.tender_provider_profiles
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_contacts_select_org_member_or_admin on public.tender_provider_contacts;
create policy tender_provider_contacts_select_org_member_or_admin
on public.tender_provider_contacts
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_contacts_insert_org_member_or_admin on public.tender_provider_contacts;
create policy tender_provider_contacts_insert_org_member_or_admin
on public.tender_provider_contacts
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_contacts_update_org_member_or_admin on public.tender_provider_contacts;
create policy tender_provider_contacts_update_org_member_or_admin
on public.tender_provider_contacts
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_contacts_delete_org_member_or_admin on public.tender_provider_contacts;
create policy tender_provider_contacts_delete_org_member_or_admin
on public.tender_provider_contacts
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_credentials_select_org_member_or_admin on public.tender_provider_credentials;
create policy tender_provider_credentials_select_org_member_or_admin
on public.tender_provider_credentials
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_credentials_insert_org_member_or_admin on public.tender_provider_credentials;
create policy tender_provider_credentials_insert_org_member_or_admin
on public.tender_provider_credentials
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_credentials_update_org_member_or_admin on public.tender_provider_credentials;
create policy tender_provider_credentials_update_org_member_or_admin
on public.tender_provider_credentials
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_credentials_delete_org_member_or_admin on public.tender_provider_credentials;
create policy tender_provider_credentials_delete_org_member_or_admin
on public.tender_provider_credentials
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_constraints_select_org_member_or_admin on public.tender_provider_constraints;
create policy tender_provider_constraints_select_org_member_or_admin
on public.tender_provider_constraints
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_constraints_insert_org_member_or_admin on public.tender_provider_constraints;
create policy tender_provider_constraints_insert_org_member_or_admin
on public.tender_provider_constraints
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_constraints_update_org_member_or_admin on public.tender_provider_constraints;
create policy tender_provider_constraints_update_org_member_or_admin
on public.tender_provider_constraints
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_constraints_delete_org_member_or_admin on public.tender_provider_constraints;
create policy tender_provider_constraints_delete_org_member_or_admin
on public.tender_provider_constraints
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_documents_select_org_member_or_admin on public.tender_provider_documents;
create policy tender_provider_documents_select_org_member_or_admin
on public.tender_provider_documents
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_documents_insert_org_member_or_admin on public.tender_provider_documents;
create policy tender_provider_documents_insert_org_member_or_admin
on public.tender_provider_documents
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_documents_update_org_member_or_admin on public.tender_provider_documents;
create policy tender_provider_documents_update_org_member_or_admin
on public.tender_provider_documents
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_documents_delete_org_member_or_admin on public.tender_provider_documents;
create policy tender_provider_documents_delete_org_member_or_admin
on public.tender_provider_documents
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_response_templates_select_org_member_or_admin on public.tender_provider_response_templates;
create policy tender_provider_response_templates_select_org_member_or_admin
on public.tender_provider_response_templates
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_response_templates_insert_org_member_or_admin on public.tender_provider_response_templates;
create policy tender_provider_response_templates_insert_org_member_or_admin
on public.tender_provider_response_templates
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_response_templates_update_org_member_or_admin on public.tender_provider_response_templates;
create policy tender_provider_response_templates_update_org_member_or_admin
on public.tender_provider_response_templates
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_provider_response_templates_delete_org_member_or_admin on public.tender_provider_response_templates;
create policy tender_provider_response_templates_delete_org_member_or_admin
on public.tender_provider_response_templates
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));