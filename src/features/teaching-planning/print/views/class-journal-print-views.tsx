'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmptyState, LoadingState, PermissionDeniedState } from '@/components/states/states';
import {
  fetchAdminClassJournal,
  fetchAdminClassJournalEntry,
} from '@/features/admin/teaching-planning/api/class-journal-admin-api';
import {
  fetchTeacherClassJournal,
  fetchTeacherClassJournalEntry,
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
import { canViewClassJournal } from '@/lib/permissions/teaching-planning';
import type { ClassJournalEntryDetail, ClassJournalEntrySummary } from '@/types/teaching-delivery';
import type { ListParams } from '@/types/api';

export function ClassJournalDetailPrintView({
  entryId,
  audience,
}: {
  entryId: string;
  audience: 'admin' | 'teacher';
}) {
  const t = useT();
  const user = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [item, setItem] = useState<ClassJournalEntryDetail | null>(null);

  const backHref =
    audience === 'teacher'
      ? `/teacher/class-journal/${entryId}`
      : `/admin/teaching-planning/class-journal/${entryId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const runner =
      audience === 'teacher'
        ? fetchTeacherClassJournalEntry(entryId)
        : fetchAdminClassJournalEntry(entryId);
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
  }, [audience, entryId]);

  const branding = useTeachingPrintBranding({
    audience,
    schoolName: item?.school?.name,
    academicYearLabel: item?.academic_year?.name,
    schoolCode: item?.school?.code ?? null,
  });

  if (audience === 'admin' && !canViewClassJournal(user) && user.role === 'admin') {
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

  const stateKey = `admin.teachingPlanning.classJournal.states.${item.state}`;

  return (
    <TeachingPrintLayout
      documentTitle={t('admin.teachingPlanning.print.documents.classJournal')}
      backHref={backHref}
      branding={branding}
      revision={item.revision_no}
      statusNode={
        <TeachingPrintStatus
          state={item.state}
          label={t(stateKey) === stateKey ? item.state : t(stateKey)}
          tone={printStatusTone(item.state)}
        />
      }
      showSignature
    >
      <TeachingPrintMeta
        items={[
          { label: t('admin.teachingPlanning.fields.school'), value: named(item.school) },
          { label: t('admin.teachingPlanning.fields.academicYear'), value: named(item.academic_year) },
          { label: t('admin.teachingPlanning.jathatha.columns.class'), value: named(item.class) },
          { label: t('admin.teachingPlanning.fields.subject'), value: named(item.subject) },
          { label: t('admin.teachingPlanning.jathatha.columns.teacher'), value: named(item.teacher) },
          { label: t('admin.teachingPlanning.jathatha.columns.offering'), value: named(item.offering) },
          {
            label: t('admin.teachingPlanning.delivery.columns.session'),
            value: [item.session_date, item.session_start_time, item.session_end_time]
              .filter(Boolean)
              .join(' ') || '—',
            ltr: true,
          },
          {
            label: t('admin.teachingPlanning.classJournal.source.title'),
            value: item.source_delivery_id != null ? `#${item.source_delivery_id}` : '—',
            ltr: true,
          },
        ]}
      />

      {(
        [
          ['delivered_title', item.delivered_title],
          ['content_summary', item.content_summary],
          ['objective_achievement_summary', item.objective_achievement_summary],
          ['actual_pages_label', item.actual_pages_label],
          ['assessment_summary', item.assessment_summary],
          ['journal_text', item.journal_text],
          ['deviation_reason', item.deviation_reason],
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
    </TeachingPrintLayout>
  );
}

const FILTER_KEYS = [
  'academic_year_id',
  'date_from',
  'date_to',
  'day',
  'week',
  'class_id',
  'subject_id',
  'teacher_id',
  'offering_id',
  'distribution_line_id',
  'state',
  'search',
  'q',
] as const;

export function ClassJournalReportPrintView({ audience }: { audience: 'admin' | 'teacher' }) {
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
  const [rows, setRows] = useState<ClassJournalEntrySummary[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [totalReported, setTotalReported] = useState<number | null>(null);

  const backHref =
    audience === 'teacher' ? '/teacher/class-journal' : '/admin/teaching-planning/class-journal';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setForbidden(false);

    const fetchPage = (params: ListParams) =>
      audience === 'teacher'
        ? fetchTeacherClassJournal(params)
        : fetchAdminClassJournal(params);

    fetchAllPaginatedForPrint<ClassJournalEntrySummary>({
      fetchPage,
      baseQuery: filters,
      scope,
      page,
      pageSize: 100,
      maxRecords: TEACHING_PRINT_SAFE_MAX_RECORDS,
      signal: controller.signal,
    }).then((result) => {
      if (controller.signal.aborted) return;
      if (!result.ok) {
        if (result.error.code === 'permission_denied' || result.error.code === 'forbidden') {
          setForbidden(true);
        } else setError(result.error.message);
        setRows(result.items);
        setLoading(false);
        return;
      }
      setRows(result.items);
      setTruncated(result.truncated);
      setTotalReported(result.totalReported);
      setLoading(false);
    });

    return () => controller.abort();
  }, [audience, filters, page, scope]);

  const branding = useTeachingPrintBranding({ audience });

  if (audience === 'admin' && !canViewClassJournal(user) && user.role === 'admin') {
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
      documentTitle={t('admin.teachingPlanning.print.documents.classJournalReport')}
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

      {truncated ? (
        <div className="teaching-print__warning" role="alert">
          {t('admin.teachingPlanning.print.tooManyRecords', {
            max: TEACHING_PRINT_SAFE_MAX_RECORDS,
            total: totalReported ?? TEACHING_PRINT_SAFE_MAX_RECORDS,
          })}{' '}
          {t('admin.teachingPlanning.print.narrowFilters')}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="teaching-print__prose">{t('admin.teachingPlanning.print.noData')}</p>
      ) : (
        <TeachingPrintTable
          columns={[
            { key: 'session', header: t('admin.teachingPlanning.delivery.columns.session'), ltr: true },
            { key: 'class', header: t('admin.teachingPlanning.jathatha.columns.class') },
            { key: 'subject', header: t('admin.teachingPlanning.fields.subject') },
            { key: 'teacher', header: t('admin.teachingPlanning.jathatha.columns.teacher') },
            { key: 'title', header: t('admin.teachingPlanning.print.fields.delivered_title') },
            { key: 'pages', header: t('admin.teachingPlanning.print.fields.actual_pages_label') },
            { key: 'state', header: t('admin.teachingPlanning.print.documentStatus') },
            { key: 'revision', header: t('admin.teachingPlanning.print.revision'), ltr: true },
          ]}
          rows={rows.map((row) => ({
            session: [row.session_date, row.session_start_time].filter(Boolean).join(' ') || '—',
            class: named(row.class),
            subject: named(row.subject),
            teacher: named(row.teacher),
            title: dash(row.delivered_title),
            pages: '—',
            state: row.state,
            revision: dash(row.revision_no),
          }))}
        />
      )}
    </TeachingPrintLayout>
  );
}
