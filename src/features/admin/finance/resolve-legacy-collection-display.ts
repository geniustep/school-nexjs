import { refName } from '@/lib/utils/finance';
import { normalizeInstallmentDisplayLabel } from '@/features/admin/finance/collection-labels';
import type { PaymentCollection } from '@/types/finance';

type LegacyPayerSource = Pick<PaymentCollection, 'payer_name' | 'billing_partner'> & {
  billing_partner_name?: string | null;
  financial_responsible_name?: string | null;
};

type LegacyInstallmentLike = {
  display_label?: string | null;
  fee_name?: string | null;
  fee_type_name?: string | null;
  period_label?: string | null;
  sequence?: number | null;
  installment_sequence?: number | null;
  installment_count?: number | null;
};

const INSTALLMENT_SEQ_RE = /installment\s*(\d+)\s*\/\s*(\d+)/i;
const AR_INSTALLMENT_SEQ_RE = /قسط\s*(\d+)\s*\/\s*(\d+)/;

const AR_ORDINALS: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
  8: 'الثامنة',
  9: 'التاسعة',
  10: 'العاشرة',
};

/** Legacy payer label when `payer_name` is missing from older snapshots. */
export function resolveLegacyCollectionPayerLabel(
  coll: LegacyPayerSource,
  fallback: string,
): string {
  const billingName = coll.billing_partner_name?.trim();
  if (billingName) return billingName;
  const responsible = coll.financial_responsible_name?.trim();
  if (responsible) return responsible;
  const partner = refName(coll.billing_partner)?.trim();
  if (partner) return partner;
  return fallback;
}

/** Legacy installment title when official `display_label` is absent. */
export function resolveLegacyInstallmentDisplayLabel(
  row: LegacyInstallmentLike,
  locale?: string,
): string {
  const period = row.period_label?.trim();
  if (period) {
    const normalized = normalizeInstallmentDisplayLabel(period, locale);
    const fee = row.fee_name?.trim() || row.fee_type_name?.trim();
    const en = normalized.match(INSTALLMENT_SEQ_RE);
    const ar = normalized.match(AR_INSTALLMENT_SEQ_RE);
    const seq = en ? Number(en[1]) : ar ? Number(ar[1]) : row.installment_sequence ?? row.sequence;
    if (seq != null && fee && locale?.startsWith('ar')) {
      const ord = AR_ORDINALS[Number(seq)];
      if (ord) return `${fee} — الدفعة ${ord}`;
    }
    if (fee) return `${fee} — ${normalized}`;
    return normalized;
  }

  const fee = row.fee_name?.trim() || row.fee_type_name?.trim();
  const seq = row.installment_sequence ?? row.sequence;
  const count = row.installment_count;
  if (fee && seq != null && count != null) {
    return `${fee} — ${seq}/${count}`;
  }
  return fee ?? '';
}
