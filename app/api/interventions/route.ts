import { NextRequest, NextResponse } from 'next/server';
import { actionFromInsight, normalizeActionInput } from '@/lib/actions';
import { requireWorkspaceRole } from '@/lib/authorization';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { generateInsights } from '@/lib/insights';
import { snapshotVisibility } from '@/lib/interventions';
import { createAdminClient } from '@/lib/supabase/admin';

const ACTION_TYPES = [
  'forum_reply', 'content_publish', 'content_update', 'schema_add',
  'backlink_earned', 'llms_txt_update', 'other',
] as const;

function actionType(value: unknown): (typeof ACTION_TYPES)[number] {
  if (ACTION_TYPES.includes(value as (typeof ACTION_TYPES)[number])) return value as (typeof ACTION_TYPES)[number];
  throw new Error('Action type is invalid.');
}

async function ownerBelongsToOrg(ownerId: string | null, orgId: string) {
  if (!ownerId) return true;
  const db = createAdminClient();
  const { data } = await db.from('users').select('id').eq('id', ownerId).eq('org_id', orgId).maybeSingle();
  return Boolean(data);
}

// The durable Actions queue plus generated suggestions, history, and teammates.
export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();
  const [{ data, error }, insights, membersResult] = await Promise.all([
    db.from('interventions').select('*').eq('workspace_id', context.workspaceId).order('created_at', { ascending: false }),
    generateInsights(context.workspaceId),
    db.from('users').select('id, full_name, email').eq('org_id', context.orgId).order('full_name'),
  ]);
  if (error) {
    console.error('[actions/list] db error:', error);
    return NextResponse.json({ error: 'Failed to load actions.' }, { status: 500 });
  }

  const actions = data ?? [];
  const actionIds = actions.map(item => item.id);
  const eventsResult = actionIds.length
    ? await db.from('action_events').select('*').eq('workspace_id', context.workspaceId).in('action_id', actionIds).order('created_at', { ascending: false })
    : { data: [], error: null };
  if (eventsResult.error) {
    console.error('[actions/list-events] db error:', eventsResult.error);
    return NextResponse.json({ error: 'Failed to load action history.' }, { status: 500 });
  }

  const persistedInsightKeys = new Set(actions.map(item => item.insight_key).filter(Boolean));
  return NextResponse.json({
    interventions: actions,
    suggestions: insights.filter(insight => !persistedInsightKeys.has(`insight:${insight.id}`)),
    events: eventsResult.data ?? [],
    members: membersResult.data ?? [],
    currentUserId: context.userId,
    canEdit: requireWorkspaceRole(context, ['owner', 'admin', 'editor']),
  });
}

// Promote one generated insight exactly once, or create a manual action.
export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requireWorkspaceRole(context, ['owner', 'admin', 'editor'])) {
    return NextResponse.json({ error: 'Editor access required.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  let raw: Record<string, unknown>;
  let type: (typeof ACTION_TYPES)[number];
  if (typeof body.insight_id === 'string') {
    const insight = (await generateInsights(context.workspaceId)).find(item => item.id === body.insight_id);
    if (!insight) return NextResponse.json({ error: 'Suggestion is stale or unavailable.' }, { status: 409 });
    raw = { ...actionFromInsight(insight), owner_id: context.userId };
    type = insight.category === 'audit' ? 'schema_add' : 'content_update';
  } else {
    raw = {
      ...body,
      // Preserve the previous POST contract while storing a hypothesis.
      hypothesis: body.hypothesis ?? body.description ?? body.title,
      owner_id: body.owner_id ?? context.userId,
    };
    try { type = actionType(body.action_type); } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid action.' }, { status: 400 });
    }
  }

  let input: ReturnType<typeof normalizeActionInput>;
  try { input = normalizeActionInput(raw); } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid action.' }, { status: 400 });
  }
  if (!(await ownerBelongsToOrg(input.owner_id, context.orgId))) {
    return NextResponse.json({ error: 'Owner must belong to this organization.' }, { status: 400 });
  }

  const db = createAdminClient();
  const baselineSnapshot = input.target_prompts.length
    ? await snapshotVisibility(db, context.workspaceId, input.target_prompts)
    : {};
  const insert = {
    workspace_id: context.workspaceId,
    action_type: type,
    ...input,
    action_taken_at: input.status === 'completed' ? new Date().toISOString() : null,
    baseline_snapshot: baselineSnapshot,
  };

  let { data, error } = await db.from('interventions').insert(insert).select().single();
  if (error?.code === '23505' && input.insight_key) {
    const existing = await db.from('interventions').select('*')
      .eq('workspace_id', context.workspaceId).eq('insight_key', input.insight_key).single();
    data = existing.data;
    error = existing.error;
  }
  if (error || !data) {
    console.error('[actions/create] db error:', error);
    return NextResponse.json({ error: 'Failed to save action.' }, { status: 500 });
  }

  const { error: eventError } = await db.from('action_events').upsert({
    action_id: data.id,
    workspace_id: context.workspaceId,
    actor_id: context.userId,
    event_type: 'created',
    to_status: data.status,
    changes: { owner_id: data.owner_id, priority: data.priority, insight_key: data.insight_key },
    idempotency_key: `created:${data.id}`,
  }, { onConflict: 'action_id,idempotency_key', ignoreDuplicates: true });
  if (eventError) {
    console.error('[actions/create-event] db error:', eventError);
    return NextResponse.json({ error: 'Action saved, but its audit event failed. Retry safely.' }, { status: 500 });
  }

  return NextResponse.json({ intervention: data }, { status: 201 });
}
