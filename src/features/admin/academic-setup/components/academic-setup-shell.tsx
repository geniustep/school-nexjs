'use client';

import { AcademicSetupNav } from '@/features/admin/academic-setup/components/academic-setup-nav';

export function AcademicSetupShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="academic-setup admin-workspace">
      <AcademicSetupNav />
      <div className="academic-setup__main">{children}</div>
    </div>
  );
}
