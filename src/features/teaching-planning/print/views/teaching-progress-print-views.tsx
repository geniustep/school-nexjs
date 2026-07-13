'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmptyState, LoadingState, PermissionDeniedState } from '@/components/states/states';
import {
  fetchAdminTeachingProgressLine,
  fetchAdminTeachingProgressLines,
  fetchAdminTeachingProgressSummary,
} from '@/features/admin/teaching-planning/api/teaching-progress-admin-api';
import {
  fetchTeacherTeachingProgress,
  fetchTeacherTeachingProgressLine,
  fetchTeacherTeachingProgressSummary,
} from '@/features/teacher/delivery/api/teacher-delivery-api';
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
import {
  fetchAllPaginatedForPrint,
  TEACHING_PRINT_SAFE_MAX_RECORDS,
} from '@/features/teaching-planning/print/utils/fetch-all-paginated-for-print';
import {
  dash,
  named,
  parsePrintScope,
  printStatusTone,
} from '@/features/teaching-planning/print/utils/print-helpers';
import { canViewTeachingProgress } from '@/lib/permissions/teaching-planning';
import type {
  TeachingProgressLineDetail,
  TeachingProgressLineSummary,
  TeachingProgressSummary,
} from '@/types/teaching-delivery';
import type { ListParams } from '@/types/api';

export function TeachingProgressDetailPrintView({
  lineId,
  audience,
}: {
  lineId: string;
  audience: 'admin' | 'teacher';
}) {
  const t = useT();
  const user = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [item, setItem] = useState<TeachingProgressLineDetail | null>(null);

  const backHref =
    audience === 'teacher'
      ? `/teacher/teaching-progress/${lineId}`
      : `/admin/teaching-planning/progress/${lineId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const runner =
      audience === 'teacher'
        ? fetchTeacherTeachingProgressLine(lineId)
        : fetchAdminTeachingProgressLine(lineId);
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
  }, [audience, lineId]);

  const branding = useTeachingPrintBranding({
    audience,
    schoolName: item?.school?.name,
    academicYearLabel: item?.academic_year?.name,
    schoolCode: item?.school?.code ?? null,
  });

  if (audience === 'admin' && !canViewTeachingProgress(user) && user.role === 'admin') {
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

  const statusKey = `admin.teachingPlanning.progress.statuses.${item.status}`;

  return (
    <TeachingPrintLayout
      documentTitle={t('admin.teachingPlanning.print.documents.teachingProgress')}
      backHref={backHref}
      branding={branding}
      statusNode={
        <>
          <TeachingPrintStatus
            state={item.status}
            label={t(statusKey) === statusKey ? item.status : t(statusKey)}
            tone={printStatusTone(item.status)}
          />
          {item.delayed ? (
            <TeachingPrintStatus
              state="delayed"
              label={t('admin.teachingPlanning.progress.delayed')}
            />
          ) : null}
        </>
      }
    >
      <TeachingPrintMeta
        items={[
          { label: t('admin.teachingPlanning.fields.school'), value: named(item.school) },
          { label: t('admin.teachingPlanning.fields.academicYear'), value: named(item.academic_year) },
          { label: t('admin.teachingPlanning.jathatha.columns.class'), value: named(item.class) },
          { label: t('admin.teachingPlanning.fields.subject'), value: named(item.subject) },
          { label: t('admin.teachingPlanning.jathatha.columns.offering'), value: named(item.offering) },
          {
            label: t('admin.teachingPlanning.hub.distributionTitle'),
            value: named(item.distribution),
          },
          {
            label: t('admin.teachingPlanning.jathatha.columns.distributionLine'),
            value: item.distribution_line?.name ?? item.title ?? item.name ?? '—',
          },
          {
            label: t('admin.teachingPlanning.print.plannedWindow'),
            value:
              [item.planned_window_start, item.planned_window_end].filter(Boolean).join(' → ') ||
              '—',
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.progress.columns.delivered'),
            value: `${dash(item.delivered_units)} / ${dash(item.planned_sessions)}`,
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.progress.fields.remainingUnits'),
            value: dash(item.remaining_units),
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.progress.columns.coverage'),
            value: item.coverage_percent != null ? `${item.coverage_percent}%` : '—',
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.progress.lastDelivery.title'),
            value: dash(item.last_delivery_at),
            ltr: true,
          },
        ]}
      />

      {item.delayed_explanation ? (
        <TeachingPrintSection title={t('admin.teachingPlanning.progress.delayed')}>
          <p className="teaching-print__prose" dir="auto">
            {item.delayed_explanation}
          </p>
        </TeachingPrintSection>
      ) : null}

      {item.planned_dates && item.planned_dates.length > 0 ? (
        <TeachingPrintSection title={t('admin.teachingPlanning.progress.plannedDates.title')}>
          <p className="teaching-print__prose teaching-print__ltr" dir="ltr">
            {item.planned_dates.join(', ')}
          </p>
        </TeachingPrintSection>
      ) : null}
    </TeachingPrintLayout>
  );
}

const FILTER_KEYS = [
  'academic_year_id',
  'cycle_id',
  'level_id',
  'track_id',
  'class_id',
  'subject_id',
  'teacher_id',
  'offering_id',
  'distribution_id',
  'status',
  'delayed',
  'search',
  'q',
] as const;

export function TeachingProgressReportPrintView({ audience }: { audience: 'admin' | 'teacher' }) {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const scope = parsePrintScope(searchParams.get('print_scope'));
  const page = Number(searchParams.get('page') || '1') || 1;

  const filters = useMemo(() => {
    const out: ListParams = {};
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) out[key] = value;
    }
    return out;
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [rows, setRows] = useState<TeachingProgressLineSummary[]>([]);
  const [summary, setSummary] = useState<TeachingProgressSummary | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [totalReported, setTotalReported] = useState<number | null>(null);

  const backHref =
    audience === 'teacher'
      ? '/teacher/teaching-progress'
      : '/admin/teaching-planning/progress';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const fetchPage = (params: ListParams) =>
      audience === 'teacher'
        ? fetchTeacherTeachingProgress(params)
        : fetchAdminTeachingProgressLines(params);

    const summaryPromise =
      audience === 'teacher'
        ? fetchTeacherTeachingProgressSummary(filters)
        : fetchAdminTeachingProgressSummary(filters);

    Promise.all([
      fetchAllPaginatedForPrint<TeachingProgressLineSummary>({
        fetchPage,
        baseQuery: filters,
        scope,
        page,
        pageSize: 100,
        maxRecords: TEACHING_PRINT_SAFE_MAX_RECORDS,
        signal: controller.signal,
      }),
      summaryPromise,
    ]).then(([listResult, summaryResult]) => {
      if (controller.signal.aborted) return;
      if (!listResult.ok) {
        if (listResult.error.code === 'permission_denied' || listResult.error.code === 'forbidden') {
          setForbidden(true);
        } else setError(listResult.error.message);
        setRows(listResult.items);
      } else {
        setRows(listResult.items);
        setTruncated(listResult.truncated);
        setTotalReported(listResult.totalReported);
      }
      if (summaryResult.success) setSummary(summaryResult.data);
      setLoading(false);
    });

    return () => controller.abort();
  }, [audience, filters, page, scope]);

  const branding = useTeachingPrintBranding({ audience });

  if (audience === 'admin' && !canViewTeachingProgress(user) && user.role === 'admin') {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }
  if (loading) return <LoadingState label={t('common.loading')} />;
  if (forbidden) return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  if (error) {
    return (
      <EmptyState icon="🖨️" title={t('admin.teachingPlanning.print.error')} description={error} />
    );
  }

  const appliedFilters = Object.entries(filters);

  return (
    <TeachingPrintLayout
      documentTitle={t('admin.teachingPlanning.print.documents.teachingProgressReport')}
      backHref={backHref}
      branding={branding}
      landscape
    >
      <div className="teaching-print__filters">
        <strong>{t('admin.teachingPlanning.print.appliedFilters')}</strong>
        <ul>
          <li>
            {t('admin.teachingPlanning.print.scope')}:{' '}
            {scope === 'current_page'
              ? t('admin.teachingPlanning.print.scopeCurrentPage')
              : t('admin.teachingPlanning.print.scopeAllFiltered')}
          </li>
          {appliedFilters.length === 0 ? (
            <li>{t('admin.teachingPlanning.print.noFilters')}</li>
          ) : (
            appliedFilters.map(([key, value]) => (
              <li key={key} dir="ltr" className="teaching-print__ltr">
                {key}={String(value)}
              </li>
            ))
          )}
        </ul>
      </div>

      {summary ? (
        <TeachingPrintMeta
          items={[
            {
              label: t('admin.teachingPlanning.progress.stats.coverage'),
              value:
                summary.coverage_percent != null ? `${summary.coverage_percent}%` : '—',
              ltr: true,
            },
            {
              label: t('admin.teachingPlanning.progress.stats.planned'),
              value: dash(summary.planned_lines),
              ltr: true,
            },
            {
              label: t('admin.teachingPlanning.progress.stats.started'),
              value: dash(summary.started_lines),
              ltr: true,
            },
            {
              label: t('admin.teachingPlanning.progress.stats.completed'),
              value: dash(summary.completed_lines),
              ltr: true,
            },
            {
              label: t('admin.teachingPlanning.progress.stats.delayed'),
              value: dash(summary.delayed_lines),
              ltr: true,
            },
          ]}
        />
      ) : null}

      {truncated ? (
        <div className="teaching-print__warning" role="alert">
          {t('admin.teachingPlanning.print.tooManyRecords', {
            max: TEACHING_PRINT_SAFE_MAX_RECORDS,
            total: totalReported ?? TEACHING_PRINT_SAFE_MAX_RECORDS,
          })}{' '}
          {t('admin.teachingPlanning.print.narrowFilters')}
        </div>
      ) : null}

      {summary?.classes_needing_attention && summary.classes_needing_attention.length > 0 ? (
        <TeachingPrintSection title={t('admin.teachingPlanning.progress.attention.title')}>
          <p className="teaching-print__prose" dir="auto">
            {summary.classes_needing_attention.map((c) => c.name).join(', ')}
          </p>
        </TeachingPrintSection>
      ) : null}

      <TeachingPrintSection title={t('admin.teachingPlanning.print.progressLines')}>
        {rows.length === 0 ? (
          <p className="teaching-print__prose">{t('admin.teachingPlanning.print.noData')}</p>
        ) : (
          <TeachingPrintTable
            columns={[
              { key: 'item', header: t('admin.teachingPlanning.progress.columns.item') },
              { key: 'class', header: t('admin.teachingPlanning.jathatha.columns.class') },
              { key: 'subject', header: t('admin.teachingPlanning.fields.subject') },
              { key: 'coverage', header: t('admin.teachingPlanning.progress.columns.coverage'), ltr: true },
              { key: 'delivered', header: t('admin.teachingPlanning.progress.columns.delivered'), ltr: true },
              { key: 'remaining', header: t('admin.teachingPlanning.progress.fields.remainingUnits'), ltr: true },
              { key: 'status', header: t('admin.teachingPlanning.progress.columns.status') },
              { key: 'delayed', header: t('admin.teachingPlanning.progress.columns.delayed') },
              { key: 'last', header: t('admin.teachingPlanning.progress.lastDelivery.title'), ltr: true },
            ]}
            rows={rows.map((row) => ({
              item: row.title ?? row.name ?? named(row.distribution_line),
              class: named(row.class),
              subject: named(row.subject),
              coverage: row.coverage_percent != null ? `${row.coverage_percent}%` : '—',
              delivered: `${dash(row.delivered_units)} / ${dash(row.planned_sessions)}`,
              remaining: dash(row.remaining_units),
              status: row.status,
              delayed: row.delayed ? t('common.yes') : t('common.no'),
              last: dash(row.last_delivery_at),
            }))}
          />
        )}
      </TeachingPrintSection>
    </TeachingPrintLayout>
  );
}
