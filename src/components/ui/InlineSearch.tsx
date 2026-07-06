import { useEffect, useRef, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface InlineSearchProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onBarcodeScan?: (barcode: string) => void
  className?: string
  debounceMs?: number
}

export function InlineSearch({
  value,
  onChange,
  placeholder,
  onBarcodeScan,
  className,
  debounceMs = 300,
}: InlineSearchProps) {
  const { t } = useTranslation('common')
  const [inputValue, setInputValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Barcode scanner state
  const barcodeBufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const BARCODE_SPEED_THRESHOLD_MS = 50 // typical scanner types < 50ms between chars

  // Sync if controlled value changes externally
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Debounced onChange
  const handleInputChange = useCallback(
    (raw: string) => {
      setInputValue(raw)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(raw)
      }, debounceMs)
    },
    [onChange, debounceMs]
  )

  // Barcode scanner: listens for rapid keystrokes
  useEffect(() => {
    if (!onBarcodeScan) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const timeDiff = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          onBarcodeScan(barcodeBufferRef.current)
          barcodeBufferRef.current = ''
        }
        return
      }

      if (e.key.length === 1) {
        if (timeDiff < BARCODE_SPEED_THRESHOLD_MS || barcodeBufferRef.current.length > 0) {
          // Rapid keypresses — likely a scanner
          barcodeBufferRef.current += e.key
          // Auto-fire if buffer looks complete (after short timeout)
          setTimeout(() => {
            if (barcodeBufferRef.current.length >= 3 && Date.now() - lastKeyTimeRef.current > 100) {
              onBarcodeScan?.(barcodeBufferRef.current)
              barcodeBufferRef.current = ''
            }
          }, 150)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBarcodeScan])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder ?? t('labels.search_placeholder')}
        className="ps-8 w-full"
      />
    </div>
  )
}
