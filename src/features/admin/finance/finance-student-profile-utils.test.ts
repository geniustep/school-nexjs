import { describe, expect, it } from 'vitest';
import {
  getStudentFeeLabel,
  resolveFinanceStudentSummary,
  summarizeStudentFees,
} from './finance-student-profile-utils';
import type { StudentFee, StudentFinanceProfile } from '@/types/finance';

const sampleFees: StudentFee[] = [
  {
    id: 919,
    name: 'Bulk Success — QA CANTEEN PER MEAL (2026-12-01 → 2026-12-31)',
    fee_type_name: 'QA CANTEEN PER MEAL',
    net_amount: 25,
    paid_amount: 0,
    remaining_amount: 25,
    currency: 'MAD',
    student: { id: 822, name: 'Bulk Success' },
  },
  {
    id: 918,
    fee_type_name: 'QA CANTEEN PACKAGE NO EXTRA',
    net_amount: 450,
    paid_amount: 0,
    remaining_amount: 450,
    currency: 'MAD',
  },
];

describe('finance student profile utils', () => {
  it('labels fees from fee_type_name', () => {
    expect(getStudentFeeLabel(sampleFees[0])).toBe('QA CANTEEN PER MEAL');
  });

  it('summarizes fee totals', () => {
    expect(summarizeStudentFees(sampleFees)).toMatchObject({
      total: 475,
      paid: 0,
      remaining: 475,
    });
  });

  it('falls back to fee totals when billing profile has no amounts', () => {
    const profile: StudentFinanceProfile = {
      billing_partner: { id: 6988, name: 'QA FIN Billing Partner 822' },
    };
    const summary = resolveFinanceStudentSummary(profile, sampleFees);
    expect(summary.payerName).toBe('QA FIN Billing Partner 822');
    expect(summary.total).toBe(475);
    expect(summary.remaining).toBe(475);
  });
});
