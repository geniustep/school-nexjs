import type { ApiErrorBody } from '@/types/api';
import type { AgreementAmendmentAmbiguousLineCandidate } from '../types/agreement-amendment';
import {
  resolveAgreementLineServiceName,
  resolveAgreementLineTargetId,
} from './agreement-amendment-line-display';
import { resolvePeriodAmendableFromLine } from './agreement-amendment-line-eligibility';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

export function isAmbiguousAgreementLineTargetError(code: string | undefined): boolean {
  return code === 'ambiguous_agreement_line_target';
}

export function readAmbiguousAgreementLineCandidates(
  error?: ApiErrorBody | null,
): AgreementAmendmentAmbiguousLineCandidate[] {
  if (!error || !isAmbiguousAgreementLineTargetError(error.code)) return [];
  const details = asRecord(error.details);
  const candidates = details?.candidates;
  if (!Array.isArray(candidates)) return [];

  const parsed: AgreementAmendmentAmbiguousLineCandidate[] = [];
  for (const entry of candidates) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const sourceLineId =
      readFiniteNumber(rec.source_line_id) ??
      readFiniteNumber(rec.agreement_line_id) ??
      resolveAgreementLineTargetId(rec);
    if (sourceLineId == null) continue;

    parsed.push({
      sourceLineId,
      agreementLineId:
        readFiniteNumber(rec.agreement_line_id) ?? readFiniteNumber(rec.id),
      serviceName: resolveAgreementLineServiceName(rec),
      commitmentType: readString(rec.commitment_type),
      pricingUnit: readString(rec.pricing_unit),
      quantity: readFiniteNumber(rec.quantity),
      unitPrice: readFiniteNumber(rec.unit_price),
      netAmount: readFiniteNumber(rec.net_amount),
      periodAmendable: resolvePeriodAmendableFromLine(rec),
      amendmentBlockReason: readString(rec.amendment_block_reason),
      duplicateServiceWarning: readBoolean(rec.duplicate_service_warning),
    });
  }
  return parsed;
}
