'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 *
 * Teacher curriculum planning & progress — operational program list (P0/P1).
 * Progress / remaining / suggestion are Backend SoT (Odoo 219).
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
import {
  mergeTeacherProgramItems,
  type TeacherProgramItemView,
} from '@/features/teaching-progress/merge-program-items';
import { buildTeacherAssessmentSupportHref } from '@/features/teaching-assessment-support/assessment-support-url';
import {
  buildTeacherPlanningHref,
  parseTeacherPlanningQuery,
} from '@/features/teaching-progress/planning-url';
import {
  getTeacherProgramItemPrimaryAction,
  getTeacherProgramItemSecondaryActions,
  type TeacherProgramPrimaryAction,
  type TeacherProgramSecondaryAction,
} from '@/features/teaching-progress/program-item-primary-action';
import { submitTeacherExecutionDecision } from '@/features/teacher/teaching-progress/api/teacher-curriculum-progress-api';
import { TeachingNextItemDecisionDialog } from '@/features/teacher/teaching-progress/components/teaching-next-item-decision-dialog';
import { TeacherProgramItemActionsMenu } from '@/features/teacher/teaching-progress/components/teacher-program-item-actions-menu';
import { TeacherProgramItemDetailsDialog } from '@/features/teacher/teaching-progress/components/teacher-program-item-details-dialog';
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

function statusLabel(
  item: TeacherProgramItemView,
  t: (key: string) => string,
): string {
  if (item.completed) return t('teacher.teachingProgress.buckets.completed');
  if (item.is_partial) return t('teacher.teachingProgress.buckets.partial');
  if (item.postponed) return t('teacher.teachingProgress.buckets.deferred');
  return t('teacher.teachingProgress.buckets.notStarted');
}

export function TeacherTeachingPlanningPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlClassId = searchParams.get('class_id') ?? '';
  const urlOfferingId = searchParams.get('offering_id') ?? '';
  const urlAcademicYearId = searchParams.get('academic_year_id') ?? '';
  const urlReturnTo = searchParams.get('return_to');
  const parsed = parseTeacherPlanningQuery({
    get: (name: string) => {
      if (name === 'class_id') return urlClassId || null;
      if (name === 'offering_id') return urlOfferingId || null;
      if (name === 'academic_year_id') return urlAcademicYearId || null;
      if (name === 'return_to') return urlReturnTo;
      return null;
    },
  });

  const [selection, setSelection] = useState<AcademicContextSelection>(() => ({
    ...EMPTY_SELECTION,
    classId: parsed.classId,
    offeringId: parsed.offeringId,
    academicYearId: parsed.academicYearId,
  }));
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);

  useEffect(() => {
    const next = parseTeacherPlanningQuery({
      get: (name: string) => {
        if (name === 'class_id') return urlClassId || null;
        if (name === 'offering_id') return urlOfferingId || null;
        if (name === 'academic_year_id') return urlAcademicYearId || null;
        if (name === 'return_to') return urlReturnTo;
        return null;
      },
    });
    setSelection((prev) => {
      if (
        prev.classId === next.classId &&
        prev.offeringId === next.offeringId &&
        (next.academicYearId === '' || prev.academicYearId === next.academicYearId)
      ) {
        return prev;
      }
      return {
        ...prev,
        classId: next.classId,
        offeringId: next.offeringId,
        academicYearId: next.academicYearId || prev.academicYearId,
      };
    });
    setHydratedFromUrl(true);
  }, [urlClassId, urlOfferingId, urlAcademicYearId, urlReturnTo]);

  const contextReady = Boolean(selection.classId && selection.offeringId);
  const progress = useTeacherCurriculumProgress({
    classId: selection.classId,
    offeringId: selection.offeringId,
    academicYearId: selection.academicYearId,
    enabled: contextReady,
  });

  const [dialogMode, setDialogMode] = useState<
    'select_alternative' | 'postpone_item' | 'choose_postponed' | null
  >(null);
  const [dialogInitialLineId, setDialogInitialLineId] = useState<number | null>(null);
  const [detailsItem, setDetailsItem] = useState<TeacherProgramItemView | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionLive, setDecisionLive] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const summary = progress.summary;
  const nextItem = progress.nextItem;
  const planState = resolveCurriculumPlanState(summary);
  const percentage = displayProgressPercentage(summary);
  const suggestion = nextItem?.suggestion ?? summary?.suggested_next_item ?? null;
  const suggestionReason =
    nextItem?.suggestion_reason ?? summary?.suggestion_reason ?? null;
  const allowedActions = nextItem?.allowed_actions ?? null;
  const currentDecision = nextItem?.current_decision ?? nextItem?.decision ?? null;

  const programLines = useMemo(
    () =>
      mergeTeacherProgramItems({
        remaining: progress.remaining,
        summaryLines: summary?.lines,
        suggestionLineId: suggestion?.distribution_line_id ?? null,
        postponedItems: nextItem?.postponed_items,
      }),
    [progress.remaining, summary?.lines, suggestion?.distribution_line_id, nextItem?.postponed_items],
  );

  const decisionCandidates = useMemo(() => {
    if ((nextItem?.candidates?.length ?? 0) > 0) return nextItem!.candidates;
    return programLines;
  }, [nextItem, programLines]);

  const denied =
    progress.error?.code === 'permission_denied' || progress.error?.code === 'forbidden';

  const lastDelivery = summary?.last_confirmed_delivery ?? null;
  const undocumented = summary?.undocumented_past_sessions ?? 0;
  const classIdNum = Number(selection.classId);
  const offeringIdNum = Number(selection.offeringId);

  function syncUrl(next: AcademicContextSelection) {
    const href = buildTeacherPlanningHref({
      classId: next.classId,
      offeringId: next.offeringId,
      academicYearId: next.academicYearId,
      returnTo: parsed.returnTo,
    });
    router.replace(href, { scroll: false });
  }

  function handleSelectionChange(next: AcademicContextSelection) {
    setSelection(next);
    if (hydratedFromUrl) syncUrl(next);
  }

  async function runDecision(
    decisionType: 'accept_suggestion' | 'choose_postponed',
    lineId: number,
  ) {
    if (decisionBusy || !contextReady) return;
    setDecisionBusy(true);
    setDecisionError(null);
    setDecisionLive('');
    const res = await submitTeacherExecutionDecision({
      decision_type: decisionType,
      class_id: classIdNum,
      offering_id: offeringIdNum,
      distribution_line_id: lineId,
      selected_distribution_line_id: lineId,
      suggested_distribution_line_id: suggestion?.distribution_line_id ?? undefined,
      reason: null,
    });
    setDecisionBusy(false);
    if (!res.success) {
      const code = res.error?.code ?? '';
      if (code === 'permission_denied' || code === 'forbidden') {
        setDecisionError(t('teacher.teachingProgress.decision.forbidden'));
      } else if (code.includes('conflict') || code.includes('validation')) {
        setDecisionError(t('teacher.teachingProgress.decision.conflict'));
      } else {
        setDecisionError(res.error?.message ?? t('teacher.teachingProgress.decision.failed'));
      }
      return;
    }
    setDecisionLive(t('teacher.teachingProgress.decision.saved'));
    progress.reload();
  }

  function primaryFor(item: TeacherProgramItemView): TeacherProgramPrimaryAction {
    return getTeacherProgramItemPrimaryAction({
      item,
      allowedActions,
      classId: classIdNum,
      offeringId: offeringIdNum,
      currentDecision,
    });
  }

  function handlePrimary(item: TeacherProgramItemView, primary: TeacherProgramPrimaryAction) {
    if (primary.kind === 'view_details' || primary.kind === 'waiting_for_schedule') {
      setDetailsItem(item);
      return;
    }
    if (primary.decisionType === 'accept_suggestion') {
      void runDecision('accept_suggestion', item.distribution_line_id);
      return;
    }
    if (primary.decisionType === 'choose_postponed') {
      void runDecision('choose_postponed', item.distribution_line_id);
      return;
    }
    if (primary.href) {
      router.push(primary.href);
    }
  }

  function handleSecondary(item: TeacherProgramItemView, action: TeacherProgramSecondaryAction) {
    if (action.openDetails) {
      setDetailsItem(item);
      return;
    }
    if (action.decisionType === 'accept_suggestion') {
      void runDecision('accept_suggestion', item.distribution_line_id);
      return;
    }
    if (action.decisionType === 'choose_postponed') {
      void runDecision('choose_postponed', item.distribution_line_id);
      return;
    }
    if (action.decisionType === 'select_alternative') {
      setDialogInitialLineId(null);
      setDialogMode('select_alternative');
      return;
    }
    if (action.decisionType === 'postpone_item') {
      setDialogInitialLineId(item.distribution_line_id);
      setDialogMode('postpone_item');
      return;
    }
    if (action.href) router.push(action.href);
  }

  const suggestionPrimary = suggestion
    ? getTeacherProgramItemPrimaryAction({
        item: {
          ...suggestion,
          is_suggested: true,
        },
        allowedActions,
        classId: classIdNum,
        offeringId: offeringIdNum,
        currentDecision,
      })
    : null;

  const showAcceptOnCard =
    Boolean(suggestion) &&
    allowedActions?.accept_suggestion &&
    !suggestion?.completed &&
    suggestionPrimary?.kind === 'accept_suggestion';

  return (
    <div className="teacher-workspace">
      <TeacherPageHeader
        title={t('teacher.teachingProgress.planningTitle')}
        subtitle={t('teacher.teachingProgress.planningSubtitle')}
        actions={
          <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {parsed.returnTo ? (
              <Link className="btn btn--ghost btn--sm" href={parsed.returnTo}>
                {t('teacher.teachingProgress.backToReturn')}
              </Link>
            ) : null}
            <Link className="btn btn--ghost btn--sm" href="/teacher/dashboard">
              {t('teacher.teachingProgress.goToday')}
            </Link>
            <Link
              className="btn btn--ghost btn--sm"
              href={buildTeacherAssessmentSupportHref({
                classId: selection.classId,
                subjectId: selection.subjectId,
                academicYearId: selection.academicYearId,
                returnTo: '/teacher/teaching/planning',
              })}
            >
              {t('teacher.teachingAssessmentSupport.openFromPlanning')}
            </Link>
          </span>
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
          onSelectionChange={handleSelectionChange}
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

          {decisionError ? (
            <p className="alert alert--danger" role="alert">
              {decisionError}
            </p>
          ) : null}
          <div aria-live="polite" className="teacher-program-live">
            {decisionLive}
          </div>

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
              suggestion && allowedActions?.select_alternative !== false ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setDialogInitialLineId(null);
                    setDialogMode('select_alternative');
                  }}
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
                {suggestion.latest_postponement_reason ? (
                  <p dir="auto">
                    <span className="muted">{t('teacher.teachingProgress.postponementReason')}: </span>
                    {suggestion.latest_postponement_reason}
                  </p>
                ) : null}
                {suggestion.is_partial ? (
                  <Badge tone="amber">{t('teacher.teachingProgress.buckets.partial')}</Badge>
                ) : null}
                <div className="row" style={{ gap: 8, marginBlockStart: 12, flexWrap: 'wrap' }}>
                  {showAcceptOnCard ? (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={decisionBusy}
                      onClick={() =>
                        void runDecision('accept_suggestion', suggestion.distribution_line_id)
                      }
                    >
                      {decisionBusy
                        ? t('common.submitting')
                        : t('teacher.teachingProgress.actions.acceptSuggestion')}
                    </button>
                  ) : null}
                  {allowedActions?.postpone_item ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setDialogInitialLineId(suggestion.distribution_line_id);
                        setDialogMode('postpone_item');
                      }}
                    >
                      {t('teacher.teachingProgress.decision.postponeAction')}
                    </button>
                  ) : null}
                  {suggestion.postponed && allowedActions?.choose_postponed ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={decisionBusy}
                      onClick={() =>
                        void runDecision('choose_postponed', suggestion.distribution_line_id)
                      }
                    >
                      {t('teacher.teachingProgress.actions.choosePostponed')}
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
            {progress.remainingError && programLines.length === 0 ? (
              <ApiErrorView error={progress.remainingError} onRetry={progress.reload} />
            ) : programLines.length === 0 ? (
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
                      <th scope="col">{t('teacher.teachingProgress.columns.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programLines.map((line) => {
                      const primary = primaryFor(line);
                      const secondary = getTeacherProgramItemSecondaryActions({
                        item: line,
                        allowedActions,
                        classId: classIdNum,
                        offeringId: offeringIdNum,
                        currentDecision,
                        primary,
                      });
                      const plannedUnits =
                        (line.delivered_session_units ?? 0) + (line.remaining_units ?? 0);
                      const interactive =
                        primary.kind !== 'none' && primary.kind !== 'waiting_for_schedule';
                      return (
                        <tr
                          key={line.distribution_line_id}
                          className={interactive ? 'teacher-program-row--interactive' : undefined}
                          tabIndex={interactive ? 0 : undefined}
                          onClick={() => {
                            if (primary.kind === 'waiting_for_schedule') {
                              setDetailsItem(line);
                              return;
                            }
                            handlePrimary(line, primary);
                          }}
                          onKeyDown={(event) => {
                            if (!interactive && primary.kind !== 'waiting_for_schedule') return;
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              if (primary.kind === 'waiting_for_schedule') setDetailsItem(line);
                              else handlePrimary(line, primary);
                            }
                          }}
                        >
                          <td>
                            <NumericText>{line.sequence_order ?? t('common.dash')}</NumericText>
                          </td>
                          <td dir="auto">
                            <div>{itemLabel(line, t('common.dash'))}</div>
                            {line.latest_postponement_reason ? (
                              <div className="muted" style={{ fontSize: '0.85em' }} dir="auto">
                                {t('teacher.teachingProgress.postponementReason')}:{' '}
                                {line.latest_postponement_reason.length > 80
                                  ? `${line.latest_postponement_reason.slice(0, 80)}…`
                                  : line.latest_postponement_reason}
                              </div>
                            ) : null}
                            {line.is_suggested ? (
                              <Badge tone="blue">{t('teacher.teachingProgress.suggestedBadge')}</Badge>
                            ) : null}
                          </td>
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
                                {statusLabel(line, t)}
                              </Badge>
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                              {primary.kind === 'waiting_for_schedule' ? (
                                <span className="muted">{t(primary.labelKey)}</span>
                              ) : primary.href ? (
                                <Link
                                  className="btn btn--primary btn--sm"
                                  href={primary.href}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {t(primary.labelKey)}
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn--primary btn--sm"
                                  disabled={decisionBusy}
                                  onClick={() => handlePrimary(line, primary)}
                                >
                                  {decisionBusy &&
                                  (primary.decisionType === 'accept_suggestion' ||
                                    primary.decisionType === 'choose_postponed')
                                    ? t('common.submitting')
                                    : t(primary.labelKey)}
                                </button>
                              )}
                              <TeacherProgramItemActionsMenu
                                actions={secondary}
                                onAction={(action) => handleSecondary(line, action)}
                              />
                            </div>
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
          candidates={
            dialogMode === 'choose_postponed'
              ? decisionCandidates.filter((c) => c.postponed)
              : decisionCandidates
          }
          suggestedLineId={suggestion?.distribution_line_id ?? null}
          initialLineId={dialogInitialLineId}
          onClose={() => {
            setDialogMode(null);
            setDialogInitialLineId(null);
          }}
          onSuccess={() => progress.reload()}
        />
      ) : null}

      <TeacherProgramItemDetailsDialog
        open={Boolean(detailsItem)}
        item={detailsItem}
        primary={detailsItem ? primaryFor(detailsItem) : null}
        onClose={() => setDetailsItem(null)}
      />
    </div>
  );
}
