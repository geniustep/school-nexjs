'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 *
 * Admin Assessment Support — aggregate summary by default.
 * Individual detail is capability-gated and fetched only on intentional request.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ApiErrorView,
  EmptyState,
  LoadingState,
  PermissionDeniedState,
} from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { NumericText } from '@/components/ui/numeric-text';
import { AcademicContextFilters } from '@/features/academic-context';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { TeachingPlanningListBack } from '@/features/admin/teaching-planning/components/teaching-planning-list-back';
import {
  fetchAdminAssessmentSupportSummary,
  fetchAdminStudentAssessmentDetail,
} from '@/features/admin/teaching-assessment-support/api/admin-assessment-support-api';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  masteryStateMessageKey,
  reassessmentOutcomeMessageKey,
} from '@/features/teaching-assessment-support/assessment-support-labels';
import {
  canSeeAssessmentSupportIndividualDetail,
  canSeeAssessmentSupportSummary,
} from '@/lib/permissions/teaching-planning';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { ApiErrorBody } from '@/types/api';
import type {
  AdminAssessmentSupportSummary,
  AdminStudentAssessmentDetail,
} from '@/types/teaching-assessment-support';
import '@/features/admin/teaching-planning/teaching-planning.css';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

const EMPTY_SELECTION: AcademicContextSelection = {
  academicYearId: '',
  cycleId: '',
  levelId: '',
  trackId: '',
  teachingLanguageId: '',
  subjectId: '',
  offeringId: '',
  referenceId: '',
  termId: '',
  classId: '',
};

export function AdminAssessmentSupportPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const canSummary = canSeeAssessmentSupportSummary(user);
  const canDetail = canSeeAssessmentSupportIndividualDetail(user);

  const [selection, setSelection] = useState<AcademicContextSelection>(() => ({
    ...EMPTY_SELECTION,
    academicYearId: searchParams.get('academic_year_id') ?? '',
    classId: searchParams.get('class_id') ?? '',
    subjectId: searchParams.get('subject_id') ?? '',
  }));
  const [summary, setSummary] = useState<AdminAssessmentSupportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [detailStudentId, setDetailStudentId] = useState('');
  const [detail, setDetail] = useState<AdminStudentAssessmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<ApiErrorBody | null>(null);

  const loadSummary = useCallback(async () => {
    if (!canSummary) return;
    setLoading(true);
    setError(null);
    const res = await fetchAdminAssessmentSupportSummary({
      academic_year_id: selection.academicYearId
        ? Number(selection.academicYearId)
        : undefined,
      class_id: selection.classId ? Number(selection.classId) : undefined,
      subject_id: selection.subjectId ? Number(selection.subjectId) : undefined,
    });
    setLoading(false);
    if (!res.success) {
      setSummary(null);
      setError(res.error);
      return;
    }
    setSummary(res.data);
  }, [canSummary, selection.academicYearId, selection.classId, selection.subjectId]);

  useEffect(() => {
    void loadSummary();
    setDetail(null);
    setDetailError(null);
    setDetailStudentId('');
  }, [loadSummary]);

  async function loadDetail() {
    if (!canDetail) return;
    const id = Number(detailStudentId);
    if (!Number.isFinite(id) || id <= 0) return;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    const res = await fetchAdminStudentAssessmentDetail(id, {
      academic_year_id: selection.academicYearId
        ? Number(selection.academicYearId)
        : undefined,
      class_id: selection.classId ? Number(selection.classId) : undefined,
      subject_id: selection.subjectId ? Number(selection.subjectId) : undefined,
    });
    setDetailLoading(false);
    if (!res.success) {
      setDetailError(res.error);
      return;
    }
    setDetail(res.data);
  }

  function closeDetail() {
    setDetail(null);
    setDetailError(null);
    setDetailStudentId('');
  }

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace tp-list">
        <TeachingPlanningListBack />
        <PageHeader
          title={t('admin.teachingPlanning.assessmentSupport.title')}
          subtitle={t('admin.teachingPlanning.assessmentSupport.subtitle')}
        />

        {!canSummary ? (
          <PermissionDeniedState description={t('admin.pageForbidden')} />
        ) : (
          <>
            <AcademicContextFilters
              audience="admin"
              scope="teaching_planning"
              layout="compact"
              selection={selection}
              onSelectionChange={setSelection}
              showAcademicYear
              showClass
              showSubject
              showOffering={false}
              classBeforeSubject
            />

            <p className="tp-list__hint">
              {t('admin.teachingPlanning.assessmentSupport.privacyHint')}
            </p>

            {loading ? <LoadingState /> : null}
            {error ? (
              error.code === 'permission_denied' || error.code === 'forbidden' ? (
                <PermissionDeniedState description={t('admin.pageForbidden')} />
              ) : (
                <ApiErrorView error={error} onRetry={() => void loadSummary()} />
              )
            ) : null}

            {!loading && !error && summary ? (
              <div className="tp-list__stats" aria-label={t('admin.teachingPlanning.assessmentSupport.summaryLabel')}>
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.objectives')}
                  value={summary.objectives_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.observations')}
                  value={summary.observations_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.assessedStudents')}
                  value={summary.assessed_students_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.notAssessed')}
                  value={summary.not_assessed_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.difficulties')}
                  value={summary.difficulties_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.openDecisions')}
                  value={summary.open_support_decisions_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.activeGroups')}
                  value={summary.active_support_groups_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.plannedSupport')}
                  value={summary.planned_support_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.deliveredSupport')}
                  value={summary.delivered_support_count}
                />
                <Stat
                  label={t('admin.teachingPlanning.assessmentSupport.metrics.reassessmentDue')}
                  value={summary.reassessment_due_count}
                />
              </div>
            ) : null}

            {!loading && !error && summary ? (
              <section>
                <h2>{t('admin.teachingPlanning.assessmentSupport.masteryDistribution')}</h2>
                {Object.keys(summary.mastery_distribution_counts).length === 0 ? (
                  <EmptyState
                    title={t('admin.teachingPlanning.assessmentSupport.zeroTitle')}
                    description={t('admin.teachingPlanning.assessmentSupport.zeroDesc')}
                  />
                ) : (
                  <ul>
                    {Object.entries(summary.mastery_distribution_counts).map(([code, count]) => (
                      <li key={code}>
                        <span dir="auto">{code}</span>:{' '}
                        <NumericText>{count}</NumericText>
                      </li>
                    ))}
                  </ul>
                )}
                {Object.keys(summary.reassessment_outcome_counts).length > 0 ? (
                  <>
                    <h2>{t('admin.teachingPlanning.assessmentSupport.reassessmentOutcomes')}</h2>
                    <ul>
                      {Object.entries(summary.reassessment_outcome_counts).map(([code, count]) => (
                        <li key={code}>
                          {t(reassessmentOutcomeMessageKey(code))}: <NumericText>{count}</NumericText>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>
            ) : null}

            {canDetail ? (
              <section className="tp-list__detail-gate" aria-labelledby="tas-detail-title">
                <h2 id="tas-detail-title">
                  {t('admin.teachingPlanning.assessmentSupport.individualTitle')}
                </h2>
                <p>{t('admin.teachingPlanning.assessmentSupport.individualHint')}</p>
                <label>
                  {t('admin.teachingPlanning.assessmentSupport.studentId')}
                  <input
                    type="number"
                    min={1}
                    value={detailStudentId}
                    onChange={(e) => setDetailStudentId(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={detailLoading || !detailStudentId}
                  onClick={() => void loadDetail()}
                >
                  {detailLoading
                    ? t('common.loading')
                    : t('admin.teachingPlanning.assessmentSupport.loadDetail')}
                </button>
                {detail || detailError ? (
                  <button type="button" className="btn btn--ghost" onClick={closeDetail}>
                    {t('admin.teachingPlanning.assessmentSupport.closeDetail')}
                  </button>
                ) : null}
                {detailError ? (
                  detailError.code === 'permission_denied' || detailError.code === 'forbidden' ? (
                    <PermissionDeniedState description={t('admin.pageForbidden')} />
                  ) : (
                    <ApiErrorView error={detailError} />
                  )
                ) : null}
                {detail ? (
                  <div>
                    <p dir="auto">
                      {detail.student_name ?? t('common.dash')} (
                      <NumericText>{detail.student_id}</NumericText>)
                    </p>
                    <h3>{t('admin.teachingPlanning.assessmentSupport.detailObservations')}</h3>
                    <ul>
                      {detail.observations.map((obs) => (
                        <li key={obs.id}>
                          <NumericText>{obs.id}</NumericText> — {t(masteryStateMessageKey(obs.state))}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            <p>
              <Link href="/admin/teaching-planning/progress">
                {t('admin.teachingPlanning.assessmentSupport.toProgress')}
              </Link>
            </p>
          </>
        )}
      </div>
    </RequireTeachingPlanningAccess>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="tp-list__stat">
      <span>{label}</span>
      <strong>
        <NumericText>{value}</NumericText>
      </strong>
    </div>
  );
}
