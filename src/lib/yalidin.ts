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

export async function createShipment(data: YalidinShipmentInput[]): Promise<YalidinShipmentResponse[]> {
  try {
    const response = await fetch(`${YALIDIN_BASE_URL}/parcels/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YALIDIN_KEY}`,
        'Content-Type': 'application/json',
      },
      // Yalidin usually accepts an array of parcels
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Yalidin API error: ${response.statusText}`)
    }

    const result = await response.json()
    // Depending on actual response structure. Usually it's an array or has a data key.
    return result.data ? result.data : result
  } catch (error) {
    console.error('Yalidin createShipment error:', error)
    throw error
  }
}

export async function getShipmentStatus(trackingIds: string[]): Promise<YalidinStatusResponse[]> {
  try {
    const trackingQuery = trackingIds.join(',')
    const response = await fetch(`${YALIDIN_BASE_URL}/histories/?tracking=${trackingQuery}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${YALIDIN_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Yalidin API error: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data ? result.data : result
  } catch (error) {
    console.error('Yalidin getShipmentStatus error:', error)
    throw error
  }
}
