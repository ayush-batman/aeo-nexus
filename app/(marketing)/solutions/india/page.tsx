import { SolutionPage } from "@/components/marketing/solution-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "For India-first Brands · Aelo",
    description: "₹ pricing. Razorpay. Indian-query nuance. A public monthly India AI Visibility Index.",
};

export default function IndiaSolution() {
    return (
        <SolutionPage
            content={{
                persona: "India-first Brands",
                headline: "India is the world's #1 country for ChatGPT users. Own the answer.",
                subheadline:
                    "Aelo is built for how Indian buyers actually search the AI, Tier-2 city queries, rupee-anchored intent (\"under 20k\", \"under 5k\"), and comparison prompts against competitors that global tools have never heard of.",
                problem: {
                    title: "Every AEO tool is priced in dollars, tuned to US queries, and blind to your competitors.",
                    body: "'Best CRM for Indian startups', 'Wireless earbuds under ₹5,000', 'Payment gateway that supports UPI + international cards', these are the real intent queries. Global tools have never scored a scan on them. Aelo tracks Indian competitor sets (BoAt vs Boult vs Noise, not JBL vs Sony) and prices in rupees so your CFO stops asking questions.",
                },
                capabilities: [
                    {
                        title: "Native ₹ pricing + Razorpay",
                        body: "GST-compliant invoices. UPI, cards, NetBanking. No FX pain, no monthly conversion drift.",
                    },
                    {
                        title: "Indian-query prompt library",
                        body: "Pre-seeded with Tier-2 city intent, rupee-anchored queries, and category-specific Indian competitor sets.",
                    },
                    {
                        title: "India AI Visibility Index",
                        body: "A public monthly ranking Aelo publishes for select niches. Your brand can earn a top-10 spot, free PR that compounds.",
                    },
                    {
                        title: "Reddit + Quora + regional forums",
                        body: "Not just US Reddit. r/IndianStartups, TeamBHP, XBhP, YouTube regional creators, the sources actually influencing Indian AI answers.",
                    },
                ],
                proofPoints: [
                    "Priced from ₹4,999/mo. India-first, not India-translated.",
                    "The only AEO tool that understands 'phones under 20k' as an intent query.",
                    "Featured in the monthly India AI Visibility Index for eligible brands.",
                    "Data hosted on Supabase (AWS Mumbai region available on Concierge).",
                ],
                tierRecommendation: {
                    tierName: "Command",
                    rationale:
                        "Command gives you the full loop plus 3 workspaces, enough to track your main brand, one sub-brand, and one competitor for benchmarking.",
                },
                ctaCopy: "See what India is asking the AI about your category.",
            }}
        />
    );
}
