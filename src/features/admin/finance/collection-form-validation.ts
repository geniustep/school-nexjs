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
  | 'allocateOrSkip';

export function getCollectionSubmitBlockers(input: {
  hasStudent: boolean;
  journalId: string;
  academicYearId: string;
  billingPartnerId: string;
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
  chequeReceivedDate: string;
  chequeMaturityDate: string;
  showAllocationStep: boolean;
  skipAllocation: boolean;
  allocatedTotal: number;
  collectionAmount: number;
}): CollectionFormBlockerKey[] {
  const blockers: CollectionFormBlockerKey[] = [];
  if (!input.hasStudent) blockers.push('selectStudent');
  if (!input.journalId) blockers.push('selectJournal');
  if (!input.academicYearId) blockers.push('selectAcademicYear');
  if (!input.partnersLoading && (input.partnersLoadFailed || input.partnersCount === 0)) {
    blockers.push('billingPartnerUnavailable');
  } else if (input.requiresBillingPartnerChoice && !input.billingPartnerId) {
    blockers.push('selectBillingPartner');
  } else if (!input.billingPartnerId) {
    blockers.push('selectBillingPartner');
  }
  if (!isPositiveAmount(input.collectionAmount)) blockers.push('enterAmount');
  if (!input.paymentMethod || !input.allowedMethodCodes.includes(input.paymentMethod)) {
    blockers.push('selectPaymentMethod');
  }
  if (!input.collectionDate.trim()) blockers.push('enterCollectionDate');
  if (input.isCheque) {
    if (
      !input.chequeNumber.trim() ||
      !input.chequeBank.trim() ||
      !input.chequeHolder.trim() ||
      !input.chequeReceivedDate.trim() ||
      !input.chequeMaturityDate.trim()
    ) {
      blockers.push('completeChequeFields');
    } else if (input.chequeMaturityDate < input.chequeReceivedDate) {
      blockers.push('fixChequeDates');
    }
  }
  if (input.showAllocationStep && !input.skipAllocation && input.allocatedTotal <= 0) {
    blockers.push('allocateOrSkip');
  }
  return blockers;
}

