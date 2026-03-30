-- Add product image URL to inventory items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS product_image_url text DEFAULT '';

-- Custom categories table
CREATE TABLE public.custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '📦',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own categories" ON public.custom_categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Custom locations table
CREATE TABLE public.custom_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.custom_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own locations" ON public.custom_locations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);