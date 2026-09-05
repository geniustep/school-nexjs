import type { StudentInstallment } from '../types';

export interface OperationalInstallmentTarget {
  agreementId: number;
  agreementLineId: number;
  periodStart: string;
  periodEnd: string;
}

export type OperationalInstallmentResolution =
  | { ok: true; operationalInstallmentId: number }
  | { ok: false; reason: 'missing_target_identity' | 'not_found' | 'ambiguous' };

/**
 * Resolve the exact Odoo school.installment id using canonical agreement/line
 * identity plus the exact billing-period boundaries. Never infer from row order,
 * month labels, sequence, or monetary values.
 */
export function resolveOperationalInstallmentId(
  installments: StudentInstallment[],
  target: Partial<OperationalInstallmentTarget>,
): OperationalInstallmentResolution {
  const { agreementId, agreementLineId, periodStart, periodEnd } = target;
  if (
    !Number.isFinite(agreementId) ||
    !Number.isFinite(agreementLineId) ||
    !periodStart ||
    !periodEnd
  ) {
    return { ok: false, reason: 'missing_target_identity' };
  }

  const matches = installments.filter(
    (installment) =>
      Number.isFinite(installment.id) &&
      installment.agreement_id === agreementId &&
      installment.agreement_line_id === agreementLineId &&
      installment.period_start === periodStart &&
      installment.period_end === periodEnd,
  );

  if (matches.length === 0) return { ok: false, reason: 'not_found' };
  if (matches.length > 1) return { ok: false, reason: 'ambiguous' };
  return { ok: true, operationalInstallmentId: matches[0]!.id };
}
