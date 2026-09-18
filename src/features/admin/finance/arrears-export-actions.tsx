'use client';

import { useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ArrearsFollowupTab } from '@/types/finance-arrears';
import {
  buildArrearsExportQuery,
  downloadArrearsExcel,
  parseArrearsExportPayload,
  buildArrearsPrintHtml,
  writeArrearsPrintWindow,
  type ArrearsExportPayload,
} from '@/features/admin/finance/arrears-export';

type ExportKind = 'excel' | 'print';

function errorMessage(
  code: string,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (code === 'export_limit_exceeded') {
    return t('admin.finance.arrears.export.limitExceeded');
  }
  if (code === 'forbidden' || code === 'permission_denied') {
    return t('admin.finance.arrears.export.forbidden');
  }
  return t('admin.finance.arrears.export.failed');
}

export function ArrearsExportActions({
  search,
  tab,
}: {
  search: string;
  tab: ArrearsFollowupTab;
}) {
  const { locale, dir, t } = useLocale();
  const { activeSchoolId, schools } = useAdminSession();
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schoolName =
    schools.find((school) => school.id === activeSchoolId)?.name ?? null;

  async function loadPayload(): Promise<ArrearsExportPayload | null> {
    const res = await api.get<unknown>(
      endpoints.admin.financeArrearsFollowups,
      buildArrearsExportQuery({ search, tab, activeSchoolId }),
    );
    if (!res.success) {
      setError(errorMessage(res.error.code, t));
      return null;
    }
    const parsed = parseArrearsExportPayload(res.data, tab);
    if (!parsed) {
      setError(t('admin.finance.arrears.export.invalidResponse'));
      return null;
    }
    if (parsed.items.length === 0) {
      setError(t('admin.finance.arrears.export.noData'));
      return null;
    }
    return parsed;
  }

  async function handleExcel() {
    if (busy) return;
    setBusy('excel');
    setError(null);
    try {
      const payload = await loadPayload();
      if (!payload) return;
      await downloadArrearsExcel({
        payload,
        t,
        schoolName,
        generatedAt: new Date(),
      });
    } catch {
      setError(t('admin.finance.arrears.export.failed'));
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (busy) return;
    setError(null);
    const target = window.open('', '_blank');
    if (!target) {
      setError(t('admin.finance.arrears.export.popupBlocked'));
      return;
    }
    target.opener = null;
    setBusy('print');
    try {
      const payload = await loadPayload();
      if (!payload) {
        target.close();
        return;
      }
      const html = buildArrearsPrintHtml({
        payload,
        t,
        locale,
        dir,
        schoolName,
        generatedAt: new Date(),
      });
      writeArrearsPrintWindow(target, html);
    } catch {
      target.close();
      setError(t('admin.finance.arrears.export.failed'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="finance-arrears-export-actions">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={busy !== null}
        onClick={() => void handleExcel()}
      >
        {busy === 'excel'
          ? t('admin.finance.arrears.export.preparing')
          : t('admin.finance.arrears.export.excel')}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={busy !== null}
        onClick={() => void handlePrint()}
      >
        {busy === 'print'
          ? t('admin.finance.arrears.export.preparing')
          : t('admin.finance.arrears.export.print')}
      </button>
      <span className="finance-arrears-export-actions__scope">
        {t('admin.finance.arrears.export.scope')}
      </span>
      {error ? (
        <p className="finance-arrears-export-actions__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
