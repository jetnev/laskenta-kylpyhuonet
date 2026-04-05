alter table public.tender_draft_package_import_runs
  add column if not exists run_type text not null default 'import';

update public.tender_draft_package_import_runs
set run_type = 'import'
where run_type is null
   or trim(run_type) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tender_draft_package_import_runs_run_type_check'
      and conrelid = 'public.tender_draft_package_import_runs'::regclass
  ) then
    alter table public.tender_draft_package_import_runs
      add constraint tender_draft_package_import_runs_run_type_check
      check (run_type in ('import', 'reimport', 'diagnostics_refresh', 'registry_repair'));
  end if;
end;
$$;

create index if not exists tender_draft_package_import_runs_run_type_idx
on public.tender_draft_package_import_runs(tender_draft_package_id, run_type, created_at desc);

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
    raise exception 'Aktiivinen organisaatiojasen vaaditaan import-ajon tallentamiseen.';
  end if;

  select *
  into target_draft_package
  from public.tender_draft_packages
  where id = coalesce(new.tender_draft_package_id, old.tender_draft_package_id);

  if target_draft_package.id is null then
    raise exception 'Luonnospakettia ei loytynyt import-ajon tallentamiseen.';
  end if;

  if target_draft_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi kasitella toisen organisaation import-ajohistoriaa.';
  end if;

  new.organization_id := target_draft_package.organization_id;
  new.run_type := coalesce(nullif(trim(coalesce(new.run_type, '')), ''), 'import');
  new.payload_hash := trim(coalesce(new.payload_hash, ''));
  new.summary := nullif(trim(coalesce(new.summary, '')), '');
  new.payload_snapshot := coalesce(new.payload_snapshot, '{}'::jsonb);
  new.execution_metadata := coalesce(new.execution_metadata, '{}'::jsonb);

  if new.payload_hash = '' then
    raise exception 'Import-ajolla pitaa olla payload_hash.';
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
      raise exception 'Import-ajon tallentajan pitaa kuulua samaan organisaatioon.';
    end if;
  end if;

  return new;
end;
$$;