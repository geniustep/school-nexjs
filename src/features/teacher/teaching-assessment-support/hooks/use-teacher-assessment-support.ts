'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchTeacherDifficulties,
  fetchTeacherLearningObjectives,
  fetchTeacherMasteryMatrix,
  fetchTeacherMasteryScale,
  fetchTeacherReassessments,
  fetchTeacherSupportDecisions,
  fetchTeacherSupportGroups,
  fetchTeacherSupportPlans,
} from '@/features/teacher/teaching-assessment-support/api/teacher-assessment-support-api';
import type { ApiErrorBody } from '@/types/api';
import type {
  DifficultyRecord,
  LearningObjectiveSummary,
  MasteryMatrixPayload,
  MasteryScale,
  ReassessmentRecord,
  SupportDecision,
  SupportGroup,
  SupportPlan,
} from '@/types/teaching-assessment-support';

export type AssessmentContextIds = {
  academicYearId: number;
  classId: number;
  subjectId: number;
};

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiErrorBody | null;
};

const empty = <T,>(): LoadState<T> => ({ data: null, loading: false, error: null });

export function useTeacherAssessmentSupport(options: {
  context: AssessmentContextIds | null;
  enabled: boolean;
  tab: string;
}) {
  const { context, enabled, tab } = options;
  const seq = useRef(0);

  const [objectives, setObjectives] = useState<LoadState<LearningObjectiveSummary[]>>(empty);
  const [scale, setScale] = useState<LoadState<MasteryScale>>(empty);
  const [matrix, setMatrix] = useState<LoadState<MasteryMatrixPayload>>(empty);
  const [difficulties, setDifficulties] = useState<LoadState<DifficultyRecord[]>>(empty);
  const [decisions, setDecisions] = useState<LoadState<SupportDecision[]>>(empty);
  const [groups, setGroups] = useState<LoadState<SupportGroup[]>>(empty);
  const [plans, setPlans] = useState<LoadState<SupportPlan[]>>(empty);
  const [reassessments, setReassessments] = useState<LoadState<ReassessmentRecord[]>>(empty);

  const clearAll = useCallback(() => {
    setObjectives(empty());
    setScale(empty());
    setMatrix(empty());
    setDifficulties(empty());
    setDecisions(empty());
    setGroups(empty());
    setPlans(empty());
    setReassessments(empty());
  }, []);

  const reload = useCallback(async () => {
    if (!enabled || !context) {
      clearAll();
      return;
    }
    const token = ++seq.current;
    const ctxQuery = {
      academic_year_id: context.academicYearId,
      class_id: context.classId,
      subject_id: context.subjectId,
    };

    if (tab === 'objectives' || tab === 'matrix') {
      setObjectives((s) => ({ ...s, loading: true, error: null }));
      setScale((s) => ({ ...s, loading: true, error: null }));
      const [objRes, scaleRes] = await Promise.all([
        fetchTeacherLearningObjectives({ subject_id: context.subjectId }),
        fetchTeacherMasteryScale(),
      ]);
      if (token !== seq.current) return;
      setObjectives({
        data: objRes.success ? objRes.data : null,
        loading: false,
        error: objRes.success ? null : objRes.error,
      });
      setScale({
        data: scaleRes.success ? scaleRes.data : null,
        loading: false,
        error: scaleRes.success ? null : scaleRes.error,
      });
    }

    if (tab === 'matrix') {
      setMatrix((s) => ({ ...s, loading: true, error: null }));
      const matrixRes = await fetchTeacherMasteryMatrix(ctxQuery);
      if (token !== seq.current) return;
      setMatrix({
        data: matrixRes.success ? matrixRes.data : null,
        loading: false,
        error: matrixRes.success ? null : matrixRes.error,
      });
    }

    if (tab === 'difficulties') {
      setDifficulties((s) => ({ ...s, loading: true, error: null }));
      const res = await fetchTeacherDifficulties(ctxQuery);
      if (token !== seq.current) return;
      setDifficulties({
        data: res.success ? res.data : null,
        loading: false,
        error: res.success ? null : res.error,
      });
    }

    if (tab === 'decisions') {
      setDecisions((s) => ({ ...s, loading: true, error: null }));
      const res = await fetchTeacherSupportDecisions(ctxQuery);
      if (token !== seq.current) return;
      setDecisions({
        data: res.success ? res.data : null,
        loading: false,
        error: res.success ? null : res.error,
      });
    }

    if (tab === 'groups') {
      setGroups((s) => ({ ...s, loading: true, error: null }));
      const res = await fetchTeacherSupportGroups(ctxQuery);
      if (token !== seq.current) return;
      setGroups({
        data: res.success ? res.data : null,
        loading: false,
        error: res.success ? null : res.error,
      });
    }

    if (tab === 'plans') {
      setPlans((s) => ({ ...s, loading: true, error: null }));
      const res = await fetchTeacherSupportPlans(ctxQuery);
      if (token !== seq.current) return;
      setPlans({
        data: res.success ? res.data : null,
        loading: false,
        error: res.success ? null : res.error,
      });
    }

    if (tab === 'reassessments') {
      setReassessments((s) => ({ ...s, loading: true, error: null }));
      const res = await fetchTeacherReassessments(ctxQuery);
      if (token !== seq.current) return;
      setReassessments({
        data: res.success ? res.data : null,
        loading: false,
        error: res.success ? null : res.error,
      });
    }
  }, [enabled, context, tab, clearAll]);

  useEffect(() => {
    void reload();
    return () => {
      seq.current += 1;
    };
  }, [reload]);

  useEffect(() => {
    if (!enabled || !context) clearAll();
  }, [enabled, context, clearAll]);

  return {
    objectives,
    scale,
    matrix,
    difficulties,
    decisions,
    groups,
    plans,
    reassessments,
    reload,
    clearAll,
  };
}
