import { endpoints } from '@/lib/api/endpoints';
import { serverPost } from '@/lib/api/server';
import { edgeApiResponse, requireEdgeAdminBffContext } from '@/features/admin/edge/api/bff';
import type { EdgeAudioAssetMutationData } from '@/features/admin/edge/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ libraryUid: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const context = await requireEdgeAdminBffContext();
  if (!context.ok) return context.response;

  const { libraryUid } = await ctx.params;
  const result = await serverPost<EdgeAudioAssetMutationData>(
    endpoints.admin.edgeAudioLibraryAdopt(libraryUid),
    {},
  );
  return edgeApiResponse(result);
}
