create table if not exists public.tender_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  tender_package_id uuid references public.tender_packages(id) on delete set null,
  tender_document_id uuid references public.tender_documents(id) on delete set null,
  tender_analysis_job_id uuid references public.tender_analysis_jobs(id) on delete set null,
  tender_draft_package_id uuid references public.tender_draft_packages(id) on delete set null,
  event_type text not null check (
    event_type in (
      'tender.package.created',
      'tender.document.uploaded',
      'tender.document.extraction.started',
      'tender.analysis.started',
      'tender.draft-package.imported',
      'tender.draft-package.reimported'
    )
  ),
  event_status text not null default 'success' check (event_status in ('success', 'failed')),
  quantity integer not null default 1 check (quantity > 0),
  metered_units bigint not null default 1 check (metered_units > 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_usage_events_org_event_occurred_idx
on public.tender_usage_events(organization_id, event_type, occurred_at desc);

create index if not exists tender_usage_events_org_occurred_idx
on public.tender_usage_events(organization_id, occurred_at desc);

create index if not exists tender_usage_events_package_occurred_idx
on public.tender_usage_events(tender_package_id, occurred_at desc)
where tender_package_id is not null;

create index if not exists tender_usage_events_draft_package_occurred_idx
on public.tender_usage_events(tender_draft_package_id, occurred_at desc)
where tender_draft_package_id is not null;

create or replace function public.prepare_tender_usage_event()
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
    raise exception 'Aktiivinen organisaatiojasen vaaditaan usage-eventin tallentamiseen.';
  end if;

  new.event_type := trim(coalesce(new.event_type, ''));
  if new.event_type = '' then
    raise exception 'Usage-eventin tyyppi on pakollinen.';
  end if;

  new.event_status := coalesce(nullif(trim(coalesce(new.event_status, '')), ''), 'success');
  new.quantity := greatest(1, coalesce(new.quantity, 1));
  new.metered_units := greatest(1, coalesce(new.metered_units, 1));
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  new.occurred_at := coalesce(new.occurred_at, timezone('utc', now()));
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    if new.organization_id is null then
      raise exception 'Usage-eventilta puuttuu organisaatio.';
    end if;

    if new.organization_id <> current_profile.organization_id and not public.is_admin() then
      raise exception 'Et voi kirjata usage-eventtia toisen organisaation kontekstiin.';
    end if;

    if new.actor_user_id is null then
      new.actor_user_id := current_profile.id;
    end if;

    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.organization_id := old.organization_id;
    new.actor_user_id := old.actor_user_id;
    new.tender_package_id := old.tender_package_id;
    new.tender_document_id := old.tender_document_id;
    new.tender_analysis_job_id := old.tender_analysis_job_id;
    new.tender_draft_package_id := old.tender_draft_package_id;
    new.event_type := old.event_type;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists tender_usage_events_prepare on public.tender_usage_events;
create trigger tender_usage_events_prepare
before insert or update on public.tender_usage_events
for each row
execute function public.prepare_tender_usage_event();

alter table public.tender_usage_events enable row level security;

drop policy if exists tender_usage_events_select_org_member_or_admin on public.tender_usage_events;
create policy tender_usage_events_select_org_member_or_admin
on public.tender_usage_events
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_usage_events_insert_org_member_or_admin on public.tender_usage_events;
create policy tender_usage_events_insert_org_member_or_admin
on public.tender_usage_events
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

grant select, insert on public.tender_usage_events to authenticated;
