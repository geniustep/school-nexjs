'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Admin operational curriculum progress for one class/offering context.
 * No teacher ranking. Progress values come from Backend only.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, SectionHead, StatCard } from '@/components/ui/primitives';
import { NumericText } from '@/components/ui/numeric-text';
import {
  ApiErrorView,
  EmptyState,
  LoadingState,
  PermissionDeniedState,
} from '@/components/states/states';
import { AcademicContextFilters } from '@/features/academic-context';
import { fetchAdminTeachingProgressSummary } from '@/features/admin/teaching-planning/api/teaching-progress-admin-api';
import { useT } from '@/features/i18n/locale-context';
import {
  displayProgressPercentage,
  resolveCurriculumPlanState,
} from '@/features/teaching-progress/progress-plan-state';
import { suggestionReasonMessageKey } from '@/features/teaching-progress/suggestion-reason';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { ApiErrorBody } from '@/types/api';
import type { TeachingProgressSummary } from '@/types/teaching-delivery';

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

export function TeachingCurriculumProgressPanel() {
  const t = useT();
  const [selection, setSelection] = useState<AcademicContextSelection>(EMPTY_SELECTION);
  const [summary, setSummary] = useState<TeachingProgressSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const contextReady = Boolean(selection.classId);

  useEffect(() => {
    if (!contextReady) {
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSummary(null);
    fetchAdminTeachingProgressSummary({
      class_id: Number(selection.classId),
      offering_id: selection.offeringId ? Number(selection.offeringId) : undefined,
      teaching_offering_id: selection.offeringId ? Number(selection.offeringId) : undefined,
      academic_year_id: selection.academicYearId
        ? Number(selection.academicYearId)
        : undefined,
    }).then((res) => {
      if (cancelled) return;
      if (res.success) setSummary(res.data);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selection.classId, selection.offeringId, selection.academicYearId, contextReady]);

  const denied = error?.code === 'permission_denied' || error?.code === 'forbidden';
  const planState = resolveCurriculumPlanState(summary);
  const percentage = displayProgressPercentage(summary);

  return (
    <Card>
      <SectionHead title={t('admin.teachingPlanning.progress.curriculumTitle')} />
      <AcademicContextFilters
        audience="admin"
        scope="teaching_planning"
        layout="compact"
        showAcademicYear
        showClass
        showSubject
        showOffering
        classBeforeSubject
        requiredFields={['class']}
        selection={selection}
        onSelectionChange={setSelection}
      />

      {!contextReady ? (
        <EmptyState
          icon="📈"
          title={t('admin.teachingPlanning.progress.selectContextTitle')}
          description={t('admin.teachingPlanning.progress.selectContextDesc')}
        />
      ) : denied ? (
        <PermissionDeniedState description={t('admin.pageForbidden')} />
      ) : loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error ? (
        <ApiErrorView error={error} />
      ) : planState === 'no_active_plan' ? (
        <EmptyState
          icon="📘"
          title={t('admin.teachingPlanning.progress.noActivePlan')}
          description={t('admin.teachingPlanning.progress.noActivePlanDesc')}
        />
      ) : summary ? (
        <>
          <div className="tp-list__stats grid grid--stats" style={{ marginBlockStart: 12 }}>
            <StatCard
              label={t('admin.teachingPlanning.progress.programProgress')}
              value={percentage != null ? `${percentage}%` : '—'}
              tone="blue"
            />
            <StatCard
              label={t('admin.teachingPlanning.progress.buckets.completed')}
              value={summary.completed_items ?? 0}
              tone="green"
            />
            <StatCard
              label={t('admin.teachingPlanning.progress.buckets.partial')}
              value={summary.partial_items ?? 0}
              tone="amber"
            />
            <StatCard
              label={t('admin.teachingPlanning.progress.buckets.deferred')}
              value={summary.deferred_items ?? 0}
            />
            <StatCard
              label={t('admin.teachingPlanning.progress.buckets.remaining')}
              value={summary.remaining_items ?? 0}
            />
            <StatCard
              label={t('admin.teachingPlanning.progress.documentationGaps')}
              value={summary.undocumented_past_sessions ?? 0}
              tone={(summary.undocumented_past_sessions ?? 0) > 0 ? 'amber' : 'none'}
            />
          </div>

          {summary.last_confirmed_delivery ? (
            <p className="muted" style={{ marginBlockStart: 12 }}>
              {t('admin.teachingPlanning.progress.lastConfirmed')}:{' '}
              <NumericText variant="date">
                {summary.last_confirmed_delivery.session_date ?? t('common.dash')}
              </NumericText>
            </p>
          ) : null}

          {summary.suggested_next_item ? (
            <p style={{ marginBlockStart: 8 }} dir="auto">
              <strong>{t('admin.teachingPlanning.progress.suggestedNext')}: </strong>
              {summary.suggested_next_item.title ??
                summary.suggested_next_item.name ??
                t('common.dash')}
              <br />
              <span className="muted">
                {t(suggestionReasonMessageKey(summary.suggestion_reason))}
              </span>
            </p>
          ) : planState === 'plan_completed' ? (
            <p className="muted" style={{ marginBlockStart: 8 }}>
              {t(suggestionReasonMessageKey('plan_completed'))}
            </p>
          ) : null}

          {summary.context?.class_id ? (
            <p style={{ marginBlockStart: 12 }}>
              <Link
                className="btn btn--ghost btn--sm"
                href={`/admin/teaching-planning/progress?class_id=${summary.context.class_id}${
                  summary.context.teaching_offering_id
                    ? `&offering_id=${summary.context.teaching_offering_id}`
                    : ''
                }`}
              >
                {t('admin.teachingPlanning.progress.viewContextDetails')}
              </Link>
            </p>
          ) : null}

          {(summary.undocumented_past_sessions ?? 0) > 0 ? (
            <p className="alert alert--warning" role="status" style={{ marginBlockStart: 8 }}>
              <Badge tone="amber">{t('admin.teachingPlanning.progress.needsDocumentation')}</Badge>{' '}
              {t('admin.teachingPlanning.progress.documentationGapsHint')}
            </p>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
