import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased dark`}
      >
        {children}
      </body>
    </html>
  );
}
