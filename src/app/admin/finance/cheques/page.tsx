'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import {
  ChequesListPanel,
  chequesListPageSubtitle,
  chequesListPageTitle,
  type ChequesListFilters,
} from '@/features/admin/finance/cheques-list-panel';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW_CHEQUES } from '@/lib/permissions/finance';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import '@/features/admin/finance/finance-ui.css';

function readFilters(searchParams: URLSearchParams): ChequesListFilters {
  const pageRaw = searchParams.get('page');
  return {
    quick: searchParams.get('quick') ?? '',
    search: searchParams.get('search') ?? '',
    dueFrom: searchParams.get('due_date_from') ?? searchParams.get('maturity_date_from') ?? '',
    dueTo: searchParams.get('due_date_to') ?? searchParams.get('maturity_date_to') ?? '',
    studentId: searchParams.get('student_id') ?? '',
    billingPartnerId: searchParams.get('billing_partner_id') ?? '',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

const URL_KEYS: Record<keyof ChequesListFilters, string> = {
  quick: 'quick',
  search: 'search',
  dueFrom: 'due_date_from',
  dueTo: 'due_date_to',
  studentId: 'student_id',
  billingPartnerId: 'billing_partner_id',
  page: 'page',
};

export default function AdminFinanceChequesPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/cheques');
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof ChequesListFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof ChequesListFilters, string | number | null]
      >) {
        const paramKey = URL_KEYS[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      }
      params.delete('maturity_date_from');
      params.delete('maturity_date_to');
      params.delete('state');
      params.delete('overdue_only');
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/cheques?${qs}` : '/admin/finance/cheques');
    },
    [router, searchParams],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CHEQUES}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={chequesListPageTitle(filters.quick, t)}
        subtitle={chequesListPageSubtitle(filters.quick, t)}
      />
      <ChequesListPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        returnTo={returnTo}
      />
    </RequireAdminPermission>
  );
}
