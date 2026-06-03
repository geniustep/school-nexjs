'use client';

import { useMemo } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export function useClassInfo(classId: number | string) {
  const id = Number(classId);
  const state = useResource<TeacherClass[]>(endpoints.teacher.classes);

  const info = useMemo(() => {
    if (!state.data) return null;
    return state.data.find((c) => c.id === id) ?? null;
  }, [state.data, id]);

  return { info, loading: state.loading, error: state.error, reload: state.reload };
}

export function levelName(
  level: string | { id: number; name: string } | null | undefined,
): string | undefined {
  if (!level) return undefined;
  return typeof level === 'string' ? level : level.name;
}
