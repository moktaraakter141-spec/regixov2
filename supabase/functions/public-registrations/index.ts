import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const eventId = url.searchParams.get("event_id");
    const countOnly = url.searchParams.get("count_only") === "true";

    if (!eventId) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If count_only, just return occupied seat count (no auth needed for public display)
    if (countOnly) {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("status", ["pending", "approved"]);

      return new Response(
        JSON.stringify({ occupied_seats: count || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check event allows public list
    const { data: event } = await supabase
      .from("events")
      .select("show_registered_list, status")
      .eq("id", eventId)
      .single();

    if (!event || !event.show_registered_list || event.status !== "published") {
      return new Response(JSON.stringify({ error: "Not available" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get registrations - only names and status, mask everything else
    const { data: registrations, error } = await supabase
      .from("registrations")
      .select("name, status, created_at")
      .eq("event_id", eventId)
      .in("status", ["approved", "pending"])
      .order("created_at", { ascending: true });

    if (error) throw error;

    const total = registrations?.length || 0;

    return new Response(
      JSON.stringify({ registrations: registrations || [], total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
