
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer');

-- Create event_status enum
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'closed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  venue TEXT,
  organizer_contact_email TEXT,
  organizer_contact_phone TEXT,
  seat_limit INT,
  price NUMERIC(10,2) DEFAULT 0,
  registration_deadline TIMESTAMPTZ,
  guest_limit INT DEFAULT 0,
  allow_late_registration BOOLEAN DEFAULT false,
  instructions TEXT,
  show_registered_list BOOLEAN DEFAULT false,
  status public.event_status NOT NULL DEFAULT 'draft',
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create custom_form_fields table
CREATE TABLE public.custom_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_options JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  guest_count INT DEFAULT 0,
  transaction_id TEXT,
  custom_fields JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  registration_number TEXT UNIQUE,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_events_organizer ON public.events(organizer_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_registrations_event ON public.registrations(event_id);
CREATE INDEX idx_registrations_transaction ON public.registrations(transaction_id);
CREATE INDEX idx_custom_fields_event ON public.custom_form_fields(event_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Helper function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, contact_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggers: update timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- RLS: user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());

-- RLS: events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published events" ON public.events FOR SELECT USING (status = 'published' OR (auth.uid() IS NOT NULL AND (organizer_id = auth.uid() OR public.is_admin())));
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Organizers can update own events" ON public.events FOR UPDATE TO authenticated USING (organizer_id = auth.uid() OR public.is_admin());
CREATE POLICY "Organizers can delete own events" ON public.events FOR DELETE TO authenticated USING (organizer_id = auth.uid() OR public.is_admin());

-- RLS: registrations
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers and admins can view registrations" ON public.registrations FOR SELECT USING (
  public.is_admin() OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid())
);
CREATE POLICY "Anyone can register" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Organizers and admins can update registrations" ON public.registrations FOR UPDATE TO authenticated USING (
  public.is_admin() OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid())
);
CREATE POLICY "Organizers and admins can delete registrations" ON public.registrations FOR DELETE TO authenticated USING (
  public.is_admin() OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid())
);

-- RLS: custom_form_fields
ALTER TABLE public.custom_form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view fields for published events" ON public.custom_form_fields FOR SELECT USING (
  event_id IN (SELECT id FROM public.events WHERE status = 'published')
  OR public.is_admin()
  OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid())
);
CREATE POLICY "Organizers can create fields for own events" ON public.custom_form_fields FOR INSERT TO authenticated WITH CHECK (
  event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid()) OR public.is_admin()
);
CREATE POLICY "Organizers can update fields for own events" ON public.custom_form_fields FOR UPDATE TO authenticated USING (
  event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid()) OR public.is_admin()
);
CREATE POLICY "Organizers can delete fields for own events" ON public.custom_form_fields FOR DELETE TO authenticated USING (
  event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid()) OR public.is_admin()
);

-- Storage bucket for event banners
INSERT INTO storage.buckets (id, name, public) VALUES ('event-banners', 'event-banners', true);

CREATE POLICY "Anyone can view event banners" ON storage.objects FOR SELECT USING (bucket_id = 'event-banners');
CREATE POLICY "Authenticated users can upload banners" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-banners');
CREATE POLICY "Users can update own banners" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own banners" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
