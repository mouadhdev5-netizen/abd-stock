import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Company, Branch, UserRole } from '@/types/database.types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: { id: string; email: string } | null
  profile: Profile | null
  company: Company | null
  branch: Branch | null
  isLoading: boolean
  isAuthenticated: boolean

  // Actions
  setUser: (user: { id: string; email: string } | null) => void
  setProfile: (profile: Profile | null) => void
  setCompany: (company: Company | null) => void
  setBranch: (branch: Branch | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  hasRole: (role: UserRole) => boolean
  hasPermission: (permission: string) => boolean
  updateLastLogin: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      company: null,
      branch: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),

      setProfile: (profile) =>
        set({ profile }),

      setCompany: (company) =>
        set({ company }),

      setBranch: (branch) =>
        set({ branch }),

      setLoading: (isLoading) =>
        set({ isLoading }),

      signOut: async () => {
        await supabase.auth.signOut()
        set({
          user: null,
          profile: null,
          company: null,
          branch: null,
          isAuthenticated: false,
        })
      },

      hasRole: (role: UserRole) => {
        const { profile } = get()
        if (!profile) return false
        // super_admin has all roles
        if (profile.role === 'super_admin') return true
        return profile.role === role
      },

      hasPermission: (_permission: string) => {
        const { profile } = get()
        if (!profile) return false
        // Super admin and moderator have all permissions
        if (profile.role === 'super_admin' || profile.role === 'moderator') return true
        // For employees, check specific permissions (simplified)
        return false
      },

      updateLastLogin: async () => {
        const { user } = get()
        if (!user) return
        await (supabase
          .from('profiles') as any)
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id)
      },
    }),
    {
      name: 'abd-stock-auth',
      partialize: (state) => ({
        profile: state.profile,
        company: state.company,
        branch: state.branch,
      }),
    }
  )
)
