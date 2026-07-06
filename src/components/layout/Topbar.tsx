import { useTranslation } from 'react-i18next'
import { Bell, Moon, Sun, Globe } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useLocation } from 'react-router-dom'

function useSectionBadge() {
  const { t } = useTranslation(['common', 'commerce', 'production'])
  const location = useLocation()

  if (location.pathname.startsWith('/production')) {
    return {
      label: t('production:section', 'Production'),
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    }
  }
  if (location.pathname.startsWith('/admin')) {
    return {
      label: t('common:labels.administration'),
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    }
  }
  return {
    label: t('commerce:section', 'Commerce'),
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  }
}

export function Topbar() {
  const { t } = useTranslation('common')
  const { theme, setTheme, language, setLanguage } = useSettingsStore()
  const { user, profile, signOut } = useAuthStore()
  const section = useSectionBadge()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const languageMap: Record<string, string> = {
    fr: 'Français',
    ar: 'العربية',
    en: 'English',
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      {/* Left — Section badge */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'hidden sm:inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold',
            section.className
          )}
        >
          {section.label}
        </span>
      </div>

      {/* Right — Controls */}
      <div className="flex items-center gap-2 ms-auto">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title={t('labels.language')}>
              <Globe className="h-5 w-5" />
              <span className="sr-only">Language</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(languageMap).map(([code, name]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => setLanguage(code as 'fr' | 'ar' | 'en')}
                className={language === code ? 'bg-muted' : ''}
              >
                {name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} title={t('theme.' + theme)}>
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Bell — static for now, will be wired in Phase 15 */}
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        <div className="h-8 w-px bg-border mx-1" />

        {/* User info + sign out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-sm">
            <span className="font-medium leading-tight">{profile?.full_name || user?.email}</span>
            <span className="text-xs text-muted-foreground capitalize leading-tight">
              {profile?.role?.replace(/_/g, ' ') || 'User'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            {t('auth:sign_out')}
          </Button>
        </div>
      </div>
    </header>
  )
}
