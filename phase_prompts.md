# ABD Stock v2 — Phase Execution Prompts
# One prompt per phase. Copy-paste the prompt for the phase you want to execute.
# Review output → approve → move to next phase.

---

## ═══════════════════════════════════════════════
## PHASE 0 — Foundation & Architecture Refactor
## ═══════════════════════════════════════════════

```
Execute Phase 0 — Foundation & Architecture Refactor for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT (read carefully before touching any file)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Workspace: c:\Users\mouadh\Desktop\abd-stock
- Stack: React 19 + TypeScript + Vite + Electron 32 + Supabase + TailwindCSS v3 + Zustand v5 + TanStack Query v5
- UI library: Radix UI primitives (already installed)
- Icons: lucide-react (already installed)
- i18n: i18next + react-i18next (already installed)
- Three languages: English (en), French (fr), Arabic (ar)
  - Arabic is RTL: when language=ar, <html dir="rtl">
  - Default language: fr
- Supabase URL and key are in .env as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- DO NOT install new packages unless absolutely required. If you must, ask first.
- DO NOT touch any files outside the scope listed below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE — FILES TO CREATE OR MODIFY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY:
  src/App.tsx
  src/components/layout/Sidebar.tsx
  src/components/layout/Topbar.tsx
  src/components/layout/AppShell.tsx
  src/store/authStore.ts
  src/locales/en/common.json
  src/locales/fr/common.json
  src/locales/ar/common.json

CREATE:
  src/locales/en/commerce.json
  src/locales/fr/commerce.json
  src/locales/ar/commerce.json
  src/locales/en/production.json
  src/locales/fr/production.json
  src/locales/ar/production.json
  src/locales/en/admin.json
  src/locales/fr/admin.json
  src/locales/ar/admin.json
  src/components/ui/StatusToggle.tsx
  src/components/ui/ConfirmDialog.tsx
  src/components/ui/SectionCard.tsx
  src/components/ui/InlineSearch.tsx
  supabase/migrations/020_v2_schema.sql

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[0.1] SIDEBAR REBUILD
- The sidebar must have TWO named sections with a visual section divider:
  SECTION 1 — 🛒 COMMERCE (label translatable: "Commerce" / "التجارة" / "Commerce")
    Links: Dashboard, Sales, Products, Commands (with 3 sub-links: Create / En Cours / Suivi), Inventory (with 2 sub-links: Stock / Suivi de Stock), Customers, Charges
  SECTION 2 — 🏭 PRODUCTION (label translatable: "Production" / "الإنتاج" / "Production")
    Links: Dashboard, Suppliers, Components, Recipes, WhatsApp
  BOTTOM — ⚙️ ADMINISTRATION (visible only to super_admin and commerce_manager)
    Links: Users
- Sidebar must be collapsible (collapsed = 64px icons only, expanded = 256px)
- Active link uses bg-primary text-primary-foreground style
- Commands and Inventory sub-links: when parent is clicked, expand/collapse the sub-group inline (accordion style — no separate route for parent)
- RTL: when language=ar, sidebar is on the RIGHT side (use CSS dir/RTL support)
- Section headers are NOT clickable — just visual group labels
- Each section has a distinct left border color:
  Commerce = border-blue-500
  Production = border-purple-500
  Administration = border-gray-500

[0.2] TOPBAR
- Keep: language switcher (EN / FR / AR), theme toggle (dark/light), user name + role, sign out button
- Remove: the static "Dashboard" title text (it was hardcoded — remove it)
- Add: a small section badge top-left that says which section the user is currently in (Commerce / Production / Administration) using the same color scheme as the sidebar

[0.3] ROUTER — App.tsx
- Reorganize routes as follows:
  /login                          → LoginPage (unchanged)
  /                               → redirect to /commerce/dashboard
  /commerce/dashboard             → CommerceDashboardPage (placeholder for now — existing DashboardPage)
  /commerce/sales                 → SalesPage (existing, unchanged for now)
  /commerce/products              → ProductsPage (existing, unchanged for now)
  /commerce/commands/create       → placeholder page (to be built in Phase 4)
  /commerce/commands/en-cours     → placeholder page
  /commerce/commands/suivi        → placeholder page
  /commerce/inventory/stock       → placeholder page (Phase 5)
  /commerce/inventory/logs        → placeholder page (Phase 5)
  /commerce/customers             → CustomersPage (existing, unchanged for now)
  /commerce/charges               → placeholder page (Phase 7)
  /production/dashboard           → placeholder page (Phase 8)
  /production/suppliers           → SuppliersPage (existing, unchanged for now)
  /production/components          → placeholder page (Phase 10)
  /production/recipes             → placeholder page (Phase 11)
  /production/whatsapp            → placeholder page (Phase 12)
  /admin/users                    → UsersPage (existing, unchanged for now)
  *                               → redirect to /commerce/dashboard

  For placeholder pages: render a simple centered card that says "Phase [N] — [Feature Name] — Coming Soon" with the correct i18n key.

[0.4] i18n FILES
Create these locale files with ALL keys needed for the entire app v2.
Keys listed below must exist in all three languages (en/fr/ar).

commerce.json (en example, fr and ar must be fully translated):
{
  "dashboard": {
    "title": "Commerce Dashboard",
    "total_sales": "Total Sales",
    "total_revenue": "Total Revenue",
    "total_items_sold": "Total Items Sold",
    "total_stock": "Total Stock",
    "best_customers": "Best Customers",
    "sales_vs_costs": "Sales vs Costs",
    "filter_by_product": "Filter by product",
    "date_range": "Date Range",
    "last_7_days": "Last 7 Days",
    "last_30_days": "Last 30 Days",
    "last_90_days": "Last 90 Days",
    "all_time": "All Time"
  },
  "sales": {
    "title": "Sales",
    "subtitle": "Manage orders and payments",
    "new_sale": "New Sale",
    "order_number": "Order #",
    "walk_in": "Walk-in Customer",
    "add_customer": "Add Customer",
    "price_override": "Override Price",
    "scan_barcode": "Scan Barcode",
    "cart": "Cart",
    "cart_empty": "Cart is empty",
    "checkout": "Checkout",
    "complete_sale": "Complete Sale",
    "print_receipt": "Print Receipt",
    "amount_paid": "Amount Paid",
    "due": "Due",
    "payment_status": "Payment Status",
    "paid": "Paid",
    "partial": "Partial",
    "pending": "Pending (Credit)"
  },
  "products": {
    "title": "Products",
    "subtitle": "Manage your product catalog",
    "add_product": "Add Product",
    "edit_product": "Edit Product",
    "name": "Product Name",
    "name_ar": "Name (Arabic)",
    "name_fr": "Name (French)",
    "sku": "SKU",
    "barcode": "Barcode",
    "cost_price": "Cost Price",
    "sell_price": "Sell Price",
    "reorder_level": "Reorder Level",
    "status": "Status",
    "active": "Active",
    "inactive": "Inactive",
    "variants": "Variants",
    "add_variant": "Add Variant",
    "no_variants": "No variants",
    "variant_name": "Variant Name",
    "image": "Product Image"
  },
  "commands": {
    "title": "Commands",
    "create_title": "Create Command",
    "en_cours_title": "In Progress",
    "suivi_title": "Tracking",
    "command_number": "Command #",
    "delivery_address": "Delivery Address",
    "tracking_id": "Tracking ID",
    "status_pending": "Pending",
    "status_confirmed": "Confirmed",
    "status_in_transit": "In Transit",
    "status_delivered": "Delivered",
    "status_cancelled": "Cancelled",
    "last_update": "Last Update",
    "estimated_delivery": "Estimated Delivery",
    "push_to_yalidin": "Submit to Delivery",
    "no_tracking": "Not yet submitted to delivery service"
  },
  "inventory": {
    "stock_title": "Stock",
    "stock_subtitle": "View and adjust product stock levels",
    "logs_title": "Stock Logs",
    "logs_subtitle": "Full audit trail of stock movements",
    "adjust": "Adjust Stock",
    "adjustment_reason": "Reason for adjustment",
    "qty_on_hand": "Qty On Hand",
    "low_stock": "Low Stock",
    "out_of_stock": "Out of Stock",
    "log_added": "{{user}} added {{qty}} of {{product}} via {{reference}}",
    "log_removed": "{{user}} removed {{qty}} of {{product}} via {{reference}}"
  },
  "customers": {
    "title": "Customers",
    "subtitle": "View and manage your customers",
    "name": "Name",
    "phone": "Phone",
    "address": "Address",
    "orders": "Orders",
    "debt": "Debt",
    "blocked": "Blocked",
    "block": "Block",
    "unblock": "Unblock",
    "view_purchases": "View Purchases",
    "record_payment": "Record Payment",
    "payment_amount": "Payment Amount",
    "debt_history": "Debt History",
    "no_debt": "No debt"
  },
  "charges": {
    "title": "Charges",
    "subtitle": "Track product-specific costs",
    "add_charge": "Add Charge",
    "description": "Description",
    "amount": "Amount",
    "product": "Linked Product",
    "date": "Date",
    "linked_by": "Added By"
  }
}

production.json (en example):
{
  "dashboard": {
    "title": "Production Dashboard",
    "total_production_cost": "Total Production Cost",
    "total_components_used": "Total Components Used",
    "components_stock_value": "Components Stock Value",
    "active_recipes": "Active Recipes",
    "cost_over_time": "Cost Over Time",
    "component_breakdown": "Component Breakdown"
  },
  "suppliers": {
    "title": "Suppliers",
    "subtitle": "Manage your vendors and balances",
    "add_supplier": "Add Supplier",
    "name": "Supplier Name",
    "contact": "Contact Person",
    "phone": "Phone",
    "email": "Email",
    "payment_terms": "Payment Terms (days)",
    "balance_due": "Balance Due",
    "notes": "Notes"
  },
  "components": {
    "title": "Components",
    "subtitle": "Raw materials and production inputs",
    "add_component": "Add Component",
    "name": "Component Name",
    "name_ar": "Name (Arabic)",
    "name_fr": "Name (French)",
    "unit": "Unit",
    "units": {
      "kg": "Kilogram (kg)",
      "g": "Gram (g)",
      "l": "Liter (L)",
      "ml": "Milliliter (mL)",
      "pcs": "Pieces (pcs)",
      "m": "Meter (m)"
    },
    "cost_price": "Cost per Unit",
    "stock": "Stock",
    "low_stock": "Low Stock"
  },
  "recipes": {
    "title": "Recipes",
    "subtitle": "Define production formulas",
    "add_recipe": "Add Recipe",
    "name": "Recipe Name",
    "name_ar": "Name (Arabic)",
    "name_fr": "Name (French)",
    "notes": "Notes",
    "inputs": "Components Used",
    "outputs": "Products Produced",
    "charges": "Recipe Charges",
    "add_input": "Add Component",
    "add_output": "Add Output Product",
    "add_charge": "Add Charge",
    "execute": "Execute Recipe",
    "execute_confirm": "This will deduct components and add products to stock. Continue?",
    "history": "Execution History",
    "executed_at": "Executed At",
    "executed_by": "Executed By",
    "total_cost": "Total Cost"
  },
  "whatsapp": {
    "title": "WhatsApp",
    "subtitle": "Connect and send messages to customers",
    "connect": "Connect WhatsApp",
    "scan_qr": "Scan this QR code with your WhatsApp",
    "connected": "Connected",
    "disconnected": "Disconnected",
    "phone_number": "Connected Number",
    "compose": "Compose Message",
    "templates": "Templates",
    "history": "Sent History",
    "recipients_all": "All Customers",
    "recipients_select": "Select Individually",
    "recipients_by_product": "By Product Purchase",
    "send_now": "Send Now",
    "add_template": "Add Template",
    "template_name": "Template Name",
    "template_body": "Message Body",
    "variables_hint": "Use {{customer_name}}, {{product_name}}, {{product_url}}",
    "product_url": "Product URL",
    "sent_at": "Sent At",
    "recipients_count": "Recipients",
    "message_status": "Status"
  }
}

admin.json (en example):
{
  "users": {
    "title": "Users",
    "subtitle": "Manage team members and their access",
    "add_user": "Add User",
    "edit_user": "Edit User",
    "full_name": "Full Name",
    "email": "Email",
    "password": "Password",
    "password_hint": "Password will be shown only once. Save it securely.",
    "role": "Role",
    "branch": "Branch",
    "last_login": "Last Login",
    "never_logged": "Never logged in",
    "delete_user": "Delete User",
    "deactivate_user": "Deactivate User",
    "reset_password": "Reset Password",
    "new_password": "New Password (generated)",
    "roles": {
      "super_admin": "Super Admin",
      "super_admin_desc": "Full access to all sections and settings",
      "commerce_manager": "Commerce Manager",
      "commerce_manager_desc": "Full access to the Commerce section",
      "production_manager": "Production Manager",
      "production_manager_desc": "Full access to the Production section",
      "cashier": "Cashier",
      "cashier_desc": "Can process sales and view customers only",
      "warehouse_agent": "Warehouse Agent",
      "warehouse_agent_desc": "Can view and adjust stock only",
      "viewer": "Viewer",
      "viewer_desc": "Read-only access to all sections"
    }
  }
}

FR and AR: translate all keys above fully. AR must be correct Modern Standard Arabic.

[0.5] DATABASE MIGRATION
Create file: supabase/migrations/020_v2_schema.sql

Write SQL to:
1. Add column to customers table:
   ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
   ALTER TABLE customers ADD COLUMN IF NOT EXISTS debt_amount NUMERIC(12,2) DEFAULT 0;

2. Create commands table:
   CREATE TABLE IF NOT EXISTS commands (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
     customer_id UUID REFERENCES customers(id),
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_transit','delivered','cancelled')),
     yalidin_tracking_id TEXT,
     delivery_address TEXT,
     notes TEXT,
     total NUMERIC(12,2) DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

3. Create command_items table:
   CREATE TABLE IF NOT EXISTS command_items (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     command_id UUID REFERENCES commands(id) ON DELETE CASCADE,
     product_id UUID REFERENCES products(id),
     variant_id UUID REFERENCES product_variants(id),
     quantity INTEGER NOT NULL DEFAULT 1,
     unit_price NUMERIC(12,2) NOT NULL DEFAULT 0
   );

4. Create components table:
   CREATE TABLE IF NOT EXISTS components (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     name_ar TEXT,
     name_fr TEXT,
     unit TEXT NOT NULL DEFAULT 'pcs',
     cost_price NUMERIC(12,2) DEFAULT 0,
     quantity_in_stock NUMERIC(12,3) DEFAULT 0,
     reorder_level NUMERIC(12,3) DEFAULT 0,
     status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

5. Create recipes table:
   CREATE TABLE IF NOT EXISTS recipes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     name_ar TEXT,
     name_fr TEXT,
     notes TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

6. Create recipe_items (inputs — components used):
   CREATE TABLE IF NOT EXISTS recipe_items (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
     component_id UUID REFERENCES components(id),
     quantity_used NUMERIC(12,3) NOT NULL DEFAULT 1
   );

7. Create recipe_outputs (products produced):
   CREATE TABLE IF NOT EXISTS recipe_outputs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
     product_id UUID REFERENCES products(id),
     variant_id UUID REFERENCES product_variants(id),
     quantity_produced INTEGER NOT NULL DEFAULT 1
   );

8. Create recipe_charges (costs per recipe):
   CREATE TABLE IF NOT EXISTS recipe_charges (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
     description TEXT NOT NULL,
     amount NUMERIC(12,2) NOT NULL DEFAULT 0
   );

9. Create recipe_executions (history):
   CREATE TABLE IF NOT EXISTS recipe_executions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     recipe_id UUID REFERENCES recipes(id),
     company_id UUID REFERENCES companies(id),
     executed_by UUID REFERENCES profiles(id),
     executed_at TIMESTAMPTZ DEFAULT NOW(),
     total_cost NUMERIC(12,2) DEFAULT 0
   );

10. Create product_charges table (Commerce charges linked to product):
    CREATE TABLE IF NOT EXISTS product_charges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      description TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

11. Create customer_debt_payments:
    CREATE TABLE IF NOT EXISTS customer_debt_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

12. Create whatsapp_sessions:
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      phone_number TEXT,
      is_connected BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

13. Create whatsapp_templates:
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

14. Create whatsapp_messages:
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      template_id UUID REFERENCES whatsapp_templates(id),
      recipients_count INTEGER DEFAULT 0,
      message_body TEXT,
      status TEXT DEFAULT 'sent',
      sent_at TIMESTAMPTZ DEFAULT NOW()
    );

15. Update profiles role check to include new roles:
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('super_admin','commerce_manager','production_manager','cashier','warehouse_agent','viewer','moderator','employee'));

[0.6] SHARED UI COMPONENTS

StatusToggle.tsx:
  Props: { checked: boolean, onToggle: () => void, disabled?: boolean }
  Renders a Switch (Radix) with a green dot when active, gray when inactive
  Shows "Active" / "Inactive" label next to the switch using i18n (common.status.active/inactive)
  The toggle fires onToggle() immediately (optimistic update)

ConfirmDialog.tsx:
  Props: { open: boolean, onConfirm: () => void, onCancel: () => void, title: string, description: string, confirmLabel?: string, confirmVariant?: 'destructive'|'default' }
  Uses Radix Dialog. Confirm button in destructive red by default.
  Cancel button uses ghost variant.
  Fully keyboard accessible (Escape to cancel).

SectionCard.tsx:
  Props: { title: string, value: string|number, icon: React.ReactNode, trend?: string, color?: 'blue'|'purple'|'green'|'red'|'yellow' }
  A clean KPI card with icon top-right, large value, title below, optional trend text.
  Default border-left color matches the "color" prop.

InlineSearch.tsx:
  Props: { value: string, onChange: (v: string) => void, placeholder?: string, onBarcodeScan?: (barcode: string) => void }
  Input with search icon on left.
  If onBarcodeScan is provided, attach useBarcodeScanner hook.
  Debounce: 300ms before onChange fires.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Sidebar shows two sections (Commerce + Production) with sub-links working
✅ Commands and Inventory sub-links expand/collapse in the sidebar
✅ All new routes load (placeholder pages show "Coming Soon" card)
✅ Language switch between EN / FR / AR works with no hardcoded strings in new components
✅ Arabic switches to RTL layout (sidebar on right, text aligned right)
✅ All 9 locale JSON files exist with complete keys
✅ Migration file 020_v2_schema.sql exists with all 15 SQL blocks
✅ Four new shared UI components exist and are exported from src/components/ui/
✅ App compiles with no TypeScript errors (run: npx tsc --noEmit)
✅ No existing functionality is broken

DO NOT touch: any feature page files, any Supabase query logic, any existing locale keys.
```

---

## ═══════════════════════════════════════════════
## PHASE 1 — Commerce Dashboard (Live Data)
## ═══════════════════════════════════════════════

```
Execute Phase 1 — Commerce Dashboard (Live Data) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Workspace: c:\Users\mouadh\Desktop\abd-stock
- Stack: React 19 + TypeScript + Vite + Supabase + TailwindCSS + Recharts
- Phase 0 is COMPLETE: new sidebar, routes, locale files, and DB migration all exist
- Use i18n namespace: 'commerce' (already created in Phase 0)
- t('commerce:dashboard.xyz') syntax
- Section color for Commerce: blue (#3b82f6)
- DO NOT touch any files outside the scope below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY:
  src/features/dashboard/pages/DashboardPage.tsx   (full rebuild — was placeholder)

CREATE:
  src/features/dashboard/components/KpiCard.tsx
  src/features/dashboard/components/SalesCostChart.tsx
  src/features/dashboard/components/BestCustomersTable.tsx
  src/features/dashboard/components/ProductFilterSelect.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1.1] LAYOUT
- Page title: t('commerce:dashboard.title')
- Subtitle: t('commerce:dashboard.subtitle') — e.g. "Live analytics for your commerce operations"
- Top filter bar (always visible, sticky):
  - Left: Product dropdown (all products from v_product_stock; selecting one filters ALL data on the page)
  - Right: Date range selector: 7 days / 30 days / 90 days (default: 30 days)
- Below filter bar: 4 KPI cards in a row
- Below KPI cards: chart row (Sales vs Costs chart + Best Customers table side by side)

[1.2] KPI CARDS (use SectionCard.tsx from Phase 0)
Card 1 — Total Sales (count)
  - Query: SELECT COUNT(*) FROM sales_orders WHERE company_id = ? AND status != 'cancelled' AND created_at >= startDate
  - If product filter is active: join sales_order_items and filter by product_id
  - Icon: ShoppingCart (lucide), color: blue

Card 2 — Total Revenue
  - Query: SELECT SUM(total) FROM sales_orders WHERE conditions above
  - Format with formatCurrency()
  - Icon: DollarSign, color: green

Card 3 — Total Items Sold
  - Query: SELECT SUM(soi.quantity) FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.sales_order_id WHERE so.company_id = ? AND so.status != 'cancelled' AND created_at >= startDate [AND soi.product_id = ? if filter active]
  - Icon: Package, color: blue

Card 4 — Total Stock
  - Query: SELECT SUM(total_qty_on_hand) FROM v_product_stock WHERE company_id = ? [AND product_id = ? if filter active]
  - Shows current stock (not filtered by date — it's the live snapshot)
  - Icon: Archive, color: purple

[1.3] SALES vs COSTS CHART (SalesCostChart.tsx)
- Recharts LineChart with TWO lines:
  Line 1 (blue, solid): "Revenue" — daily SUM(sales_orders.total) grouped by DATE(created_at)
  Line 2 (red, dashed): "Costs" — daily SUM(product_charges.amount) grouped by charge_date + SUM(purchase_order_items.unit_cost * quantity) grouped by DATE(po.created_at)
- X axis: dates (dd/MM format)
- Y axis: amounts in DZD (or company currency)
- Tooltip: shows both Revenue and Costs for hovered date
- Legend: "Revenue" / "Costs" labels (translated)
- If product filter is active: filter both lines to that product only
- Date range: follows the dashboard filter
- Title: t('commerce:dashboard.sales_vs_costs')
- Card container: takes 60% of the row width
- Handle empty data gracefully (show "No data for this period" centered text)

[1.4] BEST CUSTOMERS TABLE (BestCustomersTable.tsx)
- Supabase query: FROM sales_orders, group by customer_id, sum total, count orders, join customers for name
  SELECT c.name, COUNT(so.id) as order_count, SUM(so.total) as total_spent
  FROM sales_orders so JOIN customers c ON c.id = so.customer_id
  WHERE so.company_id = ? AND so.status != 'cancelled' AND so.created_at >= startDate
  GROUP BY c.id, c.name ORDER BY total_spent DESC LIMIT 5
- Render as a simple table (NOT using the heavy Table component — just a clean div-based list):
  # | Name | Orders | Total Spent
  Row 1 gets a 🥇 gold badge, Row 2 🥈, Row 3 🥉
- Title: t('commerce:dashboard.best_customers')
- Card container: takes 40% of the row width
- If customer filter was active (from product), show note "Showing customers who purchased [Product Name]"
- Handle empty: "No sales data yet"

[1.5] PRODUCT FILTER SELECT (ProductFilterSelect.tsx)
- Fetches products from v_product_stock WHERE company_id = ?
- Renders a Select dropdown with options: "All Products" (default, value='all') + one option per product (value=product_id, label=product name)
- When changed, updates productFilter state in parent
- Searchable: user can type to filter options in the dropdown
- Translated placeholder: t('commerce:dashboard.filter_by_product')

[1.6] DATA FETCHING RULES
- Use TanStack Query (useQuery) for ALL queries
- Query keys must include all filter params: ['dashboard-kpis', company?.id, dateRange, productFilter]
- Error state: show a red error card "Failed to load data. Please retry."
- Loading state: show skeleton placeholders (animate-pulse gray boxes same size as final content)
- DO NOT use random/dummy data anywhere — all data must come from Supabase

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All 4 KPI cards show real numbers from Supabase (0 if no data, not placeholder)
✅ Chart shows two lines — even if both are empty/zero, they render without crashing
✅ Product dropdown filters ALL four KPIs + both chart lines + best customers table simultaneously
✅ Date range filter (7/30/90 days) updates all data
✅ Best customers table shows top 5 with medal badges
✅ All labels are translated (no hardcoded English strings)
✅ Loading skeletons shown while data is fetching
✅ Error handling visible if query fails
✅ No TypeScript errors

DO NOT touch: Sidebar, Topbar, App.tsx, any other feature files.
```

---

## ═══════════════════════════════════════════════
## PHASE 2 — Commerce: Products (Simplified)
## ═══════════════════════════════════════════════

```
Execute Phase 2 — Commerce Products (Simplified UI + Inline Variants) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Workspace: c:\Users\mouadh\Desktop\abd-stock
- Phase 0 is COMPLETE: locale files exist (commerce.json), StatusToggle.tsx exists
- i18n namespace: 'commerce', keys under commerce.products.*
- Section color: blue
- DO NOT touch any files outside scope.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY:
  src/features/products/pages/ProductsPage.tsx     (full rebuild)
  src/features/products/components/ProductForm.tsx (full rebuild — remove 4 tabs)

CREATE:
  src/features/products/components/ProductVariantRow.tsx

DELETE LOGIC FROM:
  src/features/products/components/ProductVariantsModal.tsx → replace with inline expand

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2.1] PRODUCTS PAGE — TABLE
Layout: Title (t('commerce:products.title')) + subtitle → Search (InlineSearch from Phase 0) + filter bar → Table → Pagination

Table columns:
  Image (40×40 thumbnail, or blank square placeholder)
  Product Name + Name in smaller text below (show the FR/AR name if available)
  SKU
  Sell Price (formatCurrency)
  Cost Price (formatCurrency)
  Stock (total_qty_on_hand from v_product_stock — color red if ≤ reorder_level)
  Status — use StatusToggle.tsx inline in the row (toggles active↔inactive immediately via Supabase update)
  Actions — two icon buttons: Edit (pencil), Expand Variants (chevron down — only if has_variants=true)

Filter bar:
  - Search by name or SKU (InlineSearch, supports barcode scanner via onBarcodeScan hook)
  - Filter: All / Active / Inactive (pill buttons)
  - Filter: All / Low Stock / Out of Stock (pill buttons)

Variants expand (inline accordion):
  - When user clicks the chevron icon on a row, a sub-section expands BELOW that row (accordion style)
  - It shows all variants as ProductVariantRow.tsx (see [2.3])
  - At the bottom of the expanded area: a small "+" Add Variant button
  - Only one product's variants can be expanded at a time (clicking another collapses the current one)

Import/Export:
  - Keep Export to Excel button (top right)
  - Keep Import button (opens file picker, same logic as before)
  - Move both to a "..." dropdown menu next to the Add Product button to keep the header clean

Add/Edit Product:
  - "Add Product" button opens a Dialog (modal) with ProductForm inside
  - Clicking the Edit icon on a row also opens the same Dialog with initialData
  - Dialog max width: 640px, max height: 90vh, scrollable

[2.2] PRODUCT FORM — SINGLE PAGE (no tabs)
Remove: ALL tabs. Everything on one scrollable page in a clean two-column grid.

Left column top: Image upload (click to upload square, 120×120, shows preview)
Right column top: Product Name (required), Name AR, Name FR (in a 3-input group)

Row 2: SKU | Barcode (side by side)
Row 3: Cost Price | Sell Price (side by side)
Row 4: Reorder Level | Status (Select: Active / Inactive, default: Active)
Row 5: Has Variants? (Switch toggle — if ON, show variant list section below)

REMOVED FIELDS (do not include):
  wholesale_price, min_sell_price, tax_rate, max_stock, min_stock,
  has_serials, has_batches, track_expiry, is_service, description (optional — move to a collapsible "More Details" if needed)

Variant section (only visible when has_variants = true):
  - Shows current variants (fetched if editing existing product)
  - Each variant row: Name | SKU | Barcode | Cost | Sell Price | Remove button
  - "Add Variant" button adds a new empty row
  - Variants are saved/updated when the form submits
  - Use useFieldArray (react-hook-form) for variant rows

Form footer: Cancel button (ghost) | Save button (primary, shows spinner while submitting)

Zod schema for the form:
{
  name: z.string().min(1),
  name_ar: z.string().optional(),
  name_fr: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  cost_price: z.coerce.number().min(0),
  sell_price: z.coerce.number().min(0),
  reorder_level: z.coerce.number().min(0).default(5),
  status: z.enum(['active','inactive']).default('active'),
  has_variants: z.boolean().default(false),
  image_url: z.string().optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    cost_price: z.coerce.number().min(0),
    sell_price: z.coerce.number().min(0),
    status: z.enum(['active','inactive']).default('active'),
  })).optional()
}

Submit logic:
  - If editing: update products table, upsert product_variants
  - If creating: insert products, then insert product_variants
  - On success: close dialog, refetch products list, show toast "Product saved successfully"
  - On error: show toast with error message (no alert())

[2.3] PRODUCT VARIANT ROW (ProductVariantRow.tsx)
Used in the inline variant expand in the products table.

Props:
  variant: { id, name, sku, barcode, cost_price, sell_price, status, product_id }
  onStatusToggle: (variantId: string, newStatus: 'active'|'inactive') => void
  onEdit: (variant) => void

Display:
  Left: variant name (bold) + sku in smaller text below
  Middle: Barcode | Cost Price | Sell Price (three columns)
  Right: StatusToggle (same as product row) | Edit icon button

Edit behavior:
  - Clicking Edit turns the row into an inline edit form (replace display with inputs)
  - Row edit fields: Name | SKU | Barcode | Cost Price | Sell Price
  - Two buttons appear: Save (check icon) | Cancel (x icon)
  - Save calls supabase.from('product_variants').update() then turns row back to display mode
  - NO separate modal for variant edit

[2.4] STATUS TOGGLE BEHAVIOR
- When user toggles product status in the table:
  1. Optimistically update UI immediately (don't wait for Supabase)
  2. Call supabase.from('products').update({ status: newStatus }).eq('id', productId)
  3. If error: revert UI + show error toast
  4. If success: invalidate ['products'] query silently
- Same logic for variant status toggle (table: product_variants)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Products table loads from Supabase with correct columns
✅ Status toggle in table row works without opening any dialog
✅ Clicking chevron expands variant rows inline (accordion)
✅ Each variant row has its own status toggle and inline edit
✅ Add Product opens a single-page form (no tabs)
✅ Edit Product pre-fills form with existing data
✅ Variants can be added/removed in the form and save correctly
✅ Import/Export moved to "..." dropdown
✅ All text translated — no hardcoded strings
✅ No TypeScript errors
✅ No alert() calls — all feedback via toast

DO NOT touch: Dashboard, Sales, Sidebar, Topbar, App.tsx.
```

---

## ═══════════════════════════════════════════════
## PHASE 3 — Commerce: Sales (Bug Fixes + Features)
## ═══════════════════════════════════════════════

```
Execute Phase 3 — Commerce Sales (Bug Fixes + Price Override + Barcode + Inline Customer) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Workspace: c:\Users\mouadh\Desktop\abd-stock
- Phase 0 complete: InlineSearch exists (with barcode scanner support)
- Phase 0 complete: ConfirmDialog exists
- i18n namespace: 'commerce', keys under commerce.sales.*
- DO NOT touch files outside scope.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY:
  src/features/sales/pages/SalesPage.tsx
  src/features/sales/components/SalesForm.tsx

CREATE:
  src/features/sales/components/QuickAddCustomerForm.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[3.1] SALES PAGE — TABLE
- Keep all existing columns: Order #, Date, Customer, Status, Total, Paid, Due, Actions
- Fix: "Walk-in Customer" must use i18n key: t('commerce:sales.walk_in')
- Actions column: keep Receipt icon (charges) + PDF icon. Add an eye icon to view order details (future phase — for now just disabled/placeholder)
- Search: replace current Input with InlineSearch component
- Advanced filter: keep as-is (Status, Payment Status, Amount range)
- Export: keep Excel export

[3.2] SALES FORM — PRICE OVERRIDE
In the cart items list, each line item must have:
  - Product name (display only)
  - Quantity input (editable, minimum 1)
  - Unit Price input (EDITABLE — user can change it from the catalog price)
    - Default: filled with product.sell_price from catalog
    - When changed: grand total recalculates immediately
    - Input label: t('commerce:sales.price_override')
    - Style: border-orange-400 when value differs from catalog price (visual signal)
  - Line subtotal (qty × unit_price, calculated, display only)
  - Remove button (trash icon)

[3.3] SALES FORM — BARCODE SCANNER
- Replace the product search Input with InlineSearch component (onBarcodeScan prop)
- When barcode scanned (hardware scanner or manual entry + Enter):
  1. Query Supabase: SELECT * FROM v_product_stock WHERE barcode = scannedValue AND company_id = ? LIMIT 1
  2. If found: addProductToCart(product) immediately (same logic as clicking from dropdown)
  3. If NOT found: show a toast warning: t('commerce:sales.product_not_found_barcode') — "No product found for barcode: [value]"
  4. Clear the search input after scan
- Text search still works for name: shows dropdown results as before

[3.4] SALES FORM — INLINE CUSTOMER CREATION
- Customer select dropdown: below the options list, always show a fixed item at the bottom:
  "➕ Add new customer" — clicking this opens a small inline card (NOT a Dialog — it appears below the dropdown)
  
  QuickAddCustomerForm.tsx:
    - Fields: Full Name (required), Phone (required)
    - Submit button: "Add & Select"
    - Cancel button
    - On submit:
      1. Insert into customers table: { name, phone, company_id, is_active: true }
      2. On success: close the mini form, set the new customer as selected in the sales form, show toast "Customer added"
      3. Refetch customers list
    - Validation: name min 2 chars, phone min 9 chars (Algerian format)

[3.5] BUG FIXES
Bug 1 — amount_paid auto-fill:
  When payment_status changes to 'paid': set amount_paid = grandTotal
  When payment_status changes to 'pending': set amount_paid = 0
  When payment_status changes to 'partial': DO NOT change amount_paid (let user enter manually)
  These state updates must happen AFTER grandTotal is recalculated (use useEffect or watch correctly)

Bug 2 — due amount calculation:
  dueAmount = grandTotal - amountPaid
  If dueAmount < 0: show it as 0 (cannot have negative due — that would mean overpayment, handle gracefully)
  Display dueAmount: show in red if > 0, green if = 0

Bug 3 — empty cart guard:
  Submit button is disabled when: fields.length === 0 OR form.formState.isSubmitting
  If somehow submitted with empty cart (shouldn't happen): show toast error, do not call Supabase

Bug 4 — customer debt update:
  After sale is created, if due_amount > 0:
    UPDATE customers SET debt_amount = debt_amount + due_amount WHERE id = customer_id
  This should happen server-side (DB trigger if possible) OR in the submit function after order is created.
  Check if the DB trigger already handles this — if yes, document it. If not, add the update call after insert.

[3.6] RECEIPT AFTER SALE
After successful sale submit:
  - Close the sales dialog
  - Show a toast: "Sale completed! Order: SO-XXXX" with an action button "Print Receipt"
  - Clicking "Print Receipt" calls generateInvoicePDF(order, company, 'Sale')
  - The toast should stay visible for 8 seconds (not auto-dismiss in 3s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Each cart item has an editable unit price that recalculates totals in real-time
✅ Price changed from catalog value shows orange border indicator
✅ Barcode scanner auto-adds product to cart; shows warning toast if not found
✅ "Add new customer" in dropdown opens inline mini form; new customer auto-selected
✅ Payment status changes correctly set amount_paid
✅ due_amount is always ≥ 0 (no negative values shown)
✅ Empty cart blocks form submission
✅ After sale: receipt print option available via toast action
✅ Walk-in Customer string is translated
✅ No alert() — all feedback via toast
✅ No TypeScript errors

DO NOT touch: Dashboard, Products, Sidebar, Topbar, App.tsx.
```

---

## ═══════════════════════════════════════════════
## PHASE 4 — Commerce: Commands + Yalidin API
## ═══════════════════════════════════════════════

```
Execute Phase 4 — Commerce Commands (3 Sub-pages + Yalidin API Integration) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Workspace: c:\Users\mouadh\Desktop\abd-stock
- Phase 0 complete: commands and command_items tables exist in DB (migration 020_v2_schema.sql)
- Routes exist (from Phase 0): /commerce/commands/create, /commerce/commands/en-cours, /commerce/commands/suivi
- i18n namespace: 'commerce', keys under commerce.commands.*
- Yalidin API: https://documenter.getpostman.com/view/14517169/Tz5je15g
- Yalidin API Key: A2f6u0zGFoV0iprNTdICKfHhnbPQa3DySQ2hiNULhlEZDn4gzArNtrgJcPUw
  Use as Bearer token: Authorization: Bearer [key]
- IMPORTANT: Before building, READ the Yalidin Postman docs to understand:
  a) The endpoint to CREATE a shipment (what fields are required)
  b) The endpoint to GET shipment STATUS by tracking ID
  c) What status values the API returns (map them to our statuses)
- DO NOT touch files outside scope.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE:
  src/lib/yalidin.ts
  src/features/commands/pages/CreateCommandPage.tsx
  src/features/commands/pages/EnCoursPage.tsx
  src/features/commands/pages/SuiviPage.tsx
  src/features/commands/components/CommandForm.tsx
  src/features/commands/components/CommandDetailPanel.tsx
  src/features/commands/components/CommandStatusBadge.tsx

MODIFY:
  src/App.tsx   (update placeholder routes to real components)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[4.1] YALIDIN API CLIENT (src/lib/yalidin.ts)
Create a typed API client with these functions:

const YALIDIN_BASE_URL = 'https://api.yalidin.com' // adjust to actual base URL from docs
const YALIDIN_KEY = 'A2f6u0zGFoV0iprNTdICKfHhnbPQa3DySQ2hiNULhlEZDn4gzArNtrgJcPUw'

async function createShipment(data: YalidinShipmentInput): Promise<YalidinShipmentResponse>
  - POST to the create endpoint (read docs for exact URL)
  - Headers: { Authorization: 'Bearer ' + YALIDIN_KEY, 'Content-Type': 'application/json' }
  - Body: map our command data to Yalidin's required format (read docs)
  - Returns: { tracking_id: string, status: string, ... }
  - On error: throw with message from API response

async function getShipmentStatus(trackingId: string): Promise<YalidinStatusResponse>
  - GET to the status endpoint
  - Returns: { tracking_id, status, last_event, estimated_delivery, ... }

Export both functions. Export type definitions for input/output.

[4.2] COMMAND FORM (CommandForm.tsx)
Used in CreateCommandPage.

Fields (single-page form):
  Customer: Select (all customers from customers table; "Walk-in" allowed)
  Quick Add Customer: same inline QuickAddCustomerForm from Phase 3 (import it)
  Delivery Address: Textarea (required)
  Products section: same product search + cart as SalesForm but simpler:
    - Search by name or barcode → add to list
    - Each item: Product name | Qty | Unit Price (editable) | Line Total | Remove
  Notes: Textarea (optional)

Totals summary at bottom: Subtotal | Grand Total

On submit:
  1. Insert into commands table: { company_id, customer_id, delivery_address, notes, total, status: 'pending' }
  2. Insert command_items: for each product in cart
  3. Call yalidin.createShipment() with the command data
     Map to Yalidin format (use customer name, delivery address, product names + quantities)
  4. If Yalidin succeeds: UPDATE commands SET yalidin_tracking_id = returned_id, status = 'confirmed'
  5. If Yalidin fails: keep command with status 'pending', show warning toast "Submitted internally, delivery service failed. Retry from En Cours page."
  6. Show success toast with command number

[4.3] CREATE COMMAND PAGE
- Title: t('commerce:commands.create_title')
- Contains: CommandForm centered in a card
- Breadcrumb: Commands > Create

[4.4] EN COURS PAGE
Layout: Title → Search + Status Filter → Table → Pagination

Table columns:
  Command # (auto-generated: CMD-YYYYMMDD-XXXX)
  Customer name
  Products (count: "3 items" — show tooltip with product names on hover)
  Status — CommandStatusBadge
  Tracking ID (click opens Suivi tab? Or shows a small popover with status)
  Created date
  Actions: Change Status dropdown inline + View Details button

Status filter pills: All | Pending | Confirmed | In Transit | Delivered | Cancelled

Inline status change:
  - Each row has a Select dropdown showing current status
  - Options: Pending / Confirmed / In Transit / Delivered / Cancelled
  - On change: UPDATE commands SET status = newStatus, updated_at = NOW()
  - Show toast on success

CommandDetailPanel.tsx:
  - A slide-out panel (not a modal) that opens on the right side when "View" is clicked
  - Shows: command info, all products in the command, delivery address, status history, notes
  - A "Submit to Delivery" button if yalidin_tracking_id is null (calls createShipment again)

[4.5] SUIVI PAGE
- Fetches all commands WHERE yalidin_tracking_id IS NOT NULL from local DB
- For each, calls getShipmentStatus() from yalidin.ts
- Auto-refreshes every 60 seconds (use setInterval in useEffect, cleanup on unmount)
- Show a "Last refreshed: X seconds ago" counter

Table columns:
  Tracking ID (monospace font)
  Customer name (from our DB)
  API Status (from Yalidin — use their exact status string, colored badge)
  Our Status (from commands table — may differ from API status)
  Last API Update (timestamp from API response)
  Estimated Delivery (from API, if available — show "-" if not)

Status sync button: "Sync All" button that manually triggers re-fetch of all statuses and updates local commands.status if API shows 'delivered'

[4.6] COMMAND STATUS BADGE
CommandStatusBadge.tsx — Props: { status: string, source?: 'local'|'api' }
  pending = gray badge
  confirmed = blue badge
  in_transit = yellow/orange badge
  delivered = green badge
  cancelled = red badge
If source='api': show a small "API" label next to the badge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Create Command form submits to Supabase AND attempts Yalidin API call
✅ En Cours page loads from Supabase with correct columns
✅ Status can be changed inline in the table row
✅ CommandDetailPanel slides out with full order details
✅ Suivi page fetches and displays Yalidin API tracking data
✅ Suivi page auto-refreshes every 60 seconds
✅ All text translated
✅ yalidin.ts exports typed API functions with error handling
✅ No TypeScript errors

DO NOT touch: Dashboard, Products, Sales, Sidebar other than route wiring.
```

---

## ═══════════════════════════════════════════════
## PHASE 5 — Commerce: Inventory (2 Sub-pages)
## ═══════════════════════════════════════════════

```
Execute Phase 5 — Commerce Inventory (Stock View + Stock Logs) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Workspace: c:\Users\mouadh\Desktop\abd-stock
- Phase 0 routes: /commerce/inventory/stock and /commerce/inventory/logs exist as placeholders
- i18n keys: commerce.inventory.* (already in commerce.json)
- stock_movements table exists in DB (from original schema)
- v_product_stock view exists

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE:
  src/features/inventory/pages/StockPage.tsx
  src/features/inventory/components/StockAdjustDialog.tsx

MODIFY:
  src/features/inventory/pages/StockMovementsPage.tsx  (humanize logs + i18n)
  src/App.tsx  (update placeholders to real components)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[5.1] STOCK PAGE
- Query: v_product_stock WHERE company_id = ? ORDER BY name
- Table columns:
  Product Name + SKU below
  Unit Cost (avg_cost)
  Qty On Hand (color: red if ≤ reorder_level, yellow if ≤ reorder_level*2, green otherwise)
  Stock Status badge (In Stock / Low Stock / Out of Stock)
  Variants count (if has_variants: show count, click to expand)
  Actions: "Adjust" button
- Expandable variants: same accordion as Products page — shows variant stock levels
- Filter pills: All / Low Stock / Out of Stock
- Search: by name or SKU (InlineSearch)
- NO status toggle — stock is read-only here (status is managed in Products page)

StockAdjustDialog.tsx:
  Props: { product, isOpen, onClose, onSuccess }
  Fields:
    Adjustment type: Select → "Add Stock (+)" or "Remove Stock (-)"
    Quantity: Number input (min: 1)
    Reason: Select → Inventory Count / Damaged / Found / Other (+ optional notes field)
  On submit:
    1. INSERT INTO stock_movements (company_id, product_id, quantity, transaction_type='adjustment', unit_cost=avg_cost, reference_id='ADJ-'+timestamp, transaction_date=TODAY)
       If type = "Remove Stock": quantity is negative
    2. Show toast "Stock adjusted successfully"
    3. Refetch stock data

[5.2] STOCK LOGS PAGE (StockMovementsPage.tsx rebuild)
- Query: stock_movements JOIN products JOIN profiles (for created_by) WHERE company_id = ?
- Transform each movement into a human-readable sentence:
  Format in current language using i18n:
  
  transaction_type = 'purchase' and quantity > 0:
    t('commerce:inventory.log_added', { user: profile.full_name, qty: qty, product: product.name, reference: reference_id })
    → "[Ahmed] added 50 of [Widget A] via [PO-123]"
  
  transaction_type = 'sale' and quantity < 0:
    t('commerce:inventory.log_removed', { user: 'Sale', qty: abs(qty), product: product.name, reference: reference_id })
    → "Sale removed 3 of [Widget A] via [SO-456]"
  
  transaction_type = 'adjustment' and quantity > 0:
    → "[Ahmed] adjusted +[qty] of [product] (Reason: [reference_id])"
  
  transaction_type = 'adjustment' and quantity < 0:
    → "[Ahmed] adjusted -[qty] of [product] (Reason: [reference_id])"

- Table columns:
  Date (dd/MM/yyyy HH:mm — show time too)
  Product (name + SKU below)
  Movement description (the human-readable sentence above)
  Qty (with green ↑ for positive, red ↓ for negative, arrow icon)
  Unit Cost
  Total Value (abs(qty) × unit_cost)
  
- Filter: by transaction_type (All / Purchase / Sale / Adjustment / Transfer / Return)
- Filter: by date range (date picker or 7/30/90 days selector)
- Search: by product name or SKU
- Export: Excel button

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Stock page shows all products with real stock levels from v_product_stock
✅ Low/out-of-stock items are visually highlighted (red/yellow qty)
✅ Adjust dialog creates a stock_movements record with correct sign
✅ Stock Logs page shows human-readable sentences for each movement
✅ Time is shown in stock log timestamps (not just date)
✅ All text translated
✅ No TypeScript errors

DO NOT touch: other commerce pages.
```

---

## ═══════════════════════════════════════════════
## PHASE 6 — Commerce: Customers (Detail + Debt)
## ═══════════════════════════════════════════════

```
Execute Phase 6 — Commerce Customers (View/Block + Debt Tracking + Purchase History) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Phase 0: customers table has is_blocked and debt_amount columns
- Phase 0: customer_debt_payments table exists
- Phase 3: Customers are added ONLY from the Sales form (QuickAddCustomerForm)
- i18n keys: commerce.customers.* (in commerce.json)
- DO NOT touch files outside scope.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY:
  src/features/customers/pages/CustomersPage.tsx   (rebuild — remove Add button, add block, add debt)

CREATE:
  src/features/customers/components/CustomerDetailPanel.tsx
  src/features/customers/components/CustomerDebtSection.tsx
  src/features/customers/components/CustomerPurchasesTable.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[6.1] CUSTOMERS LIST PAGE
REMOVE: "Add Customer" button (customers only added from Sales page)
Table columns:
  Name (click → opens CustomerDetailPanel)
  Phone
  Address (truncated to 30 chars with tooltip on hover)
  Orders count (number of completed orders)
  Debt (debt_amount — red if > 0, "-" if 0)
  Status: Active badge (green) or Blocked badge (red) with block/unblock button

Block/Unblock:
  - Button in row: shows lock icon if blocked, unlock icon if active
  - Click → ConfirmDialog: "Block this customer? They won't be selectable in new sales."
  - On confirm: UPDATE customers SET is_blocked = true/false
  - Optimistic update UI
  - Blocked customers show red row background tint

Filter: All / Active / Blocked / Has Debt (pill buttons)
Search: by name or phone

[6.2] CUSTOMER DETAIL PANEL (CustomerDetailPanel.tsx)
- A right-side slide-out drawer (NOT a full page — use CSS transform slide-in animation)
- Width: 560px, full height, scrollable content
- Header: Customer name + status badge + Close (X) button
- Tabs inside the panel: Info | Purchases | Debt

Tab 1 — Info:
  Editable form: Name, Phone, Address
  Save button → UPDATE customers
  Status badge + Block/Unblock button

Tab 2 — Purchases (CustomerPurchasesTable.tsx):
  Query: sales_orders WHERE customer_id = ? ORDER BY created_at DESC
  Table: Order # | Date | Total | Paid | Due | Status badge
  Search: by order number or date
  Filter: by payment status (Paid/Partial/Pending)
  Click on row: open PDF invoice (calls generateInvoicePDF)

Tab 3 — Debt (CustomerDebtSection.tsx):
  Summary: "Current Debt: [debt_amount] DZD" in a red box (or green if 0)
  Payment history table:
    Query: customer_debt_payments WHERE customer_id = ?
    Columns: Date | Amount Paid | Notes | Recorded By
  "Record Payment" button → opens small inline form:
    Fields: Amount (required), Payment Date, Notes
    On submit:
      1. INSERT customer_debt_payments
      2. UPDATE customers SET debt_amount = debt_amount - amount WHERE id = customer_id
         (if result < 0: set to 0, not negative)
      3. Show toast "Payment recorded"
      4. Refetch debt payments + customer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ No "Add Customer" button on page
✅ Block/Unblock works with confirmation dialog
✅ Blocked customers show red tint
✅ Customer detail panel slides out from right
✅ Purchases tab shows customer's order history
✅ Debt tab shows current balance + history + record payment
✅ Recording payment deducts from debt_amount
✅ All text translated
✅ No TypeScript errors

DO NOT touch: Sales form, Products, other pages.
```

---

## ═══════════════════════════════════════════════
## PHASE 7 — Commerce: Charges
## ═══════════════════════════════════════════════

```
Execute Phase 7 — Commerce Charges (Product-linked Cost Tracking) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Phase 0: product_charges table exists in DB
- i18n keys: commerce.charges.* (in commerce.json)
- This page feeds data into the Commerce Dashboard "Costs" line chart (Phase 1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE:
  src/features/charges/pages/ChargesPage.tsx
  src/features/charges/components/ChargeForm.tsx
MODIFY:
  src/App.tsx (update /commerce/charges placeholder)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[7.1] CHARGES PAGE
Layout: Title → filters → table → pagination + total summary

Table columns:
  Date (charge_date)
  Product (name — from products table JOIN)
  Description
  Amount (red text, formatted currency)
  Added By (profile full_name)

Filter: by product (Select dropdown), by date range (7/30/90 days / custom)
Search: by description
Export to Excel button
Total at bottom right: "Total: [sum of filtered charges]" in red

[7.2] CHARGE FORM (ChargeForm.tsx)
"Add Charge" button → Dialog with form:

Fields:
  Description (required, text input)
  Amount (required, number input min=0.01)
  Charge Date (date input, default today)
  Product (required: Select dropdown from products table WHERE company_id=? AND status='active')
  Notes (optional textarea)

On submit:
  INSERT INTO product_charges (company_id, product_id, description, amount, charge_date, created_by)
  Show toast "Charge added"
  Refetch charges list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Table loads from product_charges with product name joined
✅ Form saves to product_charges with correct product_id
✅ Total sum shown at bottom
✅ Filter by product works
✅ All text translated
✅ No TypeScript errors
```

---

## ═══════════════════════════════════════════════
## PHASE 8 — Production: Dashboard
## ═══════════════════════════════════════════════

```
Execute Phase 8 — Production Dashboard (Costs Only Analytics) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Phase 0: components, recipes, recipe_executions tables exist
- i18n namespace: 'production', keys under production.dashboard.*
- Section color: purple (#8b5cf6)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE:
  src/features/production/dashboard/pages/ProductionDashboardPage.tsx
MODIFY:
  src/App.tsx (update /production/dashboard)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[8.1] KPI CARDS (purple theme via SectionCard color='purple')
Card 1: Total Production Cost — SUM(re.total_cost) FROM recipe_executions WHERE company_id=? AND executed_at >= startDate
Card 2: Total Components Used — SUM of all component quantities used in executed recipes in period
Card 3: Components Stock Value — SUM(components.quantity_in_stock * components.cost_price) WHERE company_id=? (live snapshot)
Card 4: Active Recipes — COUNT(*) FROM recipes WHERE company_id=?

Date range filter: 7 / 30 / 90 days (same as commerce dashboard)

[8.2] COST OVER TIME CHART (BarChart)
- Recharts BarChart
- X axis: dates grouped by day (dd/MM)
- Y axis: cost in DZD
- Data: SUM(recipe_executions.total_cost) grouped by DATE(executed_at)
- Bar color: purple
- Title: t('production:dashboard.cost_over_time')

[8.3] COMPONENT BREAKDOWN CHART (PieChart / Donut)
- Shows which components cost the most (current stock value per component)
- Data: SELECT name, (quantity_in_stock * cost_price) as value FROM components WHERE company_id=? ORDER BY value DESC LIMIT 8
- Colors: 8 distinct purple shades
- Legend shows component name + percentage
- Title: t('production:dashboard.component_breakdown')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 4 KPI cards show real data from DB
✅ Bar chart shows cost by day
✅ Donut shows component value breakdown
✅ Date range filter updates all data
✅ Purple theme applied consistently
✅ All text translated (production namespace)
✅ No TypeScript errors
```

---

## ═══════════════════════════════════════════════
## PHASE 9 — Production: Suppliers (Simplified)
## ═══════════════════════════════════════════════

```
Execute Phase 9 — Production Suppliers (Simplified + Bug Fixes) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Existing suppliers table and SuppliersPage.tsx exist (v1)
- i18n: production.suppliers.* (in production.json)
- This is in the PRODUCTION section (route: /production/suppliers)
- Keep the same suppliers table in DB — just simplify the UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY:
  src/features/suppliers/pages/SuppliersPage.tsx
  src/features/suppliers/components/SupplierForm.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[9.1] TABLE (simplified columns)
  Name | Contact Person | Phone | Balance Due (red if > 0) | Status + toggle

Remove: trade_name column (keep in DB, just don't display)
Add: StatusToggle (same Active/Inactive inline toggle as products)

[9.2] FORM (simplified)
Remove: NIF, RC, AI, NIS number fields (legal fields — not needed here)
Keep: Name, Contact Name, Phone, Email, Payment Terms (days), Initial Balance, Notes, Is Active toggle
Form is a single-page Dialog (same pattern as ProductForm)

[9.3] BUG FIX — Balance
When a purchase order is paid/updated, the supplier's current_balance should reflect what is owed.
Check if a DB trigger exists for this. If yes, document. If not:
  After creating a purchase order with due_amount > 0:
    UPDATE suppliers SET current_balance = current_balance + due_amount WHERE id = supplier_id

[9.4] SEARCH + FILTER
  Search: by name or contact name
  Filter: Active / Inactive / Has Balance Due

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Table simplified — no trade_name column
✅ Status toggle works inline
✅ Form has no legal ID fields
✅ Search + filter work
✅ All text translated in production namespace
✅ No TypeScript errors
```

---

## ═══════════════════════════════════════════════
## PHASE 10 — Production: Components
## ═══════════════════════════════════════════════

```
Execute Phase 10 — Production Components (Raw Materials Management) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Phase 0: components table exists in DB
- i18n: production.components.* (in production.json)
- Route: /production/components

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE:
  src/features/production/components-mgmt/pages/ComponentsPage.tsx
  src/features/production/components-mgmt/components/ComponentForm.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[10.1] TABLE
Columns:
  Name (+ name_ar and name_fr in smaller text below if set)
  Unit (kg / pcs / L etc)
  Cost per Unit (formatted currency)
  Stock (qty_in_stock — red if ≤ reorder_level, yellow if ≤ reorder_level*2)
  Status — StatusToggle inline
  Actions: Edit button

Filter: All / Low Stock / Inactive
Search: by name (InlineSearch, all three names)
Import/Export Excel (in "..." dropdown)

[10.2] FORM
Single-page Dialog:
  Name (required) | Name AR | Name FR
  Unit: Select → kg / g / L / mL / pcs / m / cm
  Cost per Unit: number input
  Current Stock: number input (initial stock when adding)
  Reorder Level: number input (for low stock alert)
  Status: Active / Inactive

On create: INSERT INTO components
On edit: UPDATE components

[10.3] STATUS TOGGLE
Same pattern as products: optimistic update → Supabase → revert on error

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Components CRUD works
✅ Low stock highlighted
✅ Status toggle works inline
✅ Unit select has all 6 options
✅ All text translated (production namespace)
✅ No TypeScript errors
```

---

## ═══════════════════════════════════════════════
## PHASE 11 — Production: Recipes
## ═══════════════════════════════════════════════

```
Execute Phase 11 — Production Recipes (Production Formulas + Execute) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Phase 0: recipes, recipe_items, recipe_outputs, recipe_charges, recipe_executions tables exist
- Phase 10: components exist
- Phase 2: products and product_variants exist
- i18n: production.recipes.* (in production.json)
- Route: /production/recipes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE:
  src/features/production/recipes/pages/RecipesPage.tsx
  src/features/production/recipes/components/RecipeForm.tsx
  src/features/production/recipes/components/RecipeExecuteDialog.tsx
  src/features/production/recipes/components/RecipeHistoryPanel.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[11.1] RECIPES LIST PAGE
Table columns:
  Recipe name (+ name_ar / name_fr below)
  Components used (count — tooltip shows list)
  Products produced (count — tooltip shows list)
  Total Charges (sum of recipe_charges)
  Actions: Execute button (green play icon) | Edit button | History button

[11.2] RECIPE FORM
Dialog — single scrollable page with 4 sections:

Section 1 — Basic Info:
  Name (required) | Name AR | Name FR | Notes (textarea)

Section 2 — Components (Inputs):
  "Add Component" button
  Each row: Component Select dropdown | Quantity | Unit (auto-filled from component) | Remove
  Shows component's current stock in small text "(Available: X kg)"

Section 3 — Products (Outputs):
  "Add Output" button  
  Each row: Product Select | Variant Select (optional, only if product has_variants) | Qty Produced | Remove

Section 4 — Charges:
  "Add Charge" button
  Each row: Description | Amount | Remove
  Total: auto-calculated sum

Save: INSERT into recipes + recipe_items + recipe_outputs + recipe_charges (in transaction if possible, or sequential)

[11.3] EXECUTE RECIPE DIALOG
RecipeExecuteDialog.tsx:
  Props: { recipe, isOpen, onClose }
  
  Shows recipe summary:
    - Components needed: [name] × [qty] (Available: X — highlight red if insufficient stock)
    - Products to produce: [name] × [qty]
    - Charges total: [amount]
  
  Warning check: Before allowing execute, check each component has enough stock
    For each recipe_item: IF component.quantity_in_stock < recipe_item.quantity_used → show red warning row
    If any insufficient: show warning banner "Insufficient stock for some components" but ALLOW execution anyway (let user decide)
  
  Confirm button: "Execute Recipe"
  
  On confirm:
    1. For each recipe_item:
       UPDATE components SET quantity_in_stock = quantity_in_stock - quantity_used WHERE id = component_id
    2. For each recipe_output:
       INSERT INTO stock_movements (product_id, quantity=+qty_produced, transaction_type='recipe', reference_id='REC-'+recipe_id, unit_cost=0, company_id, transaction_date=NOW)
    3. INSERT INTO recipe_executions (recipe_id, company_id, executed_by=current_user_id, executed_at=NOW, total_cost=sum_of_charges)
    4. Show toast "Recipe executed successfully — [N] products added to stock"
    5. Close dialog, refetch

[11.4] RECIPE HISTORY PANEL
RecipeHistoryPanel.tsx (slide-out panel):
  Lists all recipe_executions for a recipe ORDER BY executed_at DESC
  Columns: Date/Time | Executed By | Total Cost
  Each row click: show detail of what was produced (from recipe outputs)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Recipe CRUD works (create + edit)
✅ Components, outputs, and charges can be added/removed in form
✅ Execute dialog shows real-time stock availability per component
✅ Execution deducts components and adds stock movements
✅ History panel shows execution log
✅ All text translated
✅ No TypeScript errors
```

---

## ═══════════════════════════════════════════════
## PHASE 12 — Production: WhatsApp
## ═══════════════════════════════════════════════

```
Execute Phase 12 — Production WhatsApp (QR Connect + Bulk Messaging) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Phase 0: whatsapp_sessions, whatsapp_templates, whatsapp_messages tables exist
- Implementation approach: UI/UX ready — WhatsApp sending backend is a STUB
  (The QR connect and message sending are mocked — the UI is built completely,
   but the actual WhatsApp integration requires a backend service.
   Show a "Backend not configured" notice in the connect section.)
- i18n: production.whatsapp.* (in production.json)
- Route: /production/whatsapp

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE:
  src/features/production/whatsapp/pages/WhatsAppPage.tsx
  src/features/production/whatsapp/components/ConnectSection.tsx
  src/features/production/whatsapp/components/MessageComposer.tsx
  src/features/production/whatsapp/components/TemplateManager.tsx
  src/features/production/whatsapp/components/MessageHistory.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[12.1] PAGE LAYOUT — 4 TABS
The WhatsApp page has 4 tabs: Connect | Compose | Templates | History

[12.2] CONNECT TAB
- Check whatsapp_sessions WHERE company_id=? — if connected session exists: show "Connected: +213XXXXXXX" in green
- If not connected: show a large QR code placeholder box with text "Scan with WhatsApp to connect"
  - Note below: "WhatsApp integration requires backend configuration. Contact your system administrator."
  - A "Simulate Connection" button for demo: INSERT a fake session record and show as connected
  - Connected status: green circle + phone number + "Disconnect" button
- Disconnect: DELETE session record, show disconnected state

[12.3] COMPOSE TAB (MessageComposer.tsx)
Three-panel layout:
  Panel 1 — Template select (or write custom):
    Radio: "Use Template" (select from templates) or "Custom Message"
    If template: Select dropdown from whatsapp_templates + preview
    If custom: Textarea for message body
    Variables hint: "Use {{customer_name}}, {{product_name}}, {{product_url}}"
    Product URL field: text input for inserting product URL into message

  Panel 2 — Recipients:
    Three mode tabs:
    - "All Customers" — shows count of all active customers
    - "Select" — checkbox list of customers (with search), shows count selected
    - "By Product" — Product select dropdown → shows customers who bought that product
      (query: SELECT DISTINCT c.* FROM customers c JOIN sales_orders so ON so.customer_id=c.id JOIN sales_order_items soi ON soi.sales_order_id=so.id WHERE soi.product_id=?)

  Panel 3 — Preview + Send:
    Shows message preview with first customer's name filled in
    Recipients count badge
    "Send Now" button:
      1. If no WhatsApp session: show error toast "WhatsApp not connected"
      2. INSERT INTO whatsapp_messages (company_id, template_id, recipients_count, message_body, status='sent', sent_at=NOW)
      3. Show toast "Message sent to X recipients"
      (Actual sending is stubbed — just record in DB for now)

[12.4] TEMPLATES TAB (TemplateManager.tsx)
Table of templates: Name | Body preview (50 chars) | Actions (Edit / Delete)
"Add Template" button → Dialog:
  Name input | Body textarea (with variables hint below) | Save button
Edit: pre-fill form
Delete: ConfirmDialog
All CRUD via whatsapp_templates table

[12.5] HISTORY TAB (MessageHistory.tsx)
Table: Sent At | Template / "Custom" | Recipients Count | Status badge | Message preview

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 4 tabs render correctly
✅ Connect shows QR placeholder or connected state
✅ Compose: all 3 recipient modes work
✅ By-product recipient filter loads correct customers
✅ Sending records to whatsapp_messages table
✅ Templates CRUD works
✅ History table loads from DB
✅ All text translated
✅ No TypeScript errors
```

---

## ═══════════════════════════════════════════════
## PHASE 13 — Administration: Users
## ═══════════════════════════════════════════════

```
Execute Phase 13 — Administration Users (Extended Roles + Password Management) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Phase 0: profiles.role updated to accept 6 new roles
- Existing UsersPage.tsx and UserForm.tsx exist (v1)
- i18n: admin.users.* and admin.roles.* (in admin.json)
- Only super_admin and commerce_manager can access /admin/users

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY:
  src/features/users/pages/UsersPage.tsx
  src/features/users/components/UserForm.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[13.1] USERS TABLE
Columns:
  Full Name + email below (smaller)
  Role — colored badge per role:
    super_admin = red
    commerce_manager = blue
    production_manager = purple
    cashier = green
    warehouse_agent = yellow
    viewer = gray
  Branch
  Last Login (format dd/MM/yyyy HH:mm — "Never" if null)
  Status: Active / Inactive badge + toggle
  Actions: Edit (pencil) | Delete (trash)

[13.2] USER FORM
"Add User" → Dialog with form:

Fields:
  Full Name (required)
  Email (required, email format)
  Password (required for new users, optional for edit):
    - Text input (shown, not masked — user writes it once and gives it to employee)
    - Helper text: t('admin:users.password_hint') — "Save this password before submitting"
  Role: Select with ALL 6 roles shown with their descriptions:
    Each option shows: [Role Name] — [Description]
    Use admin.users.roles.* keys
  Branch: Select from branches WHERE company_id=?

For Edit:
  Password field shows "Leave blank to keep existing password"
  If password entered: call supabase.auth.admin.updateUserById() (requires service key — explain in comment if not available, skip password update and show warning)

[13.3] DELETE USER
- Shows ConfirmDialog: "Are you sure? This user will be deactivated and cannot log in."
- Action: UPDATE profiles SET role = 'viewer', is_active = false WHERE id = userId (soft delete — do NOT delete from auth.users)
- Show toast "User deactivated"

[13.4] ROLE VISIBILITY
  The role selector must show a short description below each option.
  Use a custom Select with description text, not a plain select.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 6 roles all available in the form with descriptions
✅ Role badges use correct colors
✅ Last Login shows time (not just date)
✅ Password shown in plain text with save hint
✅ Delete is soft-delete (deactivate, not remove)
✅ All text translated (admin namespace)
✅ No TypeScript errors
```

---

## ═══════════════════════════════════════════════
## PHASE 14 — i18n Complete Pass
## ═══════════════════════════════════════════════

```
Execute Phase 14 — i18n Complete Pass (All strings in EN / FR / AR) for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- All phases 0–13 are complete
- Goal: ensure zero hardcoded strings, full AR/FR/EN translation everywhere

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY all 9 locale files:
  src/locales/en/common.json
  src/locales/fr/common.json
  src/locales/ar/common.json
  src/locales/en/commerce.json
  src/locales/fr/commerce.json
  src/locales/ar/commerce.json
  src/locales/en/production.json
  src/locales/fr/production.json
  src/locales/ar/production.json
  src/locales/en/admin.json
  src/locales/fr/admin.json
  src/locales/ar/admin.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[14.1] AUDIT
Search all .tsx files in src/ for:
  - Any string literal inside JSX that is NOT wrapped in t()
  - Any placeholder text like "Loading...", "No data", "Save", "Cancel", "Delete" that is hardcoded
  - Any toast message that is a hardcoded English string
List every hardcoded string found and the file + line number.

[14.2] FIX
For each hardcoded string found:
  1. Add the translation key to all 3 locale files in the appropriate namespace
  2. Replace the hardcoded string with t('namespace:key')
  
[14.3] RTL CHECK
For each page, verify:
  - Text is right-aligned in Arabic mode (use text-start instead of text-left where needed)
  - Flex rows reverse correctly (use flex-row-reverse or rtl:flex-row-reverse)
  - Icons on the LEFT of text in LTR should be on the RIGHT in RTL (use me- instead of mr- for margins)
  - The sidebar switches to right side when dir=rtl
  - All form labels align correctly

[14.4] MISSING TRANSLATIONS
For every key in en/ locale files: verify the same key exists in fr/ and ar/ files.
Flag any key that is missing from fr or ar with a TODO comment.
Provide the French and Arabic translations for all missing keys.

AR translation quality rules:
- Use Modern Standard Arabic (فصحى) not dialect
- Numbers: use Western numerals (1, 2, 3) not Arabic-Indic (١, ٢, ٣) — these are more readable in business apps
- Currency: keep "DZD" untranslated
- Proper terms:
  Commerce = التجارة
  Production = الإنتاج
  Sales = المبيعات
  Purchase = المشتريات
  Customer = العميل / الزبون
  Supplier = المورد
  Recipe = الوصفة
  Component = المكون
  Commands = الطلبات
  Invoice = الفاتورة
  Delivery = التسليم

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Zero hardcoded strings in any .tsx file
✅ All locale files have matching keys (no missing keys)
✅ App fully usable in Arabic with correct RTL layout
✅ App fully usable in French
✅ App fully usable in English
✅ No TypeScript errors from i18n changes
```

---

## ═══════════════════════════════════════════════
## PHASE 15 — Polish, Bug Fixes & Performance
## ═══════════════════════════════════════════════

```
Execute Phase 15 — Polish, Bug Fixes & Performance for ABD Stock v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- All phases 0–14 are complete
- This is the final polish phase before release

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODIFY: Any file that has the issues listed below. Document each change made.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[15.1] REPLACE ALL alert() CALLS
Search entire src/ for alert( and confirm(.
Replace each with appropriate toast notification.
Toast library: use Radix Toast (already in the project via @radix-ui/react-toast).

[15.2] TOPBAR NOTIFICATION BELL
Remove the static red dot from the Bell icon.
Replace with a real low-stock notification:
  - On app load: query v_product_stock WHERE total_qty_on_hand <= reorder_level AND company_id=?
  - If count > 0: show red dot with count badge
  - Click opens a dropdown showing: "[Product X] is low in stock (Y remaining)"
  - Clicking a product in the list navigates to /commerce/inventory/stock?highlight=productId

[15.3] AUDIT LOG TIMESTAMPS
In AuditLogsPage.tsx: change formatDate(log.created_at) to formatDateTime(log.created_at)
Verify formatDateTime shows dd/MM/yyyy HH:mm

[15.4] PERFORMANCE
For ALL pages with a filtered list:
  Wrap filter computation in useMemo with correct dependencies
  Example: const filtered = useMemo(() => data?.filter(...), [data, searchTerm, activeFilters])

For ALL search inputs:
  Verify they use the InlineSearch component from Phase 0 (which has 300ms debounce built in)
  If any raw <Input> is used for search without debounce: replace with InlineSearch

Lazy-load all feature routes in App.tsx:
  const DashboardPage = React.lazy(() => import('./features/dashboard/pages/DashboardPage'))
  Wrap <Routes> in <Suspense fallback={<LoadingScreen />}>
  Create a simple LoadingScreen component (centered spinner)

[15.5] GLOBAL TABLE CONSISTENCY
All tables across the entire app must have:
  - Sticky header (className="sticky top-0 bg-card z-10" on TableHeader)
  - Striped rows or hover effect (bg-muted/30 on hover)
  - Empty state centered with icon and message
  - Loading state with skeleton rows (not just "Loading..." text)

[15.6] SETTINGS PAGE CLEANUP
- Remove the "contact support" note about branches — replace with a note "Manage branches from the database or contact your system administrator"
- OR: add a simple "Add Branch" dialog with fields: Name, Code, Is HQ, Is Active

[15.7] FINAL TYPE CHECK
Run: npx tsc --noEmit
Fix any remaining TypeScript errors.
Document any @ts-expect-error or @ts-ignore that remain and WHY they are acceptable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCEPTANCE CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Zero alert() or confirm() calls in the codebase
✅ Notification bell shows real low-stock count
✅ Audit logs show date AND time
✅ All filter computations are memoized
✅ All routes are lazy-loaded
✅ All tables have consistent sticky header + empty + loading states
✅ npx tsc --noEmit passes with no errors
✅ App works end-to-end in all 3 languages
✅ Electron builds successfully: npm run electron:build
```

---

## ═══════════════════════════════════════════════
## HOW TO USE THIS FILE
## ═══════════════════════════════════════════════

1. Start with PHASE 0. Copy the prompt block between the triple backticks.
2. Paste it as your message to the AI assistant.
3. The AI will execute the phase.
4. Review the output carefully.
5. If correct → mark the phase done → move to the next phase.
6. If issues → describe the problem and ask for corrections BEFORE moving on.
7. Never skip a phase — each phase depends on the previous one.

## PHASE CHECKLIST

- [ ] Phase 0  — Foundation, Shell, i18n, DB
- [ ] Phase 1  — Commerce Dashboard (live data)
- [ ] Phase 2  — Products (simplified + inline variants)
- [ ] Phase 3  — Sales (bug fixes + features)
- [ ] Phase 4  — Commands + Yalidin API
- [ ] Phase 5  — Inventory (stock + logs)
- [ ] Phase 6  — Customers (detail + debt)
- [ ] Phase 7  — Charges (product-linked)
- [ ] Phase 8  — Production Dashboard
- [ ] Phase 9  — Suppliers (simplified)
- [ ] Phase 10 — Components (raw materials)
- [ ] Phase 11 — Recipes (production workflow)
- [ ] Phase 12 — WhatsApp (UI + stubs)
- [ ] Phase 13 — Administration / Users
- [ ] Phase 14 — i18n Complete Pass
- [ ] Phase 15 — Polish, Bug Fixes, QA
