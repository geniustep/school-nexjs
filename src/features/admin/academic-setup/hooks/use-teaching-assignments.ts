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
  academic_year_id?: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  weekly_hours?: number;
  role?: string;
  notes?: string;
  teaching_offering_id?: number;
  override?: true;
  override_reason?: string;
}) {
  const body: Record<string, unknown> = { ...payload };
  delete body.can_assign;
  delete body.eligible;
  delete body.eligibility_state;
  delete body.blocking_reasons;
  delete body.warning_reasons;
  delete body.informational_reasons;
  delete body.override_rule_codes;
  if (body.override !== true) {
    delete body.override;
    delete body.override_reason;
  } else if (typeof body.override_reason === 'string') {
    body.override_reason = body.override_reason.trim();
  }
  return api.post<TeachingAssignment>(endpoints.admin.teachingAssignments, body);
}

export async function updateTeachingAssignment(
  id: number,
  payload: Partial<{
    teacher_id: number;
    weekly_hours: number;
    role: string;
    notes: string;
    active: boolean;
    teaching_offering_id: number | null | false;
    override: true;
    override_reason: string;
  }>,
) {
  const body: Record<string, unknown> = { ...payload };
  delete body.can_assign;
  delete body.eligible;
  delete body.eligibility_state;
  delete body.blocking_reasons;
  delete body.warning_reasons;
  delete body.informational_reasons;
  delete body.override_rule_codes;
  if (body.override !== true) {
    delete body.override;
    delete body.override_reason;
  } else if (typeof body.override_reason === 'string') {
    body.override_reason = body.override_reason.trim();
  }
  return api.post<TeachingAssignment>(endpoints.admin.teachingAssignmentUpdate(id), body);
}

export async function deleteTeachingAssignment(id: number) {
  return api.delete<{ action?: string }>(endpoints.admin.teachingAssignment(id));
}
