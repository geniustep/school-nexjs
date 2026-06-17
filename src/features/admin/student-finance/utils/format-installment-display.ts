import { normalizeInstallmentDisplayLabel } from '@/features/admin/finance/collection-labels';

type InstallmentLike = {
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

function resolveInstallmentSequence(
  normalized: string,
  row: InstallmentLike,
): number | null {
  const en = normalized.match(INSTALLMENT_SEQ_RE);
  if (en) return Number(en[1]);
  const ar = normalized.match(AR_INSTALLMENT_SEQ_RE);
  if (ar) return Number(ar[1]);
  const seq = row.installment_sequence ?? row.sequence;
  return seq != null ? Number(seq) : null;
}

/** Readable installment title — prefers `display_label`, never raw `installment n/m`. */
export function formatInstallmentDisplayTitle(
  row: InstallmentLike,
  locale?: string,
): string {
  if (row.display_label?.trim()) {
    return normalizeInstallmentDisplayLabel(row.display_label.trim(), locale);
  }

  const period = row.period_label?.trim();
  if (period) {
    const normalized = normalizeInstallmentDisplayLabel(period, locale);
    const fee = row.fee_name?.trim() || row.fee_type_name?.trim();
    const seq = resolveInstallmentSequence(normalized, row);
    if (seq != null && fee && locale?.startsWith('ar')) {
      const ord = AR_ORDINALS[seq];
      if (ord) return `${fee} — الدفعة ${ord}`;
    }
    if (fee && (INSTALLMENT_SEQ_RE.test(period) || AR_INSTALLMENT_SEQ_RE.test(normalized))) {
      return `${fee} — ${normalized}`;
    }
    if (!INSTALLMENT_SEQ_RE.test(normalized) && !AR_INSTALLMENT_SEQ_RE.test(normalized)) {
      return normalized;
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
