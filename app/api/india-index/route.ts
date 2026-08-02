import { NextResponse } from 'next/server';
import { loadCurrentEdition } from '@/lib/india-index';

// Public endpoint. The India Index is a PR asset by design, no auth.
export async function GET() {
    try {
        const edition = await loadCurrentEdition();
        return NextResponse.json(edition);
    } catch (error) {
        console.error('[india-index] load failed:', error);
        return NextResponse.json({ error: 'Failed to load edition' }, { status: 500 });
    }
}
