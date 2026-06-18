'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { ChequeDetailDrawer } from '@/features/admin/finance/cheque-detail-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import { EmptyState } from '@/components/states/states';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import type { WorkspaceCheque } from '../types';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import { resolveStudentFinanceOverviewMetrics } from '../utils/resolve-student-finance-overview';
import { ChequeDualBadges } from './cheque-dual-badges';
import type { StudentFinancePanelProps } from './student-finance-panel-props';

type ChequeGroup = 'pending' | 'settled' | 'rejected' | 'cancelled';

function chequeGroup(row: WorkspaceCheque): ChequeGroup {
  const lifecycle = String(row.lifecycle_state ?? row.state ?? '').toLowerCase();
  if (['bounced', 'returned_to_payer'].includes(lifecycle)) return 'rejected';
  if (lifecycle === 'cancelled' || lifecycle === 'replaced') return 'cancelled';
  if (lifecycle === 'cleared') return 'settled';
  return 'pending';
}

export function StudentFinanceChequesPanel({
  workspace,
  financialOverview,
  onRefresh,
}: StudentFinancePanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const [selectedChequeId, setSelectedChequeId] = useState<number | null>(null);
  const currency = resolveStudentFinanceCurrency({
    financialOverview,
    workspaceSummary: workspace?.summary,
  });
  const metrics = resolveStudentFinanceOverviewMetrics(financialOverview);

  const cheques = workspace?.recent_cheques ?? [];
  const pendingFromList = cheques
    .filter((row) => chequeGroup(row) === 'pending')
    .reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const columns: Column<WorkspaceCheque>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.student360.financeOps.cheques.number'),
        render: (row) => row.number ?? row.name ?? t('common.dash'),
      },
      {
        key: 'bank',
        header: t('admin.student360.financeOps.cheques.bank'),
        render: (row) => row.bank_name ?? refName(row.bank) ?? t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.student360.financeOps.cheques.amount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency} />,
      },
      {
        key: 'received',
        header: t('admin.student360.financeOps.cheques.received'),
        render: (row) => formatDate(row.received_date ?? row.date_received),
      },
      {
        key: 'due',
        header: t('admin.student360.financeOps.cheques.due'),
        render: (row) => formatDate(row.due_date),
      },
      {
        key: 'status',
        header: t('admin.student360.financeOps.cheques.status'),
        render: (row) => (
          <ChequeDualBadges
            lifecycleState={row.lifecycle_state ?? row.state ?? 'draft'}
            maturityStatus={row.maturity_status}
          />
        ),
      },
    ],
    [t, formatDate, currency],
  );

  const grouped = useMemo(() => {
    const groups: Record<ChequeGroup, WorkspaceCheque[]> = {
      pending: [],
      settled: [],
      rejected: [],
      cancelled: [],
    };
    for (const row of cheques) {
      groups[chequeGroup(row)].push(row);
    }
    return groups;
  }, [cheques]);

  const groupOrder: ChequeGroup[] = ['pending', 'settled', 'rejected', 'cancelled'];

  if (!cheques.length) {
    return (
      <EmptyState
        title={t('admin.student360.financeWorkspace.cheques.emptyTitle')}
        description={t('admin.student360.financeWorkspace.cheques.emptyDescription')}
      />
    );
  }

  return (
    <>
      {(metrics?.cheque_pending_total ?? 0) > 0 ? (
        <Card className="student-finance-section student-finance-cheques-summary">
          <Student360SectionHeader title={t('admin.student360.financeWorkspace.cheques.summaryTitle')} />
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.student360.financeWorkspace.executive.chequePendingTotal')}</dt>
              <dd>
                <FinanceMoney
                  amount={metrics?.cheque_pending_total ?? pendingFromList}
                  currency={currency}
                />
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.financeWorkspace.executive.chequePendingAllocated')}</dt>
              <dd>
                <FinanceMoney amount={metrics?.cheque_pending_allocated} currency={currency} />
              </dd>
            </div>
            {(metrics?.cheque_pending_unallocated ?? 0) > 0 ? (
              <div>
                <dt>{t('admin.student360.financeWorkspace.executive.chequePendingUnallocated')}</dt>
                <dd>
                  <FinanceMoney amount={metrics?.cheque_pending_unallocated} currency={currency} />
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>
      ) : null}
      {groupOrder.map((group) => {
        const rows = grouped[group];
        if (!rows.length) return null;
        return (
          <Card key={group} className="student-finance-section">
            <Student360SectionHeader title={t(`admin.student360.financeWorkspace.cheques.groups.${group}`)} />
            <div className="student-finance-table-wrap">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelectedChequeId(row.id)}
              />
            </div>
          </Card>
        );
      })}

      <ChequeDetailDrawer
        open={selectedChequeId != null}
        chequeId={selectedChequeId}
        onClose={() => setSelectedChequeId(null)}
        onChanged={onRefresh}
      />
    </>
  );
}
