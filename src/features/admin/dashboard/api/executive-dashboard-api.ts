'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeExecutiveDashboard } from '@/lib/admin/executive-dashboard-contract';
import type { ApiResponse, ListParams } from '@/types/api';
import type { AdminExecutiveDashboard } from '@/types/executive-dashboard';

export async function getAdminExecutiveDashboard(
  query?: ListParams,
): Promise<ApiResponse<AdminExecutiveDashboard>> {
  const res = await api.get<unknown>(endpoints.admin.executiveDashboard, query);
  if (res.success) {
    return { ...res, data: normalizeExecutiveDashboard(res.data) };
  }
  return res as ApiResponse<AdminExecutiveDashboard>;
}
