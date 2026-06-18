'use client';

import { use } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { StudentFeeDetailView } from '@/features/admin/finance/student-fee-detail-view';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import type { StudentFee } from '@/types/finance';
import '@/features/admin/finance/finance-ui.css';

export default function AdminFinanceStudentFeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useAdminResource<StudentFee>(endpoints.admin.financeStudentFees(id));

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="finance-student-fee-page">
        <Link href="/admin/finance/student-fees" className="back-link">
          ‹ {t('admin.finance.backToStudentFees')}
        </Link>
        <ResourceView state={state} loadingLabel={t('common.loading')}>
          {(fee) => <StudentFeeDetailView fee={fee} />}
        </ResourceView>
      </div>
    </RequireAdminPermission>
  );
}
