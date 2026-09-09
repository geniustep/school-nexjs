'use client';

import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { HistoricalCollectionImportPanel } from '@/features/admin/finance/historical-collection-import-panel';
import { useSession } from '@/features/auth/session-context';
import { FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';

export default function AdminFinanceHistoricalCollectionsImportPage() {
  const user = useSession();

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href="/admin/finance/collections" className="back-link">‹ التحصيلات</Link>
      <PageHeader
        title="استيراد التحصيلات التاريخية"
        subtitle="قالب Excel من رقيم، معاينة قبل الاعتماد، ثم تحقق وتسجيل نهائي من Odoo."
      />
      {canCollectPayments(user) ? (
        <HistoricalCollectionImportPanel />
      ) : (
        <div className="card" role="alert">لا تملك صلاحية تحصيل الأداءات اللازمة لاعتماد هذه العملية.</div>
      )}
    </RequireAdminPermission>
  );
}
