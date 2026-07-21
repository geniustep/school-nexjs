'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  diffEnablementSelection,
  serverEnabledSubjectIds,
  type EnablementChangeSummary,
} from '../utils/enablement-diff';
import type { SubjectLevelEnablementRow } from '@/types/subject-enablement';

function sortedIdKey(ids: Iterable<number>): string {
  return [...ids].sort((a, b) => a - b).join(',');
}

export function useEnablementDraft(rows: SubjectLevelEnablementRow[], resetKey: string) {
  const serverIds = useMemo(() => serverEnabledSubjectIds(rows), [rows]);
  const serverKey = sortedIdKey(serverIds);
  const [draft, setDraft] = useState<Set<number>>(() => new Set(serverIds));

  useEffect(() => {
    setDraft(new Set(serverIds));
  }, [resetKey, serverKey]); // eslint-disable-line react-hooks/exhaustive-deps -- serverIds rebuilt with serverKey

  const summary: EnablementChangeSummary = useMemo(
    () => diffEnablementSelection(rows, draft),
    [rows, draft],
  );

  const toggle = useCallback((operationalSubjectId: number, enabled: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(operationalSubjectId);
      else next.delete(operationalSubjectId);
      return next;
    });
  }, []);

  const isDraftEnabled = useCallback(
    (operationalSubjectId: number) => draft.has(operationalSubjectId),
    [draft],
  );

  const resetToServer = useCallback(() => {
    setDraft(new Set(serverIds));
  }, [serverIds]);

  useEffect(() => {
    if (!summary.dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [summary.dirty]);

  return {
    draft,
    summary,
    dirty: summary.dirty,
    toggle,
    isDraftEnabled,
    resetToServer,
  };
}

export function useLevelDraft(
  levelIds: number[],
  serverEnabled: ReadonlySet<number>,
  resetKey: string,
) {
  const serverKey = sortedIdKey(serverEnabled);
  const [draft, setDraft] = useState<Set<number>>(() => new Set(serverEnabled));

  useEffect(() => {
    setDraft(new Set(serverEnabled));
  }, [resetKey, serverKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const enableIds: number[] = [];
    const disableIds: number[] = [];
    const unchangedIds: number[] = [];
    for (const id of levelIds) {
      const serverOn = serverEnabled.has(id);
      const draftOn = draft.has(id);
      if (serverOn === draftOn) unchangedIds.push(id);
      else if (draftOn) enableIds.push(id);
      else disableIds.push(id);
    }
    return {
      enableIds,
      disableIds,
      unchangedIds,
      dirty: enableIds.length > 0 || disableIds.length > 0,
    };
  }, [levelIds, serverEnabled, draft]);

  const toggle = useCallback((levelId: number, enabled: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(levelId);
      else next.delete(levelId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!summary.dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [summary.dirty]);

  return {
    draft,
    summary,
    dirty: summary.dirty,
    toggle,
    isDraftEnabled: (id: number) => draft.has(id),
    resetToServer: () => setDraft(new Set(serverEnabled)),
  };
}
