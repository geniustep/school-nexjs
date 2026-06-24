'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { normalizeBillingAccountDataQuality } from '@/lib/utils/normalize-billing-account';

export function BillingAccountsDataQualityPanel() {
  const t = useT();
  const state = useAdminResource<unknown>(endpoints.admin.financeBillingAccountsDataQuality);
  const data = useMemo(
    () => normalizeBillingAccountDataQuality(state.data),
    [state.data],
  );

  const sections = [
    {
      key: 'students_without_billing_profile',
      title: t('admin.finance.billingAccounts.dataQuality.studentsWithoutProfile'),
      items: data.students_without_billing_profile,
      count: data.counts?.students_without_billing_profile,
    },
    {
      key: 'agreements_without_payer',
      title: t('admin.finance.billingAccounts.dataQuality.agreementsWithoutPayer'),
      items: data.agreements_without_payer,
      count: data.counts?.agreements_without_payer,
    },
    {
      key: 'collections_without_payer',
      title: t('admin.finance.billingAccounts.dataQuality.collectionsWithoutPayer'),
      items: data.collections_without_payer,
      count: data.counts?.collections_without_payer,
    },
    {
      key: 'payer_conflicts',
      title: t('admin.finance.billingAccounts.dataQuality.payerConflicts'),
      items: data.payer_conflicts,
      count: data.counts?.payer_conflicts,
    },
    {
      key: 'collection_payer_mismatches',
      title: t('admin.finance.billingAccounts.dataQuality.collectionPayerMismatches'),
      items: data.collection_payer_mismatches,
      count: data.counts?.collection_payer_mismatches,
    },
    {
      key: 'unassigned_billing_account',
      title: t('admin.finance.billingAccounts.dataQuality.unassignedBillingAccount'),
      items: data.unassigned_billing_account,
      count: data.counts?.unassigned_billing_account,
    },
  ];

  const totalIssues = sections.reduce(
    (sum, section) => sum + (section.count ?? section.items.length),
    0,
  );

  return (
    <>
      <p className="muted">{t('admin.finance.billingAccounts.dataQuality.description')}</p>
      <p className="finance-billing-dq-total muted">
        {t('admin.finance.billingAccounts.dataQuality.totalIssues', {
          count: String(totalIssues),
        })}
      </p>

      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}

      {state.initialLoading ? <LoadingState label={t('common.loading')} /> : null}

      {!state.initialLoading && !state.error && totalIssues === 0 ? (
        <EmptyState
          title={t('admin.finance.billingAccounts.dataQuality.emptyTitle')}
          description={t('admin.finance.billingAccounts.dataQuality.emptyDesc')}
        />
      ) : null}

      {!state.initialLoading ? (
        <div className="finance-billing-dq-grid">
          {sections.map((section) => (
            <section key={section.key} className="card finance-billing-dq-card">
              <header className="finance-billing-dq-card__head">
                <h2>{section.title}</h2>
                <span className="finance-hub-card-badge mono">
                  {section.count ?? section.items.length}
                </span>
              </header>
              {section.items.length === 0 ? (
                <p className="muted tiny">{t('admin.finance.billingAccounts.dataQuality.sectionClear')}</p>
              ) : (
                <ul className="finance-billing-dq-list">
                  {section.items.map((item, index) => {
                    const row = item as Record<string, unknown>;
                    const studentId = row.student_id;
                    return (
                      <li key={`${section.key}-${studentId ?? index}`}>
                        {typeof studentId === 'number' ? (
                          <Link href={`/admin/students/${studentId}?tab=finance`} dir="auto">
                            {String(row.student_name ?? row.name ?? `#${studentId}`)}
                            {row.student_code ? ` (${String(row.student_code)})` : ''}
                          </Link>
                        ) : (
                          <span dir="auto">{String(row.label ?? row.reference ?? row.id ?? t('common.dash'))}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </>
  );
}
