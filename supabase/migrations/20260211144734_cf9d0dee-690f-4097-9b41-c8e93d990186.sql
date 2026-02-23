
-- Add rejection_reason and tag to registrations
ALTER TABLE public.registrations 
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS tag text;

-- Create index for IP-based rate limiting lookups
CREATE INDEX IF NOT EXISTS idx_registrations_ip_created 
  ON public.registrations (ip_address, created_at DESC);

-- Create index for duplicate trxId detection
CREATE INDEX IF NOT EXISTS idx_registrations_transaction_id 
  ON public.registrations (transaction_id) 
  WHERE transaction_id IS NOT NULL AND transaction_id != '';
