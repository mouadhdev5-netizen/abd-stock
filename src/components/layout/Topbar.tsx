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

export function Topbar() {
  const { t } = useTranslation('common')
  const { theme, setTheme, language, setLanguage } = useSettingsStore()
  const { user, profile, signOut } = useAuthStore()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const languageMap: Record<string, string> = {
    fr: 'Français',
    ar: 'العربية',
    en: 'English'
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
      <div className="flex flex-1 items-center gap-4">
        {/* Breadcrumbs can go here */}
        <h2 className="text-lg font-semibold">{t('nav.dashboard')}</h2>
      </div>

      <div className="flex items-center gap-4">
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

        <Button variant="ghost" size="icon" onClick={toggleTheme} title={t('theme.' + theme)}>
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-destructive"></span>
        </Button>

        <div className="h-8 w-px bg-border mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-sm">
            <span className="font-medium">{profile?.full_name || user?.email}</span>
            <span className="text-xs text-muted-foreground capitalize">
              {profile?.role || 'User'}
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
