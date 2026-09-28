import 'server-only';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api/server';
import { canManageEdgeSettings } from '@/features/admin/edge/permissions/edge-settings';
import type { ApiResponse } from '@/types/api';

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message, details: {} }, meta: {} },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function requireEdgeAdminBffContext() {
  const user = await getCurrentUser();
  if (!user || !canManageEdgeSettings(user)) {
    return { ok: false as const, response: jsonError('forbidden', 'Forbidden', 403) };
  }
  if (!user.active_school_id) {
    return {
      ok: false as const,
      response: jsonError('no_active_school', 'No active school selected.', 400),
    };
  }
  return { ok: true as const, user };
}

export function edgeApiResponse<T>(result: ApiResponse<T>) {
  if (result.success) {
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const code = result.error.code;
  const status =
    code === 'unauthenticated'
      ? 401
      : code === 'forbidden' || code === 'permission_denied'
        ? 403
        : code === 'not_found'
          ? 404
          : code === 'validation_error'
            ? 422
            : 502;

  if (status >= 500) {
    return jsonError('edge_unavailable', 'Raqeem Edge settings are temporarily unavailable.', status);
  }

  return NextResponse.json(result, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
