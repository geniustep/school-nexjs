'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminAcademicContextOptions,
  fetchTeacherAcademicContextOptions,
} from '@/features/academic-context/api/academic-context-api';
import {
  applyAcademicContextFieldChange,
  applyInvalidatedSelections,
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
  selectionToQuery,
  type AcademicContextChangeField,
} from '@/features/academic-context/utils/academic-context-reset';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { canViewAcademicContext } from '@/lib/permissions/academic-context';
import type {
  AcademicContextOptionsResponse,
  AcademicContextScope,
  AcademicContextSelection,
} from '@/types/academic-context';

export type AcademicContextAudience = 'admin' | 'teacher';

export type UseAcademicContextOptionsArgs = {
  audience?: AcademicContextAudience;
  scope?: AcademicContextScope;
  includeInactive?: boolean;
  initialSelection?: Partial<AcademicContextSelection>;
  /** Controlled selection — when provided, parent owns state. */
  selection?: AcademicContextSelection;
  onSelectionChange?: (next: AcademicContextSelection) => void;
  enabled?: boolean;
};

export type UseAcademicContextOptionsResult = {
  selection: AcademicContextSelection;
  setField: (field: AcademicContextChangeField, value: string) => void;
  resetSelection: () => void;
  options: AcademicContextOptionsResponse | null;
  loading: boolean;
  refetching: boolean;
  error: { code: string; message: string } | null;
  permissionDenied: boolean;
  languageContractIncomplete: boolean;
  refetch: () => void;
};

function mergeInitial(
  initial?: Partial<AcademicContextSelection>,
): AcademicContextSelection {
  return { ...EMPTY_ACADEMIC_CONTEXT_SELECTION, ...initial };
}

export function useAcademicContextOptions(
  args: UseAcademicContextOptionsArgs = {},
): UseAcademicContextOptionsResult {
  const {
    audience = 'admin',
    scope,
    includeInactive,
    initialSelection,
    selection: controlledSelection,
    onSelectionChange,
    enabled = true,
  } = args;

  const user = useSession();
  const adminSession = useAdminSession();
  const globalAcademicYearId =
    audience === 'admin' ? adminSession.activeAcademicYearId : null;
  const globalAcademicYearValue =
    globalAcademicYearId != null ? String(globalAcademicYearId) : '';
  const allowed =
    audience === 'teacher'
      ? Boolean(user) &&
        (canViewAcademicContext(user) || user?.role === 'teacher' || user?.is_teacher === true)
      : canViewAcademicContext(user);

  const [internalSelection, setInternalSelection] = useState<AcademicContextSelection>(() =>
    mergeInitial(initialSelection),
  );
  const rawSelection = controlledSelection ?? internalSelection;
  const selection =
    audience === 'admin' &&
    globalAcademicYearValue &&
    rawSelection.academicYearId !== globalAcademicYearValue
      ? { ...rawSelection, academicYearId: globalAcademicYearValue }
      : rawSelection;

  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const setSelection = useCallback(
    (next: AcademicContextSelection) => {
      selectionRef.current = next;
      if (controlledSelection) {
        onSelectionChange?.(next);
      } else {
        setInternalSelection(next);
        onSelectionChange?.(next);
      }
    },
    [controlledSelection, onSelectionChange],
  );

  const [options, setOptions] = useState<AcademicContextOptionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [languageContractIncomplete, setLanguageContractIncomplete] = useState(false);

  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (
      audience !== 'admin' ||
      !globalAcademicYearValue ||
      rawSelection.academicYearId === globalAcademicYearValue
    ) {
      return;
    }
    setSelection(
      applyAcademicContextFieldChange(
        rawSelection,
        'academicYear',
        globalAcademicYearValue,
      ),
    );
  }, [
    audience,
    globalAcademicYearValue,
    rawSelection,
    rawSelection.academicYearId,
    setSelection,
  ]);

  const fetchOptions = useCallback(async () => {
    if (!enabled || !allowed) return;
    const requestId = ++requestIdRef.current;
    const current = selectionRef.current;
    const effective =
      audience === 'admin' && globalAcademicYearValue
        ? { ...current, academicYearId: globalAcademicYearValue }
        : current;
    if (hasLoadedRef.current) setRefetching(true);
    else setLoading(true);
    setError(null);

    const query = {
      ...selectionToQuery(effective),
      scope,
      include_inactive: includeInactive,
    };

    const fetcher =
      audience === 'teacher'
        ? fetchTeacherAcademicContextOptions
        : fetchAdminAcademicContextOptions;

    const res = await fetcher(query);
    if (requestId !== requestIdRef.current) return;

    if (!res.success) {
      if (res.error.code === 'academic_language_options_incomplete') {
        setLanguageContractIncomplete(true);
      }
      setError({ code: res.error.code, message: res.error.message });
      if (!hasLoadedRef.current) setOptions(null);
      setLoading(false);
      setRefetching(false);
      return;
    }

    setLanguageContractIncomplete(res.data.language_contract_complete === false);
    setOptions(res.data);
    hasLoadedRef.current = true;

    if (res.data.invalidated_selections.length) {
      let cleared = applyInvalidatedSelections(
        selectionRef.current,
        res.data.invalidated_selections,
      );
      if (audience === 'admin' && globalAcademicYearValue) {
        cleared = { ...cleared, academicYearId: globalAcademicYearValue };
      }
      if (JSON.stringify(cleared) !== JSON.stringify(selectionRef.current)) {
        setSelection(cleared);
      }
    }

    setLoading(false);
    setRefetching(false);
  }, [
    allowed,
    audience,
    enabled,
    globalAcademicYearValue,
    includeInactive,
    scope,
    setSelection,
  ]);

  useEffect(() => {
    if (!enabled || !allowed) {
      setLoading(false);
      setRefetching(false);
      return;
    }
    void fetchOptions();
  }, [
    enabled,
    allowed,
    fetchOptions,
    selection.academicYearId,
    selection.cycleId,
    selection.levelId,
    selection.trackId,
    selection.teachingLanguageId,
    selection.subjectId,
    selection.offeringId,
    selection.referenceId,
    selection.termId,
    selection.classId,
  ]);

  const setField = useCallback(
    (field: AcademicContextChangeField, value: string) => {
      if (
        audience === 'admin' &&
        field === 'academicYear' &&
        adminSession.activeSchoolId != null
      ) {
        const academicYearId = Number(value);
        if (!Number.isFinite(academicYearId) || academicYearId <= 0) return;
        if (!adminSession.setActiveAcademicYear(academicYearId)) return;
      }
      setSelection(applyAcademicContextFieldChange(selectionRef.current, field, value));
    },
    [adminSession, audience, setSelection],
  );

  const resetSelection = useCallback(() => {
    const reset = mergeInitial(initialSelection);
    setSelection(
      audience === 'admin' && globalAcademicYearValue
        ? { ...reset, academicYearId: globalAcademicYearValue }
        : reset,
    );
  }, [audience, globalAcademicYearValue, initialSelection, setSelection]);

  return {
    selection,
    setField,
    resetSelection,
    options,
    loading,
    refetching,
    error,
    permissionDenied: enabled && !allowed,
    languageContractIncomplete,
    refetch: fetchOptions,
  };
}
