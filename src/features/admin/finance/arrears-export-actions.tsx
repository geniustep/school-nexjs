'use client';

import { useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import {
  arrearsFollowupTabLabelKey,
} from '@/features/admin/finance/arrears-filter-contracts';
import {
  arrearsExportCopy,
  buildArrearsExportQuery,
  buildArrearsPrintHtml,
  downloadArrearsExcel,
  parseArrearsExportResponse,
  type ArrearsExportContext,
  type ArrearsExportResult,
} from '@/features/admin/finance/arrears-export';
import { resolveArrearsFollowupTab } from '@/features/admin/finance/utils/arrears-list-present';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

type ArrearsExportActionsProps = {
  filters: {
    tab: string;
    search: string;
  };
};

type ExportAction = 'excel' | 'print';

function errorMessage(
  code: string,
  copy: ReturnType<typeof arrearsExportCopy>,
): string {
  if (code === 'export_limit_exceeded') return copy.limitExceeded;
  if (code === 'forbidden' || code === 'permission_denied' || code === 'unauthenticated') {
    return copy.forbidden;
  }
  return copy.failed;
}

export function ArrearsExportActions({ filters }: ArrearsExportActionsProps) {
  const { locale, t } = useLocale();
  const { activeSchoolId, schools } = useAdminSession();
  const copy = arrearsExportCopy(locale);
  const tab = resolveArrearsFollowupTab(filters.tab);
  const [busy, setBusy] = useState<ExportAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const schoolName =
    activeSchoolId == null
      ? null
      : schools.find((school) => school.id === activeSchoolId)?.name ?? null;

  function exportContext(): ArrearsExportContext {
    return {
      locale,
      generatedAt: new Date(),
      schoolName,
      search: filters.search,
      tabLabel: t(arrearsFollowupTabLabelKey(tab)),
    };
  }

  async function loadExport(includeDetails: boolean): Promise<ArrearsExportResult | null> {
    const query = buildArrearsExportQuery({
      search: filters.search,
      tab,
      activeSchoolId,
      includeDetails,
    });
    let response = await api.get<unknown>(endpoints.admin.financeArrearsFollowups, query);
    if (
      !response.success &&
      response.error.code === 'invalid_filter' &&
      tab !== 'pending_cheque'
    ) {
      response = await api.get<unknown>(
        endpoints.admin.financeArrearsFollowups,
        buildArrearsExportQuery({
          search: filters.search,
          tab,
          activeSchoolId,
          useActionable: false,
        }),
      );
    }
    if (!response.success) {
      setFeedback(errorMessage(response.error.code, copy));
      return null;
    }

    const parsed = parseArrearsExportResponse(response.data);
    if (!parsed) {
      setFeedback(copy.malformed);
      return null;
    }
    if (parsed.items.length === 0) {
      setFeedback(copy.empty);
      return null;
    }
    return parsed;
  }

  async function handleExcel() {
    if (busy) return;
    setBusy('excel');
    setFeedback(null);
    try {
      const result = await loadExport(true);
      if (!result) return;
      await downloadArrearsExcel(result, exportContext());
    } catch {
      setFeedback(copy.failed);
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (busy) return;
    const printWindow = window.open('', '_blank', 'width=1280,height=900');
    if (!printWindow) {
      setFeedback(copy.popupBlocked);
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(
      `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><body><p>${copy.preparingPrint}</p></body></html>`,
    );
    printWindow.document.close();

    setBusy('print');
    setFeedback(null);
    try {
      const result = await loadExport(false);
      if (!result) {
        printWindow.close();
        return;
      }
      const html = buildArrearsPrintHtml(result, exportContext());
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    } catch {
      printWindow.close();
      setFeedback(copy.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className="toolbar finance-hub-filters finance-receivable-list__toolbar"
      aria-label={copy.title}
    >
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => void handleExcel()}
        disabled={busy != null}
      >
        {busy === 'excel' ? copy.preparingExcel : copy.excelAction}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => void handlePrint()}
        disabled={busy != null}
      >
        {busy === 'print' ? copy.preparingPrint : copy.printAction}
      </button>
      {feedback ? (
        <p className="finance-receivable-list__fetching" role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
