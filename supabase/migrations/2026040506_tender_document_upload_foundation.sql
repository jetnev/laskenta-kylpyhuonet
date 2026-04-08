insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tender-intelligence',
  'tender-intelligence',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.tender_documents
  add column if not exists storage_bucket text;

alter table public.tender_documents
  add column if not exists upload_error text;

update public.tender_documents
set storage_bucket = 'tender-intelligence'
where storage_bucket is null;

alter table public.tender_documents
  alter column storage_bucket set default 'tender-intelligence';

alter table public.tender_documents
  alter column storage_bucket set not null;

create unique index if not exists tender_documents_storage_object_unique_idx
on public.tender_documents(storage_bucket, storage_path)
where storage_path is not null;

create or replace function public.can_access_tender_storage_object(target_bucket_id text, target_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tender_documents document_row
    join public.tender_packages package_row on package_row.id = document_row.tender_package_id
    where document_row.storage_bucket = target_bucket_id
      and document_row.storage_path = target_object_name
      and document_row.storage_path is not null
      and (
        (select public.is_admin())
        or (
          package_row.organization_id is not null
          and (select public.is_organization_member(package_row.organization_id))
        )
      )
  );
$$;

create or replace function public.can_delete_tender_storage_object(target_bucket_id text, target_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tender_documents document_row
    join public.tender_packages package_row on package_row.id = document_row.tender_package_id
    where document_row.storage_bucket = target_bucket_id
      and document_row.storage_path = target_object_name
      and document_row.storage_path is not null
      and (
        (select public.is_admin())
        or (
          package_row.organization_id is not null
          and (select public.is_organization_owner(package_row.organization_id))
        )
        or document_row.created_by_user_id = (select auth.uid())
      )
  );
$$;

create or replace function public.prepare_tender_document()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_package public.tender_packages;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjousdokumentin tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjouspyyntödokumentteja.';
  end if;

  new.file_name := trim(coalesce(new.file_name, ''));
  if new.file_name = '' then
    raise exception 'Dokumentin tiedostonimi on pakollinen.';
  end if;

  new.mime_type := trim(coalesce(new.mime_type, ''));
  if new.mime_type = '' then
    raise exception 'Dokumentin MIME-tyyppi on pakollinen.';
  end if;

  new.storage_bucket := trim(coalesce(new.storage_bucket, 'tender-intelligence'));
  if new.storage_bucket = '' then
    raise exception 'Dokumentin storage-bucket on pakollinen.';
  end if;

  new.storage_path := nullif(trim(coalesce(new.storage_path, '')), '');
  new.checksum := nullif(trim(coalesce(new.checksum, '')), '');
  new.upload_error := nullif(trim(coalesce(new.upload_error, '')), '');
  new.upload_status := coalesce(new.upload_status, 'pending');
  new.parse_status := coalesce(new.parse_status, 'not-started');
  new.updated_at := timezone('utc', now());

  if new.storage_path is not null then
    if left(new.storage_path, 1) = '/' then
      raise exception 'Storage-polku ei saa alkaa kauttaviivalla.';
    end if;

    if position('..' in new.storage_path) > 0 then
      raise exception 'Storage-polku ei saa sisältää parent-segmenttejä.';
    end if;

    if split_part(new.storage_path, '/', 1) <> target_package.organization_id::text then
      raise exception 'Storage-polun on aloitettava organisaation tunnisteella.';
    end if;

    if split_part(new.storage_path, '/', 2) <> target_package.id::text then
      raise exception 'Storage-polun on sisällettävä tarjouspyyntöpaketin tunniste.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.organization_id := target_package.organization_id;
    new.created_by_user_id := current_profile.id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_package_id := old.tender_package_id;
    new.organization_id := old.organization_id;
    new.created_by_user_id := old.created_by_user_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop policy if exists tender_intelligence_bucket_select on storage.buckets;
create policy tender_intelligence_bucket_select
on storage.buckets
for select
to authenticated
using (id = 'tender-intelligence');

drop policy if exists tender_intelligence_storage_select on storage.objects;
create policy tender_intelligence_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tender-intelligence'
  and public.can_access_tender_storage_object(bucket_id, name)
);

drop policy if exists tender_intelligence_storage_insert on storage.objects;
create policy tender_intelligence_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tender-intelligence'
  and public.can_access_tender_storage_object(bucket_id, name)
);

drop policy if exists tender_intelligence_storage_update on storage.objects;
create policy tender_intelligence_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tender-intelligence'
  and public.can_access_tender_storage_object(bucket_id, name)
)
with check (
  bucket_id = 'tender-intelligence'
  and public.can_access_tender_storage_object(bucket_id, name)
);

drop policy if exists tender_intelligence_storage_delete on storage.objects;
create policy tender_intelligence_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tender-intelligence'
  and public.can_delete_tender_storage_object(bucket_id, name)
);