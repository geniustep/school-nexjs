'use client';

import { useEffect, useState } from 'react';
import { fetchSchoolClassDetail } from '@/features/admin/academic-setup/hooks/use-class-actions';
import type { ApiErrorBody } from '@/types/api';
import type { SchoolClass } from '@/types/class';

export function useSchoolClassSummary(classId: string, activeSchoolId?: number | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [data, setData] = useState<SchoolClass | null>(null);

  useEffect(() => {
    const id = Number(classId);
    if (!Number.isFinite(id) || id <= 0) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSchoolClassDetail(id, activeSchoolId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setData(null);
        setError(result.error);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [classId, activeSchoolId]);

  return { loading, error, data };
}
