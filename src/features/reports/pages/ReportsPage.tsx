import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { FileText, TrendingUp, DollarSign, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57']

export default function ReportsPage() {
  const { t } = useTranslation(['common'])
  const { company } = useAuthStore()
  const [branchId, setBranchId] = useState('all')

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('branches').select('id, name').eq('company_id', company.id)
      return data || []
    },
    enabled: !!company?.id
  })

  // Fetch Sales Data
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['reports-sales', company?.id, branchId],
    queryFn: async () => {
      if (!company?.id) return []
      let query = supabase
        .from('sales_orders')
        .select(`
          id, created_at, total, status,
          sales_order_items(product_id, quantity, unit_price, products(name))
        `)
        .eq('company_id', company.id)

      if (branchId !== 'all') query = query.eq('branch_id', branchId)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  // Fetch Expenses Data
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['reports-expenses', company?.id, branchId],
    queryFn: async () => {
      if (!company?.id) return []
      let query = supabase
        .from('expenses')
        .select('amount, category, created_at')
        .eq('company_id', company.id)

      if (branchId !== 'all') query = query.eq('branch_id', branchId)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  // Data Processing
  const processedData = useMemo(() => {
    if (!sales || !expenses) return {
      totalRevenue: 0,
      totalProfit: 0,
      itemsSold: 0,
      salesTrend: [],
      topProducts: [],
      expenseBreakdown: []
    }

    let totalRevenue = 0
    let itemsSold = 0
    const salesByDate: Record<string, number> = {}
    const productSales: Record<string, { name: string, amount: number }> = {}

    sales.forEach((order: any) => {
      if (order.status === 'cancelled') return

      totalRevenue += order.total
      const dateStr = format(new Date(order.created_at), 'MMM dd')
      salesByDate[dateStr] = (salesByDate[dateStr] || 0) + order.total

      order.sales_order_items.forEach((item: any) => {
        itemsSold += item.quantity
        const pName = item.products?.name || 'Unknown'
        const itemTotal = item.quantity * item.unit_price
        if (!productSales[pName]) productSales[pName] = { name: pName, amount: 0 }
        productSales[pName].amount += itemTotal
      })
    })

    const totalExpenses = expenses.reduce((sum, exp: any) => sum + exp.amount, 0)
    const totalProfit = totalRevenue - totalExpenses

    const salesTrend = Object.keys(salesByDate).map(date => ({
      date,
      Revenue: salesByDate[date]
    }))

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    const expByCategory: Record<string, number> = {}
    expenses.forEach((exp: any) => {
      const cat = exp.category || 'Other'
      expByCategory[cat] = (expByCategory[cat] || 0) + exp.amount
    })

    const expenseBreakdown = Object.keys(expByCategory).map(name => ({
      name,
      value: expByCategory[name]
    }))

    return { totalRevenue, totalProfit, itemsSold, salesTrend, topProducts, expenseBreakdown, totalOrders: sales.length }
  }, [sales, expenses])

  const isLoading = salesLoading || expensesLoading

  return (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto pb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">Detailed performance metrics, sales trends, and inventory valuation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('common:labels.all_branches')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches?.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(processedData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Based on selected filters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${processedData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(processedData.totalProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(processedData.totalOrders || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(processedData.itemsSold)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 flex-shrink-0">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">{t('common:messages.loading')}</div>
            ) : processedData.salesTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">{t('common:messages.no_data_available')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.salesTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Line type="monotone" dataKey="Revenue" stroke="#0ea5e9" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">{t('common:messages.loading')}</div>
            ) : processedData.expenseBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">No expenses recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {processedData.expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Selling Products (By Revenue)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">{t('common:messages.loading')}</div>
            ) : processedData.topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">No sales data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={150} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
