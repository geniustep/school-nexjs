'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import {
  InstallmentsListPanel,
  type InstallmentsListFilters,
} from '@/features/admin/finance/installments-list-panel';
import {
  installmentQuickFilterTitleKey,
  isInstallmentQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewFinanceInstallments } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

function readFilters(searchParams: URLSearchParams): InstallmentsListFilters {
  const pageRaw = searchParams.get('page');
  const page = pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1;
  return {
    quick: searchParams.get('quick') ?? '',
    search: searchParams.get('search') ?? '',
    academicYearId: searchParams.get('academic_year_id') ?? '',
    classId: searchParams.get('class_id') ?? '',
    levelId: searchParams.get('level_id') ?? '',
    studentId: searchParams.get('student_id') ?? searchParams.get('studentId') ?? '',
    billingPartnerId: searchParams.get('billing_partner_id') ?? '',
    serviceId: searchParams.get('service_ids') ?? searchParams.get('service_id') ?? '',
    dueDateFrom: searchParams.get('due_date_from') ?? '',
    dueDateTo: searchParams.get('due_date_to') ?? '',
    page,
  };
}

const URL_KEYS: Record<keyof InstallmentsListFilters, string> = {
  quick: 'quick',
  search: 'search',
  academicYearId: 'academic_year_id',
  classId: 'class_id',
  levelId: 'level_id',
  studentId: 'student_id',
  billingPartnerId: 'billing_partner_id',
  serviceId: 'service_ids',
  dueDateFrom: 'due_date_from',
  dueDateTo: 'due_date_to',
  page: 'page',
};

export default function AdminFinanceInstallmentsPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/installments');
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof InstallmentsListFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof InstallmentsListFilters, string | number | null]
      >) {
        const paramKey = URL_KEYS[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      }
      if (Object.hasOwn(updates, 'serviceId')) params.delete('service_id');
      params.delete('studentId');
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/installments?${qs}` : '/admin/finance/installments');
    },
    [router, searchParams],
  );

  const quick = isInstallmentQuickFilter(filters.quick) ? filters.quick : null;
  const headerTitle =
    quick && installmentQuickFilterTitleKey(quick)
      ? t(installmentQuickFilterTitleKey(quick)!)
      : t('admin.finance.installments.title');
  const headerSubtitle =
    quick === 'overdue_unpaid'
      ? t('admin.finance.installments.descOverdueUnpaid')
      : t('admin.finance.installments.subtitleSchoolWide');

  if (!canViewFinanceInstallments(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader title={headerTitle} subtitle={headerSubtitle} />
      <InstallmentsListPanel filters={filters} onFiltersChange={onFiltersChange} returnTo={returnTo} />
    </RequireAdminPermission>
  );
}
