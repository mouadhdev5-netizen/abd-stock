// Auto-generated TypeScript types for Supabase database
// Run `npx supabase gen types typescript` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          trade_name: string | null
          logo_url: string | null
          tax_id: string | null
          rc_number: string | null
          nif: string | null
          nis: string | null
          art_number: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          phone: string | null
          email: string | null
          website: string | null
          currency: CurrencyCode
          default_language: string
          timezone: string
          valuation_method: InventoryValuation
          subscription_plan: SubscriptionPlan
          subscription_expires_at: string | null
          invoice_prefix: string | null
          invoice_footer: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          trade_name?: string | null
          logo_url?: string | null
          tax_id?: string | null
          rc_number?: string | null
          nif?: string | null
          nis?: string | null
          art_number?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          currency?: CurrencyCode
          default_language?: string
          timezone?: string
          valuation_method?: InventoryValuation
          subscription_plan?: SubscriptionPlan
          subscription_expires_at?: string | null
          invoice_prefix?: string | null
          invoice_footer?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          trade_name?: string | null
          logo_url?: string | null
          tax_id?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          currency?: CurrencyCode
          default_language?: string
          is_active?: boolean
          settings?: Json
          updated_at?: string
        }
      }
      branches: {
        Row: {
          id: string
          company_id: string
          name: string
          code: string | null
          address: string | null
          city: string | null
          phone: string | null
          email: string | null
          manager_id: string | null
          is_main: boolean
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          code?: string | null
          address?: string | null
          city?: string | null
          phone?: string | null
          email?: string | null
          manager_id?: string | null
          is_main?: boolean
          is_active?: boolean
          settings?: Json
        }
        Update: {
          name?: string
          code?: string | null
          address?: string | null
          city?: string | null
          phone?: string | null
          manager_id?: string | null
          is_main?: boolean
          is_active?: boolean
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          company_id: string | null
          branch_id: string | null
          role: UserRole
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          language: string
          is_active: boolean
          last_login_at: string | null
          invited_by: string | null
          invited_at: string | null
          activated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          branch_id?: string | null
          role?: UserRole
          full_name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          language?: string
          is_active?: boolean
        }
        Update: {
          company_id?: string | null
          branch_id?: string | null
          role?: UserRole
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          language?: string
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
        }
      }
      warehouses: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          name: string
          code: string | null
          address: string | null
          city: string | null
          manager_id: string | null
          is_active: boolean
          is_default: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          name: string
          code?: string | null
          address?: string | null
          city?: string | null
          manager_id?: string | null
          is_active?: boolean
          is_default?: boolean
          created_by?: string | null
        }
        Update: {
          name?: string
          code?: string | null
          address?: string | null
          manager_id?: string | null
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          company_id: string
          parent_id: string | null
          name: string
          name_ar: string | null
          name_fr: string | null
          name_en: string | null
          description: string | null
          image_url: string | null
          sort_order: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          parent_id?: string | null
          name: string
          name_ar?: string | null
          name_fr?: string | null
          name_en?: string | null
          description?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          parent_id?: string | null
          name?: string
          name_ar?: string | null
          name_fr?: string | null
          name_en?: string | null
          description?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          company_id: string
          name: string
          logo_url: string | null
          description: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          logo_url?: string | null
          description?: string | null
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          name?: string
          logo_url?: string | null
          description?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          name: string
          trade_name: string | null
          tax_id: string | null
          rc_number: string | null
          contact_name: string | null
          phone: string | null
          mobile: string | null
          email: string | null
          website: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          payment_terms: number | null
          credit_limit: number
          current_balance: number
          currency: CurrencyCode
          rating: number | null
          notes: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          name: string
          trade_name?: string | null
          tax_id?: string | null
          contact_name?: string | null
          phone?: string | null
          mobile?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          payment_terms?: number | null
          credit_limit?: number
          currency?: CurrencyCode
          rating?: number | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          payment_terms?: number | null
          credit_limit?: number
          rating?: number | null
          notes?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          group_id: string | null
          type: CustomerType
          name: string
          trade_name: string | null
          tax_id: string | null
          contact_name: string | null
          phone: string | null
          mobile: string | null
          email: string | null
          loyalty_points: number
          credit_balance: number
          credit_limit: number
          payment_terms: number | null
          discount_rate: number | null
          notes: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          group_id?: string | null
          type?: CustomerType
          name: string
          trade_name?: string | null
          tax_id?: string | null
          contact_name?: string | null
          phone?: string | null
          mobile?: string | null
          email?: string | null
          loyalty_points?: number
          credit_balance?: number
          credit_limit?: number
          payment_terms?: number | null
          discount_rate?: number | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          group_id?: string | null
          type?: CustomerType
          name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          credit_limit?: number
          payment_terms?: number | null
          discount_rate?: number | null
          notes?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          category_id: string | null
          brand_id: string | null
          supplier_id: string | null
          unit_id: string | null
          name: string
          name_ar: string | null
          name_fr: string | null
          name_en: string | null
          description: string | null
          description_ar: string | null
          sku: string | null
          barcode: string | null
          qr_code: string | null
          internal_code: string | null
          cost_price: number
          sell_price: number
          wholesale_price: number | null
          min_sell_price: number | null
          tax_rate: number
          weight: number | null
          dimensions: Json
          images: Json
          thumbnail_url: string | null
          has_variants: boolean
          has_serials: boolean
          has_batches: boolean
          track_expiry: boolean
          track_warranty: boolean
          warranty_days: number | null
          reorder_level: number
          max_stock: number
          min_stock: number
          status: ProductStatus
          notes: string | null
          is_service: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          category_id?: string | null
          brand_id?: string | null
          supplier_id?: string | null
          unit_id?: string | null
          name: string
          name_ar?: string | null
          name_fr?: string | null
          name_en?: string | null
          description?: string | null
          sku?: string | null
          barcode?: string | null
          qr_code?: string | null
          internal_code?: string | null
          cost_price?: number
          sell_price?: number
          wholesale_price?: number | null
          min_sell_price?: number | null
          tax_rate?: number
          weight?: number | null
          images?: Json
          thumbnail_url?: string | null
          has_variants?: boolean
          has_serials?: boolean
          has_batches?: boolean
          track_expiry?: boolean
          track_warranty?: boolean
          warranty_days?: number | null
          reorder_level?: number
          max_stock?: number
          min_stock?: number
          status?: ProductStatus
          notes?: string | null
          is_service?: boolean
          created_by?: string | null
        }
        Update: {
          category_id?: string | null
          brand_id?: string | null
          supplier_id?: string | null
          name?: string
          name_ar?: string | null
          name_fr?: string | null
          sku?: string | null
          barcode?: string | null
          cost_price?: number
          sell_price?: number
          wholesale_price?: number | null
          tax_rate?: number
          images?: Json
          thumbnail_url?: string | null
          reorder_level?: number
          max_stock?: number
          min_stock?: number
          status?: ProductStatus
          notes?: string | null
          updated_at?: string
        }
      }
      stock_levels: {
        Row: {
          id: string
          company_id: string
          product_id: string
          variant_id: string | null
          warehouse_id: string
          qty_on_hand: number
          qty_reserved: number
          qty_available: number
          avg_cost: number
          last_purchase_price: number
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          product_id: string
          variant_id?: string | null
          warehouse_id: string
          qty_on_hand?: number
          qty_reserved?: number
          avg_cost?: number
          last_purchase_price?: number
        }
        Update: {
          qty_on_hand?: number
          qty_reserved?: number
          avg_cost?: number
          last_purchase_price?: number
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          product_id: string
          variant_id: string | null
          warehouse_id: string
          movement_type: MovementType
          quantity: number
          unit_cost: number
          total_cost: number
          qty_before: number
          qty_after: number
          ref_type: string | null
          ref_id: string | null
          batch_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          product_id: string
          variant_id?: string | null
          warehouse_id: string
          movement_type: MovementType
          quantity: number
          unit_cost?: number
          total_cost?: number
          qty_before?: number
          qty_after?: number
          ref_type?: string | null
          ref_id?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          notes?: string | null
        }
      }
      sales_orders: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          warehouse_id: string | null
          customer_id: string | null
          coupon_id: string | null
          so_number: string
          status: SoStatus
          order_date: string
          due_date: string | null
          currency: CurrencyCode
          exchange_rate: number
          subtotal: number
          discount_rate: number | null
          discount_amount: number
          tax_amount: number
          shipping_amount: number
          total: number
          paid_amount: number
          due_amount: number
          profit_amount: number | null
          notes: string | null
          terms: string | null
          employee_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          warehouse_id?: string | null
          customer_id?: string | null
          so_number: string
          status?: SoStatus
          order_date?: string
          due_date?: string | null
          currency?: CurrencyCode
          exchange_rate?: number
          subtotal?: number
          discount_rate?: number | null
          discount_amount?: number
          tax_amount?: number
          shipping_amount?: number
          total?: number
          paid_amount?: number
          profit_amount?: number | null
          notes?: string | null
          employee_id?: string | null
          created_by?: string | null
        }
        Update: {
          customer_id?: string | null
          status?: SoStatus
          due_date?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total?: number
          paid_amount?: number
          profit_amount?: number | null
          notes?: string | null
          updated_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          warehouse_id: string | null
          supplier_id: string
          po_number: string
          status: PoStatus
          order_date: string
          expected_date: string | null
          currency: CurrencyCode
          exchange_rate: number
          subtotal: number
          discount_amount: number
          tax_amount: number
          shipping_cost: number
          total: number
          paid_amount: number
          due_amount: number
          notes: string | null
          terms: string | null
          approved_by: string | null
          approved_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          warehouse_id?: string | null
          supplier_id: string
          po_number: string
          status?: PoStatus
          order_date?: string
          expected_date?: string | null
          currency?: CurrencyCode
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          shipping_cost?: number
          total?: number
          paid_amount?: number
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          supplier_id?: string
          status?: PoStatus
          expected_date?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total?: number
          paid_amount?: number
          notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          updated_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          so_id: string
          delivery_number: string
          status: DeliveryStatus
          driver_id: string | null
          vehicle_info: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_phone: string | null
          scheduled_at: string | null
          assigned_at: string | null
          dispatched_at: string | null
          delivered_at: string | null
          failed_reason: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          so_id: string
          delivery_number: string
          status?: DeliveryStatus
          driver_id?: string | null
          vehicle_info?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_phone?: string | null
          scheduled_at?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          status?: DeliveryStatus
          driver_id?: string | null
          vehicle_info?: string | null
          scheduled_at?: string | null
          assigned_at?: string | null
          dispatched_at?: string | null
          delivered_at?: string | null
          failed_reason?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          type: NotificationType
          title: string
          title_ar: string | null
          title_fr: string | null
          body: string
          body_ar: string | null
          body_fr: string | null
          ref_type: string | null
          ref_id: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          type: NotificationType
          title: string
          title_ar?: string | null
          title_fr?: string | null
          body: string
          body_ar?: string | null
          body_fr?: string | null
          ref_type?: string | null
          ref_id?: string | null
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          category: string
          description: string
          amount: number
          method: PaymentMethod | null
          reference: string | null
          attachment_url: string | null
          expense_date: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          category: string
          description: string
          amount: number
          method?: PaymentMethod | null
          reference?: string | null
          attachment_url?: string | null
          expense_date?: string
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          category?: string
          description?: string
          amount?: number
          expense_date?: string
          notes?: string | null
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          company_id: string | null
          user_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
        }
        Update: Record<string, never>
      }
    }
    Views: {
      v_dashboard_summary: {
        Row: {
          company_id: string
          sale_date: string
          total_orders: number
          total_revenue: number
          total_profit: number
          total_paid: number
          total_due: number
        }
      }
      v_product_stock: {
        Row: {
          product_id: string
          company_id: string
          name: string
          sku: string | null
          barcode: string | null
          status: ProductStatus
          reorder_level: number
          min_stock: number
          max_stock: number
          cost_price: number
          sell_price: number
          category_name: string | null
          brand_name: string | null
          total_qty_on_hand: number
          total_qty_reserved: number
          total_qty_available: number
          avg_cost: number
          stock_value: number
          stock_status: string
        }
      }
      v_monthly_sales: {
        Row: {
          company_id: string
          month: string
          order_count: number
          customer_count: number
          total_revenue: number
          total_profit: number
          total_tax: number
          total_discount: number
        }
      }
      v_top_products: {
        Row: {
          product_id: string
          company_id: string
          product_name: string
          sku: string | null
          total_quantity_sold: number
          total_revenue: number
          total_profit: number
          order_count: number
        }
      }
      v_supplier_balances: {
        Row: {
          supplier_id: string
          company_id: string
          supplier_name: string
          total_purchases: number
          total_paid: number
          outstanding_balance: number
        }
      }
      v_customer_balances: {
        Row: {
          customer_id: string
          company_id: string
          customer_name: string
          loyalty_points: number
          total_sales: number
          total_paid: number
          outstanding_balance: number
        }
      }
    }
    Functions: {
      get_user_company_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_moderator_or_higher: {
        Args: Record<string, never>
        Returns: boolean
      }
      has_permission: {
        Args: { perm: string }
        Returns: boolean
      }
      generate_sequence_number: {
        Args: { p_company_id: string; p_type: string }
        Returns: string
      }
      fn_update_stock_level: {
        Args: {
          p_company_id: string
          p_product_id: string
          p_variant_id: string | null
          p_warehouse_id: string
          p_quantity: number
          p_unit_cost?: number
          p_movement_type?: MovementType
          p_ref_type?: string | null
          p_ref_id?: string | null
          p_notes?: string | null
          p_created_by?: string | null
        }
        Returns: void
      }
      fn_confirm_sale: {
        Args: { p_so_id: string; p_confirmed_by: string }
        Returns: void
      }
      fn_record_payment: {
        Args: {
          p_company_id: string
          p_so_id: string
          p_amount: number
          p_method: PaymentMethod
          p_reference?: string | null
          p_notes?: string | null
          p_created_by?: string | null
        }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      product_status: ProductStatus
      unit_type: UnitType
      movement_type: MovementType
      po_status: PoStatus
      so_status: SoStatus
      invoice_status: InvoiceStatus
      delivery_status: DeliveryStatus
      payment_method: PaymentMethod
      customer_type: CustomerType
      transfer_status: TransferStatus
      count_status: CountStatus
      inventory_valuation: InventoryValuation
      notification_type: NotificationType
      currency_code: CurrencyCode
    }
  }
}

// Enum types
export type UserRole = 'super_admin' | 'moderator' | 'employee' | 'commerce_manager'
export type ProductStatus = 'active' | 'inactive' | 'discontinued'
export type UnitType = 'piece' | 'kg' | 'gram' | 'liter' | 'ml' | 'meter' | 'cm' | 'box' | 'pack' | 'dozen' | 'set'
export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return_in' | 'return_out' | 'count_adjustment' | 'initial'
export type PoStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled'
export type SoStatus = 'quotation' | 'draft' | 'confirmed' | 'processing' | 'partial' | 'completed' | 'cancelled' | 'returned'
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
export type DeliveryStatus = 'pending' | 'processing' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'returned'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'credit' | 'other'
export type CustomerType = 'individual' | 'business'
export type TransferStatus = 'draft' | 'in_transit' | 'completed' | 'cancelled'
export type CountStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'
export type InventoryValuation = 'fifo' | 'lifo' | 'weighted_avg'
export type NotificationType = 'low_stock' | 'out_of_stock' | 'new_sale' | 'new_purchase' | 'payment_due' | 'delivery_update' | 'system'
export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise'
export type CurrencyCode = 'DZD' | 'EUR' | 'USD' | 'GBP'

// Row type aliases
export type Company = Database['public']['Tables']['companies']['Row']
export type Branch = Database['public']['Tables']['branches']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Warehouse = Database['public']['Tables']['warehouses']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type StockLevel = Database['public']['Tables']['stock_levels']['Row']
export type StockMovement = Database['public']['Tables']['stock_movements']['Row']
export type SalesOrder = Database['public']['Tables']['sales_orders']['Row']
export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
export type Delivery = Database['public']['Tables']['deliveries']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

// Insert type aliases
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type BranchInsert = Database['public']['Tables']['branches']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type WarehouseInsert = Database['public']['Tables']['warehouses']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type BrandInsert = Database['public']['Tables']['brands']['Insert']
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type SalesOrderInsert = Database['public']['Tables']['sales_orders']['Insert']
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert']
export type DeliveryInsert = Database['public']['Tables']['deliveries']['Insert']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']

// View type aliases
export type ProductStockView = Database['public']['Views']['v_product_stock']['Row']
export type DashboardSummaryView = Database['public']['Views']['v_dashboard_summary']['Row']
export type MonthlySalesView = Database['public']['Views']['v_monthly_sales']['Row']
export type TopProductsView = Database['public']['Views']['v_top_products']['Row']
export type SupplierBalanceView = Database['public']['Views']['v_supplier_balances']['Row']
export type CustomerBalanceView = Database['public']['Views']['v_customer_balances']['Row']
