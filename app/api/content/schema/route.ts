import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const { schemaType, brandName, description, targetKeyword } = await req.json();

        if (!schemaType || !brandName) {
            return NextResponse.json(
                { error: 'Schema type and brand name are required' },
                { status: 400 }
            );
        }

        const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        if (!geminiKey && !anthropicKey) {
            return NextResponse.json(
                { error: 'No AI provider API keys configured' },
                { status: 500 }
            );
        }

        const prompt = `You are an expert SEO and structured data specialist. Your task is to generate valid, accurate JSON-LD schema markup.
Do NOT return markdown formatting like \`\`\`json. Return ONLY the raw, minified JSON object starting with { and ending with }.

Schema Type: ${schemaType}
Brand Name: ${brandName}
Description/Context: ${description || 'N/A'}
Target Keyword: ${targetKeyword || 'N/A'}

Instructions based on Schema Type:
- FAQ: Provide a detailed FAQPage schema with at least 3 relevant questions and answers about the brand or product.
- Product: Provide Product schema including brand, description, and dummy but realistic "offers" (price set to a realistic default like 99, currency USD).
- HowTo: Provide HowTo schema detailing a step-by-step process relevant to the brand/product.
- Article: Provide Article schema with headline, author, publisher (the brand), and datePublished (today).
- LocalBusiness: Provide LocalBusiness schema with the brand name, a realistic dummy address, and generic opening hours.

Use the provided description and keyword to make the schema as realistic and tailored as possible. Remember: Return ONLY plain JSON.`;

        // Try Gemini First
        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                // Schema generation is a great fit for flash
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

                const result = await model.generateContent(prompt);
                let text = result.response.text();

                // Clean markdown if AI ignored instruction
                text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

                let json;
                try {
                    json = JSON.parse(text);
                } catch (e) {
                    console.error("Gemini returned invalid JSON:", text);
                    throw new Error("Invalid JSON returned from Gemini");
                }

                return NextResponse.json({ schema: json });
            } catch (error) {
                console.warn('Gemini schema generation failed, falling back to Claude:', error);
            }
        }

        // Fallback to Claude
        if (anthropicKey) {
            try {
                const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': anthropicKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 1500,
                        messages: [{ role: 'user', content: prompt }],
                    }),
                });

                if (claudeRes.ok) {
                    const data = await claudeRes.json();
                    let text = data.content?.[0]?.text;
                    if (text) {
                        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                        try {
                            const json = JSON.parse(text);
                            return NextResponse.json({ schema: json });
                        } catch (e) {
                            console.error("Claude returned invalid JSON:", text);
                        }
                    }
                }
            } catch (error) {
                console.error('Claude fallback failed:', error);
            }
        }

        throw new Error('Failed to generate schema with available AI providers');

    } catch (error) {
        console.error('Schema Generator error:', error);
        return NextResponse.json(
            { error: 'Failed to generate schema' },
            { status: 500 }
        );
    }
}
