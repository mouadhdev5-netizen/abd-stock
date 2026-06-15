-- =====================================================
-- ABD STOCK - Enterprise ERP & Inventory Management
-- Migration 001: Complete Database Schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'moderator', 'employee');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued');
CREATE TYPE unit_type AS ENUM ('piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'box', 'pack', 'dozen', 'set');
CREATE TYPE movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return_in', 'return_out', 'count_adjustment', 'initial');
CREATE TYPE po_status AS ENUM ('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled');
CREATE TYPE so_status AS ENUM ('quotation', 'draft', 'confirmed', 'processing', 'partial', 'completed', 'cancelled', 'returned');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'refunded');
CREATE TYPE delivery_status AS ENUM ('pending', 'processing', 'assigned', 'in_transit', 'delivered', 'failed', 'returned');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'check', 'credit_card', 'credit', 'other');
CREATE TYPE customer_type AS ENUM ('individual', 'business');
CREATE TYPE transfer_status AS ENUM ('draft', 'in_transit', 'completed', 'cancelled');
CREATE TYPE count_status AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');
CREATE TYPE inventory_valuation AS ENUM ('fifo', 'lifo', 'weighted_avg');
CREATE TYPE notification_type AS ENUM ('low_stock', 'out_of_stock', 'new_sale', 'new_purchase', 'payment_due', 'delivery_update', 'system');
CREATE TYPE subscription_plan AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE currency_code AS ENUM ('DZD', 'EUR', 'USD', 'GBP');

-- =====================================================
-- COMPANIES TABLE
-- =====================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trade_name TEXT,
  logo_url TEXT,
  tax_id TEXT,
  rc_number TEXT,
  nif TEXT,
  nis TEXT,
  art_number TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Algeria',
  phone TEXT,
  email TEXT,
  website TEXT,
  currency currency_code NOT NULL DEFAULT 'DZD',
  default_language TEXT NOT NULL DEFAULT 'fr',
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  valuation_method inventory_valuation NOT NULL DEFAULT 'weighted_avg',
  subscription_plan subscription_plan NOT NULL DEFAULT 'starter',
  subscription_expires_at TIMESTAMPTZ,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_footer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- BRANCHES TABLE
-- =====================================================

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  manager_id UUID, -- Will reference profiles after profiles table is created
  is_main BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'employee',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK for branch manager after profiles table exists
ALTER TABLE branches ADD CONSTRAINT branches_manager_id_fkey 
  FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- =====================================================
-- USER PERMISSIONS TABLE
-- =====================================================

CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, permission)
);

-- =====================================================
-- WAREHOUSES TABLE
-- =====================================================

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  name_en TEXT,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- BRANDS TABLE
-- =====================================================

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- UNITS TABLE
-- =====================================================

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  abbreviation TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT,
  rc_number TEXT,
  contact_name TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Algeria',
  payment_terms INT DEFAULT 30, -- days
  credit_limit DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  currency currency_code DEFAULT 'DZD',
  rating INT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SUPPLIER CONTACTS TABLE
-- =====================================================

CREATE TABLE supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  job_title TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CUSTOMER GROUPS TABLE
-- =====================================================

CREATE TABLE customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  payment_terms INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL,
  type customer_type NOT NULL DEFAULT 'individual',
  name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT,
  contact_name TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  loyalty_points INT NOT NULL DEFAULT 0,
  credit_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_terms INT DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CUSTOMER ADDRESSES TABLE
-- =====================================================

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'billing', -- billing, shipping
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Algeria',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  name_en TEXT,
  description TEXT,
  description_ar TEXT,
  sku TEXT,
  barcode TEXT,
  qr_code TEXT,
  internal_code TEXT,
  cost_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  sell_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  wholesale_price DECIMAL(15,4) DEFAULT 0,
  min_sell_price DECIMAL(15,4) DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  weight DECIMAL(10,3) DEFAULT 0,
  dimensions JSONB DEFAULT '{"length": 0, "width": 0, "height": 0}'::jsonb,
  images JSONB DEFAULT '[]'::jsonb, -- array of image URLs
  thumbnail_url TEXT,
  has_variants BOOLEAN NOT NULL DEFAULT false,
  has_serials BOOLEAN NOT NULL DEFAULT false,
  has_batches BOOLEAN NOT NULL DEFAULT false,
  track_expiry BOOLEAN NOT NULL DEFAULT false,
  track_warranty BOOLEAN NOT NULL DEFAULT false,
  warranty_days INT DEFAULT 0,
  reorder_level DECIMAL(15,3) DEFAULT 0,
  max_stock DECIMAL(15,3) DEFAULT 0,
  min_stock DECIMAL(15,3) DEFAULT 0,
  status product_status NOT NULL DEFAULT 'active',
  notes TEXT,
  is_service BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PRODUCT VARIANTS TABLE
-- =====================================================

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  attributes JSONB DEFAULT '{}'::jsonb, -- e.g. {"color": "red", "size": "XL"}
  cost_price DECIMAL(15,4),
  sell_price DECIMAL(15,4),
  wholesale_price DECIMAL(15,4),
  images JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PRODUCT BUNDLES TABLE
-- =====================================================

CREATE TABLE product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  child_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  UNIQUE(parent_product_id, child_product_id)
);

-- =====================================================
-- PRODUCT SERIALS TABLE
-- =====================================================

CREATE TABLE product_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  serial_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available, sold, returned, defective
  sold_at TIMESTAMPTZ,
  so_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, serial_number)
);

-- =====================================================
-- PRODUCT BATCHES TABLE
-- =====================================================

CREATE TABLE product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15,4) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STOCK LEVELS TABLE
-- =====================================================

CREATE TABLE stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  qty_on_hand DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_reserved DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_available DECIMAL(15,3) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  avg_cost DECIMAL(15,4) DEFAULT 0,
  last_purchase_price DECIMAL(15,4) DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, variant_id, warehouse_id)
);

-- =====================================================
-- STOCK MOVEMENTS TABLE
-- =====================================================

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  qty_before DECIMAL(15,3) DEFAULT 0,
  qty_after DECIMAL(15,3) DEFAULT 0,
  ref_type TEXT, -- 'purchase_order', 'sales_order', 'transfer', 'count', 'adjustment'
  ref_id UUID,
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INVENTORY COUNTS TABLE
-- =====================================================

CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  count_number TEXT NOT NULL,
  status count_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  counted_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INVENTORY COUNT ITEMS TABLE
-- =====================================================

CREATE TABLE inventory_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  expected_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  counted_qty DECIMAL(15,3),
  difference DECIMAL(15,3) GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - expected_qty) STORED,
  unit_cost DECIMAL(15,4) DEFAULT 0,
  notes TEXT
);

-- =====================================================
-- WAREHOUSE TRANSFERS TABLE
-- =====================================================

CREATE TABLE warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transfer_number TEXT NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status transfer_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  transferred_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  transferred_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- WAREHOUSE TRANSFER ITEMS TABLE
-- =====================================================

CREATE TABLE warehouse_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity DECIMAL(15,3) NOT NULL,
  received_quantity DECIMAL(15,3) DEFAULT 0,
  unit_cost DECIMAL(15,4) DEFAULT 0,
  notes TEXT
);

-- =====================================================
-- PURCHASE ORDERS TABLE
-- =====================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number TEXT NOT NULL,
  status po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  currency currency_code NOT NULL DEFAULT 'DZD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_amount DECIMAL(15,2) GENERATED ALWAYS AS (total - paid_amount) STORED,
  notes TEXT,
  terms TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PURCHASE ORDER ITEMS TABLE
-- =====================================================

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  description TEXT,
  quantity DECIMAL(15,3) NOT NULL,
  received_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(15,4) NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT
);

-- =====================================================
-- PURCHASE RECEIPTS TABLE
-- =====================================================

CREATE TABLE purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  received_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PURCHASE RECEIPT ITEMS TABLE
-- =====================================================

CREATE TABLE purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  po_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL
);

-- =====================================================
-- SUPPLIER PAYMENTS TABLE
-- =====================================================

CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  payment_number TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PROMOTIONS TABLE
-- =====================================================

CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed, bogo, bundle
  value DECIMAL(15,2) NOT NULL DEFAULT 0,
  min_order_amount DECIMAL(15,2) DEFAULT 0,
  max_discount_amount DECIMAL(15,2),
  applies_to TEXT DEFAULT 'all', -- all, category, product, customer_group
  conditions JSONB DEFAULT '{}'::jsonb,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- COUPONS TABLE
-- =====================================================

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  per_customer_limit INT DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(promotion_id, code)
);

-- =====================================================
-- SALES ORDERS TABLE
-- =====================================================

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  so_number TEXT NOT NULL,
  status so_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency currency_code NOT NULL DEFAULT 'DZD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_amount DECIMAL(15,2) GENERATED ALWAYS AS (total - paid_amount) STORED,
  profit_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SALES ORDER ITEMS TABLE
-- =====================================================

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  description TEXT,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  cost_price DECIMAL(15,4) DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  serial_id UUID REFERENCES product_serials(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL
);

-- =====================================================
-- INVOICES TABLE
-- =====================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  so_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_amount DECIMAL(15,2) GENERATED ALWAYS AS (total - paid_amount) STORED,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PAYMENTS TABLE (customer payments)
-- =====================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  so_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  payment_number TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CREDIT NOTES TABLE
-- =====================================================

CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  credit_number TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'issued', -- issued, applied, cancelled
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SALES RETURNS TABLE
-- =====================================================

CREATE TABLE sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  so_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  return_number TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, completed, cancelled
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  refund_method payment_method,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SALES RETURN ITEMS TABLE
-- =====================================================

CREATE TABLE sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  so_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  condition TEXT DEFAULT 'good', -- good, damaged, unsellable
  restock BOOLEAN NOT NULL DEFAULT true
);

-- =====================================================
-- DELIVERIES TABLE
-- =====================================================

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  so_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  delivery_number TEXT NOT NULL,
  status delivery_status NOT NULL DEFAULT 'pending',
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  vehicle_info TEXT,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_phone TEXT,
  scheduled_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DELIVERY ITEMS TABLE
-- =====================================================

CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity DECIMAL(15,3) NOT NULL
);

-- =====================================================
-- DELIVERY PROOFS TABLE
-- =====================================================

CREATE TABLE delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  image_url TEXT,
  signature_url TEXT,
  recipient_name TEXT,
  notes TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- EXPENSES TABLE
-- =====================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  method payment_method DEFAULT 'cash',
  reference TEXT,
  attachment_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INCOME TABLE
-- =====================================================

CREATE TABLE income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  method payment_method DEFAULT 'cash',
  reference TEXT,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  title_fr TEXT,
  body TEXT NOT NULL,
  body_ar TEXT,
  body_fr TEXT,
  ref_type TEXT,
  ref_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SEQUENCES for numbering
-- =====================================================

CREATE TABLE company_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL, -- 'PO', 'SO', 'INV', 'DEL', 'TRF', 'CNT', 'RET', 'PMT'
  prefix TEXT NOT NULL DEFAULT '',
  last_number BIGINT NOT NULL DEFAULT 0,
  padding INT NOT NULL DEFAULT 5,
  UNIQUE(company_id, sequence_type)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Products
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Stock levels
CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX idx_stock_levels_company ON stock_levels(company_id);

-- Stock movements
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_ref ON stock_movements(ref_type, ref_id);

-- Sales orders
CREATE INDEX idx_sales_orders_company ON sales_orders(company_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_created_at ON sales_orders(created_at DESC);
CREATE INDEX idx_sales_orders_order_date ON sales_orders(order_date DESC);

-- Purchase orders
CREATE INDEX idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_created_at ON purchase_orders(created_at DESC);

-- Customers
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);

-- Suppliers
CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_suppliers_name_trgm ON suppliers USING gin(name gin_trgm_ops);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Audit logs
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Deliveries
CREATE INDEX idx_deliveries_company ON deliveries(company_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);

-- Invoices
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_so ON invoices(so_id);
CREATE INDEX idx_invoices_status ON invoices(status);
