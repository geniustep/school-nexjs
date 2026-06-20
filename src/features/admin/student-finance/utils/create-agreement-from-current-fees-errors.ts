import type { ApiErrorBody } from '@/types/api';

export function createAgreementFromCurrentFeesErrorMessageKey(
  code: string | undefined,
): string {
  switch (code) {
    case 'agreement_from_fees_already_exists':
      return 'admin.student360.financialAgreement.fromFees.errors.draftAlreadyExistsFull';
    case 'active_agreement_already_exists':
      return 'admin.student360.financialAgreement.fromFees.errors.activeAgreementExists';
    case 'agreement_from_fees_empty':
      return 'admin.student360.financialAgreement.fromFees.errors.empty';
    case 'agreement_from_fees_forbidden':
      return 'admin.student360.financialAgreement.fromFees.errors.forbidden';
    default:
      return 'admin.student360.financialAgreement.fromFees.errors.generic';
  }
}

export function isCreateAgreementFromCurrentFeesDuplicateError(code: string | undefined): boolean {
  return (
    code === 'agreement_from_fees_already_exists' || code === 'active_agreement_already_exists'
  );
}

export function readCreateAgreementFromCurrentFeesAgreementId(
  error?: Pick<ApiErrorBody, 'details'> | null,
): number | null {
  const raw = error?.details?.agreement_id;
  return typeof raw === 'number' ? raw : null;
}
