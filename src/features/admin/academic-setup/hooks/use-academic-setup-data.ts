'use client';

import { useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import { detectSetupIssues } from '../utils/issues';
import { computeReadiness } from '../utils/readiness';
import { computeSummaryCounts } from '../utils/summary';
import { deriveAssignments } from '../utils/assignments-derive';
import type { AcademicSetupBundle } from '../types';

export function useAcademicSetupData(
  t: (key: string, params?: Record<string, string | number>) => string,
): AcademicSetupBundle {
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects);
  const teachersState = useAdminResource<Teacher[]>(endpoints.admin.teachers, { page_size: 500 });

  const levels = levelsState.data ?? [];
  const classes = classesState.data ?? [];
  const subjects = subjectsState.data ?? [];
  const teachers = teachersState.data ?? [];

  const loading =
    levelsState.loading ||
    classesState.loading ||
    subjectsState.loading ||
    teachersState.loading;

  const error =
    levelsState.error?.message ??
    classesState.error?.message ??
    subjectsState.error?.message ??
    teachersState.error?.message ??
    null;

  const reload = () => {
    levelsState.reload();
    classesState.reload();
    subjectsState.reload();
    teachersState.reload();
  };

  return useMemo(() => {
    const assignments = deriveAssignments(classes, teachers);
    const hasBaselineData = levels.length > 0 || classes.length > 0 || teachers.length > 0;
    const issues = detectSetupIssues(levels, classes, teachers, t);
    const readiness = computeReadiness(issues, hasBaselineData);
    const summary = computeSummaryCounts(levels, classes, subjects, teachers);

    return {
      levels,
      classes,
      subjects,
      teachers,
      assignments,
      issues,
      readiness,
      summary,
      loading,
      error,
      reload,
    };
  }, [levels, classes, subjects, teachers, loading, error, t]);
}
