# Stable State Documentation - Laskenta Application

**Date**: Current working state locked
**Status**: ✅ STABLE - WORKING

## Application Overview

Laskenta is a comprehensive Finnish quotation and pricing system for accessible bathroom products and installation projects. The application enables sales staff to create, manage, and export professional customer quotations with flexible pricing logic.

## Core Features Implemented

### ✅ Authentication & Authorization
- GitHub-based authentication using Spark user API
- Owner-based access control
- Read-only view for non-owners
- Edit permissions restricted to app owner

### ✅ Data Management Modules

#### Product Registry
- CRUD operations for products with codes, names, categories
- Purchase price tracking
- Installation group linkage
- Unit type management (m², kpl, jm, etc.)

#### Installation Groups
- Reusable pricing groups for installation costs
- Default price definitions
- Product assignment

#### Substitute Products
- Alternative product definitions
- Substitution relationships
- Product replacement tracking

#### Projects & Customers
- Customer information management
- Project organization by customer
- Site information tracking
- Regional coefficient assignment

### ✅ Quote Management

#### Quote Creation & Editing
- Three-mode quote rows:
  - **Tuote** (Product only)
  - **Asennus** (Installation only)  
  - **Tuote + asennus** (Product + Installation)
- Flexible quantity and pricing controls
- Margin override capabilities
- Regional coefficient application

#### Revision System
- Version history tracking
- Quote duplication for revisions
- Superseded quote marking
- Prevention of sending old versions

#### Validation System
- Pre-send validation checks
- Required field verification
- Warning system for incomplete data
- Customer and site validation

### ✅ Export Capabilities

#### Customer-Facing Exports
- PDF generation (clean format)
- Excel export (customer view)
- Internal pricing hidden
- Professional formatting

#### Internal Exports
- Detailed Excel with all pricing
- Purchase price visibility
- Margin calculations
- Full cost breakdown

### ✅ Import Workflow
- Template download
- Excel file upload
- Preview changes before import
- Bulk product updates

### ✅ Reporting Dashboard
- KPI tracking (projects, quotes, status)
- Sales and margin analysis
- Top product reporting
- Recent activity view

## Technology Stack

### Frontend Framework
- **React 19.2.0** with TypeScript
- **Vite 7.2.6** for build and dev server
- **Tailwind CSS 4.1.17** for styling

### UI Components
- **shadcn/ui v4** component library
- **@phosphor-icons/react** for icons
- **Radix UI** primitives
- **Sonner** for toast notifications
- **Framer Motion** for animations

### State Management
- **Spark KV Store** for persistence (`useKV` hook)
- React hooks for local state
- Custom data hooks in `use-data.ts`

### Key Libraries
- **react-hook-form** - Form handling
- **zod** - Schema validation
- **date-fns** - Date utilities
- **recharts** - Data visualization
- **d3** - Advanced visualizations

## File Structure

```
/workspaces/spark-template/
├── index.html                 # HTML entry point
├── PRD.md                     # Product requirements document
├── STABLE_STATE.md           # This file
├── package.json              # Dependencies
├── src/
│   ├── App.tsx               # Main application component
│   ├── index.css             # Theme and global styles
│   ├── components/
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── InstallationGroupsPage.tsx
│   │   │   ├── SubstituteProductsPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── TermsPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── ImportPage.tsx
│   │   ├── ui/               # shadcn components
│   │   ├── QuoteEditor.tsx   # Quote editing component
│   │   └── ReadOnlyAlert.tsx # Auth warning component
│   ├── hooks/
│   │   ├── use-auth.ts       # Authentication hook
│   │   ├── use-data.ts       # Data management hooks
│   │   └── use-mobile.ts     # Mobile detection
│   └── lib/
│       ├── types.ts          # TypeScript type definitions
│       ├── calculations.ts   # Pricing calculations
│       ├── export.ts         # Export utilities
│       └── utils.ts          # Helper functions
```

## Data Schema

### Product
```typescript
{
  id: string;
  code: string;
  name: string;
  category?: string;
  unit: string;
  purchasePrice: number;
  installationGroupId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### InstallationGroup
```typescript
{
  id: string;
  name: string;
  defaultPrice: number;
  createdAt: string;
  updatedAt: string;
}
```

### Project
```typescript
{
  id: string;
  customerId: string;
  name: string;
  site: string;
  region?: string;
  regionCoefficient: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Quote
```typescript
{
  id: string;
  projectId: string;
  title: string;
  revisionNumber: number;
  parentQuoteId?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  vatPercent: number;
  notes?: string;
  termsId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### QuoteRow
```typescript
{
  id: string;
  quoteId: string;
  sortOrder: number;
  mode: 'product' | 'installation' | 'product_installation';
  productId?: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  salesPrice: number;
  installationPrice: number;
  marginPercent: number;
  overridePrice?: number;
  regionMultiplier: number;
  notes?: string;
}
```

## Key Storage Keys (Spark KV)

- `products` - Product array
- `installation-groups` - Installation group array
- `substitute-products` - Substitute product array
- `customers` - Customer array
- `projects` - Project array
- `quotes` - Quote array
- `quote-rows` - Quote row array
- `quote-terms` - Terms array
- `settings` - Application settings object

## Design System

### Colors (OKLCH)
- **Background**: `oklch(0.98 0.005 80)` - Light warm gray
- **Foreground**: `oklch(0.25 0.01 250)` - Dark blue-gray
- **Primary**: `oklch(0.45 0.12 250)` - Deep Nordic blue
- **Accent**: `oklch(0.65 0.15 200)` - Bright teal
- **Secondary**: `oklch(0.65 0.02 250)` - Slate gray

### Typography
- **Primary Font**: IBM Plex Sans
- **Monospace Font**: JetBrains Mono (for codes/prices)
- Hierarchy: 32px (H1), 24px (H2), 18px (H3), 15px (Body)

### Border Radius
- `--radius: 0.5rem` (8px)

## Navigation Structure

1. **Etusivu** (Dashboard) - Overview and KPIs
2. **Tuoterekisteri** (Products) - Product management
3. **Hintaryhmät** (Installation Groups) - Pricing groups
4. **Korvaavat tuotteet** (Substitutes) - Product alternatives
5. **Projektit** (Projects) - Project and customer management
6. **Ehdot** (Terms) - Quote terms management
7. **Asetukset** (Settings) - Application settings
8. **Raportointi** (Reports) - Analytics and reports

## Critical Implementation Notes

### State Management Pattern
All persistent data uses `useKV` with functional updates:

```typescript
// ✅ CORRECT
setProducts(current => [...current, newProduct]);

// ❌ WRONG - causes stale closure bugs
setProducts([...products, newProduct]);
```

### Authentication Flow
1. App loads → `useAuth()` hook fetches user
2. Loading state displays spinner
3. No user → Show login required message
4. User authenticated → Check `isOwner` flag
5. Non-owner → Show ReadOnlyAlert, hide edit controls
6. Owner → Full access to all features

### Quote Validation
Validation runs before export/send:
- Required: customer, site, at least one row
- Warnings: missing purchase prices, no terms selected
- Blocking errors prevent export
- Warnings allow export with confirmation

### Regional Coefficients
Default regions with multipliers:
- Pääkaupunkiseutu: 1.15
- Etelä-Suomi: 1.05
- Länsi-Suomi: 1.0
- Itä-Suomi: 0.95
- Pohjois-Suomi: 0.9

## Known Limitations

1. **Export formats**: Currently structured for Finnish market standards
2. **Currency**: Hard-coded to EUR (€)
3. **Language**: Finnish UI only
4. **Concurrent editing**: No real-time conflict resolution
5. **Bulk operations**: Limited to product imports only

## Testing Checklist

- ✅ User authentication works
- ✅ Owner can create/edit/delete all entities
- ✅ Non-owner has read-only access
- ✅ Products save and load correctly
- ✅ Installation groups link to products
- ✅ Quotes calculate prices correctly
- ✅ All three quote row modes function
- ✅ Margin overrides work
- ✅ Regional coefficients apply
- ✅ Revision system creates new versions
- ✅ Validation catches errors
- ✅ Export functions generate files
- ✅ Import workflow processes Excel files
- ✅ Dashboard displays correct metrics
- ✅ Navigation works across all pages

## Performance Considerations

- Data loads from KV store on component mount
- Functional updates prevent stale closures
- Tables virtualize for large datasets
- Lazy loading for heavy components
- Optimistic UI updates for better UX

## Security

- Authentication required for all access
- Authorization checked for mutations
- Owner-only write operations
- No direct database access
- Client-side validation with server-side safety

## Backup & Recovery

All data stored in Spark KV persistence:
- Automatic persistence across sessions
- No manual save required
- Data survives page refreshes
- Tied to user's Spark account

---

**DO NOT MODIFY** this state without explicit user approval. This represents a verified working configuration.
