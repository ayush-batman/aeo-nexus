import { NextResponse } from 'next/server';
import { resolveApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/v1/brands  — the workspace(s) this API key can see.
// Backs the `list_brands` MCP tool.
export async function GET(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workspaces')
    .select('id, name, settings')
    .eq('id', ctx.workspaceId);

  if (error) {
    return NextResponse.json({ error: 'Failed to load brands' }, { status: 500 });
  }

  const brands = (data || []).map((w) => {
    const settings = (w.settings || {}) as Record<string, unknown>;
    return {
      id: w.id,
      name: w.name,
      website: settings.website ?? null,
      industry: settings.industry ?? null,
    };
  });

  return NextResponse.json({ brands });
}
