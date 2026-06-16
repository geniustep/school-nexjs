'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { downloadCashSessionClosurePdf } from '@/lib/api/finance-cash-desk';
import { cashSessionAllowsAction } from '@/lib/utils/cash-session-normalize';
import type { CashSession } from '@/types/finance-cash-desk';

export function CashClosurePdfActions({ session }: { session: CashSession }) {
  const t = useT();
  const toast = useToast();
  const [loadingLang, setLoadingLang] = useState<'ar' | 'fr' | null>(null);
  const canPrint = cashSessionAllowsAction(session, 'print_closure');

  const handleDownload = useCallback(
    async (lang: 'ar' | 'fr') => {
      if (loadingLang || !canPrint) return;
      setLoadingLang(lang);
      try {
        const result = await downloadCashSessionClosurePdf(session, lang);
        if (!result.ok && result.message) {
          toast.error(t(result.message));
        }
      } finally {
        setLoadingLang(null);
      }
    },
    [canPrint, loadingLang, session, t, toast],
  );

  if (!canPrint) return null;

  return (
    <div className="receipt-pdf-actions receipt-pdf-actions--bar">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={loadingLang != null}
        onClick={() => void handleDownload('ar')}
        aria-busy={loadingLang === 'ar'}
      >
        {loadingLang === 'ar'
          ? t('admin.finance.cashDesk.pdfDownloading')
          : t('admin.finance.cashDesk.pdfAr')}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={loadingLang != null}
        onClick={() => void handleDownload('fr')}
        aria-busy={loadingLang === 'fr'}
      >
        {loadingLang === 'fr'
          ? t('admin.finance.cashDesk.pdfDownloading')
          : t('admin.finance.cashDesk.pdfFr')}
      </button>
    </div>
  );
}
