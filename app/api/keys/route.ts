import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateApiKey } from '@/lib/api-auth';

// GET /api/keys  — list the current workspace's API keys (never the secret).
export async function GET() {
  const ctx = await getCurrentWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, created_at, revoked_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  return NextResponse.json({ keys: data || [] });
}

// POST /api/keys  — create a key. Returns the secret ONCE; only its hash is stored.
export async function POST(request: Request) {
  const ctx = await getCurrentWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : 'API key';

  const { secret, prefix, hash } = generateApiKey();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('api_keys')
    .insert({
      workspace_id: ctx.workspaceId,
      org_id: ctx.orgId,
      created_by: ctx.userId,
      name,
      key_prefix: prefix,
      key_hash: hash,
      scopes: ['read', 'measure'],
    })
    .select('id, name, key_prefix, scopes, created_at')
    .single();

  if (error) {
    console.error('[api/keys] create failed:', error);
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
  }

  // The full secret is shown exactly once; it is never retrievable again.
  return NextResponse.json({ key: data, secret });
}
