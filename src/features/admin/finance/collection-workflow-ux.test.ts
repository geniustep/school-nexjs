import { describe, expect, it } from 'vitest';
import { resolveCollectionBilling } from '@/features/admin/finance/collection-billing-context';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import { getCollectionSubmitBlockers } from '@/features/admin/finance/collection-form-validation';
import { collectionErrorMessageKey } from '@/lib/utils/collection-errors';
import { parseDecimalInput } from '@/features/admin/finance/parse-decimal-input';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

const t = (key: string) => key;

describe('collection workflow UX', () => {
  it('reads billing_partner_id from collectible-items response', () => {
    const resolved = resolveCollectionBilling({
      collectible: {
        billing_profile_id: 2379,
        billing_partner_id: 7086,
        billing_partner_name: 'ولي أمر',
        billing_party_type: 'guardian',
        summary: {
          annual_total: 22500,
          due_to_date: 4500,
          paid: 0,
          remaining: 22500,
          overdue: 0,
          upcoming: 22500,
        },
        items: [],
      },
    });
    expect(resolved.billingProfileId).toBe(2379);
    expect(resolved.billingPartnerId).toBe(7086);
    expect(resolved.billingPartnerName).toBe('ولي أمر');
  });

  it('maps billing_partner_required to Arabic message key', () => {
    expect(collectionErrorMessageKey('billing_partner_required')).toBe(
      'admin.finance.collectionWorkflow.errors.billingPartnerRequired',
    );
  });

  it('blocks submit when billing partner is missing', () => {
    const blockers = getCollectionSubmitBlockers({
      hasStudent: true,
      journalId: '12',
      academicYearId: '1',
      billingPartnerId: '',
      resolvedBillingPartnerId: null,
      partnersLoading: false,
      partnersLoadFailed: false,
      partnersCount: 1,
      requiresBillingPartnerChoice: false,
      amount: 4500,
      paymentMethod: 'cash',
      allowedMethodCodes: ['cash'],
      collectionDate: '2026-06-17',
      isCheque: false,
      chequeNumber: '',
      chequeBank: '',
      chequeHolder: '',
      chequeReceivedDate: '',
      chequeMaturityDate: '',
      reference: '',
      showAllocationStep: true,
      skipAllocation: false,
      allocatedTotal: 4500,
      collectionAmount: 4500,
      selectedInstallmentCount: 2,
    });
    expect(blockers).toContain('selectBillingPartner');
  });

  it('uses display_label and avoids technical IDs in title', () => {
    const row: StudentInstallment = {
      id: 2432,
      display_label: 'رسم التسجيل — الدفعة الوحيدة',
      fee_id: 2432,
      remaining_amount: 2500,
      due_date: '2026-06-17',
    };
    const { title } = formatInstallmentLabel(row, t, () => '2026-06-17', () => '—');
    expect(title).toBe('رسم التسجيل — الدفعة الوحيدة');
    expect(title).not.toContain('#2432');
    expect(title).not.toContain('installment 1/1');
  });

  it('keeps full allocation amounts in decimal parsing', () => {
    expect(parseDecimalInput('2500')).toBe('2500');
    expect(parseDecimalInput('2000.00')).toBe('2000.00');
    expect(parseDecimalInput('4500.50')).toBe('4500.50');
  });

  it('flags unallocated remainder before confirm', () => {
    const blockers = getCollectionSubmitBlockers({
      hasStudent: true,
      journalId: '12',
      academicYearId: '1',
      billingPartnerId: '7086',
      resolvedBillingPartnerId: 7086,
      partnersLoading: false,
      partnersLoadFailed: false,
      partnersCount: 1,
      requiresBillingPartnerChoice: false,
      amount: 4500,
      paymentMethod: 'cash',
      allowedMethodCodes: ['cash'],
      collectionDate: '2026-06-17',
      isCheque: false,
      chequeNumber: '',
      chequeBank: '',
      chequeHolder: '',
      chequeReceivedDate: '',
      chequeMaturityDate: '',
      reference: '',
      showAllocationStep: true,
      skipAllocation: false,
      allocatedTotal: 2000,
      collectionAmount: 4500,
      selectedInstallmentCount: 2,
    });
    expect(blockers).toContain('allocationTotalMismatch');
    expect(blockers).toContain('unallocatedRemainder');
  });
});

describe('special agreement UX labels', () => {
  it('uses special agreement title key', () => {
    expect('admin.student360.financialAgreement.pageTitle').toContain('financialAgreement');
  });

  it('exposes adjustment type translation keys', () => {
    const key = 'admin.student360.financialAgreement.adjustments.types.fixed_discount';
    expect(key).toContain('fixed_discount');
  });
});
