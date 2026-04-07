# Stable State - Projekta

**Date**: 2026-04-07
**Status**: Stable checked-in application baseline

## Product Purpose

Projekta is a Finnish quotation, project-tracking, invoicing, and tender-workspace application for bathroom and renovation work. The product combines operational sales tooling with organization-scoped shared data, legal acceptance management, and Tarjousaly workflows for reviewing tender request material before controlled import into the quote editor.

## Current Production Architecture

- Frontend: React 19 + TypeScript + Vite
- Web hosting: Cloudflare Pages
- Auth and backend data: Supabase
- Desktop distribution: Electron package with update feed publishing
- CI/CD: GitHub Actions for validation, Cloudflare Pages deployment, and desktop update feed publishing

Older Spark-era references still exist in parts of the repository history and legacy notes, but they do not describe the current runtime model of this branch.

## Auth And Data Model

### Authentication

- The web app uses Supabase Auth through `@supabase/supabase-js`.
- Required client env vars are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Session handling is persisted in the client, and auth callbacks resolve through the app's callback route.

### Roles And Access

- Platform role model: `admin` or `user`
- Organization role model: `owner` or `employee`
- Self-registration creates an organization context for the registrant, but does not imply platform admin rights.

### Application Data Storage

- Core app state is stored in Supabase `app_kv` records.
- `app_kv` supports three scopes: `shared`, `organization`, and `user`.
- Shared organizational resources such as settings, installation groups, term templates, company profile, and catalog data use organization scope.
- Operational records such as customers, projects, quotes, quote rows, and invoices are still primarily user-scoped and are aggregated for organization owners and admins in the application layer.

### Legal State

- Current legal state is backed by Supabase tables for document versions and legal acceptances.
- The app includes public legal document routes, acceptance gates, and organization-aware legal history flows.

## Major Functional Areas

### Sales And Project Operations

- Customer registry
- Project workspace
- Quote editor with revision handling
- Quote rows, pricing logic, and export flows
- Snapshot-based invoicing derived from quote state

### Shared Business Configuration

- Installation groups
- Settings
- Term templates
- Company profile
- Catalog import, mapping, and bootstrap data

### Legal And Compliance UX

- Legal document administration
- Public legal document pages
- Acceptance history and re-acceptance state
- Access gating for users who must accept updated terms

### Tarjousaly

- Tender package ingestion and document management
- Extraction and analysis job workflow
- Review-task and result-domain handling
- Draft package generation and managed import path into the quote editor
- Provider profile and decision-support oriented workspace capabilities on this branch

### Reporting And Oversight

- Dashboard and reporting views
- Quote and project activity visibility
- Organization-aware data aggregation for authorized users

## Local Development Baseline

### Prerequisites

- Node.js 20-compatible environment
- npm dependencies installed with `npm ci`
- Supabase environment values for any auth-backed or remote-data workflow

### Core Environment Variables

Minimum web runtime configuration:

```bash
VITE_SITE_URL=http://localhost:5173
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173/auth/callback
```

Desktop update behavior can additionally be influenced by feed-related environment variables in Electron packaging or runtime, but web development centers on the `VITE_*` variables above.

### Primary Commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run validate
npm run validate:release
```

Important quality gate detail:

- `npm run build` uses `tsc -b --noCheck && vite build`.
- A successful build is not a replacement for `npm run typecheck`.
- Release readiness should be judged from `npm run validate` or `npm run validate:release`.

## Supabase Workflow Baseline

- Local stack management is done through the repo scripts such as `npm run supabase:start`, `npm run supabase:stop`, and `npm run supabase:status`.
- New schema changes belong in `supabase/migrations/`.
- `supabase/schema.sql` acts as a snapshot or reference baseline and should not be treated as the primary incremental migration channel.
- Linked-environment rollout should be checked with the dry-run scripts before production-facing schema push decisions.

## Deployment And Release Flow

### Continuous Validation

- `.github/workflows/validate.yml` runs `npm run validate` on pull requests and on pushes to `main`.

### Web Deployment

- `.github/workflows/deploy-cloudflare-pages.yml` runs on pushes to `main` and on manual dispatch.
- The workflow installs dependencies, runs `npm run validate`, builds the app, and deploys the `dist` output to Cloudflare Pages.

### Desktop Release

- `.github/workflows/publish-update-feed.yml` runs on tags matching `v*` and on manual dispatch.
- The workflow validates the repo, aligns the package version with the tag, builds desktop artifacts on Windows, stages an update feed, and publishes the result to `gh-pages`.

## Known Scope Boundaries

- The repo still contains some legacy Spark references in historical files and compatibility surfaces; they should not be used as the source of truth for current runtime decisions.
- `app_kv` remains a mixed-scope storage model, so ownership changes and aggregation behavior must respect actual bucket movement and access rules rather than assuming a single global store.
- Desktop distribution exists, but web deployment remains the primary operational surface described by the checked-in deployment documentation.
- Tarjousaly is actively evolving on this branch, so feature breadth is ahead of a fully stabilized documentation pass in some lower-priority files.

## Source-Of-Truth Documents

Use these files when validating the current operating model of the repository:

- `README.md`
- `DEPLOYMENT.md`
- `docs/cloudflare-pages-supabase.md`
- `docs/release-checklist.md`
- `supabase/README.md`
- `.github/workflows/validate.yml`
- `.github/workflows/deploy-cloudflare-pages.yml`
- `.github/workflows/publish-update-feed.yml`

This document summarizes the stable checked-in baseline of the application, not the full historical evolution of the codebase.
