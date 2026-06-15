import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, History, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDate } from '@/lib/utils'

import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function AuditLogsPage() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [selectedLog, setSelectedLog] = useState<any>(null)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit_logs', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(200) // Limit to recent 200 logs

      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filters: FilterConfig[] = [
    {
      key: 'action',
      title: 'Action',
      options: [
        { label: 'CREATE (INSERT)', value: 'INSERT' },
        { label: 'UPDATE', value: 'UPDATE' },
        { label: 'DELETE', value: 'DELETE' }
      ]
    }
  ]

  // Filtering
  const filteredLogs = logs?.filter(log => {
    const searchString = `${log.entity_type} ${log.profiles?.full_name || 'System'}`.toLowerCase()
    const matchesSearch = searchString.includes(searchTerm.toLowerCase())
    
    let matchesAction = true
    if (activeFilters['action']?.length > 0) matchesAction = activeFilters['action'].includes(log.action)

    return matchesSearch && matchesAction
  })

  const totalCount = filteredLogs?.length || 0
  const paginatedLogs = useMemo(() => {
    if (!filteredLogs) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredLogs.slice(start, end)
  }, [filteredLogs, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/20">CREATE</Badge>
      case 'UPDATE':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/20">UPDATE</Badge>
      case 'DELETE':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">DELETE</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const formatJson = (json: any) => {
    if (!json) return 'None'
    return JSON.stringify(json, null, 2)
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Track all system activities and record changes.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by entity or user..."
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
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.no_data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>
                      {log.profiles ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{log.profiles.full_name}</span>
                            <span className="text-xs text-muted-foreground">{log.profiles.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">System</span>
                      )}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium uppercase text-xs tracking-wider">{log.entity_type}</span>
                        <span className="text-xs text-muted-foreground font-mono">{log.entity_id.substring(0, 8)}...</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">View Diff</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <History className="h-5 w-5" />
                              Record Changes
                            </DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-auto py-4 grid grid-cols-2 gap-4">
                            <div>
                              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Old Values</h3>
                              <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-auto h-full max-h-[500px]">
                                {formatJson(log.old_values)}
                              </pre>
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">New Values</h3>
                              <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-auto h-full max-h-[500px]">
                                {formatJson(log.new_values)}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t bg-muted/20 flex-shrink-0">
          <DataTablePagination 
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  )
}
