import type { FinancialAgreementLine } from '../types';

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Stable line target id for amendment preview/apply — never fee_type_id. */
export function resolveAgreementLineTargetId(
  line: FinancialAgreementLine | Record<string, unknown>,
): number | null {
  const raw = line as Record<string, unknown>;
  return (
    readFiniteNumber(raw.source_line_id) ??
    readFiniteNumber(raw.agreement_line_id) ??
    readFiniteNumber(raw.id) ??
    readFiniteNumber((line as FinancialAgreementLine).id)
  );
}

/**
 * Preserve Odoo service/line name as-is. i18n category/fee-type fallbacks are used only when
 * no real name is present — never replace a concrete Odoo label with a generic teaching/tuition label.
 */
export function resolveAgreementLineServiceName(
  line: FinancialAgreementLine | Record<string, unknown>,
): string {
  const raw = line as Record<string, unknown>;
  const serviceName =
    readString(raw.service_name) ??
    readString((line as FinancialAgreementLine).service_name);
  if (serviceName) return serviceName;

  const service = raw.service as { name?: string | null } | undefined;
  const serviceObjectName =
    readString(service?.name) ??
    readString((line as FinancialAgreementLine).service?.name);
  if (serviceObjectName) return serviceObjectName;

  const feeTypeName = readString(raw.fee_type_name);
  if (feeTypeName) return feeTypeName;

  const targetId = resolveAgreementLineTargetId(line);
  return targetId != null ? String(targetId) : '—';
}

export function resolveAgreementAmendmentBlockReasonKey(
  reason: string | null | undefined,
): string | null {
  if (!reason?.trim()) return null;
  return `admin.student360.financeWorkspace.agreementAmendment.reasonCodes.${reason.trim()}`;
}
