'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 *
 * Teacher Assessment Support — mastery / difficulty / support / reassessment.
 * Backend (Odoo 221) is SoT; UI never invents mastery from scores or plan completion.
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiErrorView,
  EmptyState,
  LoadingState,
  PermissionDeniedState,
} from '@/components/states/states';
import { NumericText } from '@/components/ui/numeric-text';
import { AcademicContextFilters } from '@/features/academic-context';
import { useT } from '@/features/i18n/locale-context';
import {
  masteryStateMessageKey,
  reassessmentOutcomeMessageKey,
  reassessmentTrendMessageKey,
  supportDecisionTypeMessageKey,
  supportPlanTypeMessageKey,
} from '@/features/teaching-assessment-support/assessment-support-labels';
import { supportPlanSessionHref } from '@/features/teaching-assessment-support/normalize-assessment-support';
import {
  buildTeacherAssessmentSupportHref,
  parseTeacherAssessmentSupportQuery,
} from '@/features/teaching-assessment-support/assessment-support-url';
import { MasteryMatrixPanel } from '@/features/teacher/teaching-assessment-support/components/mastery-matrix-panel';
import { useTeacherAssessmentSupport } from '@/features/teacher/teaching-assessment-support/hooks/use-teacher-assessment-support';
import {
  TeacherPageHeader,
  TeacherWorkspaceCard,
} from '@/features/teacher/ui/teacher-primitives';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { TeacherAssessmentSupportTab } from '@/types/teaching-assessment-support';
import '@/features/teacher/delivery/delivery.css';
import '@/features/teacher/teaching-assessment-support/assessment-support.css';

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

const TABS: TeacherAssessmentSupportTab[] = [
  'objectives',
  'matrix',
  'difficulties',
  'decisions',
  'groups',
  'plans',
  'reassessments',
];

export function TeacherAssessmentSupportPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsed = parseTeacherAssessmentSupportQuery(searchParams);

  const [selection, setSelection] = useState<AcademicContextSelection>(() => ({
    ...EMPTY_SELECTION,
    classId: parsed.classId,
    subjectId: parsed.subjectId,
    academicYearId: parsed.academicYearId,
  }));
  const [tab, setTab] = useState<TeacherAssessmentSupportTab>(
    (parsed.tab as TeacherAssessmentSupportTab) || 'matrix',
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = parseTeacherAssessmentSupportQuery(searchParams);
    setSelection((prev) => ({
      ...prev,
      classId: next.classId,
      subjectId: next.subjectId,
      academicYearId: next.academicYearId || prev.academicYearId,
    }));
    setTab((next.tab as TeacherAssessmentSupportTab) || 'matrix');
    setHydrated(true);
  }, [searchParams]);

  const contextReady = Boolean(
    selection.academicYearId && selection.classId && selection.subjectId,
  );
  const contextIds = useMemo(() => {
    if (!contextReady) return null;
    return {
      academicYearId: Number(selection.academicYearId),
      classId: Number(selection.classId),
      subjectId: Number(selection.subjectId),
    };
  }, [contextReady, selection.academicYearId, selection.classId, selection.subjectId]);

  const data = useTeacherAssessmentSupport({
    context: contextIds,
    enabled: contextReady,
    tab,
  });

  function syncUrl(nextSelection: AcademicContextSelection, nextTab: TeacherAssessmentSupportTab) {
    router.replace(
      buildTeacherAssessmentSupportHref({
        classId: nextSelection.classId,
        subjectId: nextSelection.subjectId,
        academicYearId: nextSelection.academicYearId,
        tab: nextTab,
        returnTo: parsed.returnTo,
      }),
      { scroll: false },
    );
  }

  function handleSelectionChange(next: AcademicContextSelection) {
    setSelection(next);
    if (hydrated) syncUrl(next, tab);
  }

  function handleTab(next: TeacherAssessmentSupportTab) {
    setTab(next);
    if (hydrated) syncUrl(selection, next);
  }

  const anyForbidden =
    data.matrix.error?.code === 'permission_denied' ||
    data.objectives.error?.code === 'permission_denied' ||
    data.scale.error?.code === 'permission_denied';

  return (
    <div className="teacher-workspace tas-page">
      <TeacherPageHeader
        title={t('teacher.teachingAssessmentSupport.title')}
        subtitle={t('teacher.teachingAssessmentSupport.subtitle')}
        actions={
          <div className="tas-page__header-actions">
            {parsed.returnTo ? (
              <Link href={parsed.returnTo} className="btn btn--ghost">
                {t('teacher.teachingAssessmentSupport.back')}
              </Link>
            ) : (
              <Link href="/teacher/teaching/planning" className="btn btn--ghost">
                {t('teacher.teachingAssessmentSupport.toPlanning')}
              </Link>
            )}
          </div>
        }
      />

      <TeacherWorkspaceCard>
        <AcademicContextFilters
          audience="teacher"
          scope="teaching_planning"
          layout="compact"
          selection={selection}
          onSelectionChange={handleSelectionChange}
          showAcademicYear
          showClass
          showSubject
          showOffering={false}
          showTeachingLanguage={false}
          classBeforeSubject
          requiredFields={['academicYear', 'class', 'subject']}
        />
        {!contextReady ? (
          <EmptyState
            title={t('teacher.teachingAssessmentSupport.needContextTitle')}
            description={t('teacher.teachingAssessmentSupport.needContextDesc')}
          />
        ) : null}
      </TeacherWorkspaceCard>

      {contextReady ? (
        <>
          <div className="tas-tabs" role="tablist" aria-label={t('teacher.teachingAssessmentSupport.tabsLabel')}>
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'tas-tabs__btn is-active' : 'tas-tabs__btn'}
                onClick={() => handleTab(id)}
              >
                {t(`teacher.teachingAssessmentSupport.tabs.${id}`)}
              </button>
            ))}
          </div>

          {anyForbidden ? (
            <PermissionDeniedState description={t('teacher.teachingAssessmentSupport.errors.forbidden')} />
          ) : null}

          {!anyForbidden && tab === 'objectives' ? (
            <TeacherWorkspaceCard>
              {data.objectives.loading ? <LoadingState /> : null}
              {data.objectives.error && !data.objectives.loading ? (
                <ApiErrorView error={data.objectives.error} onRetry={() => void data.reload()} />
              ) : null}
              {!data.objectives.loading &&
              !data.objectives.error &&
              (data.objectives.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title={t('teacher.teachingAssessmentSupport.objectives.emptyTitle')}
                  description={t('teacher.teachingAssessmentSupport.objectives.emptyDesc')}
                />
              ) : null}
              <ul className="tas-list">
                {(data.objectives.data ?? []).map((obj) => (
                  <li key={obj.id} className="tas-list__item">
                    <div dir="auto">
                      {obj.code ? <strong>{obj.code}</strong> : null} {obj.name}
                    </div>
                    {obj.state ? (
                      <span className="tas-chip">{t(masteryStateMessageKey(obj.state))}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </TeacherWorkspaceCard>
          ) : null}

          {!anyForbidden && tab === 'matrix' && contextIds ? (
            <TeacherWorkspaceCard>
              <MasteryMatrixPanel
                matrix={data.matrix.data}
                scale={data.scale.data}
                loading={data.matrix.loading || data.scale.loading}
                error={data.matrix.error ?? data.scale.error}
                context={contextIds}
                onSaved={() => void data.reload()}
              />
            </TeacherWorkspaceCard>
          ) : null}

          {!anyForbidden && tab === 'difficulties' ? (
            <TeacherWorkspaceCard>
              <p className="tas-hint">{t('teacher.teachingAssessmentSupport.difficulty.manualHint')}</p>
              {data.difficulties.loading ? <LoadingState /> : null}
              {data.difficulties.error ? (
                <ApiErrorView error={data.difficulties.error} onRetry={() => void data.reload()} />
              ) : null}
              {!data.difficulties.loading &&
              !data.difficulties.error &&
              (data.difficulties.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title={t('teacher.teachingAssessmentSupport.difficulty.emptyTitle')}
                  description={t('teacher.teachingAssessmentSupport.difficulty.emptyDesc')}
                />
              ) : null}
              <ul className="tas-list">
                {(data.difficulties.data ?? []).map((row) => (
                  <li key={row.id} className="tas-list__item">
                    <div dir="auto">{row.student_name ?? t('common.dash')}</div>
                    <span className="tas-chip">{t(masteryStateMessageKey(row.state))}</span>
                    {row.interpretation_text ? (
                      <p dir="auto" className="tas-muted">
                        {row.interpretation_text}
                      </p>
                    ) : null}
                    {row.recorded_at ? (
                      <NumericText variant="date">{row.recorded_at}</NumericText>
                    ) : null}
                  </li>
                ))}
              </ul>
            </TeacherWorkspaceCard>
          ) : null}

          {!anyForbidden && tab === 'decisions' ? (
            <TeacherWorkspaceCard>
              <p className="tas-hint">{t('teacher.teachingAssessmentSupport.decision.noProgressHint')}</p>
              {data.decisions.loading ? <LoadingState /> : null}
              {data.decisions.error ? (
                <ApiErrorView error={data.decisions.error} onRetry={() => void data.reload()} />
              ) : null}
              {!data.decisions.loading &&
              !data.decisions.error &&
              (data.decisions.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title={t('teacher.teachingAssessmentSupport.decision.emptyTitle')}
                  description={t('teacher.teachingAssessmentSupport.decision.emptyDesc')}
                />
              ) : null}
              <ul className="tas-list">
                {(data.decisions.data ?? []).map((row) => (
                  <li key={row.id} className="tas-list__item">
                    <div dir="auto">{row.student_name ?? t('common.dash')}</div>
                    <span className="tas-chip">
                      {t(supportDecisionTypeMessageKey(row.decision_type))}
                    </span>
                    <span className="tas-chip">{t(masteryStateMessageKey(row.state))}</span>
                  </li>
                ))}
              </ul>
            </TeacherWorkspaceCard>
          ) : null}

          {!anyForbidden && tab === 'groups' ? (
            <TeacherWorkspaceCard>
              {data.groups.loading ? <LoadingState /> : null}
              {data.groups.error ? (
                <ApiErrorView error={data.groups.error} onRetry={() => void data.reload()} />
              ) : null}
              {!data.groups.loading &&
              !data.groups.error &&
              (data.groups.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title={t('teacher.teachingAssessmentSupport.groups.emptyTitle')}
                  description={t('teacher.teachingAssessmentSupport.groups.emptyDesc')}
                />
              ) : null}
              <ul className="tas-list">
                {(data.groups.data ?? []).map((row) => (
                  <li key={row.id} className="tas-list__item">
                    <div dir="auto">{row.name}</div>
                    <span className="tas-chip">{t(masteryStateMessageKey(row.state))}</span>
                    {row.active_member_count != null ? (
                      <span>
                        {t('teacher.teachingAssessmentSupport.groups.activeMembers')}:{' '}
                        <NumericText>{row.active_member_count}</NumericText>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </TeacherWorkspaceCard>
          ) : null}

          {!anyForbidden && tab === 'plans' ? (
            <TeacherWorkspaceCard>
              <p className="tas-hint">{t('teacher.teachingAssessmentSupport.plans.completionHint')}</p>
              {data.plans.loading ? <LoadingState /> : null}
              {data.plans.error ? (
                <ApiErrorView error={data.plans.error} onRetry={() => void data.reload()} />
              ) : null}
              {!data.plans.loading &&
              !data.plans.error &&
              (data.plans.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title={t('teacher.teachingAssessmentSupport.plans.emptyTitle')}
                  description={t('teacher.teachingAssessmentSupport.plans.emptyDesc')}
                />
              ) : null}
              <ul className="tas-list">
                {(data.plans.data ?? []).map((plan) => {
                  const sessionHref = supportPlanSessionHref(
                    plan,
                    '/teacher/teaching/assessment-support',
                  );
                  return (
                    <li key={plan.id} className="tas-list__item">
                      <div dir="auto">
                        {t(supportPlanTypeMessageKey(plan.plan_type))} —{' '}
                        {plan.student_name ?? t('common.dash')}
                      </div>
                      <span className="tas-chip">{t(masteryStateMessageKey(plan.state))}</span>
                      {sessionHref ? (
                        <Link href={sessionHref} className="btn btn--ghost btn--sm">
                          {t('teacher.teachingAssessmentSupport.plans.openSession')}
                        </Link>
                      ) : (
                        <span className="tas-muted">
                          {t('teacher.teachingAssessmentSupport.plans.waitingSchedule')}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </TeacherWorkspaceCard>
          ) : null}

          {!anyForbidden && tab === 'reassessments' ? (
            <TeacherWorkspaceCard>
              <p className="tas-hint">{t('teacher.teachingAssessmentSupport.reassessment.keepsOriginal')}</p>
              {data.reassessments.loading ? <LoadingState /> : null}
              {data.reassessments.error ? (
                <ApiErrorView error={data.reassessments.error} onRetry={() => void data.reload()} />
              ) : null}
              {!data.reassessments.loading &&
              !data.reassessments.error &&
              (data.reassessments.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title={t('teacher.teachingAssessmentSupport.reassessment.emptyTitle')}
                  description={t('teacher.teachingAssessmentSupport.reassessment.emptyDesc')}
                />
              ) : null}
              <ul className="tas-list">
                {(data.reassessments.data ?? []).map((row) => {
                  const trendKey = reassessmentTrendMessageKey(
                    row.before?.mastery_level_id,
                    row.after?.mastery_level_id,
                  );
                  return (
                    <li key={row.id} className="tas-list__item">
                      <div dir="auto">{row.student_name ?? t('common.dash')}</div>
                      <span className="tas-chip">
                        {t(reassessmentOutcomeMessageKey(row.outcome))}
                      </span>
                      <span className="tas-muted">
                        {t('teacher.teachingAssessmentSupport.reassessment.originalId')}:{' '}
                        {row.original_observation_id != null ? (
                          <NumericText>{row.original_observation_id}</NumericText>
                        ) : (
                          t('common.dash')
                        )}
                      </span>
                      {trendKey ? (
                        <span className="tas-chip">{t(trendKey)}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </TeacherWorkspaceCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
