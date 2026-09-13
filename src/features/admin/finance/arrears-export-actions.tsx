'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveArrearsFollowupTab } from '@/features/admin/finance/utils/arrears-list-present';
import { useLocale } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  arrearsExportLabels,
  buildArrearsExportQuery,
  downloadArrearsExcel,
  isTrustedComprehensiveArrearsExport,
  openArrearsPrintWindow,
  parseArrearsExportPayload,
  printArrearsReport,
} from '@/features/admin/finance/utils/arrears-export';

type ExportAction = 'excel' | 'print';

type ExportRequest = {
  action: ExportAction;
  search: string;
  tab: ReturnType<typeof resolveArrearsFollowupTab>;
};

export function ArrearsExportActions({
  search,
  tab,
}: {
  search: string;
  tab: string;
}) {
  const { locale } = useLocale();
  const labels = useMemo(() => arrearsExportLabels(locale), [locale]);
  const [request, setRequest] = useState<ExportRequest | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const printWindowRef = useRef<Window | null>(null);

  const exportQuery = useMemo(
    () => (request ? buildArrearsExportQuery(request.search, request.tab) : undefined),
    [request],
  );

  const exportState = useAdminResource<unknown>(
    request ? endpoints.admin.financeArrearsFollowups : null,
    exportQuery,
    { keepPreviousData: false },
  );

  useEffect(() => {
    if (!request) return;

    if (exportState.error) {
      if (printWindowRef.current && !printWindowRef.current.closed) {
        printWindowRef.current.close();
      }
      printWindowRef.current = null;
      setMessage(exportState.error.message || labels.exportFailed);
      setRequest(null);
      return;
    }

    if (exportState.loading || exportState.data == null) return;

    const payload = parseArrearsExportPayload(exportState.data);
    if (!isTrustedComprehensiveArrearsExport(payload)) {
      if (printWindowRef.current && !printWindowRef.current.closed) {
        printWindowRef.current.close();
      }
      printWindowRef.current = null;
      setMessage(labels.invalidContract);
      setRequest(null);
      return;
    }

    if (request.action === 'print') {
      const printWindow = printWindowRef.current;
      if (!printWindow || printWindow.closed) {
        setMessage(labels.popupBlocked);
      } else {
        printArrearsReport(printWindow, payload, locale, labels);
        setMessage(null);
      }
      printWindowRef.current = null;
      setRequest(null);
      return;
    }

    let active = true;
    void downloadArrearsExcel(payload, locale, labels)
      .then(() => {
        if (!active) return;
        setMessage(null);
        setRequest(null);
      })
      .catch(() => {
        if (!active) return;
        setMessage(labels.exportFailed);
        setRequest(null);
      });

    return () => {
      active = false;
    };
  }, [exportState.data, exportState.error, exportState.loading, labels, locale, request]);

  function startExport(action: ExportAction) {
    if (request) return;
    setMessage(null);

    if (action === 'print') {
      const printWindow = openArrearsPrintWindow(labels);
      if (!printWindow) {
        setMessage(labels.popupBlocked);
        return;
      }
      printWindowRef.current = printWindow;
    }

    setRequest({
      action,
      search: search.trim(),
      tab: resolveArrearsFollowupTab(tab),
    });
  }

  const busy = request != null;

  return (
    <section className="toolbar finance-hub-filters finance-arrears-export-toolbar" aria-label={labels.scope}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={busy}
        onClick={() => startExport('excel')}
      >
        {busy && request?.action === 'excel' ? labels.preparing : labels.excelButton}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={busy}
        onClick={() => startExport('print')}
      >
        {busy && request?.action === 'print' ? labels.preparing : labels.printButton}
      </button>
      <span className="finance-receivable-list__result-count">{labels.allFilteredScope}</span>
      {message ? (
        <span className="finance-billing-kind-filter-notice" role="alert" aria-live="polite">
          {message}
        </span>
      ) : null}
    </section>
  );
}
