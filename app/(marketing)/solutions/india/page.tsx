import type { Metadata } from "next";
import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata: Metadata = { title: "For India-first brands · Aelo", description: "Measure AI answers for Indian buyer questions with rupee pricing and inspectable evidence." };

export default function IndiaSolution() {
    return <SolutionPage content={{
        persona: "India-first brands",
        headline: "Measure the buyer questions that make sense in your market.",
        subheadline: "Aelo supports rupee pricing and lets teams define prompts around Indian categories, price points, cities and competitor sets without pretending region does not matter.",
        problem: { title: "Global category prompts can miss local buying context.", body: "A question about software for an Indian startup, a product under a rupee price point, or support for UPI creates a different shortlist. The prompt and measurement region need to remain visible so the result can be interpreted honestly." },
        capabilities: [
            { title: "Write local buyer prompts", body: "Define the city, price band, payment need or competitor set that belongs in the actual question." },
            { title: "Record measurement context", body: "Keep engine, provider model, region and search mode beside the result." },
            { title: "Inspect Indian source trails", body: "See the provider-backed domains returned for the chosen category without guessing which sites matter." },
            { title: "Pay in rupees", body: "Configured Indian checkout uses Razorpay; global checkout can use Stripe where available." },
        ],
        proofPoints: ["Region and mode travel with each compatible measurement cohort.", "Local and global competitors can be tracked in the same workspace-defined prompt.", "The India Index reports its own evidence and limits when data is available.", "Aelo never fills a missing provider result with a simulated answer."],
        tierRecommendation: { tierName: "Command", rationale: "Command is intended for teams that need shared investigations and follow-up receipts. Use the free answer to inspect the evidence shape first." },
        ctaCopy: "Ask the question your market actually asks.",
    }} />;
}
