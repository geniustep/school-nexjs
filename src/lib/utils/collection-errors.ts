export function collectionErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'invalid_amount':
    case 'invalidAmount':
      return 'admin.finance.errors.invalidAmount';
    case 'allocation_exceeds_collection_amount':
    case 'allocationExceedsCollection':
      return 'admin.finance.collectionWorkflow.errors.allocationExceedsCollection';
    case 'allocation_exceeds_cheque_amount':
    case 'allocationExceedsChequeAmount':
      return 'admin.finance.collectionWorkflow.errors.allocationExceedsChequeAmount';
    case 'early_payment_not_allowed':
    case 'earlyPaymentNotAllowed':
      return 'admin.finance.collectionWorkflow.errors.earlyPaymentNotAllowed';
    case 'duplicate_cheque':
    case 'duplicateCheque':
      return 'admin.finance.collectionWorkflow.errors.duplicateCheque';
    case 'missing_cheque_number':
    case 'missingChequeNumber':
      return 'admin.finance.collectionWorkflow.errors.missingChequeNumber';
    case 'missing_bank':
    case 'missingBank':
      return 'admin.finance.collectionWorkflow.errors.missingBank';
    case 'missing_bounce_reason':
    case 'missingBounceReason':
      return 'admin.finance.collectionWorkflow.errors.missingBounceReason';
    case 'invalid_cheque_date_order':
    case 'invalidChequeDateOrder':
      return 'admin.finance.collectionWorkflow.errors.invalidChequeDateOrder';
    case 'cross_school_violation':
    case 'crossSchoolViolation':
      return 'admin.finance.collectionWorkflow.errors.crossSchoolViolation';
    default:
      return null;
  }
}
