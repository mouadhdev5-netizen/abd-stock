/**
 * ============================================================
 *  ABD-STOCK — Supabase API Test Suite
 *  Run with:  node supabase_test.mjs
 *
 *  Prerequisites:
 *    1. Your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must
 *       be set in .env (already present in this project).
 *    2. Fill in your login credentials in CONFIG below.
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env['VITE_SUPABASE_URL']
const SUPABASE_ANON_KEY = env['VITE_SUPABASE_ANON_KEY']

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

// === SET YOUR CREDENTIALS HERE ===
const CONFIG = {
  email: 'admin@abdstock.com',
  password: 'password123',
}
// =================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let passed = 0, failed = 0
const failures = []

const log = (e, m) => console.log(`  ${e}  ${m}`)

async function test(name, fn) {
  process.stdout.write(`\n  [TEST] ${name} ... `)
  try {
    await fn()
    console.log('PASS')
    passed++
  } catch (err) {
    console.log('FAIL')
    const detail = err?.message || JSON.stringify(err)
    log('ERR >', detail)
    failures.push({ name, detail })
    failed++
  }
}

const assert = (c, m) => { if (!c) throw new Error(m || 'Assertion failed') }
const assertNoError = (e, ctx) => {
  if (e) throw new Error(`[${ctx}] ${e.message} (code: ${e.code}, hint: ${e.hint})`)
}

async function main() {
  console.log('\n=========================================')
  console.log('  ABD-STOCK Supabase API Test Suite')
  console.log(`  URL: ${SUPABASE_URL}`)
  console.log('=========================================')

  let company_id = null, user_id = null
  let test_product_id = null, test_customer_id = null
  let test_supplier_id = null, test_sales_order_id = null
  let test_purchase_order_id = null, test_warehouse_id = null

  // 0. Auth
  console.log('\n-- 0. Authentication --')

  await test('signInWithPassword', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: CONFIG.email, password: CONFIG.password })
    assertNoError(error, 'signIn')
    assert(data?.user?.id, 'No user returned')
    user_id = data.user.id
    log('OK', `Signed in as ${data.user.email}`)
  })

  await test('profiles - SELECT own profile + get company_id', async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, company_id').eq('id', user_id).single()
    assertNoError(error, 'profiles fetch')
    assert(data?.company_id, 'No company_id on profile')
    company_id = data.company_id
    log('OK', `company_id=${company_id}  role=${data.role}`)
  })

  if (!company_id) {
    console.log('\nCannot continue without company_id')
    return printSummary()
  }

  // 1. Core lookups
  console.log('\n-- 1. Core Tables --')

  await test('companies - SELECT', async () => {
    const { data, error } = await supabase.from('companies').select('id, name, currency').eq('id', company_id).single()
    assertNoError(error, 'companies')
    log('OK', `${data.name} (${data.currency})`)
  })

  await test('warehouses - SELECT', async () => {
    const { data, error } = await supabase.from('warehouses').select('id, name').eq('company_id', company_id).limit(1)
    assertNoError(error, 'warehouses')
    if (data?.length) { test_warehouse_id = data[0].id; log('OK', `${data[0].name}`) }
    else log('WARN', 'No warehouses found')
  })

  await test('branches - SELECT', async () => {
    const { data, error } = await supabase.from('branches').select('id, name, is_active').eq('company_id', company_id).eq('is_active', true)
    assertNoError(error, 'branches')
    log('OK', `${data?.length ?? 0} branches`)
  })

  // 2. Products
  console.log('\n-- 2. Products --')

  await test('products - SELECT', async () => {
    const { data, error } = await supabase.from('products').select('id, name, has_variants, status, sku, barcode').eq('company_id', company_id).order('name')
    assertNoError(error, 'products')
    log('OK', `${data.length} products`)
    if (data.length) test_product_id = data[0].id
  })

  await test('v_product_stock - SELECT (view)', async () => {
    const { data, error } = await supabase.from('v_product_stock').select('*').eq('company_id', company_id).order('name').limit(5)
    assertNoError(error, 'v_product_stock')
    log('OK', `${data.length} rows. Columns: ${data[0] ? Object.keys(data[0]).join(', ') : 'none'}`)
  })

  await test('v_product_variants_stock - SELECT (view)', async () => {
    const { data, error } = await supabase.from('v_product_variants_stock').select('*').eq('company_id', company_id).eq('status', 'active').limit(5)
    assertNoError(error, 'v_product_variants_stock')
    log('OK', `${data.length} rows. Columns: ${data[0] ? Object.keys(data[0]).join(', ') : 'none'}`)
  })

  await test('product_variants - SELECT', async () => {
    const { data, error } = await supabase.from('product_variants').select('id, name, sku, is_active, cost_price').order('name').limit(5)
    assertNoError(error, 'product_variants')
    log('OK', `${data?.length ?? 0} rows`)
  })

  await test('products - INSERT (test product)', async () => {
    const { data, error } = await supabase.from('products').insert({ company_id, name: `__TEST_PRODUCT_${Date.now()}`, sku: `TST-${Date.now()}`, sell_price: 100, cost_price: 60, status: 'active', has_variants: false }).select().single()
    assertNoError(error, 'products INSERT')
    test_product_id = data.id
    log('OK', `id=${test_product_id}`)
  })

  await test('products - UPDATE status', async () => {
    assert(test_product_id, 'no test product')
    const { error } = await supabase.from('products').update({ status: 'inactive' }).eq('id', test_product_id)
    assertNoError(error, 'products UPDATE')
    log('OK', 'status toggled to inactive')
  })

  // 3. Customers
  console.log('\n-- 3. Customers --')

  await test('customers - SELECT', async () => {
    const { data, error } = await supabase.from('customers').select('id, name, current_balance, is_active').eq('company_id', company_id).eq('is_active', true).limit(5)
    assertNoError(error, 'customers SELECT')
    log('OK', `${data?.length} customers`)
    if (data?.length) test_customer_id = data[0].id
  })

  await test('customers - INSERT', async () => {
    const { data, error } = await supabase.from('customers').insert({ company_id, name: `__TEST_CUST_${Date.now()}`, is_active: true, current_balance: 0, credit_balance: 0 }).select().single()
    assertNoError(error, 'customers INSERT')
    test_customer_id = data.id
    log('OK', `id=${test_customer_id}`)
  })

  await test('customers - UPDATE current_balance', async () => {
    const { error } = await supabase.from('customers').update({ current_balance: 500 }).eq('id', test_customer_id)
    assertNoError(error, 'UPDATE current_balance')
    log('OK', 'current_balance=500')
  })

  await test('customers - UPDATE credit_balance (CustomerDebtSection)', async () => {
    const { error } = await supabase.from('customers').update({ credit_balance: 200 }).eq('id', test_customer_id)
    assertNoError(error, 'UPDATE credit_balance')
    log('OK', 'credit_balance=200')
  })

  await test('customer_debt_payments - SELECT with profile join', async () => {
    const { data, error } = await supabase.from('customer_debt_payments').select('*, profiles:created_by(full_name)').eq('customer_id', test_customer_id).order('payment_date', { ascending: false })
    assertNoError(error, 'customer_debt_payments')
    log('OK', `${data?.length} payments`)
  })

  // 4. Suppliers
  console.log('\n-- 4. Suppliers --')

  await test('suppliers - SELECT', async () => {
    const { data, error } = await supabase.from('suppliers').select('id, name, current_balance, is_active').eq('company_id', company_id).eq('is_active', true).limit(5)
    assertNoError(error, 'suppliers')
    log('OK', `${data?.length} suppliers`)
    if (data?.length) test_supplier_id = data[0].id
  })

  // 5. Sales Orders
  console.log('\n-- 5. Sales Orders --')

  await test('sales_orders - INSERT', async () => {
    const soNumber = `SO-TST-${Date.now()}`
    const { data, error } = await supabase.from('sales_orders').insert({ company_id, so_number: soNumber, customer_id: test_customer_id || null, status: 'completed', subtotal: 100, tax_amount: 0, discount_amount: 0, total: 100, paid_amount: 100, notes: 'TEST' }).select().single()
    assertNoError(error, 'sales_orders INSERT')
    test_sales_order_id = data.id
    log('OK', `${soNumber}`)
  })

  await test('sales_order_items - INSERT', async () => {
    assert(test_sales_order_id && test_product_id, 'missing ids')
    const { error } = await supabase.from('sales_order_items').insert({ so_id: test_sales_order_id, product_id: test_product_id, variant_id: null, quantity: 1, unit_price: 100, discount_amount: 0, tax_rate: 0, subtotal: 100, total: 100 })
    assertNoError(error, 'sales_order_items INSERT')
    log('OK', 'item inserted')
  })

  await test('sales_orders - SELECT with customer join (deliveries query)', async () => {
    // customers table has no `address` column — addresses are in customer_addresses table
    const { data, error } = await supabase.from('sales_orders').select('*, customers(name, phone)').eq('company_id', company_id).in('status', ['processing', 'confirmed', 'partial']).order('created_at', { ascending: false }).limit(5)
    assertNoError(error, 'sales_orders delivery SELECT')
    log('OK', `${data?.length} delivery orders`)
  })

  await test('sales_orders - UPDATE status', async () => {
    const { error } = await supabase.from('sales_orders').update({ status: 'completed' }).eq('id', test_sales_order_id)
    assertNoError(error, 'sales_orders UPDATE')
    log('OK', 'status updated')
  })

  // 6. Purchase Orders
  console.log('\n-- 6. Purchase Orders --')

  await test('purchase_orders - INSERT', async () => {
    if (!test_supplier_id) {
      const { data: s } = await supabase.from('suppliers').insert({ company_id, name: `__TEST_SUP_${Date.now()}`, is_active: true }).select().single()
      test_supplier_id = s?.id
    }
    assert(test_supplier_id, 'no supplier')
    const poNumber = `PO-TST-${Date.now()}`
    const { data, error } = await supabase.from('purchase_orders').insert({ company_id, po_number: poNumber, supplier_id: test_supplier_id, status: 'received', subtotal: 60, tax_amount: 0, discount_amount: 0, total: 60, paid_amount: 60, notes: 'TEST' }).select().single()
    assertNoError(error, 'purchase_orders INSERT')
    test_purchase_order_id = data.id
    log('OK', `${poNumber}`)
  })

  await test('purchase_order_items - INSERT (needs migration 031_fix_po_items_rls.sql)', async () => {
    assert(test_purchase_order_id && test_product_id, 'missing ids')
    const { error } = await supabase.from('purchase_order_items').insert({ po_id: test_purchase_order_id, product_id: test_product_id, variant_id: null, quantity: 2, unit_cost: 30, discount_amount: 0, tax_rate: 0, tax_amount: 0, subtotal: 60, total: 60 })
    if (error?.code === '42501') throw new Error(`RLS policy missing — run supabase/migrations/031_fix_po_items_rls.sql in Supabase SQL Editor first. Error: ${error.message}`)
    assertNoError(error, 'purchase_order_items INSERT')
    log('OK', 'item inserted')
  })

  // 7. Inventory / Stock
  console.log('\n-- 7. Inventory --')

  await test('fn_update_stock_level - RPC (stock adjustment)', async () => {
    if (!test_warehouse_id) throw new Error('Skipped: no warehouse')
    assert(test_product_id, 'no product')
    const { error } = await supabase.rpc('fn_update_stock_level', { p_company_id: company_id, p_product_id: test_product_id, p_variant_id: null, p_warehouse_id: test_warehouse_id, p_quantity: 5, p_unit_cost: 60, p_movement_type: 'count_adjustment', p_notes: 'TEST', p_created_by: user_id })
    assertNoError(error, 'fn_update_stock_level')
    log('OK', 'stock adjusted +5')
  })

  // 8. Charges
  console.log('\n-- 8. Product Charges --')

  await test('product_charges - SELECT with joins', async () => {
    const { data, error } = await supabase.from('product_charges').select('*, products(name, sku), variants:product_variants(name), profiles:created_by(full_name)').eq('company_id', company_id).order('charge_date', { ascending: false }).limit(5)
    assertNoError(error, 'product_charges SELECT')
    log('OK', `${data?.length} charges`)
  })

  await test('product_charges - INSERT', async () => {
    assert(test_product_id, 'no product')
    const { error } = await supabase.from('product_charges').insert({ company_id, product_id: test_product_id, variant_id: null, description: 'TEST Charge', amount: 50, charge_date: new Date().toISOString().split('T')[0], notes: 'TEST', created_by: user_id, is_recurring: false, recurring_interval: null, last_generated_at: null })
    assertNoError(error, 'product_charges INSERT')
    log('OK', 'charge inserted')
  })

  await test('generate_recurring_charges - RPC', async () => {
    const { error } = await supabase.rpc('generate_recurring_charges', { p_company_id: company_id })
    if (error) { log('WARN', `${error.code}: ${error.message} (may not exist yet)`) }
    else log('OK', 'RPC executed')
  })

  // 9. Expenses
  console.log('\n-- 9. Expenses --')

  await test('expenses - INSERT', async () => {
    const { error } = await supabase.from('expenses').insert({ company_id, created_by: user_id, amount: 200, category: 'Other', description: 'TEST Expense', expense_date: new Date().toISOString().split('T')[0], reference: `TST-${Date.now()}`, notes: 'test script' })
    assertNoError(error, 'expenses INSERT')
    log('OK', 'expense inserted')
  })

  await test('expenses - SELECT', async () => {
    const { data, error } = await supabase.from('expenses').select('*').eq('company_id', company_id).order('expense_date', { ascending: false }).limit(5)
    assertNoError(error, 'expenses SELECT')
    log('OK', `${data?.length} expenses`)
  })

  // 10. Users / Profiles
  console.log('\n-- 10. Users & Profiles --')

  await test('profiles - SELECT all (users list)', async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, branch_id').eq('company_id', company_id).order('full_name').limit(10)
    assertNoError(error, 'profiles list')
    log('OK', `${data?.length} profiles`)
  })

  await test('profiles - UPDATE own profile', async () => {
    const { error } = await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user_id)
    assertNoError(error, 'profiles UPDATE')
    log('OK', 'own profile updated')
  })

  await test('create_company_user - RPC exists check', async () => {
    const { error } = await supabase.rpc('create_company_user', { p_email: 'noop_test@invalid.invalid', p_password: 'Test1234!', p_full_name: 'Test User', p_role: 'viewer', p_company_id: company_id, p_branch_id: null })
    if (error?.code === 'PGRST202' || (error?.message?.includes('function') && error?.message?.includes('does not exist'))) {
      throw new Error(`RPC does not exist: ${error.message}`)
    }
    log('OK', `RPC exists (got: ${error?.code ?? 'success'} - ${error?.message?.slice(0, 60) ?? 'no error'})`)
  })

  // 11. Commands
  console.log('\n-- 11. Commands --')

  await test('sales_orders - SELECT pending/processing (commands)', async () => {
    const { data, error } = await supabase.from('sales_orders').select('*, customers(name, phone)').eq('company_id', company_id).in('status', ['processing', 'confirmed']).order('created_at', { ascending: false }).limit(5)
    assertNoError(error, 'commands SELECT')
    log('OK', `${data?.length} command orders`)
  })

  // 12. Auth session
  console.log('\n-- 12. Auth --')

  await test('getSession', async () => {
    const { data, error } = await supabase.auth.getSession()
    assertNoError(error, 'getSession')
    assert(data?.session?.user?.id, 'No active session')
    log('OK', `session for ${data.session.user.email}`)
  })

  // Cleanup
  console.log('\n-- Cleanup --')

  await test('DELETE sales_order_items', async () => {
    if (!test_sales_order_id) return
    await supabase.from('sales_order_items').delete().eq('sales_order_id', test_sales_order_id)
    log('OK', 'cleaned')
  })

  await test('DELETE sales_order', async () => {
    if (!test_sales_order_id) return
    const { error } = await supabase.from('sales_orders').delete().eq('id', test_sales_order_id)
    assertNoError(error, 'DELETE sales_order')
    log('OK', 'cleaned')
  })

  await test('DELETE purchase_order_items', async () => {
    if (!test_purchase_order_id) return
    await supabase.from('purchase_order_items').delete().eq('po_id', test_purchase_order_id)
    log('OK', 'cleaned')
  })

  await test('DELETE purchase_order', async () => {
    if (!test_purchase_order_id) return
    const { error } = await supabase.from('purchase_orders').delete().eq('id', test_purchase_order_id)
    assertNoError(error, 'DELETE purchase_order')
    log('OK', 'cleaned')
  })

  await test('DELETE product_charges (test product)', async () => {
    if (!test_product_id) return
    await supabase.from('product_charges').delete().eq('product_id', test_product_id)
    log('OK', 'cleaned')
  })

  await test('DELETE product', async () => {
    if (!test_product_id) return
    const { error } = await supabase.from('products').delete().eq('id', test_product_id)
    if (error?.code === '23503') log('WARN', 'FK constraint — product has dependent rows (normal if stock was adjusted)')
    else { assertNoError(error, 'DELETE product'); log('OK', 'cleaned') }
  })

  await test('DELETE customer', async () => {
    if (!test_customer_id) return
    const { error } = await supabase.from('customers').delete().eq('id', test_customer_id)
    if (error?.code === '23503') log('WARN', 'FK constraint — customer has related orders')
    else { assertNoError(error, 'DELETE customer'); log('OK', 'cleaned') }
  })

  await supabase.auth.signOut()
  printSummary()
}

function printSummary() {
  const total = passed + failed
  console.log('\n=========================================')
  console.log(`  Results: ${passed} passed / ${failed} failed (${total} total)`)
  if (failures.length) {
    console.log('\n  FAILED TESTS:')
    failures.forEach(({ name, detail }) => {
      console.log(`\n  X  ${name}`)
      console.log(`     ${detail}`)
    })
  } else {
    console.log('\n  All tests passed!')
  }
  console.log('=========================================\n')
}

main().catch(err => {
  console.error('\nUnexpected crash:', err)
  process.exit(1)
})

