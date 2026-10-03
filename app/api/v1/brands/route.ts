import { withKey } from '@/lib/api-v1';
export async function GET(request: Request) {
  return withKey(request, 'read', async (_context, reader) => {
    const workspace = await reader.workspace();
    return { brands: [{ id: workspace.id, name: workspace.name,
      website: workspace.settings?.website ?? null, industry: workspace.settings?.industry ?? null }] };
  });
}
