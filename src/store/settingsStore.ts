import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

type Language = 'ar' | 'fr' | 'en'
type Theme = 'dark' | 'light' | 'system'

interface SettingsState {
  language: Language
  theme: Theme
  currency: string
  sidebarCollapsed: boolean
  
  // Actions
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  setCurrency: (currency: string) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'fr',
      theme: 'dark',
      currency: 'DZD',
      sidebarCollapsed: false,

      setLanguage: (language) => {
        i18n.changeLanguage(language)
        // Update HTML dir attribute
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = language
        document.documentElement.classList.toggle('font-arabic', language === 'ar')
        set({ language })
      },

      setTheme: (theme) => {
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else {
          // System preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', prefersDark)
        }
        set({ theme })
      },

      setCurrency: (currency) => set({ currency }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: 'abd-stock-settings',
    }
  )
)
