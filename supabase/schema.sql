create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

alter table public.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.profiles
  add column if not exists organization_role text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_organization_membership_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_organization_membership_check
      check (
        (organization_id is null and organization_role is null)
        or (organization_id is not null and organization_role in ('owner', 'employee'))
      );
  end if;
end;
$$;

create index if not exists profiles_organization_id_idx on public.profiles(organization_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.ensure_current_user_admin_if_no_admin_exists()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null then
    raise exception 'Käyttäjäprofiilia ei löytynyt.';
  end if;

  if current_profile.status <> 'active' then
    return current_profile;
  end if;

  if current_profile.role = 'admin' then
    return current_profile;
  end if;

  if not exists (
    select 1
    from public.profiles
    where role = 'admin'
      and status = 'active'
  ) then
    update public.profiles
    set role = 'admin',
        updated_at = timezone('utc', now())
    where id = current_profile.id
    returning * into current_profile;
  end if;

  return current_profile;
end;
$$;

grant execute on function public.ensure_current_user_admin_if_no_admin_exists() to authenticated;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and organization_id = target_organization_id
  );
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and organization_id = target_organization_id
      and organization_role = 'owner'
  );
$$;

create or replace function public.can_manage_user_record(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles current_profile
    join public.profiles target_profile on target_profile.id = target_user_id
    where current_profile.id = auth.uid()
      and current_profile.status = 'active'
      and (
        current_profile.role = 'admin'
        or current_profile.id = target_profile.id
        or (
          current_profile.organization_role = 'owner'
          and current_profile.organization_id is not null
          and current_profile.organization_id = target_profile.organization_id
          and target_profile.role <> 'admin'
        )
      )
  );
$$;

create or replace function public.create_organization_for_current_user(p_organization_name text default null)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
  next_organization public.organizations;
  normalized_name text;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null then
    raise exception 'Käyttäjäprofiilia ei löytynyt.';
  end if;

  if current_profile.organization_id is not null then
    select *
    into next_organization
    from public.organizations
    where id = current_profile.organization_id;

    return next_organization;
  end if;

  normalized_name := nullif(trim(p_organization_name), '');
  if normalized_name is null then
    normalized_name := concat(
      coalesce(nullif(trim(current_profile.display_name), ''), split_part(coalesce(current_profile.email, 'Yritys'), '@', 1)),
      ' työtila'
    );
  end if;

  insert into public.organizations (name)
  values (normalized_name)
  returning * into next_organization;

  update public.profiles
  set organization_id = next_organization.id,
      organization_role = 'owner',
      updated_at = timezone('utc', now())
  where id = current_profile.id;

  return next_organization;
end;
$$;

grant execute on function public.create_organization_for_current_user(text) to authenticated;

create or replace function public.assign_employee_to_current_organization(
  p_user_id uuid,
  p_status text default 'active'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  requester public.profiles;
  target_profile public.profiles;
begin
  if p_status not in ('active', 'disabled') then
    raise exception 'Virheellinen käyttäjätila.';
  end if;

  select *
  into requester
  from public.profiles
  where id = auth.uid();

  if requester.id is null or requester.status <> 'active' then
    raise exception 'Kirjautuminen vaaditaan.';
  end if;

  if requester.organization_role <> 'owner' or requester.organization_id is null then
    raise exception 'Toiminto vaatii omistajan oikeudet.';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = p_user_id;

  if target_profile.id is null then
    raise exception 'Käyttäjää ei löytynyt.';
  end if;

  if target_profile.id = requester.id then
    raise exception 'Et voi liittää itseäsi työntekijäksi.';
  end if;

  if target_profile.role = 'admin' then
    raise exception 'Pääkäyttäjää ei voi liittää yrityksen työntekijäksi.';
  end if;

  if target_profile.organization_id is not null and target_profile.organization_id <> requester.organization_id then
    raise exception 'Käyttäjä kuuluu jo toiseen yritykseen.';
  end if;

  update public.profiles
  set organization_id = requester.organization_id,
      organization_role = 'employee',
      status = p_status,
      updated_at = timezone('utc', now())
  where id = p_user_id
  returning * into target_profile;

  return target_profile;
end;
$$;

grant execute on function public.assign_employee_to_current_organization(uuid, text) to authenticated;

create or replace function public.update_employee_status_in_current_organization(
  p_user_id uuid,
  p_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  requester public.profiles;
  target_profile public.profiles;
begin
  if p_status not in ('active', 'disabled') then
    raise exception 'Virheellinen käyttäjätila.';
  end if;

  select *
  into requester
  from public.profiles
  where id = auth.uid();

  if requester.id is null or requester.status <> 'active' then
    raise exception 'Kirjautuminen vaaditaan.';
  end if;

  if requester.organization_role <> 'owner' or requester.organization_id is null then
    raise exception 'Toiminto vaatii omistajan oikeudet.';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = p_user_id;

  if target_profile.id is null then
    raise exception 'Käyttäjää ei löytynyt.';
  end if;

  if target_profile.organization_id <> requester.organization_id or target_profile.organization_role <> 'employee' then
    raise exception 'Käyttäjä ei kuulu yrityksesi työntekijöihin.';
  end if;

  update public.profiles
  set status = p_status,
      updated_at = timezone('utc', now())
  where id = p_user_id
  returning * into target_profile;

  return target_profile;
end;
$$;

grant execute on function public.update_employee_status_in_current_organization(uuid, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_name text;
  next_role text;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  next_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(new.email, 'Kayttaja'), '@', 1)
  );

  next_role := case
    when not exists (select 1 from public.profiles) then 'admin'
    else 'user'
  end;

  insert into public.profiles (id, email, display_name, role, status, created_at, updated_at)
  values (
    new.id,
    coalesce(lower(new.email), ''),
    next_name,
    next_role,
    'active',
    timezone('utc', now()),
    timezone('utc', now())
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

do $$
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    update public.profiles
    set role = 'admin',
        updated_at = timezone('utc', now())
    where id = (
      select id
      from public.profiles
      order by created_at asc, id asc
      limit 1
    );
  end if;
end;
$$;

alter table public.organizations enable row level security;

drop policy if exists organizations_select_member_or_admin on public.organizations;
create policy organizations_select_member_or_admin
on public.organizations
for select
to authenticated
using ((select public.is_admin()) or (select public.is_organization_member(id)));

drop policy if exists organizations_update_owner_or_admin on public.organizations;
create policy organizations_update_owner_or_admin
on public.organizations
for update
to authenticated
using ((select public.is_admin()) or (select public.is_organization_owner(id)))
with check ((select public.is_admin()) or (select public.is_organization_owner(id)));

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_select_self_admin_or_owner on public.profiles;
create policy profiles_select_self_admin_or_owner
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
  or (organization_id is not null and (select public.is_organization_owner(organization_id)))
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()))
with check (id = (select auth.uid()) or (select public.is_admin()));

create table if not exists public.app_kv (
  id text primary key,
  storage_key text not null,
  scope text not null check (scope in ('shared', 'organization', 'user')),
  organization_id uuid references public.organizations(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete cascade,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_kv
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'app_kv_scope_check'
      and conrelid = 'public.app_kv'::regclass
  ) then
    alter table public.app_kv drop constraint app_kv_scope_check;
  end if;
exception
  when undefined_table then
    null;
end;
$$;

do $$
begin
  alter table public.app_kv
    add constraint app_kv_scope_check
    check (scope in ('shared', 'organization', 'user'));
exception
  when duplicate_object then
    null;
end;
$$;

create index if not exists app_kv_storage_key_idx on public.app_kv(storage_key);
create index if not exists app_kv_organization_id_idx on public.app_kv(organization_id);
create index if not exists app_kv_owner_user_id_idx on public.app_kv(owner_user_id);

drop trigger if exists app_kv_set_updated_at on public.app_kv;
create trigger app_kv_set_updated_at
before update on public.app_kv
for each row
execute function public.set_updated_at();

alter table public.app_kv enable row level security;

drop policy if exists app_kv_select_shared_or_own_or_admin on public.app_kv;
drop policy if exists app_kv_select_scoped_or_admin on public.app_kv;
create policy app_kv_select_scoped_or_admin
on public.app_kv
for select
to authenticated
using (
  (select public.is_admin())
  or scope = 'shared'
  or (scope = 'organization' and organization_id is not null and (select public.is_organization_member(organization_id)))
  or (scope = 'user' and owner_user_id is not null and (select public.can_manage_user_record(owner_user_id)))
);

drop policy if exists app_kv_insert_shared_admin_or_own on public.app_kv;
drop policy if exists app_kv_insert_scoped_or_admin on public.app_kv;
create policy app_kv_insert_scoped_or_admin
on public.app_kv
for insert
to authenticated
with check (
  (select public.is_admin())
  or (scope = 'organization' and organization_id is not null and (select public.is_organization_owner(organization_id)))
  or (scope = 'user' and owner_user_id is not null and (select public.can_manage_user_record(owner_user_id)))
);

drop policy if exists app_kv_update_shared_admin_or_own on public.app_kv;
drop policy if exists app_kv_update_scoped_or_admin on public.app_kv;
create policy app_kv_update_scoped_or_admin
on public.app_kv
for update
to authenticated
using (
  (select public.is_admin())
  or (scope = 'organization' and organization_id is not null and (select public.is_organization_owner(organization_id)))
  or (scope = 'user' and owner_user_id is not null and (select public.can_manage_user_record(owner_user_id)))
)
with check (
  (select public.is_admin())
  or (scope = 'organization' and organization_id is not null and (select public.is_organization_owner(organization_id)))
  or (scope = 'user' and owner_user_id is not null and (select public.can_manage_user_record(owner_user_id)))
);

drop policy if exists app_kv_delete_shared_admin_or_own on public.app_kv;
drop policy if exists app_kv_delete_scoped_or_admin on public.app_kv;
create policy app_kv_delete_scoped_or_admin
on public.app_kv
for delete
to authenticated
using (
  (select public.is_admin())
  or (scope = 'organization' and organization_id is not null and (select public.is_organization_owner(organization_id)))
  or (scope = 'user' and owner_user_id is not null and (select public.can_manage_user_record(owner_user_id)))
);

