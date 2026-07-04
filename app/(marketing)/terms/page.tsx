import { LegalPage } from "@/components/marketing/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service · Aelo",
};

export default function TermsPage() {
    return (
        <LegalPage
            kind="Terms of Service"
            lastUpdated="2026-07-04"
            intro="These terms govern use of Aelo. They favor readability over legalese, but they are still binding. If anything is unclear, email us — we will explain."
            sections={[
                {
                    title: "Accounts",
                    body: "You are responsible for maintaining the security of your account and for all activity that happens under it. Do not share your password. Tell us within 24 hours if you suspect a compromise.",
                },
                {
                    title: "Acceptable use",
                    body: [
                        "Do not use Aelo to scan brands you do not own or have permission to represent.",
                        "Do not attempt to reverse-engineer the LLM providers we call on your behalf.",
                        "Do not use Aelo to publish content or replies that violate the terms of the target platform (Reddit, forums, etc.).",
                        "Do not use Aelo output to deceive users about product capabilities.",
                    ],
                },
                {
                    title: "Billing",
                    body: "Plans are billed monthly (or annually where offered) in advance. Cancellations take effect at the end of the current billing period; we do not pro-rate. Refunds are handled case-by-case within 7 days of a charge.",
                },
                {
                    title: "Availability",
                    body: "We aim for 99.9% uptime on the API and dashboard. Scan providers occasionally fail — when they do, we surface an honest empty state instead of fabricating data. See the manifesto.",
                },
                {
                    title: "Termination",
                    body: "We may suspend accounts that violate acceptable use, evade billing, or create sustained abuse. When we do, we tell you why and give 30 days to export your data.",
                },
                {
                    title: "Liability",
                    body: "Aelo is provided 'as is'. Our liability is limited to the amount you paid us in the 12 months preceding a claim. We are not liable for how you use the data we surface — you own the decisions you make with it.",
                },
                {
                    title: "Governing law",
                    body: "These terms are governed by the laws of India. Disputes will be resolved in the courts of Bengaluru unless we mutually agree to another venue.",
                },
            ]}
        />
    );
}
