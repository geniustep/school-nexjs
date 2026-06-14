'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ChequeDetailsView } from '@/features/admin/finance/cheque-details-view';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_CHEQUES } from '@/lib/permissions/finance';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { FinanceCheque } from '@/types/finance';
import '@/features/admin/finance/finance-ui.css';

export default function AdminFinanceChequeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/cheques');
  const state = useAdminResource<FinanceCheque>(endpoints.admin.financeCheque(id));

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CHEQUES}>
      <div className="cheque-details-page">
        <Link href={returnTo} className="back-link">
          ‹ {t('admin.finance.cheques.backToList')}
        </Link>
        <ChequeDetailsView state={state} returnTo={returnTo} />
      </div>
    </RequireAdminPermission>
  );
}
