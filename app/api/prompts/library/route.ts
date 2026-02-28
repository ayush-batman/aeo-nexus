
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId, getPrompts, savePrompt } from "@/lib/data-access";

export async function GET(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prompts = await getPrompts(workspaceId);
        return NextResponse.json(prompts);
    } catch (error) {
        console.error('Error fetching prompts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, category, is_favorite, ai_generated } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const savedPrompt = await savePrompt({
            workspace_id: workspaceId,
            prompt,
            category,
            is_favorite,
            ai_generated
        });

        if (!savedPrompt) {
            return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
        }

        return NextResponse.json(savedPrompt);
    } catch (error) {
        console.error('Error saving prompt:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
