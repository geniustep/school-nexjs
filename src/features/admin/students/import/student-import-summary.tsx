'use client';

import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { StudentImportMergedRow } from './student-import-server-types';
import type { StudentImportSummary } from './student-import-types';

export function buildStudentImportDisplaySummary(
  localSummary: StudentImportSummary,
  mergedRows: StudentImportMergedRow[],
): StudentImportSummary {
  if (mergedRows.length === 0) return localSummary;

  let validRows = 0;
  let warningRows = 0;
  let invalidRows = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const row of mergedRows) {
    if (row.previewStatus === 'valid') validRows += 1;
    else if (row.previewStatus === 'warning') warningRows += 1;
    else invalidRows += 1;

    totalErrors += row.localErrors.length + row.serverErrors.length;
    totalWarnings += row.localWarnings.length + row.serverWarnings.length;
  }

  return {
    totalRows: mergedRows.length,
    validRows,
    warningRows,
    invalidRows,
    totalErrors,
    totalWarnings,
  };
}

export function StudentImportSummaryCards({ summary }: { summary: StudentImportSummary }) {
  const t = useT();
  const items = [
    { key: 'total', label: t('admin.studentImport.summary.totalRows'), value: summary.totalRows, tone: 'slate' },
    { key: 'valid', label: t('admin.studentImport.summary.validRows'), value: summary.validRows, tone: 'green' },
    { key: 'warning', label: t('admin.studentImport.summary.warningRows'), value: summary.warningRows, tone: 'amber' },
    { key: 'invalid', label: t('admin.studentImport.summary.invalidRows'), value: summary.invalidRows, tone: 'red' },
    { key: 'errors', label: t('admin.studentImport.summary.totalErrors'), value: summary.totalErrors, tone: 'red' },
    { key: 'warnings', label: t('admin.studentImport.summary.totalWarnings'), value: summary.totalWarnings, tone: 'amber' },
  ] as const;

  return (
    <Card>
      <SectionHead title={t('admin.studentImport.summary.title')} />
      <div className="student-import-summary-grid">
        {items.map((item) => (
          <div key={item.key} className="student-import-summary-card" data-tone={item.tone}>
            <span className="student-import-summary-card__value">{item.value}</span>
            <span className="tiny muted">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
