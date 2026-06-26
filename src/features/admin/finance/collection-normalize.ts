import type { TranslateFn } from '@/features/i18n/locale-context';
import { normalizeInstallmentDisplayLabel } from '@/features/admin/finance/collection-labels';
import { resolveLegacyInstallmentDisplayLabel } from '@/features/admin/finance/resolve-legacy-collection-display';
import { collectionState, currencyCode, financeStudentDisplayName, refName } from '@/lib/utils/finance';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { PaymentAllocation, PaymentCollection } from '@/types/finance';
import { resolveCollectionPayerLabel } from './collection-payer-label';

export type CollectionDistributionState = 'none' | 'partial' | 'full' | 'unknown';

export interface NormalizedPaymentCollection {
  id: number;
  reference: string;
  studentId: number | null;
  studentName: string | null;
  studentCode: string | null;
  payerName: string | null;
  date: string | null;
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  status: string;
  allocatedAmount: number | null;
  allocationCount: number;
  distributionState: CollectionDistributionState;
  externalReference: string | null;
  journalLabel: string | null;
  billingEntityLabel: string | null;
  raw: PaymentCollection;
}

function moneyAlmostEqual(a: number, b: number, epsilon = 0.01): boolean {
  return Math.abs(a - b) < epsilon;
}

function sumAllocationAmounts(allocations: PaymentAllocation[] | undefined): number | null {
  if (!allocations?.length) return null;
  let sum = 0;
  let hasAmount = false;
  for (const row of allocations) {
    const amount = normalizeMoneyValue(row.amount);
    if (amount == null) continue;
    sum += amount;
    hasAmount = true;
  }
  return hasAmount ? sum : null;
}

export function getCollectionAllocatedAmount(coll: PaymentCollection): number | null {
  const raw = coll as PaymentCollection & {
    allocated_amount?: unknown;
    allocation_amount?: unknown;
  };
  const fromField = normalizeMoneyValue(raw.allocated_amount ?? raw.allocation_amount);
  if (fromField != null) return fromField;
  return sumAllocationAmounts(coll.allocations);
}

export function getCollectionDistributionState(coll: PaymentCollection): CollectionDistributionState {
  const total = normalizeMoneyValue(coll.amount ?? coll.total_amount);
  const allocated = getCollectionAllocatedAmount(coll);
  const allocationCount = coll.allocations?.length ?? 0;

  if (total == null || total <= 0) return 'unknown';
  if (allocated == null && allocationCount === 0) return 'unknown';
  if (allocated == null) return 'unknown';
  if (allocated <= 0) return 'none';
  if (moneyAlmostEqual(allocated, total)) return 'full';
  if (allocated < total) return 'partial';
  return 'full';
}

export function getCollectionStudentLabel(coll: PaymentCollection, unavailable = '—'): string {
  const topLevel = coll.student_name?.trim();
  if (topLevel) return topLevel;
  const student = coll.student as { name?: string; full_name?: string; code?: string } | null | undefined;
  const name = financeStudentDisplayName({
    name: typeof student?.name === 'string' ? student.name : undefined,
    full_name: typeof student?.full_name === 'string' ? student.full_name : undefined,
  });
  if (name !== '—') return name;
  const nested = refName(coll.student);
  if (nested) return nested;
  if (coll.student_id) return unavailable;
  return unavailable;
}

export function getCollectionStudentCode(coll: PaymentCollection): string | null {
  const fromField = coll.student_code?.trim();
  if (fromField) return fromField;
  const student = coll.student as { code?: string; school_number?: string } | null | undefined;
  return student?.code?.trim() || student?.school_number?.trim() || null;
}

export function getCollectionPayerLabel(coll: PaymentCollection, unavailable = '—'): string {
  return resolveCollectionPayerLabel(coll, unavailable);
}

export function formatCollectionReference(coll: PaymentCollection): string {
  const reference = coll.reference?.trim();
  if (reference && reference !== 'undefined' && reference !== 'null') return reference;
  const name = coll.name?.trim();
  if (name && name !== 'undefined' && name !== 'null') return name;
  if (typeof coll.id === 'number' && Number.isFinite(coll.id)) {
    return `Collection #${coll.id}`;
  }
  return '';
}

export function getCollectionJournalLabel(coll: PaymentCollection): string | null {
  const journal = (coll as PaymentCollection & { journal?: { name?: string; code?: string } }).journal;
  if (journal && typeof journal === 'object') {
    const name = refName(journal);
    const code = typeof journal.code === 'string' ? journal.code : null;
    if (name && code) return `${name} (${code})`;
    return name ?? code;
  }
  if (coll.journal_id) return `#${coll.journal_id}`;
  return null;
}

export function getCollectionBillingEntityLabel(coll: PaymentCollection): string | null {
  const name = coll.billing_partner_name?.trim();
  if (name) return name;
  return refName(coll.billing_partner)?.trim() || null;
}

export function normalizePaymentCollection(
  coll: PaymentCollection,
  unavailable = '—',
): NormalizedPaymentCollection {
  const allocatedAmount = getCollectionAllocatedAmount(coll);
  return {
    id: coll.id,
    reference: formatCollectionReference(coll),
    studentId: coll.student_id ?? coll.student?.id ?? null,
    studentName: getCollectionStudentLabel(coll, unavailable) === unavailable ? null : getCollectionStudentLabel(coll, unavailable),
    studentCode: getCollectionStudentCode(coll),
    payerName: getCollectionPayerLabel(coll, unavailable) === unavailable ? null : getCollectionPayerLabel(coll, unavailable),
    date: coll.collection_date ?? coll.date ?? null,
    amount: normalizeMoneyValue(coll.amount ?? coll.total_amount),
    currency: currencyCode(coll.currency),
    paymentMethod: typeof coll.payment_method === 'string' ? coll.payment_method : coll.payment_method ?? null,
    status: collectionState(coll) || 'unknown',
    allocatedAmount,
    allocationCount: coll.allocations?.length ?? 0,
    distributionState: getCollectionDistributionState(coll),
    externalReference: coll.reference?.trim() || null,
    journalLabel: getCollectionJournalLabel(coll),
    billingEntityLabel: getCollectionBillingEntityLabel(coll),
    raw: coll,
  };
}

export function collectionDistributionLabel(
  coll: PaymentCollection,
  t: TranslateFn,
): string {
  switch (getCollectionDistributionState(coll)) {
    case 'none':
      return t('admin.finance.collections.allocationNone');
    case 'partial':
      return t('admin.finance.collections.allocationPartial');
    case 'full':
      return t('admin.finance.collections.allocationFull');
    default:
      return t('admin.finance.collections.allocationUnknown');
  }
}

export function formatAllocationRowDetails(
  row: PaymentAllocation,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale?: string,
): { title: string; subtitle: string; internalId: string | null } {
  const internalId =
    row.installment_id != null
      ? String(row.installment_id)
      : row.student_fee_id != null
        ? String(row.student_fee_id)
        : row.id != null
          ? String(row.id)
          : null;

  const display = row.display_label?.trim();
  if (display) {
    const title = normalizeInstallmentDisplayLabel(display, locale);
    const subtitleParts: string[] = [];
    if (row.settlement_state) {
      subtitleParts.push(
        `${t('admin.finance.collections.detail.allocationSettlement')}: ${row.settlement_state}`,
      );
    }
    if (row.state) {
      subtitleParts.push(`${t('academic.status')}: ${row.state}`);
    }
    return { title, subtitle: subtitleParts.join(' · '), internalId };
  }

  const legacyTitle = resolveLegacyInstallmentDisplayLabel(row, locale);
  if (legacyTitle) {
    const subtitleParts: string[] = [];
    if (row.period_label?.trim()) {
      subtitleParts.push(row.period_label.trim());
    }
    if (
      row.installment_sequence != null &&
      row.installment_count != null &&
      row.installment_count > 1
    ) {
      subtitleParts.push(
        t('admin.finance.collections.detail.installmentSequence', {
          seq: row.installment_sequence,
          count: row.installment_count,
        }),
      );
    }
    return {
      title: legacyTitle,
      subtitle: subtitleParts.join(' · '),
      internalId,
    };
  }

  const fee = refName(row.student_fee);
  const installment = refName(row.installment);
  const fallback =
    fee && installment
      ? `${fee} · ${installment}`
      : fee ?? installment ?? t('admin.finance.unavailable');
  return { title: fallback, subtitle: '', internalId };
}
