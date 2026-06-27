import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';

export function formatAmendmentEffectivePeriodLabel(
  period: AgreementAmendmentPeriodOption,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const baseLabel = period.label.trim();
  if (!baseLabel) return baseLabel;
  const suffixKey = 'admin.student360.financeWorkspace.agreementAmendment.effectivePeriodOptionLabel';
  const formatted = t(suffixKey, { label: baseLabel });
  return formatted !== suffixKey ? formatted : `${baseLabel} وما بعده`;
}
