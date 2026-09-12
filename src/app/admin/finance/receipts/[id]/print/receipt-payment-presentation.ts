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

function legacyServiceName(source: RecordValue): string | null {
  const raw =
    firstString(source, ['description', 'label', 'display_label', 'installment_description']) ??
    null;
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

/**
 * Receipt-only display formatter. It never recalculates financial amounts.
 * One-time services show their service name once. Monthly installment rows add
 * only the calendar month/year and never expose installment sequence wording.
 */
export function receiptServiceLabel(
  row: FinanceReceiptAllocation,
  lang: ReceiptHtmlPrintLang,
): string {
  const source = asRecord(row);
  const serviceName = structuredServiceName(source) ?? legacyServiceName(source);
  if (!serviceName) return '—';

  const explicitPeriod = periodLabel(source);
  const isMonthly = monthlyFrequency(source) || (legacyInstallmentMarker(source) && !!row.due_date);
  const calendarPeriod = isMonthly
    ? explicitPeriod ?? formatMonthYear(cleanString(row.due_date), lang)
    : null;

  return calendarPeriod ? `${serviceName} — ${calendarPeriod}` : serviceName;
}
