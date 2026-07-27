-- Add wilaya, commune, and address to customers for simpler access
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS wilaya TEXT,
ADD COLUMN IF NOT EXISTS commune TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;
