'use client';

import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { StudentImportServerValidationState } from './student-import-server-types';

export function StudentImportServerValidationPanel({
  busy,
  canRun,
  validation,
  validationExpired,
  onValidate,
}: {
  busy: boolean;
  canRun: boolean;
  validation: StudentImportServerValidationState | null;
  validationExpired: boolean;
  onValidate: () => void;
}) {
  const t = useT();

  return (
    <Card>
      <SectionHead title={t('admin.studentImport.server.title')} />
      <p className="tiny muted">{t('admin.studentImport.server.description')}</p>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={!canRun || busy}
        onClick={onValidate}
      >
        {busy ? t('admin.studentImport.server.validating') : t('admin.studentImport.server.runValidation')}
      </button>

      {validation ? (
        <div className="student-import-server-summary col" style={{ gap: 8, marginTop: 12 }}>
          <div className="row tiny muted" style={{ gap: 16, flexWrap: 'wrap' }}>
            <span>
              {t('admin.studentImport.server.validRows')}: {validation.summary.valid_rows}
            </span>
            <span>
              {t('admin.studentImport.server.invalidRows')}: {validation.summary.invalid_rows}
            </span>
            <span>
              {t('admin.studentImport.server.warningRows')}: {validation.summary.warning_rows}
            </span>
          </div>
          <p className="tiny muted">
            {t('admin.studentImport.server.expiresAt')}: {validation.expiresAt}
          </p>
          {validationExpired ? (
            <p className="tiny" style={{ color: 'var(--danger)' }}>
              {t('admin.studentImport.server.validationExpired')}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
