'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ResourceView } from '@/components/states/resource';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChildFinanceSubnav } from '@/features/parent/finance/child-finance-subnav';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import { installmentIsOverdue, refName, studentFeeState } from '@/lib/utils/finance';
import type { FinanceDiscount, FinanceInstallment, StudentFee } from '@/types/finance';

export default function ParentChildFinanceFeePage({
  params,
}: {
  params: Promise<{ id: string; feeId: string }>;
}) {
  const { id, feeId } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource<StudentFee>(endpoints.parent.childFinanceFee(id, feeId));

  const installmentColumns: Column<FinanceInstallment>[] = useMemo(
    () => [
      { key: 'name', header: t('parent.finance.installment'), render: (row) => row.name ?? row.sequence ?? t('common.dash') },
      { key: 'due', header: t('parent.finance.dueDate'), render: (row) => formatDate(row.due_date) || t('common.dash') },
      { key: 'amount', header: t('parent.finance.amount'), render: (row) => <FinanceMoney amount={row.amount} currency={state.data?.currency} /> },
      { key: 'paid', header: t('parent.finance.paid'), render: (row) => <FinanceMoney amount={row.paid_amount} currency={state.data?.currency} /> },
      {
        key: 'remaining',
        header: t('parent.finance.remaining'),
        render: (row) => <FinanceMoney amount={row.remaining_amount} currency={state.data?.currency} />,
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={row.state ?? row.status ?? 'open'} />,
      },
      {
        key: 'overdue',
        header: t('parent.finance.overdue'),
        render: (row) => (installmentIsOverdue(row) ? t('admin.finance.states.overdue') : t('common.dash')),
      },
    ],
    [t, formatDate, state.data?.currency],
  );

  const discountColumns: Column<FinanceDiscount>[] = useMemo(
    () => [
      { key: 'name', header: t('parent.finance.discount'), render: (row) => row.name ?? row.type ?? t('common.dash') },
      {
        key: 'value',
        header: t('parent.finance.discountValue'),
        render: (row) =>
          row.percent != null ? `${row.percent}%` : <FinanceMoney amount={row.amount} currency={state.data?.currency} />,
      },
      {
        key: 'date',
        header: t('parent.finance.effectiveDate'),
        render: (row) => formatDate(row.effective_date ?? row.date_from) || t('common.dash'),
      },
    ],
    [t, formatDate, state.data?.currency],
  );

  return (
    <>
      <Link href={`/parent/children/${id}/finance`} className="back-link">
        ‹ {t('parent.finance.backToChildFinance')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(fee) => (
          <>
            <PageHeader
              title={refName(fee.fee_plan) ?? refName(fee.fee_type) ?? t('parent.finance.feeDetail')}
            />
            <ChildFinanceSubnav id={id} />
            <div className="card">
              <dl className="detail-list">
                <div>
                  <dt>{t('academic.status')}</dt>
                  <dd>
                    <FinanceStatusBadge state={studentFeeState(fee)} />
                  </dd>
                </div>
                <div>
                  <dt>{t('parent.finance.originalAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.original_amount ?? fee.amount} currency={fee.currency} />
                  </dd>
                </div>
                {(fee.discount_amount ?? 0) > 0 && (
                  <div>
                    <dt>{t('parent.finance.discount')}</dt>
                    <dd>
                      <FinanceMoney amount={fee.discount_amount} currency={fee.currency} />
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t('parent.finance.net')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.net_amount ?? fee.amount} currency={fee.currency} />
                  </dd>
                </div>
                <div>
                  <dt>{t('parent.finance.paid')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.paid_amount} currency={fee.currency} />
                  </dd>
                </div>
                <div>
                  <dt>{t('parent.finance.remaining')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.remaining_amount ?? fee.balance} currency={fee.currency} />
                  </dd>
                </div>
              </dl>
            </div>

            {(fee.installments?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('parent.finance.installments')}</h3>
                <DataTable
                  columns={installmentColumns}
                  rows={fee.installments ?? []}
                  rowKey={(row) => row.id ?? `${row.sequence ?? 0}-${row.due_date ?? ''}`}
                />
              </section>
            )}

            {(fee.discounts?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('parent.finance.discounts')}</h3>
                <DataTable
                  columns={discountColumns}
                  rows={fee.discounts ?? []}
                  rowKey={(row) => row.id ?? `${row.name ?? 'd'}-${row.effective_date ?? ''}`}
                />
              </section>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
