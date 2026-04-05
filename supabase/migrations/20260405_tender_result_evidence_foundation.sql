create table if not exists public.tender_result_evidence (
  id uuid primary key default gen_random_uuid(),
  tender_package_id uuid not null references public.tender_packages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_document_id uuid not null references public.tender_documents(id) on delete cascade,
  extraction_id uuid not null references public.tender_document_extractions(id) on delete cascade,
  chunk_id uuid not null references public.tender_document_chunks(id) on delete cascade,
  target_entity_type text not null check (target_entity_type in ('requirement', 'missing_item', 'risk_flag', 'reference_suggestion', 'draft_artifact', 'review_task')),
  target_entity_id uuid not null,
  excerpt_text text not null,
  locator_text text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tender_result_evidence_tender_package_id_idx
on public.tender_result_evidence(tender_package_id, created_at desc);

create index if not exists tender_result_evidence_target_entity_idx
on public.tender_result_evidence(target_entity_type, target_entity_id, created_at desc);

create index if not exists tender_result_evidence_chunk_id_idx
on public.tender_result_evidence(chunk_id);

create index if not exists tender_result_evidence_organization_id_idx
on public.tender_result_evidence(organization_id, created_at desc);

create or replace function public.prepare_tender_result_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles;
  target_chunk public.tender_document_chunks;
  target_package public.tender_packages;
  target_entity_package_id uuid;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null
    or current_profile.status <> 'active'
    or current_profile.organization_id is null
  then
    raise exception 'Aktiivinen organisaatiojäsen vaaditaan analyysin evidence-rivin tallentamiseen.';
  end if;

  select *
  into target_chunk
  from public.tender_document_chunks
  where id = coalesce(new.chunk_id, old.chunk_id);

  if target_chunk.id is null then
    raise exception 'Evidence-rivin lähdechunkia ei löytynyt.';
  end if;

  select *
  into target_package
  from public.tender_packages
  where id = target_chunk.tender_package_id;

  if target_package.id is null then
    raise exception 'Tarjouspyyntöpakettia ei löytynyt.';
  end if;

  if target_package.organization_id <> current_profile.organization_id and not public.is_admin() then
    raise exception 'Et voi muokata toisen organisaation analyysin evidence-rivejä.';
  end if;

  new.target_entity_type := trim(coalesce(new.target_entity_type, ''));

  if new.target_entity_type = '' then
    raise exception 'Evidence-rivin kohde-entiteetin tyyppi on pakollinen.';
  end if;

  new.target_entity_id := coalesce(new.target_entity_id, old.target_entity_id);

  if new.target_entity_id is null then
    raise exception 'Evidence-rivin kohde-entiteetin tunniste on pakollinen.';
  end if;

  case new.target_entity_type
    when 'requirement' then
      select tender_package_id
      into target_entity_package_id
      from public.tender_requirements
      where id = new.target_entity_id;
    when 'missing_item' then
      select tender_package_id
      into target_entity_package_id
      from public.tender_missing_items
      where id = new.target_entity_id;
    when 'risk_flag' then
      select tender_package_id
      into target_entity_package_id
      from public.tender_risk_flags
      where id = new.target_entity_id;
    when 'reference_suggestion' then
      select tender_package_id
      into target_entity_package_id
      from public.tender_reference_suggestions
      where id = new.target_entity_id;
    when 'draft_artifact' then
      select tender_package_id
      into target_entity_package_id
      from public.tender_draft_artifacts
      where id = new.target_entity_id;
    when 'review_task' then
      select tender_package_id
      into target_entity_package_id
      from public.tender_review_tasks
      where id = new.target_entity_id;
    else
      raise exception 'Evidence-rivin kohde-entiteetin tyyppi ei ole tuettu: %', new.target_entity_type;
  end case;

  if target_entity_package_id is null or target_entity_package_id <> target_chunk.tender_package_id then
    raise exception 'Evidence-rivin kohde-entiteetin pitää kuulua samaan tarjouspyyntöpakettiin kuin lähdechunkin.';
  end if;

  new.excerpt_text := trim(coalesce(new.excerpt_text, ''));

  if new.excerpt_text = '' then
    raise exception 'Evidence-rivin ote on pakollinen.';
  end if;

  new.locator_text := nullif(trim(coalesce(new.locator_text, '')), '');
  new.updated_at := timezone('utc', now());

  if tg_op = 'INSERT' then
    new.tender_package_id := target_chunk.tender_package_id;
    new.organization_id := target_chunk.organization_id;
    new.source_document_id := target_chunk.tender_document_id;
    new.extraction_id := target_chunk.extraction_id;
    new.chunk_id := target_chunk.id;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  else
    new.tender_package_id := target_chunk.tender_package_id;
    new.organization_id := target_chunk.organization_id;
    new.source_document_id := target_chunk.tender_document_id;
    new.extraction_id := target_chunk.extraction_id;
    new.chunk_id := target_chunk.id;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_tender_result_evidence on public.tender_result_evidence;
create trigger prepare_tender_result_evidence
before insert or update on public.tender_result_evidence
for each row
execute function public.prepare_tender_result_evidence();

alter table public.tender_result_evidence enable row level security;

drop policy if exists tender_result_evidence_select_org_member_or_admin on public.tender_result_evidence;
create policy tender_result_evidence_select_org_member_or_admin
on public.tender_result_evidence
for select
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_result_evidence_insert_org_member_or_admin on public.tender_result_evidence;
create policy tender_result_evidence_insert_org_member_or_admin
on public.tender_result_evidence
for insert
to authenticated
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_result_evidence_update_org_member_or_admin on public.tender_result_evidence;
create policy tender_result_evidence_update_org_member_or_admin
on public.tender_result_evidence
for update
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))))
with check ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));

drop policy if exists tender_result_evidence_delete_org_member_or_admin on public.tender_result_evidence;
create policy tender_result_evidence_delete_org_member_or_admin
on public.tender_result_evidence
for delete
to authenticated
using ((select public.is_admin()) or (organization_id is not null and (select public.is_organization_member(organization_id))));