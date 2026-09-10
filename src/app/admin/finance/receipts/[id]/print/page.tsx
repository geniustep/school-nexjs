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
import type {
  FinanceReceipt,
  FinanceReceiptAllocation,
} from '@/types/finance';
import './receipt-html-print.css';

type CopyKind = 'admin' | 'payer';
type MetaRecord = Record<string, unknown>;
type ReceiptIconName = 'calendar' | 'wallet' | 'user';

type StudentDisplay = {
  id?: number;
  name: string;
  massar?: string;
  schoolNumber?: string;
  levelName?: string;
};

type ReceiptRow = FinanceReceiptAllocation & {
  studentDisplay: StudentDisplay;
};

const UI_TEXT = {
  ar: {
    preview: 'معاينة الوصل',
    print: 'طباعة الوصل',
    close: 'إغلاق',
    unavailable: 'هذا الوصل غير متاح للطباعة.',
    noLines: 'لا توجد تفاصيل توزيع مرفقة بهذا الوصل.',
  },
  fr: {
    preview: 'Aperçu du reçu',
    print: 'Imprimer le reçu',
    close: 'Fermer',
    unavailable: "Ce reçu n’est pas disponible à l’impression.",
    noLines: "Aucun détail d’affectation n’est joint à ce reçu.",
  },
} as const;

function readMeta(value: unknown): MetaRecord {
  return value && typeof value === 'object' ? (value as MetaRecord) : {};
}

function firstString(source: MetaRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function relationLabel(source: MetaRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    const nested = readMeta(value);
    const label = firstString(nested, ['name', 'display_name', 'label', 'title']);
    if (label) return label;
  }
  return undefined;
}

function firstMoney(source: MetaRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function normalizeIdentity(value: string | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

function ReceiptIcon({ name }: { name: ReceiptIconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.4" />
        <path d="M8 2.8v4M16 2.8v4M3 9.4h18" />
        <path d="M7.2 13h3M13.8 13h3M7.2 16.7h3M13.8 16.7h3" />
      </svg>
    );
  }

  if (name === 'wallet') {
    return (
      <svg {...common}>
        <path d="M4 6.5h14.5A2.5 2.5 0 0 1 21 9v9H5a2.5 2.5 0 0 1-2.5-2.5V6.7A2.7 2.7 0 0 1 5.2 4h11.3" />
        <path d="M15.5 11h5.5v4.5h-5.5a2.25 2.25 0 0 1 0-4.5Z" />
        <circle cx="16.7" cy="13.25" r="0.7" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="7.5" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
      <path d="M7 18.2c1.35-1.2 3-1.8 5-1.8s3.65.6 5 1.8" />
    </svg>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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

function paymentMethodLabel(method: string | undefined): string {
  const normalized = (method ?? '').trim().toLowerCase();
  const labels: Record<string, string> = {
    cash: 'نقدًا',
    cheque: 'شيك',
    check: 'شيك',
    transfer: 'تحويل بنكي',
    bank: 'تحويل بنكي',
    card: 'بطاقة',
  };
  return labels[normalized] ?? method ?? '—';
}

function issuedByName(receipt: FinanceReceipt): string | null {
  if (typeof receipt.issued_by === 'string') return receipt.issued_by;
  if (receipt.issued_by && typeof receipt.issued_by === 'object') {
    const name = (receipt.issued_by as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return receipt.snapshot?.audit?.created_by ?? null;
}

function studentDisplayFrom(
  sourceValue: unknown,
  fallbackName = '—',
  fallbackId?: number,
): StudentDisplay {
  const source = readMeta(sourceValue);
  const nestedStudent = readMeta(source.student);

  return {
    id:
      typeof source.student_id === 'number'
        ? source.student_id
        : typeof source.id === 'number'
          ? source.id
          : typeof nestedStudent.id === 'number'
            ? nestedStudent.id
            : fallbackId,
    name:
      firstString(source, ['student_name', 'name', 'full_name', 'display_name']) ??
      firstString(nestedStudent, ['student_name', 'name', 'full_name', 'display_name']) ??
      fallbackName,
    massar:
      firstString(source, ['massar', 'massar_number', 'massar_code', 'massar_id']) ??
      firstString(nestedStudent, ['massar', 'massar_number', 'massar_code', 'massar_id']),
    schoolNumber:
      firstString(source, ['school_number', 'student_code', 'code']) ??
      firstString(nestedStudent, ['school_number', 'student_code', 'code']),
    levelName:
      firstString(source, ['level_name', 'grade_name', 'academic_level_name', 'level_label']) ??
      relationLabel(source, ['level', 'grade']) ??
      firstString(nestedStudent, ['level_name', 'grade_name', 'academic_level_name', 'level_label']) ??
      relationLabel(nestedStudent, ['level', 'grade']),
  };
}

function mergeStudentDisplay(primary: StudentDisplay, fallback: StudentDisplay): StudentDisplay {
  return {
    id: primary.id ?? fallback.id,
    name: primary.name !== '—' ? primary.name : fallback.name,
    massar: primary.massar ?? fallback.massar,
    schoolNumber: primary.schoolNumber ?? fallback.schoolNumber,
    levelName: primary.levelName ?? fallback.levelName,
  };
}

function childrenDisplay(receipt: FinanceReceipt): StudentDisplay[] {
  const children = receipt.children ?? receipt.snapshot?.children ?? [];
  if (children.length) {
    return children.map((child) =>
      studentDisplayFrom(child, child.student_name ?? '—', child.student_id),
    );
  }

  const snapshotStudent = receipt.snapshot?.student;
  if (snapshotStudent || receipt.student_name) {
    return [
      studentDisplayFrom(
        snapshotStudent,
        receipt.student_name ?? snapshotStudent?.name ?? '—',
        receipt.student_id,
      ),
    ];
  }
  return [];
}

function matchChild(
  allocation: FinanceReceiptAllocation,
  children: StudentDisplay[],
): StudentDisplay | undefined {
  if (allocation.student_id != null) {
    const byId = children.find((child) => child.id === allocation.student_id);
    if (byId) return byId;
  }

  const allocationName = normalizeIdentity(allocation.student_name);
  if (allocationName) {
    return children.find((child) => normalizeIdentity(child.name) === allocationName);
  }

  return children.length === 1 ? children[0] : undefined;
}

function allocationIdentity(allocation: FinanceReceiptAllocation): string {
  if (allocation.id != null) return `id:${allocation.id}`;
  if (allocation.installment_id != null) {
    return `installment:${allocation.installment_id}:${allocation.amount ?? ''}`;
  }
  return [
    'row',
    allocation.student_id ?? '',
    normalizeIdentity(allocation.student_name),
    allocation.amount ?? '',
    normalizeIdentity(allocation.description ?? allocation.label),
  ].join(':');
}

function receiptRows(receipt: FinanceReceipt): ReceiptRow[] {
  const children = receipt.children ?? receipt.snapshot?.children ?? [];
  const displays = childrenDisplay(receipt);

  const childRows = children.flatMap((child) => {
    const childDisplay = studentDisplayFrom(child, child.student_name ?? '—', child.student_id);
    return (child.allocations ?? []).map((allocation) => ({
      ...allocation,
      studentDisplay: mergeStudentDisplay(
        studentDisplayFrom(
          allocation,
          allocation.student_name ?? childDisplay.name,
          allocation.student_id ?? childDisplay.id,
        ),
        childDisplay,
      ),
    }));
  });

  const known = new Set(childRows.map((row) => allocationIdentity(row)));
  const direct = receipt.allocations ?? receipt.snapshot?.allocations ?? [];
  const directRows = direct
    .filter((allocation) => !known.has(allocationIdentity(allocation)))
    .map((allocation) => {
      const matchedChild = matchChild(allocation, displays);
      const directDisplay = studentDisplayFrom(
        allocation,
        allocation.student_name ?? matchedChild?.name ?? '—',
        allocation.student_id ?? matchedChild?.id,
      );
      return {
        ...allocation,
        studentDisplay: matchedChild
          ? mergeStudentDisplay(directDisplay, matchedChild)
          : directDisplay,
      };
    });

  if (childRows.length || directRows.length) return [...childRows, ...directRows];
  return [];
}

function rowRemaining(row: FinanceReceiptAllocation): number | undefined {
  return firstMoney(readMeta(row), [
    'remaining_after_payment',
    'remaining_amount',
    'balance_after_payment',
    'remaining_due',
    'outstanding_amount',
  ]);
}

function receiptRemaining(receipt: FinanceReceipt): number | undefined {
  const keys = [
    'remaining_after_payment',
    'remaining_amount',
    'balance_after_payment',
    'total_remaining',
    'remaining_due',
    'outstanding_amount',
  ];
  const direct = firstMoney(readMeta(receipt), keys);
  if (direct != null) return direct;

  return firstMoney(readMeta(receipt.totals ?? receipt.snapshot?.totals), keys);
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
          // Printing can continue with the browser-rendered image or visual fallback.
        }
      }
    }),
  );
}

function SchoolIdentity({ schoolName, schoolCode }: { schoolName: string; schoolCode: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const initial = schoolName.trim().charAt(0) || 'ر';
  const logoUrl = schoolCode
    ? `/api/public/school-branding/logo?school_code=${encodeURIComponent(schoolCode)}`
    : null;

  return (
    <div className="receipt-school-identity" aria-label={schoolName}>
      {logoUrl && !logoFailed ? (
        <img
          src={logoUrl}
          alt={`شعار ${schoolName}`}
          data-receipt-print-image="school-logo"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="receipt-school-identity__fallback">{initial}</span>
      )}
      <strong dir="auto">{schoolName}</strong>
    </div>
  );
}

function StudentMeta({ student }: { student: StudentDisplay }) {
  return (
    <div className="receipt-student-cell">
      <strong dir="auto">{student.name}</strong>
      {student.levelName ? (
        <small className="receipt-student-cell__academic" dir="auto">
          المستوى: {student.levelName}
        </small>
      ) : null}
      {student.massar ? (
        <small className="receipt-student-cell__identifier">
          <span>رقم مسار:</span>
          <b dir="ltr">{student.massar}</b>
        </small>
      ) : student.schoolNumber ? (
        <small className="receipt-student-cell__identifier">
          <span>الرقم المدرسي:</span>
          <b dir="ltr">{student.schoolNumber}</b>
        </small>
      ) : null}
    </div>
  );
}

function ReceiptTable({
  rows,
  receipt,
  lang,
  ariaLabel,
}: {
  rows: ReceiptRow[];
  receipt: FinanceReceipt;
  lang: ReceiptHtmlPrintLang;
  ariaLabel: string;
}) {
  return (
    <div className="receipt-table" role="table" aria-label={ariaLabel}>
      <div className="receipt-table__row receipt-table__head" role="row">
        <span role="columnheader">التلميذ</span>
        <span role="columnheader">الخدمة / الرسم</span>
        <span role="columnheader">المبلغ</span>
      </div>
      {rows.map((row, index) => {
        const rowBalance = rowRemaining(row);
        return (
          <div
            className="receipt-table__row"
            role="row"
            key={`${row.id ?? row.installment_id ?? index}-${index}`}
          >
            <span role="cell"><StudentMeta student={row.studentDisplay} /></span>
            <span role="cell" dir="auto">{row.description ?? row.label ?? '—'}</span>
            <strong role="cell" dir="ltr">
              {formatMoney(row.amount, receipt.currency, lang)}
              {rowBalance != null && rowBalance > 0 ? (
                <small>الباقي: {formatMoney(rowBalance, receipt.currency, lang)}</small>
              ) : null}
            </strong>
          </div>
        );
      })}
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
  const rows = receiptRows(receipt);
  const splitTable = rows.length > 6;
  const splitIndex = Math.ceil(rows.length / 2);
  const rightRows = splitTable ? rows.slice(0, splitIndex) : rows;
  const leftRows = splitTable ? rows.slice(splitIndex) : [];
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
  const issuer = issuedByName(receipt);
  const method = paymentMethodLabel(receipt.payment_method);
  const remaining = receiptRemaining(receipt);
  const density = splitTable
    ? rows.length > 16
      ? 'split-dense'
      : 'split'
    : rows.length > 4
      ? 'compact'
      : 'normal';

  return (
    <article className="receipt-html-copy" data-density={density}>
      <header className="receipt-copy-header">
        <SchoolIdentity schoolName={schoolName} schoolCode={schoolCode} />
        <div className="receipt-number-card">
          <div className="receipt-number-card__number">
            <span>رقم الوصل</span>
            <strong dir="ltr">{receiptNumber}</strong>
          </div>
          <div className="receipt-number-card__barcode" aria-hidden="true" />
          <div className="receipt-number-card__date">
            <span className="receipt-meta-icon receipt-meta-icon--calendar">
              <ReceiptIcon name="calendar" />
            </span>
            <span className="receipt-number-card__date-text">
              <span>تاريخ الأداء</span>
              <strong className="receipt-number-card__date-value" dir="ltr">
                {formatDate(paymentDate)}
              </strong>
            </span>
          </div>
        </div>
      </header>

      <section className="receipt-payment-facts">
        <div className="receipt-payment-fact">
          <span className="receipt-meta-icon receipt-meta-icon--wallet">
            <ReceiptIcon name="wallet" />
          </span>
          <span className="receipt-payment-fact__text">
            <span>طريقة الأداء</span>
            <strong dir="auto">{method}</strong>
          </span>
        </div>
        <i aria-hidden="true" />
        <div className="receipt-payment-fact">
          <span className="receipt-meta-icon receipt-meta-icon--user">
            <ReceiptIcon name="user" />
          </span>
          <span className="receipt-payment-fact__text">
            <span>المؤدي</span>
            <strong dir="auto">{payerName}</strong>
          </span>
        </div>
      </section>

      <section className="receipt-details" data-columns={splitTable ? '2' : '1'}>
        {rows.length ? (
          splitTable ? (
            <div className="receipt-details__columns">
              <div className="receipt-details__column receipt-details__column--right">
                <ReceiptTable rows={rightRows} receipt={receipt} lang={lang} ariaLabel="تفاصيل الأداء — الجزء الأول" />
              </div>
              <div className="receipt-details__column receipt-details__column--left">
                <ReceiptTable rows={leftRows} receipt={receipt} lang={lang} ariaLabel="تفاصيل الأداء — الجزء الثاني" />
              </div>
            </div>
          ) : (
            <ReceiptTable rows={rows} receipt={receipt} lang={lang} ariaLabel="تفاصيل الأداء" />
          )
        ) : (
          <div className="receipt-table receipt-table__empty">{UI_TEXT[lang].noLines}</div>
        )}
      </section>

      <section className="receipt-total-card">
        <span>المجموع</span>
        <strong dir="ltr">{formatMoney(receipt.collection_amount, receipt.currency, lang)}</strong>
        {remaining != null && remaining > 0 ? (
          <small dir="ltr">الباقي: {formatMoney(remaining, receipt.currency, lang)}</small>
        ) : null}
      </section>

      <footer className="receipt-copy-footer">
        <div className="receipt-thanks">شكرًا لكم على ثقتكم</div>
        {copy === 'admin' && issuer ? (
          <div className="receipt-issuer" dir="auto">{issuer}</div>
        ) : <span />}
      </footer>
    </article>
  );
}

function DoubleReceiptSheet({ receipt, lang }: { receipt: FinanceReceipt; lang: ReceiptHtmlPrintLang }) {
  return (
    <div className="receipt-html-sheet" data-layout="double" dir="rtl">
      <ReceiptCopy receipt={receipt} lang={lang} copy="admin" />
      <div className="receipt-html-cut-line" aria-hidden="true">
        <span>✂</span>
        <i />
        <small>قص هنا</small>
        <i />
        <span>✂</span>
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
    document.title = receiptNumber;
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
            <span>A5 · HTML</span>
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
          <div className="receipt-html-print-message" role="alert">{text.unavailable}</div>
        ) : null}
        {receipt && canPrint ? <DoubleReceiptSheet receipt={receipt} lang={lang} /> : null}
      </main>
    </RequireAdminPermission>
  );
}
