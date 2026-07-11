// @ts-nocheck
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Users, Search, Loader2, AlertTriangle, Link as LinkIcon } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MessageComposer() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()

  const [messageType, setMessageType] = useState<'template' | 'custom'>('template')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [customBody, setCustomBody] = useState('')
  const [productUrl, setProductUrl] = useState('')

  const [audienceMode, setAudienceMode] = useState<'all' | 'select' | 'product'>('all')
  const [searchCustomer, setSearchCustomer] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  // Check connection status
  const { data: session } = useQuery({
    queryKey: ['whatsapp_sessions', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const { data } = await supabase.from('whatsapp_sessions').select('*').eq('company_id', company.id).eq('status', 'connected').maybeSingle()
      return data
    },
    enabled: !!company?.id,
  })

  const isConnected = !!session

  // Fetch Lookups
  const { data: templates } = useQuery({
    queryKey: ['whatsapp_templates', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_templates').select('*').eq('company_id', company?.id).order('name')
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: customers } = useQuery({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('company_id', company?.id).eq('is_active', true).order('full_name')
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: products } = useQuery({
    queryKey: ['products', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name').eq('company_id', company?.id).order('name')
      return data || []
    },
    enabled: !!company?.id,
  })

  // Customers who bought a specific product
  const { data: productCustomers, isLoading: isLoadingProductCustomers } = useQuery({
    queryKey: ['product_customers', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return []
      // Custom query: fetch customers who have sales_order_items for this product
      // We can do this by selecting from sales_orders with an inner join on sales_order_items
      const { data, error } = await supabase
        .from('sales_orders')
        .select('customer_id, sales_order_items!inner(product_id)')
        .eq('sales_order_items.product_id', selectedProductId)
      
      if (error) {
        console.error(error)
        return []
      }

      const custIds = Array.from(new Set(data.map(so => so.customer_id)))
      return customers?.filter(c => custIds.includes(c.id)) || []
    },
    enabled: !!selectedProductId && audienceMode === 'product' && !!customers,
  })

  // Calculate actual audience
  const targetAudience = useMemo(() => {
    if (audienceMode === 'all') return customers || []
    if (audienceMode === 'select') return customers?.filter(c => selectedCustomers.includes(c.id)) || []
    if (audienceMode === 'product') return productCustomers || []
    return []
  }, [audienceMode, customers, selectedCustomers, productCustomers])

  // Get raw message body
  const rawBody = useMemo(() => {
    if (messageType === 'template' && selectedTemplateId) {
      return templates?.find(t => t.id === selectedTemplateId)?.body || ''
    }
    return customBody
  }, [messageType, selectedTemplateId, customBody, templates])

  // Process template variables for preview
  const previewBody = useMemo(() => {
    let result = rawBody
    const sampleCustomer = targetAudience[0]
    
    result = result.replace(/\{\{customer_name\}\}/g, sampleCustomer?.full_name || '[Customer Name]')
    
    if (audienceMode === 'product' && selectedProductId) {
      const p = products?.find(p => p.id === selectedProductId)
      result = result.replace(/\{\{product_name\}\}/g, p?.name || '[Product]')
    } else {
      result = result.replace(/\{\{product_name\}\}/g, '[Product]')
    }

    result = result.replace(/\{\{product_url\}\}/g, productUrl || '[URL]')
    
    return result
  }, [rawBody, targetAudience, audienceMode, selectedProductId, products, productUrl])


  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company ID')
      if (!isConnected) throw new Error('WhatsApp not connected')
      if (targetAudience.length === 0) throw new Error('No recipients selected')
      if (!rawBody) throw new Error('Message body is empty')

      // Record in DB
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          company_id: company.id,
          template_id: messageType === 'template' ? selectedTemplateId : null,
          recipients_count: targetAudience.length,
          message_body: rawBody, // Save raw body so history can show it
          status: 'sent'
        })
      
      if (error) throw error
      
      // ACTUALLY SENDING VIA WA DESKTOP APP NATIVELY
      let sentCount = 0;
      for (const customer of targetAudience) {
        if (!customer.phone) continue;
        
        let formatted = customer.phone.replace(/\s+/g, '')
        if (formatted.startsWith('0')) {
          formatted = '213' + formatted.substring(1)
        }
        
        // Process variables for this specific customer
        let customerMsg = rawBody
        customerMsg = customerMsg.replace(/\{\{customer_name\}\}/g, customer.full_name || '')
        
        if (audienceMode === 'product' && selectedProductId) {
          const p = products?.find(p => p.id === selectedProductId)
          customerMsg = customerMsg.replace(/\{\{product_name\}\}/g, p?.name || '')
        } else {
          customerMsg = customerMsg.replace(/\{\{product_name\}\}/g, '')
        }
        customerMsg = customerMsg.replace(/\{\{product_url\}\}/g, productUrl || '')
        
        // Open native WhatsApp deep link
        const url = `whatsapp://send?phone=${formatted}&text=${encodeURIComponent(customerMsg)}`
        window.open(url, '_blank')
        
        sentCount++;
        // Small delay to allow the OS to process the deep link before firing the next one
        await new Promise(resolve => setTimeout(resolve, 800))
      }
      
      if (sentCount === 0) {
        throw new Error('None of the selected customers have a valid phone number.')
      }
    },
    onSuccess: () => {
      alert(`Message successfully sent to ${targetAudience.length} recipients!`)
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages'] })
      setCustomBody('')
      setSelectedCustomers([])
    },
    onError: (err: any) => {
      alert(`Failed to send message: ${err.message}`)
    }
  })

  // Select logic
  const filteredCustomers = customers?.filter(c => c.full_name.toLowerCase().includes(searchCustomer.toLowerCase())) || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
      
      {/* PANEL 1: Message Content */}
      <div className="lg:col-span-4 flex flex-col border rounded-lg bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-lg">{t('production:whatsapp.compose.step1', { defaultValue: '1. Message Content' })}</h3>
        </div>
        <div className="p-4 flex-1 overflow-auto space-y-6">
          <RadioGroup 
            value={messageType} 
            onValueChange={(v: any) => setMessageType(v)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="template" id="r-template" />
              <Label htmlFor="r-template" className="cursor-pointer">Use Template</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="r-custom" />
              <Label htmlFor="r-custom" className="cursor-pointer">Custom Message</Label>
            </div>
          </RadioGroup>

          {messageType === 'template' ? (
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea 
                placeholder="Type your message here..."
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{customer_name}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{product_name}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{product_url}}`}</code>
              </p>
            </div>
          )}

          <div className="space-y-2 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Product URL Link
            </Label>
            <Input 
              placeholder="https://yourstore.com/product"
              value={productUrl}
              onChange={e => setProductUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Replaces <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{product_url}}`}</code></p>
          </div>
        </div>
      </div>

      {/* PANEL 2: Recipients */}
      <div className="lg:col-span-4 flex flex-col border rounded-lg bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-lg">{t('production:whatsapp.compose.step2', { defaultValue: '2. Select Recipients' })}</h3>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={audienceMode} onValueChange={(v: any) => setAudienceMode(v)} className="flex flex-col h-full">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="product" className="text-xs">By Product</TabsTrigger>
                <TabsTrigger value="select" className="text-xs">Select</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <TabsContent value="all" className="m-0 h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Send to All Customers</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Will send to {customers?.length || 0} active customers.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="product" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label>Purchased Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedProductId && (
                  <div className="pt-4 text-center">
                    {isLoadingProductCustomers ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="font-medium text-lg">{productCustomers?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Customers found who bought this product.</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="select" className="m-0 flex flex-col h-full">
                <div className="relative mb-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search customers..." 
                    className="ps-8" 
                    value={searchCustomer}
                    onChange={e => setSearchCustomer(e.target.value)}
                  />
                </div>
                
                <div className="flex-1 overflow-auto border rounded-md divide-y">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">No customers found.</div>
                  ) : (
                    filteredCustomers.map(c => (
                      <div key={c.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50">
                        <Checkbox 
                          id={`cust-${c.id}`}
                          checked={selectedCustomers.includes(c.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedCustomers([...selectedCustomers, c.id])
                            else setSelectedCustomers(selectedCustomers.filter(id => id !== c.id))
                          }}
                        />
                        <Label htmlFor={`cust-${c.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{c.full_name}</div>
                          <div className="text-xs text-muted-foreground">{c.phone || c.email}</div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-3 text-sm font-medium text-muted-foreground text-end">
                  {selectedCustomers.length} selected
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* PANEL 3: Preview & Send */}
      <div className="lg:col-span-4 flex flex-col border rounded-lg bg-card overflow-hidden">
        <div className="p-4 border-b bg-green-50 dark:bg-green-950/20">
          <h3 className="font-semibold text-lg text-green-800 dark:text-green-500">{t('production:whatsapp.compose.step3', { defaultValue: '3. Preview & Send' })}</h3>
        </div>
        
        <div className="flex-1 p-6 flex flex-col">
          <div className="mb-2 text-sm font-semibold text-muted-foreground">Message Preview</div>
          
          <div className="relative flex-1 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center rounded-lg border shadow-inner p-4 overflow-auto">
            <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/80 backdrop-blur-[2px]" />
            
            <div className="relative z-10">
              {!rawBody ? (
                <div className="flex h-full items-center justify-center text-center text-muted-foreground text-sm mt-10">
                  Select a template or write a custom message to see preview.
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 shadow-sm max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed relative">
                  {/* Whatsapp tail tick */}
                  <div className="absolute -left-2 top-0 w-4 h-4 bg-white dark:bg-zinc-800 transform rotate-45 skew-x-12 -z-10 rounded-sm"></div>
                  
                  {previewBody}
                  
                  <div className="text-[10px] text-muted-foreground text-end mt-1">10:42 AM</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target Audience:</span>
              <span className="font-bold text-lg">{targetAudience.length} {t('labels.customers', { ns: 'common', defaultValue: 'Customers' })}</span>
            </div>

            {!isConnected && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md text-sm text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>WhatsApp is not connected. You must connect your device in the Connect tab before sending.</p>
              </div>
            )}

            <Button 
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white"
              disabled={sendMutation.isPending || !isConnected || targetAudience.length === 0 || !rawBody}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? (
                <Loader2 className="me-2 h-5 w-5 animate-spin" />
              ) : (
                <Send className="me-2 h-5 w-5" />
              )}
              {t('production:whatsapp.compose.send', { defaultValue: 'Send Message Now' })}
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
