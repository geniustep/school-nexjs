'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { downloadReceiptPdf } from '@/lib/api/finance-receipt';
import { receiptAllowsAction } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

export function ReceiptActionsMenu({
  receipt,
  onView,
}: {
  receipt: FinanceReceipt;
  onView: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loadingLang, setLoadingLang] = useState<'ar' | 'fr' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const canDownload =
    receiptAllowsAction(receipt, 'download') || receiptAllowsAction(receipt, 'print');

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleDownload = useCallback(
    async (lang: 'ar' | 'fr') => {
      if (loadingLang || !canDownload) return;
      setLoadingLang(lang);
      setOpen(false);
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

  return (
    <div className="receipt-actions-menu" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn btn--ghost btn--sm receipt-actions-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={loadingLang != null}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMoreHorizontal size={16} aria-hidden />
        <span>{t('admin.finance.receipts.actionsMenu')}</span>
      </button>
      {open ? (
        <div className="receipt-actions-menu__panel" role="menu">
          <button
            type="button"
            className="receipt-actions-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onView();
            }}
          >
            {t('admin.finance.receipts.viewReceipt')}
          </button>
          {canDownload ? (
            <>
              <button
                type="button"
                className="receipt-actions-menu__item"
                role="menuitem"
                disabled={loadingLang != null}
                onClick={() => void handleDownload('ar')}
              >
                {loadingLang === 'ar'
                  ? t('admin.finance.receipts.downloading')
                  : t('admin.finance.receipts.downloadPdfAr')}
              </button>
              <button
                type="button"
                className="receipt-actions-menu__item"
                role="menuitem"
                disabled={loadingLang != null}
                onClick={() => void handleDownload('fr')}
              >
                {loadingLang === 'fr'
                  ? t('admin.finance.receipts.downloading')
                  : t('admin.finance.receipts.downloadPdfFr')}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
