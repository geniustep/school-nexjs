'use client';

/**
 * Mastery Matrix — Backend levels only; no score→mastery inference.
 */

import { useMemo, useState } from 'react';
import { EmptyState, LoadingState, ApiErrorView } from '@/components/states/states';
import { NumericText } from '@/components/ui/numeric-text';
import { useT } from '@/features/i18n/locale-context';
import { masteryStateMessageKey } from '@/features/teaching-assessment-support/assessment-support-labels';
import { saveTeacherMasteryBatch } from '@/features/teacher/teaching-assessment-support/api/teacher-assessment-support-api';
import { MASTERY_BATCH_LIMIT, type MasteryBatchRow, type MasteryMatrixPayload, type MasteryScale } from '@/types/teaching-assessment-support';
import type { ApiErrorBody } from '@/types/api';

type DraftKey = string;

function cellKey(studentId: number, objectiveId: number): DraftKey {
  return `${studentId}:${objectiveId}`;
}

type DraftCell = {
  mastery_level_id: number | null;
  observation_text: string;
  participation_state: string;
};

export function MasteryMatrixPanel(props: {
  matrix: MasteryMatrixPayload | null;
  scale: MasteryScale | null;
  loading: boolean;
  error: ApiErrorBody | null;
  context: { academicYearId: number; classId: number; subjectId: number };
  onSaved: () => void;
}) {
  const t = useT();
  const { matrix, scale, loading, error, context, onSaved } = props;
  const [drafts, setDrafts] = useState<Record<DraftKey, DraftCell>>({});
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [mobileStudentId, setMobileStudentId] = useState<number | null>(null);

  const levels = scale?.levels?.filter((l) => l.active !== false) ?? [];

  const observationMap = useMemo(() => {
    const map = new Map<DraftKey, NonNullable<MasteryMatrixPayload['cells'][number]['observation']>>();
    for (const cell of matrix?.cells ?? []) {
      if (cell.observation) {
        map.set(cellKey(cell.student_id, cell.learning_objective_id), cell.observation);
      }
    }
    return map;
  }, [matrix]);

  const draftRows = useMemo(() => {
    const rows: MasteryBatchRow[] = [];
    for (const [key, draft] of Object.entries(drafts)) {
      const [studentId, objectiveId] = key.split(':').map(Number);
      if (!studentId || !objectiveId) continue;
      rows.push({
        student_id: studentId,
        learning_objective_id: objectiveId,
        mastery_level_id: draft.mastery_level_id,
        observation_text: draft.observation_text || null,
        participation_state: (draft.participation_state || 'taken') as MasteryBatchRow['participation_state'],
      });
    }
    return rows;
  }, [drafts]);

  function setDraft(studentId: number, objectiveId: number, patch: Partial<DraftCell>) {
    const key = cellKey(studentId, objectiveId);
    setDrafts((prev) => {
      const existing = prev[key] ?? {
        mastery_level_id: null,
        observation_text: '',
        participation_state: 'taken',
      };
      return { ...prev, [key]: { ...existing, ...patch } };
    });
  }

  async function submitBatch() {
    if (busy || !scale || draftRows.length === 0) return;
    if (draftRows.length > MASTERY_BATCH_LIMIT) {
      setSaveError(t('teacher.teachingAssessmentSupport.matrix.batchLimit'));
      return;
    }
    setBusy(true);
    setSaveError(null);
    setLive('');
    const res = await saveTeacherMasteryBatch({
      academic_year_id: context.academicYearId,
      class_id: context.classId,
      subject_id: context.subjectId,
      mastery_scale_id: scale.id,
      rows: draftRows,
      confirm,
    });
    setBusy(false);
    if (!res.success) {
      const code = res.error?.code ?? '';
      if (code === 'permission_denied' || code === 'forbidden') {
        setSaveError(t('teacher.teachingAssessmentSupport.errors.forbidden'));
      } else if (code.includes('conflict') || code === 'correction_required') {
        setSaveError(t('teacher.teachingAssessmentSupport.errors.correctionRequired'));
      } else if (code.includes('validation')) {
        setSaveError(t('teacher.teachingAssessmentSupport.errors.validation'));
      } else {
        setSaveError(res.error?.message ?? t('teacher.teachingAssessmentSupport.errors.saveFailed'));
      }
      setLive(t('teacher.teachingAssessmentSupport.matrix.saveFailedLive'));
      return;
    }
    setDrafts({});
    setLive(t('teacher.teachingAssessmentSupport.matrix.saveSuccessLive'));
    onSaved();
  }

  if (loading) return <LoadingState />;
  if (error) {
    if (error.code === 'permission_denied' || error.code === 'forbidden') {
      return (
        <EmptyState
          title={t('errors.forbiddenTitle')}
          description={t('teacher.teachingAssessmentSupport.errors.forbidden')}
        />
      );
    }
    return <ApiErrorView error={error} onRetry={onSaved} />;
  }
  if (!matrix) {
    return (
      <EmptyState
        title={t('teacher.teachingAssessmentSupport.matrix.emptyTitle')}
        description={t('teacher.teachingAssessmentSupport.matrix.emptyDesc')}
      />
    );
  }
  if (!scale || levels.length === 0) {
    return (
      <EmptyState
        title={t('teacher.teachingAssessmentSupport.matrix.noScaleTitle')}
        description={t('teacher.teachingAssessmentSupport.matrix.noScaleDesc')}
      />
    );
  }
  if (matrix.students.length === 0) {
    return (
      <EmptyState
        title={t('teacher.teachingAssessmentSupport.matrix.noStudentsTitle')}
        description={t('teacher.teachingAssessmentSupport.matrix.noStudentsDesc')}
      />
    );
  }
  if (matrix.objectives.length === 0) {
    return (
      <EmptyState
        title={t('teacher.teachingAssessmentSupport.objectives.emptyTitle')}
        description={t('teacher.teachingAssessmentSupport.objectives.emptyDesc')}
      />
    );
  }

  const mobileStudent =
    matrix.students.find((s) => s.id === mobileStudentId) ?? matrix.students[0] ?? null;

  return (
    <div className="tas-matrix">
      <div className="tas-matrix__toolbar">
        <label className="tas-matrix__confirm">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            disabled={busy}
          />
          {t('teacher.teachingAssessmentSupport.matrix.confirmOnSave')}
        </label>
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy || draftRows.length === 0}
          onClick={() => void submitBatch()}
        >
          {busy
            ? t('teacher.teachingAssessmentSupport.matrix.saving')
            : t('teacher.teachingAssessmentSupport.matrix.saveBatch', {
                count: String(draftRows.length),
              })}
        </button>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {live}
      </p>
      {saveError ? (
        <p className="tas-matrix__error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="tas-matrix__desktop" role="region" aria-label={t('teacher.teachingAssessmentSupport.matrix.title')}>
        <table className="tas-matrix__table">
          <caption className="visually-hidden">
            {t('teacher.teachingAssessmentSupport.matrix.caption')}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="tas-matrix__sticky">
                {t('teacher.teachingAssessmentSupport.matrix.student')}
              </th>
              {matrix.objectives.map((obj) => (
                <th key={obj.id} scope="col" title={obj.name ?? undefined}>
                  <span dir="auto">{obj.code ?? obj.name ?? `#${obj.id}`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.students.map((student) => (
              <tr key={student.id}>
                <th scope="row" className="tas-matrix__sticky" dir="auto">
                  {student.name}
                </th>
                {matrix.objectives.map((obj) => {
                  const key = cellKey(student.id, obj.id);
                  const obs = observationMap.get(key);
                  const draft = drafts[key];
                  const levelId = draft?.mastery_level_id ?? obs?.mastery_level_id ?? null;
                  const level = levels.find((l) => l.id === levelId);
                  const label = level?.name ?? t('teacher.teachingAssessmentSupport.matrix.noObservation');
                  return (
                    <td key={obj.id}>
                      <label className="visually-hidden" htmlFor={`cell-${key}`}>
                        {student.name} — {obj.code ?? obj.name}
                      </label>
                      <select
                        id={`cell-${key}`}
                        value={levelId ?? ''}
                        disabled={busy || (obs?.state === 'confirmed' && !draft)}
                        aria-label={label}
                        onChange={(e) => {
                          const v = e.target.value ? Number(e.target.value) : null;
                          setDraft(student.id, obj.id, { mastery_level_id: v });
                        }}
                      >
                        <option value="">
                          {t('teacher.teachingAssessmentSupport.matrix.noObservation')}
                        </option>
                        {levels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name ?? l.code ?? String(l.id)}
                          </option>
                        ))}
                      </select>
                      {obs?.state ? (
                        <span className="tas-matrix__state">
                          {t(masteryStateMessageKey(obs.state))}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tas-matrix__mobile">
        <label>
          {t('teacher.teachingAssessmentSupport.matrix.student')}
          <select
            value={mobileStudent?.id ?? ''}
            onChange={(e) => setMobileStudentId(Number(e.target.value))}
          >
            {matrix.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {mobileStudent
          ? matrix.objectives.map((obj) => {
              const key = cellKey(mobileStudent.id, obj.id);
              const obs = observationMap.get(key);
              const draft = drafts[key];
              const levelId = draft?.mastery_level_id ?? obs?.mastery_level_id ?? null;
              return (
                <div key={obj.id} className="tas-matrix__mobile-card">
                  <div dir="auto" className="tas-matrix__mobile-obj">
                    {obj.code ? <strong>{obj.code}</strong> : null} {obj.name}
                  </div>
                  <label>
                    {t('teacher.teachingAssessmentSupport.matrix.level')}
                    <select
                      value={levelId ?? ''}
                      disabled={busy}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        setDraft(mobileStudent.id, obj.id, { mastery_level_id: v });
                      }}
                    >
                      <option value="">
                        {t('teacher.teachingAssessmentSupport.matrix.noObservation')}
                      </option>
                      {levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name ?? l.code ?? String(l.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {obs?.observed_at ? (
                    <p>
                      <NumericText variant="date">{obs.observed_at}</NumericText>
                    </p>
                  ) : null}
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
}
