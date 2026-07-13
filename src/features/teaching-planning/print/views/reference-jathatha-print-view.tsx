'use client';

import { useEffect, useState } from 'react';
import { EmptyState, LoadingState, PermissionDeniedState } from '@/components/states/states';
import { fetchReferenceJathatha } from '@/features/admin/teaching-planning/api/reference-jathathas-api';
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
import { canSeeReferenceJathathas } from '@/lib/permissions/teaching-planning';
import type { ReferenceJathathaDetail } from '@/types/jathatha';

export function ReferenceJathathaPrintView({ jathathaId }: { jathathaId: string }) {
  const t = useT();
  const user = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [item, setItem] = useState<ReferenceJathathaDetail | null>(null);
  const backHref = `/admin/teaching-planning/reference-jathathas/${jathathaId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchReferenceJathatha(jathathaId)
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
  }, [jathathaId]);

  const branding = useTeachingPrintBranding({
    audience: 'admin',
    schoolName: item?.school?.name,
    schoolCode: item?.school?.code ?? null,
  });

  if (!canSeeReferenceJathathas(user)) {
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

  const stateKey = `admin.teachingPlanning.jathatha.referenceStates.${item.state}`;
  const stateLabel = t(stateKey);
  const proseFields: Array<[string, string | null | undefined]> = [
    ['objectives', item.objectives],
    ['prerequisites', item.prerequisites],
    ['materials_summary', item.materials_summary],
    ['pages', item.pages],
    ['quick_assessment_plan', item.quick_assessment_plan],
    ['fallback_plan', item.fallback_plan],
    ['expected_difficulties', item.expected_difficulties],
    ['support_activities', item.support_activities],
    ['general_guidance', item.general_guidance],
    ['notes', item.notes],
  ];

  return (
    <TeachingPrintLayout
      documentTitle={t('admin.teachingPlanning.print.documents.referenceJathatha')}
      backHref={backHref}
      branding={branding}
      draftMark={isDraftLikeState(item.state)}
      revision={item.version_label}
      statusNode={
        <TeachingPrintStatus
          state={item.state}
          label={stateLabel === stateKey ? item.state : stateLabel}
          tone={printStatusTone(item.state)}
        />
      }
      showSignature
    >
      <TeachingPrintMeta
        items={[
          { label: t('admin.teachingPlanning.fields.school'), value: named(item.school) },
          { label: t('admin.teachingPlanning.fields.reference'), value: named(item.reference) },
          { label: t('admin.teachingPlanning.fields.level'), value: named(item.level) },
          { label: t('admin.teachingPlanning.fields.subject'), value: named(item.subject) },
          { label: t('admin.teachingPlanning.print.fields.track'), value: named(item.track) },
          {
            label: t('admin.teachingPlanning.fields.teachingLanguage'),
            value: item.teaching_language?.name ?? '—',
          },
          { label: t('admin.teachingPlanning.hub.sequencesTitle'), value: named(item.sequence) },
          {
            label: t('admin.teachingPlanning.jathatha.columns.template'),
            value: named(item.session_template),
          },
          {
            label: t('admin.teachingPlanning.print.expectedDuration'),
            value: dash(item.planned_duration_minutes),
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.print.readiness.title'),
            value: item.readiness?.ready
              ? t('admin.teachingPlanning.print.readiness.ready')
              : t('admin.teachingPlanning.print.readiness.notReady'),
          },
        ]}
      />

      {proseFields.map(([key, value]) =>
        value ? (
          <TeachingPrintSection key={key} title={t(`admin.teachingPlanning.print.fields.${key}`)}>
            <p className="teaching-print__prose" dir="auto">
              {value}
            </p>
          </TeachingPrintSection>
        ) : null,
      )}

      <TeachingPrintSection title={t('admin.teachingPlanning.print.activities')}>
        {item.activities.map((activity) => (
          <div key={`${activity.sequence_order}-${activity.name}`} className="teaching-print__section">
            <h3 className="teaching-print__group-head" dir="auto">
              {activity.sequence_order}. {activity.name} ({activity.activity_type}
              {activity.planned_duration_minutes != null
                ? ` · ${activity.planned_duration_minutes}m`
                : ''}
              )
            </h3>
            {activity.instructions ? (
              <p className="teaching-print__prose" dir="auto">
                {activity.instructions}
              </p>
            ) : null}
            {activity.phases.length > 0 ? (
              <TeachingPrintTable
                columns={[
                  { key: 'order', header: '#', ltr: true },
                  { key: 'type', header: t('admin.teachingPlanning.print.phase') },
                  { key: 'duration', header: t('admin.teachingPlanning.print.duration'), ltr: true },
                  { key: 'objective', header: t('admin.teachingPlanning.print.fields.objectives') },
                  { key: 'teacher', header: t('admin.teachingPlanning.print.teacherActivity') },
                  { key: 'learner', header: t('admin.teachingPlanning.print.learnerActivity') },
                ]}
                rows={activity.phases.map((phase) => ({
                  order: phase.sequence_order,
                  type: phase.custom_name || phase.phase_type,
                  duration: dash(phase.planned_duration_minutes),
                  objective: dash(phase.partial_objective, ''),
                  teacher: dash(phase.teacher_activity, ''),
                  learner: dash(phase.learner_activity, ''),
                }))}
              />
            ) : null}
          </div>
        ))}
        {item.activities.length === 0 ? (
          <p className="teaching-print__prose">{t('admin.teachingPlanning.print.noData')}</p>
        ) : null}
      </TeachingPrintSection>

      {item.version_history && item.version_history.length > 0 ? (
        <TeachingPrintSection title={t('admin.teachingPlanning.print.revisionHistory')}>
          <TeachingPrintTable
            columns={[
              { key: 'version', header: t('admin.teachingPlanning.print.revision'), ltr: true },
              { key: 'state', header: t('admin.teachingPlanning.print.documentStatus') },
              { key: 'name', header: t('admin.teachingPlanning.distributions.columns.name') },
            ]}
            rows={item.version_history.map((v) => ({
              version: dash(v.version_label),
              state: v.state,
              name: v.name,
            }))}
          />
        </TeachingPrintSection>
      ) : null}
    </TeachingPrintLayout>
  );
}
