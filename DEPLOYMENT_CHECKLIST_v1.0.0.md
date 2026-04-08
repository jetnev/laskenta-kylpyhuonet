# Deployment Checklist - v1.0.0

**Release Date**: 2026-04-08
**Version**: v1.0.0 (commit b268154)
**Status**: Ready for Production Deployment

## Pre-Deployment Validation ✅

- [x] npm run lint - Passed
- [x] npm run typecheck - Passed  
- [x] npm run test - 359 tests passing across 75 test files
- [x] npm run build - Successful (6142 modules, 20.46s)
- [x] All source code validated
- [x] Zero merge conflict markers
- [x] All lint violations fixed

## Database Migrations in This Release

**New Migrations:**
- `2026041401_tender_usage_metering_foundation.sql` - Usage metering and quota tracking tables

**Migration Sequence Notes:**
- Includes 11 renamed migrations to use date-time format (2026040501-2026040602)
- Latest migration adds `tender_usage_metering` table with quota tracking
- All migrations are sequential and safe to apply

**Pre-Deployment DB Steps (REQUIRED):**
- [ ] Run `npx supabase db lint` to validate SQL syntax
- [ ] Run `npx supabase db push --linked --dry-run` to verify diff
- [ ] Review dry-run output for any unexpected changes
- [ ] Run `npx supabase db push --linked` to apply migrations (if approved)

## Cloudflare Pages Deployment

**Status**: Automatic via Git Integration
- [x] Code merged to main branch (v1.0.0 tag created)
- [x] GitHub Actions validate.yml triggered automatically
- [x] Cloudflare Pages native Git integration configured
- [ ] Monitor Cloudflare Pages deployment status
- [ ] Verify deployment completed successfully

**Environment Variables (Verify in Cloudflare):**
- [ ] `VITE_SITE_URL` = https://projekta.fi
- [ ] `VITE_SUPABASE_URL` = [configured]
- [ ] `VITE_SUPABASE_ANON_KEY` = [configured]
- [ ] `VITE_SUPABASE_REDIRECT_URL` = https://projekta.fi/auth/callback

## Production Smoke Testing (REQUIRED)

After deployment, verify the following in production:

### Authentication Flow
- [ ] New user registration works
- [ ] Email verification flow completes
- [ ] User receives welcome email
- [ ] Session persists across page reloads
- [ ] Logout clears session properly

### Legal Document Routes (Public)
- [ ] `/kayttoehdot` (Terms of Service) loads correctly
- [ ] `/tietosuoja` (Privacy Policy) loads correctly
- [ ] `/tietojenkasittely` (Data Processing) loads correctly
- [ ] `/evasteet` (Cookies) loads correctly

### Organization Workspace
- [ ] Owner user can access organization dashboard
- [ ] Can create new projects
- [ ] Can create new customers
- [ ] Can create quotes

### Tender Intelligence Features (New)
- [ ] Settings page displays usage summary
- [ ] Usage limits are enforced
- [ ] Tender intelligence features operate normally
- [ ] No errors in browser console

### Database Connectivity
- [ ] Data persists after page refresh
- [ ] App KV storage works (organization settings saved)
- [ ] No 500/502 errors in production logs

## Deployment Timeline

**Phase 1: Database Migration** (if needed)
- Time to complete: ~5 minutes
- Rollback: Restore from backup

**Phase 2: Frontend Deployment**
- Time to complete: ~2 minutes (automatic)
- Rollback: Revert commit on main, trigger redeploy

**Phase 3: Smoke Testing**
- Time to complete: ~10-15 minutes
- Team: QA/Product

**Total Estimated Time**: 20-30 minutes

## Rollback Plan

If deployment fails:
1. **Frontend rollback**: Revert commit on main to previous tag, push to trigger redeploy (2 min)
2. **Database rollback**: Restore Supabase backup or run down migrations (5-15 min)
3. **Notification**: Alert team of rollback, investigate root cause

## Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Monitor performance metrics
- [ ] Monitor database query performance
- [ ] Gather user feedback
- [ ] Document any issues found

## Sign-Off

**Developer**: _______________  Date: ___________

**QA/Tester**: _______________  Date: ___________

**Product Manager**: _______________  Date: ___________

---

## Key Features in v1.0.0

### Tender Intelligence
- Usage metering and quota tracking
- Live status monitoring
- Backend smoke test suite
- Comprehensive test coverage (359 tests)

### Core Platform
- Complete authentication and authorization
- Multi-tenant organization support
- Legal document management and acceptance tracking
- Quote editing and invoicing
- Project and customer management

### Infrastructure
- Cloudflare Pages deployment
- Supabase backend
- GitHub Actions CI/CD
- Electron desktop build capability
