'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChildFinanceSubnav } from '@/features/parent/finance/child-finance-subnav';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import { paymentMethodLabel, refName, studentFeeState } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { ParentChildFinanceDetails, ParentFinanceCollection, StudentFee } from '@/types/finance';

export default function ParentChildFinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const state = useResource<ParentChildFinanceDetails>(endpoints.parent.childFinance(id));

  const feeColumns: Column<StudentFee>[] = useMemo(
    () => [
      {
        key: 'plan',
        header: t('parent.finance.fee'),
        render: (row) => refName(row.fee_plan) ?? refName(row.fee_type) ?? t('common.dash'),
      },
      {
        key: 'net',
        header: t('parent.finance.net'),
        render: (row) => <FinanceMoney amount={row.net_amount ?? row.amount} currency={row.currency} />,
      },
      {
        key: 'remaining',
        header: t('parent.finance.remaining'),
        render: (row) => (
          <FinanceMoney amount={row.remaining_amount ?? row.balance} currency={row.currency} />
        ),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={studentFeeState(row)} />,
      },
    ],
    [t],
  );

  const recentCollectionColumns: Column<ParentFinanceCollection>[] = useMemo(
    () => [
      {
        key: 'ref',
        header: t('parent.finance.receiptNumber'),
        render: (row) => row.reference ?? row.receipt_number ?? row.name ?? t('common.dash'),
      },
      {
        key: 'date',
        header: t('parent.finance.collectionDate'),
        render: (row) => formatDate(row.collection_date ?? row.date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('parent.finance.amount'),
        render: (row) => <FinanceMoney amount={row.amount ?? row.total_amount} currency={row.currency} />,
      },
      {
        key: 'method',
        header: t('parent.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(String(row.payment_method ?? ''), t),
      },
    ],
    [t, formatDate],
  );

  return (
    <>
      <Link href="/parent/finance" className="back-link">
        ‹ {t('parent.finance.backToFinance')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(data) => {
          const summary = data.summary;
          const currency = summary?.currency;
          const fees = data.fees ?? [];
          const recent =
            data.recent_collections ??
            parseFinanceList<ParentFinanceCollection>(data.collections).slice(0, 5);
          const studentName = data.student?.name ?? t('parent.finance.childFinanceTitle');

          return (
            <>
              <PageHeader
                title={studentName || t('parent.finance.childFinanceTitle')}
                subtitle={
                  [data.school?.name, data.class?.name].filter(Boolean).join(' · ') || undefined
                }
              />
              <ChildFinanceSubnav id={id} />

              {summary && (
                <div className="card">
                  <h3>{t('parent.finance.summary')}</h3>
                  <dl className="detail-list">
                    <div>
                      <dt>{t('parent.finance.totalDue')}</dt>
                      <dd>
                        <FinanceMoney amount={summary.total_due} currency={currency} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('parent.finance.paid')}</dt>
                      <dd>
                        <FinanceMoney amount={summary.paid_amount} currency={currency} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('parent.finance.remaining')}</dt>
                      <dd>
                        <FinanceMoney amount={summary.remaining_amount} currency={currency} />
                      </dd>
                    </div>
                    {(summary.overdue_amount ?? 0) > 0 && (
                      <div>
                        <dt>{t('parent.finance.overdue')}</dt>
                        <dd>
                          <FinanceMoney amount={summary.overdue_amount} currency={currency} />
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {(data.payer_name || data.billing_partner?.name) && (
                <div className="card">
                  <h3>{t('parent.finance.billingPartner')}</h3>
                  <p>{data.payer_name ?? data.billing_partner?.name}</p>
                </div>
              )}

              {fees.length > 0 ? (
                <section className="card">
                  <h3>{t('parent.finance.fees')}</h3>
                  <DataTable
                    columns={feeColumns}
                    rows={fees}
                    rowKey={(row) => row.id}
                    onRowClick={(row) =>
                      router.push(`/parent/children/${id}/finance/fees/${row.id}`)
                    }
                  />
                </section>
              ) : (
                <EmptyState title={t('parent.finance.noFees')} />
              )}

              {recent.length > 0 && (
                <section className="card">
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{t('parent.finance.recentCollections')}</h3>
                    <Link href={`/parent/children/${id}/finance/collections`} className="btn btn--ghost btn--sm">
                      {t('parent.finance.allCollections')}
                    </Link>
                  </div>
                  <DataTable
                    columns={recentCollectionColumns}
                    rows={recent}
                    rowKey={(row) => row.id}
                    onRowClick={(row) =>
                      router.push(`/parent/children/${id}/finance/collections/${row.id}`)
                    }
                  />
                </section>
              )}
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
