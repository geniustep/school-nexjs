'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  downloadReceiptPdf,
  previewReceiptPdf,
  type ReceiptPdfLang,
} from '@/lib/api/finance-receipt';
import { buildReceiptHtmlPrintPath } from '@/lib/utils/finance-receipt-html-print';
import { receiptAllowsAction } from '@/lib/utils/normalize-finance-receipt';
import type { ReceiptPrintLayout } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

function defaultReceiptLang(locale: string): ReceiptPdfLang {
  return locale === 'fr' ? 'fr' : 'ar';
}

function dualA6FamilyReceiptLabel(locale: string): string {
  switch (locale) {
    case 'ar':
      return 'وصل عائلي مزدوج — A5';
    case 'fr':
      return 'Reçu familial double — A5';
    case 'es':
      return 'Recibo familiar doble — A5';
    default:
      return 'Dual family receipt — A5';
  }
}

function htmlDoubleReceiptLabel(locale: string): string {
  return locale === 'fr' ? 'Imprimer le reçu A5 — HTML' : 'طباعة وصل A5 مزدوج — HTML';
}

function popupBlockedMessage(locale: string): string {
  return locale === 'fr'
    ? "La fenêtre d’impression a été bloquée. Autorisez les fenêtres contextuelles puis réessayez."
    : 'تم منع نافذة الطباعة المنبثقة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.';
}

function ReceiptPrintSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string; dir?: 'rtl' | 'ltr' | 'auto' }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="receipt-print-segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            dir={opt.dir}
            className={`receipt-print-segmented__item${active ? ' receipt-print-segmented__item--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ReceiptPdfActions({
  receipt,
  layout = 'bar',
}: {
  receipt: FinanceReceipt;
  layout?: 'bar' | 'stack';
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const [lang, setLang] = useState<ReceiptPdfLang>(() => defaultReceiptLang(locale));
  const [printLayout, setPrintLayout] = useState<ReceiptPrintLayout>('a4');
  const [busyAction, setBusyAction] = useState<'preview' | 'download' | null>(null);
  const canDownload =
    receiptAllowsAction(receipt, 'download') || receiptAllowsAction(receipt, 'print');
  const htmlPrintHref = buildReceiptHtmlPrintPath(receipt.id, lang);

  const runPdfAction = useCallback(
    async (action: 'preview' | 'download') => {
      if (busyAction || !canDownload) return;
      setBusyAction(action);
      try {
        const result =
          action === 'preview'
            ? await previewReceiptPdf(receipt, lang, printLayout)
            : await downloadReceiptPdf(receipt, lang, printLayout);
        if (!result.ok && result.message) {
          toast.error(t(result.message));
        }
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, canDownload, lang, printLayout, receipt, t, toast],
  );

  const openHtmlPrintPopup = useCallback(() => {
    if (!canDownload) return;
    const screenWidth = window.screen?.availWidth || 1200;
    const screenHeight = window.screen?.availHeight || 900;
    const width = Math.min(920, Math.max(720, screenWidth - 80));
    const height = Math.min(1080, Math.max(760, screenHeight - 80));
    const left = Math.max(0, Math.round((screenWidth - width) / 2));
    const top = Math.max(0, Math.round((screenHeight - height) / 2));
    const features = [
      'popup=yes',
      'resizable=yes',
      'scrollbars=yes',
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
    ].join(',');
    const popup = window.open(htmlPrintHref, `raqeem-receipt-print-${receipt.id}`, features);
    if (!popup) {
      toast.error(popupBlockedMessage(locale));
      return;
    }
    popup.focus();
  }, [canDownload, htmlPrintHref, locale, receipt.id, toast]);

  if (!canDownload) return null;

  const langOptions: Array<{ value: ReceiptPdfLang; label: string; dir?: 'rtl' | 'ltr' }> = [
    { value: 'ar', label: t('admin.finance.receipts.printLangAr'), dir: 'rtl' },
    { value: 'fr', label: t('admin.finance.receipts.printLangFr'), dir: 'ltr' },
  ];

  const layoutOptions: Array<{ value: ReceiptPrintLayout; label: string; dir?: 'rtl' | 'ltr' }> = [
    { value: 'a4', label: t('admin.finance.receipts.printLayoutA4'), dir: 'ltr' },
    { value: 'a5', label: t('admin.finance.receipts.printLayoutA5'), dir: 'ltr' },
    {
      value: 'a5_dual_a6_family',
      label: dualA6FamilyReceiptLabel(locale),
      dir: locale === 'ar' ? 'rtl' : 'ltr',
    },
    {
      value: 'thermal_80mm',
      label: t('admin.finance.receipts.printLayoutThermal'),
      dir: locale === 'ar' ? 'rtl' : 'ltr',
    },
  ];

  return (
    <div className={`receipt-print-panel receipt-print-panel--${layout}`}>
      <div className="receipt-print-panel__row">
        <span className="receipt-print-panel__label">{t('admin.finance.receipts.printLanguage')}</span>
        <ReceiptPrintSegmentedControl
          options={langOptions}
          value={lang}
          onChange={setLang}
          ariaLabel={t('admin.finance.receipts.printLanguage')}
        />
      </div>
      <div className="receipt-print-panel__row">
        <span className="receipt-print-panel__label">{t('admin.finance.receipts.printLayout')}</span>
        <ReceiptPrintSegmentedControl
          options={layoutOptions}
          value={printLayout}
          onChange={setPrintLayout}
          ariaLabel={t('admin.finance.receipts.printLayout')}
        />
      </div>
      <div className="receipt-print-panel__actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          title="HTML · A5 · 2 × A6"
          onClick={openHtmlPrintPopup}
        >
          {htmlDoubleReceiptLabel(locale)}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={busyAction != null}
          onClick={() => void runPdfAction('preview')}
          aria-busy={busyAction === 'preview'}
        >
          {busyAction === 'preview'
            ? t('admin.finance.receipts.previewing')
            : t('admin.finance.receipts.previewReceipt')}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={busyAction != null}
          onClick={() => void runPdfAction('download')}
          aria-busy={busyAction === 'download'}
        >
          {busyAction === 'download'
            ? t('admin.finance.receipts.downloading')
            : t('admin.finance.receipts.downloadPdf')}
        </button>
      </div>
    </div>
  );
}
