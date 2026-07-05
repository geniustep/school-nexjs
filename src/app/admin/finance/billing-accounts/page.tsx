'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import {
  BillingAccountsListPanel,
  type BillingAccountsListFilters,
} from '@/features/admin/finance/billing-accounts-list-panel';
import type { BillingAccountKindFilter } from '@/features/admin/finance/billing-account-kind';
import {
  readBillingAccountKindFromSearchParams,
  writeBillingAccountKindSearchParam,
} from '@/features/admin/finance/billing-account-kind';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewStudentBalance } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

function readFilters(searchParams: URLSearchParams): BillingAccountsListFilters {
  const pageRaw = searchParams.get('page');
  const accountKind = readBillingAccountKindFromSearchParams(searchParams);
  return {
    search: searchParams.get('search') ?? '',
    academicYearId: searchParams.get('academic_year_id') ?? '',
    classId: searchParams.get('class_id') ?? '',
    levelId: searchParams.get('level_id') ?? '',
    hasBalance: searchParams.get('has_balance') === 'true',
    hasOverdue: searchParams.get('has_overdue') === 'true',
    accountKind,
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

const URL_KEYS: Record<keyof BillingAccountsListFilters, string> = {
  search: 'search',
  academicYearId: 'academic_year_id',
  classId: 'class_id',
  levelId: 'level_id',
  hasBalance: 'has_balance',
  hasOverdue: 'has_overdue',
  accountKind: 'account_kind',
  page: 'page',
};

export default function AdminFinanceBillingAccountsPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/billing-accounts');
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof BillingAccountsListFilters, string | number | boolean | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof BillingAccountsListFilters, string | number | boolean | null]
      >) {
        const paramKey = URL_KEYS[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) {
          params.delete(paramKey);
        } else if (key === 'hasBalance' || key === 'hasOverdue') {
          if (value === true) params.set(paramKey, 'true');
          else params.delete(paramKey);
        } else if (key === 'accountKind') {
          writeBillingAccountKindSearchParam(params, String(value) as BillingAccountKindFilter);
        } else {
          params.set(paramKey, String(value));
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/billing-accounts?${qs}` : '/admin/finance/billing-accounts');
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
        title={t('admin.finance.billingAccounts.pageTitle')}
        subtitle={t('admin.finance.billingAccounts.pageDesc')}
        actions={
          <div className="finance-page-header-actions">
            <Link href="/admin/finance/billing-accounts/data-quality" className="btn btn--ghost btn--sm">
              {t('admin.finance.billingAccounts.dataQuality.nav')}
            </Link>
          </div>
        }
      />
      <BillingAccountsListPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        returnTo={returnTo}
      />
    </RequireAdminPermission>
  );
}
