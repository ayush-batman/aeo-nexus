import type { Metadata } from "next";
import "./globals.css";

// NOTE: We intentionally do NOT use next/font/google here.
// Fetching fonts from Google at compile time blocks the dev server in
// sandboxed/offline environments. Font families are defined as CSS
// variables (--font-sans / --font-mono) in globals.css instead.

export const metadata: Metadata = {
  title: "Aelo | Strategic Intelligence for the AI Era",
  description:
    "Aelo is the command center for winning the AI answer. Track your brand across ChatGPT, Gemini, Claude, and Perplexity.",
  metadataBase: new URL("https://aeo-saas-chi.vercel.app"),
  openGraph: {
    title: "Aelo | Deep Analytics for AI",
    description: "Track, engage, and optimize your brand's presence across every major AI engine.",
    type: "website",
    url: "https://aeo-saas-chi.vercel.app",
    siteName: "Aelo",
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
