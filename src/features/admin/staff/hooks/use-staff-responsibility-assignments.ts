'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiErrorBody, ApiResponse } from '@/types/api';
import {
  createStaffResponsibilityAssignment,
  endStaffResponsibilityAssignment,
  fetchStaffEffectivePermissionExplanation,
  fetchStaffResponsibilityAssignments,
  fetchStaffResponsibilityAssignmentsSummary,
  updateStaffResponsibilityAssignment,
  type StaffEffectivePermissionsExplainedPayload,
  type StaffResponsibilityAssignment,
  type StaffResponsibilityAssignmentEndPayload,
  type StaffResponsibilityAssignmentMutationPayload,
  type StaffResponsibilityAssignmentsSummary,
  type StaffResponsibilityAssignmentUpdatePayload,
  type StaffResponsibilityAssignmentWritePayload,
} from '@/features/admin/staff/api/staff-responsibility-assignments-api';

export const STAFF_RESPONSIBILITY_ASSIGNMENT_CHANGED_EVENT =
  'raqeem:staff-responsibility-assignment-changed';

function broadcastResponsibilityChange(staffId: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(STAFF_RESPONSIBILITY_ASSIGNMENT_CHANGED_EVENT, {
      detail: { staffId },
    }),
  );
}

export function useStaffResponsibilityAssignments(staffId: number | null) {
  const [items, setItems] = useState<StaffResponsibilityAssignment[]>([]);
  const [summary, setSummary] = useState<StaffResponsibilityAssignmentsSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(staffId));
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [summaryError, setSummaryError] = useState<ApiErrorBody | null>(null);

  const reload = useCallback(async () => {
    if (!staffId) {
      setItems([]);
      setSummary(null);
      setLoading(false);
      setError(null);
      setSummaryError(null);
      return;
    }
    setLoading(true);
    const [listResponse, summaryResponse] = await Promise.all([
      fetchStaffResponsibilityAssignments(staffId),
      fetchStaffResponsibilityAssignmentsSummary(staffId),
    ]);
    if (listResponse.success) {
      setItems(listResponse.data.items ?? []);
      setError(null);
    } else {
      setError(listResponse.error);
    }
    if (summaryResponse.success) {
      setSummary(summaryResponse.data);
      setSummaryError(null);
    } else {
      setSummaryError(summaryResponse.error);
    }
    setLoading(false);
  }, [staffId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshAfter = useCallback(
    async <T extends StaffResponsibilityAssignmentMutationPayload>(response: ApiResponse<T>) => {
      if (response.success && staffId) {
        await reload();
        broadcastResponsibilityChange(staffId);
      }
      return response;
    },
    [reload, staffId],
  );

  const create = useCallback(
    async (payload: StaffResponsibilityAssignmentWritePayload) => {
      if (!staffId) return null;
      return refreshAfter(await createStaffResponsibilityAssignment(staffId, payload));
    },
    [staffId, refreshAfter],
  );

  const update = useCallback(
    async (assignmentId: number, payload: StaffResponsibilityAssignmentUpdatePayload) => {
      if (!staffId) return null;
      return refreshAfter(await updateStaffResponsibilityAssignment(staffId, assignmentId, payload));
    },
    [staffId, refreshAfter],
  );

  const end = useCallback(
    async (assignmentId: number, payload: StaffResponsibilityAssignmentEndPayload = {}) => {
      if (!staffId) return null;
      return refreshAfter(await endStaffResponsibilityAssignment(staffId, assignmentId, payload));
    },
    [staffId, refreshAfter],
  );

  return {
    items,
    summary,
    loading,
    error,
    summaryError,
    reload,
    create,
    update,
    end,
  };
}

export function useStaffResponsibilityPermissionExplanation(staffId: number | null) {
  const [payload, setPayload] = useState<StaffEffectivePermissionsExplainedPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(staffId));
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const reload = useCallback(async () => {
    if (!staffId) {
      setPayload(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const response = await fetchStaffEffectivePermissionExplanation(staffId);
    if (response.success) {
      setPayload(response.data);
      setError(null);
    } else {
      setError(response.error);
    }
    setLoading(false);
  }, [staffId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!staffId || typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ staffId?: number }>).detail;
      if (detail?.staffId === staffId) void reload();
    };
    window.addEventListener(STAFF_RESPONSIBILITY_ASSIGNMENT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(STAFF_RESPONSIBILITY_ASSIGNMENT_CHANGED_EVENT, handler);
  }, [reload, staffId]);

  return { payload, loading, error, reload };
}
