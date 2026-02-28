import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumina | AI Engine Optimization Platform",
  description: "Gain complete visibility into what AI Search Engines echo about your brand. Track sentiment, rank higher in LLMs, and dominate the AI era.",
  metadataBase: new URL("https://aeo-saas-chi.vercel.app"),
  openGraph: {
    title: "Lumina | AI Engine Optimization Platform",
    description: "Shedding light on the black box of LLMs.",
    type: "website",
    url: "https://aeo-saas-chi.vercel.app",
    siteName: "Lumina",
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
        className={`${plusJakarta.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
