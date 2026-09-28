import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverPut } from '@/lib/api/server';
import { edgeApiResponse, requireEdgeAdminBffContext } from '@/features/admin/edge/api/bff';
import type { EdgeBellScheduleData, EdgeBellSchedulePutInput } from '@/features/admin/edge/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const context = await requireEdgeAdminBffContext();
  if (!context.ok) return context.response;
  const result = await serverGet<EdgeBellScheduleData>(endpoints.admin.edgeBellSchedule);
  return edgeApiResponse(result);
}

export async function PUT(request: Request) {
  const context = await requireEdgeAdminBffContext();
  if (!context.ok) return context.response;

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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json(
      {
        success: false,
        error: { code: 'validation_error', message: 'Invalid request body.', details: {} },
        meta: {},
      },
      { status: 422 },
    );
  }

  const result = await serverPut<EdgeBellScheduleData>(
    endpoints.admin.edgeBellSchedule,
    body as EdgeBellSchedulePutInput,
  );
  return edgeApiResponse(result);
}
