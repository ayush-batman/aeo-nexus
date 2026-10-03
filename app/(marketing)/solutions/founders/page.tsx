import type { Metadata } from "next";
import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata: Metadata = { title: "For SaaS founders · Aelo", description: "Inspect how AI assistants answer buyer questions about your category and brand." };

export default function FoundersSolution() {
    return <SolutionPage content={{
        persona: "SaaS founders",
        headline: "Know whether your brand makes the AI shortlist—and why.",
        subheadline: "Aelo repeats the buyer questions that shape consideration, keeps every answer and shows the sources worth investigating.",
        problem: { title: "A single AI answer is easy to overread.", body: "One answer may name you and the next may not. Without repeated samples, a visible denominator and the source trail, a founder cannot tell whether the mention is dependable or accidental." },
        capabilities: [
            { title: "Choose the shortlist questions", body: "Start with three to five editable prompts grounded in how buyers compare the category." },
            { title: "Inspect repeated answers", body: "Open each successful or failed sample instead of relying on a detached score." },
            { title: "See competing names and sources", body: "Identify which brands recur and which provider-backed domains appear in the evidence." },
            { title: "Run a compatible follow-up", body: "After the team acts, compare only measurements whose important conditions still match." },
        ],
        proofPoints: ["The visibility estimate includes its mention count, successful-sample count and confidence range.", "Provider citations stay separate from URLs found only in generated prose.", "A provider outage produces a partial or failed result—not synthetic data.", "An action is an investigation; only a compatible follow-up can show observed change."],
        tierRecommendation: { tierName: "Command", rationale: "Command is intended for teams that need shared Actions and follow-up receipts. Start with a free answer or Radar if recurring measurement is the immediate job." },
        ctaCopy: "Read what an assistant tells your next buyer.",
    }} />;
}
