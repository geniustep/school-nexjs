import { describe, expect, it } from 'vitest';
import { getCollectionSubmitBlockers } from './collection-form-validation';

const base = {
  hasStudent: true,
  journalId: '1',
  academicYearId: '2',
  billingPartnerId: '3',
  resolvedBillingPartnerId: 3,
  partnersLoading: false,
  partnersLoadFailed: false,
  partnersCount: 1,
  requiresBillingPartnerChoice: false,
  amount: 100,
  paymentMethod: 'cash',
  allowedMethodCodes: ['cash'],
  collectionDate: '2026-06-01',
  isCheque: false,
  chequeNumber: '',
  chequeBank: '',
  chequeHolder: '',
  chequeWrittenDate: '',
  chequePostdated: false,
  chequeDueDate: '',
  reference: '',
  showAllocationStep: true,
  skipAllocation: false,
  allocatedTotal: 0,
  collectionAmount: 100,
  selectedInstallmentCount: 1,
};

describe('collection form validation', () => {
  it('lists blockers when billing partner missing', () => {
    expect(
      getCollectionSubmitBlockers({
        ...base,
        billingPartnerId: '',
        resolvedBillingPartnerId: null,
        requiresBillingPartnerChoice: true,
      }),
    ).toContain('selectBillingPartner');
  });

  it('blocks submit when billing partners cannot be resolved', () => {
    expect(
      getCollectionSubmitBlockers({
        ...base,
        billingPartnerId: '',
        resolvedBillingPartnerId: null,
        partnersCount: 0,
        partnersLoadFailed: false,
      }),
    ).toContain('billingPartnerUnavailable');
  });

  it('requires allocation or skip when receivables exist', () => {
    expect(getCollectionSubmitBlockers(base)).toContain('allocateOrSkip');
    expect(
      getCollectionSubmitBlockers({ ...base, skipAllocation: true }),
    ).not.toContain('allocateOrSkip');
  });

  it('allows submit when allocation totals are valid', () => {
    expect(
      getCollectionSubmitBlockers({
        ...base,
        allocatedTotal: 100,
        collectionAmount: 100,
        selectedInstallmentCount: 2,
      }),
    ).toEqual([]);
  });
});
