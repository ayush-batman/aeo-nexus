import { SolutionPage } from "@/components/marketing/solution-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "For Agencies · Aelo",
    description: "Deliver AEO as a high-ticket service. Client-safe workspaces, ready-to-ship receipts.",
};

export default function AgenciesSolution() {
    return (
        <SolutionPage
            content={{
                persona: "Agencies",
                headline: "Sell AEO like it's already a category. Because it is.",
                subheadline:
                    "Multi-tenant workspaces, per-client dashboards, and per-intervention receipts you can drop into a monthly deliverable. Aelo is built for the agency shape.",
                problem: {
                    title: "Your SEO retainer is under price pressure. Your AI-visibility offering isn't — because nobody else has receipts.",
                    body: "SEO retainers commoditized because reporting was templated. AEO is the opposite: a genuinely new discipline where methodology matters and outcome is measurable. Agencies that can hand a client a per-intervention receipt — 'we published this, the AI now names you here, visibility rose 42 pts' — command premium pricing and lower churn.",
                },
                capabilities: [
                    {
                        title: "One organization → N client workspaces",
                        body: "Complete data isolation via Postgres RLS. Add or archive a client in seconds without touching the others.",
                    },
                    {
                        title: "Client-ready reports",
                        body: "Every intervention row is exportable. The receipt (before/after + verdict) is the deliverable your client will screenshot.",
                    },
                    {
                        title: "Concierge tier for done-for-you",
                        body: "Sublet the strategist. Your team ships, our strategist prescribes and reviews. White-label available.",
                    },
                    {
                        title: "Unlimited scans on Concierge",
                        body: "No overage panic when a client wants to add a competitor set mid-month.",
                    },
                ],
                proofPoints: [
                    "Priced per workspace, not per seat — grow your book without seat math.",
                    "Client offboarding = one click, full data export.",
                    "Every screenshot in your report is a real Aelo view. No mock-ups.",
                    "White-label and reseller options on Concierge.",
                ],
                tierRecommendation: {
                    tierName: "Concierge",
                    rationale:
                        "Concierge unlocks unlimited workspaces, done-for-you execution, and white-label — the shape most agencies need.",
                },
                ctaCopy: "Turn AEO into your next retainer line.",
            }}
        />
    );
}
