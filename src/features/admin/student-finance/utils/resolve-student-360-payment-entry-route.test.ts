import { describe, expect, it } from 'vitest';
import { resolveStudent360PaymentEntryRoute } from './resolve-student-360-payment-entry-route';
import type { StudentFamilyPaymentChoiceContext } from './resolve-student-family-payment-choice';

describe('resolveStudent360PaymentEntryRoute', () => {
  it('routes multi-student family accounts to family collection with the current student', () => {
    const context: StudentFamilyPaymentChoiceContext = {
      shouldPrompt: true,
      familyId: 6667,
      accountName: 'Alami Family',
      studentCount: 2,
    };

    expect(resolveStudent360PaymentEntryRoute(context, 42)).toEqual({
      kind: 'family',
      familyId: 6667,
      accountName: 'Alami Family',
      studentId: 42,
    });
  });

  it('routes single-student accounts to the student collection workflow', () => {
    const context: StudentFamilyPaymentChoiceContext = {
      shouldPrompt: false,
      familyId: null,
      accountName: null,
      studentCount: 1,
    };

    expect(resolveStudent360PaymentEntryRoute(context, 42)).toEqual({ kind: 'student' });
  });

  it('falls back to student collection when family id is missing', () => {
    const context: StudentFamilyPaymentChoiceContext = {
      shouldPrompt: true,
      familyId: null,
      accountName: 'Alami Family',
      studentCount: 2,
    };

    expect(resolveStudent360PaymentEntryRoute(context, 42)).toEqual({ kind: 'student' });
  });
});
