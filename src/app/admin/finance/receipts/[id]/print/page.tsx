'use client';

import { use, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_PAYMENTS } from '@/lib/permissions/finance';
import {
  normalizeFinanceReceipt,
  receiptAllowsAction,
} from '@/lib/utils/normalize-finance-receipt';
import {
  normalizeReceiptHtmlPrintLang,
  type ReceiptHtmlPrintLang,
} from '@/lib/utils/finance-receipt-html-print';
import type { FinanceReceipt } from '@/types/finance';
import './receipt-html-print.css';

const TEXT = {
  ar: {
    title: 'وصل أداء',
    subtitle: 'إيصال تحصيل مدرسي',
    schoolCopy: 'نسخة المؤسسة',
    payerCopy: 'نسخة المؤدي',
    receiptNo: 'رقم الوصل',
    date: 'التاريخ',
    payer: 'المؤدي',
    student: 'التلميذ',
    family: 'التلاميذ',
    reference: 'المرجع',
    method: 'طريقة الأداء',
    details: 'تفاصيل الأداء',
    total: 'المبلغ المؤدى',
    unallocated: 'رصيد غير موزع',
    cheque: 'رقم الشيك',
    issuedBy: 'أنجز بواسطة',
    stamp: 'ختم المؤسسة وتوقيعها',
    thankYou: 'شكرًا لثقتكم',
    cut: 'قص هنا',
    print: 'طباعة الوصل',
    close: 'إغلاق',
    unavailable: 'هذا الوصل غير متاح للطباعة.',
    noLines: 'لا توجد تفاصيل توزيع مرفقة بهذا الوصل.',
  },
  fr: {
    title: 'Reçu de paiement',
    subtitle: 'Encaissement scolaire',
    schoolCopy: "Copie de l’établissement",
    payerCopy: 'Copie du payeur',
    receiptNo: 'N° du reçu',
    date: 'Date',
    payer: 'Payeur',
    student: 'Élève',
    family: 'Élèves',
    reference: 'Référence',
    method: 'Mode de paiement',
    details: 'Détail du paiement',
    total: 'Montant payé',
    unallocated: 'Solde non affecté',
    cheque: 'N° du chèque',
    issuedBy: 'Établi par',
    stamp: 'Cachet et signature',
    thankYou: 'Merci pour votre confiance',
    cut: 'Couper ici',
    print: 'Imprimer le reçu',
    close: 'Fermer',
    unavailable: "Ce reçu n’est pas disponible à l’impression.",
    noLines: 'Aucun détail d’affectation n’est joint à ce reçu.',
  },
} as const;

function formatReceiptDate(value: string | null | undefined, lang: ReceiptHtmlPrintLang): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-MA' : 'ar-MA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatReceiptMoney(
  amount: number | null | undefined,
  currency: string | undefined,
  lang: ReceiptHtmlPrintLang,
): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  const value = new Intl.NumberFormat(lang === 'fr' ? 'fr-MA' : 'ar-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${value} ${currency || 'MAD'}`;
}

function paymentMethodPrintLabel(method: string | undefined, lang: ReceiptHtmlPrintLang): string {
  const normalized = (method ?? '').trim().toLowerCase();
  const labels: Record<string, { ar: string; fr: string }> = {
    cash: { ar: 'نقدًا', fr: 'Espèces' },
    cheque: { ar: 'شيك', fr: 'Chèque' },
    check: { ar: 'شيك', fr: 'Chèque' },
    transfer: { ar: 'تحويل بنكي', fr: 'Virement' },
    bank: { ar: 'تحويل بنكي', fr: 'Virement' },
    card: { ar: 'بطاقة', fr: 'Carte' },
  };
  return labels[normalized]?.[lang] ?? method ?? '—';
}

function issuedByName(receipt: FinanceReceipt): string | null {
  if (typeof receipt.issued_by === 'string') return receipt.issued_by;
  if (receipt.issued_by && typeof receipt.issued_by === 'object') {
    const name = (receipt.issued_by as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name;
  }
  return receipt.snapshot?.audit?.created_by ?? null;
}

function ReceiptCopy({
  receipt,
  lang,
  copy,
}: {
  receipt: FinanceReceipt;
  lang: ReceiptHtmlPrintLang;
  copy: 'school' | 'payer';
}) {
  const text = TEXT[lang];
  const snapshot = receipt.snapshot;
  const school = snapshot?.school;
  const student = snapshot?.student;
  const allocations = receipt.allocations ?? snapshot?.allocations ?? [];
  const children = receipt.children ?? snapshot?.children ?? [];
  const payerName =
    snapshot?.payer?.name ?? receipt.payer_name ?? receipt.billing_partner_name ?? '—';
  const studentName = student?.name ?? receipt.student_name ?? '—';
  const childrenNames = children
    .map((child) => child.student_name)
    .filter((name): name is string => typeof name === 'string' && !!name.trim());
  const beneficiary = childrenNames.length > 1 ? childrenNames.join(' • ') : studentName;
  const paymentDate = snapshot?.collection?.payment_date ?? receipt.issued_at;
  const reference =
    snapshot?.collection?.reference ??
    (receipt.collection_id != null ? `#${receipt.collection_id}` : '—');
  const receiptNumber = receipt.number ?? receipt.receipt_number ?? `#${receipt.id}`;
  const schoolName = school?.name ?? 'Raqeem School';
  const schoolInitial = schoolName.trim().charAt(0) || 'R';
  const issuer = issuedByName(receipt);
  const density = allocations.length > 7 ? 'dense' : allocations.length > 4 ? 'compact' : 'normal';
  const isFamily = childrenNames.length > 1 || receipt.is_multi_student === true;
  const chequeNumber = receipt.cheque?.number;

  return (
    <article className="receipt-html-copy" data-density={density}>
      <header className="receipt-html-copy__header">
        <div className="receipt-html-brand">
          <span className="receipt-html-brand__mark" aria-hidden="true">
            {schoolInitial}
          </span>
          <div className="receipt-html-brand__text">
            <strong dir="auto">{schoolName}</strong>
            <span>{text.subtitle}</span>
          </div>
        </div>
        <div className="receipt-html-copy__identity">
          <span className="receipt-html-copy__copy-label">
            {copy === 'school' ? text.schoolCopy : text.payerCopy}
          </span>
          <h1>{text.title}</h1>
          <span className="receipt-html-copy__number" dir="ltr">
            {receiptNumber}
          </span>
        </div>
      </header>

      <div className="receipt-html-copy__school-meta">
        {school?.address ? <span dir="auto">{school.address}</span> : null}
        {school?.phone ? <span dir="ltr">{school.phone}</span> : null}
      </div>

      <section className="receipt-html-copy__meta-grid">
        <div>
          <span>{text.date}</span>
          <strong>{formatReceiptDate(paymentDate, lang)}</strong>
        </div>
        <div>
          <span>{text.payer}</span>
          <strong dir="auto">{payerName}</strong>
        </div>
        <div>
          <span>{isFamily ? text.family : text.student}</span>
          <strong dir="auto">{beneficiary}</strong>
        </div>
        <div>
          <span>{text.method}</span>
          <strong>{paymentMethodPrintLabel(receipt.payment_method, lang)}</strong>
        </div>
        <div>
          <span>{text.reference}</span>
          <strong dir="auto">{reference}</strong>
        </div>
        {chequeNumber ? (
          <div>
            <span>{text.cheque}</span>
            <strong dir="auto">{chequeNumber}</strong>
          </div>
        ) : null}
      </section>

      <section className="receipt-html-copy__lines" aria-label={text.details}>
        <div className="receipt-html-copy__lines-head">
          <span>{text.details}</span>
          <span>{text.total}</span>
        </div>
        {allocations.length ? (
          <div className="receipt-html-copy__line-list">
            {allocations.map((row, index) => (
              <div
                className="receipt-html-copy__line"
                key={`${row.id ?? row.installment_id ?? index}-${index}`}
              >
                <span className="receipt-html-copy__line-label" dir="auto">
                  {row.student_name ? <b>{row.student_name} · </b> : null}
                  {row.description ?? row.label ?? '—'}
                </span>
                <strong dir="ltr">
                  {formatReceiptMoney(row.amount, receipt.currency, lang)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="receipt-html-copy__empty">{text.noLines}</p>
        )}
      </section>

      <footer className="receipt-html-copy__footer">
        <div className="receipt-html-copy__total-card">
          <span>{text.total}</span>
          <strong dir="ltr">
            {formatReceiptMoney(receipt.collection_amount, receipt.currency, lang)}
          </strong>
          {receipt.unallocated_amount != null && receipt.unallocated_amount > 0 ? (
            <small>
              {text.unallocated}:{' '}
              <b dir="ltr">
                {formatReceiptMoney(receipt.unallocated_amount, receipt.currency, lang)}
              </b>
            </small>
          ) : null}
        </div>
        <div className="receipt-html-copy__audit">
          {issuer ? (
            <span>
              {text.issuedBy}: <b dir="auto">{issuer}</b>
            </span>
          ) : null}
          <span className="receipt-html-copy__thanks">{text.thankYou}</span>
        </div>
        <div className="receipt-html-copy__stamp">
          <span>{text.stamp}</span>
        </div>
      </footer>
    </article>
  );
}

function DoubleReceiptSheet({
  receipt,
  lang,
}: {
  receipt: FinanceReceipt;
  lang: ReceiptHtmlPrintLang;
}) {
  const text = TEXT[lang];
  return (
    <div className="receipt-html-sheet" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <ReceiptCopy receipt={receipt} lang={lang} copy="school" />
      <div className="receipt-html-cut-line" aria-hidden="true">
        <span>✂</span>
        <i />
        <small>{text.cut}</small>
        <i />
      </div>
      <ReceiptCopy receipt={receipt} lang={lang} copy="payer" />
    </div>
  );
}

export default function AdminFinanceReceiptHtmlPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const lang = normalizeReceiptHtmlPrintLang(searchParams.get('lang'));
  const autoPrint = searchParams.get('auto') === '1';
  const state = useAdminResource<FinanceReceipt>(endpoints.admin.financeReceipt(id));
  const receipt = useMemo(
    () => (state.data ? normalizeFinanceReceipt(state.data) : null),
    [state.data],
  );
  const canPrint =
    !!receipt &&
    (receiptAllowsAction(receipt, 'print') || receiptAllowsAction(receipt, 'download'));
  const printedRef = useRef(false);
  const text = TEXT[lang];

  useEffect(() => {
    if (!receipt) return;
    const receiptNumber = receipt.number ?? receipt.receipt_number ?? String(receipt.id);
    document.title = `${text.title} — ${receiptNumber}`;
  }, [receipt, text.title]);

  useEffect(() => {
    if (!autoPrint || !canPrint || printedRef.current) return;
    const timer = window.setTimeout(() => {
      if (printedRef.current) return;
      printedRef.current = true;
      window.print();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [autoPrint, canPrint]);

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <main className="receipt-html-print-page" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="receipt-html-print-toolbar">
          <div>
            <strong>{text.title}</strong>
            <span>A5 · 2 × A6 · HTML</span>
          </div>
          <div className="receipt-html-print-toolbar__actions">
            <button type="button" className="btn btn--primary" onClick={() => window.print()}>
              {text.print}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => window.close()}>
              {text.close}
            </button>
          </div>
        </div>

        {state.loading && !receipt ? <LoadingState label="…" /> : null}
        {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}
        {receipt && !canPrint ? (
          <div className="receipt-html-print-message" role="alert">
            {text.unavailable}
          </div>
        ) : null}
        {receipt && canPrint ? <DoubleReceiptSheet receipt={receipt} lang={lang} /> : null}
      </main>
    </RequireAdminPermission>
  );
}
