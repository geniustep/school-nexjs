'use client';

import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeStaffMember } from '@/features/admin/academic-setup/utils/staff-utils';
import type { StaffMember, StaffMutationResult, StaffOptions } from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function useStaffList(query?: ListParams) {
  const state = useAdminResource<StaffMember[]>(endpoints.admin.staff, query);
  const reload = useCallback(() => state.reload(), [state]);
  const staff = useMemo(
    () => (state.data ?? []).map(normalizeStaffMember),
    [state.data],
  );
  return {
    staff,
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
  const data = useMemo(
    () => (state.data ? normalizeStaffMember(state.data) : null),
    [state.data],
  );
  return { ...state, data };
}

export async function createStaffMember(payload: Record<string, unknown>) {
  return api.post<StaffMember>(endpoints.admin.staff, payload);
}

export async function updateStaffMember(id: number, payload: Record<string, unknown>) {
  return api.post<StaffMember>(endpoints.admin.staffUpdate(id), payload);
}

export async function deactivateStaffMember(id: number) {
  return api.post<StaffMutationResult>(endpoints.admin.staffDeactivate(id), {});
}

export async function reactivateStaffMember(id: number) {
  return api.post<StaffMutationResult>(endpoints.admin.staffReactivate(id), {});
}

export async function resetStaffAccountPassword(
  id: number,
  payload: { password: string; password_confirm: string },
) {
  return api.post<StaffMutationResult>(endpoints.admin.staffAccount(id), payload);
}
