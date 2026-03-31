# File Manifest - Stable State Snapshot

Generated: Current stable state

## Root Level Files

- index.html
- package.json
- package-lock.json
- tsconfig.json
- vite.config.ts
- tailwind.config.js
- theme.json
- components.json
- runtime.config.json
- spark.meta.json

## Documentation

- README.md ✅
- PRD.md ✅
- STABLE_STATE.md ✅
- LAATTAPISTE_TUONTI.md ✅
- LICENSE
- SECURITY.md

## Source Files

### src/
- App.tsx ✅
- index.css ✅
- main.css ✅ (DO NOT MODIFY)
- main.tsx ✅ (DO NOT MODIFY)
- vite-end.d.ts
- ErrorFallback.tsx

### src/components/
- QuoteEditor.tsx ✅
- ReadOnlyAlert.tsx ✅

### src/components/pages/
- Dashboard.tsx ✅
- ProductsPage.tsx ✅
- InstallationGroupsPage.tsx ✅
- SubstituteProductsPage.tsx ✅
- ProjectsPage.tsx ✅
- ProjectsPageFull.tsx ✅
- TermsPage.tsx ✅
- SettingsPage.tsx ✅
- ReportsPage.tsx ✅
- ImportPage.tsx ✅
- LaattapisteImportPage.tsx ✅

### src/components/ui/ (shadcn v4)
- accordion.tsx
- alert-dialog.tsx
- alert.tsx
- aspect-ratio.tsx
- avatar.tsx
- badge.tsx
- breadcrumb.tsx
- button.tsx
- calendar.tsx
- card.tsx
- carousel.tsx
- chart.tsx
- checkbox.tsx
- collapsible.tsx
- command.tsx
- context-menu.tsx
- dialog.tsx
- drawer.tsx
- dropdown-menu.tsx
- form.tsx
- hover-card.tsx
- input-otp.tsx
- input.tsx
- label.tsx
- menubar.tsx
- navigation-menu.tsx
- pagination.tsx
- popover.tsx
- progress.tsx
- radio-group.tsx
- resizable.tsx
- scroll-area.tsx
- select.tsx
- separator.tsx
- sheet.tsx
- sidebar.tsx
- skeleton.tsx
- slider.tsx
- sonner.tsx
- switch.tsx
- table.tsx
- tabs.tsx
- textarea.tsx
- toggle-group.tsx
- toggle.tsx
- tooltip.tsx

### src/hooks/
- use-auth.ts ✅
- use-data.ts ✅
- use-mobile.ts ✅

### src/lib/
- types.ts ✅
- calculations.ts ✅
- export.ts ✅
- utils.ts ✅

### src/styles/
- theme.css

## Key Dependencies (package.json)

### Core
- react@19.2.0
- react-dom@19.2.0
- typescript@5.7.3
- vite@7.2.6

### UI & Styling
- @tailwindcss/vite@4.1.17
- tailwindcss@4.1.17
- @phosphor-icons/react@2.1.10
- framer-motion@12.23.25

### Forms & Validation
- react-hook-form@7.67.0
- zod@3.25.76
- @hookform/resolvers@4.1.3

### shadcn & Radix
- @radix-ui/* (all components)
- sonner@2.0.7
- lucide-react@0.484.0

### Data & Visualization
- recharts@2.15.4
- d3@7.9.0
- date-fns@3.6.0

### Utilities
- clsx@2.1.1
- tailwind-merge@3.4.0
- class-variance-authority@0.7.1

## Data Storage (Spark KV Keys)

All persistent data stored in Spark KV:

- products
- installation-groups
- substitute-products
- customers
- projects
- quotes
- quote-rows
- quote-terms
- settings

## Status: LOCKED ✅

This manifest represents the verified working state of the application.
All files are accounted for and functioning correctly.

**DO NOT MODIFY** without explicit approval.
