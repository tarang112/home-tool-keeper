
-- Add soft-delete column
ALTER TABLE public.inventory_items
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for efficient filtering
CREATE INDEX idx_inventory_items_deleted_at ON public.inventory_items (deleted_at) WHERE deleted_at IS NOT NULL;
