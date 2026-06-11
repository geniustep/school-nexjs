'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type {
  TeachingAssignment,
  TeachingAssignmentSuggestionsResponse,
} from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function useTeachingAssignments(query?: ListParams) {
  const state = useAdminResource<TeachingAssignment[]>(endpoints.admin.teachingAssignments, query);
  const reload = useCallback(() => state.reload(), [state]);

  return {
    assignments: state.data ?? [],
    loading: state.loading,
    error: state.error,
    meta: state.meta,
    reload,
  };
}

export function useTeachingAssignmentSuggestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (classId: number, subjectId: number) => {
    setLoading(true);
    setError(null);
    const res = await api.get<TeachingAssignmentSuggestionsResponse>(
      endpoints.admin.teachingAssignmentSuggestions,
      { class_id: classId, subject_id: subjectId },
    );
    setLoading(false);
    if (!res.success) {
      setError(res.error.message);
      return null;
    }
    return res.data;
  }, []);

  return { fetchSuggestions, loading, error };
}

export async function createTeachingAssignment(payload: {
  class_id: number;
  subject_id: number;
  teacher_id: number;
  weekly_hours?: number;
  role?: string;
  notes?: string;
}) {
  return api.post<TeachingAssignment>(endpoints.admin.teachingAssignments, payload);
}

export async function updateTeachingAssignment(
  id: number,
  payload: Partial<{
    teacher_id: number;
    weekly_hours: number;
    role: string;
    notes: string;
    active: boolean;
  }>,
) {
  return api.post<TeachingAssignment>(endpoints.admin.teachingAssignmentUpdate(id), payload);
}

export async function deleteTeachingAssignment(id: number) {
  return api.delete<{ action?: string }>(endpoints.admin.teachingAssignment(id));
}
