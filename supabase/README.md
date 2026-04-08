# Supabase Migrations Workflow

## Audit Conclusions

- Repo already contained `supabase/schema.sql`, one checked-in migration `supabase/migrations/20260404_legal_acceptance_chain.sql`, and no Supabase CLI config.
- Existing deployment docs previously instructed running SQL directly in Supabase SQL Editor and completing auth settings in Dashboard.
- Current app runtime depends on database-side auth and access-control objects, not only frontend env vars.
- No direct Supabase Storage API usage was found in `src/`; storage remains a platform concern, but not an active application integration point.

## What The Current Snapshot Contains

The checked-in `supabase/schema.sql` snapshot already includes the app-critical database objects that must be preserved in any baseline or re-baseline:

- `public.profiles` and `public.organizations`
- `public.app_kv`
- `public.legal_document_versions` and `public.legal_document_acceptances`
- RLS policies for organizations, profiles, app KV, and legal document tables
- Security-definer helper functions and RPCs used by the app
- Triggers, including the `auth.users` onboarding trigger chain

This means the repo baseline must preserve tables, indexes, constraints, grants, RLS, triggers, and functions together. Treating only table DDL as the baseline would be incomplete.

## Source Of Truth After This Change

- `supabase/migrations/*.sql` is the only place for new schema changes.
- `supabase/schema.sql` is a reviewed snapshot/reference artifact for drift review and controlled re-baselining.
- `supabase/config.toml` configures the local CLI stack. It is not proof of remote production configuration.

Do not keep making ad hoc dashboard SQL changes without backporting them to a migration file. If a quick dashboard experiment is unavoidable, capture it immediately with a reviewed migration before merging any application code that depends on it.

## Current Manual Dependencies

The audit indicates that at least part of the current Supabase state was likely created manually via Dashboard or SQL Editor:

- the repo had no prior `supabase/config.toml`
- the checked-in docs told operators to run `supabase/schema.sql` manually in SQL Editor
- auth URL configuration and email provider settings still live outside normal schema migrations

Because of that, you must not assume that a linked remote project's migration history already matches this repo.

## Safe Adoption For An Existing Remote Project

Use this flow when the remote database already exists and may have been managed manually.

1. Link the project first.

```bash
npx supabase link --project-ref <project-ref>
```

1. Inspect local versus remote migration history.

```bash
npx supabase migration list --linked
```

1. If the remote history is empty, partial, or clearly wrong, do not run `db push` yet.

1. Pull the authoritative remote baseline from the linked project.

```bash
npx supabase db pull remote_baseline --linked --schema public,extensions
```

Notes:

- Supabase documents that `db pull` can create a new baseline migration and optionally repair remote migration history for that baseline.
- Review the generated SQL before accepting any history repair prompt.
- If the remote history contains stale rows, repair only those rows you have positively identified as wrong, then re-run `db pull`.

1. Compare the pulled baseline against `supabase/schema.sql` and the existing checked-in migration history.

If there is meaningful drift, stop there. Reconcile the repo first. Do not push local migrations into a remote project whose real state is still uncertain.

1. Only after the repo baseline and the remote state agree, preview pending changes.

```bash
npx supabase db push --linked --dry-run
```

1. Roll out to a non-production environment or preview branch first. Production is last.

## Rules For Existing Production Data

Never do any of the following against a real hosted project unless you explicitly intend destructive behavior and have a separate recovery plan:

- `npx supabase db reset --linked`
- `npx supabase db push --include-all` without first proving the migration history is correct
- deleting migration files just to make local and remote look aligned
- running dashboard SQL and forgetting to backport it into version control

## Workflow For New Database Changes

1. Start local Supabase services.

```bash
npm run supabase:start
```

1. Create a migration.

```bash
npm run supabase:migration:new -- add_descriptive_change_name
```

Migration naming rule:

- migration filename must start with a globally unique numeric version prefix (for example `2026041401_add_feature.sql`)
- if you create multiple migrations on the same date, increment the numeric suffix (`...01`, `...02`, `...03`) instead of reusing the same date-only prefix

1. Write the SQL in the new migration file under `supabase/migrations/`.

1. Validate locally.

```bash
npm run supabase:db:lint
```

1. Review remote drift before rollout when the project is linked.

```bash
npm run supabase:db:diff:linked
```

1. Review the exact rollout plan before applying.

```bash
npm run supabase:db:push:dry-run
```

1. Apply to preview or test first, then production last.

## Auth, Database, And Storage Notes

### Auth

The application depends on both schema objects and hosted auth settings:

- `public.profiles` references `auth.users`
- onboarding uses a trigger chain on `auth.users`
- email provider settings, redirect URLs, and auth URL configuration still require hosted auth configuration review

Schema migrations alone are not enough if auth settings drift in Dashboard.

### Database

Application login and authorization behavior currently depends on the database-side access model:

- platform role `admin|user`
- organization role `owner|employee`
- RLS-aware helper functions used by frontend auth and data loading

When you change access control, review both schema SQL and frontend callers.

### Storage

No direct Supabase Storage API usage was found in the app code during this audit.

Still, note that Supabase documents known limitations for `db diff` around storage buckets. If buckets are introduced later, treat storage configuration review as a separate rollout concern.

## Environment Separation And Secrets

Keep environments separate by role:

- local development: local Supabase CLI stack plus local Vite env values
- preview or test: separate Supabase project or Supabase preview branch
- production: linked hosted project, updated only after reviewed dry-run output and tested app changes

Secret handling rules:

- never commit `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, service-role keys, SMTP secrets, or OAuth client secrets
- keep Vite public client values separate from admin or CLI secrets
- prefer shell env vars, CI secrets, or uncommitted env files
- `supabase/config.toml` supports `env(...)` substitution for secrets when needed

Suggested local split:

- `.env.local` or `.env.development.local` for Vite public values such as `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SUPABASE_REDIRECT_URL`
- shell/CI secrets for CLI and admin credentials such as `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`

## Refreshing The Snapshot

After a reviewed rollout, refresh `supabase/schema.sql` intentionally so the repo snapshot stays useful as a baseline reference:

```bash
npx supabase db dump --linked -f supabase/schema.sql
```

Do this only after you have already reviewed and applied migrations through the normal workflow.
