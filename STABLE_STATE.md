# Stable State Documentation - Laskenta Application

**Date**: Current working state locked
**Status**: ✅ STABLE - WORKING

## Application Overview

Laskenta is a comprehensive Finnish quotation and pricing system for accessible bathroom products and installation projects. The application enables sales staff to create, manage, and export professional customer quotations with flexible pricing logic.

## Core Features Implemented

### ✅ Authentication & Authorization
- GitHub-based authentication using Spark user API
- Owner-based access control
- Purchase price tracking
- Edit permissions restricted to app owner

### ✅ Data Management Modules

#### Product Registry
- CRUD operations for products with codes, names, categories
- Purchase price tracking
- Three-mode quote rows:
  - **Asennus** (Installation only)  

- Regional coefficient a
#### Revision System
- Quote duplication for rev
- Prevention of send

- Required field verific
- Customer and site validation
### ✅ Export Capabilities
#### Customer-Facing Exports

- Professional formatting
#### Internal Exports
- Purchase price visibility
- Full cost breakdown
### ✅ Import Workflow

- Bulk product updates

- Sales and margin analysis
- Recent activity view
## Technology Stack
### Frontend Framework
- **Vite 7.2.6** for build and dev server

- **shadcn/ui v4** component l
- **Radix UI** primitives

### State Management
- React hooks for local st

- **react-hook-form** - Fo
- **date-fns** - Date utilities

## File Structure
```
├── index.html               
├── STABLE_STATE.md           # This
├── src/

│   │   ├── pages/       

│   │   │   ├── SubstitutePr
│   │   │   ├── TermsPage.tsx
│   │   │   ├── ReportsPage.ts
│   │   ├── ui/          
│   │   └── ReadOnlyAlert

│   │   └── use-mobil
│       ├── types.ts          # T
│       ├── export.ts      
```
## Data Schema

{
  code: string;
  category?: string
  purchasePrice: number;
  createdAt: string;


```typescript
  id: string;
  defaultPrice: number;
  updatedAt: string;

### Project

  customerId: string;
  site: string;
  regionCoefficient: number;
  createdAt: string;


```typescript
  id: string;
  title: string;
  parentQuoteId?: string;
  vatPercent: number;

  updatedAt: string;
```
### QuoteRow
{

  mode: 'product'
  productName: string;
  quantity: number;
  purchasePrice: number;
  installationPrice: number;
  overridePrice?: number;

```

- `
- `substitute-products` - S
- `projects` - Project array
- `quote-rows` - Quote row array
- `settings` - Application settings objec
## Design System
### Colo
- **Foreground**: `oklch(0.25 0.01 250)` - Dark blue-gray
- **Accent**: `oklch(0.65 0.15 200)` - Bright teal

- **Primary Font**: IBM Plex Sans
- Hierarchy: 32px (H1), 24px 
### Border Radius


2. **Tuoterekisteri** (Products)
4. **Korvaavat tuotteet** (Su
6. **Ehdot** (Terms) - Quote ter
8. **Raportointi** (Reports) - 
## Critical Implementation Not
### State Management Pattern

// ✅ CORRECT

setProducts([...products, newProduct]);

1. App loads → `useAuth()` hook fetches user
3. No user →
5. Non-owner → Show ReadOnlyAlert, hide edit controls

Validation runs before export/send:
- Warnings: missing purchase prices, no terms se
- W

- Pääkaupunkis

- Pohjois-S
## Known Limi
1
3. **Language
5. **Bulk opera
## Testing Chec
- ✅ User authenticat
- ✅ Non-owner h
- ✅ Installation groups 
- ✅ All three quote row modes f
- ✅ Regional coeffic
  updatedAt: string;
}
```

- Data loads from KV 
- Tables virt
-
## Security
- Authenticatio
- Owner-only write oper
- Client-side valida
## Backup & Recovery
A
- N

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



**DO NOT MODIFY** this state without explicit user approval. This represents a verified working configuration.
