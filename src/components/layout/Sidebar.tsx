import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Menu,
  Box,
  Truck,
  FileText,
  Building2,
  ListTree,
  Tags,
  BadgeCent,
  ShieldAlert,
  Receipt,
  Warehouse
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

export function Sidebar() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore()
  const { hasRole } = useAuthStore()

  const navItems = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.products'), href: '/products', icon: Package },
    { name: t('nav.customers'), href: '/customers', icon: Users },
    { name: t('nav.suppliers', { defaultValue: 'Suppliers' }), href: '/suppliers', icon: Truck },
    { name: t('nav.sales', { defaultValue: 'Sales & POS' }), href: '/sales', icon: ShoppingCart },
    { name: t('nav.purchases'), href: '/purchases', icon: BadgeCent },
    { name: t('nav.inventory'), href: '/inventory', icon: Box },
    { name: t('nav.deliveries'), href: '/deliveries', icon: Truck },
    { name: t('nav.invoices', { defaultValue: 'Invoices & Payments' }), href: '/invoices', icon: FileText },
    { name: t('nav.expenses', { defaultValue: 'Expenses & Charges' }), href: '/expenses', icon: Receipt },
    { name: t('nav.reports'), href: '/reports', icon: FileText },
  ]

  const adminItems = [
    { name: t('nav.branches'), href: '/branches', icon: Building2 },
    { name: t('nav.warehouses', { defaultValue: 'Warehouses' }), href: '/warehouses', icon: Warehouse },
    { name: t('nav.users'), href: '/users', icon: Users },
    { name: t('nav.audit_logs', { defaultValue: 'Audit Logs' }), href: '/settings/audit-logs', icon: ShieldAlert },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ]

  return (
    <aside
      className={cn(
        'flex flex-col border-e bg-sidebar transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <span className="text-lg font-bold text-sidebar-foreground">
            {t('app.name')}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(sidebarCollapsed && 'mx-auto')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0',
                    sidebarCollapsed ? 'h-5 w-5' : 'me-3 h-4 w-4'
                  )}
                />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}

          {hasRole('super_admin') && (
            <>
              {!sidebarCollapsed && (
                <div className="mt-8 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('labels.administration', { defaultValue: 'Administration' })}
                </div>
              )}
              {sidebarCollapsed && <div className="my-4 border-t border-sidebar-border" />}
              
              {adminItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      sidebarCollapsed && 'justify-center px-0'
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        'flex-shrink-0',
                        sidebarCollapsed ? 'h-5 w-5' : 'me-3 h-4 w-4'
                      )}
                    />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </>
          )}
        </nav>
      </div>
    </aside>
  )
}
