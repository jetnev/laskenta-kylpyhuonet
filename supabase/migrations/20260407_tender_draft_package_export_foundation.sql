create table if not exists public.tender_draft_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'exported', 'archived')),
  generated_from_analysis_job_id uuid references public.tender_analysis_jobs(id) on delete set null,
  generated_by_user_id uuid references public.profiles(id) on delete set null,
  summary text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tender_draft_package_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tender_draft_package_id uuid not null references public.tender_draft_packages(id) on delete cascade,
  item_type text not null check (item_type in ('accepted_requirement', 'selected_reference', 'resolved_missing_item', 'review_note', 'draft_artifact')),
  source_entity_type text not null check (source_entity_type in ('requirement', 'missing_item', 'reference_suggestion', 'review_task', 'draft_artifact')),
  source_entity_id uuid not null,
  title text not null,
  content_md text,
  sort_order integer not null default 0,
  is_included boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_draft_packages_tender_package_id_idx
on public.tender_draft_packages(tender_package_id, updated_at desc);

create index if not exists tender_draft_packages_status_idx
on public.tender_draft_packages(organization_id, status, updated_at desc);

create index if not exists tender_draft_package_items_draft_package_id_idx
on public.tender_draft_package_items(tender_draft_package_id, sort_order asc, updated_at desc);

create index if not exists tender_draft_package_items_source_idx
on public.tender_draft_package_items(organization_id, source_entity_type, source_entity_id);

create or replace function public.prepare_tender_draft_package()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_package public.tender_packages;
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan luonnospaketin tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi käsitellä toisen organisaation luonnospaketteja.';
  end if;

  new.title := trim(coalesce(new.title, ''));
  new.summary := nullif(trim(coalesce(new.summary, '')), '');
  new.status := coalesce(nullif(trim(coalesce(new.status, '')), ''), 'draft');
  new.payload_json := coalesce(new.payload_json, '{}'::jsonb);
  new.updated_at := timezone('utc', now());

  if new.title = '' then
    raise exception 'Luonnospaketin otsikko on pakollinen.';
  end if;

  if tg_op = 'INSERT' then
    new.organization_id := target_package.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
    new.generated_by_user_id := coalesce(new.generated_by_user_id, auth.uid());
  else
    new.organization_id := old.organization_id;
    new.tender_package_id := old.tender_package_id;
    new.created_at := old.created_at;
    new.generated_by_user_id := coalesce(new.generated_by_user_id, old.generated_by_user_id);
  end if;

  if new.generated_by_user_id is not null then
    select *
    into creator_profile
    from public.profiles
    where id = new.generated_by_user_id;

    if creator_profile.id is null or creator_profile.organization_id <> new.organization_id then
      raise exception 'Luonnospaketin muodostajan pitää kuulua samaan organisaatioon.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_draft_package_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_draft_package public.tender_draft_packages;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan luonnospaketin rivin tallentamiseen.';
  end if;

  select *
  into target_draft_package
  from public.tender_draft_packages
  where id = coalesce(new.tender_draft_package_id, old.tender_draft_package_id);

  if target_draft_package.id is null then
    raise exception 'Luonnospakettia ei löytynyt.';
  end if;

  if target_draft_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi käsitellä toisen organisaation luonnospaketin rivejä.';
  end if;

  new.title := trim(coalesce(new.title, ''));
  new.content_md := nullif(trim(coalesce(new.content_md, '')), '');
  new.sort_order := greatest(coalesce(new.sort_order, 0), 0);
  new.updated_at := timezone('utc', now());

  if new.title = '' then
    raise exception 'Luonnospaketin rivin otsikko on pakollinen.';
  end if;

  if tg_op = 'INSERT' then
    new.organization_id := target_draft_package.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.organization_id := old.organization_id;
    new.tender_draft_package_id := old.tender_draft_package_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists tender_draft_packages_prepare on public.tender_draft_packages;
create trigger tender_draft_packages_prepare
before insert or update on public.tender_draft_packages
for each row
execute function public.prepare_tender_draft_package();

drop trigger if exists tender_draft_package_items_prepare on public.tender_draft_package_items;
create trigger tender_draft_package_items_prepare
before insert or update on public.tender_draft_package_items
for each row
execute function public.prepare_tender_draft_package_item();

alter table public.tender_draft_packages enable row level security;
alter table public.tender_draft_package_items enable row level security;

drop policy if exists tender_draft_packages_select_org_member_or_admin on public.tender_draft_packages;
create policy tender_draft_packages_select_org_member_or_admin
on public.tender_draft_packages
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_packages_insert_org_member_or_admin on public.tender_draft_packages;
create policy tender_draft_packages_insert_org_member_or_admin
on public.tender_draft_packages
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_packages_update_org_member_or_admin on public.tender_draft_packages;
create policy tender_draft_packages_update_org_member_or_admin
on public.tender_draft_packages
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_packages_delete_org_member_or_admin on public.tender_draft_packages;
create policy tender_draft_packages_delete_org_member_or_admin
on public.tender_draft_packages
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_items_select_org_member_or_admin on public.tender_draft_package_items;
create policy tender_draft_package_items_select_org_member_or_admin
on public.tender_draft_package_items
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_items_insert_org_member_or_admin on public.tender_draft_package_items;
create policy tender_draft_package_items_insert_org_member_or_admin
on public.tender_draft_package_items
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_items_update_org_member_or_admin on public.tender_draft_package_items;
create policy tender_draft_package_items_update_org_member_or_admin
on public.tender_draft_package_items
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_items_delete_org_member_or_admin on public.tender_draft_package_items;
create policy tender_draft_package_items_delete_org_member_or_admin
on public.tender_draft_package_items
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));