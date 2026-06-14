'use client';

import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';

export function StudentImportConfirmationPanel({
  fileName,
  schoolName,
  rowCount,
  warningCount,
  confirmed,
  canConfirm,
  onConfirmedChange,
  onContinue,
}: {
  fileName: string | null;
  schoolName: string;
  rowCount: number;
  warningCount: number;
  confirmed: boolean;
  canConfirm: boolean;
  onConfirmedChange: (value: boolean) => void;
  onContinue: () => void;
}) {
  const t = useT();

  return (
    <Card>
      <SectionHead title={t('admin.studentImport.confirmation.title')} />
      <div className="col" style={{ gap: 8 }}>
        <p className="tiny muted">{t('admin.studentImport.confirmation.description')}</p>
        <ul className="tiny muted student-import-confirmation-list">
          <li>{t('admin.studentImport.confirmation.file')}: {fileName ?? t('common.dash')}</li>
          <li>{t('admin.studentImport.confirmation.school')}: {schoolName}</li>
          <li>{t('admin.studentImport.confirmation.rowCount')}: {rowCount}</li>
          <li>{t('admin.studentImport.confirmation.warningCount')}: {warningCount}</li>
        </ul>
        <p className="tiny muted">{t('admin.studentImport.confirmation.createsStudents')}</p>
        <p className="tiny muted">{t('admin.studentImport.confirmation.excludes')}</p>
        <label className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={confirmed}
            disabled={!canConfirm}
            onChange={(e) => onConfirmedChange(e.target.checked)}
          />
          <span className="tiny">{t('admin.studentImport.confirmation.checkbox')}</span>
        </label>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!canConfirm || !confirmed}
          onClick={onContinue}
        >
          {t('admin.studentImport.confirmation.continue')}
        </button>
      </div>
    </Card>
  );
}

export function StudentImportExecutePanel({
  busy,
  canExecute,
  onExecute,
}: {
  busy: boolean;
  canExecute: boolean;
  onExecute: () => void;
}) {
  const t = useT();

  return (
    <Card>
      <SectionHead title={t('admin.studentImport.execute.title')} />
      <p className="tiny muted">{t('admin.studentImport.execute.doNotClose')}</p>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={!canExecute || busy}
        onClick={onExecute}
      >
        {busy ? t('admin.studentImport.execute.running') : t('admin.studentImport.execute.button')}
      </button>
    </Card>
  );
}
