'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import {
  ArrearsListPanel,
  type ArrearsListFilters,
} from '@/features/admin/finance/arrears-list-panel';
import { isArrearsFollowupTab } from '@/features/admin/finance/arrears-filter-contracts';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewStudentBalance } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

function readFilters(searchParams: URLSearchParams): ArrearsListFilters {
  const pageRaw = searchParams.get('page');
  const tabRaw = searchParams.get('tab') ?? '';
  return {
    tab: isArrearsFollowupTab(tabRaw) ? tabRaw : '',
    search: searchParams.get('search') ?? '',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

const URL_KEYS: Record<keyof ArrearsListFilters, string> = {
  tab: 'tab',
  search: 'search',
  page: 'page',
};

export default function AdminFinanceArrearsPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/arrears');
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof ArrearsListFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof ArrearsListFilters, string | number | null]
      >) {
        const paramKey = URL_KEYS[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/arrears?${qs}` : '/admin/finance/arrears');
    },
    [router, searchParams],
  );

  if (!canViewStudentBalance(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.arrears.pageTitle')}
        subtitle={t('admin.finance.arrears.pageDesc')}
      />
      <ArrearsListPanel filters={filters} onFiltersChange={onFiltersChange} returnTo={returnTo} />
    </RequireAdminPermission>
  );
}
