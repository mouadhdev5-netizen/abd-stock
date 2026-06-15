import { useEffect, useRef } from 'react'

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void
  threshold?: number // Max time between keystrokes in ms (default 30ms)
  minLength?: number // Minimum barcode length (default 5)
}

export function useBarcodeScanner({ onScan, threshold = 30, minLength = 5 }: UseBarcodeScannerProps) {
  const buffer = useRef<string>('')
  const lastKeyTime = useRef<number>(Date.now())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (unless you want the scanner to work globally overriding inputs, 
      // but usually standard scanners just type into the active input. 
      // However, a true global scanner hook captures it regardless of focus if it's fast enough).
      const activeTag = document.activeElement?.tagName.toLowerCase()
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea'

      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTime.current

      if (timeDiff > threshold) {
        // Reset buffer if time between keystrokes is too long (human typing)
        buffer.current = ''
      }

      // Enter key indicates end of barcode scan
      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          onScan(buffer.current)
          
          // If we detected a scan and an input was focused, you might want to prevent default form submission
          // e.preventDefault()
        }
        buffer.current = ''
      } else if (e.key.length === 1) { // Only capture printable characters
        buffer.current += e.key
      }

      lastKeyTime.current = currentTime
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan, threshold, minLength])
}
