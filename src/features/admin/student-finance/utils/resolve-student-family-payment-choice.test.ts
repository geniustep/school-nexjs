import { describe, expect, it } from 'vitest';
import { resolveStudentFamilyPaymentChoice } from './resolve-student-family-payment-choice';
import type { FamilyFinanceSummary } from '@/types/family-finance';

function summary(partial: Partial<FamilyFinanceSummary>): FamilyFinanceSummary {
  return {
    family_id: 6667,
    children: [],
    ...partial,
  };
}

describe('resolveStudentFamilyPaymentChoice', () => {
  it('does not prompt for a single-student account', () => {
    const result = resolveStudentFamilyPaymentChoice({
      summary: summary({ student_count: 1, children: [{ student_id: 1, services_summary: [] }] }),
      accountKind: 'family',
    });
    expect(result.shouldPrompt).toBe(false);
  });

  it('prompts for a multi-student family account', () => {
    const result = resolveStudentFamilyPaymentChoice({
      summary: summary({
        student_count: 2,
        children: [
          { student_id: 1, services_summary: [] },
          { student_id: 2, services_summary: [] },
        ],
      }),
    });
    expect(result.shouldPrompt).toBe(true);
    expect(result.familyId).toBe(6667);
  });

  it('prompts when account_kind is family even if student_count is inferred from children', () => {
    const result = resolveStudentFamilyPaymentChoice({
      summary: summary({
        children: [
          { student_id: 1, services_summary: [] },
          { student_id: 2, services_summary: [] },
        ],
      }),
      accountKind: 'family',
    });
    expect(result.shouldPrompt).toBe(true);
    expect(result.studentCount).toBe(2);
  });

  it('does not prompt without a family id', () => {
    const result = resolveStudentFamilyPaymentChoice({
      summary: summary({
        family_id: undefined as unknown as number,
        billing_partner_id: null,
        student_count: 2,
      }),
    });
    expect(result.shouldPrompt).toBe(false);
  });
});
