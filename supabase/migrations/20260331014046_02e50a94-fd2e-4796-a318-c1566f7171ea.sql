
CREATE TABLE public.item_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_name text NOT NULL,
  category text,
  subcategory text,
  location text,
  quantity_unit text DEFAULT 'pcs',
  house_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_name)
);

ALTER TABLE public.item_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own defaults"
  ON public.item_defaults
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
