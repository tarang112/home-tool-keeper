-- Add relationship and share_mode columns to house_members
ALTER TABLE public.house_members 
  ADD COLUMN relationship text DEFAULT 'household',
  ADD COLUMN share_mode text DEFAULT 'full';

-- share_mode: 'full' = can see all house items, 'selected' = only sees items shared via item_shares