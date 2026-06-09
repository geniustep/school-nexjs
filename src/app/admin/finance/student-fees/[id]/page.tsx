'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import { refName, studentFeeState } from '@/lib/utils/finance';
import type { Discount, Installment, StudentFee } from '@/types/finance';

export default function AdminFinanceStudentFeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const state = useAdminResource<StudentFee>(endpoints.admin.financeStudentFees(id));

  const installmentColumns: Column<Installment>[] = useMemo(
    () => [
      { key: 'name', header: t('admin.finance.installment'), render: (row) => row.name ?? row.sequence ?? t('common.dash') },
      { key: 'due', header: t('admin.finance.dueDate'), render: (row) => formatDate(row.due_date) || t('common.dash') },
      { key: 'amount', header: t('admin.finance.lineAmount'), render: (row) => <FinanceMoney amount={row.amount} /> },
      { key: 'paid', header: t('admin.finance.paidAmount'), render: (row) => <FinanceMoney amount={row.paid_amount} /> },
      {
        key: 'remaining',
        header: t('admin.finance.remainingAmount'),
        render: (row) => <FinanceMoney amount={row.remaining_amount} />,
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={row.state ?? row.status ?? 'open'} />,
      },
    ],
    [t, formatDate],
  );

  const discountColumns: Column<Discount>[] = useMemo(
    () => [
      { key: 'name', header: t('admin.finance.discount'), render: (row) => row.name ?? row.type ?? t('common.dash') },
      {
        key: 'value',
        header: t('admin.finance.discountValue'),
        render: (row) =>
          row.percent != null ? `${row.percent}%` : <FinanceMoney amount={row.amount} />,
      },
      { key: 'reason', header: t('admin.finance.discountReason'), render: (row) => row.reason ?? t('common.dash') },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={row.state ?? row.status ?? 'active'} />,
      },
      {
        key: 'date',
        header: t('admin.finance.effectiveDate'),
        render: (row) => formatDate(row.effective_date ?? row.date_from) || t('common.dash'),
      },
    ],
    [t, formatDate],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance/student-fees" className="back-link">
        ‹ {t('admin.finance.backToStudentFees')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(fee) => (
          <>
            <PageHeader
              title={refName(fee.fee_plan) ?? refName(fee.fee_type) ?? t('admin.finance.studentFeeDetail')}
              subtitle={refName(fee.student) ?? undefined}
              actions={
                fee.student_id ? (
                  <Link className="btn btn--ghost btn--sm" href={`/admin/finance/students/${fee.student_id}`}>
                    {t('admin.finance.openFinanceProfile')}
                  </Link>
                ) : undefined
              }
            />
            <div className="card">
              <dl className="detail-list">
                <div>
                  <dt>{t('academic.status')}</dt>
                  <dd>
                    <FinanceStatusBadge state={studentFeeState(fee)} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.originalAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.original_amount ?? fee.amount} currency={fee.currency} />
                  </dd>
                </div>
                {(fee.discount_amount ?? 0) > 0 && (
                  <div>
                    <dt>{t('admin.finance.discountAmount')}</dt>
                    <dd>
                      <FinanceMoney amount={fee.discount_amount} currency={fee.currency} />
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t('admin.finance.netAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.net_amount ?? fee.amount} currency={fee.currency} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.paidAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.paid_amount} currency={fee.currency} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.remainingAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={fee.remaining_amount ?? fee.balance} currency={fee.currency} />
                  </dd>
                </div>
                {fee.due_date && (
                  <div>
                    <dt>{t('admin.finance.dueDate')}</dt>
                    <dd>{formatDate(fee.due_date)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {(fee.installments?.length ?? fee.lines?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('admin.finance.installments')}</h3>
                <DataTable
                  columns={installmentColumns}
                  rows={fee.installments ?? fee.lines ?? []}
                  rowKey={(row) => row.id ?? `${row.sequence ?? 0}-${row.due_date ?? ''}`}
                />
              </section>
            )}

            {(fee.discounts?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('admin.finance.discounts')}</h3>
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
    </RequireAdminPermission>
  );
}
