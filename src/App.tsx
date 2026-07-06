import { useEffect, Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'

import LoginPage from '@/features/auth/pages/LoginPage'
import { AppShell } from '@/components/layout/AppShell'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

// ─── Lazy-loaded feature pages ──────────────────────────────────────────────

// Commerce
const CommerceDashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'))
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage'))
const SalesPage = lazy(() => import('@/features/sales/pages/SalesPage'))

// Commands (Phase 4)
const CreateCommandPage = lazy(() => import('@/features/commands/pages/CreateCommandPage'))
const EnCoursPage = lazy(() => import('@/features/commands/pages/EnCoursPage'))
const SuiviPage = lazy(() => import('@/features/commands/pages/SuiviPage'))

// Commerce — Inventory
const StockPage = lazy(() => import('@/features/inventory/pages/StockPage'))
const StockMovementsPage = lazy(() => import('@/features/inventory/pages/StockMovementsPage'))

// Commerce — Charges
const ChargesPage = lazy(() => import('@/features/charges/pages/ChargesPage'))

// Production
const ProductionDashboardPage = lazy(() => import('@/features/production/dashboard/pages/ProductionDashboardPage'))
const SuppliersPage = lazy(() => import('@/features/suppliers/pages/SuppliersPage'))
const ComponentsPage = lazy(() => import('@/features/production/components-mgmt/pages/ComponentsPage'))
const RecipesPage = lazy(() => import('@/features/production/recipes/pages/RecipesPage'))
const WhatsAppPage = lazy(() => import('@/features/production/whatsapp/pages/WhatsAppPage'))
const PurchasesPage = lazy(() => import('@/features/purchases/pages/PurchasesPage'))

// Existing misc pages
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'))
const AuditLogsPage = lazy(() => import('@/features/settings/pages/AuditLogsPage'))
const BranchesPage = lazy(() => import('@/features/settings/pages/BranchesPage'))
const WarehousesPage = lazy(() => import('@/features/inventory/pages/WarehousesPage'))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
const ExpensesPage = lazy(() => import('@/features/accounting/pages/ExpensesPage'))
const InvoicesPage = lazy(() => import('@/features/accounting/pages/InvoicesPage'))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'))
const DeliveriesPage = lazy(() => import('@/features/inventory/pages/DeliveriesPage'))

// ─── Placeholder page for phases not yet built ──────────────────────────────
function ComingSoon({ phase, feature }: { phase: number; feature: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-2xl border bg-card p-10 text-center shadow-sm max-w-sm w-full">
        <div className="mb-3 text-4xl">🚧</div>
        <h2 className="text-xl font-bold mb-1">Phase {phase}</h2>
        <p className="text-muted-foreground text-sm">{feature}</p>
        <p className="mt-3 text-xs text-muted-foreground/60">Coming in the next phase</p>
      </div>
    </div>
  )
}

// ─── Loading screen ──────────────────────────────────────────────────────────
function LoadingScreen() {
  const { t } = useTranslation('common')
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">{t('messages.loading', { defaultValue: 'Loading...' })}</span>
      </div>
    </div>
  )
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  useRealtimeSync()

  const { setUser, setLoading } = useAuthStore()
  const { language, theme } = useSettingsStore()

  // Apply theme and language on mount/change
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }

    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
    document.documentElement.classList.toggle('font-arabic', language === 'ar')
    if (i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [theme, language])

  // Auth listener
  useEffect(() => {
    const fetchUserData = async (sessionUser: any) => {
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email! })

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single()

        if (profile) {
          const p = profile as any
          useAuthStore.getState().setProfile(p)

          if (p.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('*')
              .eq('id', p.company_id)
              .single()

            if (company) {
              useAuthStore.getState().setCompany(company as any)
            }
          }
        }
      } else {
        setUser(null)
        useAuthStore.getState().setProfile(null)
        useAuthStore.getState().setCompany(null)
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserData(session?.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserData(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <HashRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected shell */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            {/* Root redirect → Commerce Dashboard */}
            <Route index element={<Navigate to="/commerce/dashboard" replace />} />

            {/* ── COMMERCE ── */}
            <Route path="commerce/dashboard" element={<CommerceDashboardPage />} />
            <Route path="commerce/sales" element={<SalesPage />} />
            <Route path="commerce/products" element={<ProductsPage />} />

            {/* Commands (Phase 4) */}
            <Route path="commerce/commands/create" element={<CreateCommandPage />} />
            <Route path="commerce/commands/en-cours" element={<EnCoursPage />} />
            <Route path="commerce/commands/suivi" element={<SuiviPage />} />

            {/* Inventory */}
            <Route path="commerce/inventory/stock" element={<StockPage />} />
            <Route path="commerce/inventory/logs" element={<StockMovementsPage />} />

            {/* Customers & Charges */}
            <Route path="commerce/customers" element={<CustomersPage />} />
            <Route path="commerce/charges" element={<ChargesPage />} />

            {/* ── PRODUCTION ── */}
            <Route path="production/dashboard" element={<ProductionDashboardPage />} />
            <Route path="production/suppliers" element={<SuppliersPage />} />
            <Route path="production/components" element={<ComponentsPage />} />
            <Route path="production/recipes" element={<RecipesPage />} />
            <Route path="production/whatsapp" element={<WhatsAppPage />} />

            {/* ── ADMINISTRATION ── */}
            <Route path="admin/users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/audit-logs" element={<AuditLogsPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="warehouses" element={<WarehousesPage />} />

            {/* Legacy routes kept for backwards compatibility */}
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/commerce/dashboard" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
