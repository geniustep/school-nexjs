'use client';

import Link from 'next/link';
import { ExportButton } from '@/features/admin/export-button';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { isAdminReadOnlyPhase } from '@/lib/admin/phase';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { ListParams } from '@/types/api';
import type { Permission } from '@/types/permissions';

interface AdminListActionsProps {
  addHref?: string;
  addLabel?: string;
  managePermission?: Permission;
  /** Odoo capability code (e.g. students.create) — checked alongside managePermission. */
  addCapability?: string;
  exportPath?: string;
  exportFilename?: string;
  exportQuery?: ListParams;
  exportPermission?: Permission;
  showImport?: boolean;
  onToggleImport?: () => void;
  importOpen?: boolean;
  importPermission?: Permission;
  extra?: React.ReactNode;
  readOnly?: boolean;
  /** Keep the exact action geometry while an enclosing read-only boundary blocks execution. */
  preserveReadOnlyGeometry?: boolean;
}

export function AdminListActions({
  addHref,
  addLabel,
  managePermission,
  addCapability,
  exportPath,
  exportFilename = 'export.csv',
  exportQuery,
  exportPermission = 'export_data',
  showImport,
  onToggleImport,
  importOpen,
  importPermission = 'import_data',
  extra,
  readOnly = isAdminReadOnlyPhase(),
  preserveReadOnlyGeometry = false,
}: AdminListActionsProps) {
  const t = useT();
  const user = useSession();
  const { activeAcademicYearId } = useAdminSession();

  if (readOnly && !preserveReadOnlyGeometry) return null;

  const teacherYearExport = exportPath === endpoints.admin.teachersExport;
  const effectiveExportQuery =
    exportQuery ??
    (teacherYearExport && activeAcademicYearId != null
      ? { academic_year_id: activeAcademicYearId }
      : undefined);

  const showAdd =
    !!addHref &&
    canShowAcademicListAdd(user, {
      legacyPermission: managePermission,
      capability: addCapability,
    });
  const showExport =
    !!exportPath &&
    !!exportPermission &&
    hasPermission(user, exportPermission) &&
    (!teacherYearExport || activeAcademicYearId != null);
  const showImportBtn =
    showImport &&
    !!onToggleImport &&
    !!importPermission &&
    hasPermission(user, importPermission);

  if (!showAdd && !showExport && !showImportBtn && !extra) return null;

  return (
    <div
      className="row"
      style={{ gap: 8, flexWrap: 'wrap' }}
      data-all-schools-mutation={readOnly ? 'true' : undefined}
      aria-disabled={readOnly || undefined}
    >
      {showAdd && (
        <Link className="btn btn--primary btn--sm" href={addHref}>
          {addLabel ?? t('admin.add')}
        </Link>
      )}
      {showExport && (
        <ExportButton
          path={exportPath}
          filename={exportFilename}
          label={t('admin.exportCsv')}
          query={effectiveExportQuery}
        />
      )}
      {showImportBtn && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onToggleImport}>
          {importOpen ? t('admin.hideImport') : t('admin.importCsv')}
        </button>
      )}
      {extra}
    </div>
  );
}
