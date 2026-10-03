import type { Metadata } from "next";
import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata: Metadata = { title: "For agencies · Aelo", description: "Keep client AI-visibility evidence separated by workspace and ready for review." };

export default function AgenciesSolution() {
    return <SolutionPage content={{
        persona: "agencies",
        headline: "Show clients the answer, the evidence and the limit of the claim.",
        subheadline: "Aelo separates client workspaces, preserves raw AI-answer receipts and turns source or prompt gaps into reviewable work.",
        problem: { title: "Client reporting becomes fragile when the evidence is hidden.", body: "A polished percentage is not enough when a client asks which prompt ran, how many times it ran, what failed, or where the cited source came from. The deliverable needs a trail back to the answer." },
        capabilities: [
            { title: "Separate client workspaces", body: "Server-enforced organization, role and workspace checks bind protected reads and writes to the right client." },
            { title: "Keep inspectable receipts", body: "Retain prompts, answers, failures, citation provenance and measurement conditions." },
            { title: "Organize client investigations", body: "Assign work against a specific prompt or source gap and keep its history available." },
            { title: "Export a bounded report", body: "Explain observed results and limits without presenting an action as proven causation." },
        ],
        proofPoints: ["A failed provider cannot silently make a client's visibility look worse.", "API keys are scoped and revalidated against user and workspace access.", "Imported and new receipts use the same evidence contract.", "Billing and plan changes remain provider-verified and replay-safe."],
        tierRecommendation: { tierName: "Concierge", rationale: "Concierge is the route for teams that need hands-on support. Exact workspace and service terms should be confirmed before purchase." },
        ctaCopy: "Build a client report that survives questions.",
    }} />;
}
