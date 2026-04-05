create table if not exists public.tender_draft_package_import_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tender_draft_package_id uuid not null references public.tender_draft_packages(id) on delete cascade,
  target_quote_id uuid not null,
  import_run_id uuid references public.tender_draft_package_import_runs(id) on delete set null,
  block_id text not null check (block_id in (
    'requirements_and_quote_notes',
    'selected_references',
    'resolved_missing_items_and_attachment_notes',
    'notes_for_editor'
  )),
  marker_key text not null,
  target_field text not null check (target_field in ('quote_notes_section', 'quote_internal_notes_section')),
  target_section_key text,
  block_title text not null,
  payload_hash text not null,
  revision integer not null default 0 check (revision >= 0),
  last_synced_at timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tender_draft_package_import_blocks_unique_idx
on public.tender_draft_package_import_blocks(tender_draft_package_id, target_quote_id, block_id);

create index if not exists tender_draft_package_import_blocks_quote_idx
on public.tender_draft_package_import_blocks(target_quote_id, is_active, updated_at desc);

create index if not exists tender_draft_package_import_blocks_draft_package_idx
on public.tender_draft_package_import_blocks(tender_draft_package_id, is_active, updated_at desc);

create or replace function public.prepare_tender_draft_package_import_block()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_draft_package public.tender_draft_packages;
  target_import_run public.tender_draft_package_import_runs;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan import ownership -rivin tallentamiseen.';
  end if;

  select *
  into target_draft_package
  from public.tender_draft_packages
  where id = coalesce(new.tender_draft_package_id, old.tender_draft_package_id);

  if target_draft_package.id is null then
    raise exception 'Luonnospakettia ei löytynyt import ownership -rivin tallentamiseen.';
  end if;

  if target_draft_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi käsitellä toisen organisaation import ownership -rivejä.';
  end if;

  new.organization_id := target_draft_package.organization_id;
  new.marker_key := trim(coalesce(new.marker_key, ''));
  new.target_section_key := nullif(trim(coalesce(new.target_section_key, '')), '');
  new.block_title := trim(coalesce(new.block_title, ''));
  new.payload_hash := trim(coalesce(new.payload_hash, ''));
  new.revision := greatest(coalesce(new.revision, 0), 0);
  new.last_synced_at := coalesce(new.last_synced_at, timezone('utc', now()));
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.created_at := old.created_at;
  end if;

  if new.marker_key = '' then
    raise exception 'Import ownership -rivillä pitää olla marker_key.';
  end if;

  if new.block_title = '' then
    raise exception 'Import ownership -rivillä pitää olla block_title.';
  end if;

  if new.payload_hash = '' then
    raise exception 'Import ownership -rivillä pitää olla payload_hash.';
  end if;

  if new.import_run_id is not null then
    select *
    into target_import_run
    from public.tender_draft_package_import_runs
    where id = new.import_run_id;

    if target_import_run.id is null then
      raise exception 'Import ownership -rivin import_run_id ei viittaa olemassa olevaan import-ajoon.';
    end if;

    if target_import_run.tender_draft_package_id <> new.tender_draft_package_id then
      raise exception 'Import ownership -rivin import_run_id pitää kuulua samaan luonnospakettiin.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tender_draft_package_import_blocks_prepare on public.tender_draft_package_import_blocks;
create trigger tender_draft_package_import_blocks_prepare
before insert or update on public.tender_draft_package_import_blocks
for each row
execute function public.prepare_tender_draft_package_import_block();

alter table public.tender_draft_package_import_blocks enable row level security;

drop policy if exists tender_draft_package_import_blocks_select_org_member_or_admin on public.tender_draft_package_import_blocks;
create policy tender_draft_package_import_blocks_select_org_member_or_admin
on public.tender_draft_package_import_blocks
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_import_blocks_insert_org_member_or_admin on public.tender_draft_package_import_blocks;
create policy tender_draft_package_import_blocks_insert_org_member_or_admin
on public.tender_draft_package_import_blocks
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_import_blocks_update_org_member_or_admin on public.tender_draft_package_import_blocks;
create policy tender_draft_package_import_blocks_update_org_member_or_admin
on public.tender_draft_package_import_blocks
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_import_blocks_delete_org_member_or_admin on public.tender_draft_package_import_blocks;
create policy tender_draft_package_import_blocks_delete_org_member_or_admin
on public.tender_draft_package_import_blocks
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));