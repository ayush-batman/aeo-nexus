import { LegalPage } from "@/components/marketing/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy · Aelo",
};

export default function PrivacyPage() {
    return (
        <LegalPage
            kind="Privacy Policy"
            lastUpdated="2026-09-11"
            intro="This policy describes what Aelo collects, why, how we store it, and the controls you have. It is written to be readable, not compliant-for-compliant's-sake."
            sections={[
                {
                    title: "What we collect",
                    body: [
                        "Account data, name, email, hashed password, workspace and organization structure.",
                        "Product data, target prompts, brand names, competitor names, scan history, interventions.",
                        "Usage data, page views and product events, used to improve the product.",
                        "Billing data, handled by Razorpay (India) or Stripe (global). We store customer IDs, not full card numbers.",
                    ],
                },
                {
                    title: "Why we collect it",
                    body: [
                        "To operate the product (scans, alerts, dashboards).",
                        "To send transactional messages (weekly digests, receipt emails, security notices).",
                        "To detect abuse, prevent overage, and enforce plan limits.",
                        "To measure how the product is used, so we can improve it.",
                    ],
                },
                {
                    title: "Who we share it with",
                    body: "Only sub-processors needed to operate Aelo. Today: Convex (database, authentication, and file storage), Vercel (hosting and scheduled triggers), Google Gemini / OpenAI / Anthropic / Perplexity (scan providers), Resend (email delivery), and Razorpay + Stripe (billing). We do not sell customer data or share it with advertisers.",
                },
                {
                    title: "How we store it",
                    body: "Product data is stored in Convex. Aelo checks the signed-in organization and workspace on protected server reads and writes; API keys are also bound to a workspace and explicit scopes. Authentication credentials are handled by the Better Auth service running with Convex rather than stored as readable passwords by Aelo.",
                },
                {
                    title: "Your controls",
                    body: [
                        "Export, one-click JSON export of every row we hold on your workspace.",
                        "Delete, delete your account and every associated row on request.",
                        "Object, request that we stop using your data for a specific purpose.",
                        "Audit, every metric on the dashboard is auditable to the raw scan.",
                    ],
                },
                {
                    title: "Retention",
                    body: "We keep account and product data for as long as your account is active, plus 30 days after cancellation for backup restoration windows. After that, we hard-delete.",
                },
                {
                    title: "Changes",
                    body: "If we make material changes, we email every account at least 14 days before they take effect.",
                },
            ]}
        />
    );
}
