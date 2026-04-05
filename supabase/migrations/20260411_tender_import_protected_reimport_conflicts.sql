alter table public.tender_draft_package_import_blocks
  add column if not exists last_applied_content_hash text,
  add column if not exists last_seen_quote_content_hash text,
  add column if not exists drift_status text
    check (drift_status in (
      'up_to_date',
      'changed_in_draft',
      'changed_in_quote',
      'changed_in_both',
      'removed_from_quote',
      'registry_stale',
      'orphaned_registry'
    )),
  add column if not exists last_drift_checked_at timestamptz;

create index if not exists tender_draft_package_import_blocks_drift_status_idx
on public.tender_draft_package_import_blocks(tender_draft_package_id, drift_status, updated_at desc)
where is_active;

alter table public.tender_draft_package_import_runs
  add column if not exists execution_metadata jsonb not null default '{}'::jsonb;

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
  new.execution_metadata := coalesce(new.execution_metadata, '{}'::jsonb);

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
  new.last_applied_content_hash := nullif(trim(coalesce(new.last_applied_content_hash, '')), '');
  new.last_seen_quote_content_hash := nullif(trim(coalesce(new.last_seen_quote_content_hash, '')), '');
  new.drift_status := nullif(trim(coalesce(new.drift_status, '')), '');
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