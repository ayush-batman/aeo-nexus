import type { Metadata } from "next";
import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata: Metadata = { title: "For marketing teams · Aelo", description: "Measure AI-answer visibility with inspectable samples, confidence and source evidence." };

export default function MarketingSolution() {
    return <SolutionPage content={{
        persona: "marketing teams",
        headline: "Bring the answer—not just the chart—to the review.",
        subheadline: "Aelo gives growth and SEO teams repeatable AI-answer measurements, source evidence and a shared queue of investigations.",
        problem: { title: "A score cannot explain what to do next.", body: "Teams need to know which buyer question missed the brand, which names appeared instead, how stable that pattern was, and what source gap is worth investigating. A percentage alone cannot answer those questions." },
        capabilities: [
            { title: "Measure buyer prompts repeatedly", body: "Run the same question across available assistants and keep successful samples and failures visible." },
            { title: "Trace the source evidence", body: "Review provider-backed domains and exact URLs without treating every prose link as a citation." },
            { title: "Assign one evidence-backed action", body: "Turn a prompt or source gap into owned work while keeping the original rationale attached." },
            { title: "Report the limits", body: "Share what happened, the denominator, confidence, failures and whether a follow-up is comparable." },
        ],
        proofPoints: ["Every score leads back to its prompt and samples.", "Missing or incompatible evidence is partial, untracked or inconclusive—not improvement.", "Workspace roles and plan access are checked on the server.", "Dashboard, API and MCP use the same measurement contract."],
        tierRecommendation: { tierName: "Command", rationale: "Command adds shared Actions and decision reports for teams that need to turn evidence into an operating rhythm." },
        ctaCopy: "Give the room an answer it can inspect.",
    }} />;
}
