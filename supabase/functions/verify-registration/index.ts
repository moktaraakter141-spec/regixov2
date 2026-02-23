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
    const regId = url.searchParams.get("reg_id");
    const regNumber = url.searchParams.get("reg_number");
    const trxId = url.searchParams.get("trx_id");

    let query = supabase
      .from("registrations")
      .select("id, name, email, phone, status, registration_number, guest_count, created_at, event_id, transaction_id, tag");

    if (regId) {
      query = query.eq("id", regId);
    } else if (regNumber) {
      query = query.eq("registration_number", regNumber);
    } else if (trxId) {
      query = query.eq("transaction_id", trxId);
    } else {
      return new Response(JSON.stringify({ error: "Provide reg_id, reg_number, or trx_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: registration, error: regError } = await query.maybeSingle();

    if (regError) throw regError;
    if (!registration) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event info
    const { data: event } = await supabase
      .from("events")
      .select("title, venue, banner_url, registration_deadline")
      .eq("id", registration.event_id)
      .single();

    // Mask sensitive data
    const masked = {
      ...registration,
      phone: registration.phone ? registration.phone.slice(0, 4) + "****" + registration.phone.slice(-2) : null,
      email: registration.email ? registration.email.split("@")[0].slice(0, 3) + "***@" + registration.email.split("@")[1] : null,
      transaction_id: registration.transaction_id ? registration.transaction_id.slice(0, 4) + "****" : null,
    };

    return new Response(
      JSON.stringify({ found: true, registration: masked, event }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
