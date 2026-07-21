'use client';

import { useMemo } from 'react';
import { useSubjectOptions } from '@/features/admin/academic-setup/hooks/use-subject-options';
import type { Level, Subject } from '@/types/class';
import { buildLevelEnablementMatrix } from '../utils/build-enablement-matrix';

export function useLevelEnablementMatrix(
  level: Level | null,
  operationalSubjects: Subject[],
  active = true,
) {
  const optionsState = useSubjectOptions(
    active && level != null ? level.id : null,
    null,
    active && level != null,
  );

  const matrix = useMemo(() => {
    if (!level) return null;
    return buildLevelEnablementMatrix(level, operationalSubjects, optionsState.options);
  }, [level, operationalSubjects, optionsState.options]);

  return {
    matrix,
    loading: optionsState.loading,
    error: optionsState.error,
    reload: optionsState.reload,
  };
}
