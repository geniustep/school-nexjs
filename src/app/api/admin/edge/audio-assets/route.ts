import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/server';
import { edgeApiResponse, requireEdgeAdminBffContext } from '@/features/admin/edge/api/bff';
import type { EdgeAudioAssetsData } from '@/features/admin/edge/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const context = await requireEdgeAdminBffContext();
  if (!context.ok) return context.response;
  const result = await serverGet<EdgeAudioAssetsData>(endpoints.admin.edgeAudioAssets);
  return edgeApiResponse(result);
}
