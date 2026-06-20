import { normalizeReferenceValue } from './reference-labels';

export type DraftAgreementLike = {
  empty_draft?: boolean;
  source?: string | null;
  creation_source?: string | null;
  original_total?: number | null;
  gross_amount?: number | null;
  net_amount?: number | null;
  total_amount?: number | null;
  fees_count?: number | null;
  line_count?: number | null;
  lines?: unknown[] | null;
  source_student_fee_ids?: number[] | null;
};

function readCreationSource(agreement: DraftAgreementLike): string | null {
  const raw = agreement.creation_source ?? agreement.source ?? null;
  return typeof raw === 'string' && raw.trim() ? normalizeReferenceValue(raw) : null;
}

function readOriginalTotal(agreement: DraftAgreementLike): number {
  return (
    agreement.original_total ??
    agreement.gross_amount ??
    agreement.net_amount ??
    agreement.total_amount ??
    0
  );
}

function readFeesCount(agreement: DraftAgreementLike): number {
  if (typeof agreement.fees_count === 'number') return agreement.fees_count;
  if (typeof agreement.line_count === 'number') return agreement.line_count;
  return agreement.lines?.length ?? 0;
}

function readSourceStudentFeeIds(agreement: DraftAgreementLike): number[] {
  return Array.isArray(agreement.source_student_fee_ids)
    ? agreement.source_student_fee_ids.filter((id) => typeof id === 'number')
    : [];
}

/** Manual empty drafts must not expose a clickable complete-draft action. */
export function isEmptyManualDraftAgreement(
  agreement: DraftAgreementLike | null | undefined,
): boolean {
  if (!agreement) return false;
  if (agreement.empty_draft === true) return true;

  const creationSource = readCreationSource(agreement);
  if (creationSource !== 'manual') return false;

  return (
    readOriginalTotal(agreement) === 0 &&
    readFeesCount(agreement) === 0 &&
    readSourceStudentFeeIds(agreement).length === 0
  );
}

export function canCompleteDraftAgreement(
  agreement: DraftAgreementLike | null | undefined,
): boolean {
  return !!agreement && !isEmptyManualDraftAgreement(agreement);
}
