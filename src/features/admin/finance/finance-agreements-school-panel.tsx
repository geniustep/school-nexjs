'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { ApiErrorView } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { AgreementStateBadge } from '@/features/admin/student-finance/components/agreement-state-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { refName } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { FinancialAgreement } from '@/features/admin/student-finance/types';
import type { ListParams } from '@/types/api';

export function FinanceAgreementsSchoolPanel({
  billingPartnerId,
  returnTo,
}: {
  billingPartnerId: string;
  returnTo?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const safeReturn = sanitizeReturnTo(returnTo, '/admin/finance/agreements');

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: 20,
      billing_partner_id: billingPartnerId,
    }),
    [page, billingPartnerId],
  );

  const state = useAdminResource<unknown>(endpoints.admin.financeAgreements, params);
  const rows = useMemo(() => parseFinanceList<FinancialAgreement>(state.data), [state.data]);
  const pg = state.meta?.pagination;

  const columns: Column<FinancialAgreement>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.agreements.columns.number'),
        render: (row) => (
          <span className="mono">{row.number ?? row.name ?? `#${row.id}`}</span>
        ),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => (
          <Link
            href={buildStudentFinanceLink(row.student_id, 'financial-agreement', safeReturn)}
            onClick={(e) => e.stopPropagation()}
          >
            {refName(row.student) ?? `#${row.student_id}`}
          </Link>
        ),
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => formatDate(row.agreement_date) || t('common.dash'),
      },
      {
        key: 'net',
        header: t('admin.finance.netAmount'),
        render: (row) => <FinanceMoney amount={row.net_amount} currency={row.currency} />,
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <AgreementStateBadge state={row.state} />,
      },
    ],
    [t, formatDate, safeReturn],
  );

  return (
    <>
      <BillingPartnerScopeChip
        billingPartnerId={billingPartnerId}
        onClear={() => {
          router.replace('/admin/finance/agreements');
        }}
      />
      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}

      {state.loading ? <LoadingState label={t('common.loading')} /> : null}

      {!state.loading && !state.error && rows.length === 0 ? (
        <EmptyState
          title={t('admin.finance.agreements.emptyTitle')}
          description={t('admin.finance.billingAccounts.filteredEmptyDesc')}
        />
      ) : null}

      {!state.loading && rows.length > 0 ? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) =>
              router.push(
                `/admin/finance/agreements/${row.id}?returnTo=${encodeURIComponent(safeReturn)}`,
              )
            }
          />
          {pg ? (
            <Pagination
              page={pg.page}
              pageSize={pg.page_size}
              total={pg.total}
              totalPages={pg.total_pages}
              onPage={setPage}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
