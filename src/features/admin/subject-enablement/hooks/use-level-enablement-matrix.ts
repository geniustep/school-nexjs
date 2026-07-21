'use client';

import { useMemo } from 'react';
import { useSubjectOptions } from '@/features/admin/academic-setup/hooks/use-subject-options';
import type { Level, Subject } from '@/types/class';
import { isSubjectLevelEnablementWriteAvailable } from '@/types/subject-enablement';
import { buildLevelEnablementMatrix } from '../utils/build-enablement-matrix';
import { useEnablementMatrix } from './use-enablement-matrix';

/**
 * Level matrix:
 * - Write gate ON → Odoo 236 GET /admin/subjects/enablement (contract source of truth)
 * - Write gate OFF → legacy options-derived read model (N4-I / pre-236 tenants)
 */
export function useLevelEnablementMatrix(
  level: Level | null,
  operationalSubjects: Subject[],
  active = true,
) {
  const writeGate = isSubjectLevelEnablementWriteAvailable();

  const enablement = useEnablementMatrix({
    levelId: active && level != null && writeGate ? level.id : null,
    active: active && level != null && writeGate,
  });

  const optionsState = useSubjectOptions(
    active && level != null && !writeGate ? level.id : null,
    null,
    active && level != null && !writeGate,
  );

  const matrix = useMemo(() => {
    if (!level) return null;
    if (writeGate) return enablement.matrix;
    return buildLevelEnablementMatrix(level, operationalSubjects, optionsState.options);
  }, [level, writeGate, enablement.matrix, operationalSubjects, optionsState.options]);

  return {
    matrix,
    payload: writeGate ? enablement.payload : null,
    loading: writeGate ? enablement.loading : optionsState.loading,
    error: writeGate ? enablement.error : optionsState.error,
    reload: writeGate ? enablement.reload : optionsState.reload,
  };
}
