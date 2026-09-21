import { describe, expect, it } from 'vitest';
import {
  arrearsGuardianPhones,
  arrearsGuardianRelationshipLabelKey,
  arrearsReferenceLabel,
  groupArrearsInstallmentsByPeriod,
} from '@/features/admin/finance/utils/arrears-family-detail-present';

describe('arrears family detail presentation', () => {
  it('reads human labels from class and level references', () => {
    expect(arrearsReferenceLabel({ display_name: 'Class A' })).toBe('Class A');
    expect(arrearsReferenceLabel({ display_label: 'Primary 1' })).toBe('Primary 1');
    expect(arrearsReferenceLabel(null)).toBe('—');
  });

  it('groups overdue services by backend period without recalculating money', () => {
    const groups = groupArrearsInstallmentsByPeriod([
      { installment_id: 1, student_id: 10, period_key: '2026-09', actionable_overdue_amount: 100 },
      { installment_id: 2, student_id: 10, period_key: '2026-09', actionable_overdue_amount: 200 },
      { installment_id: 3, student_id: 10, period_key: '2026-10', actionable_overdue_amount: 300 },
    ]);
    expect(groups.map((group) => [group.key, group.items.length])).toEqual([
      ['2026-09', 2],
      ['2026-10', 1],
    ]);
  });

  it('maps known guardian relationship codes to translation keys', () => {
    expect(arrearsGuardianRelationshipLabelKey('mother')).toBe(
      'admin.finance.arrears.familyDetails.relationshipTypes.mother',
    );
    expect(arrearsGuardianRelationshipLabelKey('custom')).toBeNull();
  });

  it('normalizes all billing guardian phones with legacy fallback and de-duplication', () => {
    expect(
      arrearsGuardianPhones({
        phones: ['0612000000', '0522000000', '0612000000', ' '],
        phone: '0677000000',
      }),
    ).toEqual(['0612000000', '0522000000', '0677000000']);

    expect(
      arrearsGuardianPhones({
        phone: '0612000000',
      }),
    ).toEqual(['0612000000']);

    expect(
      arrearsGuardianPhones({
        phones: ['0612000000'],
        phone: '0612000000',
      }),
    ).toEqual(['0612000000']);
  });
});
