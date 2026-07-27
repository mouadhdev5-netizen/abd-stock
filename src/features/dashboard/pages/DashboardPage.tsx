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

import { Input } from '@/components/ui/input'

// ─── Types ───────────────────────────────────────────────────────────────────
interface DateRange {
  from: Date
  to: Date
}

interface KpiData {
  totalSales: number
  totalRevenue: number
  totalItemsSold: number
  totalStock: number
  totalCharges: number
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
        .from('products')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name')
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
        <option key={p.id} value={p.id}>
          {p.name}
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

  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [productFilter, setProductFilter] = useState<string>('all')

  const startDateStr = dateRange.from.toISOString()
  const endDateStr = new Date(dateRange.to).setHours(23, 59, 59, 999) 
    ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999)).toISOString()
    : new Date().toISOString()
  const activeProduct = productFilter === 'all' ? null : productFilter

  // ── KPI Query ──────────────────────────────────────────────────────────────
  const { data: kpiData, isLoading: kpiLoading } = useQuery<KpiData>({
    queryKey: ['commerce-kpis', companyId, startDateStr, endDateStr, productFilter],
    queryFn: async () => {
      if (!companyId) return { totalSales: 0, totalRevenue: 0, totalItemsSold: 0, totalStock: 0, totalCharges: 0 }

      let totalSales = 0
      let totalRevenue = 0
      let totalItemsSold = 0

      if (activeProduct) {
        // If filtering by product, we query order items directly
        const { data: items } = await (supabase as any)
          .from('sales_order_items')
          .select('quantity, total, sales_orders!inner(id, company_id, status, created_at)')
          .eq('sales_orders.company_id', companyId)
          .neq('sales_orders.status', 'cancelled')
          .gte('sales_orders.created_at', startDateStr)
          .lte('sales_orders.created_at', endDateStr)
          .eq('product_id', activeProduct)

        totalRevenue = (items || []).reduce((sum: number, i: any) => sum + (i.total || 0), 0)
        totalItemsSold = (items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
        const uniqueOrders = new Set((items || []).map((i: any) => i.sales_orders.id))
        totalSales = uniqueOrders.size
      } else {
        // General query for all products
        const { data: salesOrders, count } = await (supabase as any)
          .from('sales_orders')
          .select('id, total', { count: 'exact' })
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr)

        totalRevenue = (salesOrders || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0)
        totalSales = count || 0

        const { data: items } = await (supabase as any)
          .from('sales_order_items')
          .select('quantity, sales_orders!inner(company_id, status, created_at)')
          .eq('sales_orders.company_id', companyId)
          .neq('sales_orders.status', 'cancelled')
          .gte('sales_orders.created_at', startDateStr)
          .lte('sales_orders.created_at', endDateStr)

        totalItemsSold = (items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
      }

      // Stock
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
          .select('quantity')
          .in('product_id', pIds)
        
        const { data: stockData } = await smQuery
        totalStock = (stockData || []).reduce((sum: number, m: any) => sum + (m.quantity || 0), 0)
      }

      // Charges
      let chargesQuery = (supabase as any)
        .from('product_charges')
        .select('amount')
        .eq('company_id', companyId)
        .gte('charge_date', dateRange.from.toISOString().split('T')[0])
        .lte('charge_date', dateRange.to.toISOString().split('T')[0])

      if (activeProduct) {
        chargesQuery = chargesQuery.eq('product_id', activeProduct)
      }
      
      const { data: chargesRows } = await chargesQuery
      const totalCharges = (chargesRows || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

      return { totalSales, totalRevenue, totalItemsSold, totalStock: Math.max(0, totalStock), totalCharges }
    },
    enabled: !!companyId,
  })

  // ── Chart Query ────────────────────────────────────────────────────────────
  const { data: chartData = [], isLoading: chartLoading } = useQuery<ChartPoint[]>({
    queryKey: ['commerce-chart', companyId, startDateStr, endDateStr, productFilter],
    queryFn: async () => {
      if (!companyId) return []

      const localeMap: Record<string, any> = { fr, ar, en: enUS }
      const dateLocale = localeMap[language] || fr

      // Build date range array
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      const dayMap: Record<string, ChartPoint> = {}
      days.forEach(d => {
        const key = format(d, 'dd/MM', { locale: dateLocale })
        dayMap[key] = { date: key, revenue: 0, costs: 0 }
      })

      // Revenue per day
      if (activeProduct) {
        const { data: oi } = await (supabase as any)
          .from('sales_order_items')
          .select('total, sales_orders!inner(company_id, status, created_at)')
          .eq('sales_orders.company_id', companyId)
          .neq('sales_orders.status', 'cancelled')
          .gte('sales_orders.created_at', startDateStr)
          .lte('sales_orders.created_at', endDateStr)
          .eq('product_id', activeProduct)

        ;(oi || []).forEach((item: any) => {
          const key = format(parseISO(item.sales_orders.created_at), 'dd/MM', { locale: dateLocale })
          if (dayMap[key]) dayMap[key].revenue += item.total || 0
        })
      } else {
        const { data: orders } = await (supabase as any)
          .from('sales_orders')
          .select('total, created_at')
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr)

        ;(orders || []).forEach((o: any) => {
          const key = format(parseISO(o.created_at), 'dd/MM', { locale: dateLocale })
          if (dayMap[key]) dayMap[key].revenue += o.total || 0
        })
      }

      let costsQuery = (supabase as any)
        .from('product_charges')
        .select('amount, charge_date')
        .eq('company_id', companyId)
        .gte('charge_date', dateRange.from.toISOString().split('T')[0])
        .lte('charge_date', dateRange.to.toISOString().split('T')[0])

      if (activeProduct) {
        costsQuery = costsQuery.eq('product_id', activeProduct)
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
    queryKey: ['commerce-best-customers', companyId, startDateStr, endDateStr, productFilter],
    queryFn: async () => {
      if (activeProduct) {
        const { data: items } = await (supabase as any)
          .from('sales_order_items')
          .select('total, sales_orders!inner(id, company_id, status, created_at, customer_id, customers(id, name))')
          .eq('sales_orders.company_id', companyId)
          .neq('sales_orders.status', 'cancelled')
          .gte('sales_orders.created_at', startDateStr)
          .lte('sales_orders.created_at', endDateStr)
          .not('sales_orders.customer_id', 'is', null)
          .eq('product_id', activeProduct)

        // Aggregate by customer
        const map: Record<string, BestCustomer> = {}
        const seenOrders = new Set<string>()
        ;(items || []).forEach((item: any) => {
          const cId = item.sales_orders.customer_id
          const customer = item.sales_orders.customers
          if (!cId || !customer) return
          if (!map[cId]) {
            map[cId] = { id: cId, name: customer.name || 'Unknown', order_count: 0, total_spent: 0 }
          }
          map[cId].total_spent += item.total || 0
          if (!seenOrders.has(item.sales_orders.id)) {
            map[cId].order_count += 1
            seenOrders.add(item.sales_orders.id)
          }
        })

        return Object.values(map)
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 5)
      } else {
        const { data: orders } = await (supabase as any)
          .from('sales_orders')
          .select(`
            id,
            customer_id,
            total,
            customers!inner(id, name)
          `)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr)
          .not('customer_id', 'is', null)

        // Aggregate by customer
        const map: Record<string, BestCustomer> = {}
        ;(orders || []).forEach((o: any) => {
          const cId = o.customer_id
          if (!cId || !o.customers) return
          if (!map[cId]) {
            map[cId] = { id: cId, name: o.customers.name || 'Unknown', order_count: 0, total_spent: 0 }
          }
          map[cId].order_count += 1
          map[cId].total_spent += o.total || 0
        })

        return Object.values(map)
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 5)
      }
    },
    enabled: !!companyId,
  })

  const rangeOptions: { value: number; label: string }[] = [
    { value: 7, label: t('dashboard.last_7_days') },
    { value: 30, label: t('dashboard.last_30_days') },
    { value: 90, label: t('dashboard.last_90_days') },
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
          <Input 
            type="date" 
            className="h-8 w-auto border-none shadow-none text-xs" 
            value={dateRange.from.toISOString().split('T')[0]} 
            onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
          />
          <span className="text-muted-foreground text-xs">-</span>
          <Input 
            type="date" 
            className="h-8 w-auto border-none shadow-none text-xs" 
            value={dateRange.to.toISOString().split('T')[0]} 
            onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
          />
          <div className="w-px h-5 bg-border mx-1" />
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange({ from: subDays(new Date(), opt.value), to: new Date() })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <SectionCard
          title={t('dashboard.total_charges', 'Total Charges')}
          value={kpiLoading ? '—' : formatCurrency(kpiData?.totalCharges ?? 0, currency)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="red"
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
