
-- Site settings table for super admin
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage site settings"
ON public.site_settings FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_heading', 'Effortless Event Registration'),
  ('hero_description', 'Create events, collect registrations, and manage attendees — all in one place.'),
  ('footer_text', '© 2025 EventReg. All rights reserved.'),
  ('default_seat_limit', '300'),
  ('max_seat_limit', '1000');

-- Event templates table
CREATE TABLE public.event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  venue text,
  price numeric DEFAULT 0,
  guest_limit integer DEFAULT 0,
  instructions text,
  custom_fields jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view templates"
ON public.event_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage templates"
ON public.event_templates FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
