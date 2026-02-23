import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type Event = Tables<"events">;
export type Registration = Tables<"registrations">;
export type CustomFormField = Tables<"custom_form_fields">;

export const useEvents = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // ✅ প্রতি ৫ মিনিটে একবার refetch
  });
};

export const useEvent = (eventId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("organizer_id", user!.id)
        .single();
      if (error) throw error;
      return data as Event;
    },
    enabled: !!eventId && !!user,
  });
};

export const usePublicEvent = (slug: string) => {
  return useQuery({
    queryKey: ["public-event", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .in("status", ["published", "closed"])
        .single();
      if (error) throw error;
      return data as Event;
    },
    enabled: !!slug,
    refetchInterval: 30000,
  });
};

export const useEventRegistrations = (eventId: string) => {
  return useQuery({
    queryKey: ["registrations", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Registration[];
    },
    enabled: !!eventId,
  });
};

export const useCustomFormFields = (eventId: string) => {
  return useQuery({
    queryKey: ["custom-fields", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_form_fields")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CustomFormField[];
    },
    enabled: !!eventId,
  });
};

export const useDashboardStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, status")
        .eq("organizer_id", user!.id);
      if (eventsError) throw eventsError;

      const eventIds = events.map((e) => e.id);
      let registrations: Registration[] = [];
      if (eventIds.length > 0) {
        const { data, error } = await supabase
          .from("registrations")
          .select("*")
          .in("event_id", eventIds);
        if (error) throw error;
        registrations = data;
      }

      return {
        totalEvents: events.length,
        publishedEvents: events.filter((e) => e.status === "published").length,
        draftEvents: events.filter((e) => e.status === "draft").length,
        closedEvents: events.filter((e) => e.status === "closed").length,
        totalRegistrations: registrations.length,
        approvedRegistrations: registrations.filter(
          (r) => r.status === "approved",
        ).length,
        pendingRegistrations: registrations.filter(
          (r) => r.status === "pending",
        ).length,
      };
    },
    enabled: !!user,
  });
};

export const useRegistrationTrends = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["registration-trends", user?.id],
    queryFn: async () => {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", user!.id);
      if (eventsError) throw eventsError;

      const eventIds = events.map((e) => e.id);
      if (eventIds.length === 0) return [];

      const { data, error } = await supabase
        .from("registrations")
        .select("id, event_id, created_at, status")
        .in("event_id", eventIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const generateSlug = (title: string): string => {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) +
    "-" +
    Date.now().toString(36)
  );
};
