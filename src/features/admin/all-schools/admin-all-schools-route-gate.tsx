'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { isAllSchoolsReadMode } from '@/lib/admin/all-schools-read-mode';
import { AdminAllSchoolsDashboardView } from './admin-all-schools-dashboard';
import { AdminAllSchoolsStudents } from './admin-all-schools-students';
import { AdminAllSchoolsClasses } from './admin-all-schools-classes';
import { AdminAllSchoolsParents } from './admin-all-schools-parents';

export function AdminAllSchoolsRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!isAllSchoolsReadMode(pathname, searchParams)) return <>{children}</>;

  switch (pathname) {
    case '/admin/dashboard':
      return <AdminAllSchoolsDashboardView />;
    case '/admin/students':
      return <AdminAllSchoolsStudents />;
    case '/admin/classes':
      return <AdminAllSchoolsClasses />;
    case '/admin/parents':
      return <AdminAllSchoolsParents />;
    default:
      return <>{children}</>;
  }
}
