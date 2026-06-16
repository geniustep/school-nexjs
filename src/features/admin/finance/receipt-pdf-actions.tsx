'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { downloadReceiptPdf } from '@/lib/api/finance-receipt';
import { receiptAllowsAction } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

export function ReceiptPdfActions({
  receipt,
  layout = 'bar',
}: {
  receipt: FinanceReceipt;
  layout?: 'bar' | 'stack';
}) {
  const t = useT();
  const toast = useToast();
  const [loadingLang, setLoadingLang] = useState<'ar' | 'fr' | null>(null);
  const canDownload =
    receiptAllowsAction(receipt, 'download') || receiptAllowsAction(receipt, 'print');

  const handleDownload = useCallback(
    async (lang: 'ar' | 'fr') => {
      if (loadingLang || !canDownload) return;
      setLoadingLang(lang);
      try {
        const result = await downloadReceiptPdf(receipt, lang);
        if (!result.ok && result.message) {
          toast.error(t(result.message));
        }
      } finally {
        setLoadingLang(null);
      }
    },
    [canDownload, loadingLang, receipt, t, toast],
  );

  if (!canDownload) return null;

  const btnClass = 'btn btn--ghost btn--sm';

  return (
    <div
      className={`receipt-pdf-actions receipt-pdf-actions--${layout}`}
    >
      <button
        type="button"
        className={btnClass}
        disabled={loadingLang != null}
        onClick={() => void handleDownload('ar')}
        aria-busy={loadingLang === 'ar'}
      >
        {loadingLang === 'ar'
          ? t('admin.finance.receipts.downloading')
          : t('admin.finance.receipts.downloadPdfAr')}
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
          : t('admin.finance.receipts.downloadPdfFr')}
      </button>
    </div>
  );
}
