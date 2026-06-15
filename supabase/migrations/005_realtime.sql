-- =====================================================
-- ABD STOCK - Enable Realtime Publications
-- =====================================================

BEGIN;

-- Supabase Realtime uses the 'supabase_realtime' publication.
-- We must explicitly add our tables to this publication for the client to receive websocket events.

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
