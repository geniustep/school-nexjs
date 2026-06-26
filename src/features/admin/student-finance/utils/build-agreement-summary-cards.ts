import type { AgreementFinancialSummary } from '@/types/agreement-finance-summary';
import type { StatTone } from '@/components/ui/primitives';
import type { FinancialAgreement } from '../types';

export interface AgreementSummaryCardItem {
  key: string;
  label: string;
  value: number;
  tone?: StatTone;
}

function readMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function amountsEqual(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.01;
}

function shouldHideSummaryCard(
  item: AgreementSummaryCardItem,
  items: AgreementSummaryCardItem[],
): boolean {
  if (item.key === 'discount' || item.key === 'surcharge') {
    return item.value === 0;
  }

  const original = items.find((entry) => entry.key === 'original')?.value;
  const netLike = items.find((entry) => entry.key === 'net' || entry.key === 'final')?.value;

  if (item.key === 'final' || item.key === 'net') {
    return amountsEqual(item.value, original);
  }

  if (item.key === 'schedule') {
    return (
      amountsEqual(item.value, original) ||
      amountsEqual(item.value, netLike) ||
      amountsEqual(item.value, items.find((entry) => entry.key === 'final')?.value)
    );
  }

  return false;
}

function toneForKey(key: string): StatTone | undefined {
  switch (key) {
    case 'discount':
      return 'amber';
    case 'net':
    case 'final':
      return 'blue';
    case 'paid':
      return 'green';
    case 'remaining':
      return 'red';
    default:
      return undefined;
  }
}

export function buildAgreementSummaryCards(input: {
  financeSummary: AgreementFinancialSummary | null;
  agreement: FinancialAgreement;
  labels: Record<string, string>;
}): AgreementSummaryCardItem[] {
  const { financeSummary, agreement, labels } = input;

  const candidates: AgreementSummaryCardItem[] = financeSummary
    ? [
        { key: 'original', label: labels.original, value: readMoney(financeSummary.original_total) },
        { key: 'discount', label: labels.discount, value: readMoney(financeSummary.discount_total) },
        {
          key: 'final',
          label: labels.final,
          value: readMoney(financeSummary.final_total ?? financeSummary.net_total),
        },
        {
          key: 'recurring',
          label: labels.recurring,
          value: readMoney(financeSummary.recurring_total_after_discount),
        },
        {
          key: 'monthly',
          label: labels.monthly,
          value: readMoney(financeSummary.monthly_due_amount),
        },
        {
          key: 'schedule',
          label: labels.schedule,
          value: readMoney(financeSummary.schedule_total),
        },
      ].filter((item): item is AgreementSummaryCardItem => item.value != null)
    : [
        {
          key: 'original',
          label: labels.original,
          value: readMoney(agreement.original_total ?? agreement.gross_amount),
        },
        {
          key: 'discount',
          label: labels.discount,
          value: readMoney(agreement.discount_total ?? agreement.discount_amount),
        },
        {
          key: 'surcharge',
          label: labels.surcharge,
          value: readMoney(agreement.surcharge_total),
        },
        {
          key: 'net',
          label: labels.net,
          value: readMoney(agreement.net_total ?? agreement.net_amount),
        },
        { key: 'paid', label: labels.paid, value: readMoney(agreement.paid_total) },
        {
          key: 'remaining',
          label: labels.remaining,
          value: readMoney(agreement.remaining_total),
        },
      ].filter((item): item is AgreementSummaryCardItem => item.value != null);

  const deduped = candidates.filter((item) => !shouldHideSummaryCard(item, candidates));

  return deduped.map((item) => ({
    ...item,
    tone: toneForKey(item.key),
  }));
}
