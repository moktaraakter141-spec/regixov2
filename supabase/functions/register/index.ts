import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_REGISTRATIONS_PER_IP = 10;
const RATE_LIMIT_WINDOW_HOURS = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { event_id, name, phone, email, guest_count, transaction_id, custom_fields } = body;

    // Validate required fields
    if (!event_id || !name?.trim()) {
      return new Response(JSON.stringify({ error: "event_id and name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Check event exists and is open for registration
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, status, registration_deadline, allow_late_registration, seat_limit, price")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.status !== "published") {
      return new Response(JSON.stringify({ error: "Event is not open for registration" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check deadline
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      // If stored time is midnight UTC (no explicit time set), treat as end-of-day UTC
      if (deadline.getUTCHours() === 0 && deadline.getUTCMinutes() === 0 && deadline.getUTCSeconds() === 0) {
        deadline.setUTCHours(23, 59, 59, 999);
      }
      // Also handle cases where time is near midnight due to timezone conversion
      // by adding a buffer — but the frontend now defaults to 23:59 local, so
      // the stored UTC time will typically be afternoon UTC for Asian timezones
      if (deadline < new Date() && !event.allow_late_registration) {
        return new Response(JSON.stringify({ error: "Registration deadline has passed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check seat limit (count both pending and approved registrations)
    let seatsRemaining: number | null = null;
    if (event.seat_limit && event.seat_limit > 0) {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event_id)
        .in("status", ["pending", "approved"]);

      const occupied = count || 0;
      seatsRemaining = event.seat_limit - occupied;

      if (seatsRemaining <= 0) {
        return new Response(JSON.stringify({ error: "Event is full. No more seats available." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // IP-based rate limiting: max 10 registrations per IP in 2 hours
    if (ip !== "unknown") {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
      const { count: ipCount } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", ip)
        .gte("created_at", windowStart);

      if ((ipCount || 0) >= MAX_REGISTRATIONS_PER_IP) {
        return new Response(
          JSON.stringify({
            error: `Too many registrations from this device. Please try again after ${RATE_LIMIT_WINDOW_HOURS} hours.`,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Duplicate transaction ID check
    let trxIdWarning: string | null = null;
    if (transaction_id?.trim()) {
      const { data: existingTrx } = await supabase
        .from("registrations")
        .select("id, name, event_id")
        .eq("transaction_id", transaction_id.trim())
        .limit(1);

      if (existingTrx && existingTrx.length > 0) {
        trxIdWarning = "This transaction ID has been used in a previous registration. Your registration will be flagged for review.";
      }
    }

    // Generate registration number
    const regNumber = `REG-${Date.now().toString(36).toUpperCase()}`;
    const regId = crypto.randomUUID();

    // Insert registration
    const { error: insertError } = await supabase.from("registrations").insert({
      id: regId,
      event_id,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      guest_count: guest_count || 0,
      transaction_id: transaction_id?.trim() || null,
      custom_fields: custom_fields && Object.keys(custom_fields).length > 0 ? custom_fields : null,
      registration_number: regNumber,
      ip_address: ip,
    });

    if (insertError) throw insertError;

    // Auto-close event if seats are now full
    if (event.seat_limit && event.seat_limit > 0) {
      const { count: newCount } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event_id)
        .in("status", ["pending", "approved"]);

      if ((newCount || 0) >= event.seat_limit) {
        await supabase
          .from("events")
          .update({ status: "closed" })
          .eq("id", event_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        registration_number: regNumber,
        registration_id: regId,
        trx_id_warning: trxIdWarning,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
