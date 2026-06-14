import type { FinanceReferenceOption } from '../types';

const REF_PREFIX = 'admin.student360.financeOps.ref';

export function referenceLabelKey(group: string, value: string | null | undefined): string {
  if (!value) return '';
  return `${REF_PREFIX}.${group}.${value}`;
}

export function resolveReferenceLabel(
  t: (key: string) => string,
  group: string,
  value: string | null | undefined,
  options?: FinanceReferenceOption[],
): string {
  if (!value) return '—';
  const fromOptions = options?.find((o) => o.value === value)?.label;
  if (fromOptions) return fromOptions;
  const key = referenceLabelKey(group, value);
  const translated = t(key);
  return translated === key ? value : translated;
}

export function agreementStateTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'active':
    case 'approved':
    case 'completed':
      return 'green';
    case 'pending_approval':
    case 'amended':
      return 'amber';
    case 'cancelled':
      return 'red';
    case 'draft':
      return 'blue';
    default:
      return 'slate';
  }
}

export function paymentStatusTone(
  status: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (status) {
    case 'paid':
      return 'green';
    case 'partially_paid':
      return 'amber';
    case 'unpaid':
      return 'red';
    default:
      return 'slate';
  }
}

export function timingStatusTone(
  status: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (status) {
    case 'due':
      return 'amber';
    case 'overdue':
      return 'red';
    case 'upcoming':
      return 'blue';
    case 'hidden':
      return 'slate';
    default:
      return 'slate';
  }
}

export function scheduleItemStateTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'planned':
      return 'blue';
    case 'waived':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'slate';
  }
}

export function chequeLifecycleTone(
  state: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (state) {
    case 'cleared':
      return 'green';
    case 'deposited':
    case 'received':
      return 'amber';
    case 'bounced':
    case 'cancelled':
    case 'returned_to_payer':
      return 'red';
    default:
      return 'slate';
  }
}

export function chequeMaturityTone(
  status: string,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (status) {
    case 'settled':
      return 'green';
    case 'due_today':
      return 'amber';
    case 'overdue':
      return 'red';
    default:
      return 'slate';
  }
}

export function hasFinanceSummaryData(summary: {
  total_due?: number;
  total_agreed?: number;
  confirmed_paid?: number;
} | null | undefined): boolean {
  if (!summary) return false;
  return [summary.total_due, summary.total_agreed, summary.confirmed_paid].some(
    (v) => v != null && v > 0,
  );
}

export function hasAgreementData(agreement: { id?: number; state?: string } | null | undefined): boolean {
  return !!agreement?.id;
}
