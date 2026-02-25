// app/page.tsx — SERVER COMPONENT ("use client" নেই)

import type { Metadata } from "next";
import Home from "@/components/Home"; // আগের "use client" component আলাদা file এ

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://regixo.vercel.app";

export const metadata: Metadata = {
  title: "Regixo — Event Registration, Simplified",
  description:
    "Create events, share links, and manage attendees — all from one clean dashboard. Free forever.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "Regixo — Event Registration, Simplified",
    description:
      "Create events, share links, and manage attendees — all from one clean dashboard.",
    url: APP_URL,
    siteName: "Regixo",
    type: "website",
    images: [
      {
        url: `${APP_URL}/og-image.jpeg`, // 1200×630 একটা OG image বানাও
        width: 1200,
        height: 630,
        alt: "Regixo — Event Registration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Regixo — Event Registration, Simplified",
    description:
      "Create events, share links, and manage attendees — all from one clean dashboard.",
    images: [`${APP_URL}/og-image.jpeg`],
  },
};

export default function Page() {
  return <Home />;
}
