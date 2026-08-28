import { withKey, getWorkspaceBrand } from '@/lib/api-v1';
import { checkCrawlerAccess, getAiReferralTraffic } from '@/lib/crawlers';

// GET /api/v1/crawlers  — can AI crawlers reach the site (robots.txt) plus
// AI referral traffic by engine. (get_crawler_access)
export async function GET(request: Request) {
  return withKey(request, 'read', async (ctx, admin) => {
    const brand = await getWorkspaceBrand(admin, ctx.workspaceId);
    const [access, traffic] = await Promise.all([
      checkCrawlerAccess(brand.website),
      getAiReferralTraffic(ctx.workspaceId, 30),
    ]);
    return { website: brand.website, access, traffic };
  });
}
