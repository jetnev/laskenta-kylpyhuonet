-- Fix recursive RLS evaluation in helper functions.
--
-- Root cause: is_admin(), is_organization_owner(), and is_organization_member()
-- are used in RLS policies of several tables (profiles, organizations, app_kv,
-- tender_packages, legal_document_acceptances, etc.). Each function reads from
-- public.profiles. In Supabase's managed PostgreSQL, even SECURITY DEFINER
-- functions owned by the postgres role do not automatically bypass row security;
-- the postgres role is explicitly configured without BYPASSRLS privilege.
--
-- This causes a recursive RLS evaluation loop:
--   1. Query on table T triggers the table's SELECT RLS policy.
--   2. The policy calls (select public.is_admin()).
--   3. is_admin() reads from public.profiles.
--   4. profiles SELECT RLS is evaluated, which again calls (select public.is_admin()).
--   5. Back to step 3 → infinite recursion → "stack depth limit exceeded".
--
-- The bug specifically manifests on the legal_document_acceptances SELECT during
-- the post-login legal acceptance check, because that query has no row-level
-- short-circuit (no WHERE id = auth.uid()) that would suppress the is_admin()
-- subquery evaluation. Basic profile reads are unaffected because the query
-- planner short-circuits the RLS when the WHERE clause already satisfies
-- id = auth.uid() before needing to evaluate is_admin().
--
-- Fix: add "set row_security = off" to is_admin(), is_organization_owner(),
-- and is_organization_member(). This disables row security for the duration
-- of these functions' executions, preventing the recursive RLS loop while
-- preserving the correct boolean result they return.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
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
set row_security = off
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
