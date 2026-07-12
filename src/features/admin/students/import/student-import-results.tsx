'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { IdentifierText } from '@/components/ui/numeric-text';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { useT } from '@/features/i18n/locale-context';
import type { StudentImportExecutionState } from './student-import-server-types';

function resultTone(status: string): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'created') return 'green';
  if (status === 'skipped_duplicate') return 'amber';
  if (status === 'failed') return 'red';
  return 'slate';
}

export function StudentImportResultsPanel({
  execution,
  page,
  busy,
  onPageChange,
  onDownloadReport,
  onBackToList,
  onStartNew,
}: {
  execution: StudentImportExecutionState;
  page: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  onDownloadReport: () => void;
  onBackToList: () => void;
  onStartNew: () => void;
}) {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(execution.pagination.total / execution.pagination.limit));

  const bannerKey =
    execution.state === 'completed'
      ? 'completed'
      : execution.state === 'completed_with_errors'
        ? 'completedWithErrors'
        : 'failed';

  const columns: Column<(typeof execution.rows)[number]>[] = [
    {
      key: 'row',
      header: t('admin.studentImport.results.columns.rowNumber'),
      render: (row) => row.row_number,
    },
    {
      key: 'name',
      header: t('admin.fullName'),
      render: (row) => row.display_name ?? t('common.dash'),
    },
    {
      key: 'school_number',
      header: t('admin.student360.schoolNumber'),
      render: (row) =>
        row.school_number ? (
          <IdentifierText>{row.school_number}</IdentifierText>
        ) : (
          t('common.dash')
        ),
    },
    {
      key: 'status',
      header: t('academic.status'),
      render: (row) => (
        <Badge tone={resultTone(row.status)}>
          {t(`admin.studentImport.results.status.${row.status}`, {}) || row.status}
        </Badge>
      ),
    },
    {
      key: 'student',
      header: t('admin.studentImport.results.columns.action'),
      render: (row) =>
        row.status === 'created' && row.student_id ? (
          <Link className="btn btn--ghost btn--sm" href={`/admin/students/${row.student_id}`}>
            {t('admin.studentImport.results.openStudent')}
          </Link>
        ) : (
          t('common.dash')
        ),
    },
    {
      key: 'errors',
      header: t('admin.studentImport.results.columns.errors'),
      render: (row) =>
        row.errors.length > 0 ? (
          <span className="tiny" style={{ color: 'var(--danger)' }}>
            {row.errors.map((e) => e.message).join('; ')}
          </span>
        ) : (
          t('common.dash')
        ),
    },
  ];

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="student-import-results-banner" data-state={execution.state}>
        <strong>{t(`admin.studentImport.results.banner.${bannerKey}`)}</strong>
        <div className="row tiny muted" style={{ gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
          <span>
            {t('admin.studentImport.results.summary.total')}: {execution.summary.total_rows}
          </span>
          <span>
            {t('admin.studentImport.results.summary.created')}: {execution.summary.created_rows ?? 0}
          </span>
          <span>
            {t('admin.studentImport.results.summary.failed')}: {execution.summary.failed_rows ?? 0}
          </span>
          <span>
            {t('admin.studentImport.results.summary.skipped')}: {execution.summary.skipped_rows ?? 0}
          </span>
        </div>
      </div>

      <DataTable columns={columns} rows={execution.rows} rowKey={(row) => row.row_number} />

      {totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} total={execution.pagination.total} onPage={onPageChange} />
      ) : null}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onDownloadReport}>
          {t('admin.studentImport.results.downloadReport')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBackToList}>
          {t('admin.studentImport.results.backToList')}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={onStartNew}>
          {t('admin.studentImport.results.startNew')}
        </button>
      </div>
    </div>
  );
}
