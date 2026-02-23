import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import PublicEvent from "@/components/events/PublicEvent";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, venue, banner_url")
    .eq("slug", params.slug)
    .in("status", ["published", "closed"])
    .single();

  if (!event) return { title: "Event Not Found | Regixo" };

  const desc = event.venue
    ? `${event.venue} — Register now!`
    : "Register now on Regixo!";

  return {
    title: `${event.title} | Regixo`,
    description: desc,
    openGraph: {
      title: event.title,
      description: desc,
      images: event.banner_url ? [{ url: event.banner_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: desc,
      images: event.banner_url ? [event.banner_url] : [],
    },
  };
}

export default function PublicEventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <PublicEvent />
    </Suspense>
  );
}
