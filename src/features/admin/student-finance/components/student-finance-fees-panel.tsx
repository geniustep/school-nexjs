'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { studentFeeState } from '@/lib/utils/finance';
import type { StudentFee } from '@/types/finance';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { useStudentFinanceFees } from '../hooks/use-student-finance-fees';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import { resolveDraftAgreementPresentation } from '../utils/resolve-draft-agreement-presentation';
import { resolveServiceDisplayName } from '../utils/reference-labels';
import type { StudentFinancePanelProps } from './student-finance-panel-props';
import type { FinancialAgreementLine } from '../types';

function draftAgreementLineLabel(
  t: (key: string) => string,
  line: FinancialAgreementLine,
): string {
  return resolveServiceDisplayName(t, line.service) || line.service?.name || t('common.dash');
}

function draftAgreementLineAmount(
  t: (key: string) => string,
  line: FinancialAgreementLine,
  currency: string | null | undefined,
): ReactNode {
  const net = line.net_amount ?? line.gross_amount;
  const hasDiscount = (line.discount_amount ?? 0) > 0 || line.net_amount !== line.gross_amount;
  if (hasDiscount && net != null && line.gross_amount != null && net < line.gross_amount) {
    return t('admin.student360.financeWorkspace.draftAgreement.lineAfterDiscount');
  }
  const count = line.quantity ?? 1;
  const pricingUnit = line.pricing_unit ?? '';
  if (count > 1 || pricingUnit === 'month') {
    return (
      <>
        <FinanceMoney amount={net} currency={currency ?? undefined} />{' '}
        {t('admin.student360.financeWorkspace.draftAgreement.perMonth')}
      </>
    );
  }
  return <FinanceMoney amount={net} currency={currency ?? undefined} />;
}

function feeServiceName(fee: StudentFee): string {
  if (fee.fee_type_name) return fee.fee_type_name;
  if (fee.service && typeof fee.service === 'object' && 'name' in fee.service) {
    return String(fee.service.name ?? '');
  }
  return fee.name ?? '—';
}

function feeUnitAmount(fee: StudentFee & { installment_count?: number }): number | null {
  const count = fee.installment_count ?? fee.installments?.length ?? fee.lines?.length;
  if (!count || count <= 0) return fee.original_amount ?? fee.net_amount ?? fee.amount ?? null;
  const total = fee.original_amount ?? fee.net_amount ?? fee.amount;
  if (total == null) return null;
  return total / count;
}

export function StudentFinanceFeesPanel({
  studentId,
  effectiveYearId,
  financialOverview,
  workspace,
  financeRefreshSignal = 0,
}: StudentFinancePanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const currency = resolveStudentFinanceCurrency({ financialOverview });
  const draftPresentation = useMemo(
    () =>
      resolveDraftAgreementPresentation({
        financialOverview,
        workspaceAgreement: workspace?.current_agreement ?? null,
      }),
    [financialOverview, workspace?.current_agreement],
  );
  const draftLines = workspace?.current_agreement?.lines ?? [];

  const feesState = useStudentFinanceFees(
    studentId,
    { page, page_size: 20, academic_year_id: Number(effectiveYearId) },
    !!effectiveYearId,
    financeRefreshSignal,
  );

  const columns: Column<StudentFee>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.student360.financeWorkspace.fees.columns.name'),
        render: (row) => <span dir="auto">{feeServiceName(row)}</span>,
      },
      {
        key: 'pricing',
        header: t('admin.student360.financeWorkspace.fees.columns.pricingMethod'),
        render: (row) => {
          const count = (row as StudentFee & { installment_count?: number }).installment_count ?? 1;
          const unit = feeUnitAmount(row as StudentFee & { installment_count?: number });
          if (count > 1) {
            return t('admin.student360.financeWorkspace.fees.monthlyUnit', {
              amount: unit != null ? String(unit) : '—',
            });
          }
          return t('admin.student360.financeWorkspace.fees.oneTimeAmount');
        },
      },
      {
        key: 'unit',
        header: t('admin.student360.financeWorkspace.fees.columns.cycleValue'),
        render: (row) => {
          const count = (row as StudentFee & { installment_count?: number }).installment_count ?? 1;
          const unit = feeUnitAmount(row as StudentFee & { installment_count?: number });
          if (count > 1) {
            return <FinanceMoney amount={unit} currency={currency} />;
          }
          return <FinanceMoney amount={row.original_amount ?? row.net_amount} currency={currency} />;
        },
      },
      {
        key: 'cycles',
        header: t('admin.student360.financeWorkspace.fees.columns.cycleCount'),
        render: (row) => (row as StudentFee & { installment_count?: number }).installment_count ?? 1,
      },
      {
        key: 'applied',
        header: t('admin.student360.financeWorkspace.fees.columns.appliedTotal'),
        render: (row) => (
          <FinanceMoney amount={row.original_amount ?? row.net_amount ?? row.amount} currency={currency} />
        ),
      },
      {
        key: 'paid',
        header: t('admin.student360.financeWorkspace.fees.columns.paid'),
        render: (row) => (
          <FinanceMoney
            amount={(row as StudentFee & { confirmed_paid_amount?: number }).confirmed_paid_amount ?? row.paid_amount}
            currency={currency}
          />
        ),
      },
      {
        key: 'remaining',
        header: t('admin.student360.financeWorkspace.fees.columns.remaining'),
        render: (row) => <FinanceMoney amount={row.remaining_amount ?? row.balance_amount} currency={currency} />,
      },
      {
        key: 'next_due',
        header: t('admin.student360.financeWorkspace.fees.columns.nextDue'),
        render: (row) => formatDate(row.next_due_date ?? row.due_date) || t('common.dash'),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={studentFeeState(row)} />,
      },
    ],
    [t, formatDate, currency],
  );

  return (
    <Card className="student-finance-section">
      <Student360SectionHeader
        title={t('admin.student360.financeWorkspace.tabs.fees')}
        description={t('admin.student360.financeWorkspace.fees.description')}
      />
      {feesState.initialLoading ? <StudentSectionSkeleton rows={5} /> : null}
      {feesState.error ? <ApiErrorView error={feesState.error} onRetry={feesState.reload} /> : null}
      {!feesState.initialLoading && !feesState.error && feesState.data.length === 0 ? (
        draftPresentation.hasDraftAgreement && draftLines.length > 0 ? (
          <div className="student-finance-draft-fees">
            <p className="student-finance-draft-fees__intro">
              {t('admin.student360.financeWorkspace.draftAgreement.feesIntro')}
            </p>
            <ul className="student-finance-draft-fees__list">
              {draftLines.map((line) => (
                <li key={line.id ?? `${line.service_id}-${line.tariff_id ?? 0}`}>
                  <span dir="auto">{draftAgreementLineLabel(t, line)}</span>
                  <span> — </span>
                  <span>{draftAgreementLineAmount(t, line, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState title={t('admin.student360.financeWorkspace.fees.emptyTitle')} />
        )
      ) : null}
      {!feesState.error && feesState.data.length > 0 ? (
        <>
          <div className="student-finance-table-wrap">
            <DataTable
              columns={columns}
              rows={feesState.data}
              rowKey={(row) => row.id}
              onRowClick={(row) => {
                window.location.assign(`/admin/finance/student-fees/${row.id}`);
              }}
            />
          </div>
          {feesState.data.length >= 20 ? (
            <Pagination page={page} totalPages={page + 1} total={page * 20} onPage={setPage} />
          ) : null}
        </>
      ) : null}
      <p className="tiny muted student-finance-fees-footnote">
        <Link href={`/admin/finance/students/${studentId}`}>{t('admin.student360.financeWorkspace.openFinanceProfile')}</Link>
      </p>
    </Card>
  );
}
