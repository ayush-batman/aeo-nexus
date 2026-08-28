import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';

// DELETE /api/keys/:id  — revoke a key (soft delete). Scoped to the caller's
// workspace so you can only revoke your own keys.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .is('revoked_at', null);

  if (error) return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
  return NextResponse.json({ revoked: true });
}
