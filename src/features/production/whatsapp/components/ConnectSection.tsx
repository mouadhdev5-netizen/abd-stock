// @ts-nocheck
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QrCode, Smartphone, LogOut, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'

export function ConnectSection() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()
  const [isSimulating, setIsSimulating] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const { data: session, isLoading } = useQuery({
    queryKey: ['whatsapp_sessions', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'connected')
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!company?.id,
  })

  const simulateConnection = async () => {
    if (!company?.id) return
    setIsSimulating(true)
    try {
      // Clean up old sessions just in case
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('company_id', company.id)

      const { error } = await supabase
        .from('whatsapp_sessions')
        .insert({
          company_id: company.id,
          phone_number: '+213555000111',
          status: 'connected'
        })
      
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['whatsapp_sessions'] })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSimulating(false)
    }
  }

  const disconnect = async () => {
    if (!company?.id) return
    setIsDisconnecting(true)
    try {
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('company_id', company.id)
      
      await queryClient.invalidateQueries({ queryKey: ['whatsapp_sessions'] })
    } catch (err) {
      console.error(err)
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex flex-col h-full items-center justify-center max-w-md mx-auto text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border-4 border-green-500">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500" />
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold">{t('production:whatsapp.connect.connected_title', { defaultValue: 'Connected Successfully' })}</h2>
          <p className="text-muted-foreground mt-2">
            {t('production:whatsapp.connect.connected_desc', { defaultValue: 'Your WhatsApp account is active and ready to send messages.' })}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 px-4 py-3 rounded-md font-mono text-lg font-medium tracking-wider">
          <Smartphone className="h-5 w-5 text-muted-foreground" />
          {session.phone_number}
        </div>

        <Button 
          variant="destructive" 
          onClick={disconnect} 
          disabled={isDisconnecting}
          className="mt-4"
        >
          {isDisconnecting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          <LogOut className="me-2 h-4 w-4" />
          {t('production:whatsapp.connect.disconnect', { defaultValue: 'Disconnect WhatsApp' })}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 text-center flex-1 bg-muted/20">
          <div className="mx-auto w-48 h-48 bg-white p-4 rounded-xl border shadow-inner flex flex-col items-center justify-center relative group overflow-hidden">
            <QrCode className="w-full h-full text-zinc-900 opacity-20" />
            
            {/* Mock blur overlay */}
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                Backend Not Configured
              </p>
            </div>
          </div>
          
          <h2 className="text-xl font-bold mt-6">
            {t('production:whatsapp.connect.scan_title', { defaultValue: 'Scan with WhatsApp to connect' })}
          </h2>
          
          <ol className="text-sm text-start mt-6 space-y-3 text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-bold text-foreground">1.</span> 
              <span>Open WhatsApp on your phone</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">2.</span> 
              <span>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">3.</span> 
              <span>Tap on <strong>Link a Device</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">4.</span> 
              <span>Point your phone to this screen to capture the code</span>
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border-t border-blue-200 dark:border-blue-900 p-4">
          <p className="text-xs text-blue-800 dark:text-blue-400 text-center">
            <strong>Note:</strong> Bulk messaging works by launching the native WhatsApp Desktop app for each recipient. 
            No backend or API key is required. Make sure WhatsApp is installed on this computer.
          </p>
          <div className="mt-4 flex justify-center">
            <Button 
              size="sm" 
              onClick={simulateConnection}
              disabled={isSimulating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSimulating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Acknowledge & Enable
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
