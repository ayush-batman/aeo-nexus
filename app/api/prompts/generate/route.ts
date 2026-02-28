
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/data-access";
import { generatePrompts } from "@/lib/ai/llm-scanner";

export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { topic, brand } = body;

        if (!topic || !brand) {
            return NextResponse.json({ error: 'Topic and Brand are required' }, { status: 400 });
        }

        const prompts = await generatePrompts(topic, brand);
        return NextResponse.json(prompts);
    } catch (error) {
        console.error('Error generating prompts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
