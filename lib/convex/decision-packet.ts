import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import { buildDecisionPacket } from '@/lib/measurement/decision-packet';
import { readMeasurement } from './measurement-server';
export async function loadDecisionPacket(workspaceId: string, packetId?: string) {
  const record = await fetchAuthQuery(api.activation.get, { workspaceId, ...(packetId ? { packetId } : {}) });
  if (!record) return { packet: null, pending: false };
  if (record.legacyPacket) return { packet: record.legacyPacket, pending: false };
  if (record.pending) return { packet: null, pending: true, packetId: record.id };
  const runs = await Promise.all(record.runIds.map(runId => readMeasurement(workspaceId, runId)));
  const packet = buildDecisionPacket({ id: record.id, workspaceId, brandName: record.brandName,
    measurements: runs.flatMap(run => run.result ? [run.result] : []) });
  packet.createdAt = record.createdAt;
  return { packet, pending: false };
}
