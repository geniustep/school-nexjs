'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

export interface TeacherClassRef {
  id: number;
  name: string;
}

export interface ClassTagged<T> {
  item: T;
  classId: number;
  className: string;
}

export function useTeacherClassAggregate<T>(
  classes: TeacherClassRef[] | null | undefined,
  listPath: (classId: number) => string,
  errorLabel: string,
) {
  const [items, setItems] = useState<ClassTagged<T>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!classes?.length) {
      setItems([]);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);

    Promise.all(
      classes.map(async (c) => {
        const res = await api.get<T[]>(listPath(c.id));
        if (!res.success) return [] as ClassTagged<T>[];
        return (res.data ?? []).map((item) => ({
          item,
          classId: c.id,
          className: c.name,
        }));
      }),
    )
      .then((groups) => {
        if (!active) return;
        setItems(groups.flat());
      })
      .catch(() => {
        if (active) setLoadError(errorLabel);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // listPath is stable per page (inline lambda tied to one endpoint).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, errorLabel]);

  return { items, loading, loadError };
}
