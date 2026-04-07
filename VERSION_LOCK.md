# Version Lock File

## Current Stable Version

**Version**: 1.0.0-stable
**Status**: Locked checked-in baseline
**Date**: 2026-04-07
**Iteration**: 2

## Locked Runtime Summary

- Web runtime: React + TypeScript + Vite
- Web hosting: Cloudflare Pages
- Auth and backend data: Supabase
- Desktop distribution: Electron with published update feed workflow
- Quality gates: `lint`, `typecheck`, `test`, `validate`, `validate:release`

Older Spark-era references are not the runtime source of truth for this locked baseline.

## Core Feature Checklist

### Authentication And Security

- [x] Supabase authentication and session handling
- [x] Platform role and organization role access control
- [x] Read-only restrictions for unauthorized or non-editing contexts
- [x] Proper authorization checks

### Data Management

- [x] Supabase `app_kv` storage integration
- [x] Organization-scoped shared configuration
- [x] User-scoped operational records with authorized aggregation
- [x] Legal document versions and acceptance tracking

### Product Areas

- [x] Products, projects, customers, and quotes
- [x] Quote export and import workflows
- [x] Snapshot-based invoicing
- [x] Dashboard and reporting
- [x] Tarjousaly tender workspace flows

### Validation And Release

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run validate`
- [x] `npm run validate:release`
- [x] GitHub Actions validation, web deployment, and desktop feed publishing

## Breaking Changes Protection

Do not change these surfaces without intentional versioning and follow-up validation:

1. Data schema structures in `types.ts`
2. `app_kv` storage keys and scope assumptions
3. Calculation formulas in `calculations.ts`
4. Authentication flow in `use-auth.ts`
5. Main app structure in `App.tsx`
6. Core theme variables in `index.css`

## Rollback Reference

If a later change destabilizes the repo, validate against these documents first:

1. `STABLE_STATE.md`
2. `README.md`
3. `DEPLOYMENT.md`
4. `.github/workflows/validate.yml`
5. `.github/workflows/deploy-cloudflare-pages.yml`
6. `.github/workflows/publish-update-feed.yml`

## Notes

This file is a concise lock record for the current checked-in baseline. It should stay aligned with the actual runtime, deployment, and validation model of the repository rather than with legacy historical architecture notes.

**Status**: LOCKED
