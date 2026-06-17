import { isPositiveAmount } from '@/lib/utils/finance';
import { isChequePayment } from '@/lib/utils/cheque';
export type CollectionFormBlockerKey =
  | 'selectStudent'
  | 'selectJournal'
  | 'selectAcademicYear'
  | 'selectBillingPartner'
  | 'billingPartnerUnavailable'
  | 'enterAmount'
  | 'selectPaymentMethod'
  | 'enterCollectionDate'
  | 'completeChequeFields'
  | 'fixChequeDates'
  | 'allocateOrSkip'
  | 'allocationTotalMismatch'
  | 'unallocatedRemainder'
  | 'paymentReferenceRequired';

export function getCollectionSubmitBlockers(input: {
  hasStudent: boolean;
  journalId: string;
  academicYearId: string;
  billingPartnerId: string;
  resolvedBillingPartnerId?: number | null;
  partnersLoading: boolean;
  partnersLoadFailed: boolean;
  partnersCount: number;
  requiresBillingPartnerChoice: boolean;
  amount: number;
  paymentMethod: string;
  allowedMethodCodes: string[];
  collectionDate: string;
  isCheque: boolean;
  chequeNumber: string;
  chequeBank: string;
  chequeHolder: string;
  chequeWrittenDate: string;
  chequePostdated: boolean;
  chequeDueDate: string;
  reference: string;
  showAllocationStep: boolean;
  skipAllocation: boolean;
  allocatedTotal: number;
  collectionAmount: number;
  selectedInstallmentCount?: number;
}): CollectionFormBlockerKey[] {
  const blockers: CollectionFormBlockerKey[] = [];
  if (!input.hasStudent) blockers.push('selectStudent');
  if (!input.journalId) blockers.push('selectJournal');
  if (!input.academicYearId) blockers.push('selectAcademicYear');
  const effectivePartnerId =
    input.resolvedBillingPartnerId ?? (input.billingPartnerId ? Number(input.billingPartnerId) : null);
  if (!input.partnersLoading && (input.partnersLoadFailed || input.partnersCount === 0) && !effectivePartnerId) {
    blockers.push('billingPartnerUnavailable');
  } else if (!effectivePartnerId) {
    blockers.push('selectBillingPartner');
  }
  if (!isPositiveAmount(input.collectionAmount)) blockers.push('enterAmount');
  if (!input.paymentMethod || !input.allowedMethodCodes.includes(input.paymentMethod)) {
    blockers.push('selectPaymentMethod');
  }
  if (!input.collectionDate.trim()) blockers.push('enterCollectionDate');
  const needsReference =
    input.paymentMethod === 'transfer' ||
    input.paymentMethod === 'bank_transfer';
  if (needsReference && !input.reference.trim()) {
    blockers.push('paymentReferenceRequired');
  }
  if (input.isCheque) {
    if (
      !input.chequeNumber.trim() ||
      !input.chequeBank.trim() ||
      !input.chequeHolder.trim() ||
      !input.chequeWrittenDate.trim()
    ) {
      blockers.push('completeChequeFields');
    } else if (input.chequePostdated) {
      if (!input.chequeDueDate.trim()) {
        blockers.push('completeChequeFields');
      } else if (input.chequeDueDate < input.chequeWrittenDate) {
        blockers.push('fixChequeDates');
      }
    }
  }
  if (input.showAllocationStep && !input.skipAllocation) {
    if (input.allocatedTotal <= 0) blockers.push('allocateOrSkip');
    if (
      isPositiveAmount(input.collectionAmount) &&
      Math.abs(input.allocatedTotal - input.collectionAmount) > 0.009
    ) {
      blockers.push('allocationTotalMismatch');
    }
    if (input.allocatedTotal < input.collectionAmount - 0.009) {
      blockers.push('unallocatedRemainder');
    }
  }
  if ((input.selectedInstallmentCount ?? 0) === 0 && input.showAllocationStep && !input.skipAllocation) {
    blockers.push('allocateOrSkip');
  }
  return blockers;
}

