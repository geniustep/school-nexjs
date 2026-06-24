'use client';

import Link from 'next/link';
import { use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { EmptyState } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import {
  BillingAccountActionsBar,
  BillingAccountActivitySection,
  BillingAccountDetailError,
  BillingAccountDetailSkeleton,
  BillingAccountStudentsSection,
  BillingAccountSummaryCards,
} from '@/features/admin/finance/billing-account-detail-sections';
import { BillingAccountCreditSection } from '@/features/admin/finance/credit-balance/credit-balance-detail-sections';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canViewStudentBalance } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import {
  billingAccountHasFinancialData,
  normalizeBillingAccountSummary,
} from '@/lib/utils/normalize-billing-account';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { ListParams } from '@/types/api';

export default function AdminFinanceBillingAccountDetailPage({
  params,
}: {
  params: Promise<{ billingPartnerId: string }>;
}) {
  const { billingPartnerId } = use(params);
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { schools, activeSchoolId } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const returnTo = sanitizeReturnTo(
    searchParams.get('returnTo'),
    '/admin/finance/billing-accounts',
  );
  const academicYearId = searchParams.get('academic_year_id') ?? '';
  const classId = searchParams.get('class_id') ?? '';
  const levelId = searchParams.get('level_id') ?? '';
  const { options: yearOptions } = useAcademicYearOptions(null);

  const query: ListParams = useMemo(
    () => ({
      academic_year_id: academicYearId || undefined,
      class_id: classId || undefined,
      level_id: levelId || undefined,
    }),
    [academicYearId, classId, levelId],
  );

  const state = useAdminResource<unknown>(
    endpoints.admin.financeBillingAccountSummary(billingPartnerId),
    query,
  );
  const detail = useMemo(() => normalizeBillingAccountSummary(state.data), [state.data]);
  const pageReturnTo = `/admin/finance/billing-accounts/${billingPartnerId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const onScopeChange = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(
      qs
        ? `/admin/finance/billing-accounts/${billingPartnerId}?${qs}`
        : `/admin/finance/billing-accounts/${billingPartnerId}`,
    );
  };

  if (!canViewStudentBalance(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  const accountName =
    detail?.billing_account.display_name ??
    detail?.billing_account.name ??
    `#${billingPartnerId}`;

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href={returnTo} className="back-link">
        ‹ {t('admin.finance.billingAccounts.backToList')}
      </Link>

      <PageHeader
        title={accountName}
        subtitle={t('admin.finance.billingAccounts.detailSubtitle')}
      />

      {state.error ? (
        <BillingAccountDetailError code={state.error.code} onRetry={state.reload} />
      ) : null}

      {state.initialLoading ? <BillingAccountDetailSkeleton /> : null}

      {detail && !state.initialLoading ? (
          <>
            <div className="finance-billing-detail-header card">
              <div className="finance-billing-detail-header__main">
                <h1 dir="auto">{accountName}</h1>
                {detail.billing_account.reference ? (
                  <p className="mono muted">{detail.billing_account.reference}</p>
                ) : null}
                <div className="finance-billing-detail-header__meta muted">
                  <span>
                    {t('admin.finance.billingAccounts.studentCountLabel', {
                      count: String(detail.summary.student_count ?? detail.students.length),
                    })}
                  </span>
                  {activeSchool ? (
                    <span dir="auto">
                      {t('admin.finance.activeSchool')}: {activeSchool.name}
                    </span>
                  ) : null}
                  <span>
                    {academicYearId
                      ? yearOptions.find((y) => String(y.id) === academicYearId)?.name ??
                        t('admin.finance.billingAccounts.selectedYear')
                      : t('admin.finance.hub.allAcademicYears')}
                  </span>
                </div>
                {detail.billing_account.phone || detail.billing_account.email ? (
                  <div className="finance-billing-detail-header__contact muted tiny">
                    {detail.billing_account.phone ? <span dir="ltr">{detail.billing_account.phone}</span> : null}
                    {detail.billing_account.email ? <span dir="ltr">{detail.billing_account.email}</span> : null}
                  </div>
                ) : null}
              </div>
              <BillingAccountActionsBar
                billingPartnerId={Number(billingPartnerId)}
                allowedActions={detail.allowed_actions}
                returnTo={pageReturnTo}
                academicYearId={academicYearId}
                account={detail.billing_account}
              />
            </div>

            <form
              className="toolbar finance-hub-filters finance-billing-detail-filters"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onScopeChange({
                  academic_year_id: String(fd.get('academic_year_id') ?? '') || null,
                  class_id: String(fd.get('class_id') ?? '').trim() || null,
                  level_id: String(fd.get('level_id') ?? '').trim() || null,
                });
              }}
            >
              <label className="finance-filter-field">
                <span className="tiny muted">{t('admin.finance.hub.filterAcademicYear')}</span>
                <select
                  className="input"
                  name="academic_year_id"
                  defaultValue={academicYearId}
                >
                  <option value="">{t('admin.finance.hub.allAcademicYears')}</option>
                  {yearOptions.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="finance-filter-field">
                <span className="tiny muted">{t('admin.finance.billingAccounts.filters.class')}</span>
                <input className="input" name="class_id" defaultValue={classId} inputMode="numeric" />
              </label>
              <label className="finance-filter-field">
                <span className="tiny muted">{t('admin.finance.billingAccounts.filters.level')}</span>
                <input className="input" name="level_id" defaultValue={levelId} inputMode="numeric" />
              </label>
              <button type="submit" className="btn btn--primary btn--sm">
                {t('admin.studentsList.applyFilters')}
              </button>
            </form>

            <BillingAccountSummaryCards summary={detail.summary} loading={false} />

            <BillingAccountCreditSection
              grossUnallocated={detail.summary.unallocated_collection_amount}
              credit={detail.summary.credit}
              currency={detail.summary.currency}
              billingPartnerId={Number(billingPartnerId)}
              returnTo={pageReturnTo}
            />

            {!billingAccountHasFinancialData(detail.summary) &&
            !detail.students.length &&
            !detail.recent_activity.length ? (
              <EmptyState
                title={t('admin.finance.billingAccounts.emptyAccountTitle')}
                description={t('admin.finance.billingAccounts.emptyAccountDesc')}
              />
            ) : null}

            <BillingAccountStudentsSection
              students={detail.students}
              returnTo={pageReturnTo}
              allowedActions={detail.allowed_actions}
            />

            <BillingAccountActivitySection
              activities={detail.recent_activity}
              billingPartnerId={Number(billingPartnerId)}
              returnTo={pageReturnTo}
            />
          </>
        ) : null}
    </RequireAdminPermission>
  );
}
