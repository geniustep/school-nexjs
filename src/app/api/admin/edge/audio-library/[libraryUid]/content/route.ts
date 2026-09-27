import { endpoints } from '@/lib/api/endpoints';
import { forwardEdgeAudioBinary } from '@/features/admin/edge/api/bff-audio';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ libraryUid: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { libraryUid } = await ctx.params;
  return forwardEdgeAudioBinary(
    endpoints.admin.edgeAudioLibraryContent(libraryUid),
  );
}
