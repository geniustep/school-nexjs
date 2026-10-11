'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { useT } from '@/features/i18n/locale-context';

export default function AdminTimetablePage() {
  const t = useT();
  const user = useSession();
  const canManage = hasPermission(user, 'manage_timetable');

  return (
    <RequireAdminPermission permission="view_timetable">
      <div className="admin-workspace">
        <PageHeader title={t('timetable.title')} subtitle={t('admin.timetableDesc')} />
        <nav aria-label="إجراءات استعمال الزمان" className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {canManage ? (
            <Link href="/admin/timetable/setup" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
              <span aria-hidden="true" className="text-xl">⚙️</span>
              <strong className="text-base">إعداد الأيام والفترات</strong>
              <span className="text-sm text-[var(--muted-foreground)]">ضبط أيام الدراسة والحصص والاستراحات دون اختيار قسم.</span>
            </Link>
          ) : null}
          <Link href="/admin/timetable/studio" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
            <span aria-hidden="true" className="text-xl">🧩</span>
            <strong className="text-base">استوديو استعمال الزمان V3</strong>
            <span className="text-sm text-[var(--muted-foreground)]">معاينة الشبكة الأسبوعية وتوزيع الإسنادات محليًا، دون حفظ.</span>
          </Link>
          <Link href="/admin/timetable/bulk" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
            <span aria-hidden="true" className="text-xl">📅</span>
            <strong className="text-base">تحرير حصص الأقسام</strong>
            <span className="text-sm text-[var(--muted-foreground)]">اختيار القسم وتحرير مسودة حصصه حسب الإسنادات.</span>
          </Link>
          <a href="#timetable-overview" className="group flex min-h-32 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
            <span aria-hidden="true" className="text-xl">🗓️</span>
            <strong className="text-base">عرض استعمال الزمان</strong>
            <span className="text-sm text-[var(--muted-foreground)]">الانتقال إلى العرض الحالي أسفل الصفحة.</span>
          </a>
        </nav>
        <section id="timetable-overview" aria-label="عرض استعمال الزمان" className="scroll-mt-8">
          <AdminTimetablePanel />
        </section>
      </div>
    </RequireAdminPermission>
  );
}
