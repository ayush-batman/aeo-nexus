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
import type { DriftAlert } from "@/lib/analytics/sentiment-drift";

interface Props { alert: DriftAlert; }

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aelo.sh";

export const SentimentDriftEmail = ({ alert }: Props) => {
    const dir = alert.direction === 'up' ? 'rose' : 'dropped';
    const dirWord = alert.direction === 'up' ? 'improved' : 'worsened';
    const platformLabel = ({
        chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude',
        perplexity: 'Perplexity', google_ai_overview: 'Google AI Overview',
    } as Record<string, string>)[alert.platform] ?? alert.platform;

    return (
        <Html>
            <Head />
            <Preview>Sentiment {dir} {Math.abs(alert.delta).toFixed(2)} on {platformLabel}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto py-10 px-4 max-w-[600px]">
                        <Section className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
                            <Text className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
                                Sentiment drift · {alert.workspace_name}
                            </Text>
                            <Heading className="text-2xl font-medium text-zinc-900 mb-4 tracking-tight leading-tight">
                                {platformLabel} sentiment {dir} {Math.abs(alert.delta).toFixed(2)} this week
                            </Heading>

                            <Text className="text-base text-zinc-700 mb-3 leading-relaxed">
                                On the prompt <span className="font-medium text-zinc-900">&ldquo;{alert.prompt}&rdquo;</span>,
                                your sentiment {dirWord} from <span className="font-medium">{alert.prior.toFixed(2)}</span> to{' '}
                                <span className="font-medium">{alert.current.toFixed(2)}</span>{' '}
                                across {alert.sample_size} scans.
                            </Text>

                            <Section className="my-6 p-4 rounded-lg border border-zinc-200 bg-zinc-50">
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr>
                                            <td className="text-zinc-500 py-1">Last week</td>
                                            <td className="text-zinc-900 font-medium py-1 text-right">{alert.prior.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-zinc-500 py-1">This week</td>
                                            <td className="text-zinc-900 font-medium py-1 text-right">{alert.current.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-zinc-500 py-1">Change</td>
                                            <td
                                                className="font-medium py-1 text-right"
                                                style={{ color: alert.direction === 'up' ? 'var(--data-green)' : 'var(--data-red)' }}
                                            >
                                                {alert.direction === 'up' ? '+' : ''}{alert.delta.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </Section>

                            <Section className="text-center mb-4">
                                <Button
                                    className="bg-[var(--accent-base)] text-white font-medium py-3 px-6 rounded-lg text-center mx-auto block w-fit"
                                    href={`${baseUrl}/dashboard/drift`}
                                >
                                    See the receipts
                                </Button>
                            </Section>

                            <Hr className="border-t border-zinc-200 my-6" />

                            <Text className="text-sm text-zinc-500 leading-relaxed">
                                Sentiment shifts of 0.30 or more trigger this alert. To adjust or mute,
                                open Settings → Alerts.
                            </Text>
                        </Section>
                        <Text className="text-xs text-center text-zinc-500 mt-8">
                            © {new Date().getFullYear()} Aelo · the honest measurement layer for AI answer visibility
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default SentimentDriftEmail;
