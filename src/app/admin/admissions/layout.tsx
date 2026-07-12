import { requireAdminPermission } from '@/lib/auth/require-admin-permission';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';

/** Server gate for admissions — before decision/detail client fetch. */
export default async function AdminAdmissionsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPermission(ADMISSION_VIEW);
  return children;
}
