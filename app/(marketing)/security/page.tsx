import { LegalPage } from "@/components/marketing/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Security · Aelo",
};

export default function SecurityPage() {
    return (
        <LegalPage
            kind="Security"
            lastUpdated="2026-09-11"
            intro="Aelo handles brand data. Here is what we do to keep it safe, described in operational terms rather than certification labels."
            sections={[
                {
                    title: "Data at rest",
                    body: "Customer product data is stored in Convex. Aelo does not store full payment-card details; those remain with Razorpay or Stripe.",
                },
                {
                    title: "Data in transit",
                    body: "TLS 1.2+ everywhere. HSTS enforced on all origins. No plain-HTTP endpoints, in production or preview.",
                },
                {
                    title: "Tenant isolation",
                    body: "Protected server functions resolve the signed-in user, organization, role, and workspace before reading or changing customer data. API keys are separately checked for workspace binding, scope, revocation, limits, and quotas.",
                },
                {
                    title: "Auth",
                    body: [
                        "Better Auth runs with Convex and stores authentication records separately from product workspaces.",
                        "Google sign-in is offered only when its server credentials are configured.",
                        "Protected application requests require a valid session.",
                        "Password reset requires control of the account email.",
                    ],
                },
                {
                    title: "Sub-processor list",
                    body: "Convex (database, authentication, file storage) · Vercel (hosting, scheduled triggers) · Google, OpenAI, Anthropic, and Perplexity (scans) · Resend (email) · Razorpay and Stripe (billing). Aelo sends each provider only the data needed for that operation.",
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
