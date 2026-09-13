import type { ReceiptHtmlPrintLang } from '@/lib/utils/finance-receipt-html-print';
import type { FinanceReceiptAllocation } from '@/types/finance';

const MONTHS: Record<ReceiptHtmlPrintLang, readonly string[]> = {
  ar: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'ماي',
    'يونيو',
    'يوليوز',
    'غشت',
    'شتنبر',
    'أكتوبر',
    'نونبر',
    'دجنبر',
  ],
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
};

const INSTALLMENT_TERM_RE =
  /(الأقساط|الاقساط|أقساط|اقساط|القسط|قسط|échéances?|echeances?|installments?|paiements?)/iu;
const INSTALLMENT_TERM_GLOBAL_RE =
  /(الأقساط|الاقساط|أقساط|اقساط|القسط|قسط|échéances?|echeances?|installments?|paiements?)/giu;
const SINGLE_PAYMENT_RE =
  /(قسط\s+واحد|دفعة\s+واحدة|échéance\s+unique|echeance\s+unique|paiement\s+unique|single\s+payment)/iu;
const SINGLE_MARKER_GLOBAL_RE = /(واحد|واحدة|unique|single)/giu;
const COUNTER_RE = /(\d{1,4})\s*\/\s*(\d{1,4})/g;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isAcademicYearPair(current: number, total: number): boolean {
  return current >= 1900 && current <= 2200 && total >= 1900 && total <= 2200;
}

function installmentCounter(value: string): { current: number; total: number } | null {
  for (const match of value.matchAll(COUNTER_RE)) {
    const current = Number(match[1]);
    const total = Number(match[2]);
    if (isAcademicYearPair(current, total)) continue;
    if (Number.isInteger(current) && Number.isInteger(total) && current > 0 && total > 0) {
      return { current, total };
    }
  }
  return null;
}

function removeInstallmentCounters(value: string): string {
  return value.replace(COUNTER_RE, (whole, currentRaw: string, totalRaw: string) => {
    const current = Number(currentRaw);
    const total = Number(totalRaw);
    return isAcademicYearPair(current, total) ? whole : ' ';
  });
}

function cleanupSegment(value: string): string {
  const hadInstallmentTerm = INSTALLMENT_TERM_RE.test(value);
  let cleaned = removeInstallmentCounters(value);
  if (hadInstallmentTerm) {
    cleaned = cleaned
      .replace(INSTALLMENT_TERM_GLOBAL_RE, ' ')
      .replace(SINGLE_MARKER_GLOBAL_RE, ' ')
      .replace(/\b(?:n[°ºo]?|num(?:éro)?|رقم)\b/giu, ' ');
  }
  return cleaned
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.\-–—/]+|[\s:;,.\-–—/]+$/g, '')
    .trim();
}

function compactAdjacentDuplicates(parts: string[]): string[] {
  const compact: string[] = [];
  for (const part of parts) {
    const previous = compact.at(-1);
    if (!previous || normalized(previous) !== normalized(part)) compact.push(part);
  }
  return compact;
}

function compactFrenchLabel(value: string): string {
  const parts = value
    .split(/\s+[—–]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return value;
  return compactAdjacentDuplicates(parts).join(' — ') || value;
}

function periodFromDueDate(
  dueDate: string | null | undefined,
  lang: ReceiptHtmlPrintLang,
): string | null {
  const match = dueDate?.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MONTHS[lang][monthIndex]} ${match[1]}`;
}

function looksLikeMonthYear(value: string, lang: ReceiptHtmlPrintLang): boolean {
  const candidate = normalized(value);
  if (!/\b(?:19|20)\d{2}\b/.test(candidate)) return false;
  return MONTHS[lang].some((month) => candidate.includes(normalized(month)));
}

export function receiptServiceDisplayLabel(
  row: Pick<FinanceReceiptAllocation, 'description' | 'label' | 'due_date'>,
  lang: ReceiptHtmlPrintLang,
): string {
  const raw = (row.description ?? row.label ?? '—').trim() || '—';
  const displayRaw = lang === 'fr' ? compactFrenchLabel(raw) : raw;
  const counter = installmentCounter(displayRaw);
  const hasInstallmentMechanics = INSTALLMENT_TERM_RE.test(displayRaw) || counter != null;

  if (!hasInstallmentMechanics) return displayRaw;

  const singlePayment = counter?.total === 1 || SINGLE_PAYMENT_RE.test(displayRaw);
  let existingPeriod: string | null = null;
  const semanticParts: string[] = [];

  for (const part of displayRaw.split(/\s+[—–]\s+/).map((item) => item.trim()).filter(Boolean)) {
    if (looksLikeMonthYear(part, lang)) {
      existingPeriod ??= part;
      continue;
    }
    const cleaned = cleanupSegment(part);
    if (cleaned) semanticParts.push(cleaned);
  }

  const base = compactAdjacentDuplicates(semanticParts).join(' — ').trim() || '—';
  if (singlePayment) return base;

  const period = periodFromDueDate(row.due_date, lang) ?? existingPeriod;
  if (!period || normalized(base) === normalized(period)) return base;
  return `${base} — ${period}`;
}
