
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId, deletePrompt } from "@/lib/data-access";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const success = await deletePrompt(id);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting prompt:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
