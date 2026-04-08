create table if not exists public.tender_reference_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  client_name text,
  project_type text,
  description text,
  location text,
  completed_year integer check (completed_year is null or completed_year between 1900 and 2100),
  contract_value numeric(14,2) check (contract_value is null or contract_value >= 0),
  tags text[],
  source_kind text not null default 'manual' check (source_kind in ('manual', 'imported', 'other')),
  source_reference text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_reference_profiles_organization_id_idx
on public.tender_reference_profiles(organization_id, updated_at desc);

create index if not exists tender_reference_profiles_project_type_idx
on public.tender_reference_profiles(organization_id, project_type, completed_year desc);

create index if not exists tender_reference_profiles_tags_idx
on public.tender_reference_profiles using gin(tags);

alter table public.tender_reference_suggestions
  add column if not exists related_requirement_id uuid references public.tender_requirements(id) on delete cascade;

drop index if exists tender_reference_suggestions_related_requirement_id_idx;
create index if not exists tender_reference_suggestions_related_requirement_id_idx
on public.tender_reference_suggestions(tender_package_id, related_requirement_id, updated_at desc);

drop index if exists tender_reference_suggestions_profile_match_idx;
create index if not exists tender_reference_suggestions_profile_match_idx
on public.tender_reference_suggestions(tender_package_id, source_type, source_reference, updated_at desc);

alter table public.tender_reference_suggestions
  drop constraint if exists tender_reference_suggestions_source_type_check;

alter table public.tender_reference_suggestions
  add constraint tender_reference_suggestions_source_type_check
  check (source_type in ('quote', 'project', 'document-template', 'manual', 'organization_reference_profile'));

create or replace function public.prepare_tender_reference_profile()
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan referenssiprofiilin tallentamiseen.';
  end if;

  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Referenssiprofiilin otsikko on pakollinen.';
  end if;

  new.client_name := nullif(trim(coalesce(new.client_name, '')), '');
  new.project_type := nullif(trim(coalesce(new.project_type, '')), '');
  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.location := nullif(trim(coalesce(new.location, '')), '');
  new.source_kind := coalesce(nullif(trim(coalesce(new.source_kind, '')), ''), 'manual');
  new.source_reference := nullif(trim(coalesce(new.source_reference, '')), '');
  new.tags := (
    select case
      when count(*) = 0 then null
      else array_agg(tag_value order by tag_value)
    end
    from (
      select distinct trim(tag_item) as tag_value
      from unnest(coalesce(new.tags, array[]::text[])) as tag_item
      where trim(tag_item) <> ''
    ) as normalized_tags
  );
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := coalesce(new.organization_id, current_profile.organization_id);

    if new.organization_id <> current_profile.organization_id and not public.is_admin() then
      raise exception 'Et voi lisätä toisen organisaation referenssiprofiilia.';
    end if;

    new.created_by_user_id := coalesce(new.created_by_user_id, auth.uid());
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    if old.organization_id <> current_profile.organization_id and not public.is_admin() then
      raise exception 'Et voi muokata toisen organisaation referenssiprofiilia.';
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
      raise exception 'Referenssiprofiilin luojan pitää kuulua samaan organisaatioon.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_reference_suggestion()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_package public.tender_packages;
  related_requirement public.tender_requirements;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan referenssiehdotuksen tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation referenssiehdotuksia.';
  end if;

  if new.related_requirement_id is not null then
    select *
    into related_requirement
    from public.tender_requirements
    where id = new.related_requirement_id;

    if related_requirement.id is null or related_requirement.tender_package_id <> target_package.id then
      raise exception 'Referenssiehdotuksen liittyvän vaatimuksen pitää kuulua samaan tarjouspyyntöpakettiin.';
    end if;
  end if;

  new.source_type := coalesce(nullif(trim(coalesce(new.source_type, '')), ''), 'manual');
  new.source_reference := nullif(trim(coalesce(new.source_reference, '')), '');
  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Referenssiehdotuksen otsikko on pakollinen.';
  end if;

  new.rationale := nullif(trim(coalesce(new.rationale, '')), '');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := target_package.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_package_id := old.tender_package_id;
    new.organization_id := old.organization_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists tender_reference_profiles_prepare on public.tender_reference_profiles;
create trigger tender_reference_profiles_prepare
before insert or update on public.tender_reference_profiles
for each row
execute function public.prepare_tender_reference_profile();

drop trigger if exists tender_reference_suggestions_prepare on public.tender_reference_suggestions;
create trigger tender_reference_suggestions_prepare
before insert or update on public.tender_reference_suggestions
for each row
execute function public.prepare_tender_reference_suggestion();

alter table public.tender_reference_profiles enable row level security;

drop policy if exists tender_reference_profiles_select_org_member_or_admin on public.tender_reference_profiles;
create policy tender_reference_profiles_select_org_member_or_admin
on public.tender_reference_profiles
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_reference_profiles_insert_org_member_or_admin on public.tender_reference_profiles;
create policy tender_reference_profiles_insert_org_member_or_admin
on public.tender_reference_profiles
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_reference_profiles_update_org_member_or_admin on public.tender_reference_profiles;
create policy tender_reference_profiles_update_org_member_or_admin
on public.tender_reference_profiles
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_reference_profiles_delete_org_member_or_admin on public.tender_reference_profiles;
create policy tender_reference_profiles_delete_org_member_or_admin
on public.tender_reference_profiles
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));