'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { HistoricalCollectionImportPanel } from '@/features/admin/finance/historical-collection-import-panel';
import { useSession } from '@/features/auth/session-context';
import { FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';

const HISTORICAL_COLLECTION_PRODUCTION_HOSTS = new Set([
  'alwah.raqeem.ma',
  'nibras.raqeem.ma',
]);

export default function AdminFinanceHistoricalCollectionsImportPage() {
  const user = useSession();
  const [releaseEnabled, setReleaseEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setReleaseEnabled(HISTORICAL_COLLECTION_PRODUCTION_HOSTS.has(window.location.hostname.toLowerCase()));
  }, []);

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href="/admin/finance/collections" className="back-link">‹ التحصيلات</Link>
      <PageHeader
        title="استيراد التحصيلات التاريخية"
        subtitle="قالب Excel من رقيم، معاينة قبل الاعتماد، ثم تحقق وتسجيل نهائي من Odoo."
      />
      {releaseEnabled === null ? (
        <div className="card" role="status">جارٍ التحقق من إتاحة الميزة…</div>
      ) : !releaseEnabled ? (
        <div className="card" role="alert">هذه الميزة غير مفعلة لهذه المدرسة.</div>
      ) : canCollectPayments(user) ? (
        <HistoricalCollectionImportPanel />
      ) : (
        <div className="card" role="alert">لا تملك صلاحية تحصيل الأداءات اللازمة لاعتماد هذه العملية.</div>
      )}
    </RequireAdminPermission>
  );
}
