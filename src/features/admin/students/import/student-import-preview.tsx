'use client';

import { Badge } from '@/components/ui/primitives';
import { IdentifierText } from '@/components/ui/numeric-text';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useT } from '@/features/i18n/locale-context';
import { fullStudentImportName } from './student-import-v2-contract';
import type { StudentImportPreviewFilter, StudentImportRowResult } from './student-import-types';

function statusTone(status: StudentImportRowResult['status']): 'green' | 'amber' | 'red' {
  if (status === 'valid') return 'green';
  if (status === 'warning') return 'amber';
  return 'red';
}

export function studentImportPreviewNames(row: StudentImportRowResult): {
  studentAr: string | null;
  studentFr: string | null;
  studentFallback: string | null;
  guardianAr: string | null;
  guardianFr: string | null;
  guardianFallback: string | null;
} {
  return {
    studentAr: fullStudentImportName(row.normalized.first_name_ar, row.normalized.last_name_ar),
    studentFr: fullStudentImportName(row.normalized.first_name_fr, row.normalized.last_name_fr),
    studentFallback: fullStudentImportName(row.normalized.first_name, row.normalized.last_name),
    guardianAr: fullStudentImportName(
      row.normalized.guardian_first_name_ar,
      row.normalized.guardian_last_name_ar,
    ),
    guardianFr: fullStudentImportName(
      row.normalized.guardian_first_name_fr,
      row.normalized.guardian_last_name_fr,
    ),
    guardianFallback: row.normalized.guardian_name?.trim() || null,
  };
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
      render: (row) => {
        const names = studentImportPreviewNames(row);
        const primary = names.studentAr ?? names.studentFr ?? names.studentFallback ?? t('common.dash');
        return (
          <div className="col" style={{ gap: 2 }}>
            <span>{primary}</span>
            {names.studentFr && names.studentFr !== primary ? (
              <span className="tiny" dir="ltr">FR · {names.studentFr}</span>
            ) : null}
            {names.studentAr && names.studentAr !== primary ? (
              <span className="tiny" dir="rtl">AR · {names.studentAr}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'guardian',
      header: t('nav.parents'),
      render: (row) => {
        const names = studentImportPreviewNames(row);
        const primary = names.guardianAr ?? names.guardianFr ?? names.guardianFallback ?? t('common.dash');
        const legal = row.normalized.guardian_is_legal_guardian;
        return (
          <div className="col" style={{ gap: 2 }}>
            <span>{primary}</span>
            {names.guardianFr && names.guardianFr !== primary ? (
              <span className="tiny" dir="ltr">FR · {names.guardianFr}</span>
            ) : null}
            {names.guardianAr && names.guardianAr !== primary ? (
              <span className="tiny" dir="rtl">AR · {names.guardianAr}</span>
            ) : null}
            <span className="tiny">
              {row.normalized.guardian_relationship_type ?? t('common.dash')} · Legal: {legal === true ? t('common.yes') : legal === false ? t('common.no') : t('common.dash')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'school_number',
      header: t('admin.student360.schoolNumber'),
      render: (row) =>
        row.normalized.school_number ? (
          <IdentifierText>{row.normalized.school_number}</IdentifierText>
        ) : (
          t('common.dash')
        ),
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
