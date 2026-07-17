import type { TranslateFn } from '@/features/i18n/locale-context';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import { refName } from '@/lib/utils/finance';
import type { PaymentAllocation, PaymentCollection, StudentFee } from '@/types/finance';
import {
  collectionDistributionLabel,
  formatAllocationRowDetails,
} from './collection-normalize';

const FRENCH_MONTHS: Record<string, string> = {
  janvier: 'يناير',
  février: 'فبراير',
  fevrier: 'فبراير',
  mars: 'مارس',
  avril: 'أبريل',
  mai: 'ماي',
  juin: 'يونيو',
  juillet: 'يوليوز',
  août: 'غشت',
  aout: 'غشت',
  septembre: 'شتنبر',
  octobre: 'أكتوبر',
  novembre: 'نونبر',
  décembre: 'دجنبر',
  decembre: 'دجنبر',
};

const ENGLISH_REPLACEMENTS: [RegExp, string][] = [
  [/single\s*payment/gi, 'الأداء لمرة واحدة'],
  [/installment\s*(\d+)\s*\/\s*(\d+)/gi, 'قسط $1/$2'],
];

/** Clean backend display labels for the active UI locale. */
export function normalizeInstallmentDisplayLabel(
  label: string,
  locale?: string,
): string {
  let text = label.trim();
  if (!text) return text;

  for (const [pattern, replacement] of ENGLISH_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  if (locale === 'ar' || locale?.startsWith('ar')) {
    for (const [fr, ar] of Object.entries(FRENCH_MONTHS)) {
      text = text.replace(new RegExp(fr, 'gi'), ar);
    }
  }

  // Collapse duplicated fee name segments: "التمدرس — التمدرس — …" → "التمدرس — …"
  const parts = text.split(/\s*[—–-]\s*/);
  if (parts.length >= 2 && parts[0] === parts[1]) {
    text = [parts[0], ...parts.slice(2)].join(' — ');
  }

  return text;
}

type FormatDate = (value: string | null | undefined) => string;
type FormatPeriod = (
  formatDate: FormatDate,
  start?: string | null,
  end?: string | null,
) => string;

export function formatStudentFeeLabel(
  fee: StudentFee,
  t: (key: string) => string,
  formatDate?: FormatDate,
): string {
  const parts: string[] = [];
  const title =
    fee.name?.trim() ||
    refName(fee.fee_plan) ||
    refName(fee.fee_type) ||
    (fee.id ? `#${fee.id}` : null);
  if (title) parts.push(title);
  if (fee.due_date && formatDate) {
    parts.push(`${t('admin.finance.dueDate')}: ${formatDate(fee.due_date)}`);
  }
  const remaining = fee.remaining_amount;
  if (remaining != null && Number.isFinite(remaining)) {
    parts.push(`${t('admin.finance.remainingAmount')}: ${remaining.toFixed(2)}`);
  }
  return parts.join(' · ') || t('admin.finance.studentFee');
}

export function formatInstallmentLabel(
  row: StudentInstallment,
  t: (key: string) => string,
  formatDate: FormatDate,
  formatPeriod: FormatPeriod,
  locale?: string,
): { title: string; subtitle: string } {
  if (row.display_label?.trim()) {
    const title = normalizeInstallmentDisplayLabel(row.display_label.trim(), locale);
    const due = row.due_date ? formatDate(row.due_date) : null;
    const subtitleParts: string[] = [];
    if (due) subtitleParts.push(`${t('admin.finance.dueDate')}: ${due}`);
    const remaining = row.remaining_amount;
    if (remaining != null && Number.isFinite(remaining)) {
      subtitleParts.push(`${t('admin.finance.remainingAmount')}: ${remaining.toFixed(2)}`);
    }
    return { title, subtitle: subtitleParts.join(' · ') };
  }

  const feeTitle =
    row.display_label?.trim() ||
    row.fee_name?.trim() ||
    row.fee_type_name?.trim() ||
    refName(row.service) ||
    null;
  const period =
    row.period_label?.trim() ||
    (formatPeriod(formatDate, row.period_start, row.period_end) !== '—'
      ? formatPeriod(formatDate, row.period_start, row.period_end)
      : null);
  const titleParts: string[] = [];
  if (feeTitle) titleParts.push(feeTitle);
  if (period) titleParts.push(period);
  const title = titleParts.join(' — ') || t('admin.finance.studentFee');

  const due = row.due_date ? formatDate(row.due_date) : null;
  const subtitleParts: string[] = [];
  if (due) subtitleParts.push(`${t('admin.finance.dueDate')}: ${due}`);
  const remaining = row.remaining_amount;
  if (remaining != null && Number.isFinite(remaining)) {
    subtitleParts.push(`${t('admin.finance.remainingAmount')}: ${remaining.toFixed(2)}`);
  }
  return { title, subtitle: subtitleParts.join(' · ') };
}

export function formatAllocationRowLabel(
  row: PaymentAllocation,
  t: (key: string) => string,
): string {
  return formatAllocationRowDetails(row, t).title;
}

export function collectionAllocationSummary(
  coll: PaymentCollection,
  t: TranslateFn,
): string {
  return collectionDistributionLabel(coll, t);
}

export function truncateReference(value: string, max = 28): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
