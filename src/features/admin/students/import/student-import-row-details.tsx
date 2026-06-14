'use client';

import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { STUDENT_IMPORT_COLUMNS } from './student-import-columns';
import type { StudentImportRowResult } from './student-import-types';

export function StudentImportRowDetails({
  row,
  onClose,
}: {
  row: StudentImportRowResult | null;
  onClose: () => void;
}) {
  const t = useT();
  if (!row) return null;

  return (
    <div className="student-import-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="student-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.studentImport.rowDetails.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="student-import-dialog__header">
          <h2>{t('admin.studentImport.rowDetails.title', { row: row.rowNumber })}</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </header>

        <Card>
          <SectionHead title={t('admin.studentImport.rowDetails.normalized')} />
          <DefinitionList
            items={STUDENT_IMPORT_COLUMNS.map((column) => ({
              label: t(column.labelKey),
              value: String(row.normalized[column.key as keyof typeof row.normalized] ?? t('common.dash')),
            }))}
          />
        </Card>

        <Card>
          <SectionHead title={t('admin.studentImport.rowDetails.raw')} />
          <DefinitionList
            items={STUDENT_IMPORT_COLUMNS.map((column) => ({
              label: column.key,
              value: String(row.raw[column.key] ?? t('common.dash')),
            }))}
          />
        </Card>

        {(row.errors.length > 0 || row.warnings.length > 0) && (
          <Card>
            <SectionHead title={t('admin.studentImport.rowDetails.issues')} />
            <div className="col" style={{ gap: 8 }}>
              {row.errors.map((issue, index) => (
                <div key={`e-${index}`} className="tiny" style={{ color: 'var(--danger)' }}>
                  [{issue.code}] {issue.message}
                </div>
              ))}
              {row.warnings.map((issue, index) => (
                <div key={`w-${index}`} className="tiny" style={{ color: 'var(--warning, #b45309)' }}>
                  [{issue.code}] {issue.message}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
