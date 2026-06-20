'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { createAdmissionAssessment } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import type { AdmissionDetail } from '@/types/admission';
import type { Ref } from '@/types/api';

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
  const assessments = detail.assessments ?? [];
  const levelsState = useAdminResource<Ref[]>(endpoints.admin.levels, { page_size: 100 });
  const subjectsState = useAdminResource<Ref[]>(endpoints.admin.subjectsOptions);
  const [open, setOpen] = useState(false);
  const [assessmentType, setAssessmentType] = useState('written');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [requestedLevelId, setRequestedLevelId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [result, setResult] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || !assessmentDate) return;
    setSubmitting(true);
    setError(null);
    const res = await createAdmissionAssessment(
      detail.id,
      {
        assessment_type: assessmentType,
        assessment_date: assessmentDate,
        requested_level_id: requestedLevelId ? Number(requestedLevelId) : undefined,
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
              <div className="admissions-form-grid">
                <div className="field">
                  <label htmlFor="assess-type">{t('admin.admissions.assessments.type')}</label>
                  <input
                    id="assess-type"
                    className="input"
                    value={assessmentType}
                    onChange={(e) => setAssessmentType(e.target.value)}
                  />
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
                  <label htmlFor="assess-level">{t('admin.admissions.fields.requestedLevel')}</label>
                  <select
                    id="assess-level"
                    className="input"
                    value={requestedLevelId}
                    onChange={(e) => setRequestedLevelId(e.target.value)}
                  >
                    <option value="">—</option>
                    {(levelsState.data ?? []).map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="assess-subject">{t('nav.subjects')}</label>
                  <select
                    id="assess-subject"
                    className="input"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  >
                    <option value="">—</option>
                    {(subjectsState.data ?? []).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
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
              </div>
              <div className="field">
                <label htmlFor="assess-result">{t('admin.admissions.assessments.result')}</label>
                <input
                  id="assess-result"
                  className="input"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="assess-rec">{t('admin.admissions.assessments.recommendation')}</label>
                <input
                  id="assess-rec"
                  className="input"
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                />
              </div>
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
                <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
                  {submitting ? t('common.submitting') : t('common.save')}
                </button>
                <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>
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
            <div key={assessment.id} className="card card--compact">
              <div className="between">
                <strong>{assessment.assessment_type}</strong>
                <Badge tone="slate">{assessment.state}</Badge>
              </div>
              <p className="muted">{assessment.assessment_date}</p>
              {(assessment.score != null || assessment.max_score != null) && (
                <p>
                  {t('admin.admissions.assessments.score')}: {assessment.score ?? '—'} /{' '}
                  {assessment.max_score ?? '—'}
                </p>
              )}
              {assessment.result && <p>{assessment.result}</p>}
              {assessment.recommendation && (
                <p className="tiny muted">
                  {t('admin.admissions.assessments.recommendation')}: {assessment.recommendation}
                </p>
              )}
              {assessment.teacher_notes && <p>{assessment.teacher_notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
