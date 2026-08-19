import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";
import type { Report } from "@/lib/analytics/report";

interface Props {
    report: Report;
    paid: boolean;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aelohq.com";

const PLATFORM_LABEL: Record<string, string> = {
    chatgpt: "ChatGPT", gemini: "Gemini", claude: "Claude",
    perplexity: "Perplexity", google_ai_overview: "Google AI Overview",
};

export const WeeklyDigestEmail = ({ report, paid }: Props) => {
    const pos = report.avgPosition == null ? "—" : `#${report.avgPosition.toFixed(1)}`;
    const previewText = report.totalScans === 0
        ? `Run your weekly AI visibility scan for ${report.brand}`
        : `${report.brand} appeared in ${report.overallMentionRate}% of AI answers this week`;
    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto py-10 px-4 max-w-[600px]">
                        <Section className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
                            <Text className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
                                Your AI visibility this week · {report.brand}
                            </Text>
                            <Heading className="text-2xl font-medium text-zinc-900 mb-4 tracking-tight leading-tight">
                                {report.totalScans === 0
                                    ? `No scans yet for ${report.brand} this week`
                                    : `${report.brand} appeared in ${report.overallMentionRate}% of AI answers`}
                            </Heading>

                            {report.totalScans === 0 ? (
                                <Text className="text-base text-zinc-700 mb-2 leading-relaxed">
                                    You haven&apos;t run a scan this week. It takes under a minute to see how AI
                                    describes {report.brand} right now.
                                </Text>
                            ) : (
                                <>
                                    <Section className="my-5 p-4 rounded-lg border border-zinc-200 bg-zinc-50">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                <tr>
                                                    <td className="text-zinc-500 py-1">Mention rate</td>
                                                    <td className="text-zinc-900 font-medium py-1 text-right">{report.overallMentionRate}%</td>
                                                </tr>
                                                <tr>
                                                    <td className="text-zinc-500 py-1">Average position</td>
                                                    <td className="text-zinc-900 font-medium py-1 text-right">{pos}</td>
                                                </tr>
                                                <tr>
                                                    <td className="text-zinc-500 py-1">Scans this week</td>
                                                    <td className="text-zinc-900 font-medium py-1 text-right">{report.totalScans}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Section>

                                    {report.engines.length > 0 && (
                                        <Section className="my-5">
                                            <Text className="text-xs uppercase tracking-widest text-zinc-500 mb-2">By engine</Text>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {report.engines.map((e) => (
                                                        <tr key={e.platform}>
                                                            <td className="text-zinc-700 py-1">{PLATFORM_LABEL[e.platform] ?? e.label}</td>
                                                            <td className="text-zinc-900 font-medium py-1 text-right">
                                                                {e.mentionRate}%{e.avgPosition != null ? ` · #${e.avgPosition.toFixed(1)}` : ""}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </Section>
                                    )}

                                    {report.competitors.length > 0 && (
                                        <Text className="text-sm text-zinc-600 leading-relaxed">
                                            Also named alongside you: {report.competitors.slice(0, 4).map(c => c.name).join(", ")}.
                                        </Text>
                                    )}
                                </>
                            )}

                            <Section className="text-center my-6">
                                <Button
                                    className="bg-[var(--accent-base)] text-white font-medium py-3 px-6 rounded-lg text-center mx-auto block w-fit"
                                    href={`${baseUrl}/dashboard`}
                                >
                                    {report.totalScans === 0 ? "Run your scan" : "Open your dashboard"}
                                </Button>
                            </Section>

                            {!paid && (
                                <>
                                    <Hr className="border-t border-zinc-200 my-6" />
                                    <Section className="p-4 rounded-lg border border-zinc-200 bg-zinc-50">
                                        <Text className="text-sm text-zinc-700 leading-relaxed m-0">
                                            You&apos;re seeing <span className="font-medium">Gemini only</span>. Upgrade to add
                                            ChatGPT, Claude and Perplexity, check whether what they say is actually true,
                                            and track how you move against competitors.
                                        </Text>
                                        <Button
                                            className="text-[var(--accent-base)] font-medium text-sm mt-3 block"
                                            href={`${baseUrl}/pricing`}
                                        >
                                            See plans →
                                        </Button>
                                    </Section>
                                </>
                            )}
                        </Section>
                        <Text className="text-xs text-center text-zinc-500 mt-8">
                            © {new Date().getFullYear()} Aelo · the honest measurement layer for AI answer visibility
                            <br />
                            Weekly digest. Manage in Settings → Alerts.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WeeklyDigestEmail;
