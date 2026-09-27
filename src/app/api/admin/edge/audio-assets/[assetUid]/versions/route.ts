import { endpoints } from '@/lib/api/endpoints';
import { forwardEdgeAudioMultipart } from '@/features/admin/edge/api/bff-audio';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ assetUid: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { assetUid } = await ctx.params;
  return forwardEdgeAudioMultipart(
    request,
    endpoints.admin.edgeAudioAssetVersions(assetUid),
  );
}
