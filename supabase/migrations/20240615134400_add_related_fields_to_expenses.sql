-- Migration: add_related_fields_to_expenses
ALTER TABLE public.expenses
ADD COLUMN related_to_type text NULL CHECK (related_to_type IN ('purchase_order', 'sales_order', 'delivery', 'other')),
ADD COLUMN related_to_id uuid NULL;

-- Create an index to make polymorphic queries fast
CREATE INDEX idx_expenses_related_to ON public.expenses (related_to_type, related_to_id);
