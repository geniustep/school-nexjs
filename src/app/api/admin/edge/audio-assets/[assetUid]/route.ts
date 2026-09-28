import { endpoints } from '@/lib/api/endpoints';
import { serverPatch } from '@/lib/api/server';
import { edgeApiResponse, requireEdgeAdminBffContext } from '@/features/admin/edge/api/bff';
import type { EdgeAudioAssetMutationData } from '@/features/admin/edge/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ assetUid: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const context = await requireEdgeAdminBffContext();
  if (!context.ok) return context.response;

  const { assetUid } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: { code: 'validation_error', message: 'Invalid request body.', details: {} },
        meta: {},
      },
      { status: 422 },
    );
  }

  const result = await serverPatch<EdgeAudioAssetMutationData>(
    endpoints.admin.edgeAudioAsset(assetUid),
    body,
  );
  return edgeApiResponse(result);
}
