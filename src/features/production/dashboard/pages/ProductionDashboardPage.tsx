import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Activity, Layers, Package, Database } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import { SectionCard } from '@/components/ui/SectionCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'



const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#ede9fe']

export default function ProductionDashboardPage() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()


  // 1. Fetch recipe executions
  const { data: executions, isLoading: isExecLoading } = useQuery({
    queryKey: ['recipe_executions', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('recipe_executions')
        .select(`
          *,
          recipes (
            recipe_items (
              quantity_used
            )
          )
        `)
        .eq('company_id', company.id)
      
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  // 2. Fetch components for stock value
  const { data: components, isLoading: isCompLoading } = useQuery({
    queryKey: ['components_stock', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('components')
        .select('name, quantity_in_stock, cost_price, status')
        .eq('company_id', company.id)
      
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  // 3. Fetch active recipes count
  const { data: recipesCount, isLoading: isRecipesLoading } = useQuery({
    queryKey: ['recipes_count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { count, error } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
      
      if (error) throw error
      return count || 0
    },
    enabled: !!company?.id
  })

  // No longer filtering by date locally
  const filteredExecutions = executions || []

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalCost = 0
    let totalComponentsUsed = 0

    filteredExecutions.forEach((exec: any) => {
      totalCost += Number(exec.total_cost || 0)
      
      // Sum components used in this execution
      const items = exec.recipes?.recipe_items || []
      items.forEach((item: any) => {
        totalComponentsUsed += Number(item.quantity_used || 0)
      })
    })

    let stockValue = 0
    ;(components as any[])?.forEach(c => {
      stockValue += Number(c.quantity_in_stock || 0) * Number(c.cost_price || 0)
    })

    return {
      totalCost,
      totalComponentsUsed,
      stockValue,
      activeRecipes: recipesCount || 0
    }
  }, [filteredExecutions, components, recipesCount])

  // Chart 1: Cost over time
  const costChartData = useMemo(() => {
    const grouped = filteredExecutions.reduce((acc: any, exec: any) => {
      const dateKey = format(parseISO(exec.executed_at), 'dd/MM')
      if (!acc[dateKey]) acc[dateKey] = 0
      acc[dateKey] += Number(exec.total_cost || 0)
      return acc
    }, {})

    // Sort by date key chronologically (simple approach assuming same year, or just sort alphabetically if mm-dd)
    // Actually format('yyyy-MM-dd') is better for sorting, but prompt asks for dd/MM.
    // Let's create an array and sort it by the actual date
    const dataPoints = Object.entries(grouped).map(([date, cost]) => ({
      date,
      cost
    }))
    
    // Reverse because data is fetched without order? No, we didn't order in fetch.
    // We should probably just let recharts display it if we assume continuous data, 
    // but better to sort if we can. Since 'dateKey' is 'dd/MM', sorting is hard. 
    // Let's use 'yyyy-MM-dd' for sorting then format in UI.
    const groupedByRealDate = filteredExecutions.reduce((acc: any, exec: any) => {
      const dateKey = format(parseISO(exec.executed_at), 'yyyy-MM-dd')
      if (!acc[dateKey]) acc[dateKey] = { rawDate: dateKey, displayDate: format(parseISO(exec.executed_at), 'dd/MM'), cost: 0 }
      acc[dateKey].cost += Number(exec.total_cost || 0)
      return acc
    }, {})

    return Object.values(groupedByRealDate)
      .sort((a: any, b: any) => a.rawDate.localeCompare(b.rawDate))
      .map((item: any) => ({
        date: item.displayDate,
        cost: item.cost
      }))

  }, [filteredExecutions])

  // Chart 2: Component breakdown (Donut)
  const componentChartData = useMemo(() => {
    if (!components) return []
    
    const mapped = (components as any[]).map(c => ({
      name: c.name,
      value: Number(c.quantity_in_stock || 0) * Number(c.cost_price || 0)
    }))
    
    // Sort descending by value and take top 8
    mapped.sort((a, b) => b.value - a.value)
    
    return mapped.slice(0, 8).filter(c => c.value > 0)
  }, [components])

  const isLoading = isExecLoading || isCompLoading || isRecipesLoading

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-purple-700 dark:text-purple-400">
            {t('production:dashboard.title', { defaultValue: 'Production Dashboard' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('production:dashboard.subtitle', { defaultValue: 'Monitor production costs and component usage.' })}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SectionCard 
          title={t('production:dashboard.total_cost', { defaultValue: 'Total Production Cost' })}
          value={isLoading ? '...' : formatCurrency(kpis.totalCost, company?.currency || 'DZD')}
          icon={<Activity className="h-5 w-5" />}
          color="purple"
        />
        <SectionCard 
          title={t('production:dashboard.total_components_used', { defaultValue: 'Components Used' })}
          value={isLoading ? '...' : kpis.totalComponentsUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          icon={<Layers className="h-5 w-5" />}
          color="purple"
        />
        <SectionCard 
          title={t('production:dashboard.stock_value', { defaultValue: 'Components Stock Value' })}
          value={isLoading ? '...' : formatCurrency(kpis.stockValue, company?.currency || 'DZD')}
          icon={<Database className="h-5 w-5" />}
          color="purple"
        />
        <SectionCard 
          title={t('production:dashboard.active_recipes', { defaultValue: 'Active Recipes' })}
          value={isLoading ? '...' : kpis.activeRecipes.toString()}
          icon={<Package className="h-5 w-5" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Over Time Chart */}
        <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-purple-700 dark:text-purple-400">
            {t('production:dashboard.cost_over_time', { defaultValue: 'Production Cost Over Time' })}
          </h3>
          <div className="h-[300px] w-full">
            {costChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={costChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    formatter={(value: number) => [formatCurrency(value, company?.currency || 'DZD'), t('production:dashboard.cost', { defaultValue: 'Cost' })]}
                  />
                  <Bar dataKey="cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t('labels.no_data', { ns: 'common', defaultValue: 'No data available.' })}
              </div>
            )}
          </div>
        </div>

        {/* Component Breakdown Chart */}
        <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-purple-700 dark:text-purple-400">
            {t('production:dashboard.component_breakdown', { defaultValue: 'Component Value Breakdown' })}
          </h3>
          <div className="h-[300px] w-full">
            {componentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={componentChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {componentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    formatter={(value: number) => formatCurrency(value, company?.currency || 'DZD')}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    content={(props) => {
                      const { payload } = props;
                      const total = componentChartData.reduce((sum, item) => sum + item.value, 0)
                      return (
                        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs text-muted-foreground">
                          {payload?.map((entry, index) => {
                            const percent = (((entry.payload?.value || 0) / total) * 100).toFixed(0)
                            return (
                              <li key={`item-${index}`} className="flex items-center">
                                <span className="w-2 h-2 rounded-full me-1.5" style={{ backgroundColor: entry.color }} />
                                {entry.value} ({percent}%)
                              </li>
                            )
                          })}
                        </ul>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t('labels.no_data', { ns: 'common', defaultValue: 'No data available.' })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
