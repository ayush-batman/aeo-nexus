import { fetchQuery } from 'convex/nextjs';
import { api } from '../../convex/_generated/api';
export async function readPublicScan(id: string) {
  return fetchQuery(api.publicScans.get, { id });
}
