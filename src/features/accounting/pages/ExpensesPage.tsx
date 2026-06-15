import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Filter, Receipt, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseForm } from '../components/ExpenseForm'

import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function ExpensesPage() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['expenses', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          branches (name),
          profiles:created_by (full_name)
        `)
        .eq('company_id', company.id)
        .order('expense_date', { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const categories = Array.from(new Set(expenses?.map(e => e.category) || []))

  const filters: FilterConfig[] = [
    {
      key: 'category',
      title: 'Category',
      options: categories.map(c => ({ label: c, value: c }))
    },
    {
      key: 'amount',
      title: 'Amount',
      type: 'number_range'
    }
  ]

  // Filtering
  const filteredExpenses = expenses?.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (e.reference && e.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    
    let matchesCategory = true
    let matchesAmount = true

    if (activeFilters['category']?.length > 0) matchesCategory = activeFilters['category'].includes(e.category)

    if (activeFilters['amount']) {
      const { min, max } = activeFilters['amount']
      if (min !== undefined && e.amount < min) matchesAmount = false
      if (max !== undefined && e.amount > max) matchesAmount = false
    }

    return matchesSearch && matchesCategory && matchesAmount
  })

  const totalCount = filteredExpenses?.length || 0
  const paginatedExpenses = useMemo(() => {
    if (!filteredExpenses) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredExpenses.slice(start, end)
  }, [filteredExpenses, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses & Charges</h1>
          <p className="text-muted-foreground mt-1">Track company expenses, custom charges, and linking them to orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Charge / Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Expense or Charge</DialogTitle>
                <DialogDescription>
                  Record a new charge, fee, or general expense. You can link it to an order by entering the reference ID.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 max-h-[70vh] overflow-y-auto px-1">
                <ExpenseForm 
                  onSuccess={() => {
                    setIsDialogOpen(false)
                    refetch()
                  }} 
                  onCancel={() => setIsDialogOpen(false)} 
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('labels.search_placeholder', { defaultValue: 'Search...' })}
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <AdvancedFilter 
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={(key, values) => setActiveFilters(prev => ({ ...prev, [key]: values }))}
            onClearAll={() => setActiveFilters({})}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('labels.date', { defaultValue: 'Date' })}</TableHead>
                <TableHead>{t('labels.description', { defaultValue: 'Description' })}</TableHead>
                <TableHead>{t('labels.category', { defaultValue: 'Category' })}</TableHead>
                <TableHead>{t('labels.reference', { defaultValue: 'Linked Reference' })}</TableHead>
                <TableHead>{t('labels.branch', { defaultValue: 'Branch' })}</TableHead>
                <TableHead className="text-right">{t('labels.amount', { defaultValue: 'Amount' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    {t('labels.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredExpenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    {t('labels.no_data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses?.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(expense.expense_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.description}
                      {expense.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{expense.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{expense.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {expense.reference ? (
                        <div className="flex items-center gap-1 text-sm text-blue-600 hover:underline cursor-pointer">
                          <FileText className="h-3 w-3" />
                          {expense.reference}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.branches?.name || 'All'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {formatCurrency(expense.amount, company?.currency || 'DZD')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t bg-muted/20 flex-shrink-0 flex items-center justify-between">
          <div className="flex-1">
            <DataTablePagination 
              pageIndex={pageIndex}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPageIndex}
              onPageSizeChange={setPageSize}
            />
          </div>
          <span className="font-semibold whitespace-nowrap ml-4">
            {t('labels.total', { defaultValue: 'Total' })}: {formatCurrency(
              filteredExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
              company?.currency || 'DZD'
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
