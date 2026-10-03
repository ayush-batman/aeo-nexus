
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId, getPrompts, savePrompt } from "@/lib/data-access";
import { convexRouteError } from '@/lib/convex/http';

export async function GET() {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prompts = await getPrompts(workspaceId);
        return NextResponse.json(prompts);
    } catch (error) {
        return convexRouteError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        if (!body || typeof body.prompt !== 'string' ||
            (body.category !== undefined && typeof body.category !== 'string') ||
            (body.is_favorite !== undefined && typeof body.is_favorite !== 'boolean') ||
            (body.ai_generated !== undefined && typeof body.ai_generated !== 'boolean')) {
            return NextResponse.json({ error: 'Check the prompt and category.' }, { status: 400 });
        }
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
        return convexRouteError(error);
    }
}
