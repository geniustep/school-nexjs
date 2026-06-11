'use client';

import { useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { StaffMember } from '@/types/academic-setup';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';

/** Lightweight bundle for search and shared list data — no derived readiness/assignments. */
export function useAcademicSetupLists() {
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects);
  const teachersState = useAdminResource<Teacher[]>(endpoints.admin.teachers, { page_size: 500 });
  const staffState = useAdminResource<StaffMember[]>(endpoints.admin.staff, { page_size: 200 });

  const loading =
    levelsState.loading ||
    classesState.loading ||
    subjectsState.loading ||
    teachersState.loading ||
    staffState.loading;

  const error =
    levelsState.error ??
    classesState.error ??
    subjectsState.error ??
    teachersState.error ??
    staffState.error ??
    null;

  const reload = () => {
    levelsState.reload();
    classesState.reload();
    subjectsState.reload();
    teachersState.reload();
    staffState.reload();
  };

  return useMemo(
    () => ({
      levels: levelsState.data ?? [],
      classes: classesState.data ?? [],
      subjects: subjectsState.data ?? [],
      teachers: teachersState.data ?? [],
      staff: staffState.data ?? [],
      loading,
      error,
      reload,
    }),
    [
      levelsState.data,
      classesState.data,
      subjectsState.data,
      teachersState.data,
      staffState.data,
      loading,
      error,
    ],
  );
}
