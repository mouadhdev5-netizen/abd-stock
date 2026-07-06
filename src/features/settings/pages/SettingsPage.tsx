import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save, Building, MapPin, ReceiptText, Users as UsersIcon, Store, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/ImageUpload'

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  tax_id: z.string().optional(),
  rc_number: z.string().optional(),
  art_number: z.string().optional(),
  nis_number: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  currency: z.string().default('DZD'),
  logo_url: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companySchema>

export default function SettingsPage() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()

  // 1. Fetch Company
  const { data: companyData, isLoading } = useQuery<any>({
    queryKey: ['company', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const { data, error } = await supabase.from('companies').select('*').eq('id', company.id).single()
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  // 2. Fetch Branches
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase.from('branches').select('*').eq('company_id', company.id)
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  // 3. Fetch Users
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['profiles', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase.from('profiles').select('*').eq('company_id', company.id)
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    values: {
      name: companyData?.name || '',
      tax_id: companyData?.tax_id || '',
      rc_number: companyData?.rc_number || '',
      art_number: companyData?.art_number || '',
      nis_number: companyData?.nis_number || '',
      address: companyData?.address || '',
      phone: companyData?.phone || '',
      email: companyData?.email || '',
      website: companyData?.website || '',
      currency: companyData?.currency || 'DZD',
      logo_url: companyData?.logo_url || '',
    },
  })

  async function onSubmit(data: CompanyFormValues) {
    if (!company?.id) return
    try {
      const { error } = await supabase.from('companies').update(data as never).eq('id', company.id)
      if (error) throw error
      useAuthStore.setState((state) => ({ company: { ...state.company, ...data } as any }))
      alert('Company settings updated successfully!')
    } catch (error) {
      console.error('Error updating company:', error)
      alert('Failed to update company settings.')
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // @ts-expect-error inference
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) throw error
      refetchUsers()
    } catch (e) {
      console.error(e)
      alert('Failed to update user role')
    }
  }

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading settings...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage company profile, branches, and user permissions.</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-[600px] mb-6">
          <TabsTrigger value="company" className="flex gap-2"><Building className="h-4 w-4"/> Company</TabsTrigger>
          <TabsTrigger value="branches" className="flex gap-2"><Store className="h-4 w-4"/> Branches</TabsTrigger>
          <TabsTrigger value="users" className="flex gap-2"><UsersIcon className="h-4 w-4"/> Users & Roles</TabsTrigger>
          <TabsTrigger value="preferences" className="flex gap-2"><Shield className="h-4 w-4"/> Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="company" className="mt-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 border rounded-md p-6 bg-card">
              <div>
                <h3 className="text-lg font-medium">General Information</h3>
                <p className="text-sm text-muted-foreground">This info will appear on invoices and receipts.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormField control={form.control} name="logo_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo</FormLabel>
                      <FormControl>
                        <ImageUpload url={field.value || ''} onUpload={field.onChange} folder="logos" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem><FormLabel>Default Currency</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2"><ReceiptText className="h-4 w-4"/> Legal & Tax Info</h4>
                  <FormField control={form.control} name="tax_id" render={({ field }) => (
                    <FormItem><FormLabel>NIF (Numéro d'Identification Fiscale)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="rc_number" render={({ field }) => (
                    <FormItem><FormLabel>RC (Registre de Commerce)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="art_number" render={({ field }) => (
                    <FormItem><FormLabel>AI (Article d'Imposition)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="nis_number" render={({ field }) => (
                    <FormItem><FormLabel>NIS (Numéro d'Identification Statistique)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4"/> Contact Details</h4>
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Physical Address</FormLabel><FormControl><Textarea className="h-24" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </div>
              <div className="flex justify-end gap-4 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => form.reset()}>Discard Changes</Button>
                <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                  {form.formState.isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="branches" className="mt-0 space-y-4">
          <div className="border rounded-md bg-card p-6">
            <h3 className="text-lg font-medium">Branches & Locations</h3>
            <p className="text-sm text-muted-foreground mb-4">Manage your company's physical branches and headquarters.</p>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Headquarters</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchesLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4">Loading branches...</TableCell></TableRow>
                  ) : (
                    branches?.map((branch: any) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-medium">{branch.name}</TableCell>
                        <TableCell>{branch.code}</TableCell>
                        <TableCell>{branch.is_main ? <Badge variant="default">HQ</Badge> : '-'}</TableCell>
                        <TableCell>{branch.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">To add a new branch, please use the Branch Wizard in the database console or contact support.</div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-0 space-y-4">
          <div className="border rounded-md bg-card p-6">
            <h3 className="text-lg font-medium">User Management</h3>
            <p className="text-sm text-muted-foreground mb-4">Assign roles and permissions to your staff. (Skipping password resets as requested).</p>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4">Loading users...</TableCell></TableRow>
                  ) : (
                    users?.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>Headquarters</TableCell>
                        <TableCell>
                          <Select defaultValue={u.role} onValueChange={(val) => updateUserRole(u.id, val)}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="branch_manager">Branch Manager (Mod)</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-0 space-y-4">
          <div className="border rounded-md p-6 bg-card">
            <h3 className="text-lg font-medium">System Preferences</h3>
            <p className="text-sm text-muted-foreground mb-4">Manage UI and application behavior.</p>
            <div className="rounded-lg border p-4 bg-muted/50 text-sm">
              User interface theme (Dark/Light mode) and Language (Arabic/French/English) can be configured dynamically from the top navigation bar at any time without needing to save settings.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
