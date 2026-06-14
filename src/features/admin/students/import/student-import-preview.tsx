'use client';

import { Badge } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useT } from '@/features/i18n/locale-context';
import type { StudentImportPreviewFilter, StudentImportRowResult } from './student-import-types';

function statusTone(status: StudentImportRowResult['status']): 'green' | 'amber' | 'red' {
  if (status === 'valid') return 'green';
  if (status === 'warning') return 'amber';
  return 'red';
}

export function StudentImportPreview({
  rows,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelectRow,
}: {
  rows: StudentImportRowResult[];
  filter: StudentImportPreviewFilter;
  search: string;
  onFilterChange: (filter: StudentImportPreviewFilter) => void;
  onSearchChange: (search: string) => void;
  onSelectRow: (row: StudentImportRowResult) => void;
}) {
  const t = useT();

  const columns: Column<StudentImportRowResult>[] = [
    {
      key: 'rowNumber',
      header: t('admin.studentImport.preview.columns.rowNumber'),
      render: (row) => row.rowNumber,
    },
    {
      key: 'name',
      header: t('admin.fullName'),
      render: (row) =>
        [row.normalized.first_name, row.normalized.last_name].filter(Boolean).join(' ') || t('common.dash'),
    },
    {
      key: 'school_number',
      header: t('admin.student360.schoolNumber'),
      render: (row) => <span className="mono">{row.normalized.school_number ?? t('common.dash')}</span>,
    },
    {
      key: 'school',
      header: t('admin.studentImport.preview.columns.school'),
      render: (row) => row.normalized.school_code ?? t('common.dash'),
    },
    {
      key: 'year',
      header: t('admin.studentImport.preview.columns.year'),
      render: (row) => row.normalized.academic_year_code ?? t('common.dash'),
    },
    {
      key: 'level',
      header: t('nav.levels'),
      render: (row) => row.normalized.level_code ?? t('common.dash'),
    },
    {
      key: 'class',
      header: t('nav.classes'),
      render: (row) => row.normalized.class_code ?? t('common.dash'),
    },
    {
      key: 'status',
      header: t('academic.status'),
      render: (row) => row.normalized.status ?? t('common.dash'),
    },
    {
      key: 'result',
      header: t('admin.studentImport.preview.columns.result'),
      render: (row) => (
        <Badge tone={statusTone(row.status)}>
          {t(`admin.studentImport.rowStatus.${row.status}`)}
        </Badge>
      ),
    },
  ];

  const filters: StudentImportPreviewFilter[] = ['all', 'valid', 'warning', 'invalid'];

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="student-import-preview-toolbar">
        <div className="student-import-filter-group" role="tablist" aria-label={t('admin.studentImport.preview.filters')}>
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className="btn btn--ghost btn--sm"
              data-active={filter === item || undefined}
              onClick={() => onFilterChange(item)}
            >
              {t(`admin.studentImport.filters.${item}`)}
            </button>
          ))}
        </div>
        <input
          className="input student-import-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('admin.studentImport.preview.searchPlaceholder')}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.rowNumber}
        onRowClick={onSelectRow}
      />
    </div>
  );
}
