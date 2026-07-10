const YALIDIN_BASE_URL = 'https://api.yalidin.com/v1'
const YALIDIN_KEY = 'A2f6u0zGFoV0iprNTdICKfHhnbPQa3DySQ2hiNULhlEZDn4gzArNtrgJcPUw'

export interface YalidinShipmentInput {
  order_id: string
  firstname: string
  familyname: string
  contact_phone: string
  address: string
  to_wilaya_name: string
  to_commune_name: string
  product_list: string
  price: number
  do_insurance: boolean
  is_free_shipping: boolean
}

export interface YalidinShipmentResponse {
  tracking: string
  status: string
  [key: string]: any
}

export interface YalidinStatusResponse {
  tracking: string
  status: string
  last_event: string
  estimated_delivery?: string
  [key: string]: any
}

/**
 * Maps Yalidin API status to our internal app status
 */
export function mapYalidinStatus(apiStatus: string): string {
  const status = apiStatus.toLowerCase()
  if (status.includes('delivered') || status.includes('livré')) return 'delivered'
  if (status.includes('cancelled') || status.includes('retour') || status.includes('annulé')) return 'cancelled'
  if (status.includes('transit') || status.includes('expédié') || status.includes('shipped')) return 'in_transit'
  if (status.includes('pending') || status.includes('en_attente')) return 'pending'
  return 'confirmed'
}

// Check if running inside Electron
const isElectron = () => typeof window !== 'undefined' && !!(window as any).electronAPI?.yalidinApi

import { supabase } from './supabase'

async function callYalidinApi(action: string, payload: any): Promise<any> {
  // In Electron — use native Node.js IPC (no CORS)
  if (isElectron()) {
    const result = await (window as any).electronAPI.yalidinApi(action, payload)
    if (result?.error) throw new Error(result.error)
    return result
  }

  // In browser/web — use Supabase Edge Function proxy
  const { data: result, error } = await supabase.functions.invoke('yalidin-proxy', {
    body: { action, payload }
  })
  if (error) throw new Error(error.message || 'Error calling yalidin-proxy')
  if (result?.error) throw new Error(result.error)
  return result?.data ? result.data : result
}

export async function createShipment(data: YalidinShipmentInput[]): Promise<YalidinShipmentResponse[]> {
  try {
    return await callYalidinApi('createShipment', data)
  } catch (error) {
    console.error('Yalidin createShipment error:', error)
    throw error
  }
}

export async function getShipmentStatus(trackingIds: string[]): Promise<YalidinStatusResponse[]> {
  try {
    return await callYalidinApi('getShipmentStatus', trackingIds)
  } catch (error) {
    console.error('Yalidin getShipmentStatus error:', error)
    throw error
  }
}
