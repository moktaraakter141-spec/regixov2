import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL = Deno.env.get("APP_URL")!;

const DEFAULT_BANNER = `${APP_URL}/default-event-banner.jpeg`;

const CRAWLERS = [
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "slackbot",
  "discordbot",
  "googlebot",
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLERS.some((bot) => ua.includes(bot));
}

// description থেকে HTML tag বাদ দিয়ে plain text বানাও
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function buildOGHtml(event: {
  slug: string;
  title: string;
  description?: string | null;
  banner_url?: string | null;
  venue?: string | null;
  show_default_banner?: boolean | null;
}): string {
  const title = event.title;
  const rawDesc = event.description ? stripHtml(event.description) : "";
  const description =
    rawDesc ||
    (event.venue
      ? `📍 ${event.venue} — Register now on Regixo!`
      : "Register now on Regixo!");
  const image =
    event.banner_url ||
    (event.show_default_banner ? DEFAULT_BANNER : DEFAULT_BANNER);
  const url = `${APP_URL}/e/${event.slug}`;
  const fullDesc = event.venue
    ? `${description} 📍 ${event.venue}`
    : description;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Regixo</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${fullDesc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Regixo" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${fullDesc}" />
  <meta name="twitter:image" content="${image}" />

  <!-- Redirect real users to React app -->
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p>Redirecting to <a href="${url}">${title}</a>...</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // slug নাও query param থেকে: /event-og?slug=--mly2j82f
  const slug =
    url.searchParams.get("slug") ||
    url.pathname.split("/").filter(Boolean).pop();

  if (!slug) {
    return new Response("Slug required", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: event, error } = await supabase
    .from("events")
    .select("slug, title, description, banner_url, venue, show_default_banner")
    .eq("slug", slug)
    .single();

  if (error || !event) {
    return new Response("Event not found", { status: 404 });
  }

  const userAgent = req.headers.get("user-agent") || "";

  if (isCrawler(userAgent)) {
    return new Response(buildOGHtml(event), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } else {
    return Response.redirect(`${APP_URL}/e/${event.slug}`, 302);
  }
});
