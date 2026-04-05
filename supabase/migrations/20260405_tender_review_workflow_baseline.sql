do $$
begin
  create type public.tender_review_status as enum ('unreviewed', 'accepted', 'dismissed', 'needs_attention');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.tender_resolution_status as enum ('open', 'in_progress', 'resolved', 'wont_fix');
exception
  when duplicate_object then null;
end;
$$;

alter table public.tender_requirements
  add column if not exists review_status public.tender_review_status not null default 'unreviewed',
  add column if not exists review_note text,
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolution_status public.tender_resolution_status not null default 'open',
  add column if not exists resolution_note text,
  add column if not exists resolved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists assigned_to_user_id uuid references public.profiles(id) on delete set null;

alter table public.tender_missing_items
  add column if not exists review_status public.tender_review_status not null default 'unreviewed',
  add column if not exists review_note text,
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolution_status public.tender_resolution_status not null default 'open',
  add column if not exists resolution_note text,
  add column if not exists resolved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists assigned_to_user_id uuid references public.profiles(id) on delete set null;

alter table public.tender_risk_flags
  add column if not exists review_status public.tender_review_status not null default 'unreviewed',
  add column if not exists review_note text,
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolution_status public.tender_resolution_status not null default 'open',
  add column if not exists resolution_note text,
  add column if not exists resolved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists assigned_to_user_id uuid references public.profiles(id) on delete set null;

alter table public.tender_reference_suggestions
  add column if not exists review_status public.tender_review_status not null default 'unreviewed',
  add column if not exists review_note text,
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolution_status public.tender_resolution_status not null default 'open',
  add column if not exists resolution_note text,
  add column if not exists resolved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

alter table public.tender_draft_artifacts
  add column if not exists review_status public.tender_review_status not null default 'unreviewed',
  add column if not exists review_note text,
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolution_status public.tender_resolution_status not null default 'open',
  add column if not exists resolution_note text,
  add column if not exists resolved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

alter table public.tender_review_tasks
  add column if not exists review_status public.tender_review_status not null default 'unreviewed',
  add column if not exists review_note text,
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resolution_status public.tender_resolution_status not null default 'open',
  add column if not exists resolution_note text,
  add column if not exists resolved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

create index if not exists tender_requirements_workflow_status_idx
on public.tender_requirements(tender_package_id, review_status, resolution_status, updated_at desc);

create index if not exists tender_missing_items_workflow_status_idx
on public.tender_missing_items(tender_package_id, review_status, resolution_status, updated_at desc);

create index if not exists tender_risk_flags_workflow_status_idx
on public.tender_risk_flags(tender_package_id, review_status, resolution_status, updated_at desc);

create index if not exists tender_reference_suggestions_workflow_status_idx
on public.tender_reference_suggestions(tender_package_id, review_status, resolution_status, updated_at desc);

create index if not exists tender_draft_artifacts_workflow_status_idx
on public.tender_draft_artifacts(tender_package_id, review_status, resolution_status, updated_at desc);

create index if not exists tender_review_tasks_workflow_status_idx
on public.tender_review_tasks(tender_package_id, review_status, resolution_status, updated_at desc);

create or replace function public.ensure_tender_workflow_actor(
  target_package_id uuid,
  target_user_id uuid,
  actor_label text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  target_package public.tender_packages;
  target_profile public.profiles;
begin
  if target_user_id is null then
    return;
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = target_package_id;

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    raise exception '%-käyttäjää ei löytynyt.', actor_label;
  end if;

  if target_profile.organization_id is distinct from target_package.organization_id then
    raise exception '%-käyttäjän pitää kuulua samaan organisaatioon.', actor_label;
  end if;
end;
$$;

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
  new.review_status := coalesce(new.review_status, 'unreviewed');
  new.review_note := nullif(trim(coalesce(new.review_note, '')), '');
  new.resolution_status := coalesce(new.resolution_status, 'open');
  new.resolution_note := nullif(trim(coalesce(new.resolution_note, '')), '');

  perform public.ensure_tender_workflow_actor(target_package.id, new.reviewed_by_user_id, 'Tarkistuksen');
  perform public.ensure_tender_workflow_actor(target_package.id, new.resolved_by_user_id, 'Ratkaisun');
  perform public.ensure_tender_workflow_actor(target_package.id, new.assigned_to_user_id, 'Vastuuhenkilön');

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
  new.review_status := coalesce(new.review_status, 'unreviewed');
  new.review_note := nullif(trim(coalesce(new.review_note, '')), '');
  new.resolution_status := coalesce(new.resolution_status, 'open');
  new.resolution_note := nullif(trim(coalesce(new.resolution_note, '')), '');

  perform public.ensure_tender_workflow_actor(target_package.id, new.reviewed_by_user_id, 'Tarkistuksen');
  perform public.ensure_tender_workflow_actor(target_package.id, new.resolved_by_user_id, 'Ratkaisun');
  perform public.ensure_tender_workflow_actor(target_package.id, new.assigned_to_user_id, 'Vastuuhenkilön');

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
  new.review_status := coalesce(new.review_status, 'unreviewed');
  new.review_note := nullif(trim(coalesce(new.review_note, '')), '');
  new.resolution_status := coalesce(new.resolution_status, 'open');
  new.resolution_note := nullif(trim(coalesce(new.resolution_note, '')), '');

  perform public.ensure_tender_workflow_actor(target_package.id, new.reviewed_by_user_id, 'Tarkistuksen');
  perform public.ensure_tender_workflow_actor(target_package.id, new.resolved_by_user_id, 'Ratkaisun');
  perform public.ensure_tender_workflow_actor(target_package.id, new.assigned_to_user_id, 'Vastuuhenkilön');

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
  new.review_status := coalesce(new.review_status, 'unreviewed');
  new.review_note := nullif(trim(coalesce(new.review_note, '')), '');
  new.resolution_status := coalesce(new.resolution_status, 'open');
  new.resolution_note := nullif(trim(coalesce(new.resolution_note, '')), '');

  perform public.ensure_tender_workflow_actor(target_package.id, new.reviewed_by_user_id, 'Tarkistuksen');
  perform public.ensure_tender_workflow_actor(target_package.id, new.resolved_by_user_id, 'Ratkaisun');

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
  new.review_status := coalesce(new.review_status, 'unreviewed');
  new.review_note := nullif(trim(coalesce(new.review_note, '')), '');
  new.resolution_status := coalesce(new.resolution_status, 'open');
  new.resolution_note := nullif(trim(coalesce(new.resolution_note, '')), '');

  perform public.ensure_tender_workflow_actor(target_package.id, new.reviewed_by_user_id, 'Tarkistuksen');
  perform public.ensure_tender_workflow_actor(target_package.id, new.resolved_by_user_id, 'Ratkaisun');

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
  new.review_status := coalesce(new.review_status, 'unreviewed');
  new.review_note := nullif(trim(coalesce(new.review_note, '')), '');
  new.resolution_status := coalesce(new.resolution_status, 'open');
  new.resolution_note := nullif(trim(coalesce(new.resolution_note, '')), '');

  perform public.ensure_tender_workflow_actor(target_package.id, new.reviewed_by_user_id, 'Tarkistuksen');
  perform public.ensure_tender_workflow_actor(target_package.id, new.resolved_by_user_id, 'Ratkaisun');

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