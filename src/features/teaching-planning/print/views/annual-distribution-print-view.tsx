'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, LoadingState, PermissionDeniedState } from '@/components/states/states';
import {
  fetchAnnualDistribution,
  fetchTeacherAnnualDistribution,
} from '@/features/admin/teaching-planning/api/annual-distributions-api';
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
import {
  canSeeAnnualDistributions,
} from '@/lib/permissions/teaching-planning';
import type { AnnualDistributionDetail, AnnualDistributionLine } from '@/types/teaching-planning';

function groupLines(lines: AnnualDistributionLine[]) {
  const groups = new Map<string, AnnualDistributionLine[]>();
  for (const line of [...lines].sort((a, b) => a.order - b.order)) {
    const key = line.period_label?.trim() || '__ungrouped__';
    const list = groups.get(key) ?? [];
    list.push(line);
    groups.set(key, list);
  }
  return groups;
}

export function AnnualDistributionPrintView({
  distributionId,
  audience,
}: {
  distributionId: string;
  audience: 'admin' | 'teacher';
}) {
  const t = useT();
  const user = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [item, setItem] = useState<AnnualDistributionDetail | null>(null);

  const backHref =
    audience === 'teacher'
      ? `/teacher/teaching-planning/distributions/${distributionId}`
      : `/admin/teaching-planning/distributions/${distributionId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setForbidden(false);
    const runner =
      audience === 'teacher'
        ? fetchTeacherAnnualDistribution(distributionId)
        : fetchAnnualDistribution(distributionId);
    runner
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          if (res.error.code === 'permission_denied' || res.error.code === 'forbidden') {
            setForbidden(true);
          } else {
            setError(res.error.message);
          }
          setItem(null);
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
  }, [audience, distributionId]);

  const branding = useTeachingPrintBranding({
    audience,
    schoolName: item?.school?.name,
    academicYearLabel: item?.academic_year?.name,
    schoolCode: item?.school?.code ?? null,
  });

  const groups = useMemo(
    () => (item ? groupLines(item.lines) : new Map<string, AnnualDistributionLine[]>()),
    [item],
  );

  if (audience === 'admin' && !canSeeAnnualDistributions(user)) {
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

  const stateLabel = t(`admin.teachingPlanning.states.${item.state}`);
  const readinessBits = [
    item.readiness.has_lines ? t('admin.teachingPlanning.print.readiness.hasLines') : null,
    item.readiness.sequences_resolved
      ? t('admin.teachingPlanning.print.readiness.sequencesResolved')
      : null,
    item.readiness.dates_valid ? t('admin.teachingPlanning.print.readiness.datesValid') : null,
    item.readiness.ready_for_approval
      ? t('admin.teachingPlanning.print.readiness.readyForApproval')
      : null,
    item.readiness.ready_for_activation
      ? t('admin.teachingPlanning.print.readiness.readyForActivation')
      : null,
  ].filter(Boolean);

  return (
    <TeachingPrintLayout
      documentTitle={t('admin.teachingPlanning.print.documents.annualDistribution')}
      backHref={backHref}
      branding={branding}
      landscape
      draftMark={isDraftLikeState(item.state)}
      revision={item.version_label}
      statusNode={
        <TeachingPrintStatus
          state={item.state}
          label={stateLabel === `admin.teachingPlanning.states.${item.state}` ? item.state : stateLabel}
          tone={printStatusTone(item.state)}
        />
      }
      showSignature
    >
      <TeachingPrintMeta
        items={[
          { label: t('admin.teachingPlanning.fields.school'), value: named(item.school) },
          { label: t('admin.teachingPlanning.fields.academicYear'), value: named(item.academic_year) },
          {
            label: t('admin.teachingPlanning.jathatha.columns.offering'),
            value: item.offering?.display_name ?? '—',
          },
          { label: t('admin.teachingPlanning.fields.level'), value: named(item.level) },
          { label: t('admin.teachingPlanning.print.fields.track'), value: named(item.track) },
          {
            label: t('admin.teachingPlanning.fields.teachingLanguage'),
            value: item.teaching_language?.name ?? '—',
          },
          { label: t('admin.teachingPlanning.fields.subject'), value: named(item.subject) },
          { label: t('admin.teachingPlanning.fields.reference'), value: named(item.reference) },
          { label: t('admin.teachingPlanning.distributions.columns.name'), value: item.name },
          {
            label: t('admin.teachingPlanning.distributions.columns.period'),
            value: dash(item.period_label),
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.print.plannedWindow'),
            value: [item.date_start, item.date_end].filter(Boolean).join(' → ') || '—',
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.distributions.columns.totals'),
            value: `${item.totals.line_count} / ${item.totals.total_sessions}`,
            ltr: true,
          },
        ]}
      />

      <TeachingPrintSection title={t('admin.teachingPlanning.print.readiness.title')}>
        <p className="teaching-print__prose" dir="auto">
          {readinessBits.length > 0 ? readinessBits.join(' · ') : t('common.dash')}
        </p>
        {item.readiness.blockers.length > 0 ? (
          <p className="teaching-print__prose" dir="auto">
            {item.readiness.blockers.join(', ')}
          </p>
        ) : null}
        {item.notes ? (
          <p className="teaching-print__prose" dir="auto">
            {item.notes}
          </p>
        ) : null}
      </TeachingPrintSection>

      <TeachingPrintSection title={t('admin.teachingPlanning.distributions.tabs.lines')}>
        {[...groups.entries()].map(([period, lines]) => (
          <div key={period}>
            <h3 className="teaching-print__group-head" dir="auto">
              {period === '__ungrouped__'
                ? t('admin.teachingPlanning.print.ungroupedPeriod')
                : period}
            </h3>
            <TeachingPrintTable
              columns={[
                { key: 'order', header: '#', ltr: true },
                { key: 'window', header: t('admin.teachingPlanning.print.plannedWindow'), ltr: true },
                { key: 'name', header: t('admin.teachingPlanning.distributions.columns.name') },
                { key: 'type', header: t('admin.teachingPlanning.lines.itemType') },
                { key: 'sequence', header: t('admin.teachingPlanning.hub.sequencesTitle') },
                {
                  key: 'sessions',
                  header: t('admin.teachingPlanning.lines.sessionCount'),
                  ltr: true,
                },
                { key: 'notes', header: t('admin.teachingPlanning.lines.notes') },
              ]}
              rows={lines.map((line) => ({
                order: line.order,
                window: [line.date_start, line.date_end].filter(Boolean).join(' → ') || '—',
                name: dash(line.name),
                type: line.item_type,
                sequence: named(line.sequence),
                sessions: dash(line.session_count),
                notes: dash(line.notes, ''),
              }))}
            />
          </div>
        ))}
        {item.lines.length === 0 ? (
          <p className="teaching-print__prose">{t('admin.teachingPlanning.print.noData')}</p>
        ) : null}
      </TeachingPrintSection>
    </TeachingPrintLayout>
  );
}
