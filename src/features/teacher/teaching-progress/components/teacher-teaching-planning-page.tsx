'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 *
 * Teacher curriculum planning & progress — adopted extension of Teaching Workspace.
 * Progress / remaining / suggestion are Backend SoT (Odoo 219).
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { NumericText } from '@/components/ui/numeric-text';
import {
  ApiErrorView,
  EmptyState,
  LoadingState,
  PermissionDeniedState,
} from '@/components/states/states';
import { AcademicContextFilters } from '@/features/academic-context';
import { useT } from '@/features/i18n/locale-context';
import {
  displayProgressPercentage,
  hasActiveCurriculumPlan,
  resolveCurriculumPlanState,
} from '@/features/teaching-progress/progress-plan-state';
import { suggestionReasonMessageKey } from '@/features/teaching-progress/suggestion-reason';
import { TeachingNextItemDecisionDialog } from '@/features/teacher/teaching-progress/components/teaching-next-item-decision-dialog';
import { useTeacherCurriculumProgress } from '@/features/teacher/teaching-progress/hooks/use-teacher-curriculum-progress';
import {
  TeacherPageHeader,
  TeacherStatCard,
  TeacherWorkspaceCard,
} from '@/features/teacher/ui/teacher-primitives';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { TeachingRemainingItem } from '@/types/teaching-delivery';
import '@/features/teacher/delivery/delivery.css';

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

function itemLabel(item: TeachingRemainingItem | null | undefined, dash: string): string {
  if (!item) return dash;
  return item.title ?? item.name ?? dash;
}

export function TeacherTeachingPlanningPage() {
  const t = useT();
  const [selection, setSelection] = useState<AcademicContextSelection>(EMPTY_SELECTION);
  const contextReady = Boolean(selection.classId && selection.offeringId);
  const progress = useTeacherCurriculumProgress({
    classId: selection.classId,
    offeringId: selection.offeringId,
    academicYearId: selection.academicYearId,
    enabled: contextReady,
  });

  const [dialogMode, setDialogMode] = useState<'select_alternative' | 'postpone_item' | null>(
    null,
  );

  const summary = progress.summary;
  const nextItem = progress.nextItem;
  const planState = resolveCurriculumPlanState(summary);
  const percentage = displayProgressPercentage(summary);
  const suggestion = nextItem?.suggestion ?? summary?.suggested_next_item ?? null;
  const suggestionReason =
    nextItem?.suggestion_reason ?? summary?.suggestion_reason ?? null;
  const candidates = nextItem?.candidates ?? [];
  const programLines = useMemo(() => {
    if (candidates.length > 0) return candidates;
    return (summary?.lines ?? []).map((line) => ({
      distribution_line_id: line.distribution_line?.id ?? line.id,
      title: line.title ?? line.name,
      name: line.name ?? line.title,
      sequence_order: line.sequence_order,
      remaining_units: line.remaining_units,
      delivered_session_units: line.delivered_units,
      completion_status: line.status,
      completed: line.status === 'completed',
      is_partial:
        line.status === 'in_progress' ||
        (Boolean(line.delivered_units) && (line.remaining_units ?? 0) > 0),
      postponed: Boolean(line.delayed),
      eligibility: line.status !== 'completed',
    })) as TeachingRemainingItem[];
  }, [candidates, summary?.lines]);

  const denied =
    progress.error?.code === 'permission_denied' || progress.error?.code === 'forbidden';

  const lastDelivery = summary?.last_confirmed_delivery ?? null;
  const undocumented = summary?.undocumented_past_sessions ?? 0;

  return (
    <div className="teacher-workspace">
      <TeacherPageHeader
        title={t('teacher.teachingProgress.planningTitle')}
        subtitle={t('teacher.teachingProgress.planningSubtitle')}
        actions={
          <Link className="btn btn--ghost btn--sm" href="/teacher/dashboard">
            {t('teacher.teachingProgress.goToday')}
          </Link>
        }
      />

      <TeacherWorkspaceCard title={t('teacher.teachingProgress.contextTitle')}>
        <AcademicContextFilters
          audience="teacher"
          scope="teaching_planning"
          layout="compact"
          showAcademicYear
          showClass
          showSubject
          showOffering
          showTeachingLanguage
          classBeforeSubject
          requiredFields={['class', 'offering']}
          selection={selection}
          onSelectionChange={setSelection}
        />
      </TeacherWorkspaceCard>

      {!contextReady ? (
        <EmptyState
          icon="📋"
          title={t('teacher.teachingProgress.selectContextTitle')}
          description={t('teacher.teachingProgress.selectContextDesc')}
        />
      ) : denied ? (
        <PermissionDeniedState
          title={t('errors.forbiddenTitle')}
          description={t('teacher.teachingProgress.permissionDenied')}
        />
      ) : progress.loading ? (
        <LoadingState label={t('common.loading')} />
      ) : progress.error && !summary ? (
        <ApiErrorView error={progress.error} onRetry={progress.reload} />
      ) : planState === 'no_active_plan' ? (
        <EmptyState
          icon="📘"
          title={t('teacher.teachingProgress.noActivePlan')}
          description={t('teacher.teachingProgress.noActivePlanDesc')}
        />
      ) : (
        <>
          {progress.fetching ? (
            <p className="muted" aria-live="polite">
              {t('common.loading')}
            </p>
          ) : null}

          <div className="grid grid--stats">
            <TeacherStatCard
              label={t('teacher.teachingProgress.programProgress')}
              value={
                <NumericText>
                  {percentage != null ? `${percentage}%` : t('common.dash')}
                </NumericText>
              }
              tone="blue"
            />
            <TeacherStatCard
              label={t('teacher.teachingProgress.earnedUnits')}
              value={
                <NumericText>
                  {summary?.earned_units ?? 0}/{summary?.total_applicable_units ?? 0}
                </NumericText>
              }
            />
            <TeacherStatCard
              label={t('teacher.teachingProgress.buckets.completed')}
              value={<NumericText>{summary?.completed_items ?? 0}</NumericText>}
              tone="green"
            />
            <TeacherStatCard
              label={t('teacher.teachingProgress.buckets.partial')}
              value={<NumericText>{summary?.partial_items ?? 0}</NumericText>}
              tone="amber"
            />
            <TeacherStatCard
              label={t('teacher.teachingProgress.buckets.deferred')}
              value={<NumericText>{summary?.deferred_items ?? 0}</NumericText>}
            />
            <TeacherStatCard
              label={t('teacher.teachingProgress.buckets.notStarted')}
              value={<NumericText>{summary?.not_started_items ?? 0}</NumericText>}
            />
            <TeacherStatCard
              label={t('teacher.teachingProgress.buckets.remaining')}
              value={<NumericText>{summary?.remaining_items ?? 0}</NumericText>}
            />
          </div>

          {planState === 'plan_completed' ? (
            <p className="alert alert--success" role="status">
              {t(suggestionReasonMessageKey('plan_completed'))}
            </p>
          ) : null}

          <div className="grid grid--2" style={{ gap: 16, marginBlockStart: 16 }}>
            <TeacherWorkspaceCard title={t('teacher.teachingProgress.lastConfirmedTitle')}>
              {lastDelivery ? (
                <p>
                  <span className="muted">{t('teacher.teachingProgress.lastConfirmedDate')}: </span>
                  <NumericText variant="date">{lastDelivery.session_date ?? t('common.dash')}</NumericText>
                  <br />
                  <span className="muted">{t('teacher.teachingProgress.lastConfirmedItem')}: </span>
                  {lastDelivery.delivered_title ??
                    (lastDelivery.delivered_distribution_line_id
                      ? `#${lastDelivery.delivered_distribution_line_id}`
                      : t('common.dash'))}
                  {lastDelivery.completion_state ? (
                    <>
                      <br />
                      <Badge tone="slate">{lastDelivery.completion_state}</Badge>
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="muted">{t('teacher.teachingProgress.noLastConfirmed')}</p>
              )}
            </TeacherWorkspaceCard>

            <TeacherWorkspaceCard title={t('teacher.teachingProgress.documentationGapsTitle')}>
              <p>
                <NumericText>{undocumented}</NumericText>{' '}
                {t('teacher.teachingProgress.documentationGapsCount')}
              </p>
              {undocumented > 0 ? (
                <p>
                  <Link className="btn btn--ghost btn--sm" href="/teacher/dashboard">
                    {t('teacher.teachingProgress.goDocumentToday')}
                  </Link>
                </p>
              ) : (
                <p className="muted">{t('teacher.teachingProgress.documentationGapsNone')}</p>
              )}
            </TeacherWorkspaceCard>
          </div>

          <TeacherWorkspaceCard
            title={t('teacher.teachingProgress.suggestedNextTitle')}
            action={
              suggestion && nextItem?.allowed_actions?.select_alternative !== false ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setDialogMode('select_alternative')}
                >
                  {t('teacher.teachingProgress.chooseOther')}
                </button>
              ) : undefined
            }
          >
            {suggestion ? (
              <>
                <p>
                  <strong dir="auto">{itemLabel(suggestion, t('common.dash'))}</strong>
                  {suggestion.sequence_order != null ? (
                    <>
                      {' '}
                      <span className="muted">
                        ({t('teacher.teachingProgress.sequenceOrder')}{' '}
                        <NumericText>{suggestion.sequence_order}</NumericText>)
                      </span>
                    </>
                  ) : null}
                </p>
                <p className="muted" dir="auto">
                  {t(suggestionReasonMessageKey(suggestionReason))}
                </p>
                {suggestion.postponed ? (
                  <p className="alert alert--warning" role="status">
                    {t('teacher.teachingProgress.suggestionPostponedWarning')}
                  </p>
                ) : null}
                {suggestion.is_partial ? (
                  <Badge tone="amber">{t('teacher.teachingProgress.buckets.partial')}</Badge>
                ) : null}
                <div className="row" style={{ gap: 8, marginBlockStart: 12, flexWrap: 'wrap' }}>
                  {nextItem?.allowed_actions?.postpone_item ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setDialogMode('postpone_item')}
                    >
                      {t('teacher.teachingProgress.decision.postponeAction')}
                    </button>
                  ) : null}
                </div>
              </>
            ) : hasActiveCurriculumPlan(summary) && planState === 'plan_completed' ? (
              <p className="muted">{t(suggestionReasonMessageKey('plan_completed'))}</p>
            ) : (
              <p className="muted">{t('teacher.teachingProgress.noSuggestion')}</p>
            )}
          </TeacherWorkspaceCard>

          <TeacherWorkspaceCard title={t('teacher.teachingProgress.programListTitle')}>
            {programLines.length === 0 ? (
              <p className="muted">{t('teacher.teachingProgress.emptyProgram')}</p>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">{t('teacher.teachingProgress.columns.order')}</th>
                      <th scope="col">{t('teacher.teachingProgress.columns.item')}</th>
                      <th scope="col">{t('teacher.teachingProgress.columns.planned')}</th>
                      <th scope="col">{t('teacher.teachingProgress.columns.done')}</th>
                      <th scope="col">{t('teacher.teachingProgress.columns.remaining')}</th>
                      <th scope="col">{t('teacher.teachingProgress.columns.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programLines.map((line) => {
                      const statusText = line.completed
                        ? t('teacher.teachingProgress.buckets.completed')
                        : line.is_partial
                          ? t('teacher.teachingProgress.buckets.partial')
                          : line.postponed
                            ? t('teacher.teachingProgress.buckets.deferred')
                            : t('teacher.teachingProgress.buckets.notStarted');
                      const plannedUnits =
                        (line.delivered_session_units ?? 0) + (line.remaining_units ?? 0);
                      return (
                        <tr key={line.distribution_line_id}>
                          <td>
                            <NumericText>{line.sequence_order ?? t('common.dash')}</NumericText>
                          </td>
                          <td dir="auto">{itemLabel(line, t('common.dash'))}</td>
                          <td>
                            <NumericText>
                              {plannedUnits > 0 ? plannedUnits : t('common.dash')}
                            </NumericText>
                          </td>
                          <td>
                            <NumericText>{line.delivered_session_units ?? 0}</NumericText>
                          </td>
                          <td>
                            <NumericText>{line.remaining_units ?? 0}</NumericText>
                          </td>
                          <td>
                            <span className="badge-row">
                              <Badge
                                tone={
                                  line.completed
                                    ? 'green'
                                    : line.is_partial
                                      ? 'amber'
                                      : line.postponed
                                        ? 'slate'
                                        : 'blue'
                                }
                              >
                                {statusText}
                              </Badge>
                              {line.postponed ? (
                                <Badge tone="slate">
                                  {t('teacher.teachingProgress.buckets.deferred')}
                                </Badge>
                              ) : null}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TeacherWorkspaceCard>
        </>
      )}

      {dialogMode && selection.classId && selection.offeringId ? (
        <TeachingNextItemDecisionDialog
          open
          mode={dialogMode}
          classId={Number(selection.classId)}
          offeringId={Number(selection.offeringId)}
          candidates={candidates.length > 0 ? candidates : programLines}
          suggestedLineId={suggestion?.distribution_line_id ?? null}
          onClose={() => setDialogMode(null)}
          onSuccess={() => progress.reload()}
        />
      ) : null}
    </div>
  );
}
