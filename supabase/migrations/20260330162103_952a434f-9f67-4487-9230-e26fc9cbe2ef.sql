ALTER TABLE public.houses ADD COLUMN property_type text NOT NULL DEFAULT 'personal';
ALTER TABLE public.houses ADD COLUMN business_type text;