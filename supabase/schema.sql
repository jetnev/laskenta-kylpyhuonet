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

create or replace function public.is_admin()
returns boolean
language sql
stable
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role text;
  next_name text;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  next_role := case
    when not exists (select 1 from public.profiles) then 'admin'
    else 'user'
  end;

  next_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(new.email, 'Kayttaja'), '@', 1)
  );

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

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

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
  scope text not null check (scope in ('shared', 'user')),
  owner_user_id uuid references public.profiles(id) on delete cascade,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_kv_storage_key_idx on public.app_kv(storage_key);
create index if not exists app_kv_owner_user_id_idx on public.app_kv(owner_user_id);

drop trigger if exists app_kv_set_updated_at on public.app_kv;
create trigger app_kv_set_updated_at
before update on public.app_kv
for each row
execute function public.set_updated_at();

alter table public.app_kv enable row level security;

drop policy if exists app_kv_select_shared_or_own_or_admin on public.app_kv;
create policy app_kv_select_shared_or_own_or_admin
on public.app_kv
for select
to authenticated
using (
  (select public.is_admin())
  or scope = 'shared'
  or owner_user_id = (select auth.uid())
);

drop policy if exists app_kv_insert_shared_admin_or_own on public.app_kv;
create policy app_kv_insert_shared_admin_or_own
on public.app_kv
for insert
to authenticated
with check (
  (select public.is_admin())
  or (scope = 'user' and owner_user_id = (select auth.uid()))
);

drop policy if exists app_kv_update_shared_admin_or_own on public.app_kv;
create policy app_kv_update_shared_admin_or_own
on public.app_kv
for update
to authenticated
using (
  (select public.is_admin())
  or (scope = 'user' and owner_user_id = (select auth.uid()))
)
with check (
  (select public.is_admin())
  or (scope = 'user' and owner_user_id = (select auth.uid()))
);

drop policy if exists app_kv_delete_shared_admin_or_own on public.app_kv;
create policy app_kv_delete_shared_admin_or_own
on public.app_kv
for delete
to authenticated
using (
  (select public.is_admin())
  or (scope = 'user' and owner_user_id = (select auth.uid()))
);

