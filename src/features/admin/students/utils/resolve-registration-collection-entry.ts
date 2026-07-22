import type { FamilyFinanceSummary } from '@/types/family-finance';
import { resolveStudentFamilyPaymentChoice } from '@/features/admin/student-finance/utils/resolve-student-family-payment-choice';
import { resolveStudent360PaymentEntryRoute } from '@/features/admin/student-finance/utils/resolve-student-360-payment-entry-route';

export type RegistrationCollectionEntryUnavailableReason =
  | 'no_students'
  | 'billing_unresolved'
  | 'collection_blocked'
  | 'context_unresolved';

export type RegistrationCollectionEntryTarget =
  | { kind: 'student'; studentId: number }
  | {
      kind: 'family';
      familyId: number;
      accountName: string | null;
      studentId: number;
    }
  | { kind: 'unavailable'; reason: RegistrationCollectionEntryUnavailableReason };

/**
 * Resolve the official collection entry after registration success.
 * Never invents billing_partner_id — uses family-summary / hints from backend only.
 */
export function resolveRegistrationCollectionEntry(input: {
  succeededStudentIds: number[];
  billingUnresolved?: boolean;
  collectionAllowed?: boolean | null;
  familySummary?: FamilyFinanceSummary | null;
  billingPartnerIdHint?: number | null;
  /** When true, summary fetch finished (success or empty) so unresolved context is final. */
  summaryResolved?: boolean;
}): RegistrationCollectionEntryTarget {
  const succeeded = input.succeededStudentIds.filter((id) => Number.isFinite(id) && id > 0);
  if (succeeded.length === 0) {
    return { kind: 'unavailable', reason: 'no_students' };
  }

  if (input.billingUnresolved) {
    return { kind: 'unavailable', reason: 'billing_unresolved' };
  }

  if (input.collectionAllowed === false) {
    return { kind: 'unavailable', reason: 'collection_blocked' };
  }

  const primaryStudentId = succeeded[0];
  const paymentChoice = resolveStudentFamilyPaymentChoice({
    summary: input.familySummary,
    fallbackFamilyId: input.billingPartnerIdHint ?? null,
  });
  const route = resolveStudent360PaymentEntryRoute(paymentChoice, primaryStudentId);

  if (route.kind === 'family') {
    return {
      kind: 'family',
      familyId: route.familyId,
      accountName: route.accountName,
      studentId: route.studentId,
    };
  }

  // Multiple succeeded children without a resolved family account: do not guess.
  if (succeeded.length > 1 && input.summaryResolved) {
    const familyId =
      input.familySummary?.family_id ??
      input.familySummary?.billing_partner_id ??
      input.billingPartnerIdHint ??
      null;
    if (familyId == null) {
      return { kind: 'unavailable', reason: 'context_unresolved' };
    }
    return {
      kind: 'family',
      familyId,
      accountName:
        input.familySummary?.display_name?.trim() ??
        input.familySummary?.billing_partner_name?.trim() ??
        null,
      studentId: primaryStudentId,
    };
  }

  return { kind: 'student', studentId: primaryStudentId };
}

export function registrationCollectionFinanceHref(studentId: number): string {
  return `/admin/students/${studentId}?tab=finance`;
}

export function readReceiptIdFromCollection(input: {
  receipt_id?: number | null;
  receipts?: Array<{ id?: number | null } | null> | null;
}): number | null {
  if (typeof input.receipt_id === 'number' && input.receipt_id > 0) return input.receipt_id;
  const first = input.receipts?.find((row) => typeof row?.id === 'number' && (row.id ?? 0) > 0);
  return typeof first?.id === 'number' ? first.id : null;
}
