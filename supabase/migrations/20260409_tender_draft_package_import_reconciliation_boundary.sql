alter table public.tender_draft_packages
  add column if not exists import_revision integer not null default 0
    check (import_revision >= 0),
  add column if not exists last_import_payload_hash text,
  add column if not exists reimport_status text not null default 'never_imported'
    check (reimport_status in ('up_to_date', 'stale', 'never_imported', 'import_failed'));

create index if not exists tender_draft_packages_reimport_status_idx
on public.tender_draft_packages(organization_id, reimport_status, updated_at desc);

create index if not exists tender_draft_packages_last_import_payload_hash_idx
on public.tender_draft_packages(last_import_payload_hash)
where last_import_payload_hash is not null;

create table if not exists public.tender_draft_package_import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tender_draft_package_id uuid not null references public.tender_draft_packages(id) on delete cascade,
  target_quote_id uuid,
  import_mode text not null check (import_mode in ('create_new_quote', 'update_existing_quote')),
  payload_hash text not null,
  payload_snapshot jsonb not null default '{}'::jsonb,
  result_status text not null check (result_status in ('success', 'failed')),
  summary text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_draft_package_import_runs_draft_package_idx
on public.tender_draft_package_import_runs(tender_draft_package_id, created_at desc);

create index if not exists tender_draft_package_import_runs_quote_idx
on public.tender_draft_package_import_runs(target_quote_id, created_at desc)
where target_quote_id is not null;

create or replace function public.prepare_tender_draft_package()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_package public.tender_packages;
  creator_profile public.profiles;
  importer_profile public.profiles;
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
  new.import_status := coalesce(nullif(trim(coalesce(new.import_status, '')), ''), 'not_imported');
  new.reimport_status := coalesce(
    nullif(trim(coalesce(new.reimport_status, '')), ''),
    case
      when new.import_status = 'imported' then 'up_to_date'
      when new.import_status = 'failed' then 'import_failed'
      else 'never_imported'
    end
  );
  new.import_revision := greatest(coalesce(new.import_revision, 0), 0);
  new.last_import_payload_hash := nullif(trim(coalesce(new.last_import_payload_hash, '')), '');
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

  if new.imported_by_user_id is not null then
    select *
    into importer_profile
    from public.profiles
    where id = new.imported_by_user_id;

    if importer_profile.id is null or importer_profile.organization_id <> new.organization_id then
      raise exception 'Luonnospaketin importoijan pitää kuulua samaan organisaatioon.';
    end if;
  end if;

  if new.import_status = 'imported' then
    if new.imported_quote_id is null then
      raise exception 'Importoidulla luonnospaketilla pitää olla imported_quote_id.';
    end if;

    new.imported_at := coalesce(new.imported_at, old.imported_at, timezone('utc', now()));
    new.imported_by_user_id := coalesce(new.imported_by_user_id, old.imported_by_user_id, auth.uid());

    if new.reimport_status = 'never_imported' then
      new.reimport_status := 'up_to_date';
    end if;
  elsif new.import_status = 'failed' then
    if coalesce(new.imported_quote_id, old.imported_quote_id) is null then
      new.imported_quote_id := null;
      new.imported_at := null;
      new.imported_by_user_id := null;
      new.import_revision := greatest(coalesce(old.import_revision, 0), coalesce(new.import_revision, 0));
    else
      new.imported_quote_id := coalesce(new.imported_quote_id, old.imported_quote_id);
      new.imported_at := coalesce(new.imported_at, old.imported_at);
      new.imported_by_user_id := coalesce(new.imported_by_user_id, old.imported_by_user_id);
      new.import_revision := greatest(coalesce(old.import_revision, 0), coalesce(new.import_revision, 0));
    end if;

    new.reimport_status := 'import_failed';
  else
    new.imported_quote_id := null;
    new.imported_at := null;
    new.imported_by_user_id := null;
    new.import_revision := 0;
    new.last_import_payload_hash := null;
    new.reimport_status := 'never_imported';
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_draft_package_import_run()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_draft_package public.tender_draft_packages;
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan import-ajon tallentamiseen.';
  end if;

  select *
  into target_draft_package
  from public.tender_draft_packages
  where id = coalesce(new.tender_draft_package_id, old.tender_draft_package_id);

  if target_draft_package.id is null then
    raise exception 'Luonnospakettia ei löytynyt import-ajon tallentamiseen.';
  end if;

  if target_draft_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi käsitellä toisen organisaation import-ajohistoriaa.';
  end if;

  new.organization_id := target_draft_package.organization_id;
  new.payload_hash := trim(coalesce(new.payload_hash, ''));
  new.summary := nullif(trim(coalesce(new.summary, '')), '');
  new.payload_snapshot := coalesce(new.payload_snapshot, '{}'::jsonb);

  if new.payload_hash = '' then
    raise exception 'Import-ajolla pitää olla payload_hash.';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
    new.created_by_user_id := coalesce(new.created_by_user_id, auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by_user_id := coalesce(new.created_by_user_id, old.created_by_user_id);
  end if;

  if new.created_by_user_id is not null then
    select *
    into creator_profile
    from public.profiles
    where id = new.created_by_user_id;

    if creator_profile.id is null or creator_profile.organization_id <> new.organization_id then
      raise exception 'Import-ajon tallentajan pitää kuulua samaan organisaatioon.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tender_draft_package_import_runs_prepare on public.tender_draft_package_import_runs;
create trigger tender_draft_package_import_runs_prepare
before insert or update on public.tender_draft_package_import_runs
for each row
execute function public.prepare_tender_draft_package_import_run();

alter table public.tender_draft_package_import_runs enable row level security;

drop policy if exists tender_draft_package_import_runs_select_org_member_or_admin on public.tender_draft_package_import_runs;
create policy tender_draft_package_import_runs_select_org_member_or_admin
on public.tender_draft_package_import_runs
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_import_runs_insert_org_member_or_admin on public.tender_draft_package_import_runs;
create policy tender_draft_package_import_runs_insert_org_member_or_admin
on public.tender_draft_package_import_runs
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_package_import_runs_update_creator_owner_or_admin on public.tender_draft_package_import_runs;
create policy tender_draft_package_import_runs_update_creator_owner_or_admin
on public.tender_draft_package_import_runs
for update
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
  or created_by_user_id = (select auth.uid())
)
with check (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
  or created_by_user_id = (select auth.uid())
);

drop policy if exists tender_draft_package_import_runs_delete_creator_owner_or_admin on public.tender_draft_package_import_runs;
create policy tender_draft_package_import_runs_delete_creator_owner_or_admin
on public.tender_draft_package_import_runs
for delete
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
  or created_by_user_id = (select auth.uid())
);
