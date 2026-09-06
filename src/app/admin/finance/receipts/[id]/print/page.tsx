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
  className?: string;
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

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    );
  }

  if (name === 'wallet') {
    return (
      <svg {...common}>
        <path d="M4 7.5h15a2 2 0 0 1 2 2v8.5H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" />
        <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
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
  const classRecord = readMeta(source.class ?? source.section ?? source.classroom);

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
    className:
      firstString(source, ['class_name', 'section_name', 'classroom_name', 'class_label']) ??
      relationLabel(source, ['class', 'section', 'classroom']) ??
      firstString(nestedStudent, ['class_name', 'section_name', 'classroom_name', 'class_label']) ??
      relationLabel(nestedStudent, ['class', 'section', 'classroom']),
    levelName:
      firstString(source, ['level_name', 'grade_name', 'academic_level_name', 'level_label']) ??
      relationLabel(source, ['level', 'grade']) ??
      firstString(classRecord, ['level_name', 'grade_name', 'academic_level_name']) ??
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
    className: primary.className ?? fallback.className,
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
  const academic = [
    student.levelName ? `المستوى: ${student.levelName}` : null,
    student.className ? `القسم: ${student.className}` : null,
  ].filter((value): value is string => !!value);

  return (
    <div className="receipt-student-cell">
      <strong dir="auto">{student.name}</strong>
      {academic.length ? (
        <small className="receipt-student-cell__academic" dir="auto">
          {academic.join(' · ')}
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

function SiblingRoster({ students }: { students: StudentDisplay[] }) {
  if (students.length <= 1) return null;
  return (
    <div className="receipt-siblings" aria-label="التلاميذ المشمولون في الوصل">
      {students.map((student, index) => (
        <div className="receipt-siblings__student" key={`${student.id ?? student.name}-${index}`}>
          <StudentMeta student={student} />
        </div>
      ))}
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
  const students = childrenDisplay(receipt);
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
  const density =
    rows.length > 9 || students.length > 4
      ? 'extended'
      : rows.length > 7
        ? 'dense'
        : rows.length > 4 || students.length > 2
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
              <strong dir="ltr">{formatDate(paymentDate, lang)}</strong>
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

      <SiblingRoster students={students} />

      <section className="receipt-details">
        <div className="receipt-table" role="table" aria-label="تفاصيل الأداء">
          <div className="receipt-table__row receipt-table__head" role="row">
            <span role="columnheader">التلميذ</span>
            <span role="columnheader">الخدمة / الرسم</span>
            <span role="columnheader">المبلغ</span>
          </div>
          {rows.length ? (
            rows.map((row, index) => {
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
            })
          ) : (
            <div className="receipt-table__empty">{UI_TEXT[lang].noLines}</div>
          )}
        </div>
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
  const rows = receiptRows(receipt);
  const students = childrenDisplay(receipt);
  const extended = rows.length > 9 || students.length > 4;

  return (
    <div className="receipt-html-sheet" data-layout={extended ? 'extended' : 'double'} dir="rtl">
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
