import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { company } = useAuthStore()

  useEffect(() => {
    if (!company?.id) return

    // Create a single websocket channel to listen to multiple tables
    const channel = supabase.channel('schema-db-changes')

    // Listen to Products changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products', filter: `company_id=eq.${company.id}` },
      () => {
        console.log('Realtime change detected in Products')
        queryClient.invalidateQueries({ queryKey: ['products'] })
      }
    )

    // Listen to Sales Orders changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sales_orders', filter: `company_id=eq.${company.id}` },
      () => {
        console.log('Realtime change detected in Sales Orders')
        queryClient.invalidateQueries({ queryKey: ['sales_orders'] })
        queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      }
    )

    // Listen to Inventory Transactions changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stock_movements', filter: `company_id=eq.${company.id}` },
      () => {
        console.log('Realtime change detected in Inventory Ledger')
        queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
        queryClient.invalidateQueries({ queryKey: ['products'] }) // stock levels might have changed
      }
    )

    // Listen to Customers changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customers', filter: `company_id=eq.${company.id}` },
      () => {
        console.log('Realtime change detected in Customers')
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      }
    )

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Successfully connected to Supabase Realtime')
      }
    })

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [company?.id, queryClient])
}
