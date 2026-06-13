import '@/features/admin/academic-setup/academic-setup-ui.css';
import { AcademicSetupShell } from '@/features/admin/academic-setup/components/academic-setup-shell';

export default function AcademicSetupLayout({ children }: { children: React.ReactNode }) {
  return <AcademicSetupShell>{children}</AcademicSetupShell>;
}
