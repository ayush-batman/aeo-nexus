import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { requireWorkspaceRole } from '@/lib/authorization';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { buildDecisionPacket, DECISION_PACKET_VERSION } from '@/lib/measurement/decision-packet';
import { scanResultPersistenceRow } from '@/lib/measurement/persistence';
import { runVisibilityMeasurement } from '@/lib/measurement/service';
import type { VisibilityMeasurementRun } from '@/lib/measurement/types';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 300;

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('decision_packets')
    .select('packet, created_at')
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[decision-packet] load failed:', error);
    return NextResponse.json({ error: 'Failed to load the saved decision packet' }, { status: 500 });
  }
  return NextResponse.json({ packet: data?.packet ?? null });
}

export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requireWorkspaceRole(context, ['owner', 'admin', 'editor'])) {
    return NextResponse.json({ error: 'Viewer role cannot run measurements' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const prompts = Array.isArray(body?.prompts)
    ? [...new Set(body.prompts
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim())
      .filter(Boolean))]
    : [];
  if (prompts.length < 3 || prompts.length > 5 || prompts.some(prompt => prompt.length > 500)) {
    return NextResponse.json({ error: 'Choose 3 to 5 unique prompts, each 500 characters or fewer' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .select('name, settings')
    .eq('id', context.workspaceId)
    .eq('org_id', context.orgId)
    .single();
  if (workspaceError || !workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const entitlements = await getEntitlements(context.orgId, admin);
  const platforms = getAvailablePlatforms()
    .filter(engine => engine.available && engine.platform !== 'mock' && entitlements.engines.includes(engine.platform))
    .map(engine => engine.platform) as LLMPlatform[];
  if (platforms.length === 0) {
    return NextResponse.json({ error: 'No entitled AI engines are currently configured' }, { status: 503 });
  }

  const reservation = await reserveScanQuota(context.orgId, `activation:${context.workspaceId}:${randomUUID()}`, admin);
  if (reservation === 'denied') {
    return NextResponse.json({ error: 'Weekly scan quota exceeded' }, { status: 429 });
  }

  const settings = (workspace.settings ?? {}) as Record<string, unknown>;
  const competitors = Array.isArray(settings.competitors)
    ? settings.competitors.filter((value): value is string => typeof value === 'string')
    : [];
  const brandDomain = typeof settings.website === 'string' ? settings.website : undefined;
  const measurements: VisibilityMeasurementRun[] = [];
  for (const prompt of prompts) {
    measurements.push(await runVisibilityMeasurement({
      prompt,
      brandName: workspace.name || 'My Brand',
      brandDomain,
      competitors,
      platforms,
      samples: 4,
    }, {
      persist: async (results) => {
        const { error } = await admin.from('llm_scans').insert(
          results.map(result => scanResultPersistenceRow(context.workspaceId, result)),
        );
        if (error) throw new Error('Failed to store activation measurement samples.');
      },
    }));
  }

  const packetId = randomUUID();
  const packet = buildDecisionPacket({
    id: packetId,
    workspaceId: context.workspaceId,
    brandName: workspace.name || 'My Brand',
    measurements,
  });

  const [{ error: packetError }, { data: existingPrompts }] = await Promise.all([
    admin.from('decision_packets').insert({
      id: packetId,
      workspace_id: context.workspaceId,
      contract_version: DECISION_PACKET_VERSION,
      status: packet.status,
      prompts,
      packet,
      created_by: context.userId,
    }),
    admin.from('prompt_library').select('prompt').eq('workspace_id', context.workspaceId).in('prompt', prompts),
  ]);
  if (packetError) {
    console.error('[decision-packet] save failed:', packetError);
    return NextResponse.json({ error: 'Measurements finished, but the decision packet could not be saved' }, { status: 500 });
  }

  const existing = new Set((existingPrompts ?? []).map(row => row.prompt));
  const missing = prompts.filter(prompt => !existing.has(prompt));
  if (missing.length > 0) {
    const { error } = await admin.from('prompt_library').insert(missing.map(prompt => ({
      workspace_id: context.workspaceId,
      prompt,
      category: 'Onboarding',
      ai_generated: false,
      metadata: { decision_packet_id: packetId },
    })));
    if (error) console.error('[decision-packet] prompt library save failed:', error);
  }

  return NextResponse.json({ packet });
}
