'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
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
import type { FinanceReceipt, FinanceReceiptAllocation } from '@/types/finance';
import './receipt-html-print.css';

type CopyKind = 'admin' | 'payer';
type ReceiptIconName = 'calendar' | 'clock' | 'wallet' | 'user' | 'phone' | 'pin' | 'mail';

const UI_TEXT = {
  ar: {
    preview: 'معاينة وصل الأداء',
    print: 'طباعة الوصل',
    close: 'إغلاق',
    unavailable: 'هذا الوصل غير متاح للطباعة.',
    noLines: 'لا توجد تفاصيل توزيع مرفقة بهذا الوصل.',
  },
  fr: {
    preview: 'Aperçu du reçu de paiement',
    print: 'Imprimer le reçu',
    close: 'Fermer',
    unavailable: "Ce reçu n’est pas disponible à l’impression.",
    noLines: "Aucun détail d’affectation n’est joint à ce reçu.",
  },
} as const;

function ReceiptIcon({ name }: { name: ReceiptIconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...common}>
          <path d="M4 7.5h15a2 2 0 0 1 2 2v8.5H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" />
          <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <path d="M6.6 3.8 9 3l2 5-1.8 1.1a14 14 0 0 0 5.7 5.7L16 13l5 2-1 2.4a3 3 0 0 1-3.2 1.8A16.5 16.5 0 0 1 4.8 7a3 3 0 0 1 1.8-3.2Z" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...common}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
  }
}

function bilingual(ar: string, fr: string) {
  return (
    <span className="receipt-html-bi-label">
      <b>{ar}</b>
      <small>{fr}</small>
    </span>
  );
}

function formatDate(value: string | null | undefined, lang: ReceiptHtmlPrintLang): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-MA' : 'ar-MA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTime(value: string | null | undefined, lang: ReceiptHtmlPrintLang): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-MA' : 'ar-MA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatMoney(
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

function paymentMethodLabel(method: string | undefined): { ar: string; fr: string } {
  const normalized = (method ?? '').trim().toLowerCase();
  const labels: Record<string, { ar: string; fr: string }> = {
    cash: { ar: 'نقدًا', fr: 'Espèces' },
    cheque: { ar: 'شيك', fr: 'Chèque' },
    check: { ar: 'شيك', fr: 'Chèque' },
    transfer: { ar: 'تحويل بنكي', fr: 'Virement' },
    bank: { ar: 'تحويل بنكي', fr: 'Virement' },
    card: { ar: 'بطاقة', fr: 'Carte' },
  };
  return labels[normalized] ?? { ar: method || '—', fr: method || '—' };
}

function issuedByName(receipt: FinanceReceipt): string | null {
  if (typeof receipt.issued_by === 'string') return receipt.issued_by;
  if (receipt.issued_by && typeof receipt.issued_by === 'object') {
    const name = (receipt.issued_by as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name;
  }
  return receipt.snapshot?.audit?.created_by ?? null;
}

function receiptAllocationRows(receipt: FinanceReceipt): FinanceReceiptAllocation[] {
  const direct = receipt.allocations ?? receipt.snapshot?.allocations ?? [];
  if (direct.length) return direct;

  const children = receipt.children ?? receipt.snapshot?.children ?? [];
  return children.flatMap((child) =>
    (child.allocations ?? []).map((line) => ({
      ...line,
      student_name: line.student_name ?? child.student_name,
      student_id: line.student_id ?? child.student_id,
    })),
  );
}

async function waitForReceiptImages(): Promise<void> {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>('img[data-receipt-print-image="school-logo"]'),
  );

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          image.addEventListener('load', finish, { once: true });
          image.addEventListener('error', finish, { once: true });
          window.setTimeout(finish, 2500);
        });
      }

      if (image.complete && image.naturalWidth > 0 && typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch {
          // Rendering can continue with the already-loaded image or the visual fallback.
        }
      }
    }),
  );
}

function SchoolReceiptMark({
  schoolName,
  schoolCode,
}: {
  schoolName: string;
  schoolCode: string | null;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const schoolInitial = schoolName.trim().charAt(0) || 'R';
  const displayCode = schoolCode || 'R';
  const logoUrl = schoolCode
    ? `/api/public/school-branding/logo?school_code=${encodeURIComponent(schoolCode)}`
    : null;

  return (
    <div className="receipt-html-school-mark" aria-label={schoolName}>
      {logoUrl && !logoFailed ? (
        <img
          src={logoUrl}
          alt={`شعار ${schoolName}`}
          data-receipt-print-image="school-logo"
          onError={() => setLogoFailed(true)}
          style={{
            width: '22mm',
            height: '17mm',
            maxWidth: '22mm',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      ) : (
        <span>{schoolInitial}</span>
      )}
      <small dir="ltr">{displayCode}</small>
    </div>
  );
}

function Fact({
  icon,
  ar,
  fr,
  value,
  secondary,
}: {
  icon: ReceiptIconName;
  ar: string;
  fr: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="receipt-html-fact">
      <span className="receipt-html-fact__icon">
        <ReceiptIcon name={icon} />
      </span>
      <span className="receipt-html-fact__text">
        {bilingual(ar, fr)}
        <strong dir="auto">{value}</strong>
        {secondary ? <small dir="auto">{secondary}</small> : null}
      </span>
    </div>
  );
}

function ReceiptCopy({
  receipt,
  lang,
  copy,
}: {
  receipt: FinanceReceipt;
  lang: ReceiptHtmlPrintLang;
  copy: CopyKind;
}) {
  const snapshot = receipt.snapshot;
  const school = snapshot?.school;
  const student = snapshot?.student;
  const allocations = receiptAllocationRows(receipt);
  const children = receipt.children ?? snapshot?.children ?? [];
  const childrenNames = children
    .map((child) => child.student_name)
    .filter((name): name is string => typeof name === 'string' && !!name.trim());
  const studentName = student?.name ?? receipt.student_name ?? '—';
  const fallbackStudent = childrenNames.length === 1 ? childrenNames[0] : studentName;
  const payerName =
    receipt.actual_payer_name?.trim() ||
    snapshot?.payer?.name ||
    receipt.payer_name ||
    receipt.billing_partner_name ||
    '—';
  const paymentDate = snapshot?.collection?.payment_date ?? receipt.issued_at;
  const receiptNumber = receipt.number ?? receipt.receipt_number ?? `#${receipt.id}`;
  const schoolName = school?.name ?? 'Raqeem School';
  const schoolCode = school?.code?.trim() || null;
  const issuer = issuedByName(receipt) ?? '—';
  const method = paymentMethodLabel(receipt.payment_method);
  const density = allocations.length > 9 ? 'dense' : allocations.length > 5 ? 'compact' : 'normal';
  const chequeNumber = receipt.cheque?.number;
  const reference = snapshot?.collection?.reference;

  return (
    <article className="receipt-html-copy" data-density={density}>
      <header className="receipt-html-copy__header">
        <div className="receipt-html-school-name">
          <strong dir="auto">{schoolName}</strong>
          <span>Établissement scolaire</span>
          {school?.address ? <small dir="auto">{school.address}</small> : null}
        </div>

        <div className="receipt-html-title-block">
          <span className="receipt-html-copy__copy-label">
            {copy === 'admin' ? 'نسخة الإدارة' : 'نسخة المؤدي'}
          </span>
          <h1>وصل الأداء</h1>
          <span>Reçu de Paiement</span>
        </div>

        <SchoolReceiptMark schoolName={schoolName} schoolCode={schoolCode} />
      </header>

      <section className="receipt-html-overview">
        <div className="receipt-html-facts-grid">
          <Fact icon="calendar" ar="تاريخ الأداء" fr="Date de paiement" value={formatDate(paymentDate, lang)} />
          <Fact icon="clock" ar="الساعة" fr="Heure" value={formatTime(paymentDate, lang)} />
          <Fact icon="wallet" ar="طريقة الأداء" fr="Mode de paiement" value={method.ar} secondary={method.fr} />
          <Fact icon="user" ar="المستلم" fr="Reçu par" value={issuer} />
        </div>

        <div className="receipt-html-number-card">
          {bilingual('رقم الوصل', 'N° de reçu')}
          <strong dir="ltr">{receiptNumber}</strong>
          <div className="receipt-html-number-card__barcode" aria-hidden="true" />
          <div className="receipt-html-number-card__extras">
            <span dir="auto">{payerName}</span>
            {student?.code ? <span dir="ltr">#{student.code}</span> : null}
          </div>
        </div>
      </section>

      <section className="receipt-html-details">
        <div className="receipt-html-details__title">تفاصيل الأداء <span>• Détails du paiement</span></div>
        <div className="receipt-html-table" role="table" aria-label="تفاصيل الأداء">
          <div className="receipt-html-table__row receipt-html-table__head" role="row">
            <span role="columnheader">التلميذ <small>Élève</small></span>
            <span role="columnheader">الخدمة / الرسم <small>Service / Frais</small></span>
            <span role="columnheader">المبلغ <small>Montant</small></span>
          </div>
          {allocations.length ? (
            allocations.map((row, index) => (
              <div className="receipt-html-table__row" role="row" key={`${row.id ?? row.installment_id ?? index}-${index}`}>
                <span role="cell" dir="auto">{row.student_name ?? fallbackStudent}</span>
                <span role="cell" dir="auto">{row.description ?? row.label ?? '—'}</span>
                <strong role="cell" dir="ltr">{formatMoney(row.amount, receipt.currency, lang)}</strong>
              </div>
            ))
          ) : (
            <div className="receipt-html-table__empty">{UI_TEXT[lang].noLines}</div>
          )}
          <div className="receipt-html-table__row receipt-html-table__total" role="row">
            <span />
            <span>{bilingual('المجموع', 'Total')}</span>
            <strong dir="ltr">{formatMoney(receipt.collection_amount, receipt.currency, lang)}</strong>
          </div>
        </div>
      </section>

      <footer className="receipt-html-copy__footer">
        <div className="receipt-html-thanks">
          <span className="receipt-html-thanks__icon">
            <ReceiptIcon name="user" />
          </span>
          <span>
            <strong>شكرًا لكم على ثقتكم</strong>
            <small>Merci pour votre confiance</small>
          </span>
        </div>

        <div className="receipt-html-signature">
          <strong>إمضاء</strong>
          <small>Signature</small>
          <span />
        </div>

        <div className="receipt-html-contact-line">
          {school?.address ? (
            <span><ReceiptIcon name="pin" /><b dir="auto">{school.address}</b></span>
          ) : null}
          {school?.phone ? (
            <span><ReceiptIcon name="phone" /><b dir="ltr">{school.phone}</b></span>
          ) : null}
          {school?.email ? (
            <span><ReceiptIcon name="mail" /><b dir="ltr">{school.email}</b></span>
          ) : null}
          {reference ? <span className="receipt-html-contact-line__reference" dir="auto">{reference}</span> : null}
          {chequeNumber ? <span className="receipt-html-contact-line__reference" dir="auto">Chèque: {chequeNumber}</span> : null}
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
  return (
    <div className="receipt-html-sheet" dir="rtl">
      <ReceiptCopy receipt={receipt} lang={lang} copy="admin" />
      <div className="receipt-html-cut-line" aria-hidden="true">
        <span className="receipt-html-cut-line__scissors">✂</span>
        <i />
        <small>يرجى قص هنا بعد الطباعة</small>
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
  const text = UI_TEXT[lang];

  useEffect(() => {
    if (!receipt) return;
    const receiptNumber = receipt.number ?? receipt.receipt_number ?? String(receipt.id);
    document.title = `وصل الأداء — ${receiptNumber}`;
  }, [receipt]);

  useEffect(() => {
    if (!autoPrint || !canPrint || !receipt || printedRef.current) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        await waitForReceiptImages();
        if (cancelled || printedRef.current) return;
        printedRef.current = true;
        window.print();
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoPrint, canPrint, receipt]);

  const handlePrint = async () => {
    await waitForReceiptImages();
    window.print();
  };

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <main className="receipt-html-print-page" dir="rtl">
        <div className="receipt-html-print-toolbar">
          <div>
            <strong>{text.preview}</strong>
            <span>A5 · نسختان · HTML</span>
          </div>
          <div className="receipt-html-print-toolbar__actions">
            <button type="button" className="btn btn--primary" onClick={() => void handlePrint()}>
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
