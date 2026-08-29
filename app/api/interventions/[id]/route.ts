import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { canTransitionAction, normalizeActionInput, type ActionStatus } from '@/lib/actions';
import { requireWorkspaceRole } from '@/lib/authorization';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { snapshotVisibility } from '@/lib/interventions';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requireWorkspaceRole(context, ['owner', 'admin', 'editor'])) {
    return NextResponse.json({ error: 'Editor access required.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { id } = await params;
  const db = createAdminClient();
  const { data: existing, error: loadError } = await db.from('interventions').select('*')
    .eq('id', id).eq('workspace_id', context.workspaceId).single();
  if (loadError || !existing) return NextResponse.json({ error: 'Action not found.' }, { status: 404 });

  const nextStatus = (body.status ?? existing.status) as ActionStatus;
  if (!canTransitionAction(existing.status as ActionStatus, nextStatus) || nextStatus === 'measured') {
    return NextResponse.json({ error: 'That state change is not allowed.' }, { status: 409 });
  }

  let input: ReturnType<typeof normalizeActionInput>;
  try {
    input = normalizeActionInput({
      title: body.title ?? existing.title,
      hypothesis: body.hypothesis ?? existing.hypothesis ?? existing.description ?? existing.title,
      description: body.description ?? existing.description,
      source_url: body.source_url ?? existing.source_url,
      action_url: body.action_url ?? existing.action_url,
      owner_id: body.owner_id === null ? null : (body.owner_id ?? existing.owner_id),
      priority: body.priority ?? existing.priority,
      status: nextStatus,
      target_prompts: body.target_prompts ?? existing.target_prompts,
      target_engines: body.target_engines ?? existing.target_engines,
      insight_key: existing.insight_key,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid action.' }, { status: 400 });
  }

  if (input.owner_id) {
    const { data: owner } = await db.from('users').select('id').eq('id', input.owner_id).eq('org_id', context.orgId).maybeSingle();
    if (!owner) return NextResponse.json({ error: 'Owner must belong to this organization.' }, { status: 400 });
  }

  const statusChanged = existing.status !== input.status;
  const completing = input.status === 'completed' && existing.status !== 'completed';
  const baselineSnapshot = completing && input.target_prompts.length
    ? await snapshotVisibility(db, context.workspaceId, input.target_prompts)
    : existing.baseline_snapshot;
  const changes = {
    title: input.title,
    hypothesis: input.hypothesis,
    description: input.description,
    source_url: input.source_url,
    action_url: input.action_url,
    owner_id: input.owner_id,
    priority: input.priority,
    status: input.status,
    target_prompts: input.target_prompts,
    target_engines: input.target_engines,
    baseline_snapshot: baselineSnapshot,
    action_taken_at: completing ? new Date().toISOString() : existing.action_taken_at,
  };

  const idempotencyKey = request.headers.get('idempotency-key')?.slice(0, 180) || randomUUID();
  const { data, error: updateError } = await db.rpc('update_action_with_event', {
    p_workspace_id: context.workspaceId,
    p_action_id: id,
    p_actor_id: context.userId,
    p_changes: changes,
    p_event_type: statusChanged ? 'status_changed' : 'updated',
    p_from_status: existing.status,
    p_to_status: input.status,
    p_idempotency_key: idempotencyKey,
  });
  const result = data as { status?: 'updated' | 'duplicate' | 'not_found'; action?: Record<string, unknown> } | null;
  if (updateError || !result?.action) {
    console.error('[actions/update] db error:', updateError);
    return NextResponse.json(
      { error: result?.status === 'not_found' ? 'Action not found.' : 'Failed to update action.' },
      { status: result?.status === 'not_found' ? 404 : 500 },
    );
  }

  return NextResponse.json({ intervention: result.action });
}
