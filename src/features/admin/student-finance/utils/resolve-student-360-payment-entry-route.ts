import type { StudentFamilyPaymentChoiceContext } from './resolve-student-family-payment-choice';

export type Student360PaymentEntryRoute =
  | { kind: 'student' }
  | {
      kind: 'family';
      familyId: number;
      accountName: string | null;
      studentId: number;
    };

/** Routes Student 360 payment entry to the existing family or student collection workflow. */
export function resolveStudent360PaymentEntryRoute(
  paymentChoiceContext: StudentFamilyPaymentChoiceContext,
  studentId: number,
): Student360PaymentEntryRoute {
  if (paymentChoiceContext.shouldPrompt && paymentChoiceContext.familyId != null) {
    return {
      kind: 'family',
      familyId: paymentChoiceContext.familyId,
      accountName: paymentChoiceContext.accountName,
      studentId,
    };
  }

  return { kind: 'student' };
}
