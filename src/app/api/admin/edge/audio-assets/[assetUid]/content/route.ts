import { endpoints } from '@/lib/api/endpoints';
import { forwardEdgeAudioBinary } from '@/features/admin/edge/api/bff-audio';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ assetUid: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { assetUid } = await ctx.params;
  return forwardEdgeAudioBinary(
    endpoints.admin.edgeAudioAssetContent(assetUid),
  );
}
