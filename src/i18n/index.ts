import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'

// Read the saved language from the settings store before i18n initializes
function getSavedLanguage(): string {
  try {
    const raw = localStorage.getItem('abd-stock-settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      const lang = parsed?.state?.language
      if (lang && ['ar', 'fr', 'en'].includes(lang)) return lang
    }
  } catch {
    // ignore
  }
  return 'fr' // fallback
}

i18n
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`../locales/${language}/${namespace}.json`)
    )
  )
  .init({
    lng: getSavedLanguage(),
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'products', 'inventory', 'sales', 'purchases', 'deliveries', 'customers', 'suppliers', 'reports', 'settings', 'users', 'commerce', 'production', 'admin'],
    supportedLngs: ['ar', 'fr', 'en'],
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
