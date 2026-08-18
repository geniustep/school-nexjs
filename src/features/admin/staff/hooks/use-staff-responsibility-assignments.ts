'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiErrorBody, ApiResponse } from '@/types/api';
import {
  createStaffResponsibilityAssignment,
  endStaffResponsibilityAssignment,
  fetchStaffResponsibilityAssignments,
  updateStaffResponsibilityAssignment,
  type StaffResponsibilityAssignment,
  type StaffResponsibilityAssignmentEndPayload,
  type StaffResponsibilityAssignmentMutationPayload,
  type StaffResponsibilityAssignmentUpdatePayload,
  type StaffResponsibilityAssignmentWritePayload,
} from '@/features/admin/staff/api/staff-responsibility-assignments-api';

export function useStaffResponsibilityAssignments(staffId: number | null) {
  const [items, setItems] = useState<StaffResponsibilityAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(staffId));
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const reload = useCallback(async () => {
    if (!staffId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const response = await fetchStaffResponsibilityAssignments(staffId);
    if (response.success) {
      setItems(response.data.items ?? []);
      setError(null);
    } else {
      setError(response.error);
    }
    setLoading(false);
  }, [staffId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshAfter = useCallback(
    async <T extends StaffResponsibilityAssignmentMutationPayload>(response: ApiResponse<T>) => {
      if (response.success) await reload();
      return response;
    },
    [reload],
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
    loading,
    error,
    reload,
    create,
    update,
    end,
  };
}
