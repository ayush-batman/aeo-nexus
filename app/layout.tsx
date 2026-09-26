import type { Metadata } from "next";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/structured-data";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";

// NOTE: We intentionally do NOT use next/font/google here.
// Fetching fonts from Google at compile time blocks the dev server in
// sandboxed/offline environments. Font families are defined as CSS
// variables (--font-sans / --font-mono) in globals.css instead.

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aelohq.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: {
    default:  "Aelo: Know what AI says about your brand",
    template: "%s · Aelo",
  },
  description:
    "Measure how ChatGPT, Gemini, Claude and Perplexity answer about your brand, with repeated samples, confidence ranges and the evidence behind every number.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title:       "Aelo: Know what AI says about your brand",
    description: "Measure real AI answers across ChatGPT, Gemini, Claude and Perplexity. Keep every sample, confidence range and source receipt.",
    type:        "website",
    url:         SITE_URL,
    siteName:    "Aelo",
    images: ["/opengraph-image"],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Aelo: Know what AI says about your brand",
    description: "Measure real AI answers across ChatGPT, Gemini, Claude and Perplexity. Every number links back to its evidence.",
    images:      ["/opengraph-image"],
  },
  robots: {
    index:   true,
    follow:  true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },
  icons: {
    icon: [
      { url: "/brand/favicon.svg?v=20260926", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/brand/social-square.svg", sizes: "1024x1024", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var dashboard=location.pathname.indexOf('/dashboard')===0||location.pathname.indexOf('/onboarding')===0;document.documentElement.dataset.theme=dashboard?(localStorage.getItem('aelo-dashboard-theme-v1')||'dark'):'dark'}catch(e){document.documentElement.dataset.theme='dark'}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
