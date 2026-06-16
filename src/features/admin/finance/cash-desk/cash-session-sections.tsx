'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { cashMovementTypeLabelKey } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { cashSessionCurrency } from '@/lib/utils/cash-session-currency';
import { paymentMethodLabel, refName } from '@/lib/utils/finance';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type { CashSession, CashSessionCollectionRow, CashSessionMovement } from '@/types/finance-cash-desk';

function CashMovementDirection({ direction }: { direction?: string | null }) {
  const t = useT();
  if (direction === 'in') {
    return (
      <span className="cash-desk-movement-direction cash-desk-movement-direction--in">
        {t('admin.finance.cashDesk.movements.directionIn')}
      </span>
    );
  }
  if (direction === 'out') {
    return (
      <span className="cash-desk-movement-direction cash-desk-movement-direction--out">
        {t('admin.finance.cashDesk.movements.directionOut')}
      </span>
    );
  }
  return null;
}

export function CashSessionCollectionsSection({
  session,
  returnTo,
}: {
  session: CashSession;
  returnTo?: string;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const rows = session.collections ?? [];
  const currency = cashSessionCurrency(session);

  const columns: Column<CashSessionCollectionRow>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.cashDesk.collections.number'),
        render: (row) => row.number ?? row.reference ?? `#${row.id}`,
      },
      {
        key: 'receipt',
        header: t('admin.finance.cashDesk.collections.receipt'),
        render: (row) =>
          row.receipt_id ? (
            <Link href={appendReturnTo(`/admin/finance/receipts/${row.receipt_id}`, returnTo)}>
              {row.receipt_number ?? `#${row.receipt_id}`}
            </Link>
          ) : (
            row.receipt_number ?? '—'
          ),
      },
      {
        key: 'date',
        header: t('admin.finance.cashDesk.collections.date'),
        render: (row) => {
          const date = row.date ?? row.collection_date;
          return date ? formatDate(date) : '—';
        },
      },
      {
        key: 'payer',
        header: t('admin.finance.cashDesk.collections.payer'),
        render: (row) => row.student_name ?? row.payer_name ?? refName(row.payer) ?? '—',
      },
      {
        key: 'amount',
        header: t('admin.finance.cashDesk.collections.amount'),
        render: (row) => <FinanceMoney amount={row.amount ?? null} currency={currency} />,
      },
      {
        key: 'state',
        header: t('admin.finance.cashDesk.collections.state'),
        render: (row) => row.state ?? row.status ?? '—',
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <Link
            className="btn btn--ghost btn--sm"
            href={appendReturnTo(`/admin/finance/collections/${row.id}`, returnTo)}
          >
            {t('admin.finance.cashDesk.collections.open')}
          </Link>
        ),
      },
    ],
    [currency, formatDate, returnTo, t],
  );

  return (
    <section className="card card--pad cash-desk-section">
      <div className="cash-desk-section__head">
        <h2 className="section-title">{t('admin.finance.cashDesk.collectionsTitle')}</h2>
        <span className="cash-desk-section__count">{rows.length}</span>
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      ) : (
        <p className="cash-desk-section-empty">{t('admin.finance.cashDesk.collectionsEmpty')}</p>
      )}
    </section>
  );
}

export function CashSessionMovementsSection({ session }: { session: CashSession }) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const rows = session.movements ?? [];
  const currency = cashSessionCurrency(session);

  const columns: Column<CashSessionMovement>[] = useMemo(
    () => [
      {
        key: 'type',
        header: t('admin.finance.cashDesk.movements.type'),
        render: (row) => t(cashMovementTypeLabelKey(row.type)),
      },
      {
        key: 'amount',
        header: t('admin.finance.cashDesk.movements.amount'),
        render: (row) => (
          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            <FinanceMoney amount={row.amount ?? null} currency={currency} />
            <CashMovementDirection direction={row.direction} />
          </span>
        ),
      },
      {
        key: 'reason',
        header: t('admin.finance.cashDesk.movements.reason'),
        render: (row) => row.reason ?? '—',
      },
      {
        key: 'reference',
        header: t('admin.finance.cashDesk.movements.reference'),
        render: (row) => row.reference ?? '—',
      },
      {
        key: 'at',
        header: t('admin.finance.cashDesk.movements.date'),
        render: (row) => (row.created_at ? formatDateTime(row.created_at) : '—'),
      },
      {
        key: 'state',
        header: t('admin.finance.cashDesk.movements.state'),
        render: (row) => row.state ?? '—',
      },
    ],
    [currency, formatDateTime, t],
  );

  return (
    <section className="card card--pad cash-desk-section">
      <div className="cash-desk-section__head">
        <h2 className="section-title">{t('admin.finance.cashDesk.movementsTitle')}</h2>
        <span className="cash-desk-section__count">{rows.length}</span>
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      ) : (
        <p className="cash-desk-section-empty">{t('admin.finance.cashDesk.movementsEmpty')}</p>
      )}
    </section>
  );
}
