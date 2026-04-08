import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
    firstName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aelonexus.com";

export const WelcomeEmail = ({ firstName = "there" }: WelcomeEmailProps) => {
    const previewText = `Welcome to Aelo! Track your brand in the AI era.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto py-10 px-4 max-w-[600px]">
                        <Section className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
                            <Img
                                src={`${baseUrl}/logo.png`}
                                width="40"
                                height="40"
                                alt="Aelo"
                                className="mx-auto mb-6"
                            />

                            <Heading className="text-2xl font-bold text-center text-zinc-900 mb-6">
                                Welcome to Aelo 🚀
                            </Heading>

                            <Text className="text-base text-[var(--text-ghost)] mb-4">
                                Hi {firstName},
                            </Text>

                            <Text className="text-base text-[var(--text-ghost)] mb-6 leading-relaxed">
                                We're thrilled to have you! Aelo helps you track, analyze, and optimize your brand's visibility across modern AI models like ChatGPT, Gemini, Claude, and Perplexity.
                            </Text>

                            <Text className="text-base text-[var(--text-ghost)] mb-8 leading-relaxed">
                                With the rise of Answer Engine Optimization (Aelo), being the #1 cited brand is more important than ever. Ready to see how AI sees you?
                            </Text>

                            <Section className="text-center mb-8">
                                <Button
                                    className="bg-indigo-500 hover:bg-violet-700 text-white font-medium py-3 px-6 rounded-lg text-center mx-auto block w-fit"
                                    href={`${baseUrl}/dashboard`}
                                >
                                    Go to Dashboard
                                </Button>
                            </Section>

                            <Hr className="border-t border-zinc-200 my-6" />

                            <Text className="text-sm text-[var(--text-ghost)] mb-4 leading-relaxed">
                                Need help getting started? Check out our <Link href={`${baseUrl}/help`} className="text-violet-600 underline">docs</Link> or just reply to this email!
                            </Text>

                            <Text className="text-sm text-[var(--text-secondary)]">
                                — The Aelo Team
                            </Text>

                        </Section>

                        <Text className="text-xs text-center text-[var(--text-secondary)] mt-8">
                            © {new Date().getFullYear()} Aelo. All rights reserved.<br />
                            You are receiving this email because you signed up for an Aelo account.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeEmail;
