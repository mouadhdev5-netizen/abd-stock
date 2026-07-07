import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { SectionCard } from '@/components/ui/SectionCard'
import { ShoppingCart, DollarSign, Package, Archive, TrendingUp, TrendingDown } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns'
import { fr, ar, enUS } from 'date-fns/locale'
import { useSettingsStore } from '@/store/settingsStore'

// ─── Types ───────────────────────────────────────────────────────────────────
type DateRange = '7' | '30' | '90'

interface KpiData {
  totalSales: number
  totalRevenue: number
  totalItemsSold: number
  totalStock: number
}

interface ChartPoint {
  date: string
  revenue: number
  costs: number
}

interface BestCustomer {
  id: string
  name: string
  order_count: number
  total_spent: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useStartDate(range: DateRange): Date {
  return useMemo(() => subDays(new Date(), parseInt(range)), [range])
}

// ─── Product Filter Select ────────────────────────────────────────────────────
interface ProductOption { id: string; name: string }

function ProductFilterSelect({
  value,
  onChange,
  companyId,
}: {
  value: string
  onChange: (v: string) => void
  companyId: string
}) {
  const { t } = useTranslation('commerce')
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['dashboard-products', companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('v_product_variants_stock')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')
      return data || []
    },
    enabled: !!companyId,
  })

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[180px]"
    >
      <option value="all">{t('dashboard.filter_by_product')}</option>
      {products.map((p) => (
        <option key={p.variant_id ? `${p.product_id}|${p.variant_id}` : p.product_id} value={p.variant_id ? `${p.product_id}|${p.variant_id}` : p.product_id}>
          {p.full_name}
        </option>
      ))}
    </select>
  )
}

// ─── Best Customers Table ─────────────────────────────────────────────────────
function BestCustomersTable({
  customers,
  isLoading,
  currency,
}: {
  customers: BestCustomer[]
  isLoading: boolean
  currency: string
}) {
  const { t } = useTranslation('commerce')
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="rounded-xl border bg-card shadow-sm h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">{t('dashboard.best_customers')}</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            {t('dashboard.no_customers')}
          </div>
        ) : (
          <div className="divide-y">
            {customers.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg w-6 shrink-0">{medals[i] || `#${i + 1}`}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.order_count} {t('dashboard.orders')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 shrink-0 ms-2">
                  {formatCurrency(c.total_spent, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sales vs Costs Chart ──────────────────────────────────────────────────────
function SalesCostChart({
  data,
  isLoading,
  currency,
}: {
  data: ChartPoint[]
  isLoading: boolean
  currency: string
}) {
  const { t } = useTranslation('commerce')
  const { language } = useSettingsStore()

  const localeMap: Record<string, any> = { fr, ar, en: enUS }
  const dateLocale = localeMap[language] || fr

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card shadow-sm p-4 h-[360px] flex flex-col gap-3">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="flex-1 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg text-sm">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, currency)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-2">
      <h3 className="font-semibold text-sm">{t('dashboard.sales_vs_costs')}</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          {t('dashboard.no_data')}
        </div>
      ) : (
        <div className="h-[300px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
              <XAxis
                dataKey="date"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => formatNumber(v, 0)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => value === 'revenue' ? t('dashboard.revenue') : t('dashboard.costs')}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="costs"
                stroke="#ef4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCosts)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation('commerce')
  const { company } = useAuthStore()
  const { language } = useSettingsStore()
  const companyId = company?.id ?? ''
  const currency = (company as any)?.currency || 'DZD'

  const [dateRange, setDateRange] = useState<DateRange>('30')
  const [productFilter, setProductFilter] = useState<string>('all')
  const startDate = useStartDate(dateRange)

  const startDateStr = startDate.toISOString()
  const activeProduct = productFilter === 'all' ? null : productFilter

  // ── KPI Query ──────────────────────────────────────────────────────────────
  const { data: kpiData, isLoading: kpiLoading } = useQuery<KpiData>({
    queryKey: ['commerce-kpis', companyId, dateRange, productFilter],
    queryFn: async () => {
      if (!companyId) return { totalSales: 0, totalRevenue: 0, totalItemsSold: 0, totalStock: 0 }

      // Total Sales count + Revenue
      let salesQuery = (supabase as any)
        .from('sales_orders')
        .select('id, total', { count: 'exact' })
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('created_at', startDateStr)

      if (activeProduct) {
        const [fProdId, fVarId] = activeProduct.includes('|') ? activeProduct.split('|') : [activeProduct, null]
        // Need to filter by product — get order IDs with that product
        let oiQuery = (supabase as any)
          .from('sales_order_items')
          .select('sales_order_id')
          .eq('product_id', fProdId)
        
        if (fVarId && fVarId !== 'null') {
          oiQuery = oiQuery.eq('variant_id', fVarId)
        }

        const { data: orderItems } = await oiQuery
        const orderIds = (orderItems || []).map((i: any) => i.sales_order_id)
        if (orderIds.length === 0) return { totalSales: 0, totalRevenue: 0, totalItemsSold: 0, totalStock: 0 }
        salesQuery = salesQuery.in('id', orderIds)
      }

      const { data: salesOrders, count } = await salesQuery
      const totalRevenue = (salesOrders || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0)
      const totalSales = count || 0

      // Items sold
      let itemsQuery = (supabase as any)
        .from('sales_order_items')
        .select('quantity, sales_orders!inner(company_id, status, created_at)')
        .eq('sales_orders.company_id', companyId)
        .neq('sales_orders.status', 'cancelled')
        .gte('sales_orders.created_at', startDateStr)

      if (activeProduct) {
        const [fProdId, fVarId] = activeProduct.includes('|') ? activeProduct.split('|') : [activeProduct, null]
        itemsQuery = itemsQuery.eq('product_id', fProdId)
        if (fVarId && fVarId !== 'null') {
          itemsQuery = itemsQuery.eq('variant_id', fVarId)
        }
      }

      const { data: items } = await itemsQuery
      const totalItemsSold = (items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)

      // Stock — use products table with stock_movements aggregate
      let stockQuery = (supabase as any)
        .from('products')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'active')

      if (activeProduct) {
        stockQuery = stockQuery.eq('id', activeProduct)
      }

      const { data: productRows } = await stockQuery
      let totalStock = 0
      if (productRows && productRows.length > 0) {
        const pIds = productRows.map((p: any) => p.id)
        let smQuery = (supabase as any)
          .from('stock_movements')
          .select('quantity, product_id, variant_id')
          .in('product_id', pIds)
          
        if (activeProduct) {
          const [fProdId, fVarId] = activeProduct.includes('|') ? activeProduct.split('|') : [activeProduct, null]
          if (fVarId && fVarId !== 'null') {
            smQuery = smQuery.eq('variant_id', fVarId)
          } else if (fVarId === 'null') {
             // Exact match for product-only (no variant) is tricky via PostgREST, but we do what we can
             smQuery = smQuery.is('variant_id', null)
          }
        }
        
        const { data: stockData } = await smQuery
        totalStock = (stockData || []).reduce((sum: number, m: any) => sum + (m.quantity || 0), 0)
      }

      return { totalSales, totalRevenue, totalItemsSold, totalStock: Math.max(0, totalStock) }
    },
    enabled: !!companyId,
  })

  // ── Chart Query ────────────────────────────────────────────────────────────
  const { data: chartData = [], isLoading: chartLoading } = useQuery<ChartPoint[]>({
    queryKey: ['commerce-chart', companyId, dateRange, productFilter],
    queryFn: async () => {
      if (!companyId) return []

      const localeMap: Record<string, any> = { fr, ar, en: enUS }
      const dateLocale = localeMap[language] || fr

      // Build date range array
      const days = eachDayOfInterval({ start: startDate, end: new Date() })
      const dayMap: Record<string, ChartPoint> = {}
      days.forEach(d => {
        const key = format(d, 'dd/MM', { locale: dateLocale })
        dayMap[key] = { date: key, revenue: 0, costs: 0 }
      })

      // Revenue per day
      let soQuery = (supabase as any)
        .from('sales_orders')
        .select('total, created_at')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('created_at', startDateStr)

      if (activeProduct) {
        const [fProdId, fVarId] = activeProduct.includes('|') ? activeProduct.split('|') : [activeProduct, null]
        let oiQuery = (supabase as any)
          .from('sales_order_items')
          .select('sales_order_id')
          .eq('product_id', fProdId)

        if (fVarId && fVarId !== 'null') {
          oiQuery = oiQuery.eq('variant_id', fVarId)
        }

        const { data: oi } = await oiQuery
        const ids = (oi || []).map((i: any) => i.sales_order_id)
        if (ids.length > 0) soQuery = soQuery.in('id', ids)
        else return Object.values(dayMap)
      }

      const { data: orders } = await soQuery
      ;(orders || []).forEach((o: any) => {
        const key = format(parseISO(o.created_at), 'dd/MM', { locale: dateLocale })
        if (dayMap[key]) dayMap[key].revenue += o.total || 0
      })

      // Costs per day from product_charges
      let costsQuery = (supabase as any)
        .from('product_charges')
        .select('amount, charge_date')
        .eq('company_id', companyId)
        .gte('charge_date', startDate.toISOString().split('T')[0])

      if (activeProduct) {
        const [fProdId, fVarId] = activeProduct.includes('|') ? activeProduct.split('|') : [activeProduct, null]
        costsQuery = costsQuery.eq('product_id', fProdId)
        if (fVarId && fVarId !== 'null') {
          costsQuery = costsQuery.eq('variant_id', fVarId)
        } else if (fVarId === 'null') {
          costsQuery = costsQuery.is('variant_id', null)
        }
      }

      const { data: charges } = await costsQuery
      ;(charges || []).forEach((c: any) => {
        const key = format(parseISO(c.charge_date), 'dd/MM', { locale: dateLocale })
        if (dayMap[key]) dayMap[key].costs += c.amount || 0
      })

      return Object.values(dayMap)
    },
    enabled: !!companyId,
  })

  // ── Best Customers Query ───────────────────────────────────────────────────
  const { data: bestCustomers = [], isLoading: customersLoading } = useQuery<BestCustomer[]>({
    queryKey: ['commerce-best-customers', companyId, dateRange, productFilter],
    queryFn: async () => {
      if (!companyId) return []

      let query = (supabase as any)
        .from('sales_orders')
        .select(`
          customer_id,
          total,
          customers!inner(id, name)
        `)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('created_at', startDateStr)
        .not('customer_id', 'is', null)

      if (activeProduct) {
        const [fProdId, fVarId] = activeProduct.includes('|') ? activeProduct.split('|') : [activeProduct, null]
        let oiQuery = (supabase as any)
          .from('sales_order_items')
          .select('sales_order_id')
          .eq('product_id', fProdId)
          
        if (fVarId && fVarId !== 'null') {
          oiQuery = oiQuery.eq('variant_id', fVarId)
        }

        const { data: oi } = await oiQuery
        const ids = (oi || []).map((i: any) => i.sales_order_id)
        if (ids.length > 0) query = query.in('id', ids)
        else return []
      }

      const { data: orders } = await query

      // Aggregate by customer
      const map: Record<string, BestCustomer> = {}
      ;(orders || []).forEach((o: any) => {
        if (!o.customer_id || !o.customers) return
        if (!map[o.customer_id]) {
          map[o.customer_id] = {
            id: o.customer_id,
            name: o.customers.name || '—',
            order_count: 0,
            total_spent: 0,
          }
        }
        map[o.customer_id].order_count += 1
        map[o.customer_id].total_spent += o.total || 0
      })

      return Object.values(map)
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5)
    },
    enabled: !!companyId,
  })

  const rangeOptions: { value: DateRange; label: string }[] = [
    { value: '7', label: t('dashboard.last_7_days') },
    { value: '30', label: t('dashboard.last_30_days') },
    { value: '90', label: t('dashboard.last_90_days') },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Product filter */}
        {companyId && (
          <ProductFilterSelect value={productFilter} onChange={setProductFilter} companyId={companyId} />
        )}

        {/* Date range */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                dateRange === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard
          title={t('dashboard.total_sales')}
          value={kpiLoading ? '—' : formatNumber(kpiData?.totalSales ?? 0, 0)}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="blue"
          isLoading={kpiLoading}
        />
        <SectionCard
          title={t('dashboard.total_revenue')}
          value={kpiLoading ? '—' : formatCurrency(kpiData?.totalRevenue ?? 0, currency)}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
          isLoading={kpiLoading}
        />
        <SectionCard
          title={t('dashboard.total_items_sold')}
          value={kpiLoading ? '—' : formatNumber(kpiData?.totalItemsSold ?? 0, 0)}
          icon={<Package className="h-5 w-5" />}
          color="blue"
          isLoading={kpiLoading}
        />
        <SectionCard
          title={t('dashboard.total_stock')}
          value={kpiLoading ? '—' : formatNumber(kpiData?.totalStock ?? 0, 0)}
          icon={<Archive className="h-5 w-5" />}
          color="purple"
          isLoading={kpiLoading}
        />
      </div>

      {/* Chart + Best Customers */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Chart — 3/5 width */}
        <div className="lg:col-span-3">
          <SalesCostChart
            data={chartData}
            isLoading={chartLoading}
            currency={currency}
          />
        </div>

        {/* Best Customers — 2/5 width */}
        <div className="lg:col-span-2 min-h-[360px]">
          <BestCustomersTable
            customers={bestCustomers}
            isLoading={customersLoading}
            currency={currency}
          />
        </div>
      </div>
    </div>
  )
}
