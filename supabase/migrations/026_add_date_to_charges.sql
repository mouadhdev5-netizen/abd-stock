-- Add date_to column to product_charges for date range support
ALTER TABLE product_charges ADD COLUMN IF NOT EXISTS date_to DATE;
