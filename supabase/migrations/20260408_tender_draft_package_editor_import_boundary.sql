alter table public.tender_draft_packages
  add column if not exists imported_quote_id uuid,
  add column if not exists imported_at timestamptz,
  add column if not exists imported_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists import_status text not null default 'not_imported'
    check (import_status in ('not_imported', 'imported', 'failed'));

create index if not exists tender_draft_packages_import_status_idx
on public.tender_draft_packages(organization_id, import_status, updated_at desc);

create index if not exists tender_draft_packages_imported_quote_id_idx
on public.tender_draft_packages(imported_quote_id)
where imported_quote_id is not null;

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

    new.imported_at := coalesce(new.imported_at, timezone('utc', now()));
    new.imported_by_user_id := coalesce(new.imported_by_user_id, auth.uid());
  elsif new.import_status = 'failed' then
    new.imported_quote_id := null;
    new.imported_at := null;
    new.imported_by_user_id := null;
  else
    new.imported_quote_id := null;
    new.imported_at := null;
    new.imported_by_user_id := null;
  end if;

  return new;
end;
$$;