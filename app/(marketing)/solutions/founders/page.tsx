import { SolutionPage } from "@/components/marketing/solution-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "For SaaS Founders · Aelo",
    description: "Own the shortlist buyers ask ChatGPT for. Measure it weekly.",
};

export default function FoundersSolution() {
    return (
        <SolutionPage
            content={{
                persona: "SaaS Founders",
                headline: "The AI is already picking your competitors. You should know.",
                subheadline:
                    "Aelo tracks, and moves, how ChatGPT, Gemini, Claude and Perplexity answer the exact queries your ICP is typing. When you ship a landing page, we measure the delta.",
                problem: {
                    title: "AI answers are the new shortlist. Most founders have zero signal on theirs.",
                    body: "By 2026 the majority of high-intent buying research happens inside an AI chat, 'best CRM for a 10-person team', 'YC-backed observability tools', 'Notion vs Confluence for scaling teams'. If you're not named, you're not shortlisted. Traditional SEO tools can't see this. Aelo can, and it can prescribe the exact action that closes the gap.",
                },
                capabilities: [
                    {
                        title: "Founder-scoped prompt library",
                        body: "50–200 high-intent queries your buyers are actually typing, generated from your ICP and refined weekly.",
                    },
                    {
                        title: "Competitor Battle mode",
                        body: "Head-to-head simulations across every model, so you know why the AI keeps recommending Notion instead of you.",
                    },
                    {
                        title: "Reddit + forum intervention",
                        body: "Aelo drafts community-safe replies to the exact threads the AI is citing. You review; you ship; we measure.",
                    },
                    {
                        title: "Before/after receipts",
                        body: "Every action you take gets a receipt, visibility change on the target prompt, in points, with a verdict.",
                    },
                ],
                proofPoints: [
                    "Signal in your first scan, no waiting for data to accumulate.",
                    "Priced in ₹ starting ₹4,999/mo. Razorpay + Stripe.",
                    "You + one teammate on Radar; up to 5 on Command.",
                    "The honest data policy: no fabricated metrics, ever.",
                ],
                tierRecommendation: {
                    tierName: "Command",
                    rationale:
                        "Founders need the whole loop, Scan through Prove. Radar is fine if you only want the mirror; Command is where the levers are.",
                },
                ctaCopy: "Find out what ChatGPT is telling your buyers about you.",
            }}
        />
    );
}
