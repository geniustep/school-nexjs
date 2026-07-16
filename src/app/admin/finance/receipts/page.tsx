'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import {
  ReceiptsListPanel,
  type ReceiptsListFilters,
} from '@/features/admin/finance/receipts-list-panel';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW_PAYMENTS } from '@/lib/permissions/finance';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import '@/features/admin/finance/finance-ui.css';

function readFilters(searchParams: URLSearchParams): ReceiptsListFilters {
  const pageRaw = searchParams.get('page');
  return {
    search: searchParams.get('search') ?? '',
    studentId: searchParams.get('student_id') ?? searchParams.get('studentId') ?? '',
    involvedStudentId: searchParams.get('involved_student_id') ?? '',
    payerId: searchParams.get('payer_id') ?? '',
    billingPartnerId: searchParams.get('billing_partner_id') ?? '',
    collectionId: searchParams.get('collection_id') ?? '',
    dateFrom: searchParams.get('date_from') ?? '',
    dateTo: searchParams.get('date_to') ?? '',
    paymentMethod: searchParams.get('payment_method') ?? '',
    state: searchParams.get('state') ?? '',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

const URL_KEYS: Record<keyof ReceiptsListFilters, string> = {
  search: 'search',
  studentId: 'student_id',
  involvedStudentId: 'involved_student_id',
  payerId: 'payer_id',
  billingPartnerId: 'billing_partner_id',
  collectionId: 'collection_id',
  dateFrom: 'date_from',
  dateTo: 'date_to',
  paymentMethod: 'payment_method',
  state: 'state',
  page: 'page',
};

export default function AdminFinanceReceiptsPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/receipts');
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof ReceiptsListFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof ReceiptsListFilters, string | number | null]
      >) {
        const paramKey = URL_KEYS[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      }
      params.delete('studentId');
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/receipts?${qs}` : '/admin/finance/receipts');
    },
    [router, searchParams],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.receipts.title')}
        subtitle={t('admin.finance.receipts.subtitle')}
      />
      <ReceiptsListPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        returnTo={returnTo}
      />
    </RequireAdminPermission>
  );
}
