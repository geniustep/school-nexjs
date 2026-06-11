'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { StaffMember, StaffOptions } from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function useStaffList(query?: ListParams) {
  const state = useAdminResource<StaffMember[]>(endpoints.admin.staff, query);
  const reload = useCallback(() => state.reload(), [state]);
  return {
    staff: state.data ?? [],
    loading: state.loading,
    error: state.error,
    meta: state.meta,
    reload,
  };
}

export function useStaffOptions() {
  const state = useAdminResource<StaffOptions>(endpoints.admin.staffOptions);
  return {
    options: state.data,
    loading: state.loading,
    error: state.error,
    reload: state.reload,
  };
}

export function useStaffMember(id: number | null) {
  const state = useAdminResource<StaffMember>(id ? endpoints.admin.staffMember(id) : null);
  return state;
}

export async function createStaffMember(payload: Record<string, unknown>) {
  return api.post<StaffMember>(endpoints.admin.staff, payload);
}

export async function updateStaffMember(id: number, payload: Record<string, unknown>) {
  return api.post<StaffMember>(endpoints.admin.staffUpdate(id), payload);
}

export async function deactivateStaffMember(id: number) {
  return api.delete<{ action?: string }>(endpoints.admin.staffMember(id));
}
