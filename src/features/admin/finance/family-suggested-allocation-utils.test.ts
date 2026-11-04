import { describe, expect, it } from 'vitest';
import {
  buildSuggestedFamilyAllocations,
  sortInstallmentsForFamilySuggestion,
} from '@/features/admin/finance/family-suggested-allocation-utils';
import type { FamilyOpenInstallment } from '@/types/family-finance';

function installment(
  partial: Partial<FamilyOpenInstallment> & Pick<FamilyOpenInstallment, 'installment_id' | 'student_id'>,
): FamilyOpenInstallment {
  return {
    service_type: 'other',
    remaining_amount: 1000,
    ...partial,
  };
}

describe('buildSuggestedFamilyAllocations', () => {
  it('orders by backend suggestion_order when present', () => {
    const installments = [
      installment({
        installment_id: 1,
        student_id: 10,
        service_type: 'registration',
        suggestion_order: 1,
        remaining_amount: 500,
      }),
      installment({
        installment_id: 2,
        student_id: 10,
        service_type: 'tuition',
        suggestion_order: 0,
        remaining_amount: 500,
      }),
    ];

    const sorted = sortInstallmentsForFamilySuggestion(installments);
    expect(sorted.map((row) => row.installment_id)).toEqual([2, 1]);

    const values = buildSuggestedFamilyAllocations({ amount: 600, installments });
    expect(values[2]).toBe('500');
    expect(values[1]).toBe('100');
  });

  it('does not give registration special priority when backend order differs', () => {
    const installments = [
      installment({
        installment_id: 11,
        student_id: 1,
        service_type: 'registration',
        suggestion_order: 1,
        remaining_amount: 400,
      }),
      installment({
        installment_id: 12,
        student_id: 1,
        service_type: 'tuition',
        suggestion_order: 0,
        remaining_amount: 400,
      }),
    ];

    const values = buildSuggestedFamilyAllocations({ amount: 200, installments });
    expect(Object.keys(values)).toEqual(['12']);
    expect(values[12]).toBe('200');
  });

  it('falls back to existing array order when suggestion_order is absent', () => {
    const installments = [
      installment({ installment_id: 21, student_id: 1, service_type: 'transport', remaining_amount: 300 }),
      installment({ installment_id: 22, student_id: 2, service_type: 'tuition', remaining_amount: 300 }),
    ];

    const sorted = sortInstallmentsForFamilySuggestion(installments);
    expect(sorted.map((row) => row.installment_id)).toEqual([21, 22]);

    const values = buildSuggestedFamilyAllocations({ amount: 250, installments });
    expect(values).toEqual({ 21: '250' });
  });

  it('settles both children and all services of December before January and February', () => {
    const installments = [
      installment({ installment_id: 1, student_id: 1, service_type: 'tuition', due_date: '2026-12-05', allocation_priority_weight: 50, suggestion_order: 0, remaining_amount: 1500 }),
      installment({ installment_id: 2, student_id: 1, service_type: 'tuition', due_date: '2027-01-05', allocation_priority_weight: 50, suggestion_order: 1, remaining_amount: 1500 }),
      installment({ installment_id: 3, student_id: 1, service_type: 'tuition', due_date: '2027-02-05', allocation_priority_weight: 50, suggestion_order: 2, remaining_amount: 1500 }),
      installment({ installment_id: 4, student_id: 2, service_type: 'tuition', due_date: '2026-12-05', allocation_priority_weight: 50, suggestion_order: 3, remaining_amount: 1500 }),
      installment({ installment_id: 5, student_id: 2, service_type: 'tuition', due_date: '2027-01-05', allocation_priority_weight: 50, suggestion_order: 4, remaining_amount: 1500 }),
      installment({ installment_id: 6, student_id: 2, service_type: 'tuition', due_date: '2027-02-05', allocation_priority_weight: 50, suggestion_order: 5, remaining_amount: 1500 }),
      installment({ installment_id: 7, student_id: 1, service_type: 'other', due_date: '2026-12-05', allocation_priority_weight: 50, suggestion_order: 6, remaining_amount: 100 }),
      installment({ installment_id: 8, student_id: 2, service_type: 'other', due_date: '2026-12-05', allocation_priority_weight: 50, suggestion_order: 7, remaining_amount: 100 }),
      installment({ installment_id: 9, student_id: 1, service_type: 'other', due_date: '2027-01-05', allocation_priority_weight: 50, suggestion_order: 8, remaining_amount: 100 }),
      installment({ installment_id: 10, student_id: 2, service_type: 'other', due_date: '2027-01-05', allocation_priority_weight: 50, suggestion_order: 9, remaining_amount: 100 }),
    ];
    const allocations = buildSuggestedFamilyAllocations({ amount: 6400, installments });
    expect(allocations).toEqual({
      1: '1500', 4: '1500', 7: '100', 8: '100',
      2: '1500', 5: '1500', 9: '100', 10: '100',
    });
    expect(allocations[3]).toBeUndefined();
    expect(allocations[6]).toBeUndefined();
  });

  it('preserves backend service precedence within the same month', () => {
    const allocations = buildSuggestedFamilyAllocations({
      amount: 150,
      installments: [
        installment({ installment_id: 41, student_id: 1, due_date: '2026-12-05', allocation_priority_weight: 50, suggestion_order: 3, remaining_amount: 100 }),
        installment({ installment_id: 42, student_id: 1, due_date: '2026-12-10', allocation_priority_weight: 50, suggestion_order: 0, remaining_amount: 100 }),
      ],
    });
    expect(allocations).toEqual({ 42: '100', 41: '50' });
  });

  it('returns empty values for invalid amounts', () => {
    const installments = [
      installment({ installment_id: 31, student_id: 1, suggestion_order: 0, remaining_amount: 100 }),
    ];
    expect(buildSuggestedFamilyAllocations({ amount: 0, installments })).toEqual({});
    expect(buildSuggestedFamilyAllocations({ amount: -10, installments })).toEqual({});
  });
});

describe('manual allocation protection', () => {
  it('only builds suggestions when explicitly called — no side effects on inputs', () => {
    const manualInputs = { 99: '150' };
    const installments = [
      installment({ installment_id: 99, student_id: 1, suggestion_order: 0, remaining_amount: 500 }),
    ];
    const suggested = buildSuggestedFamilyAllocations({ amount: 100, installments });
    expect(manualInputs).toEqual({ 99: '150' });
    expect(suggested[99]).toBe('100');
    expect(manualInputs).toEqual({ 99: '150' });
  });
});
