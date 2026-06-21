'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { todayIsoDate } from '@/features/admin/students/utils/student-profile';
import type { Ref } from '@/types/api';
import { createAdmissionAssessment } from '../api/admissions-api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import {
  assessmentTypeRequiresSubject,
  filterSubjectsByLevel,
  resolveAdmissionValueLabel,
  resolveAssessmentSubjectLabel,
  resolveEvaluatorName,
} from '../utils/admission-options';
import type { AdmissionAssessment, AdmissionDetail } from '@/types/admission';

function evaluatorRoleKey(role: string | undefined): string {
  const normalized = role?.trim().toLowerCase();
  if (normalized === 'teacher') return 'teacher';
  if (normalized === 'staff') return 'staff';
  return 'staff';
}

function resolveRequestedLevelId(detail: AdmissionDetail): number | undefined {
  const level = detail.requested_level;
  if (!level) return undefined;
  if (typeof level === 'object' && level !== null && 'id' in level) {
    const id = (level as Ref).id;
    return typeof id === 'number' && id > 0 ? id : undefined;
  }
  return undefined;
}

function AssessmentCard({
  assessment,
  assessmentTypes,
  assessmentResults,
  assessmentRecommendations,
  subjects,
  unspecifiedSubjectLabel,
}: {
  assessment: AdmissionAssessment;
  assessmentTypes: { value: string; label: string }[];
  assessmentResults: { value: string; label: string }[];
  assessmentRecommendations: { value: string; label: string }[];
  subjects: { id: number; name: string; label: string }[];
  unspecifiedSubjectLabel: string;
}) {
  const t = useT();

  const typeLabel =
    assessment.assessment_type_label?.trim() ||
    resolveAdmissionValueLabel(assessmentTypes, assessment.assessment_type);
  const subjectLabel = resolveAssessmentSubjectLabel(assessment, subjects, unspecifiedSubjectLabel);
  const evaluatorName = resolveEvaluatorName(assessment.evaluator ?? null);
  const resultLabel =
    assessment.result_label?.trim() ||
    resolveAdmissionValueLabel(assessmentResults, assessment.result ?? undefined);
  const recommendationLabel =
    assessment.recommendation_label?.trim() ||
    resolveAdmissionValueLabel(assessmentRecommendations, assessment.recommendation ?? undefined);

  return (
    <div className="card card--compact admissions-assessment-card">
      <div className="between">
        <strong>
          {typeLabel} — {subjectLabel}
        </strong>
        <Badge tone="slate">{assessment.state}</Badge>
      </div>
      {evaluatorName ? (
        <p className="tiny muted">
          {t('admin.admissions.assessments.evaluator')}: {evaluatorName}
        </p>
      ) : null}
      <p className="muted">{assessment.assessment_date}</p>
      {(assessment.score != null || assessment.max_score != null) && (
        <p>
          {t('admin.admissions.assessments.score')}: {assessment.score ?? '—'}{' '}
          {t('admin.admissions.assessments.scoreOf')} {assessment.max_score ?? '—'}
        </p>
      )}
      {resultLabel ? (
        <p>
          {t('admin.admissions.assessments.result')}: {resultLabel}
        </p>
      ) : null}
      {recommendationLabel ? (
        <p className="tiny muted">
          {t('admin.admissions.assessments.recommendation')}: {recommendationLabel}
        </p>
      ) : null}
      {assessment.teacher_notes ? <p>{assessment.teacher_notes}</p> : null}
    </div>
  );
}

export function AdmissionAssessmentsTab({
  detail,
  canCreate,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canCreate: boolean;
  onUpdated: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const admissionOptionsState = useAdmissionOptions();
  const options = admissionOptionsState.options;
  const assessments = detail.assessments ?? [];

  const assessmentTypes = options?.assessment_types ?? [];
  const assessmentResults = options?.assessment_results ?? [];
  const assessmentRecommendations = options?.assessment_recommendations ?? [];
  const evaluators = options?.evaluators ?? [];
  const allSubjects = options?.subjects ?? [];
  const requestedLevelId = resolveRequestedLevelId(detail);

  const filteredSubjects = useMemo(
    () => filterSubjectsByLevel(allSubjects, requestedLevelId),
    [allSubjects, requestedLevelId],
  );

  const unspecifiedSubjectLabel = t('admin.admissions.assessments.unspecifiedSubject');

  const defaultType = assessmentTypes[0]?.value ?? 'written';
  const [open, setOpen] = useState(false);
  const [assessmentType, setAssessmentType] = useState(defaultType);
  const [subjectId, setSubjectId] = useState('');
  const [evaluatorId, setEvaluatorId] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(() => todayIsoDate());
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [result, setResult] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const subjectRequired = assessmentTypeRequiresSubject(assessmentType);

  const canSubmit = useMemo(
    () =>
      Boolean(
        assessmentDate &&
          assessmentType &&
          evaluatorId &&
          evaluators.length > 0 &&
          (!subjectRequired || subjectId),
      ),
    [assessmentDate, assessmentType, evaluatorId, evaluators.length, subjectRequired, subjectId],
  );

  function resetForm() {
    setAssessmentType(defaultType);
    setSubjectId('');
    setEvaluatorId('');
    setAssessmentDate(todayIsoDate());
    setScore('');
    setMaxScore('');
    setResult('');
    setRecommendation('');
    setTeacherNotes('');
    setError(null);
    setSubjectError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || !assessmentDate || !evaluatorId) return;

    if (subjectRequired && !subjectId) {
      setSubjectError(t('admin.admissions.assessments.subjectRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubjectError(null);

    const res = await createAdmissionAssessment(
      detail.id,
      {
        assessment_type: assessmentType,
        assessment_date: assessmentDate,
        evaluator_id: Number(evaluatorId),
        subject_id: subjectId ? Number(subjectId) : undefined,
        score: score ? Number(score) : undefined,
        max_score: maxScore ? Number(maxScore) : undefined,
        result: result || undefined,
        recommendation: recommendation || undefined,
        teacher_notes: teacherNotes || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSubmitting(false);
    if (res.success) {
      setOpen(false);
      resetForm();
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  return (
    <div className="admissions-section">
      {canCreate && (
        <>
          {!open ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>
              {t('admin.admissions.assessments.create')}
            </button>
          ) : (
            <form className="admissions-inline-form" onSubmit={submit}>
              <h3 className="admissions-section__title">{t('admin.admissions.assessments.create')}</h3>
              {error && <div className="alert alert--error">{error}</div>}
              {evaluators.length === 0 && !admissionOptionsState.loading ? (
                <EmptyState compact title={t('admin.admissions.assessments.noEvaluators')} />
              ) : (
                <div className="admissions-form-grid">
                  <div className="field">
                    <label htmlFor="assess-type">{t('admin.admissions.assessments.assessmentType')}</label>
                    <select
                      id="assess-type"
                      className="input"
                      value={assessmentType}
                      onChange={(e) => {
                        setAssessmentType(e.target.value);
                        setSubjectError(null);
                      }}
                      disabled={admissionOptionsState.loading}
                    >
                      {assessmentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="assess-subject">{t('admin.admissions.assessments.subject')}</label>
                    <select
                      id="assess-subject"
                      className="input"
                      value={subjectId}
                      onChange={(e) => {
                        setSubjectId(e.target.value);
                        setSubjectError(null);
                      }}
                      required={subjectRequired}
                      disabled={admissionOptionsState.loading}
                    >
                      <option value="">{t('admin.admissions.assessments.selectSubject')}</option>
                      {filteredSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.label}
                        </option>
                      ))}
                    </select>
                    {subjectRequired ? (
                      <p className="tiny muted">{t('admin.admissions.assessments.subjectRequiredHint')}</p>
                    ) : null}
                    {subjectError ? (
                      <p className="tiny" role="alert">
                        {subjectError}
                      </p>
                    ) : null}
                  </div>
                  <div className="field">
                    <label htmlFor="assess-evaluator">
                      {t('admin.admissions.assessments.evaluator')}
                    </label>
                    <select
                      id="assess-evaluator"
                      className="input"
                      value={evaluatorId}
                      onChange={(e) => setEvaluatorId(e.target.value)}
                      required
                      disabled={admissionOptionsState.loading || evaluators.length === 0}
                    >
                      <option value="">{t('admin.admissions.assessments.selectEvaluator')}</option>
                      {evaluators.map((evaluator) => (
                        <option key={evaluator.id} value={evaluator.id}>
                          {evaluator.name} —{' '}
                          {t(`admin.admissions.assessments.roles.${evaluatorRoleKey(evaluator.role)}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="assess-date">{t('common.date')}</label>
                    <input
                      id="assess-date"
                      type="date"
                      className="input"
                      required
                      value={assessmentDate}
                      onChange={(e) => setAssessmentDate(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="assess-score">{t('admin.admissions.assessments.score')}</label>
                    <input
                      id="assess-score"
                      type="number"
                      className="input"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="assess-max">{t('admin.admissions.assessments.maxScore')}</label>
                    <input
                      id="assess-max"
                      type="number"
                      className="input"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="assess-result">{t('admin.admissions.assessments.result')}</label>
                    <select
                      id="assess-result"
                      className="input"
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      disabled={admissionOptionsState.loading}
                    >
                      <option value="">—</option>
                      {assessmentResults.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="assess-rec">{t('admin.admissions.assessments.recommendation')}</label>
                    <select
                      id="assess-rec"
                      className="input"
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      disabled={admissionOptionsState.loading}
                    >
                      <option value="">—</option>
                      {assessmentRecommendations.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="field">
                <label htmlFor="assess-notes">{t('admin.admissions.assessments.teacherNotes')}</label>
                <textarea
                  id="assess-notes"
                  className="input"
                  rows={2}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? t('common.submitting') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {assessments.length === 0 ? (
        <EmptyState compact title={t('admin.admissions.assessments.empty')} />
      ) : (
        <div className="stack gap-sm">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              assessmentTypes={assessmentTypes}
              assessmentResults={assessmentResults}
              assessmentRecommendations={assessmentRecommendations}
              subjects={allSubjects}
              unspecifiedSubjectLabel={unspecifiedSubjectLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
