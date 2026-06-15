import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'

import LoginPage from '@/features/auth/pages/LoginPage'
import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import ProductsPage from '@/features/products/pages/ProductsPage'
import CustomersPage from '@/features/customers/pages/CustomersPage'
import SalesPage from '@/features/sales/pages/SalesPage'
import SuppliersPage from '@/features/suppliers/pages/SuppliersPage'
import PurchasesPage from '@/features/purchases/pages/PurchasesPage'
import DeliveriesPage from '@/features/inventory/pages/DeliveriesPage'
import StockMovementsPage from '@/features/inventory/pages/StockMovementsPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import AuditLogsPage from '@/features/settings/pages/AuditLogsPage'
import BranchesPage from '@/features/settings/pages/BranchesPage'
import WarehousesPage from '@/features/inventory/pages/WarehousesPage'
import UsersPage from '@/features/users/pages/UsersPage'
import ExpensesPage from '@/features/accounting/pages/ExpensesPage'
import InvoicesPage from '@/features/accounting/pages/InvoicesPage'
import ReportsPage from '@/features/reports/pages/ReportsPage'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

// Auth Guard
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  useRealtimeSync()
  
  const { setUser, setLoading } = useAuthStore()
  const { language, theme } = useSettingsStore()

  // Apply theme and language on mount
  useEffect(() => {
    // Apply theme
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }

    // Apply language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
    document.documentElement.classList.toggle('font-arabic', language === 'ar')
    // Sync i18n library with the stored language setting
    if (i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [theme, language])

  // Setup Auth Listener
  useEffect(() => {
    const fetchUserData = async (sessionUser: any) => {
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email! })
        
        // Fetch profile
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="purchases" element={<PurchasesPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="inventory" element={<StockMovementsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/audit-logs" element={<AuditLogsPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        
        {/* Add more routes here */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
