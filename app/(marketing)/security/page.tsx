import { LegalPage } from "@/components/marketing/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Security · Aelo",
};

export default function SecurityPage() {
    return (
        <LegalPage
            kind="Security"
            lastUpdated="2026-07-04"
            intro="Aelo handles brand data. Here is what we do to keep it safe, described in operational terms rather than certification labels."
            sections={[
                {
                    title: "Data at rest",
                    body: "All customer data is stored in Supabase Postgres with database-level encryption. Backups are encrypted with rotating keys.",
                },
                {
                    title: "Data in transit",
                    body: "TLS 1.2+ everywhere. HSTS enforced on all origins. No plain-HTTP endpoints, in production or preview.",
                },
                {
                    title: "Row-Level Security",
                    body: "Every product table in Postgres has RLS policies scoped by organization. Users can only see rows in workspaces belonging to their organization, enforced at the database, not just the API.",
                },
                {
                    title: "Auth",
                    body: [
                        "Supabase Auth with bcrypt-hashed passwords.",
                        "OAuth via Google available.",
                        "Sessions rotate on every login; JWTs are short-lived.",
                        "Reset flows require email confirmation.",
                    ],
                },
                {
                    title: "Sub-processor list",
                    body: "Supabase (Postgres, Auth, Storage) · Vercel (hosting, Cron) · Google (Gemini scans) · OpenAI, Anthropic, Perplexity (scans) · Resend (email) · Razorpay + Stripe (billing). We only send the minimum required data to each. Prompts sent to LLM providers do not include PII.",
                },
                {
                    title: "Vulnerability disclosure",
                    body: "Found something? Email security@aelohq.com. We reply within 48 hours and credit you on our security page if you want.",
                },
                {
                    title: "Compliance",
                    body: "GDPR-aligned data handling. DPA available on request. Formal SOC 2 in progress. Concierge tier customers get a full security review.",
                },
            ]}
        />
    );
}
