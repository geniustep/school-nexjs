'use client';

import { useCallback, useMemo } from 'react';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ListParams } from '@/types/api';
import type { SubjectEnablementMatrixPayload } from '@/types/subject-enablement';
import { buildEnablementQuery } from '../api/enablement-api';
import { buildMatrixFromEnablementPayload } from '../utils/build-enablement-matrix';

export function useEnablementMatrix(options: {
  levelId?: number | null;
  subjectId?: number | null;
  academicYearId?: number | null;
  active?: boolean;
}) {
  const active = options.active !== false;
  const levelId = options.levelId ?? null;
  const subjectId = options.subjectId ?? null;
  const academicYearId = options.academicYearId ?? null;

  const query = useMemo(() => {
    if (!active) return undefined;
    if (levelId == null && subjectId == null) return undefined;
    return buildEnablementQuery({
      ...(academicYearId != null ? { academic_year_id: academicYearId } : {}),
      ...(levelId != null ? { level_id: levelId } : {}),
      ...(subjectId != null ? { subject_id: subjectId } : {}),
    }) as ListParams;
  }, [active, academicYearId, levelId, subjectId]);

  const path =
    active && query != null ? endpoints.admin.subjectsEnablement : null;

  const state = useAdminResource<SubjectEnablementMatrixPayload>(path, query);

  const matrix = useMemo(() => {
    if (!state.data || levelId == null) return null;
    return buildMatrixFromEnablementPayload(state.data, levelId);
  }, [state.data, levelId]);

  const reload = useCallback(() => state.reload(), [state]);

  return {
    payload: state.data,
    matrix,
    loading: state.loading,
    error: state.error,
    reload,
  };
}
