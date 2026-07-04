import { SolutionPage } from "@/components/marketing/solution-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "For Marketing Teams · Aelo",
    description: "Replace SEO reports with a receipt: what you shipped, what it moved.",
};

export default function MarketingSolution() {
    return (
        <SolutionPage
            content={{
                persona: "Marketing Teams",
                headline: "Your SEO report was a mirror. Your AEO report is a receipt.",
                subheadline:
                    "Every action your team ships — a landing page, a schema block, a Reddit reply, a G2 comparison — becomes an intervention with a real before/after visibility receipt.",
                problem: {
                    title: "Marketing dashboards told you where you ranked. They never told you why it worked.",
                    body: "Traditional SEO gives you position and traffic — good, but you can only ever say 'position moved from 4 to 2'. AI answers work differently: an LLM either names you or doesn't, cites you or doesn't. Aelo captures the causal layer — which specific intervention moved which specific prompt — so your team can stop guessing which content is worth shipping.",
                },
                capabilities: [
                    {
                        title: "Interventions log with per-action receipts",
                        body: "One row per shipped action, one receipt per follow-up scan. Publishable in your monthly report.",
                    },
                    {
                        title: "AI-drafted content briefs",
                        body: "Every brief ties to the specific target prompt it's designed to move, with citation-gap context baked in.",
                    },
                    {
                        title: "Weekly What-Changed digest",
                        body: "One Monday-morning email: what moved on your target prompts, which competitor closed the gap, what to ship this week.",
                    },
                    {
                        title: "Team seats + workspace hygiene",
                        body: "Up to 5 seats on Command with per-workspace RLS. No accidental cross-brand leakage.",
                    },
                ],
                proofPoints: [
                    "Ship less content, prove more of it. Every action logs a delta.",
                    "The receipt turns AEO into a defensible line-item on your quarterly plan.",
                    "Slack + email digests keep the team on the loop without a login.",
                    "Every metric on the dashboard is auditable to the raw scan.",
                ],
                tierRecommendation: {
                    tierName: "Command",
                    rationale:
                        "The receipt is what makes AEO a defensible marketing motion. Command is where the intervention model lives.",
                },
                ctaCopy: "Give your CEO a receipt, not a chart.",
            }}
        />
    );
}
