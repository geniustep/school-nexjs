'use client';

import { usePathname } from 'next/navigation';
import { RecipientAnnouncementsDashboardSection } from './recipient-announcements-dashboard-section';

export function RecipientAnnouncementsDashboardSlot({
  dashboardPath,
  basePath,
  className,
}: {
  dashboardPath: string;
  basePath: string;
  className?: string;
}) {
  const pathname = usePathname();
  const normalizedDashboardPath = dashboardPath.replace(/\/$/, '');
  const normalizedPathname = pathname.replace(/\/$/, '');

  if (normalizedPathname !== normalizedDashboardPath) return null;

  return (
    <RecipientAnnouncementsDashboardSection
      basePath={basePath}
      className={className}
    />
  );
}
