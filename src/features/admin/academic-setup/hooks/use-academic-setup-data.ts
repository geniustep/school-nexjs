'use client';

import { useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { StaffMember } from '@/types/academic-setup';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import { normalizeSchoolClass } from '../utils/normalize-class';
import { normalizeLevel } from '../utils/normalize-level';

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

  const initialLoading =
    levelsState.initialLoading ||
    classesState.initialLoading ||
    subjectsState.initialLoading ||
    teachersState.initialLoading ||
    staffState.initialLoading;

  const fetching = loading && !initialLoading;

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

  return useMemo(() => {
    const levels = (levelsState.data ?? []).map(normalizeLevel);
    const levelById = new Map(levels.map((level) => [level.id, level]));
    const classes = (classesState.data ?? []).map((rawClass) => {
      const cls = normalizeSchoolClass(rawClass);
      const canonicalLevel = cls.level?.id ? levelById.get(cls.level.id) : undefined;
      if (!canonicalLevel || !cls.level) return cls;
      return {
        ...cls,
        level: {
          ...cls.level,
          ...canonicalLevel,
          cycle: canonicalLevel.cycle ?? cls.level.cycle ?? null,
        },
      };
    });

    return {
      levels,
      classes,
      subjects: subjectsState.data ?? [],
      teachers: teachersState.data ?? [],
      staff: staffState.data ?? [],
      loading,
      initialLoading,
      fetching,
      error,
      reload,
    };
  }, [
    levelsState.data,
    classesState.data,
    subjectsState.data,
    teachersState.data,
    staffState.data,
    loading,
    initialLoading,
    fetching,
    error,
  ]);
}
