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
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
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
  const sourceId = source.student_id ?? source.id;
  return {
    id: typeof sourceId === 'number' ? sourceId : fallbackId,
    name:
      firstString(source, ['student_name', 'name', 'full_name', 'display_name']) ?? fallbackName,
    massar: firstString(source, [
      'massar',
      'massar_number',
      'massar_code',
      'massar_id',
      'massar_no',
    ]),
    schoolNumber: firstString(source, ['school_number', 'student_code', 'code']),
    className: firstString(source, [
      'class_name',
      'section_name',
      'classroom_name',
      'section',
      'class',
    ]),
    levelName: firstString(source, ['level_name', 'grade_name']),
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

function studentKey(student: StudentDisplay): string {
  if (student.id != null) return `id:${student.id}`;
  return `name:${student.name.trim().toLocaleLowerCase()}`;
}

function childSources(receipt: FinanceReceipt): unknown[] {
  const direct = Array.isArray(receipt.children) ? receipt.children : [];
  const snapshot = Array.isArray(receipt.snapshot?.children) ? receipt.snapshot.children : [];
  return [...direct, ...snapshot];
}

function childAllocations(sourceValue: unknown): FinanceReceiptAllocation[] {
  const allocations = readMeta(sourceValue).allocations;
  return Array.isArray(allocations) ? (allocations as FinanceReceiptAllocation[]) : [];
}

function childrenDisplay(receipt: FinanceReceipt): StudentDisplay[] {
  const byKey = new Map<string, StudentDisplay>();
  const add = (student: StudentDisplay) => {
    const key = studentKey(student);
    const current = byKey.get(key);
    byKey.set(key, current ? mergeStudentDisplay(current, student) : student);
  };

  childSources(receipt).forEach((child) => {
    const meta = readMeta(child);
    const fallbackId = typeof meta.student_id === 'number' ? meta.student_id : undefined;
    add(studentDisplayFrom(child, firstString(meta, ['student_name', 'name']) ?? '—', fallbackId));
  });

  const snapshotStudent = receipt.snapshot?.student;
  if (snapshotStudent || receipt.student_name) {
    add(
      studentDisplayFrom(
        snapshotStudent,
        receipt.student_name ?? snapshotStudent?.name ?? '—',
        receipt.student_id,
      ),
    );
  }

  return [...byKey.values()].filter((student) => student.name !== '—' || student.id != null);
}

function findStudentForAllocation(
  allocation: FinanceReceiptAllocation,
  students: StudentDisplay[],
): StudentDisplay | undefined {
  if (allocation.student_id != null) {
    const byId = students.find((student) => student.id === allocation.student_id);
    if (byId) return byId;
  }
  if (allocation.student_name) {
    const normalized = allocation.student_name.trim().toLocaleLowerCase();
    return students.find((student) => student.name.trim().toLocaleLowerCase() === normalized);
  }
  return undefined;
}

function allocationKey(allocation: FinanceReceiptAllocation, index: number): string {
  const meta = readMeta(allocation);
  const identity = firstString(meta, ['id', 'allocation_id']);
  if (identity) return `allocation:${identity}`;

  const installment = firstString(meta, ['installment_id', 'fee_id', 'line_id']) ?? '';
  const student = firstString(meta, ['student_id', 'student_name']) ?? '';
  const amount = firstMoney(meta, ['amount']) ?? '';
  const description = firstString(meta, ['description', 'label']) ?? '';
  return `signature:${student}:${installment}:${amount}:${description}:${index}`;
}

function receiptRows(receipt: FinanceReceipt): ReceiptRow[] {
  const students = childrenDisplay(receipt);
  const rows = new Map<string, ReceiptRow>();
  let sequence = 0;

  for (const child of childSources(receipt)) {
    const childMeta = readMeta(child);
    const childDisplay = studentDisplayFrom(
      child,
      firstString(childMeta, ['student_name', 'name']) ?? '—',
      typeof childMeta.student_id === 'number' ? childMeta.student_id : undefined,
    );

    for (const allocation of childAllocations(child)) {
      const key = allocationKey(allocation, sequence++);
      const allocationDisplay = studentDisplayFrom(
        allocation,
        allocation.student_name ?? childDisplay.name,
        allocation.student_id ?? childDisplay.id,
      );
      rows.set(key, {
        ...allocation,
        studentDisplay: mergeStudentDisplay(allocationDisplay, childDisplay),
      });
    }
  }

  const directAllocations = [
    ...(Array.isArray(receipt.allocations) ? receipt.allocations : []),
    ...(Array.isArray(receipt.snapshot?.allocations) ? receipt.snapshot.allocations : []),
  ];

  for (const allocation of directAllocations) {
    const key = allocationKey(allocation, sequence++);
    if (rows.has(key)) continue;

    const matched = findStudentForAllocation(allocation, students);
    const safeFallback =
      matched ??
      (students.length === 1
        ? students[0]
        : {
            id: allocation.student_id ?? undefined,
            name: allocation.student_name ?? '—',
          });

    rows.set(key, {
      ...allocation,
      studentDisplay: mergeStudentDisplay(
        studentDisplayFrom(
          allocation,
          allocation.student_name ?? safeFallback.name,
          allocation.student_id ?? safeFallback.id,
        ),
        safeFallback,
      ),
    });
  }

  return [...rows.values()];
}

function allocationRemaining(allocation: FinanceReceiptAllocation): number | undefined {
  return firstMoney(readMeta(allocation), [
    'remaining_after_payment',
    'remaining_amount',
    'remaining',
    'balance_after_payment',
    'balance',
  ]);
}

function receiptRemaining(receipt: FinanceReceipt): number | undefined {
  const direct = firstMoney(readMeta(receipt), [
    'remaining_after_payment',
    'remaining_amount',
    'remaining',
    'balance_after_payment',
    'balance',
  ]);
  if (direct != null) return direct;

  return firstMoney(readMeta(receipt.totals ?? receipt.snapshot?.totals), [
    'remaining_after_payment',
    'remaining_amount',
    'remaining',
    'balance_after_payment',
    'balance',
  ]);
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
  const details = [
    student.className ? `القسم: ${student.className}` : null,
    student.massar ? `مسار: ${student.massar}` : null,
    student.schoolNumber && student.schoolNumber !== student.massar
      ? `رقم التلميذ: ${student.schoolNumber}`
      : null,
  ].filter((value): value is string => !!value);

  return (
    <div className="receipt-student-cell">
      <strong dir="auto">{student.name}</strong>
      {details.length ? (
        <small>
          {details.map((detail, index) => (
            <span key={detail} dir={detail.includes('مسار:') || detail.includes('رقم التلميذ:') ? 'ltr' : 'auto'}>
              {index ? ' · ' : ''}{detail}
            </span>
          ))}
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
  const density = rows.length > 8 ? 'dense' : rows.length > 4 || students.length > 2 ? 'compact' : 'normal';

  return (
    <article className="receipt-html-copy" data-density={density}>
      <header className="receipt-copy-header">
        <div className="receipt-number-card">
          <div className="receipt-number-card__number">
            <span>رقم الوصل</span>
            <strong dir="ltr">{receiptNumber}</strong>
          </div>
          <div className="receipt-number-card__barcode" aria-hidden="true" />
          <div className="receipt-number-card__date">
            <span>تاريخ الأداء</span>
            <strong dir="ltr">{formatDate(paymentDate, lang)}</strong>
          </div>
        </div>
        <SchoolIdentity schoolName={schoolName} schoolCode={schoolCode} />
      </header>

      <section className="receipt-payment-facts">
        <div>
          <span>طريقة الأداء</span>
          <strong dir="auto">{method}</strong>
        </div>
        <i aria-hidden="true" />
        <div>
          <span>المؤدي</span>
          <strong dir="auto">{payerName}</strong>
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
              const rowRemaining = allocationRemaining(row);
              return (
                <div className="receipt-table__row" role="row" key={`${row.id ?? row.installment_id ?? index}-${index}`}>
                  <span role="cell"><StudentMeta student={row.studentDisplay} /></span>
                  <span role="cell" dir="auto">{row.description ?? row.label ?? '—'}</span>
                  <strong role="cell" dir="ltr">
                    {formatMoney(row.amount, receipt.currency, lang)}
                    {rowRemaining != null ? (
                      <small>الباقي: {formatMoney(rowRemaining, receipt.currency, lang)}</small>
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
        {remaining != null ? (
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
    <div className="receipt-html-sheet" dir="rtl">
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
