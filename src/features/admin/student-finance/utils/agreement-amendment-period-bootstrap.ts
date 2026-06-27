import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentRequestPayload } from '../types/agreement-amendment';

export function scanRangeForAcademicYear(academicYearId: number): { start: number; end: number } {
  const start = Math.max(1, (academicYearId - 1) * 100 + 250);
  return { start, end: start + 120 };
}

export function readAgreementLineBootstrap(
  agreement: FinancialAgreement,
): AgreementAmendmentRequestPayload['line'] | null {
  const lines = agreement.lines ?? [];
  const line =
    lines.find((entry) => entry.id && (entry.service_id || entry.service?.id)) ??
    lines.find((entry) => entry.id);
  if (!line?.id) return null;
  const raw = line as Record<string, unknown>;
  const feeTypeId =
    (typeof raw.fee_type_id === 'number' ? raw.fee_type_id : null) ??
    line.service_id ??
    line.service?.id;
  if (feeTypeId == null) return null;
  const amount = line.net_amount ?? line.gross_amount ?? line.unit_price ?? 0;
  return {
    source_line_id: line.id,
    fee_type_id: feeTypeId,
    amount,
  };
}
