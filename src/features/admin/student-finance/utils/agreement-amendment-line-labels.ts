import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';

export function formatAmendmentLineOptionLabel(
  line: AgreementAmendmentLineOption,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const base = 'admin.student360.financeWorkspace.agreementAmendment.lineOptions';
  if (line.isOneTime) {
    const key = `${base}.oneTimeDisabled`;
    const formatted = t(key, { label: line.label });
    return formatted !== key ? formatted : `${line.label} — مرة واحدة، لا يُعدّل من شهر`;
  }
  if (line.isMonthly) {
    const key = `${base}.monthly`;
    const formatted = t(key, { label: line.label });
    return formatted !== key ? formatted : `${line.label} — شهري`;
  }
  return line.label;
}
