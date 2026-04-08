# File Manifest - v1.0.0

Updated: 2026-04-08 | Version: v1.0.0 (commit a9ff1da)

## Root Level

- index.html
- package.json / package-lock.json
- tsconfig.json
- vite.config.ts
- tailwind.config.js
- eslint.config.js
- theme.json
- components.json
- runtime.config.json
- spark.meta.json / skills-lock.json
- .env.example / .gitignore / .markdownlint.json / .mcp.json / .node-version

## Documentation

- README.md
- PRD.md — Product Requirements Document
- STABLE_STATE.md — Architecture baseline
- DEPLOYMENT.md / DEPLOYMENT_CHECKLIST_v1.0.0.md — Deploy guides
- PARANNUSEHDOTUKSET.md — Improvement backlog
- LAATTAPISTE_TUONTI.md / TESTAA-TUOTTEET.md — Feature guides
- VERSION_LOCK.md / SECURITY.md / LICENSE
- docs/cloudflare-pages-supabase.md
- docs/investigation_report.md
- docs/release-checklist.md
- docs/TARJOUSALY_ROADMAP.md
- docs/tender-intelligence-smoke-test.md

## CI/CD

- .github/workflows/validate.yml
- .github/workflows/deploy-cloudflare-pages.yml
- .github/workflows/publish-update-feed.yml
- .github/dependabot.yml

## Electron Desktop

- electron/main.mjs

## Source — Application Shell

### src/

- App.tsx — Root router & layout
- AuthenticatedRoot.tsx — Post-auth wrapper
- ErrorFallback.tsx — Error boundary UI
- main.tsx — Entry point
- main.css / index.css — Global styles
- vite-end.d.ts — Vite type declarations

## Source — Components

### src/components/ (top-level)

- AuthCallbackPage.tsx — OAuth callback handler
- DeadlineNotifications.tsx + .test.tsx
- FieldHelpLabel.tsx
- InvoiceEditor.tsx
- LandingPage.tsx — Public landing
- LoginPage.tsx
- PublicBranding.test.tsx
- QuoteEditor.tsx — Main quote editing form
- ReadOnlyAlert.tsx
- ResponsiveDialog.tsx + .test.tsx
- ResponsiveTable.tsx
- RouteLoadingFallback.tsx
- ScheduleSection.tsx

### src/components/layout/

- AppPageLayout.tsx
- PageEmptyState.tsx

### src/components/legal/

- LegalAcceptanceGate.tsx
- LegalDocumentArticle.tsx
- LegalDocumentLinks.tsx
- PublicLegalDocumentPage.tsx

### src/components/pages/

- AccountPage.tsx
- Dashboard.tsx + .test.tsx
- HelpPage.tsx
- ImportPage.tsx
- InstallationGroupsPage.tsx
- InvoicesPage.tsx + .test.tsx
- LaattapisteImportPage.tsx
- LegalDocumentsPage.tsx
- ProductsPage.tsx
- ProjectsPage.tsx + .test.ts
- ProjectsPageFull.tsx
- ReportsPage.tsx
- SettingsPage.tsx
- SubstituteProductsPage.tsx
- TermsPage.tsx
- UsersPage.tsx

### src/components/pages/reporting/

- ReportingDrilldownContent.tsx + .test.tsx
- ReportingDrilldownMeta.ts

### src/components/dashboard/

- ActionCard.tsx / DashboardCard.tsx / KPIBox.tsx / RightPanelCard.tsx / StatusBadge.tsx / TaskList.tsx

### src/components/quote-editor/

- AdditionalCostsSection.tsx
- HelpTooltip.tsx
- QuoteCompletionChecklist.tsx
- QuoteEditorComponents.test.tsx
- QuoteEditorSection.tsx
- QuoteEditorStepper.tsx
- QuoteManagedInterceptionDialogContent.tsx + .test.tsx
- QuoteManagedSaveGuard.tsx + .test.tsx
- QuoteManagedSectionBadge.tsx
- QuoteNotesPanels.tsx
- QuotePricingModeSelector.tsx
- QuoteTenderImportInspector.tsx + .test.tsx
- VisibilityBadge.tsx

### src/components/ui/ (shadcn/Radix — 35 primitives)

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip

## Source — Hooks

### src/hooks/

- use-auth.ts + .test.ts
- use-catalog.ts
- use-dashboard-data.ts
- use-data.ts + .test.ts
- use-deadline-notifications.ts
- use-kv.ts + .test.ts
- use-mobile.ts

## Source — Library / Business Logic

### src/lib/

- types.ts — Core domain types (Quote, QuoteRow, Customer, Project, Product, etc.)
- calculations.ts + .test.ts — Pricing engine (calculateQuoteRow, calculateQuote)
- invoices.ts + .test.ts — Invoice snapshot creation
- export.ts + .test.ts — PDF/XLSX export logic
- reporting.ts — Status weights and aggregation
- reporting-view-state.ts + .test.ts
- access-control.ts + .test.ts — Role-based access
- app-routing.ts + .test.ts
- auth-callback.ts + .test.ts
- catalog.ts / catalog-io.ts / catalog-ops.ts / catalog-types.ts
- dashboard-data.ts + .test.ts
- desktop-update.ts
- document-metadata.ts
- legal.ts + .test.ts
- legal-state-ux.ts + .test.ts
- legal-queries.test.ts
- ownership.ts + .test.ts
- product-search.ts + .test.ts
- project-workspace.ts
- projects-quote-list.ts
- quote-editor-ux.ts + .test.ts
- site-brand.ts + .test.ts
- supabase.ts — Supabase client init
- term-templates.ts + .test.ts
- test-data.ts — Dev fixture seeder
- utils.ts
- workspace-flow.ts + .test.ts

### src/lib/test-scenarios/

- user-scenario-fixtures.ts — 10 quotes, 40 rows, 3 customers, 5 projects
- user-scenario.test.ts — 60 integration tests

## Source — Tender Intelligence Feature

### src/features/tender-intelligence/components/

- CreateTenderPackageDialog.tsx
- TenderAnalysisPanel.tsx + .test.tsx
- TenderDecisionSupportPanel.tsx + .test.tsx
- TenderDocumentsPanel.tsx
- TenderDraftPackagePanel.tsx + .test.tsx
- TenderPackageList.tsx
- TenderPackageWorkspace.tsx + .test.tsx
- TenderProviderProfilePanel.tsx
- TenderReferenceCorpusPanel.tsx + .test.tsx
- TenderResultPanels.tsx + .test.tsx

### src/features/tender-intelligence/hooks/

- use-tender-intelligence.ts

### src/features/tender-intelligence/lib/ (30+ modules)

- tender-analysis.ts + .test.ts
- tender-analysis-runner-contract.test.ts
- tender-backend-smoke.test.ts
- tender-decision-support.ts + .test.ts
- tender-document-extraction.ts + .test.ts
- tender-document-extraction-contract.test.ts
- tender-document-upload.ts + .test.ts
- tender-draft-package.ts + .test.ts
- tender-draft-quality-gate.ts + .test.ts
- tender-editor-import.ts + .test.ts
- tender-editor-managed-markers.ts
- tender-editor-managed-surface.ts + .test.ts
- tender-editor-reconciliation.ts + .test.ts
- tender-go-no-go.ts + .test.ts
- tender-import-diagnostics.ts + .test.ts
- tender-import-drift.ts + .test.ts
- tender-import-failure-recovery.ts + .test.ts
- tender-import-ownership-registry.ts + .test.ts
- tender-import-registry-repair.ts + .test.ts
- tender-import-resume.ts + .test.ts
- tender-intelligence-errors.ts + .test.ts
- tender-intelligence-handoff.ts + .test.ts
- tender-intelligence-mappers.ts + .test.ts
- tender-intelligence-readiness.ts + .test.ts
- tender-intelligence-ui.ts + .test.ts
- tender-live-status.ts + .test.ts
- tender-package-lifecycle.ts + .test.ts
- tender-package-links.ts + .test.ts
- tender-package-list-filters.ts + .test.ts
- tender-placeholder-results.ts + .test.ts
- tender-provider-context.ts
- tender-provider-profile.ts + .test.ts
- tender-reference-import.ts + .test.ts
- tender-reference-matching.ts + .test.ts
- tender-review-workflow.ts + .test.ts
- tender-rule-analysis.ts + .test.ts
- tender-usage-limits.ts + .test.ts
- tender-usage-summary.ts + .test.ts
- quote-managed-surface-inspector.ts + .test.ts

### src/features/tender-intelligence/services/

- tender-editor-import-adapter.ts + .test.ts
- tender-intelligence-backend-adapter.ts
- tender-intelligence-repository.ts

### src/features/tender-intelligence/types/

- tender-analysis-runner-contract.ts
- tender-document-extraction-contract.ts
- tender-editor-import.ts
- tender-intelligence-db.ts
- tender-intelligence.ts

### src/features/tender-intelligence/pages/

- TenderIntelligencePage.tsx

## Source — Styles

### src/styles/

- theme.css

## Supabase

- supabase/config.toml
- supabase/schema.sql
- supabase/README.md
- supabase/rollout-tender-intelligence.ps1
- supabase/.gitignore

### supabase/functions/

- tender-analysis-runner/index.ts + placeholder-seed.ts
- tender-document-extractor/index.ts

### supabase/migrations/ (15 migrations)

1. 20260404_legal_acceptance_chain.sql
2. 2026040501_fix_rls_helper_row_security.sql
3. 2026040502_optimize_legal_acceptances_login_query.sql
4. 2026040503_tender_analysis_job_skeleton.sql
5. 2026040504_tender_analysis_result_domain_foundation.sql
6. 2026040505_tender_document_extraction_foundation.sql
7. 2026040506_tender_document_upload_foundation.sql
8. 2026040507_tender_intelligence_foundation.sql
9. 2026040508_tender_result_evidence_foundation.sql
10. 2026040509_tender_review_workflow_baseline.sql
11. 2026040601_tender_document_extractor_pdf_docx.sql
12. 2026040602_tender_reference_corpus_baseline.sql
13. 20260407_tender_draft_package_export_foundation.sql
14. 20260408_tender_draft_package_editor_import_boundary.sql
15. 20260409_tender_draft_package_import_reconciliation_boundary.sql
16. 20260410_tender_import_ownership_registry.sql
17. 20260411_tender_import_protected_reimport_conflicts.sql
18. 20260412_tender_import_run_types.sql
19. 20260413_tender_provider_profile_foundation.sql
20. 2026041401_tender_usage_metering_foundation.sql

## Utilities

- utils/supabase/client.ts
- utils/supabase/server.ts

## Data Storage

Persistent data stored in Supabase via `app_kv` (three scopes: shared, organization, user):
products, installation-groups, substitute-products, customers, projects, quotes, quote-rows, quote-terms, settings

## Test Coverage

- 76 test files, 419 tests (Vitest)
- 0 lint errors, 0 type errors
