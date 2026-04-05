create table if not exists public.tender_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'ready-for-analysis', 'analysis-pending', 'review-needed', 'completed')),
  linked_customer_id text,
  linked_project_id text,
  linked_quote_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_packages_organization_id_idx
on public.tender_packages(organization_id, updated_at desc);

create index if not exists tender_packages_created_by_user_id_idx
on public.tender_packages(created_by_user_id, updated_at desc);

create index if not exists tender_packages_status_idx
on public.tender_packages(status, updated_at desc);

create table if not exists public.tender_documents (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  file_name text not null,
  mime_type text not null,
  storage_path text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  checksum text,
  upload_status text not null default 'placeholder' check (upload_status in ('placeholder', 'pending', 'uploaded', 'failed')),
  parse_status text not null default 'not-started' check (parse_status in ('not-started', 'queued', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_documents_tender_package_id_idx
on public.tender_documents(tender_package_id, created_at desc);

create index if not exists tender_documents_organization_id_idx
on public.tender_documents(organization_id, created_at desc);

create table if not exists public.tender_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_type text not null check (job_type in ('document-analysis', 'go-no-go', 'reference-scan', 'draft-preparation', 'placeholder')),
  status text not null default 'not-started' check (status in ('not-started', 'queued', 'processing', 'completed', 'failed')),
  provider text,
  model text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_analysis_jobs_tender_package_id_idx
on public.tender_analysis_jobs(tender_package_id, created_at desc);

create index if not exists tender_analysis_jobs_organization_id_idx
on public.tender_analysis_jobs(organization_id, created_at desc);

create table if not exists public.tender_go_no_go_assessments (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recommendation text not null default 'pending' check (recommendation in ('pending', 'go', 'conditional-go', 'no-go')),
  summary text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tender_go_no_go_assessments_package_unique_idx
on public.tender_go_no_go_assessments(tender_package_id);

create index if not exists tender_go_no_go_assessments_organization_id_idx
on public.tender_go_no_go_assessments(organization_id, updated_at desc);

create or replace function public.prepare_tender_package()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjouspyyntöpaketin tallentamiseen.';
  end if;

  new.title := trim(coalesce(new.title, ''));
  if new.title = '' then
    raise exception 'Tarjouspyyntöpaketin nimi on pakollinen.';
  end if;

  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.linked_customer_id := nullif(trim(coalesce(new.linked_customer_id, '')), '');
  new.linked_project_id := nullif(trim(coalesce(new.linked_project_id, '')), '');
  new.linked_quote_id := nullif(trim(coalesce(new.linked_quote_id, '')), '');
  new.status := coalesce(new.status, 'draft');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.organization_id := current_profile.organization_id;
    new.created_by_user_id := current_profile.id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.organization_id := old.organization_id;
    new.created_by_user_id := old.created_by_user_id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
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

  new.storage_path := nullif(trim(coalesce(new.storage_path, '')), '');
  new.checksum := nullif(trim(coalesce(new.checksum, '')), '');
  new.upload_status := coalesce(new.upload_status, 'placeholder');
  new.parse_status := coalesce(new.parse_status, 'not-started');
  new.updated_at := timezone('utc', now());

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

create or replace function public.prepare_tender_analysis_job()
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjousanalyysijobin tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjousanalyysijobeja.';
  end if;

  new.job_type := trim(coalesce(new.job_type, ''));
  if new.job_type = '' then
    raise exception 'Analyysijobin tyyppi on pakollinen.';
  end if;

  new.status := coalesce(new.status, 'not-started');
  new.provider := nullif(trim(coalesce(new.provider, '')), '');
  new.model := nullif(trim(coalesce(new.model, '')), '');
  new.error_message := nullif(trim(coalesce(new.error_message, '')), '');
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

create or replace function public.prepare_tender_go_no_go_assessment()
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjouspyyntöarvion tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjouspyyntöarvioita.';
  end if;

  new.recommendation := coalesce(new.recommendation, 'pending');
  new.summary := nullif(trim(coalesce(new.summary, '')), '');
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

drop trigger if exists tender_packages_prepare on public.tender_packages;
create trigger tender_packages_prepare
before insert or update on public.tender_packages
for each row
execute function public.prepare_tender_package();

drop trigger if exists tender_documents_prepare on public.tender_documents;
create trigger tender_documents_prepare
before insert or update on public.tender_documents
for each row
execute function public.prepare_tender_document();

drop trigger if exists tender_analysis_jobs_prepare on public.tender_analysis_jobs;
create trigger tender_analysis_jobs_prepare
before insert or update on public.tender_analysis_jobs
for each row
execute function public.prepare_tender_analysis_job();

drop trigger if exists tender_go_no_go_assessments_prepare on public.tender_go_no_go_assessments;
create trigger tender_go_no_go_assessments_prepare
before insert or update on public.tender_go_no_go_assessments
for each row
execute function public.prepare_tender_go_no_go_assessment();

alter table public.tender_packages enable row level security;
alter table public.tender_documents enable row level security;
alter table public.tender_analysis_jobs enable row level security;
alter table public.tender_go_no_go_assessments enable row level security;

drop policy if exists tender_packages_select_org_member_or_admin on public.tender_packages;
create policy tender_packages_select_org_member_or_admin
on public.tender_packages
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_packages_insert_org_member_or_admin on public.tender_packages;
create policy tender_packages_insert_org_member_or_admin
on public.tender_packages
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_packages_update_creator_owner_or_admin on public.tender_packages;
create policy tender_packages_update_creator_owner_or_admin
on public.tender_packages
for update
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
  or created_by_user_id = (select auth.uid())
)
with check (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_member(organization_id)))
);

drop policy if exists tender_packages_delete_creator_owner_or_admin on public.tender_packages;
create policy tender_packages_delete_creator_owner_or_admin
on public.tender_packages
for delete
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
  or created_by_user_id = (select auth.uid())
);

drop policy if exists tender_documents_select_org_member_or_admin on public.tender_documents;
create policy tender_documents_select_org_member_or_admin
on public.tender_documents
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_documents_insert_org_member_or_admin on public.tender_documents;
create policy tender_documents_insert_org_member_or_admin
on public.tender_documents
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_documents_update_creator_owner_or_admin on public.tender_documents;
create policy tender_documents_update_creator_owner_or_admin
on public.tender_documents
for update
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
  or created_by_user_id = (select auth.uid())
)
with check (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_member(organization_id)))
);

drop policy if exists tender_documents_delete_creator_owner_or_admin on public.tender_documents;
create policy tender_documents_delete_creator_owner_or_admin
on public.tender_documents
for delete
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
  or created_by_user_id = (select auth.uid())
);

drop policy if exists tender_analysis_jobs_select_org_member_or_admin on public.tender_analysis_jobs;
create policy tender_analysis_jobs_select_org_member_or_admin
on public.tender_analysis_jobs
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_analysis_jobs_insert_org_member_or_admin on public.tender_analysis_jobs;
create policy tender_analysis_jobs_insert_org_member_or_admin
on public.tender_analysis_jobs
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_analysis_jobs_update_owner_or_admin on public.tender_analysis_jobs;
create policy tender_analysis_jobs_update_owner_or_admin
on public.tender_analysis_jobs
for update
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
)
with check (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_member(organization_id)))
);

drop policy if exists tender_analysis_jobs_delete_owner_or_admin on public.tender_analysis_jobs;
create policy tender_analysis_jobs_delete_owner_or_admin
on public.tender_analysis_jobs
for delete
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
);

drop policy if exists tender_go_no_go_assessments_select_org_member_or_admin on public.tender_go_no_go_assessments;
create policy tender_go_no_go_assessments_select_org_member_or_admin
on public.tender_go_no_go_assessments
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_go_no_go_assessments_insert_org_member_or_admin on public.tender_go_no_go_assessments;
create policy tender_go_no_go_assessments_insert_org_member_or_admin
on public.tender_go_no_go_assessments
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_go_no_go_assessments_update_owner_or_admin on public.tender_go_no_go_assessments;
create policy tender_go_no_go_assessments_update_owner_or_admin
on public.tender_go_no_go_assessments
for update
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
)
with check (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_member(organization_id)))
);

drop policy if exists tender_go_no_go_assessments_delete_owner_or_admin on public.tender_go_no_go_assessments;
create policy tender_go_no_go_assessments_delete_owner_or_admin
on public.tender_go_no_go_assessments
for delete
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
);