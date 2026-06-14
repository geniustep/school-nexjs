import { currencyCode, feeBalanceAmount, financeStudentDisplayName, refName } from '@/lib/utils/finance';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { StudentFee, StudentFinanceProfile } from '@/types/finance';

type FeeServiceRef = { name?: string; code?: string };

export function getStudentFeeNetAmount(fee: StudentFee): number | null {
  return normalizeMoneyValue(fee.net_amount ?? fee.amount ?? (fee as StudentFee & { net?: unknown }).net);
}

export function getStudentFeePaidAmount(fee: StudentFee): number | null {
  return normalizeMoneyValue(
    fee.paid_amount ?? (fee as StudentFee & { paid?: unknown; confirmed_paid_amount?: unknown }).paid ??
      (fee as StudentFee & { confirmed_paid_amount?: unknown }).confirmed_paid_amount,
  );
}

export function getStudentFeeRemainingAmount(fee: StudentFee): number | null {
  const fromBalance = feeBalanceAmount(fee);
  if (fromBalance != null) return fromBalance;
  return normalizeMoneyValue((fee as StudentFee & { remaining?: unknown }).remaining ?? fee.remaining_amount);
}

export function getStudentFeeCurrency(fee: StudentFee): unknown {
  return fee.currency;
}

export function getStudentFeeLabel(fee: StudentFee): string {
  const feeTypeName = fee.fee_type_name?.trim();
  if (feeTypeName) return feeTypeName;

  const service = fee.service as FeeServiceRef | undefined;
  const serviceName = typeof service?.name === 'string' ? service.name.trim() : refName(service);
  if (serviceName) return serviceName;

  const plan = refName(fee.fee_plan);
  const type = refName(fee.fee_type);
  if (plan && type) return `${plan} · ${type}`;
  if (plan || type) return plan ?? type ?? '';

  const rawName = fee.name?.trim();
  if (rawName) {
    const parts = rawName.split(' — ');
    if (parts.length > 1) return parts.slice(1).join(' — ').trim();
    return rawName;
  }

  return '';
}

export function summarizeStudentFees(fees: StudentFee[]) {
  let total = 0;
  let paid = 0;
  let remaining = 0;
  let hasTotal = false;
  let hasPaid = false;
  let hasRemaining = false;
  let currency: unknown = null;

  for (const fee of fees) {
    const net = getStudentFeeNetAmount(fee);
    const paidAmount = getStudentFeePaidAmount(fee);
    const remainingAmount = getStudentFeeRemainingAmount(fee);
    if (net != null) {
      total += net;
      hasTotal = true;
    }
    if (paidAmount != null) {
      paid += paidAmount;
      hasPaid = true;
    }
    if (remainingAmount != null) {
      remaining += remainingAmount;
      hasRemaining = true;
    }
    if (!currency && fee.currency) currency = fee.currency;
  }

  return {
    total: hasTotal ? total : null,
    paid: hasPaid ? paid : null,
    remaining: hasRemaining ? remaining : null,
    currency,
  };
}

export function resolveFinanceStudentDisplay(fees: StudentFee[]) {
  const first = fees[0];
  const student = first?.student;
  const name = financeStudentDisplayName({
    name: typeof student?.name === 'string' ? student.name : undefined,
    full_name: typeof (student as { full_name?: string } | undefined)?.full_name === 'string'
      ? (student as { full_name?: string }).full_name
      : undefined,
  });
  const code =
    (student as { code?: string; school_number?: string } | undefined)?.code?.trim() ||
    (student as { school_number?: string } | undefined)?.school_number?.trim() ||
    null;

  return {
    name: name !== '—' ? name : null,
    code,
    studentId: first?.student_id ?? student?.id ?? null,
  };
}

export function getBillingPartnerLabel(profile: StudentFinanceProfile | null | undefined): string | null {
  if (!profile) return null;
  return profile.payer_name?.trim() || refName(profile.billing_partner)?.trim() || null;
}

export function resolveFinanceStudentSummary(
  profile: StudentFinanceProfile | null | undefined,
  fees: StudentFee[],
) {
  const fromFees = summarizeStudentFees(fees);
  const profileCurrency = currencyCode(profile?.currency) ? profile?.currency : null;

  return {
    payerName: getBillingPartnerLabel(profile),
    total: normalizeMoneyValue(profile?.total_amount) ?? fromFees.total,
    paid: normalizeMoneyValue(profile?.paid_amount) ?? fromFees.paid,
    remaining:
      feeBalanceAmount(profile ?? {}) ??
      normalizeMoneyValue(profile?.remaining_amount ?? profile?.balance) ??
      fromFees.remaining,
    overdue: normalizeMoneyValue(profile?.overdue_amount),
    currency: profileCurrency ?? fromFees.currency,
  };
}

export function resolveFinanceStudentBackLabel(returnTo: string, t: (key: string) => string): string {
  if (/\/admin\/finance\/cheques\/\d+/.test(returnTo)) {
    return t('admin.finance.collections.backToChequeDetails');
  }
  if (/\/admin\/finance\/collections\/\d+/.test(returnTo)) {
    return t('admin.finance.collections.backToCollectionDetails');
  }
  if (returnTo.includes('/admin/finance/collections')) return t('admin.finance.backToCollections');
  if (returnTo.includes('/admin/finance/cheques')) return t('admin.finance.cheques.backToList');
  if (returnTo === '/admin/finance') return t('admin.finance.backToFinance');
  return t('admin.finance.backToStudentFees');
}
