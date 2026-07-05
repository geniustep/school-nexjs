'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { EmptyState } from '@/components/states/states';
import { IconUsers, IconBuilding, IconGraduationCap } from '@/components/icons/admin-icons';
import {
  BillingAccountActionsBar,
  BillingAccountActivitySection,
  BillingAccountDetailError,
  BillingAccountDetailSkeleton,
  BillingAccountStudentsSection,
  BillingAccountSummaryCards,
} from '@/features/admin/finance/billing-account-detail-sections';
import { BillingAccountCreditSection } from '@/features/admin/finance/credit-balance/credit-balance-detail-sections';
import { BillingAccountMembersSection } from '@/features/admin/finance/billing-membership/billing-account-members-section';
import { FamilyCollectionDrawer } from '@/features/admin/finance/family-collection-drawer';
import {
  billingAccountKindBadgeClass,
  billingAccountKindLabelKey,
  resolveBillingAccountKind,
} from '@/features/admin/finance/billing-account-kind';
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
import {
  familyCollectQueryParamKeys,
  parseFamilyCollectQuery,
} from '@/features/admin/finance/family-collect-query';
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
  const [familyDrawerOpen, setFamilyDrawerOpen] = useState(false);

  const accountKind = resolveBillingAccountKind(
    detail?.summary.student_count ?? detail?.students.length,
  );

  const familyCollectQuery = useMemo(
    () => parseFamilyCollectQuery(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (searchParams.get('family_collect') === '1' && accountKind === 'family') {
      setFamilyDrawerOpen(true);
    }
  }, [searchParams, accountKind]);

  const clearFamilyCollectParam = () => {
    if (!searchParams.get('family_collect')) return;
    const params = new URLSearchParams(searchParams.toString());
    for (const key of familyCollectQueryParamKeys()) {
      params.delete(key);
    }
    const qs = params.toString();
    router.replace(
      qs
        ? `/admin/finance/billing-accounts/${billingPartnerId}?${qs}`
        : `/admin/finance/billing-accounts/${billingPartnerId}`,
    );
  };

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

  const detailSubtitleKey =
    accountKind === 'family'
      ? 'admin.finance.billingAccounts.detailFamilySubtitle'
      : accountKind === 'individual'
        ? 'admin.finance.billingAccounts.detailIndividualSubtitle'
        : 'admin.finance.billingAccounts.detailEmptySubtitle';

  const detailTitleKey =
    accountKind === 'family'
      ? 'admin.finance.billingAccounts.detailFamilyTitle'
      : accountKind === 'individual'
        ? 'admin.finance.billingAccounts.detailIndividualTitle'
        : 'admin.finance.billingAccounts.detailEmptyTitle';

  const accountInitials = getAccountInitials(accountName);
  const studentCount = detail
    ? detail.summary.student_count ?? detail.students.length
    : 0;
  const selectedYearLabel = academicYearId
    ? yearOptions.find((y) => String(y.id) === academicYearId)?.name ??
      t('admin.finance.billingAccounts.selectedYear')
    : t('admin.finance.hub.allAcademicYears');

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="finance-billing-detail-page">
        <Link href={returnTo} className="back-link">
          ‹ {t('admin.finance.billingAccounts.backToList')}
        </Link>

        {state.error ? (
          <BillingAccountDetailError code={state.error.code} onRetry={state.reload} />
        ) : null}

        {state.initialLoading ? <BillingAccountDetailSkeleton /> : null}

        {detail && !state.initialLoading ? (
          <>
            <header className="finance-billing-hero card">
              <div className="finance-billing-hero__main">
                <span className="finance-billing-hero__avatar" aria-hidden>
                  {accountInitials}
                </span>
                <div className="finance-billing-hero__identity">
                  <p className="finance-billing-hero__eyebrow">{t(detailSubtitleKey)}</p>
                  <h1 className="finance-billing-hero__title" dir="auto">
                    {t(detailTitleKey)}
                    <span className={billingAccountKindBadgeClass(accountKind)}>
                      {t(billingAccountKindLabelKey(accountKind))}
                    </span>
                  </h1>
                  <p className="finance-billing-hero__reference" dir="auto">
                    {accountName}
                  </p>
                  {detail.billing_account.reference ? (
                    <p className="finance-billing-hero__reference mono">
                      {detail.billing_account.reference}
                    </p>
                  ) : null}
                  <div className="finance-billing-hero__meta">
                    <span className="finance-billing-hero__chip">
                      <IconUsers size={14} />
                      {t('admin.finance.billingAccounts.studentCountLabel', {
                        count: String(studentCount),
                      })}
                    </span>
                    {activeSchool ? (
                      <span className="finance-billing-hero__chip" dir="auto">
                        <IconBuilding size={14} />
                        {activeSchool.name}
                      </span>
                    ) : null}
                    <span className="finance-billing-hero__chip">
                      <IconGraduationCap size={14} />
                      {selectedYearLabel}
                    </span>
                  </div>
                  {detail.billing_account.phone || detail.billing_account.email ? (
                    <div className="finance-billing-hero__contact">
                      {detail.billing_account.phone ? (
                        <a
                          className="finance-billing-hero__contact-link mono"
                          href={`tel:${detail.billing_account.phone}`}
                          dir="ltr"
                        >
                          {detail.billing_account.phone}
                        </a>
                      ) : null}
                      {detail.billing_account.email ? (
                        <a
                          className="finance-billing-hero__contact-link"
                          href={`mailto:${detail.billing_account.email}`}
                          dir="ltr"
                        >
                          {detail.billing_account.email}
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <BillingAccountActionsBar
                billingPartnerId={Number(billingPartnerId)}
                allowedActions={detail.allowed_actions}
                returnTo={pageReturnTo}
                academicYearId={academicYearId}
                account={detail.billing_account}
                studentCount={studentCount}
                onFamilyCollect={
                  accountKind === 'family'
                    ? () => setFamilyDrawerOpen(true)
                    : undefined
                }
              />
            </header>

            {accountKind === 'family' ? (
              <div className="finance-billing-kind-notice finance-billing-kind-notice--family" role="status">
                <p>{t('admin.finance.billingAccounts.familyNotice')}</p>
              </div>
            ) : null}

            {accountKind === 'empty' ? (
              <div className="finance-billing-kind-notice finance-billing-kind-notice--warning" role="alert">
                <p>{t('admin.finance.billingAccounts.noStudentsWarning')}</p>
              </div>
            ) : null}

            <form
              className="finance-billing-filters card"
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
              <label className="finance-billing-filters__field">
                <span className="finance-billing-filters__label">
                  {t('admin.finance.hub.filterAcademicYear')}
                </span>
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
              <label className="finance-billing-filters__field">
                <span className="finance-billing-filters__label">
                  {t('admin.finance.billingAccounts.filters.class')}
                </span>
                <input className="input" name="class_id" defaultValue={classId} inputMode="numeric" />
              </label>
              <label className="finance-billing-filters__field">
                <span className="finance-billing-filters__label">
                  {t('admin.finance.billingAccounts.filters.level')}
                </span>
                <input className="input" name="level_id" defaultValue={levelId} inputMode="numeric" />
              </label>
              <button type="submit" className="btn btn--primary finance-billing-filters__submit">
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

            <BillingAccountMembersSection
              billingPartnerId={Number(billingPartnerId)}
              academicYearId={academicYearId ? Number(academicYearId) : null}
              onMembershipChanged={state.reload}
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

            <FamilyCollectionDrawer
              open={familyDrawerOpen}
              familyId={Number(billingPartnerId)}
              accountName={accountName}
              suggestedAmount={familyCollectQuery.suggestedAmount}
              source={familyCollectQuery.source}
              currency={detail.summary.currency}
              onClose={() => {
                setFamilyDrawerOpen(false);
                clearFamilyCollectParam();
              }}
              onSuccess={() => {
                state.reload();
              }}
            />
          </>
        ) : null}
      </div>
    </RequireAdminPermission>
  );
}

function getAccountInitials(name: string): string {
  const cleaned = name.replace(/^#/, '').trim();
  if (!cleaned) return '#';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
