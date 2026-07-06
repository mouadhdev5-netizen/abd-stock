import { useState } from 'react'
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
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  ClipboardList,
  Clock,
  MapPin,
  UserCheck,
  BadgeDollarSign,
  Factory,
  Boxes,
  BookOpen,
  MessageSquare,
  ShieldAlert,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

type NavGroup = {
  section: 'commerce' | 'production' | 'admin'
  label: string
  items: NavItem[]
}

type NavItem = {
  name: string
  href?: string
  icon: React.ElementType
  subItems?: { name: string; href: string; icon: React.ElementType }[]
}

export function Sidebar() {
  const { t } = useTranslation(['common', 'commerce', 'production', 'admin'])
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore()
  const { hasRole } = useAuthStore()

  // Track which accordion group is open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    commands: location.pathname.startsWith('/commerce/commands'),
    inventory: location.pathname.startsWith('/commerce/inventory'),
  })

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isActive = (href: string) => {
    if (href === '/commerce/dashboard') return location.pathname === href || location.pathname === '/'
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const isGroupActive = (hrefs: string[]) => hrefs.some(h => location.pathname.startsWith(h))

  const navGroups: NavGroup[] = [
    {
      section: 'commerce',
      label: t('commerce:section', '🛒 Commerce'),
      items: [
        {
          name: t('common:nav.dashboard'),
          href: '/commerce/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: t('common:nav.sales'),
          href: '/commerce/sales',
          icon: ShoppingCart,
        },
        {
          name: t('common:nav.products'),
          href: '/commerce/products',
          icon: Package,
        },
        {
          name: t('commerce:commands.title', 'Commands'),
          icon: ClipboardList,
          subItems: [
            { name: t('commerce:commands.create_title'), href: '/commerce/commands/create', icon: ShoppingBag },
            { name: t('commerce:commands.en_cours_title'), href: '/commerce/commands/en-cours', icon: Clock },
            { name: t('commerce:commands.suivi_title'), href: '/commerce/commands/suivi', icon: MapPin },
          ],
        },
        {
          name: t('common:nav.inventory'),
          icon: Box,
          subItems: [
            { name: t('commerce:inventory.stock_title'), href: '/commerce/inventory/stock', icon: Boxes },
            { name: t('commerce:inventory.logs_title'), href: '/commerce/inventory/logs', icon: Receipt },
          ],
        },
        {
          name: t('common:nav.customers'),
          href: '/commerce/customers',
          icon: Users,
        },
        {
          name: t('commerce:charges.title', 'Charges'),
          href: '/commerce/charges',
          icon: BadgeDollarSign,
        },
      ],
    },
    {
      section: 'production',
      label: t('production:section', '🏭 Production'),
      items: [
        {
          name: t('production:dashboard.title', 'Dashboard'),
          href: '/production/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: t('production:suppliers.title', 'Suppliers'),
          href: '/production/suppliers',
          icon: Truck,
        },
        {
          name: t('production:components.title', 'Components'),
          href: '/production/components',
          icon: Factory,
        },
        {
          name: t('production:recipes.title', 'Recipes'),
          href: '/production/recipes',
          icon: BookOpen,
        },
        {
          name: t('production:whatsapp.title', 'WhatsApp'),
          href: '/production/whatsapp',
          icon: MessageSquare,
        },
      ],
    },
  ]

  const adminItems = [
    { name: t('common:nav.users'), href: '/admin/users', icon: UserCheck },
    { name: t('common:nav.settings'), href: '/settings', icon: Settings },
    { name: t('common:nav.audit_logs'), href: '/settings/audit-logs', icon: ShieldAlert },
  ]

  const canSeeAdmin = hasRole('super_admin') || hasRole('commerce_manager')

  const sectionBorderMap: Record<string, string> = {
    commerce: 'border-s-blue-500',
    production: 'border-s-purple-500',
    admin: 'border-s-gray-400',
  }

  const sectionTextMap: Record<string, string> = {
    commerce: 'text-blue-600 dark:text-blue-400',
    production: 'text-purple-600 dark:text-purple-400',
    admin: 'text-gray-500',
  }

  const linkBase = cn(
    'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  )
  const linkActive = 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'

  return (
    <aside
      className={cn(
        'flex flex-col border-e bg-sidebar transition-all duration-300 ease-in-out shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-3 shrink-0">
        {!sidebarCollapsed && (
          <span className="text-base font-bold text-sidebar-foreground truncate">
            {t('common:app.name')}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn('shrink-0', sidebarCollapsed && 'mx-auto')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3">
        <nav className="space-y-4 px-2">
          {navGroups.map((group) => (
            <div key={group.section}>
              {/* Section header */}
              {!sidebarCollapsed && (
                <div
                  className={cn(
                    'mb-1 px-2 text-[10px] font-bold uppercase tracking-widest border-s-2',
                    sectionBorderMap[group.section],
                    sectionTextMap[group.section]
                  )}
                >
                  {group.label}
                </div>
              )}
              {sidebarCollapsed && (
                <div className={cn('my-2 border-t border-sidebar-border opacity-40')} />
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  // Item with sub-items (accordion)
                  if (item.subItems) {
                    const groupKey = item.name.toLowerCase().replace(/\s+/g, '_')
                    const isOpen = openGroups[groupKey]
                    const groupActive = isGroupActive(item.subItems.map(s => s.href))

                    return (
                      <div key={item.name}>
                        {/* Accordion trigger */}
                        <button
                          onClick={() => !sidebarCollapsed && toggleGroup(groupKey)}
                          className={cn(
                            linkBase,
                            'w-full',
                            groupActive && !sidebarCollapsed && 'text-primary font-semibold',
                            sidebarCollapsed && 'justify-center px-0'
                          )}
                          title={sidebarCollapsed ? item.name : undefined}
                        >
                          <item.icon
                            className={cn(
                              'flex-shrink-0',
                              sidebarCollapsed ? 'h-5 w-5' : 'me-2.5 h-4 w-4',
                              groupActive && 'text-primary'
                            )}
                          />
                          {!sidebarCollapsed && (
                            <>
                              <span className="flex-1 text-start">{item.name}</span>
                              {isOpen ? (
                                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                              )}
                            </>
                          )}
                        </button>

                        {/* Sub-items */}
                        {!sidebarCollapsed && isOpen && (
                          <div className="ms-6 mt-0.5 space-y-0.5 border-s border-sidebar-border ps-2">
                            {item.subItems.map((sub) => (
                              <Link
                                key={sub.href}
                                to={sub.href}
                                className={cn(
                                  linkBase,
                                  'text-xs py-1.5',
                                  isActive(sub.href) && linkActive
                                )}
                              >
                                <sub.icon className="me-2 h-3.5 w-3.5 flex-shrink-0" />
                                <span>{sub.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Regular link
                  return (
                    <Link
                      key={item.href}
                      to={item.href!}
                      className={cn(
                        linkBase,
                        isActive(item.href!) && linkActive,
                        sidebarCollapsed && 'justify-center px-0'
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon
                        className={cn(
                          'flex-shrink-0',
                          sidebarCollapsed ? 'h-5 w-5' : 'me-2.5 h-4 w-4'
                        )}
                      />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Administration */}
          {canSeeAdmin && (
            <div>
              {!sidebarCollapsed && (
                <div
                  className={cn(
                    'mb-1 px-2 text-[10px] font-bold uppercase tracking-widest border-s-2',
                    sectionBorderMap.admin,
                    sectionTextMap.admin
                  )}
                >
                  {t('common:labels.administration')}
                </div>
              )}
              {sidebarCollapsed && (
                <div className="my-2 border-t border-sidebar-border opacity-40" />
              )}
              <div className="space-y-0.5">
                {adminItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      linkBase,
                      isActive(item.href) && linkActive,
                      sidebarCollapsed && 'justify-center px-0'
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        'flex-shrink-0',
                        sidebarCollapsed ? 'h-5 w-5' : 'me-2.5 h-4 w-4'
                      )}
                    />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
    </aside>
  )
}
