create table if not exists public.tender_requirements (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_document_id uuid references public.tender_documents(id) on delete set null,
  requirement_type text not null default 'other' check (requirement_type in ('administrative', 'commercial', 'technical', 'schedule', 'legal', 'other')),
  title text not null,
  description text,
  status text not null default 'unreviewed' check (status in ('unreviewed', 'covered', 'missing', 'at-risk')),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  source_excerpt text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_requirements_tender_package_id_idx
on public.tender_requirements(tender_package_id, created_at desc);

create index if not exists tender_requirements_organization_id_idx
on public.tender_requirements(organization_id, updated_at desc);

create table if not exists public.tender_missing_items (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  related_requirement_id uuid references public.tender_requirements(id) on delete set null,
  item_type text not null default 'other' check (item_type in ('clarification', 'document', 'pricing', 'resourcing', 'decision', 'other')),
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_missing_items_tender_package_id_idx
on public.tender_missing_items(tender_package_id, created_at desc);

create index if not exists tender_missing_items_organization_id_idx
on public.tender_missing_items(organization_id, updated_at desc);

create table if not exists public.tender_risk_flags (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_type text not null default 'other' check (risk_type in ('commercial', 'delivery', 'technical', 'legal', 'resourcing', 'other')),
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'accepted', 'mitigated')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_risk_flags_tender_package_id_idx
on public.tender_risk_flags(tender_package_id, created_at desc);

create index if not exists tender_risk_flags_organization_id_idx
on public.tender_risk_flags(organization_id, updated_at desc);

create table if not exists public.tender_reference_suggestions (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null default 'manual' check (source_type in ('quote', 'project', 'document-template', 'manual')),
  source_reference text,
  title text not null,
  rationale text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_reference_suggestions_tender_package_id_idx
on public.tender_reference_suggestions(tender_package_id, created_at desc);

create index if not exists tender_reference_suggestions_organization_id_idx
on public.tender_reference_suggestions(organization_id, updated_at desc);

create table if not exists public.tender_draft_artifacts (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  artifact_type text not null default 'quote-outline' check (artifact_type in ('quote-outline', 'response-summary', 'clarification-list')),
  title text not null,
  content_md text,
  status text not null default 'placeholder' check (status in ('placeholder', 'ready-for-review', 'accepted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_draft_artifacts_tender_package_id_idx
on public.tender_draft_artifacts(tender_package_id, created_at desc);

create index if not exists tender_draft_artifacts_organization_id_idx
on public.tender_draft_artifacts(organization_id, updated_at desc);

create table if not exists public.tender_review_tasks (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_type text not null default 'documents' check (task_type in ('documents', 'requirements', 'risk', 'decision', 'draft')),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in-review', 'done')),
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_review_tasks_tender_package_id_idx
on public.tender_review_tasks(tender_package_id, created_at desc);

create index if not exists tender_review_tasks_organization_id_idx
on public.tender_review_tasks(organization_id, updated_at desc);

create or replace function public.prepare_tender_requirement()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_package public.tender_packages;
  source_document public.tender_documents;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjousvaatimuksen tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjousvaatimuksia.';
  end if;

  if new.source_document_id is not null then
    select *
    into source_document
    from public.tender_documents
    where id = new.source_document_id;

    if source_document.id is null or source_document.tender_package_id <> target_package.id then
      raise exception 'Vaatimuksen lähdedokumentin pitää kuulua samaan tarjouspyyntöpakettiin.';
    end if;
  end if;

  new.requirement_type := coalesce(nullif(trim(coalesce(new.requirement_type, '')), ''), 'other');
  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Vaatimuksen otsikko on pakollinen.';
  end if;

  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.status := coalesce(new.status, 'unreviewed');
  new.source_excerpt := nullif(trim(coalesce(new.source_excerpt, '')), '');
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

create or replace function public.prepare_tender_missing_item()
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjouspuutteen tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjouspuutteita.';
  end if;

  if new.related_requirement_id is not null then
    select *
    into related_requirement
    from public.tender_requirements
    where id = new.related_requirement_id;

    if related_requirement.id is null or related_requirement.tender_package_id <> target_package.id then
      raise exception 'Puutteen liittyvän vaatimuksen pitää kuulua samaan tarjouspyyntöpakettiin.';
    end if;
  end if;

  new.item_type := coalesce(nullif(trim(coalesce(new.item_type, '')), ''), 'other');
  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Puutehavainnon otsikko on pakollinen.';
  end if;

  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.severity := coalesce(new.severity, 'medium');
  new.status := coalesce(new.status, 'open');
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

create or replace function public.prepare_tender_risk_flag()
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarjousriskin tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarjousriskejä.';
  end if;

  new.risk_type := coalesce(nullif(trim(coalesce(new.risk_type, '')), ''), 'other');
  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Riskihavainnon otsikko on pakollinen.';
  end if;

  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.severity := coalesce(new.severity, 'medium');
  new.status := coalesce(new.status, 'open');
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

create or replace function public.prepare_tender_reference_suggestion()
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

create or replace function public.prepare_tender_draft_artifact()
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
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan luonnosartefaktin tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation luonnosartefakteja.';
  end if;

  new.artifact_type := coalesce(nullif(trim(coalesce(new.artifact_type, '')), ''), 'quote-outline');
  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Luonnosartefaktin otsikko on pakollinen.';
  end if;

  new.content_md := nullif(trim(coalesce(new.content_md, '')), '');
  new.status := coalesce(new.status, 'placeholder');
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

create or replace function public.prepare_tender_review_task()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_package public.tender_packages;
  assigned_profile public.profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan tarkistustehtävän tallentamiseen.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = coalesce(new.tender_package_id, old.tender_package_id);

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation tarkistustehtäviä.';
  end if;

  if new.assigned_to_user_id is not null then
    select *
    into assigned_profile
    from public.profiles
    where id = new.assigned_to_user_id;

    if assigned_profile.id is null or assigned_profile.organization_id <> target_package.organization_id then
      raise exception 'Tarkistustehtävän vastuuhenkilön pitää kuulua samaan organisaatioon.';
    end if;
  end if;

  new.task_type := coalesce(nullif(trim(coalesce(new.task_type, '')), ''), 'documents');
  new.title := trim(coalesce(new.title, ''));

  if new.title = '' then
    raise exception 'Tarkistustehtävän otsikko on pakollinen.';
  end if;

  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.status := coalesce(new.status, 'todo');
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

drop trigger if exists tender_requirements_prepare on public.tender_requirements;
create trigger tender_requirements_prepare
before insert or update on public.tender_requirements
for each row
execute function public.prepare_tender_requirement();

drop trigger if exists tender_missing_items_prepare on public.tender_missing_items;
create trigger tender_missing_items_prepare
before insert or update on public.tender_missing_items
for each row
execute function public.prepare_tender_missing_item();

drop trigger if exists tender_risk_flags_prepare on public.tender_risk_flags;
create trigger tender_risk_flags_prepare
before insert or update on public.tender_risk_flags
for each row
execute function public.prepare_tender_risk_flag();

drop trigger if exists tender_reference_suggestions_prepare on public.tender_reference_suggestions;
create trigger tender_reference_suggestions_prepare
before insert or update on public.tender_reference_suggestions
for each row
execute function public.prepare_tender_reference_suggestion();

drop trigger if exists tender_draft_artifacts_prepare on public.tender_draft_artifacts;
create trigger tender_draft_artifacts_prepare
before insert or update on public.tender_draft_artifacts
for each row
execute function public.prepare_tender_draft_artifact();

drop trigger if exists tender_review_tasks_prepare on public.tender_review_tasks;
create trigger tender_review_tasks_prepare
before insert or update on public.tender_review_tasks
for each row
execute function public.prepare_tender_review_task();

alter table public.tender_requirements enable row level security;
alter table public.tender_missing_items enable row level security;
alter table public.tender_risk_flags enable row level security;
alter table public.tender_reference_suggestions enable row level security;
alter table public.tender_draft_artifacts enable row level security;
alter table public.tender_review_tasks enable row level security;

drop policy if exists tender_requirements_select_org_member_or_admin on public.tender_requirements;
create policy tender_requirements_select_org_member_or_admin
on public.tender_requirements
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_requirements_insert_org_member_or_admin on public.tender_requirements;
create policy tender_requirements_insert_org_member_or_admin
on public.tender_requirements
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_requirements_update_org_member_or_admin on public.tender_requirements;
create policy tender_requirements_update_org_member_or_admin
on public.tender_requirements
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_requirements_delete_org_member_or_admin on public.tender_requirements;
create policy tender_requirements_delete_org_member_or_admin
on public.tender_requirements
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_missing_items_select_org_member_or_admin on public.tender_missing_items;
create policy tender_missing_items_select_org_member_or_admin
on public.tender_missing_items
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_missing_items_insert_org_member_or_admin on public.tender_missing_items;
create policy tender_missing_items_insert_org_member_or_admin
on public.tender_missing_items
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_missing_items_update_org_member_or_admin on public.tender_missing_items;
create policy tender_missing_items_update_org_member_or_admin
on public.tender_missing_items
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_missing_items_delete_org_member_or_admin on public.tender_missing_items;
create policy tender_missing_items_delete_org_member_or_admin
on public.tender_missing_items
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_risk_flags_select_org_member_or_admin on public.tender_risk_flags;
create policy tender_risk_flags_select_org_member_or_admin
on public.tender_risk_flags
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_risk_flags_insert_org_member_or_admin on public.tender_risk_flags;
create policy tender_risk_flags_insert_org_member_or_admin
on public.tender_risk_flags
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_risk_flags_update_org_member_or_admin on public.tender_risk_flags;
create policy tender_risk_flags_update_org_member_or_admin
on public.tender_risk_flags
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_risk_flags_delete_org_member_or_admin on public.tender_risk_flags;
create policy tender_risk_flags_delete_org_member_or_admin
on public.tender_risk_flags
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_reference_suggestions_select_org_member_or_admin on public.tender_reference_suggestions;
create policy tender_reference_suggestions_select_org_member_or_admin
on public.tender_reference_suggestions
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_reference_suggestions_insert_org_member_or_admin on public.tender_reference_suggestions;
create policy tender_reference_suggestions_insert_org_member_or_admin
on public.tender_reference_suggestions
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_reference_suggestions_update_org_member_or_admin on public.tender_reference_suggestions;
create policy tender_reference_suggestions_update_org_member_or_admin
on public.tender_reference_suggestions
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_reference_suggestions_delete_org_member_or_admin on public.tender_reference_suggestions;
create policy tender_reference_suggestions_delete_org_member_or_admin
on public.tender_reference_suggestions
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_artifacts_select_org_member_or_admin on public.tender_draft_artifacts;
create policy tender_draft_artifacts_select_org_member_or_admin
on public.tender_draft_artifacts
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_artifacts_insert_org_member_or_admin on public.tender_draft_artifacts;
create policy tender_draft_artifacts_insert_org_member_or_admin
on public.tender_draft_artifacts
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_artifacts_update_org_member_or_admin on public.tender_draft_artifacts;
create policy tender_draft_artifacts_update_org_member_or_admin
on public.tender_draft_artifacts
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_draft_artifacts_delete_org_member_or_admin on public.tender_draft_artifacts;
create policy tender_draft_artifacts_delete_org_member_or_admin
on public.tender_draft_artifacts
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_review_tasks_select_org_member_or_admin on public.tender_review_tasks;
create policy tender_review_tasks_select_org_member_or_admin
on public.tender_review_tasks
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_review_tasks_insert_org_member_or_admin on public.tender_review_tasks;
create policy tender_review_tasks_insert_org_member_or_admin
on public.tender_review_tasks
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_review_tasks_update_org_member_or_admin on public.tender_review_tasks;
create policy tender_review_tasks_update_org_member_or_admin
on public.tender_review_tasks
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_review_tasks_delete_org_member_or_admin on public.tender_review_tasks;
create policy tender_review_tasks_delete_org_member_or_admin
on public.tender_review_tasks
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_go_no_go_assessments_update_owner_or_admin on public.tender_go_no_go_assessments;
drop policy if exists tender_go_no_go_assessments_update_org_member_or_admin on public.tender_go_no_go_assessments;
create policy tender_go_no_go_assessments_update_org_member_or_admin
on public.tender_go_no_go_assessments
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));