'use client';

import Link from 'next/link';
import { ExportButton } from '@/features/admin/export-button';
import { useT } from '@/features/i18n/locale-context';

interface AdminListActionsProps {
  addHref?: string;
  addLabel?: string;
  exportPath?: string;
  exportFilename?: string;
  showImport?: boolean;
  onToggleImport?: () => void;
  importOpen?: boolean;
  extra?: React.ReactNode;
}

export function AdminListActions({
  addHref,
  addLabel,
  exportPath,
  exportFilename = 'export.csv',
  showImport,
  onToggleImport,
  importOpen,
  extra,
}: AdminListActionsProps) {
  const t = useT();
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {addHref && (
        <Link className="btn btn--primary btn--sm" href={addHref}>
          {addLabel ?? t('admin.add')}
        </Link>
      )}
      {exportPath && <ExportButton path={exportPath} filename={exportFilename} label={t('admin.exportCsv')} />}
      {showImport && onToggleImport && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onToggleImport}>
          {importOpen ? t('admin.hideImport') : t('admin.importCsv')}
        </button>
      )}
      {extra}
    </div>
  );
}
