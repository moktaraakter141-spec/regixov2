
-- Add payment info columns
ALTER TABLE public.events ADD COLUMN payment_number text DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN payment_instruction text DEFAULT NULL;

-- Add default field visibility toggles (all shown by default)
ALTER TABLE public.events ADD COLUMN show_phone_field boolean DEFAULT true;
ALTER TABLE public.events ADD COLUMN show_email_field boolean DEFAULT true;
