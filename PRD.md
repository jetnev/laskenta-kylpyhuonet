# Laskenta - Finnish Quotation and Pricing System

Laskenta is a comprehensive internal quotation and pricing application for accessible bathroom product and installation projects, enabling sales and quotation staff to create, manage, and export professional customer quotations with flexible pricing logic and detailed cost calculations.

**Experience Qualities**:
1. **Efficient** - Fast data entry with keyboard shortcuts, batch operations, and minimal clicks to complete quotations
2. **Professional** - Clean business aesthetic with clear information hierarchy suitable for internal enterprise use
3. **Precise** - Deterministic calculations, validation checks, and audit trails ensure pricing accuracy and consistency

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a full-stack business management system with multiple interconnected entities (products, customers, projects, quotes, revisions), complex pricing logic (margins, regional coefficients, installation groups), data import/export workflows, validation rules, and comprehensive reporting dashboards. It requires sophisticated state management, relational data modeling, and multi-step workflows.

## Essential Features

### Authentication and Authorization
- **Functionality**: Use GitHub authentication via Spark user API to control access to modification operations
- **Purpose**: Ensure only authorized users (app owner) can add, edit, or delete data
- **Trigger**: User opens application or attempts modification operation
- **Progression**: App loads → Check user authentication → If owner, show edit controls → If not owner or not authenticated, show read-only view → Block all modifications
- **Success criteria**: Unauthorized users can view data but cannot create, edit, or delete any records

### Product Registry Management
- **Functionality**: CRUD operations for products with code, name, category, unit type, purchase price, and installation group linkage (owner only)
- **Purpose**: Central source of truth for all quotable bathroom products and their baseline pricing
- **Trigger**: Authenticated owner navigates to Tuoterekisteri and clicks "Lisää tuote" or selects existing product
- **Progression**: Click add → Fill form (code, name, category, unit, price, installation group) → Save → Product appears in searchable registry → Available for quote rows
- **Success criteria**: Products save correctly, appear in search, and populate quote rows with correct default values

### Installation Group Pricing
- **Functionality**: Define reusable installation groups with default pricing that can be assigned to products
- **Purpose**: Standardize installation costs and enable consistent pricing across similar product categories
- **Trigger**: User navigates to Hintaryhmät and manages installation groups
- **Progression**: Navigate to groups → Create/edit group → Set default installation price → Link to products → Installation price auto-populates in quotes
- **Success criteria**: Installation groups maintain consistent pricing and correctly apply to linked products

### Substitute Products Management
- **Functionality**: Define alternative products with justification notes and dimension specifications
- **Purpose**: Provide approved alternatives when primary products are unavailable or unsuitable
- **Trigger**: User navigates to Korvaavat tuotteet and defines substitution rules
- **Progression**: Select primary product → Choose substitute → Add justification and dimension notes → Save relationship → Visible during quote creation
- **Success criteria**: Substitutes display with proper context and can be selected during quote editing

### Project and Customer Management
- **Functionality**: Create projects with customer details, site information, region selection, and associated quotes
- **Purpose**: Organize quotations by customer and location with regional pricing coefficients
- **Trigger**: User clicks "Uusi projekti" from projects list
- **Progression**: Click create → Enter customer details → Add site information → Select region (affects coefficient) → Save → Project ready for quotes
- **Success criteria**: Projects store customer/site data and correctly apply regional coefficients to all associated quotes

### Flexible Quote Row Creation
- **Functionality**: Add rows with three modes (Tuote / Asennus / Tuote + asennus), each with quantity, pricing, and margin controls
- **Purpose**: Support diverse quoting scenarios from product-only to full installation projects
- **Trigger**: User editing quote clicks "Lisää rivi"
- **Progression**: Click add row → Select mode → Choose product or enter free text → Set quantity → Adjust margin or override price → Price calculates automatically → Row total updates
- **Success criteria**: All three modes calculate correctly, margin/override logic works, and totals aggregate properly

### Quote Revisioning System
- **Functionality**: Create new revision by copying existing quote, maintaining version history and preventing old revisions from being sent
- **Purpose**: Track quote changes over time and ensure customers receive only latest pricing
- **Trigger**: User clicks "Luo revisio" on existing quote
- **Progression**: Click create revision → System copies quote and all rows → New draft created → Original marked as superseded → Edit new version → Send only latest
- **Success criteria**: Revisions maintain complete history, prevent sending old versions, and clearly show version lineage

### Quote Validation and Readiness Checks
- **Functionality**: Pre-send validation ensuring customer, site, rows, quantities, prices exist; warnings for missing purchase prices or terms
- **Purpose**: Prevent incomplete or incorrect quotes from reaching customers
- **Trigger**: User attempts to send or export quote
- **Progression**: Click send/export → System validates required fields → Shows errors (blocking) or warnings (non-blocking) → User fixes issues → Validation passes → Export proceeds
- **Success criteria**: Validation catches all critical errors, provides clear guidance, and prevents export of invalid quotes

### Customer-Facing Export (PDF/XLSX)
- **Functionality**: Generate clean customer exports showing only quote rows, totals, and terms without internal pricing details
- **Purpose**: Provide professional quotations to customers without exposing internal margins or costs
- **Trigger**: User clicks "Vie PDF" or "Vie Excel" from validated quote
- **Progression**: Click export → System validates → Formats quote with customer info → Hides purchase prices and margins → Shows only line mode items → Includes terms → Downloads file
- **Success criteria**: Exports are professional, complete, and never expose internal pricing logic

### Internal XLSX Export
- **Functionality**: Generate detailed internal spreadsheet with all pricing components including purchase price, margin, overrides, and calculations
- **Purpose**: Enable internal analysis, auditing, and cost verification
- **Trigger**: User clicks "Vie sisäinen Excel"
- **Progression**: Click internal export → System includes all data → Shows purchase prices, margins, coefficients → Downloads detailed spreadsheet
- **Success criteria**: Export includes complete internal data for analysis and audit purposes

### Product Import Workflow
- **Functionality**: Download template, upload populated Excel, preview changes, confirm import with overwrite protection
- **Purpose**: Enable bulk product updates without manual entry
- **Trigger**: User navigates to Tuonti page
- **Progression**: Download template → Fill in Excel → Upload file → Preview shows changes → User confirms → Products import → Success message shows counts
- **Success criteria**: Import safely adds/updates products with clear preview and no accidental overwrites

### Deadline Tracking and Notifications
- **Functionality**: Track quote-specific milestones (deadlines, delivery dates, start dates, completion dates) with automatic notifications when approaching
- **Purpose**: Ensure critical project dates aren't missed and enable proactive project management
- **Trigger**: User adds schedule milestones to quotes; system checks deadlines hourly
- **Progression**: Edit quote → Add schedule section → Define milestones with dates and types → Save → System monitors approaching dates → Shows notifications on dashboard → Alerts user at configured intervals (7, 3, 1 days before)
- **Success criteria**: Users receive timely notifications for upcoming deadlines, can view all upcoming milestones in one place, and can configure notification preferences

### Reporting Dashboard
- **Functionality**: Display KPIs (project count, quote count, status summary), sales/margin analysis, top 15 products, and recent projects
- **Purpose**: Provide management visibility into quotation activity and business performance
- **Trigger**: User navigates to Raportointi
- **Progression**: Navigate to reports → Dashboard loads with calculated metrics → View KPI cards → Review charts and tables → Analyze trends
- **Success criteria**: Reports calculate accurately, update with data changes, and provide actionable business insights

## Edge Case Handling

- **Empty States**: Show helpful empty state messages in tables and lists with clear calls to action for adding first item
- **Decimal Quantities**: Support values like 2.5 m² with proper formatting and calculation precision
- **Missing Product Prices**: Allow quote creation but show warnings during validation for incomplete pricing
- **Orphaned Quote Rows**: Handle deleted products gracefully by preserving free-text name in quote rows
- **Concurrent Edits**: Use optimistic updates with proper error handling for race conditions
- **Invalid Import Data**: Validate Excel imports and show row-level errors for malformed data
- **Zero Quantities/Prices**: Prevent sending quotes with zero values but allow saving as draft
- **Superseded Quotes**: Clearly mark old revisions and disable send/export actions
- **Missing Installation Groups**: Allow products without installation groups, disable installation pricing in those rows

## Design Direction

The design should evoke trust, efficiency, and professionalism suitable for internal enterprise business tools. It should feel like sophisticated management software—clean, data-dense where appropriate, with strong information hierarchy and purposeful use of space. The aesthetic should communicate reliability and precision rather than consumer-friendly approachability.

## Color Selection

A professional Finnish business aesthetic with cool, trustworthy tones and clear visual hierarchy.

- **Primary Color**: Deep Nordic blue (oklch(0.45 0.12 250)) - Communicates trust, professionalism, and Finnish corporate identity
- **Secondary Colors**: Slate gray (oklch(0.65 0.02 250)) for supporting UI elements and neutral backgrounds
- **Accent Color**: Bright teal (oklch(0.65 0.15 200)) - Highlights interactive elements and important actions
- **Foreground/Background Pairings**: 
  - Background (Light warm gray oklch(0.98 0.005 80)): Dark text (oklch(0.25 0.01 250)) - Ratio 12.1:1 ✓
  - Primary (Deep blue oklch(0.45 0.12 250)): White text (oklch(1 0 0)) - Ratio 8.2:1 ✓
  - Accent (Bright teal oklch(0.65 0.15 200)): Dark text (oklch(0.25 0.01 250)) - Ratio 4.9:1 ✓
  - Card (White oklch(1 0 0)): Dark text (oklch(0.25 0.01 250)) - Ratio 14.5:1 ✓

## Font Selection

Typography should convey clarity, modernity, and business professionalism with excellent readability for data-dense tables and forms.

- **Primary Font**: IBM Plex Sans - Clean, technical, and highly readable for business applications
- **Monospace Font**: JetBrains Mono - For product codes, prices, and numerical data

**Typographic Hierarchy**:
- H1 (Page Title): IBM Plex Sans SemiBold / 32px / -0.02em letter spacing
- H2 (Section Header): IBM Plex Sans SemiBold / 24px / -0.01em letter spacing
- H3 (Card Title): IBM Plex Sans Medium / 18px / normal letter spacing
- Body (Forms & Content): IBM Plex Sans Regular / 15px / normal letter spacing
- Table Data: IBM Plex Sans Regular / 14px / normal letter spacing
- Product Codes: JetBrains Mono Medium / 13px / monospace
- Prices: JetBrains Mono Medium / 14px / monospace / tabular-nums

## Animations

Animations should enhance workflow efficiency without calling attention to themselves—quick, purposeful transitions that maintain spatial context and provide subtle feedback for user actions.

- **Form Validation**: 150ms highlight pulse on invalid fields
- **Row Addition**: 200ms slide-in for new quote rows with ease-out
- **Modal Dialogs**: 200ms scale and fade for professional appearance
- **Tab Switching**: 150ms crossfade between navigation sections
- **Data Loading**: Skeleton shimmer for tables, smooth spinner for actions
- **Success Feedback**: 300ms subtle checkmark animation with green highlight
- **Hover States**: 100ms color and shadow transitions on interactive elements

## Component Selection

**Components**:
- **Navigation**: Sidebar component for main navigation with collapsible sections
- **Data Tables**: Table component with sortable headers, row selection, and pagination
- **Forms**: Input, Label, Select, and Textarea with consistent validation styling
- **Dialogs**: Dialog component for create/edit forms and confirmation modals
- **Cards**: Card component for dashboard KPIs and section grouping
- **Buttons**: Button with variants (default, primary, destructive, ghost) for actions
- **Tabs**: Tabs component for switching between quote details, rows, and preview
- **Badges**: Badge component for status indicators (draft, sent, accepted, rejected)
- **Alerts**: Alert component for validation errors and warnings
- **Toasts**: Sonner for success/error notifications
- **Select**: Combobox for searchable product selection with typeahead

**Customizations**:
- Custom table row component with inline editing for quote rows
- Custom pricing calculator component showing margin and coefficient breakdowns
- Custom revision timeline component showing quote history
- Multi-step import wizard with preview table
- Custom report charts using recharts for dashboard visualizations

**States**:
- Buttons: Default with subtle shadow, hover with deeper shadow and color shift, active with inset appearance, disabled with reduced opacity
- Inputs: Default with border, focus with accent ring and border color change, error with destructive color, disabled with muted background
- Table Rows: Default, hover with background tint, selected with accent background, editing with border highlight

**Icon Selection**:
- Plus (add actions)
- Pencil (edit actions)
- Trash (delete actions)
- Eye (preview/view)
- Download (export actions)
- Upload (import actions)
- Check (confirm/validate)
- X (cancel/close)
- Copy (duplicate)
- ChartBar (reporting)
- Folder (projects)
- Package (products)
- Users (customers)
- FileText (quotes)
- Settings (configuration)

**Spacing**:
- Card padding: p-6
- Section gaps: gap-6
- Form field spacing: space-y-4
- Table cell padding: px-4 py-3
- Button padding: px-4 py-2 (default), px-6 py-3 (large)
- Page margins: p-8

**Mobile**:
- Sidebar collapses to hamburger menu on mobile
- Tables scroll horizontally with sticky first column
- Forms stack vertically with full-width inputs
- Dashboard KPIs stack in single column
- Navigation switches to bottom tab bar on small screens
- Dialogs become full-screen on mobile
