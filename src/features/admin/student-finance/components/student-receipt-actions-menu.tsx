'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useFloatingMenuPosition } from '@/features/admin/student-finance/utils/use-floating-menu-position';
import { downloadReceiptPdf } from '@/lib/api/finance-receipt';
import { receiptAllowsAction } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';
import './student-receipt-actions-menu.css';

export function StudentReceiptActionsMenu({
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const position = useFloatingMenuPosition(open, triggerRef, panelRef);

  const canDownload =
    receiptAllowsAction(receipt, 'download') || receiptAllowsAction(receipt, 'print');

  useEffect(() => {
    if (!open) return;

    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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

  const panel =
    open && typeof document !== 'undefined' ? (
      <div
        ref={panelRef}
        className={`receipt-actions-menu__panel student-receipt-actions-menu__panel student-receipt-actions-menu__panel--${position?.placement ?? 'bottom'}`}
        role="menu"
        style={
          position
            ? { top: position.top, left: position.left }
            : { top: -9999, left: -9999, visibility: 'hidden' as const }
        }
      >
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
    ) : null;

  return (
    <div className="receipt-actions-menu student-receipt-actions-menu" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn--ghost btn--sm receipt-actions-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={loadingLang != null}
        onClick={() => setOpen((value) => !value)}
      >
        <IconMoreHorizontal size={16} aria-hidden />
        <span>{t('admin.finance.receipts.actionsMenu')}</span>
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
