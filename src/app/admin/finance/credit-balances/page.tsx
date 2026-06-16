'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import {
  CreditBalancesListPanel,
  type CreditBalancesListFilters,
} from '@/features/admin/finance/credit-balance/credit-balances-list-panel';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewCreditBalances } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

function readFilters(searchParams: URLSearchParams): CreditBalancesListFilters {
  const pageRaw = searchParams.get('page');
  return {
    search: searchParams.get('search') ?? '',
    billingPartnerId: searchParams.get('billing_partner_id') ?? '',
    state: searchParams.get('state') ?? '',
    hasAvailableCredit: searchParams.get('has_available_credit') === 'true',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

const URL_KEYS: Record<keyof CreditBalancesListFilters, string> = {
  search: 'search',
  billingPartnerId: 'billing_partner_id',
  state: 'state',
  hasAvailableCredit: 'has_available_credit',
  page: 'page',
};

export default function AdminFinanceCreditBalancesPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(
    searchParams.get('returnTo'),
    '/admin/finance/credit-balances',
  );
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof CreditBalancesListFilters, string | number | boolean | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof CreditBalancesListFilters, string | number | boolean | null]
      >) {
        const paramKey = URL_KEYS[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) {
          params.delete(paramKey);
        } else if (key === 'hasAvailableCredit') {
          if (value === true) params.set(paramKey, 'true');
          else params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/credit-balances?${qs}` : '/admin/finance/credit-balances');
    },
    [router, searchParams],
  );

  if (!canViewCreditBalances(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.creditBalances.pageTitle')}
        subtitle={t('admin.finance.creditBalances.pageDesc')}
      />
      <CreditBalancesListPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        returnTo={returnTo}
      />
    </RequireAdminPermission>
  );
}
