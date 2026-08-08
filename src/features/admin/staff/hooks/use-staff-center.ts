'use client';

import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import {
  filterStaffCenterListMembers,
  mergeStaffPermissionsPayload,
  normalizeStaffCenterMember,
  unwrapStaffDetailResponse,
} from '@/features/admin/staff/utils/normalize-staff-center';
import type {
  StaffDetailEnvelope,
  StaffEffectivePermissionsPayload,
  StaffMember,
} from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function useStaffCenterList(query?: ListParams) {
  const state = useAdminResource<StaffMember[]>(endpoints.admin.staff, query);
  const reload = useCallback(() => state.reload(), [state]);
  const staff = useMemo(
    () =>
      filterStaffCenterListMembers(
        (state.data ?? []).map(normalizeStaffCenterMember),
      ),
    [state.data],
  );
  return {
    staff,
    loading: state.loading,
    initialLoading: state.initialLoading,
    fetching: state.fetching,
    error: state.error,
    meta: state.meta,
    reload,
  };
}

export function useStaffCenterDetail(userId: number | null) {
  const state = useAdminResource<StaffDetailEnvelope | StaffMember>(
    userId ? endpoints.admin.staffMember(userId) : null,
  );

  const parsed = useMemo(() => {
    if (!state.data) return { member: null, permissionsPayload: null };
    return unwrapStaffDetailResponse(state.data);
  }, [state.data]);

  return {
    ...state,
    member: parsed.member,
    permissionsPayload: parsed.permissionsPayload,
  };
}

export function useStaffEffectivePermissions(userId: number | null, enabled = true) {
  const state = useAdminResource<StaffEffectivePermissionsPayload>(
    userId && enabled ? endpoints.admin.staffEffectivePermissions(userId) : null,
  );

  const payload = useMemo(
    () => (state.data ? state.data : null),
    [state.data],
  );

  return { ...state, payload };
}

export function useStaffCenterDetailWithPermissions(userId: number | null) {
  const detailState = useStaffCenterDetail(userId);
  const shouldFetchSeparate =
    !!userId &&
    !detailState.permissionsPayload &&
    detailState.member != null;

  const permissionsState = useStaffEffectivePermissions(userId, shouldFetchSeparate);

  const member = useMemo(() => {
    if (!detailState.member) return null;
    const payload = detailState.permissionsPayload ?? permissionsState.payload;
    return mergeStaffPermissionsPayload(detailState.member, payload);
  }, [detailState.member, detailState.permissionsPayload, permissionsState.payload]);

  const loading = detailState.loading || (shouldFetchSeparate && permissionsState.loading);
  const error = detailState.error ?? permissionsState.error;

  const reload = useCallback(() => {
    detailState.reload();
    if (shouldFetchSeparate) permissionsState.reload();
  }, [detailState, permissionsState, shouldFetchSeparate]);

  return {
    member,
    loading,
    error,
    reload,
    permissionsPayload: detailState.permissionsPayload ?? permissionsState.payload,
  };
}

export async function fetchStaffCenterDetail(userId: number) {
  const res = await api.get<StaffDetailEnvelope | StaffMember>(endpoints.admin.staffMember(userId));
  if (!res.success || !res.data) return res;
  const parsed = unwrapStaffDetailResponse(res.data);
  return { ...res, data: parsed.member, permissionsPayload: parsed.permissionsPayload };
}
