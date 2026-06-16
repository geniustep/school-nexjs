'use client';

import { useCallback, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { downloadReceiptPdf, type FinanceReceiptResult } from '@/lib/api/finance-receipt';
import { receiptAllowsAction } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

export function ReceiptPdfActions({
  receipt,
  compact = false,
  onError,
}: {
  receipt: FinanceReceipt;
  compact?: boolean;
  onError?: (result: FinanceReceiptResult) => void;
}) {
  const t = useT();
  const [loadingLang, setLoadingLang] = useState<'ar' | 'fr' | null>(null);
  const canDownload =
    receiptAllowsAction(receipt, 'download') || receiptAllowsAction(receipt, 'print');

  const handleDownload = useCallback(
    async (lang: 'ar' | 'fr') => {
      if (loadingLang || !canDownload) return;
      setLoadingLang(lang);
      try {
        const result = await downloadReceiptPdf(receipt, lang);
        if (!result.ok) onError?.(result);
      } finally {
        setLoadingLang(null);
      }
    },
    [canDownload, loadingLang, onError, receipt],
  );

  if (!canDownload) return null;

  const btnClass = compact ? 'btn btn--ghost btn--sm' : 'btn btn--ghost btn--sm';

  return (
    <div className={`receipt-pdf-actions${compact ? ' receipt-pdf-actions--compact' : ''}`}>
      <button
        type="button"
        className={btnClass}
        disabled={loadingLang != null}
        onClick={() => void handleDownload('ar')}
        aria-busy={loadingLang === 'ar'}
      >
        {loadingLang === 'ar'
          ? t('admin.finance.receipts.downloading')
          : t('admin.finance.receipts.downloadAr')}
      </button>
      <button
        type="button"
        className={btnClass}
        disabled={loadingLang != null}
        onClick={() => void handleDownload('fr')}
        aria-busy={loadingLang === 'fr'}
      >
        {loadingLang === 'fr'
          ? t('admin.finance.receipts.downloading')
          : t('admin.finance.receipts.downloadFr')}
      </button>
    </div>
  );
}
