'use client';

import '@/features/admin/academic-setup/academic-setup-ui.css';
import { AcademicSetupNav } from '@/features/admin/academic-setup/components/academic-setup-nav';

export default function AcademicSetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="academic-setup admin-workspace">
      <AcademicSetupNav />
      {children}
    </div>
  );
}
