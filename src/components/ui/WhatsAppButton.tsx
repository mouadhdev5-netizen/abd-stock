import { Button } from '@/components/ui/button'

export function WhatsAppButton({ phone, className }: { phone: string, className?: string }) {
  if (!phone) return null
  
  // Format phone number for WhatsApp (remove spaces, ensure country code)
  // Assuming Algerian numbers usually start with 05, 06, 07 and require +213
  let formatted = phone.replace(/\s+/g, '')
  if (formatted.startsWith('0')) {
    formatted = '213' + formatted.substring(1)
  }
  
  const handleWhatsApp = () => {
    // This will open natively in Electron if setWindowOpenHandler allows wa.me
    window.open(`https://wa.me/${formatted}`, '_blank')
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className={`h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 ${className}`}
      onClick={handleWhatsApp}
      title="Open in WhatsApp"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="lucide lucide-message-circle"
      >
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
      </svg>
    </Button>
  )
}
