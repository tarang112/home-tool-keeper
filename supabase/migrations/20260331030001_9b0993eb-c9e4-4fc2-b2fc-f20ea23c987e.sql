
ALTER TABLE public.inventory_items
  ADD COLUMN unit_price numeric DEFAULT NULL,
  ADD COLUMN total_price numeric DEFAULT NULL;
