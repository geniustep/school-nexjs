import { canManageStudentBillingProfile } from '@/features/admin/students/utils/resolve-capabilities';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentFinanceCapabilities } from '@/types/student-finance';

export function canChangeBillingAuthority(
  studentCaps: StudentCapabilities,
  financeCaps?: StudentFinanceCapabilities | null,
): boolean {
  if (financeCaps?.can_change_billing_authority === true) return true;
  return canManageStudentBillingProfile(studentCaps, financeCaps);
}
