update public.tender_analysis_jobs
set status = case
  when status = 'not-started' then 'pending'
  when status = 'processing' then 'running'
  else status
end
where status in ('not-started', 'processing');

update public.tender_analysis_jobs
set job_type = 'placeholder_analysis'
where job_type = 'placeholder';

alter table public.tender_analysis_jobs
  alter column status drop default;

alter table public.tender_analysis_jobs
  drop constraint if exists tender_analysis_jobs_status_check;

alter table public.tender_analysis_jobs
  add constraint tender_analysis_jobs_status_check
  check (status in ('pending', 'queued', 'running', 'completed', 'failed'));

alter table public.tender_analysis_jobs
  alter column status set default 'pending';

alter table public.tender_analysis_jobs
  drop constraint if exists tender_analysis_jobs_job_type_check;

alter table public.tender_analysis_jobs
  add constraint tender_analysis_jobs_job_type_check
  check (job_type in ('document-analysis', 'go-no-go', 'reference-scan', 'draft-preparation', 'placeholder_analysis'));

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

  new.status := coalesce(new.status, 'pending');
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

drop policy if exists tender_analysis_jobs_update_owner_or_admin on public.tender_analysis_jobs;
drop policy if exists tender_analysis_jobs_update_org_member_or_admin on public.tender_analysis_jobs;

create policy tender_analysis_jobs_update_org_member_or_admin
on public.tender_analysis_jobs
for update
to authenticated
using (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_member(organization_id)))
)
with check (
  (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_member(organization_id)))
);