-- Add recurring charge fields to product_charges
ALTER TABLE product_charges ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE product_charges ADD COLUMN IF NOT EXISTS recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly'));
ALTER TABLE product_charges ADD COLUMN IF NOT EXISTS last_generated_at DATE;
ALTER TABLE product_charges ADD COLUMN IF NOT EXISTS parent_charge_id UUID REFERENCES product_charges(id) ON DELETE CASCADE;

-- Create RPC to generate missing recurring charges
CREATE OR REPLACE FUNCTION generate_recurring_charges(p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_target_date DATE;
    v_next_date DATE;
BEGIN
    -- Loop through all recurring charges for this company
    FOR r IN 
        SELECT * FROM product_charges 
        WHERE company_id = p_company_id AND is_recurring = TRUE 
    LOOP
        v_next_date := r.last_generated_at;
        
        -- Determine next date based on interval
        IF r.recurring_interval = 'daily' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 day';
        ELSIF r.recurring_interval = 'weekly' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 week';
        ELSIF r.recurring_interval = 'monthly' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 month';
        ELSIF r.recurring_interval = 'yearly' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 year';
        END IF;

        -- Keep generating until the next date is in the future
        WHILE v_next_date <= CURRENT_DATE LOOP
            -- Insert the new charge
            INSERT INTO product_charges (
                company_id, product_id, description, amount, charge_date, 
                notes, created_by, is_recurring, recurring_interval, 
                parent_charge_id
            ) VALUES (
                r.company_id, r.product_id, r.description, r.amount, v_next_date,
                r.notes, r.created_by, FALSE, NULL, 
                r.id
            );
            
            -- Update the template's last_generated_at
            UPDATE product_charges 
            SET last_generated_at = v_next_date
            WHERE id = r.id;

            -- Advance to next
            IF r.recurring_interval = 'daily' THEN
                v_next_date := v_next_date + INTERVAL '1 day';
            ELSIF r.recurring_interval = 'weekly' THEN
                v_next_date := v_next_date + INTERVAL '1 week';
            ELSIF r.recurring_interval = 'monthly' THEN
                v_next_date := v_next_date + INTERVAL '1 month';
            ELSIF r.recurring_interval = 'yearly' THEN
                v_next_date := v_next_date + INTERVAL '1 year';
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
