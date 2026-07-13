'use client';

import { useEffect, useState } from 'react';
import { EmptyState, LoadingState, PermissionDeniedState } from '@/components/states/states';
import { fetchTeacherJathathaAdmin } from '@/features/admin/teaching-planning/api/teacher-jathathas-admin-api';
import { fetchTeacherJathatha } from '@/features/teacher/jathatha/api/teacher-jathatha-api';
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
import { canViewTeacherJathathas } from '@/lib/permissions/teaching-planning';
import type { TeacherJathathaDetail } from '@/types/jathatha';

export function TeacherJathathaPrintView({
  jathathaId,
  audience,
}: {
  jathathaId: string;
  audience: 'admin' | 'teacher';
}) {
  const t = useT();
  const user = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [item, setItem] = useState<TeacherJathathaDetail | null>(null);

  const backHref =
    audience === 'teacher'
      ? `/teacher/jathathas/${jathathaId}`
      : `/admin/teaching-planning/teacher-jathathas/${jathathaId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const runner =
      audience === 'teacher'
        ? fetchTeacherJathatha(jathathaId)
        : fetchTeacherJathathaAdmin(jathathaId);
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
  }, [audience, jathathaId]);

  const branding = useTeachingPrintBranding({
    audience,
    schoolName: item?.school?.name,
    academicYearLabel: item?.academic_year?.name,
    schoolCode: item?.school?.code ?? null,
  });

  if (audience === 'admin' && !canViewTeacherJathathas(user)) {
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

  const stateKey = `admin.teachingPlanning.jathatha.teacherStates.${item.state}`;
  const reviewKey = `admin.teachingPlanning.jathatha.reviewStates.${item.review_state}`;
  const stateLabel = t(stateKey);
  const reviewLabel = t(reviewKey);

  return (
    <TeachingPrintLayout
      documentTitle={t('admin.teachingPlanning.print.documents.teacherJathatha')}
      backHref={backHref}
      branding={branding}
      draftMark={isDraftLikeState(item.state)}
      revision={item.revision_number}
      statusNode={
        <>
          <TeachingPrintStatus
            state={item.state}
            label={stateLabel === stateKey ? item.state : stateLabel}
            tone={printStatusTone(item.state)}
          />
          <TeachingPrintStatus
            state={item.review_state}
            label={reviewLabel === reviewKey ? item.review_state : reviewLabel}
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
          { label: t('admin.teachingPlanning.print.sourceReferenceJathatha'), value: named(item.reference_jathatha) },
          {
            label: t('admin.teachingPlanning.delivery.columns.session'),
            value: [item.session_date, item.session_start_time, item.session_end_time]
              .filter(Boolean)
              .join(' ') || '—',
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.jathatha.columns.distributionLine'),
            value: named(item.distribution_line),
          },
          {
            label: t('admin.teachingPlanning.jathatha.columns.template'),
            value: named(item.session_template),
          },
          {
            label: t('admin.teachingPlanning.print.expectedDuration'),
            value: dash(item.planned_duration_minutes),
            ltr: true,
          },
        ]}
      />

      {item.correction_reason ? (
        <TeachingPrintSection title={t('admin.teachingPlanning.print.correctionReason')}>
          <p className="teaching-print__prose" dir="auto">
            {item.correction_reason}
          </p>
        </TeachingPrintSection>
      ) : null}

      {(
        [
          ['session_objective', item.session_objective],
          ['materials', item.materials],
          ['class_adaptation', item.class_adaptation],
          ['quick_assessment', item.quick_assessment],
          ['fallback_plan', item.fallback_plan],
          ['teacher_notes', item.teacher_notes],
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

      <TeachingPrintSection title={t('admin.teachingPlanning.print.sourceReferenceJathatha')}>
        <p className="teaching-print__prose" dir="auto">
          {named(item.reference_jathatha)}
          {item.snapshot_source?.reference_jathatha_id != null
            ? ` (#${item.snapshot_source.reference_jathatha_id})`
            : ''}
        </p>
      </TeachingPrintSection>

      <TeachingPrintSection title={t('admin.teachingPlanning.print.activities')}>
        {item.activities.map((activity) => (
          <div key={`${activity.sequence_order}-${activity.name}`}>
            <h3 className="teaching-print__group-head" dir="auto">
              {activity.sequence_order}. {activity.name} ({activity.activity_type}
              {activity.planned_duration_minutes != null
                ? ` · ${activity.planned_duration_minutes}m`
                : ''}
              )
            </h3>
            {activity.phases.length > 0 ? (
              <TeachingPrintTable
                columns={[
                  { key: 'order', header: '#', ltr: true },
                  { key: 'type', header: t('admin.teachingPlanning.print.phase') },
                  { key: 'duration', header: t('admin.teachingPlanning.print.duration'), ltr: true },
                  { key: 'teacher', header: t('admin.teachingPlanning.print.teacherActivity') },
                  { key: 'learner', header: t('admin.teachingPlanning.print.learnerActivity') },
                ]}
                rows={activity.phases.map((phase) => ({
                  order: phase.sequence_order,
                  type: phase.custom_name || phase.phase_type,
                  duration: dash(phase.planned_duration_minutes),
                  teacher: dash(phase.teacher_activity, ''),
                  learner: dash(phase.learner_activity, ''),
                }))}
              />
            ) : null}
          </div>
        ))}
      </TeachingPrintSection>

      {item.revisions && item.revisions.length > 0 ? (
        <TeachingPrintSection title={t('admin.teachingPlanning.print.revisionHistory')}>
          <TeachingPrintTable
            columns={[
              { key: 'rev', header: t('admin.teachingPlanning.print.revision'), ltr: true },
              { key: 'state', header: t('admin.teachingPlanning.print.documentStatus') },
              { key: 'reason', header: t('admin.teachingPlanning.print.correctionReason') },
            ]}
            rows={item.revisions.map((rev) => ({
              rev: rev.revision_number,
              state: rev.state,
              reason: dash(rev.correction_reason, ''),
            }))}
          />
        </TeachingPrintSection>
      ) : null}
    </TeachingPrintLayout>
  );
}
