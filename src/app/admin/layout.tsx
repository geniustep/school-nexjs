import { requireRole } from '@/lib/auth/guards';
import { isSchoolAccessSuspended } from '@/lib/auth/admin-access-status';
import { PortalLayout } from '@/components/layout/portal-layout';
import { AdminPageGuard } from '@/components/admin/admin-page-guard';
import { Card } from '@/components/ui/primitives';
import { RecipientAnnouncementsDashboardSlot } from '@/features/announcements/components/recipient-announcements-dashboard-slot';

function SuspendedAdminNotice() {
  return (
    <div className="admin-workspace" style={{ padding: '2rem', maxWidth: '40rem' }}>
      <Card>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem' }}>الوصول الإداري معلّق</h1>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          تم تعليق الوصول إلى مساحة الإدارة لهذه المدرسة. يمكنك متابعة استخدام الأدوار الأخرى
          المتاحة لحسابك إن وُجدت. تظل واجهة Odoo هي المرجع النهائي للصلاحيات.
        </p>
      </Card>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin');

  // Optional /me field when Backend exposes it — otherwise Odoo 403 remains authority.
  if (isSchoolAccessSuspended(user)) {
    return (
      <PortalLayout user={user}>
        <SuspendedAdminNotice />
      </PortalLayout>
    );
  }

  return (
    <PortalLayout user={user}>
      <AdminPageGuard>
        {children}
        <RecipientAnnouncementsDashboardSlot
          dashboardPath="/admin/dashboard"
          basePath="/admin/announcements"
          className="admin-dashboard-recipient-announcements"
        />
      </AdminPageGuard>
    </PortalLayout>
  );
}
