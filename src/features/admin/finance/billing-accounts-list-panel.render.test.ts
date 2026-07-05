import { describe, expect, it } from 'vitest';
import { resolveBillingAccountKindFromRow } from '@/features/admin/finance/billing-account-kind';
import type { BillingAccountListItem } from '@/types/finance-billing-account';

describe('billing accounts list row kind rendering', () => {
  it('does not render individual kind when API marks row as family', () => {
    const familyRow: BillingAccountListItem = {
      billing_partner_id: 6667,
      student_count: 1,
      account_kind: 'family',
    };
    expect(resolveBillingAccountKindFromRow(familyRow)).toBe('family');
  });

  it('renders individual when API marks row as individual', () => {
    const individualRow: BillingAccountListItem = {
      billing_partner_id: 9046,
      student_count: 1,
      account_kind: 'individual',
    };
    expect(resolveBillingAccountKindFromRow(individualRow)).toBe('individual');
  });

  it('infers kind from student_count only when account_kind is absent', () => {
    expect(
      resolveBillingAccountKindFromRow({
        student_count: 3,
      }),
    ).toBe('family');
  });
});
