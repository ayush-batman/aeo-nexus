import type { Metadata } from "next";
import "./globals.css";

// NOTE: We intentionally do NOT use next/font/google here.
// Fetching fonts from Google at compile time blocks the dev server in
// sandboxed/offline environments. Font families are defined as CSS
// variables (--font-sans / --font-mono) in globals.css instead.

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aelo.sh").replace(/\/$/, "");

export const metadata: Metadata = {
  title: {
    default:  "Aelo — See how ChatGPT, Gemini, Claude and Perplexity actually answer",
    template: "%s · Aelo",
  },
  description:
    "Track your brand's visibility across every major AI engine, with the raw receipts to prove every number. No black-box scores. Sage-honest data.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title:       "Aelo — See how AI actually answers questions in your category",
    description: "Track your brand's visibility across ChatGPT, Gemini, Claude, and Perplexity, with the raw scans behind every number. The receipt is the product.",
    type:        "website",
    url:         SITE_URL,
    siteName:    "Aelo",
    images: ["/opengraph-image"],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Aelo — See how AI actually answers questions in your category",
    description: "Track your brand's visibility across ChatGPT, Gemini, Claude, and Perplexity. Every number links to the raw scan.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased dark`}
      >
        {children}
      </body>
    </html>
  );
}
