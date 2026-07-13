'use client';

import { useEffect, useState } from 'react';
import { EmptyState, LoadingState, PermissionDeniedState } from '@/components/states/states';
import { fetchAdminActualDelivery } from '@/features/admin/teaching-planning/api/actual-deliveries-admin-api';
import { fetchTeacherActualDelivery } from '@/features/teacher/delivery/api/teacher-delivery-api';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  TeachingPrintLayout,
  TeachingPrintMeta,
  TeachingPrintSection,
  TeachingPrintStatus,
  TeachingPrintTable,
  useTeachingPrintBranding,
} from '@/features/teaching-planning/print/components/teaching-print-layout';
import { dash, isDraftLikeState, named, printStatusTone } from '@/features/teaching-planning/print/utils/print-helpers';
import { canViewActualDeliveries } from '@/lib/permissions/teaching-planning';
import type { ActualDeliveryDetail } from '@/types/teaching-delivery';

export function ActualDeliveryPrintView({
  deliveryId,
  audience,
}: {
  deliveryId: string;
  audience: 'admin' | 'teacher';
}) {
  const t = useT();
  const user = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [item, setItem] = useState<ActualDeliveryDetail | null>(null);

  const backHref =
    audience === 'teacher'
      ? `/teacher/actual-deliveries/${deliveryId}`
      : `/admin/teaching-planning/actual-deliveries/${deliveryId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const runner =
      audience === 'teacher'
        ? fetchTeacherActualDelivery(deliveryId)
        : fetchAdminActualDelivery(deliveryId);
    runner
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          if (res.error.code === 'permission_denied' || res.error.code === 'forbidden') {
            setForbidden(true);
          } else setError(res.error.message);
          return;
        }
        setItem(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience, deliveryId]);

  const branding = useTeachingPrintBranding({
    audience,
    schoolName: item?.school?.name,
    academicYearLabel: item?.academic_year?.name,
    schoolCode: item?.school?.code ?? null,
  });

  if (audience === 'admin' && !canViewActualDeliveries(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (loading) return <LoadingState label={t('common.loading')} />;
  if (forbidden) return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  if (error || !item) {
    return (
      <EmptyState
        icon="🖨️"
        title={t('admin.teachingPlanning.print.error')}
        description={error ?? t('admin.teachingPlanning.print.noData')}
      />
    );
  }

  const stateKey = `admin.teachingPlanning.print.documentStates.${item.state}`;
  const reviewKey = `admin.teachingPlanning.jathatha.reviewStates.${item.review_state}`;

  return (
    <TeachingPrintLayout
      documentTitle={t('admin.teachingPlanning.print.documents.actualDelivery')}
      backHref={backHref}
      branding={branding}
      draftMark={isDraftLikeState(item.state)}
      revision={item.revision_no}
      statusNode={
        <>
          <TeachingPrintStatus
            state={item.state}
            label={t(stateKey) === stateKey ? item.state : t(stateKey)}
            tone={printStatusTone(item.state)}
          />
          <TeachingPrintStatus
            state={item.review_state}
            label={t(reviewKey) === reviewKey ? item.review_state : t(reviewKey)}
          />
        </>
      }
      showSignature
    >
      <TeachingPrintMeta
        items={[
          { label: t('admin.teachingPlanning.jathatha.columns.teacher'), value: named(item.teacher) },
          { label: t('admin.teachingPlanning.jathatha.columns.class'), value: named(item.class) },
          { label: t('admin.teachingPlanning.fields.subject'), value: named(item.subject) },
          { label: t('admin.teachingPlanning.jathatha.columns.offering'), value: named(item.offering) },
          {
            label: t('admin.teachingPlanning.delivery.columns.session'),
            value: [item.session_date, item.session_start_time, item.session_end_time]
              .filter(Boolean)
              .join(' ') || '—',
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.delivery.fields.actualDuration'),
            value: dash(item.actual_duration_minutes),
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.delivery.columns.completion'),
            value: `${dash(item.completion_state)} (${dash(item.completion_percent)}%)`,
            ltr: true,
          },
        ]}
      />

      <TeachingPrintSection title={t('admin.teachingPlanning.delivery.comparison.title')}>
        <div className="teaching-print__compare">
          <div className="teaching-print__compare-box">
            <h4>{t('admin.teachingPlanning.delivery.comparison.planned')}</h4>
            <p className="teaching-print__prose" dir="auto">
              {named(item.planned_distribution_line)}
            </p>
          </div>
          <div className="teaching-print__compare-box">
            <h4>{t('admin.teachingPlanning.delivery.comparison.delivered')}</h4>
            <p className="teaching-print__prose" dir="auto">
              {named(item.delivered_distribution_line)}
            </p>
            <p className="teaching-print__prose" dir="auto">
              {dash(item.delivered_title)}
            </p>
          </div>
        </div>
        {item.deviation_type && item.deviation_type !== 'none' ? (
          <p className="teaching-print__prose" dir="auto">
            {t('admin.teachingPlanning.print.deviation')}: {item.deviation_type}
            {item.deviation_reason ? ` — ${item.deviation_reason}` : ''}
          </p>
        ) : null}
      </TeachingPrintSection>

      {(
        [
          ['content_summary', item.content_summary],
          ['objective_achievement_summary', item.objective_achievement_summary],
          ['actual_pages_label', item.actual_pages_label],
          ['assessment_summary', item.assessment_summary],
          ['difficulties_observed', item.difficulties_observed],
          ['remediation_action', item.remediation_action],
          ['next_step', item.next_step],
          ['teacher_notes', item.teacher_notes],
          ['journal_text', item.journal_text],
          ['correction_reason', item.correction_reason],
          ['void_reason', item.void_reason],
        ] as const
      ).map(([key, value]) =>
        value ? (
          <TeachingPrintSection key={key} title={t(`admin.teachingPlanning.print.fields.${key}`)}>
            <p className="teaching-print__prose" dir="auto">
              {value}
            </p>
          </TeachingPrintSection>
        ) : null,
      )}

      <TeachingPrintSection title={t('admin.teachingPlanning.print.activities')}>
        <TeachingPrintTable
          columns={[
            { key: 'order', header: '#', ltr: true },
            { key: 'name', header: t('admin.teachingPlanning.distributions.columns.name') },
            { key: 'result', header: t('admin.teachingPlanning.print.resultState') },
            { key: 'duration', header: t('admin.teachingPlanning.print.duration'), ltr: true },
            { key: 'notes', header: t('admin.teachingPlanning.lines.notes') },
          ]}
          rows={item.activities.map((a) => ({
            order: a.sequence_order,
            name: a.name,
            result: a.result_state,
            duration: dash(a.actual_duration_minutes),
            notes: dash(a.notes, ''),
          }))}
        />
      </TeachingPrintSection>

      <TeachingPrintSection title={t('admin.teachingPlanning.delivery.journal.title')}>
        <p className="teaching-print__prose" dir="auto">
          {item.current_journal_entry_id != null
            ? `#${item.current_journal_entry_id}`
            : t('admin.teachingPlanning.delivery.journal.none')}
        </p>
      </TeachingPrintSection>

      <TeachingPrintSection title={t('admin.teachingPlanning.delivery.progressImpact.title')}>
        <p className="teaching-print__prose" dir="auto">
          {item.progress_summary?.summary ??
            ([
              item.progress_summary?.status,
              item.progress_summary?.coverage_percent != null
                ? `${item.progress_summary.coverage_percent}%`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || t('common.dash'))}
        </p>
      </TeachingPrintSection>

      {item.revision_history && item.revision_history.length > 0 ? (
        <TeachingPrintSection title={t('admin.teachingPlanning.print.revisionHistory')}>
          <TeachingPrintTable
            columns={[
              { key: 'rev', header: t('admin.teachingPlanning.print.revision'), ltr: true },
              { key: 'state', header: t('admin.teachingPlanning.print.documentStatus') },
              { key: 'reason', header: t('admin.teachingPlanning.print.correctionReason') },
            ]}
            rows={item.revision_history.map((rev) => ({
              rev: rev.revision_no,
              state: rev.state,
              reason: dash(rev.correction_reason ?? rev.void_reason, ''),
            }))}
          />
        </TeachingPrintSection>
      ) : null}
    </TeachingPrintLayout>
  );
}
