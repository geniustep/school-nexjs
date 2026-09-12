import type { FinanceReceiptAllocation } from '@/types/finance';
import type { ReceiptHtmlPrintLang } from '@/lib/utils/finance-receipt-html-print';

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstString(source: RecordValue, keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanString(source[key]);
    if (value) return value;
  }
  return null;
}

function nestedName(source: RecordValue, keys: string[]): string | null {
  for (const key of keys) {
    const nested = asRecord(source[key]);
    const name = firstString(nested, ['name', 'display_name', 'label', 'title']);
    if (name) return name;
  }
  return null;
}

export function receiptPaymentMethodLabel(
  method: string | null | undefined,
  lang: ReceiptHtmlPrintLang,
): string {
  const normalized = (method ?? '').trim().toLocaleLowerCase();
  const labels: Record<ReceiptHtmlPrintLang, Record<string, string>> = {
    ar: {
      cash: 'نقدًا',
      cheque: 'شيك',
      check: 'شيك',
      transfer: 'تحويل بنكي',
      bank: 'تحويل بنكي',
      card: 'بطاقة',
      import_unspecified: 'غير محدد',
    },
    fr: {
      cash: 'Espèces',
      cheque: 'Chèque',
      check: 'Chèque',
      transfer: 'Virement bancaire',
      bank: 'Virement bancaire',
      card: 'Carte',
      import_unspecified: 'Non précisé',
    },
  };

  return labels[lang][normalized] ?? method?.trim() ?? '—';
}

function normalizeForDedupe(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');
}

function isInstallmentSegment(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase();
  return (
    /^قسط(?:\s|$)/u.test(normalized) ||
    /^(?:échéance|echeance|mensualité|mensualite)(?:\s|$)/iu.test(normalized)
  );
}

function cleanLegacySegments(value: string): string[] {
  const seen = new Set<string>();
  const segments = value
    .split(/\s+[—–]\s+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !isInstallmentSegment(segment));

  return segments.filter((segment) => {
    const key = normalizeForDedupe(segment);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function structuredServiceName(source: RecordValue): string | null {
  return (
    firstString(source, [
      'service_name',
      'fee_type_name',
      'fee_name',
      'service_label',
      'fee_label',
    ]) ?? nestedName(source, ['service', 'fee_type', 'fee'])
  );
}

function legacyRawLabel(source: RecordValue): string | null {
  return firstString(source, ['description', 'label', 'display_label', 'installment_description']);
}

function legacyServiceName(source: RecordValue): string | null {
  const raw = legacyRawLabel(source);
  if (!raw) return null;
  const clean = cleanLegacySegments(raw);
  return clean[0] ?? null;
}

function monthlyFrequency(source: RecordValue): boolean {
  const frequency = (
    firstString(source, [
      'service_frequency',
      'frequency',
      'billing_frequency',
      'recurrence',
    ]) ??
    firstString(asRecord(source.service), ['frequency', 'service_frequency']) ??
    ''
  )
    .trim()
    .toLocaleLowerCase();
  return ['monthly', 'month', 'mensuel', 'mensuelle', 'شهري', 'شهرية'].includes(frequency);
}

function legacyInstallmentMarker(source: RecordValue): boolean {
  const text = [
    source.description,
    source.label,
    source.display_label,
    source.installment_description,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return /(?:^|[\s—–])قسط(?:\s|$)/u.test(text) || /(?:échéance|echeance|mensualité|mensualite)/iu.test(text);
}

function periodLabel(source: RecordValue): string | null {
  const label = firstString(source, ['period_label', 'month_label', 'period_name']);
  if (!label || isInstallmentSegment(label)) return null;
  if (/^\d+\s*\/\s*\d+$/u.test(label)) return null;
  return label;
}

function formatMonthYear(
  dueDate: string | null,
  lang: ReceiptHtmlPrintLang,
): string | null {
  if (!dueDate) return null;
  const iso = dueDate.match(/^(\d{4})-(\d{2})-(\d{2})/u);
  const date = iso
    ? new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])))
    : new Date(dueDate);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-MA' : 'ar-MA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function isRegistrationService(source: RecordValue, serviceName: string): boolean {
  const identity = [
    serviceName,
    firstString(source, ['service_code', 'fee_code', 'service_category', 'category']) ?? '',
  ]
    .join(' ')
    .toLocaleLowerCase();
  return /(?:التسجيل|inscription|registration)/iu.test(identity);
}

function academicYearLabel(source: RecordValue, dueDate: string | null): string | null {
  const explicit =
    firstString(source, [
      'academic_year_name',
      'academic_year_label',
      'school_year_name',
      'school_year_label',
    ]) ?? nestedName(source, ['academic_year', 'school_year']);
  if (explicit) return explicit;

  const raw = legacyRawLabel(source);
  const embeddedYear = raw?.match(/\b(20\d{2})\s*[\/–-]\s*(20\d{2})\b/u);
  if (embeddedYear) return `${embeddedYear[1]}/${embeddedYear[2]}`;

  // Receipt snapshots do not always expose the academic-year label. For a
  // registration row whose due date is at the start of a school year, the
  // calendar date provides a safe display fallback without touching amounts.
  const iso = dueDate?.match(/^(\d{4})-(\d{2})-(\d{2})/u);
  if (!iso) return null;
  const year = Number(iso[1]);
  const month = Number(iso[2]);
  return month >= 9 ? `${year}/${year + 1}` : null;
}

/**
 * Receipt-only display formatter. It never recalculates financial amounts.
 * Monthly services show service + calendar month/year. Registration shows
 * service + academic year when the source provides it (or a safe start-of-year
 * due-date fallback). No installment sequence wording is ever displayed.
 */
export function receiptServiceLabel(
  row: FinanceReceiptAllocation,
  lang: ReceiptHtmlPrintLang,
): string {
  const source = asRecord(row);
  const serviceName = structuredServiceName(source) ?? legacyServiceName(source);
  if (!serviceName) return '—';

  const dueDate = cleanString(row.due_date);
  if (isRegistrationService(source, serviceName)) {
    const academicYear = academicYearLabel(source, dueDate);
    return academicYear ? `${serviceName} — ${academicYear}` : serviceName;
  }

  const explicitPeriod = periodLabel(source);
  const isMonthly = monthlyFrequency(source) || (legacyInstallmentMarker(source) && !!row.due_date);
  const calendarPeriod = isMonthly
    ? explicitPeriod ?? formatMonthYear(dueDate, lang)
    : null;

  return calendarPeriod ? `${serviceName} — ${calendarPeriod}` : serviceName;
}
