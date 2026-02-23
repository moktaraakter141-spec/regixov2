import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, transaction_id, contact_type, contact_value } = body;

    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedName = name.trim().toLowerCase();

    // ══════════════════════════════════════
    // FREE EVENT: contact_type + contact_value + name
    // ══════════════════════════════════════
    if (contact_type && contact_value) {
      if (!["phone", "email"].includes(contact_type)) {
        return new Response(JSON.stringify({ error: "Invalid contact_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contactField = contact_type === "phone" ? "phone" : "email";
      const trimmedContact = contact_value.trim();

      const { data: regs, error: regError } = await supabase
        .from("registrations")
        .select(
          "id, name, email, phone, status, registration_number, guest_count, created_at, event_id, transaction_id, tag",
        )
        .eq(contactField, trimmedContact);

      if (regError) throw regError;

      if (!regs || regs.length === 0) {
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Name match করো
      const matched = regs.filter(
        (r) => r.name?.trim().toLowerCase() === trimmedName,
      );

      if (matched.length === 0) {
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Multiple match — warning
      if (matched.length > 1) {
        return new Response(
          JSON.stringify({
            found: true,
            multiple: true,
            registration: null,
            event: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Single match — event info নিয়ে return করো
      const reg = matched[0];
      const { data: event } = await supabase
        .from("events")
        .select("title, venue, banner_url, registration_deadline")
        .eq("id", reg.event_id)
        .single();

      return new Response(
        JSON.stringify({
          found: true,
          multiple: false,
          registration: reg,
          event,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ══════════════════════════════════════
    // PAID EVENT: transaction_id + name
    // ══════════════════════════════════════
    if (transaction_id) {
      const trimmedTrxId = transaction_id.trim();

      if (trimmedTrxId.length < 3) {
        return new Response(
          JSON.stringify({ error: "Invalid transaction ID" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: regs, error: regError } = await supabase
        .from("registrations")
        .select(
          "id, name, email, phone, status, registration_number, guest_count, created_at, event_id, transaction_id, tag",
        )
        .eq("transaction_id", trimmedTrxId);

      if (regError) throw regError;

      if (!regs || regs.length === 0) {
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Name match করো
      const matched = regs.filter(
        (r) => r.name?.trim().toLowerCase() === trimmedName,
      );

      if (matched.length === 0) {
        return new Response(JSON.stringify({ found: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Multiple match — warning
      if (matched.length > 1) {
        return new Response(
          JSON.stringify({
            found: true,
            multiple: true,
            registration: null,
            event: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Single match
      const reg = matched[0];
      const { data: event } = await supabase
        .from("events")
        .select("title, venue, banner_url, registration_deadline")
        .eq("id", reg.event_id)
        .single();

      return new Response(
        JSON.stringify({
          found: true,
          multiple: false,
          registration: reg,
          event,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // কোনো valid param নেই
    return new Response(
      JSON.stringify({
        error:
          "Provide transaction_id (paid) or contact_type + contact_value (free)",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
