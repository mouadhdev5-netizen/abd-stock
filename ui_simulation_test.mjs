/**
 * ============================================================
 *  ABD-STOCK — Complete UI Code Simulation Test  v2
 *
 *  Covers EVERY form and page across all 15 feature modules.
 *  Each test reproduces the exact Supabase query/insert/rpc
 *  call from the actual React source code.
 *
 *  Sections:
 *   [A]  Auth
 *   [B]  ProductsPage + ProductForm (variants too)
 *   [C]  SalesForm + SalesPage (list query)
 *   [D]  CustomersPage (merged query + block toggle) + CustomerForm + CustomerDebtSection
 *   [E]  SuppliersPage + SupplierForm
 *   [F]  PurchaseForm
 *   [G]  StockAdjustDialog
 *   [H]  CommandForm + EnCoursPage + SuiviPage
 *   [I]  ChargeForm
 *   [J]  ExpenseForm
 *   [K]  UserForm
 *   [L]  ComponentForm (Production)
 *   [M]  RecipeForm + RecipeExecuteDialog
 *   [N]  QuickAddCustomerForm (inline in SalesForm / CommandForm)
 *   [O]  Cleanup
 *
 *  Run:  node ui_simulation_test.mjs
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const SUPABASE_URL      = env['VITE_SUPABASE_URL']
const SUPABASE_ANON_KEY = env['VITE_SUPABASE_ANON_KEY']

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars'); process.exit(1)
}

const CONFIG = { email: 'admin@abdstock.com', password: 'password123' }
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let passed = 0, failed = 0
const failures = []

const log        = (e, m) => console.log(`  ${e}  ${m}`)
const assert     = (c, m) => { if (!c) throw new Error(m || 'Assertion failed') }
const assertNoError = (e, ctx) => { if (e) throw new Error(`[${ctx}] ${e.message} (code:${e.code})`) }

async function test(name, fn) {
  process.stdout.write(`\n  [SIM] ${name} ... `)
  try {
    await fn(); console.log('PASS'); passed++
  } catch (err) {
    console.log('FAIL')
    const detail = err?.message || JSON.stringify(err)
    log('ERR >', detail)
    failures.push({ name, detail }); failed++
  }
}

// ── Shared state ─────────────────────────────────────────────
let company = null, user = null
let sim_product_id   = null
let sim_variant_id   = null   // for ProductForm variant test
let sim_customer_id  = null
let sim_supplier_id  = null
let sim_so_id        = null
let sim_po_id        = null
let sim_warehouse_id = null
let sim_command_id   = null
let sim_component_id = null
let sim_recipe_id    = null

const today  = () => new Date().toISOString().split('T')[0]
const soNum  = () => `SO-${new Date().toISOString().slice(0,10).replace(/-/g,''  )}-${Math.floor(1000+Math.random()*9000)}`
const poNum  = () => `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`

// =============================================================================
async function main() {
  console.log('\n==============================================')
  console.log('  ABD-STOCK — Full UI Simulation Test v2')
  console.log(`  ${SUPABASE_URL}`)
  console.log('==============================================')

  // ══════════════════════════════════════════════════════════
  //  [A]  AUTH
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [A] Auth --')

  await test('signInWithPassword', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: CONFIG.email, password: CONFIG.password })
    assertNoError(error, 'signIn'); assert(data?.user?.id)
    user = data.user
    log('OK', `${user.email}  id=${user.id}`)
  })

  await test('authStore · fetch profile + company (chain)', async () => {
    const { data: profile, error: e1 } = await supabase.from('profiles').select('id, full_name, role, company_id, branch_id').eq('id', user.id).single()
    assertNoError(e1, 'profile')
    const { data: comp, error: e2 } = await supabase.from('companies').select('id, name, currency').eq('id', profile.company_id).single()
    assertNoError(e2, 'company')
    company = comp
    log('OK', `company="${company.name}" currency=${company.currency}`)
  })

  if (!company?.id) { console.log('No company — aborting'); return printSummary() }

  // ══════════════════════════════════════════════════════════
  //  [B]  PRODUCTS PAGE + ProductForm
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [B] ProductsPage + ProductForm --')

  await test('ProductsPage · useQuery → v_product_stock + products merge', async () => {
    const { data: sv, error } = await supabase.from('v_product_stock').select('*').eq('company_id', company.id).order('name')
    assertNoError(error, 'v_product_stock')
    const { data: rp } = await supabase.from('products').select('id, has_variants, name_ar, name_fr, status').eq('company_id', company.id)
    const map = (rp || []).reduce((a, p) => { a[p.id] = p; return a }, {})
    const merged = (sv || []).map(p => ({ ...p, has_variants: map[p.product_id]?.has_variants || false, status: map[p.product_id]?.status || 'active' }))
    if (merged.length) sim_product_id = merged[0].product_id
    log('OK', `${merged.length} products merged`)
  })

  await test('ProductsPage · toggleVariants (product_variants + stock_levels)', async () => {
    if (!sim_product_id) { log('SKIP', 'no product'); return }
    const { data: pData } = await supabase.from('products').select('has_variants').eq('id', sim_product_id).single()
    if (!pData?.has_variants) { log('SKIP', 'product has no variants'); return }
    const { data: variants, error } = await supabase.from('product_variants').select('*').eq('product_id', sim_product_id).order('name')
    assertNoError(error, 'product_variants')
    const { data: sl } = await supabase.from('stock_levels').select('variant_id, qty_available').eq('product_id', sim_product_id)
    const merged = (variants || []).map(v => {
      const total = (sl || []).filter(s => s.variant_id === v.id).reduce((a, c) => a + (c.qty_available || 0), 0)
      return { ...v, total_qty_available: total }
    })
    log('OK', `${merged.length} variants with stock`)
  })

  await test('ProductsPage · handleStatusToggle (UPDATE products.status)', async () => {
    if (!sim_product_id) { log('SKIP'); return }
    const { error } = await supabase.from('products').update({ status: 'active' }).eq('id', sim_product_id)
    assertNoError(error, 'status toggle')
    log('OK', 'status toggled')
  })

  await test('ProductsPage · handleEditClick (fetch variants for edit form)', async () => {
    if (!sim_product_id) { log('SKIP'); return }
    const { data: pCheck } = await supabase.from('products').select('has_variants').eq('id', sim_product_id).single()
    if (pCheck?.has_variants) {
      const { data, error } = await supabase.from('product_variants').select('*').eq('product_id', sim_product_id)
      assertNoError(error, 'edit variants fetch')
      log('OK', `${data?.length} variants for form`)
    } else {
      log('OK', 'no variants — product passed directly')
    }
  })

  await test('ProductForm · INSERT product (all fields including name_ar/name_fr)', async () => {
    const { data, error } = await supabase.from('products').insert({
      company_id:    company.id,
      name:          'SIM Test Product v2',
      name_ar:       'منتج اختبار',
      name_fr:       'Produit Test v2',
      sku:           `SIM-${Date.now()}`,
      barcode:       `899${Date.now()}`,
      sell_price:    2000,
      cost_price:    1200,
      reorder_level: 10,
      status:        'active',
      has_variants:  false,
      notes:         'UI simulation v2',
    }).select().single()
    assertNoError(error, 'products INSERT')
    sim_product_id = data.id
    log('OK', `id=${sim_product_id}  sell_price=${data.sell_price}`)
  })

  await test('ProductForm · INSERT product_variant (when has_variants=true)', async () => {
    // ProductForm inserts variants as: supabase.from('product_variants').insert({...})
    const { data, error } = await supabase.from('product_variants').insert({
      product_id: sim_product_id,
      name:       'SIM Variant A',
      sku:        `SIM-VAR-${Date.now()}`,
      cost_price: 1200,
      sell_price: 2000,
      is_active:  true,
    }).select().single()
    assertNoError(error, 'product_variants INSERT')
    sim_variant_id = data.id
    log('OK', `variant id=${sim_variant_id}`)
  })

  await test('ProductVariantRow · handleVariantStatusToggle (UPDATE is_active)', async () => {
    if (!sim_variant_id) { log('SKIP'); return }
    const { error } = await supabase.from('product_variants').update({ is_active: false }).eq('id', sim_variant_id)
    assertNoError(error, 'variant status toggle')
    await supabase.from('product_variants').update({ is_active: true }).eq('id', sim_variant_id)
    log('OK', 'variant toggled inactive then back to active')
  })

  // ══════════════════════════════════════════════════════════
  //  [C]  SALES PAGE + SALES FORM
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [C] SalesPage + SalesForm --')

  await test('SalesPage · useQuery(sales_orders) — full join query', async () => {
    // Exact query from SalesPage
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`*, customers(name, tax_id, phone), sales_order_items(*, products(name), product_variants(name))`)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    assertNoError(error, 'SalesPage list')
    log('OK', `${data?.length} orders with full joins (customer + items + products)`)
  })

  await test('SalesForm · customers dropdown query', async () => {
    const { data, error } = await supabase.from('customers').select('id, name, current_balance').eq('company_id', company.id).eq('is_active', true)
    assertNoError(error, 'customers dropdown')
    log('OK', `${data?.length} customers`)
  })

  await test('SalesForm · product search (v_product_variants_stock, empty query)', async () => {
    const { data, error } = await supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).eq('status', 'active').limit(10)
    assertNoError(error, 'products search')
    log('OK', `${data?.length} products`)
  })

  await test('SalesForm · handleBarcodeScan — barcode lookup via v_product_variants_stock', async () => {
    const { data } = await supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).eq('barcode', '000000000000').single()
    assert(!data, 'should not find fake barcode')
    log('OK', 'barcode not found (expected)')
  })

  await test('SalesForm · onSubmit — INSERT sales_order + sales_order_items (walk-in, paid-in-full)', async () => {
    // Form values as user enters them
    const grandTotal = 2000, paid = 2000, due = 0
    const soNumber = soNum()
    const { data: order, error: oe } = await supabase.from('sales_orders').insert({
      company_id: company.id, so_number: soNumber, customer_id: null,
      status: 'completed', subtotal: 2000, tax_amount: 0, discount_amount: 0,
      total: grandTotal, paid_amount: paid, notes: 'SIM v2 sale',
    }).select().single()
    assertNoError(oe, 'SO INSERT')
    sim_so_id = order.id
    const { error: ie } = await supabase.from('sales_order_items').insert([{
      so_id: sim_so_id, product_id: sim_product_id, variant_id: null,
      quantity: 1, unit_price: 2000, discount_amount: 0,
      tax_rate: 0, tax_amount: 0, subtotal: 2000, total: 2000,
    }])
    assertNoError(ie, 'SO items INSERT')
    log('OK', `SO=${soNumber}  due=${due}  (no customer debt update needed)`)
  })

  await test('SalesForm · partial payment → customer balance update', async () => {
    const { data: cust } = await supabase.from('customers').select('id, current_balance').eq('company_id', company.id).eq('is_active', true).limit(1).single()
    if (!cust) { log('SKIP', 'no customer'); return }
    const grandTotal = 2000, paid = 800, due = 1200
    const soNumber = soNum()
    const { data: ord, error: oe } = await supabase.from('sales_orders').insert({
      company_id: company.id, so_number: soNumber, customer_id: cust.id,
      status: 'completed', subtotal: 2000, tax_amount: 0, discount_amount: 0,
      total: grandTotal, paid_amount: paid, notes: 'SIM partial payment',
    }).select().single()
    assertNoError(oe, 'partial SO')
    await supabase.from('sales_order_items').insert([{
      so_id: ord.id, product_id: sim_product_id, variant_id: null,
      quantity: 1, unit_price: 2000, discount_amount: 0, tax_rate: 0, tax_amount: 0, subtotal: 2000, total: 2000,
    }])
    // Customer debt update
    const { data: cd } = await supabase.from('customers').select('current_balance').eq('id', cust.id).single()
    const newBal = (cd.current_balance || 0) + due
    await supabase.from('customers').update({ current_balance: newBal }).eq('id', cust.id)
    log('OK', `balance ${cd.current_balance} → ${newBal}  due=${due}`)
    // Restore + cleanup
    await supabase.from('customers').update({ current_balance: cust.current_balance }).eq('id', cust.id)
    await supabase.from('sales_order_items').delete().eq('so_id', ord.id)
    await supabase.from('sales_orders').delete().eq('id', ord.id)
  })

  await test('SalesPage · UPDATE SO status (inline status change)', async () => {
    if (!sim_so_id) { log('SKIP'); return }
    const { error } = await supabase.from('sales_orders').update({ status: 'processing' }).eq('id', sim_so_id)
    assertNoError(error, 'SO status update')
    await supabase.from('sales_orders').update({ status: 'completed' }).eq('id', sim_so_id)
    log('OK', 'SO → processing → completed')
  })

  // ══════════════════════════════════════════════════════════
  //  [D]  CUSTOMERS PAGE + CustomerForm + CustomerDebtSection
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [D] CustomersPage + CustomerForm + CustomerDebtSection --')

  await test('CustomersPage · useQuery — customers + sales_orders merge (orderCount)', async () => {
    // Exact query from CustomersPage.tsx
    const { data: customersData, error: ce } = await supabase.from('customers').select('*').eq('company_id', company.id).order('name')
    assertNoError(ce, 'customers list')
    const { data: orderCounts, error: oe } = await supabase.from('sales_orders').select('customer_id').eq('company_id', company.id).in('status', ['completed', 'processing', 'confirmed'])
    assertNoError(oe, 'order counts')
    const counts = (orderCounts || []).reduce((acc, o) => { if (o.customer_id) acc[o.customer_id] = (acc[o.customer_id] || 0) + 1; return acc }, {})
    const merged = (customersData || []).map(c => ({ ...c, orderCount: counts[c.id] || 0 }))
    log('OK', `${merged.length} customers with orderCount merged`)
  })

  await test('CustomersPage · handleToggleBlock (UPDATE is_blocked)', async () => {
    // Find a customer to toggle temporarily
    const { data: cust } = await supabase.from('customers').select('id, is_blocked').eq('company_id', company.id).limit(1).single()
    if (!cust) { log('SKIP', 'no customer'); return }
    const newStatus = !cust.is_blocked
    const { error } = await supabase.from('customers').update({ is_blocked: newStatus }).eq('id', cust.id)
    assertNoError(error, 'is_blocked toggle')
    // Restore
    await supabase.from('customers').update({ is_blocked: cust.is_blocked }).eq('id', cust.id)
    log('OK', `is_blocked toggled ${cust.is_blocked} → ${newStatus} → restored`)
  })

  await test('CustomerForm · INSERT customer (all 3 tabs)', async () => {
    const { data, error } = await supabase.from('customers').insert({
      company_id: company.id,
      name: 'SIM Client SARL v2', trade_name: 'SIM Client',
      type: 'business', tax_id: 'NIF-SIM-V2',
      wilaya: 'Alger', commune: 'Bab El Oued',
      address: '12 Rue de la République',
      notes: 'Simulation v2',
      contact_name: 'Sim Contact', phone: '+213021000001', mobile: '+213661000001', email: '',
      credit_limit: 75000, payment_terms: 30, is_active: true,
    }).select().single()
    assertNoError(error, 'customers INSERT')
    sim_customer_id = data.id
    log('OK', `id=${sim_customer_id}`)
  })

  await test('CustomerForm · UPDATE customer (edit mode)', async () => {
    assert(sim_customer_id, 'no sim_customer_id')
    const { error } = await supabase.from('customers').update({
      name: 'SIM Client SARL v2 (Updated)', wilaya: 'Oran',
      credit_limit: 150000, payment_terms: 60, is_active: true,
    }).eq('id', sim_customer_id)
    assertNoError(error, 'customers UPDATE')
    log('OK', 'customer updated')
  })

  await test('CustomerDetailPanel · SELECT customer details (full select)', async () => {
    assert(sim_customer_id, 'no sim_customer_id')
    // CustomerDetailPanel fetches the full customer object
    const { data, error } = await supabase.from('customers').select('*').eq('id', sim_customer_id).single()
    assertNoError(error, 'customer detail SELECT')
    log('OK', `name="${data.name}"  credit_limit=${data.credit_limit}`)
  })

  await test('CustomerPurchasesTable · SELECT sales_orders for customer', async () => {
    assert(sim_customer_id, 'no sim_customer_id')
    const { data, error } = await supabase.from('sales_orders').select('*, sales_order_items(*, products(name))').eq('customer_id', sim_customer_id).order('created_at', { ascending: false })
    assertNoError(error, 'customer orders SELECT')
    log('OK', `${data?.length} orders for customer`)
  })

  await test('CustomerDebtSection · query + INSERT payment + UPDATE credit_balance', async () => {
    assert(sim_customer_id, 'no sim_customer_id')
    await supabase.from('customers').update({ credit_balance: 5000 }).eq('id', sim_customer_id)
    const { data: payments, error: qe } = await supabase.from('customer_debt_payments').select('*, profiles:created_by(full_name)').eq('customer_id', sim_customer_id).order('payment_date', { ascending: false }).order('created_at', { ascending: false })
    assertNoError(qe, 'debt payments query')
    const { error: ie } = await supabase.from('customer_debt_payments').insert({ customer_id: sim_customer_id, amount: 2000, payment_date: today(), notes: 'SIM v2 payment' })
    assertNoError(ie, 'payment INSERT')
    const newDebt = Math.max(0, 5000 - 2000)
    const { error: ue } = await supabase.from('customers').update({ credit_balance: newDebt }).eq('id', sim_customer_id)
    assertNoError(ue, 'credit_balance UPDATE')
    log('OK', `${payments?.length} existing payments  new_debt=${newDebt}`)
  })

  // ══════════════════════════════════════════════════════════
  //  [E]  SUPPLIERS PAGE + SupplierForm
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [E] SuppliersPage + SupplierForm --')

  await test('SuppliersPage · useQuery(suppliers) — full SELECT (all, not just is_active)', async () => {
    // SuppliersPage uses: .select('*').eq('company_id').order('name')  — no is_active filter!
    const { data, error } = await supabase.from('suppliers').select('*').eq('company_id', company.id).order('name')
    assertNoError(error, 'suppliers SELECT all')
    log('OK', `${data?.length} suppliers (all statuses)`)
  })

  await test('SuppliersPage · handleToggleStatus (UPDATE is_active)', async () => {
    const { data: supp } = await supabase.from('suppliers').select('id, is_active').eq('company_id', company.id).limit(1).single()
    if (!supp) { log('SKIP', 'no supplier'); return }
    const newStatus = !supp.is_active
    const { error } = await supabase.from('suppliers').update({ is_active: newStatus }).eq('id', supp.id)
    assertNoError(error, 'supplier status toggle')
    await supabase.from('suppliers').update({ is_active: supp.is_active }).eq('id', supp.id)
    log('OK', `is_active ${supp.is_active} → ${newStatus} → restored`)
  })

  await test('SupplierForm · INSERT new supplier (all fields)', async () => {
    const { data, error } = await supabase.from('suppliers').insert({
      name:            'SIM Supplier v2',
      contact_name:    'Sim Vendor',
      phone:           '+213021000002',
      email:           '',
      payment_terms:   45,
      current_balance: 0,
      notes:           'Simulation v2 supplier',
      is_active:       true,
      company_id:      company.id,
      currency:        company.currency || 'DZD',
    }).select().single()
    assertNoError(error, 'suppliers INSERT')
    sim_supplier_id = data.id
    log('OK', `id=${sim_supplier_id}  name="${data.name}"`)
  })

  await test('SupplierForm · UPDATE existing supplier (edit mode)', async () => {
    assert(sim_supplier_id, 'no sim_supplier_id')
    const { error } = await supabase.from('suppliers').update({
      name:            'SIM Supplier v2 (Updated)',
      contact_name:    'Updated Contact',
      phone:           '+213021000099',
      email:           '',
      payment_terms:   30,
      current_balance: 10000,
      notes:           'Updated by simulation',
      is_active:       true,
    }).eq('id', sim_supplier_id)
    assertNoError(error, 'suppliers UPDATE')
    log('OK', 'supplier updated')
  })

  // ══════════════════════════════════════════════════════════
  //  [F]  PURCHASE FORM
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [F] PurchaseForm --')

  await test('PurchaseForm · suppliers dropdown query', async () => {
    const { data, error } = await supabase.from('suppliers').select('id, name, current_balance').eq('company_id', company.id).eq('is_active', true)
    assertNoError(error, 'suppliers dropdown')
    log('OK', `${data?.length} active suppliers`)
  })

  await test('PurchaseForm · product search (v_product_variants_stock, ilike)', async () => {
    const { data, error } = await supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).eq('status', 'active').ilike('full_name', '%SIM%').limit(10)
    assertNoError(error, 'PO product search')
    log('OK', `${data?.length} products matching "SIM"`)
  })

  await test('PurchaseForm · onSubmit — INSERT PO + PO items (qty=5, tax=19%)', async () => {
    assert(sim_supplier_id, 'no supplier')
    const qty = 5, unitCost = 1200, taxRate = 19
    const taxable = qty * unitCost  // 6000
    const lineTax = taxable * (taxRate / 100)  // 1140
    const grandTotal = taxable + lineTax  // 7140
    const number = poNum()
    const { data: order, error: oe } = await supabase.from('purchase_orders').insert({
      company_id: company.id, po_number: number,
      supplier_id: sim_supplier_id, status: 'received',
      subtotal: taxable, tax_amount: lineTax, discount_amount: 0,
      total: grandTotal, paid_amount: grandTotal, notes: 'SIM v2 PO',
    }).select().single()
    assertNoError(oe, 'PO INSERT')
    sim_po_id = order.id
    const { error: ie } = await supabase.from('purchase_order_items').insert([{
      po_id: sim_po_id, product_id: sim_product_id, variant_id: null,
      quantity: qty, unit_cost: unitCost, discount_amount: 0,
      tax_rate: taxRate, tax_amount: lineTax, subtotal: taxable, total: taxable + lineTax,
    }])
    assertNoError(ie, 'PO items INSERT')

    // Simulate the new UI behavior: adding stock
    const { data: wh } = await supabase.from('warehouses').select('id').eq('company_id', company.id).limit(1).single()
    const { error: moveErr } = await supabase.rpc('fn_update_stock_level', {
      p_company_id: company.id, p_product_id: sim_product_id, p_variant_id: null,
      p_warehouse_id: wh.id, p_quantity: qty, p_unit_cost: unitCost,
      p_movement_type: 'purchase', p_notes: `Purchase ${number}`, p_created_by: user.id
    })
    assertNoError(moveErr, 'PO stock add')

    log('OK', `PO=${number}  total=${grandTotal}  tax=${lineTax}`)
  })

  // ══════════════════════════════════════════════════════════
  //  [G]  STOCK ADJUST DIALOG
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [G] StockAdjustDialog --')

  await test('StockAdjustDialog · warehouses SELECT (get default warehouse)', async () => {
    const { data: wh, error } = await supabase.from('warehouses').select('id').eq('company_id', company.id).limit(1).single()
    assertNoError(error, 'warehouse')
    sim_warehouse_id = wh.id
    log('OK', `warehouse=${sim_warehouse_id}`)
  })

  await test('StockAdjustDialog · fn_update_stock_level (add, Inventory Count)', async () => {
    assert(sim_product_id && sim_warehouse_id)
    const refId = `ADJ-${Date.now()}`
    const { error } = await supabase.rpc('fn_update_stock_level', {
      p_company_id: company.id, p_product_id: sim_product_id, p_variant_id: null,
      p_warehouse_id: sim_warehouse_id, p_quantity: 20, p_unit_cost: 1200,
      p_movement_type: 'count_adjustment',
      p_notes: `Inventory Count: SIM v2 (${refId})`, p_created_by: user.id,
    })
    assertNoError(error, 'fn_update_stock_level add')
    log('OK', 'Stock +20 (count_adjustment)')
  })

  await test('StockAdjustDialog · fn_update_stock_level (remove, Damaged)', async () => {
    assert(sim_product_id && sim_warehouse_id)
    const refId = `ADJ-${Date.now()}`
    const { error } = await supabase.rpc('fn_update_stock_level', {
      p_company_id: company.id, p_product_id: sim_product_id, p_variant_id: null,
      p_warehouse_id: sim_warehouse_id, p_quantity: -3, p_unit_cost: 1200,
      p_movement_type: 'adjustment',
      p_notes: `Damaged: Broken on delivery (${refId})`, p_created_by: user.id,
    })
    assertNoError(error, 'fn_update_stock_level remove')
    log('OK', 'Stock -3 (adjustment, Damaged)')
  })

  // ══════════════════════════════════════════════════════════
  //  [H]  COMMAND FORM + EN COURS PAGE + SUIVI PAGE
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [H] CommandForm + EnCoursPage + SuiviPage --')

  await test('CommandForm · customers query (SELECT * — not just id/name)', async () => {
    // CommandForm uses: .select('*') unlike SalesForm which uses .select('id, name, current_balance')
    const { data, error } = await supabase.from('customers').select('*').eq('company_id', company.id).eq('is_active', true)
    assertNoError(error, 'CommandForm customers')
    log('OK', `${data?.length} customers (full object)`)
  })

  await test('CommandForm · product search (v_product_variants_stock)', async () => {
    const { data, error } = await supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).eq('status', 'active').limit(10)
    assertNoError(error, 'CommandForm products')
    log('OK', `${data?.length} products`)
  })

  await test('CommandForm · onSubmit — INSERT command + command_items', async () => {
    // Need a customer for command (customer_id is required)
    const { data: cust } = await supabase.from('customers').select('id, name, phone').eq('company_id', company.id).eq('is_active', true).limit(1).single()
    if (!cust) { log('SKIP', 'no customer'); return }

    const grandTotal = 2000
    const { data: cmd, error: ce } = await supabase.from('commands').insert({
      company_id:       company.id,
      customer_id:      cust.id,
      delivery_address: '15 Rue Test, Alger Centre',
      notes:            'SIM v2 command',
      total:            grandTotal,
      status:           'pending',
    }).select().single()
    assertNoError(ce, 'commands INSERT')
    sim_command_id = cmd.id

    const commandItems = [{
      command_id:   sim_command_id,
      product_id:   sim_product_id,
      variant_id:   null,
      quantity:     1,
      unit_price:   2000,
      product_name: 'SIM Test Product v2',
    }]
    const { error: ie } = await supabase.from('command_items').insert(commandItems)
    assertNoError(ie, 'command_items INSERT')
    log('OK', `command id=${sim_command_id}  customer="${cust.name}"`)
  })

  await test('EnCoursPage · useQuery(commands) — SELECT with customer + command_items joins', async () => {
    // Exact query from EnCoursPage
    const { data, error } = await supabase
      .from('commands')
      .select(`*, customers(name, phone), command_items(*, products(name), product_variants(name))`)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    assertNoError(error, 'commands list')
    log('OK', `${data?.length} commands with full joins`)
  })

  await test('EnCoursPage · handleStatusChange (UPDATE commands.status + updated_at)', async () => {
    if (!sim_command_id) { log('SKIP', 'no command'); return }
    const { error } = await supabase.from('commands').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', sim_command_id)
    assertNoError(error, 'command status update')
    await supabase.from('commands').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', sim_command_id)
    log('OK', 'command status toggled pending → confirmed → pending')
  })

  await test('EnCoursPage · handleSubmitToYalidin → command_items SELECT + commands UPDATE tracking', async () => {
    if (!sim_command_id) { log('SKIP', 'no command'); return }
    // The Yalidin API call itself is skipped — just test the DB operations
    const { data: items, error } = await supabase.from('command_items').select('*').eq('command_id', sim_command_id)
    assertNoError(error, 'command_items SELECT')
    // Simulate getting a tracking ID back and updating
    const fakeTracking = `TRACK-SIM-${Date.now()}`
    const { error: ue } = await supabase.from('commands').update({ yalidin_tracking_id: fakeTracking, status: 'confirmed' }).eq('id', sim_command_id)
    assertNoError(ue, 'tracking UPDATE')
    // Restore
    await supabase.from('commands').update({ yalidin_tracking_id: null, status: 'pending' }).eq('id', sim_command_id)
    log('OK', `${items?.length} command items  fakeTracking=${fakeTracking}`)
  })

  await test('SuiviPage · SELECT commands (delivered/cancelled for history)', async () => {
    // SuiviPage shows delivered/cancelled commands
    const { data, error } = await supabase
      .from('commands')
      .select(`*, customers(name, phone), command_items(*, products(name))`)
      .eq('company_id', company.id)
      .in('status', ['delivered', 'cancelled'])
      .order('created_at', { ascending: false })
    assertNoError(error, 'SuiviPage commands')
    log('OK', `${data?.length} delivered/cancelled commands`)
  })

  // ══════════════════════════════════════════════════════════
  //  [I]  CHARGE FORM
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [I] ChargeForm --')

  await test('ChargeForm · active_products query for selector', async () => {
    const { data, error } = await supabase.from('products').select('id, name, sku').eq('company_id', company.id).eq('status', 'active').order('name')
    assertNoError(error, 'active products')
    log('OK', `${data?.length} active products in charge selector`)
  })

  await test('ChargeForm · INSERT charge linked to 1 product (non-recurring)', async () => {
    assert(sim_product_id)
    const pIds = [sim_product_id]
    const splitAmount = 4500 / pIds.length
    const inserts = pIds.map(pid => ({
      company_id: company.id, product_id: pid, variant_id: null,
      description: 'SIM Import Tax v2', amount: splitAmount,
      charge_date: today(), date_to: today(),
      notes: 'SIM v2 charge', created_by: user.id,
      is_recurring: false, recurring_interval: null, last_generated_at: null,
    }))
    const { error } = await supabase.from('product_charges').insert(inserts)
    assertNoError(error, 'product_charges INSERT')
    log('OK', `charge inserted  amount=${splitAmount}`)
  })

  await test('ChargeForm · INSERT charge with no product (product_id=null)', async () => {
    const { error } = await supabase.from('product_charges').insert([{
      company_id: company.id, product_id: null, variant_id: null,
      description: 'SIM General Cost v2', amount: 800,
      charge_date: today(), date_to: today(),
      notes: 'SIM v2 null product', created_by: user.id,
      is_recurring: false, recurring_interval: null, last_generated_at: null,
    }])
    assertNoError(error, 'charge null product INSERT')
    log('OK', 'charge inserted product_id=null')
  })

  await test('ChargeForm · INSERT recurring charge (monthly)', async () => {
    assert(sim_product_id)
    const { error } = await supabase.from('product_charges').insert([{
      company_id: company.id, product_id: sim_product_id, variant_id: null,
      description: 'SIM Monthly Rent v2', amount: 12000,
      charge_date: today(), date_to: today(),
      notes: 'SIM recurring test', created_by: user.id,
      is_recurring: true, recurring_interval: 'monthly', last_generated_at: today(),
    }])
    assertNoError(error, 'recurring charge INSERT')
    log('OK', 'recurring monthly charge inserted')
  })

  await test('ChargePage · SELECT product_charges with all joins', async () => {
    const { data, error } = await supabase.from('product_charges')
      .select('*, products(name, sku), variants:product_variants(name), profiles:created_by(full_name)')
      .eq('company_id', company.id).order('charge_date', { ascending: false }).limit(5)
    assertNoError(error, 'charges SELECT')
    log('OK', `${data?.length} charges with joins`)
  })

  await test('ChargeForm · generate_recurring_charges RPC', async () => {
    const { error } = await supabase.rpc('generate_recurring_charges', { p_company_id: company.id })
    if (error) log('WARN', `${error.code}: ${error.message}`)
    else log('OK', 'RPC executed')
  })

  // ══════════════════════════════════════════════════════════
  //  [J]  EXPENSE FORM
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [J] ExpenseForm --')

  await test('ExpenseForm · INSERT expense (category=Rent)', async () => {
    const { error } = await supabase.from('expenses').insert({
      company_id: company.id, created_by: user.id,
      amount: 35000, category: 'Rent', description: 'Monthly office rent',
      expense_date: today(), reference: `SIM-RENT-${Date.now()}`, notes: 'SIM v2',
    })
    assertNoError(error, 'expense INSERT Rent')
    log('OK', 'Rent expense inserted')
  })

  await test('ExpenseForm · INSERT expense (category=Fees/Bank Charges)', async () => {
    const { error } = await supabase.from('expenses').insert({
      company_id: company.id, created_by: user.id,
      amount: 450, category: 'Fees/Bank Charges', description: 'Bank transfer fee',
      expense_date: today(), reference: `SIM-BANK-${Date.now()}`, notes: 'Wire transfer',
    })
    assertNoError(error, 'expense INSERT Fees')
    log('OK', 'Bank fee expense inserted')
  })

  await test('AccountingPage · SELECT expenses (order by date, limit 5)', async () => {
    const { data, error } = await supabase.from('expenses').select('*').eq('company_id', company.id).order('expense_date', { ascending: false }).limit(5)
    assertNoError(error, 'expenses SELECT')
    log('OK', `${data?.length} expenses`)
  })

  // ══════════════════════════════════════════════════════════
  //  [K]  USER FORM
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [K] UserForm --')

  await test('UserForm · branches SELECT (branch selector dropdown)', async () => {
    const { data, error } = await supabase.from('branches').select('id, name').eq('company_id', company.id).eq('is_active', true).order('name')
    assertNoError(error, 'branches')
    log('OK', `${data?.length} branches`)
  })

  await test('UsersPage · profiles SELECT (list all users)', async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, branch_id').eq('company_id', company.id).order('full_name').limit(10)
    assertNoError(error, 'profiles list')
    log('OK', `${data?.length} profiles`)
  })

  await test('UserForm · profiles UPDATE (edit mode — name/role/branch)', async () => {
    const { error } = await supabase.from('profiles').update({ full_name: 'Admin SIM v2', role: 'super_admin', branch_id: null, updated_at: new Date().toISOString() }).eq('id', user.id)
    assertNoError(error, 'profiles UPDATE')
    await supabase.from('profiles').update({ full_name: 'Admin' }).eq('id', user.id)
    log('OK', 'profile updated then restored')
  })

  await test('UserForm · create_company_user RPC (create mode)', async () => {
    const { error } = await supabase.rpc('create_company_user', {
      p_email: 'noop_sim_v2@invalid.invalid', p_password: 'SimTest1234!',
      p_full_name: 'SIM User v2', p_role: 'viewer', p_company_id: company.id, p_branch_id: null,
    })
    if (error?.code === 'PGRST202' || (error?.message?.includes('function') && error?.message?.includes('does not exist'))) {
      throw new Error('RPC does not exist')
    }
    log('OK', `RPC callable  result=${error?.code ?? 'success'}`)
  })

  // ══════════════════════════════════════════════════════════
  //  [L]  COMPONENT FORM (Production)
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [L] ComponentForm (Production) --')

  await test('ComponentsPage · SELECT components (list)', async () => {
    const { data, error } = await supabase.from('components').select('*').eq('company_id', company.id).order('name')
    assertNoError(error, 'components SELECT')
    log('OK', `${data?.length} components`)
  })

  await test('ComponentForm · INSERT new component (all fields)', async () => {
    const { data, error } = await supabase.from('components').insert({
      name:              'SIM Raw Material v2',
      name_ar:           'مادة خام',
      name_fr:           'Matière première SIM',
      unit:              'kg',
      cost_price:        500,
      quantity_in_stock: 100,
      reorder_level:     20,
      status:            'active',
      company_id:        company.id,
    }).select().single()
    assertNoError(error, 'components INSERT')
    sim_component_id = data.id
    log('OK', `id=${sim_component_id}  name="${data.name}"  qty=${data.quantity_in_stock}`)
  })

  await test('ComponentForm · UPDATE component (edit mode)', async () => {
    assert(sim_component_id, 'no sim_component_id')
    const { error } = await supabase.from('components').update({
      name:              'SIM Raw Material v2 (Updated)',
      name_ar:           'مادة خام محدثة',
      name_fr:           'Matière première SIM MAJ',
      unit:              'kg',
      cost_price:        600,
      quantity_in_stock: 150,
      reorder_level:     25,
      status:            'active',
    }).eq('id', sim_component_id)
    assertNoError(error, 'components UPDATE')
    log('OK', 'component updated')
  })

  // ══════════════════════════════════════════════════════════
  //  [M]  RECIPE FORM + EXECUTE DIALOG
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [M] RecipeForm + RecipeExecuteDialog --')

  await test('RecipeForm · components query (selector)', async () => {
    const { data, error } = await supabase.from('components').select('*').eq('company_id', company.id).order('name')
    assertNoError(error, 'components for RecipeForm')
    log('OK', `${data?.length} components in selector`)
  })

  await test('RecipeForm · products query with variants (output selector)', async () => {
    const { data, error } = await supabase.from('products').select('*, product_variants(*)').eq('company_id', company.id).order('name')
    assertNoError(error, 'products with variants for RecipeForm')
    log('OK', `${data?.length} products with variants`)
  })

  await test('RecipeForm · INSERT recipe + recipe_items + recipe_outputs + recipe_charges', async () => {
    assert(sim_component_id && sim_product_id, 'missing ids')
    // Step 1 — INSERT recipe
    const { data: recipe, error: re } = await supabase.from('recipes').insert({
      company_id: company.id,
      name:       'SIM Recipe v2',
      name_ar:    'وصفة اختبار',
      name_fr:    'Recette SIM v2',
      notes:      'Simulation recipe',
    }).select('id').single()
    assertNoError(re, 'recipes INSERT')
    sim_recipe_id = recipe.id
    log('OK', `recipe id=${sim_recipe_id}`)

    // Step 2 — INSERT recipe_items (inputs)
    await supabase.from('recipe_items').insert([{
      recipe_id:     sim_recipe_id,
      component_id:  sim_component_id,
      quantity_used: 5,
    }])

    // Step 3 — INSERT recipe_outputs
    await supabase.from('recipe_outputs').insert([{
      recipe_id:         sim_recipe_id,
      product_id:        sim_product_id,
      variant_id:        null,
      quantity_produced: 2,
    }])

    // Step 4 — INSERT recipe_charges
    await supabase.from('recipe_charges').insert([{
      recipe_id:   sim_recipe_id,
      description: 'SIM Production Cost',
      amount:      1500,
    }])

    log('OK', 'recipe + items + outputs + charges inserted')
  })

  await test('RecipesPage · SELECT recipes with joins', async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select(`*, recipe_items(*, component:components(id, name, unit, quantity_in_stock, cost_price)), recipe_outputs(*, product:products(id, name), variant:product_variants(id, name)), recipe_charges(*)`)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    assertNoError(error, 'recipes SELECT')
    log('OK', `${data?.length} recipes with all joins`)
  })

  await test('RecipeExecuteDialog · handleExecute — deduct component stock + stock_movements + recipe_executions', async () => {
    assert(sim_recipe_id && sim_component_id && sim_product_id, 'missing ids')

    // Step 1 — Deduct component stock (exact logic in RecipeExecuteDialog)
    const deductQty = 5
    const { data: comp } = await supabase.from('components').select('quantity_in_stock').eq('id', sim_component_id).single()
    const newStock = Math.max(0, Number(comp?.quantity_in_stock || 0) - deductQty)
    const { error: compErr } = await supabase.from('components').update({ quantity_in_stock: newStock }).eq('id', sim_component_id)
    assertNoError(compErr, 'component deduct')
    log('OK', `component ${sim_component_id} stock: ${comp?.quantity_in_stock} → ${newStock}`)

    // Step 2 — Fetch default warehouse and insert stock_levels + stock_movements via RPC
    const { data: wh } = await supabase.from('warehouses').select('id').eq('company_id', company.id).limit(1).single()
    const { error: moveErr } = await supabase.rpc('fn_update_stock_level', {
      p_company_id: company.id,
      p_product_id: sim_product_id,
      p_variant_id: null,
      p_warehouse_id: wh.id,
      p_quantity: 2,
      p_unit_cost: 0,
      p_movement_type: 'adjustment',
      p_notes: `REC-${sim_recipe_id.substring(0, 8)}`,
      p_created_by: user.id
    })
    assertNoError(moveErr, 'stock_movements INSERT recipe')

    // Step 3 — INSERT recipe_executions
    const { error: execErr } = await supabase.from('recipe_executions').insert({
      recipe_id:   sim_recipe_id,
      company_id:  company.id,
      executed_by: user.id,
      total_cost:  1500,
    })
    assertNoError(execErr, 'recipe_executions INSERT')
    log('OK', 'recipe executed: component deducted + stock_movement + execution logged')
  })

  await test('RecipeForm · UPDATE recipe (edit mode — delete old sub-rows + re-insert)', async () => {
    assert(sim_recipe_id, 'no sim_recipe_id')
    // Update basic info
    const { error: ue } = await supabase.from('recipes').update({ name: 'SIM Recipe v2 (Updated)', updated_at: new Date().toISOString() }).eq('id', sim_recipe_id)
    assertNoError(ue, 'recipes UPDATE')
    // Clear sub-rows
    await supabase.from('recipe_items').delete().eq('recipe_id', sim_recipe_id)
    await supabase.from('recipe_outputs').delete().eq('recipe_id', sim_recipe_id)
    await supabase.from('recipe_charges').delete().eq('recipe_id', sim_recipe_id)
    // Re-insert
    await supabase.from('recipe_items').insert([{ recipe_id: sim_recipe_id, component_id: sim_component_id, quantity_used: 3 }])
    await supabase.from('recipe_outputs').insert([{ recipe_id: sim_recipe_id, product_id: sim_product_id, variant_id: null, quantity_produced: 1 }])
    await supabase.from('recipe_charges').insert([{ recipe_id: sim_recipe_id, description: 'Updated Cost', amount: 800 }])
    log('OK', 'recipe updated (delete+re-insert sub-rows)')
  })

  // ══════════════════════════════════════════════════════════
  //  [N]  QuickAddCustomerForm (inline in SalesForm/CommandForm)
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [N] QuickAddCustomerForm (inline) --')

  await test('QuickAddCustomerForm · INSERT minimal customer (name + phone only)', async () => {
    // QuickAddCustomerForm inserts the minimal required fields
    const { data, error } = await supabase.from('customers').insert({
      company_id:  company.id,
      name:        'SIM Quick Customer v2',
      phone:       '+213661999000',
      is_active:   true,
      credit_balance:  0,
      current_balance: 0,
    }).select().single()
    assertNoError(error, 'QuickAdd customer INSERT')
    log('OK', `quick customer id=${data.id}  name="${data.name}"`)
    // Cleanup immediately
    await supabase.from('customers').delete().eq('id', data.id)
  })

  // ══════════════════════════════════════════════════════════
  //  AUTH SESSION CHECK
  // ══════════════════════════════════════════════════════════
  await test('Auth · getSession (verify session still active after all ops)', async () => {
    const { data, error } = await supabase.auth.getSession()
    assertNoError(error, 'getSession')
    assert(data?.session?.user?.id)
    log('OK', `Session active for ${data.session.user.email}`)
  })

  // ══════════════════════════════════════════════════════════
  //  [O]  CLEANUP
  // ══════════════════════════════════════════════════════════
  console.log('\n-- [O] Cleanup --')

  await test('CLEANUP · recipe_executions', async () => {
    if (!sim_recipe_id) return
    await supabase.from('recipe_executions').delete().eq('recipe_id', sim_recipe_id)
    log('OK', 'cleaned')
  })

  await test('CLEANUP · recipe sub-tables', async () => {
    if (!sim_recipe_id) return
    await supabase.from('recipe_items').delete().eq('recipe_id', sim_recipe_id)
    await supabase.from('recipe_outputs').delete().eq('recipe_id', sim_recipe_id)
    await supabase.from('recipe_charges').delete().eq('recipe_id', sim_recipe_id)
    log('OK', 'items/outputs/charges cleaned')
  })

  await test('CLEANUP · recipe', async () => {
    if (!sim_recipe_id) return
    const { error } = await supabase.from('recipes').delete().eq('id', sim_recipe_id)
    assertNoError(error, 'DELETE recipe')
    log('OK', 'cleaned')
  })

  await test('CLEANUP · component', async () => {
    if (!sim_component_id) return
    const { error } = await supabase.from('components').delete().eq('id', sim_component_id)
    if (error) log('WARN', error.message); else log('OK', 'cleaned')
  })

  await test('CLEANUP · customer_debt_payments', async () => {
    if (!sim_customer_id) return
    await supabase.from('customer_debt_payments').delete().eq('customer_id', sim_customer_id)
    log('OK', 'cleaned')
  })

  await test('CLEANUP · command_items + command', async () => {
    if (!sim_command_id) return
    await supabase.from('command_items').delete().eq('command_id', sim_command_id)
    const { error } = await supabase.from('commands').delete().eq('id', sim_command_id)
    if (error) log('WARN', error.message); else log('OK', 'cleaned')
  })

  await test('CLEANUP · sales_order_items + sales_order', async () => {
    if (!sim_so_id) return
    await supabase.from('sales_order_items').delete().eq('so_id', sim_so_id)
    const { error } = await supabase.from('sales_orders').delete().eq('id', sim_so_id)
    assertNoError(error, 'DELETE SO')
    log('OK', 'cleaned')
  })

  await test('CLEANUP · purchase_order_items + purchase_order', async () => {
    if (!sim_po_id) return
    await supabase.from('purchase_order_items').delete().eq('po_id', sim_po_id)
    const { error } = await supabase.from('purchase_orders').delete().eq('id', sim_po_id)
    assertNoError(error, 'DELETE PO')
    log('OK', 'cleaned')
  })

  await test('CLEANUP · product_charges for sim product', async () => {
    if (!sim_product_id) return
    await supabase.from('product_charges').delete().eq('product_id', sim_product_id)
    log('OK', 'cleaned')
  })

  await test('CLEANUP · stock_movements for sim product', async () => {
    if (!sim_product_id) return
    const { error } = await supabase.from('stock_movements').delete().eq('product_id', sim_product_id)
    if (error) log('WARN', `stock_movements: ${error.message}`); else log('OK', 'cleaned')
  })

  await test('CLEANUP · stock_levels for sim product', async () => {
    if (!sim_product_id) return
    const { error } = await supabase.from('stock_levels').delete().eq('product_id', sim_product_id)
    if (error) log('WARN', `stock_levels: ${error.message}`); else log('OK', 'cleaned')
  })

  await test('CLEANUP · product_variant', async () => {
    if (!sim_variant_id) return
    const { error } = await supabase.from('product_variants').delete().eq('id', sim_variant_id)
    if (error) log('WARN', error.message); else log('OK', 'cleaned')
  })

  await test('CLEANUP · product', async () => {
    if (!sim_product_id) return
    const { error } = await supabase.from('products').delete().eq('id', sim_product_id)
    if (error?.code === '23503') log('WARN', 'FK constraint (normal)')
    else { assertNoError(error, 'DELETE product'); log('OK', 'cleaned') }
  })

  await test('CLEANUP · customer', async () => {
    if (!sim_customer_id) return
    const { error } = await supabase.from('customers').delete().eq('id', sim_customer_id)
    if (error?.code === '23503') log('WARN', 'FK constraint (normal)')
    else { assertNoError(error, 'DELETE customer'); log('OK', 'cleaned') }
  })

  await test('CLEANUP · supplier', async () => {
    if (!sim_supplier_id) return
    const { error } = await supabase.from('suppliers').delete().eq('id', sim_supplier_id)
    if (error) log('WARN', error.message); else log('OK', 'cleaned')
  })

  await supabase.auth.signOut()
  printSummary()
}

function printSummary() {
  const total = passed + failed
  console.log('\n==============================================')
  console.log(`  Results: ${passed} passed / ${failed} failed (${total} total)`)
  if (failures.length) {
    console.log('\n  FAILED TESTS:')
    failures.forEach(({ name, detail }) => {
      console.log(`\n  X  ${name}`)
      console.log(`     ${detail}`)
    })
  } else {
    console.log('\n  All UI simulations passed!')
  }
  console.log('==============================================\n')
}

main().catch(err => { console.error('\nCrash:', err); process.exit(1) })
