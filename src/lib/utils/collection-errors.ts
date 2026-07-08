export function collectionErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'invalid_amount':
    case 'invalidAmount':
      return 'admin.finance.errors.invalidAmount';
    case 'installment_not_collectible':
      return 'admin.finance.collectionWorkflow.errors.installmentNotCollectible';
    case 'allocation_total_mismatch':
      return 'admin.finance.collectionWorkflow.errors.allocationTotalMismatch';
    case 'allocation_exceeds_remaining':
    case 'allocationExceedsReceivable':
      return 'admin.finance.collectionWorkflow.errors.allocationExceedsRemaining';
    case 'allocation_installment_scope_mismatch':
      return 'admin.finance.collectionWorkflow.errors.allocationScopeMismatch';
    case 'collection_journal_required':
      return 'admin.finance.collectionWorkflow.errors.journalRequired';
    case 'collection_cash_session_required':
      return 'admin.finance.cashDesk.collectionGateDesc';
    case 'payment_reference_required':
      return 'admin.finance.collectionWorkflow.errors.paymentReferenceRequired';
    case 'allocation_exceeds_collection_amount':
    case 'allocation_exceeds_amount':
    case 'allocationExceedsCollection':
      return 'admin.finance.collectionWorkflow.errors.allocationExceedsCollection';
    case 'duplicate_allocation_target':
      return 'admin.finance.collectionWorkflow.errors.duplicateAllocationTarget';
    case 'allocation_exceeds_cheque_amount':
    case 'allocationExceedsChequeAmount':
      return 'admin.finance.collectionWorkflow.errors.allocationExceedsChequeAmount';
    case 'early_payment_not_allowed':
    case 'earlyPaymentNotAllowed':
      return 'admin.finance.collectionWorkflow.errors.earlyPaymentNotAllowed';
    case 'agreement_not_active':
      return 'admin.finance.collectionWorkflow.errors.agreementNotActive';
    case 'amount_exceeds_remaining_balance':
    case 'amountExceedsRemainingBalance':
      return 'admin.finance.collectionWorkflow.errors.amountExceedsRemainingBalance';
    case 'remaining_zero':
    case 'no_open_balance':
    case 'noOpenBalance':
      return 'admin.finance.collectionWorkflow.errors.noOpenBalance';
    case 'over_allocation':
    case 'overAllocation':
      return 'admin.finance.collectionWorkflow.errors.overAllocation';
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
    case 'billing_partner_required':
    case 'billing_partner_invalid':
    case 'billingPartnerRequired':
    case 'billingPartnerInvalid':
      return 'admin.finance.collectionWorkflow.errors.billingPartnerRequired';
    case 'duplicate_reference':
    case 'duplicateReference':
    case 'idempotency_conflict':
      return 'admin.finance.collectionWorkflow.errors.duplicateReference';
    case 'invalid_journal':
    case 'journal_inactive':
    case 'journal_not_allowed':
    case 'invalidJournal':
      return 'admin.finance.collectionWorkflow.errors.invalidJournal';
    case 'invalid_payment_method':
    case 'invalidPaymentMethod':
      return 'admin.finance.collectionWorkflow.errors.invalidPaymentMethod';
    case 'cheque_number_required':
    case 'cheque_date_required':
    case 'cheque_bank_required':
    case 'cheque_holder_required':
    case 'cheque_due_date_required':
      return 'admin.finance.collectionWorkflow.errors.missingChequeNumber';
    case 'validation_error':
      return null;
    default:
      return null;
  }
}

/** User-facing message for collection submit failures. */
export function resolveCollectionErrorMessage(
  code: string | undefined,
  fallback: string,
  t: (key: string) => string,
  extraResolvers?: Array<(code: string | undefined) => string | null>,
): string {
  for (const resolver of extraResolvers ?? []) {
    const key = resolver(code);
    if (key) return t(key);
  }
  const key = collectionErrorMessageKey(code);
  if (key) return t(key);
  if (fallback && !fallback.startsWith('Unexpected response')) return fallback;
  return t('admin.finance.collectionWorkflow.errors.genericSubmit');
}

export function agreementFromFeesErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'agreement_from_fees_empty':
      return 'admin.student360.financialAgreement.fromFees.errors.empty';
    case 'agreement_from_fees_already_exists':
      return 'admin.student360.financialAgreement.fromFees.errors.draftAlreadyExistsFull';
    case 'active_agreement_already_exists':
      return 'admin.student360.financialAgreement.fromFees.errors.activeAgreementExists';
    case 'agreement_from_fees_forbidden':
      return 'admin.student360.financialAgreement.fromFees.errors.forbidden';
    default:
      return null;
  }
}
