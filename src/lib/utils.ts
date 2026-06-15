import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { fr, ar, enUS } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number,
  currency: string = 'DZD',
  locale: string = 'fr-DZ'
): string {
  const currencyLocaleMap: Record<string, string> = {
    DZD: 'fr-DZ',
    EUR: 'fr-FR',
    USD: 'en-US',
    GBP: 'en-GB',
  }

  return new Intl.NumberFormat(currencyLocaleMap[currency] || locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(
  date: string | Date | null,
  locale: string = 'fr'
): string {
  if (!date) return '-'
  
  const dateLocaleMap: Record<string, any> = {
    fr,
    ar,
    en: enUS,
  }

  return format(new Date(date), 'dd/MM/yyyy', {
    locale: dateLocaleMap[locale] || fr,
  })
}

export function formatDateTime(
  date: string | Date | null,
  locale: string = 'fr'
): string {
  if (!date) return '-'

  const dateLocaleMap: Record<string, any> = {
    fr,
    ar,
    en: enUS,
  }

  return format(new Date(date), 'dd/MM/yyyy HH:mm', {
    locale: dateLocaleMap[locale] || fr,
  })
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function isRTL(language: string): boolean {
  return language === 'ar'
}

export function getDirection(language: string): 'rtl' | 'ltr' {
  return isRTL(language) ? 'rtl' : 'ltr'
}

export function calculateProfit(sellPrice: number, costPrice: number, quantity: number = 1): number {
  return (sellPrice - costPrice) * quantity
}

export function calculateProfitMargin(sellPrice: number, costPrice: number): number {
  if (sellPrice === 0) return 0
  return ((sellPrice - costPrice) / sellPrice) * 100
}

export function calculateTax(amount: number, taxRate: number): number {
  return amount * (taxRate / 100)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
