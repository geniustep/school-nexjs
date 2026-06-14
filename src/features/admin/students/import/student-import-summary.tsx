'use client';

import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { StudentImportSummary } from './student-import-types';

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
