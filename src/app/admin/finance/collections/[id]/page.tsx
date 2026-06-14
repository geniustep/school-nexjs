'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import {
  CollectionDetailsView,
  resolveCollectionBackLabel,
} from '@/features/admin/finance/collection-details-view';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_PAYMENTS } from '@/lib/permissions/finance';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { PaymentCollection } from '@/types/finance';
import '@/features/admin/finance/finance-ui.css';

export default function AdminFinanceCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/collections');
  const state = useAdminResource<PaymentCollection>(endpoints.admin.financePaymentCollection(id));

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <div className="collection-details-page">
        <Link href={returnTo} className="back-link">
          ‹ {resolveCollectionBackLabel(returnTo, t)}
        </Link>
        <ResourceView state={state} loadingLabel={t('common.loading')}>
          {() => <CollectionDetailsView state={state} collectionId={id} returnTo={returnTo} />}
        </ResourceView>
      </div>
    </RequireAdminPermission>
  );
}
