import type { TranslateFn } from '@/features/i18n/locale-context';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import { refName } from '@/lib/utils/finance';
import type { PaymentAllocation, PaymentCollection, StudentFee } from '@/types/finance';
import {
  collectionDistributionLabel,
  formatAllocationRowDetails,
} from './collection-normalize';

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
): { title: string; subtitle: string } {
  if (row.display_label?.trim()) {
    const due = row.due_date ? formatDate(row.due_date) : null;
    const subtitleParts: string[] = [];
    if (due) subtitleParts.push(`${t('admin.finance.dueDate')}: ${due}`);
    const remaining = row.remaining_amount;
    if (remaining != null && Number.isFinite(remaining)) {
      subtitleParts.push(`${t('admin.finance.remainingAmount')}: ${remaining.toFixed(2)}`);
    }
    return { title: row.display_label.trim(), subtitle: subtitleParts.join(' · ') };
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
