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
    'application/zip',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.tender_document_extractions (
  id uuid primary key default gen_random_uuid(),
  tender_document_id uuid not null references public.tender_documents(id) on delete cascade,
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  extraction_status text not null default 'not_started' check (extraction_status in ('not_started', 'pending', 'extracting', 'extracted', 'failed', 'unsupported')),
  extractor_type text not null default 'none' check (extractor_type in ('none', 'plain_text', 'markdown', 'csv', 'xlsx', 'unsupported')),
  source_mime_type text not null,
  character_count integer check (character_count is null or character_count >= 0),
  chunk_count integer check (chunk_count is null or chunk_count >= 0),
  extracted_text text,
  error_message text,
  extracted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tender_document_extractions_document_unique_idx
on public.tender_document_extractions(tender_document_id);

create index if not exists tender_document_extractions_tender_package_id_idx
on public.tender_document_extractions(tender_package_id, updated_at desc);

create index if not exists tender_document_extractions_organization_id_idx
on public.tender_document_extractions(organization_id, updated_at desc);

create index if not exists tender_document_extractions_status_idx
on public.tender_document_extractions(extraction_status, updated_at desc);

create table if not exists public.tender_document_chunks (
  id uuid primary key default gen_random_uuid(),
  tender_document_id uuid not null references public.tender_documents(id) on delete cascade,
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  extraction_id uuid not null references public.tender_document_extractions(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  text_content text not null,
  character_count integer not null check (character_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tender_document_chunks_extraction_chunk_unique_idx
on public.tender_document_chunks(extraction_id, chunk_index);

create index if not exists tender_document_chunks_tender_document_id_idx
on public.tender_document_chunks(tender_document_id, chunk_index asc);

create index if not exists tender_document_chunks_tender_package_id_idx
on public.tender_document_chunks(tender_package_id, created_at desc);

create index if not exists tender_document_chunks_organization_id_idx
on public.tender_document_chunks(organization_id, created_at desc);

create or replace function public.prepare_tender_document_extraction()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_document public.tender_documents;
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan dokumentin extraction-datan tallentamiseen.';
  end if;

  select *
  into target_document
  from public.tender_documents
  where id = coalesce(new.tender_document_id, old.tender_document_id);

  if target_document.id is null then
    raise exception 'Tarjousdokumenttia ei löytynyt.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = target_document.tender_package_id;

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation dokumenttien extraction-dataa.';
  end if;

  new.extraction_status := coalesce(new.extraction_status, 'not_started');
  new.extractor_type := trim(coalesce(new.extractor_type, 'none'));
  if new.extractor_type = '' then
    raise exception 'Extractor-tyyppi on pakollinen.';
  end if;

  new.source_mime_type := trim(coalesce(new.source_mime_type, target_document.mime_type));
  if new.source_mime_type = '' then
    raise exception 'Lähde-MIME-tyyppi on pakollinen.';
  end if;

  new.error_message := nullif(trim(coalesce(new.error_message, '')), '');
  new.updated_at := timezone('utc', now());

  if new.extracted_text is not null and new.character_count is null then
    new.character_count := char_length(new.extracted_text);
  end if;

  if new.character_count is not null and new.character_count < 0 then
    raise exception 'Merkkimäärä ei voi olla negatiivinen.';
  end if;

  if new.chunk_count is not null and new.chunk_count < 0 then
    raise exception 'Chunkkien määrä ei voi olla negatiivinen.';
  end if;

  if new.extraction_status in ('extracted', 'failed', 'unsupported') then
    new.extracted_at := coalesce(new.extracted_at, timezone('utc', now()));
  else
    new.extracted_at := null;
  end if;

  if tg_op = 'INSERT' then
    new.tender_document_id := target_document.id;
    new.tender_package_id := target_document.tender_package_id;
    new.organization_id := target_document.organization_id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_document_id := old.tender_document_id;
    new.tender_package_id := old.tender_package_id;
    new.organization_id := old.organization_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_tender_document_chunk()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_extraction public.tender_document_extractions;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan dokumenttichunkin tallentamiseen.';
  end if;

  select *
  into target_extraction
  from public.tender_document_extractions
  where id = coalesce(new.extraction_id, old.extraction_id);

  if target_extraction.id is null then
    raise exception 'Dokumentin extraction-riviä ei löytynyt.';
  end if;

  if target_extraction.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation dokumenttichunkeja.';
  end if;

  if trim(coalesce(new.text_content, '')) = '' then
    raise exception 'Chunkin teksti on pakollinen.';
  end if;

  if new.character_count is null then
    new.character_count := char_length(new.text_content);
  end if;

  if new.character_count < 0 then
    raise exception 'Chunkin merkkimäärä ei voi olla negatiivinen.';
  end if;

  if new.chunk_index < 0 then
    raise exception 'Chunkin indeksi ei voi olla negatiivinen.';
  end if;

  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.tender_document_id := target_extraction.tender_document_id;
    new.tender_package_id := target_extraction.tender_package_id;
    new.organization_id := target_extraction.organization_id;
    new.extraction_id := target_extraction.id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_document_id := old.tender_document_id;
    new.tender_package_id := old.tender_package_id;
    new.organization_id := old.organization_id;
    new.extraction_id := old.extraction_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_tender_document_extraction on public.tender_document_extractions;
create trigger prepare_tender_document_extraction
before insert or update on public.tender_document_extractions
for each row
execute function public.prepare_tender_document_extraction();

drop trigger if exists prepare_tender_document_chunk on public.tender_document_chunks;
create trigger prepare_tender_document_chunk
before insert or update on public.tender_document_chunks
for each row
execute function public.prepare_tender_document_chunk();

alter table public.tender_document_extractions enable row level security;
alter table public.tender_document_chunks enable row level security;

drop policy if exists tender_document_extractions_select_org_member_or_admin on public.tender_document_extractions;
create policy tender_document_extractions_select_org_member_or_admin
on public.tender_document_extractions
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_document_extractions_insert_org_member_or_admin on public.tender_document_extractions;
create policy tender_document_extractions_insert_org_member_or_admin
on public.tender_document_extractions
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_document_extractions_update_org_member_or_admin on public.tender_document_extractions;
create policy tender_document_extractions_update_org_member_or_admin
on public.tender_document_extractions
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_document_extractions_delete_org_member_or_admin on public.tender_document_extractions;
create policy tender_document_extractions_delete_org_member_or_admin
on public.tender_document_extractions
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_document_chunks_select_org_member_or_admin on public.tender_document_chunks;
create policy tender_document_chunks_select_org_member_or_admin
on public.tender_document_chunks
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_document_chunks_insert_org_member_or_admin on public.tender_document_chunks;
create policy tender_document_chunks_insert_org_member_or_admin
on public.tender_document_chunks
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_document_chunks_update_org_member_or_admin on public.tender_document_chunks;
create policy tender_document_chunks_update_org_member_or_admin
on public.tender_document_chunks
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_document_chunks_delete_org_member_or_admin on public.tender_document_chunks;
create policy tender_document_chunks_delete_org_member_or_admin
on public.tender_document_chunks
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));