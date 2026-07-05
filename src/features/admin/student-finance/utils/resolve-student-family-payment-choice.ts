import {
  normalizeApiAccountKind,
  resolveBillingAccountKind,
} from '@/features/admin/finance/billing-account-kind';
import type { FamilyFinanceSummary } from '@/types/family-finance';

export type StudentFamilyPaymentChoice = 'student' | 'family';

export interface StudentFamilyPaymentChoiceContext {
  shouldPrompt: boolean;
  familyId: number | null;
  accountName: string | null;
  studentCount: number;
}

function readStudentCount(summary: FamilyFinanceSummary | null | undefined): number {
  if (!summary) return 0;
  return summary.student_count ?? summary.children?.length ?? 0;
}

/** Whether Student 360 should show the family vs individual payment choice dialog. */
export function resolveStudentFamilyPaymentChoice(input: {
  summary?: FamilyFinanceSummary | null;
  accountKind?: string | null;
  fallbackFamilyId?: number | null;
}): StudentFamilyPaymentChoiceContext {
  const studentCount = readStudentCount(input.summary);
  if (studentCount <= 1) {
    return {
      shouldPrompt: false,
      familyId: null,
      accountName: null,
      studentCount,
    };
  }

  const kind =
    normalizeApiAccountKind(input.accountKind) ?? resolveBillingAccountKind(studentCount);
  const isFamilyAccount = kind === 'family' || studentCount > 1;

  const familyId =
    input.summary?.family_id ??
    input.summary?.billing_partner_id ??
    input.fallbackFamilyId ??
    null;

  const accountName =
    input.summary?.display_name?.trim() ??
    input.summary?.billing_partner_name?.trim() ??
    null;

  return {
    shouldPrompt: isFamilyAccount && familyId != null,
    familyId,
    accountName,
    studentCount,
  };
}
