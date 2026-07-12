import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import { requireAdminAccess } from '@/lib/auth/require-admin-permission';
import '@/features/admin/academic-setup/academic-setup-ui.css';
import { AcademicSetupShell } from '@/features/admin/academic-setup/components/academic-setup-shell';

export default async function AcademicSetupLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess((user) => canViewAcademicSetup(user));
  return <AcademicSetupShell>{children}</AcademicSetupShell>;
}
