'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  BlockReasonLabel,
  CreditBalanceStatusBadge,
  SettlementStatusLabel,
} from '@/features/admin/finance/credit-balance/credit-balance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { deriveCreditLifecycleState } from '@/lib/utils/normalize-credit-balance';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { CreditBalanceAmounts, CreditBalanceApplication, CreditBalanceSource } from '@/types/finance-credit-balance';

function SummaryCard({
  label,
  amount,
  currency,
  hint,
  loading,
  tone,
}: {
  label: string;
  amount?: number | null;
  currency?: unknown;
  hint?: string;
  loading?: boolean;
  tone?: 'available' | 'blocked' | 'pending' | 'neutral';
}) {
  return (
    <div
      className={`card finance-metric-card finance-billing-summary-card${
        tone ? ` finance-credit-metric-card--${tone}` : ''
      }`}
    >
      <span className="muted">{label}</span>
      {loading ? (
        <span className="finance-skeleton finance-skeleton--metric" aria-hidden />
      ) : (
        <strong>
          <FinanceMoney amount={amount} currency={currency} />
        </strong>
      )}
      {hint ? <p className="tiny muted finance-billing-summary-hint">{hint}</p> : null}
    </div>
  );
}

export function CreditBalanceSummaryCards({
  summary,
  currency,
  loading,
}: {
  summary: CreditBalanceAmounts | null;
  currency?: unknown;
  loading?: boolean;
}) {
  const t = useT();
  return (
    <div className="finance-metrics-grid finance-billing-summary-grid">
      <SummaryCard
        label={t('admin.finance.creditBalances.metrics.gross')}
        amount={summary?.gross_unallocated_amount}
        currency={currency}
        hint={t('admin.finance.creditBalances.hints.gross')}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.creditBalances.metrics.pending')}
        amount={summary?.pending_unallocated_amount}
        currency={currency}
        hint={t('admin.finance.creditBalances.hints.pending')}
        loading={loading}
        tone="pending"
      />
      <SummaryCard
        label={t('admin.finance.creditBalances.metrics.available')}
        amount={summary?.available_credit_amount}
        currency={currency}
        hint={t('admin.finance.creditBalances.hints.available')}
        loading={loading}
        tone="available"
      />
      <SummaryCard
        label={t('admin.finance.creditBalances.metrics.blocked')}
        amount={summary?.blocked_unallocated_amount}
        currency={currency}
        hint={t('admin.finance.creditBalances.hints.blocked')}
        loading={loading}
        tone="blocked"
      />
      <SummaryCard
        label={t('admin.finance.creditBalances.metrics.applied')}
        amount={summary?.applied_credit_amount}
        currency={currency}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.creditBalances.metrics.refundable')}
        amount={summary?.refundable_credit_amount}
        currency={currency}
        hint={t('admin.finance.creditBalances.hints.refundable')}
        loading={loading}
      />
    </div>
  );
}

export function CreditBalanceSourcesSection({
  sources,
  returnTo,
  loading,
  onOpenSource,
}: {
  sources: CreditBalanceSource[];
  returnTo: string;
  loading?: boolean;
  onOpenSource: (collectionId: number) => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const columns: Column<CreditBalanceSource>[] = useMemo(
    () => [
      {
        key: 'collection',
        header: t('admin.finance.creditBalances.sources.collection'),
        render: (row) => <span className="mono">#{row.collection_id}</span>,
      },
      {
        key: 'receipt',
        header: t('admin.finance.creditBalances.sources.receipt'),
        render: (row) => (
          <span className="mono">{row.receipt_number ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) =>
          row.payment_date ? formatDate(row.payment_date) : t('common.dash'),
      },
      {
        key: 'method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'amount',
        header: t('admin.finance.creditBalances.sources.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={row.currency} />,
      },
      {
        key: 'allocated',
        header: t('admin.finance.creditBalances.sources.allocated'),
        render: (row) => (
          <FinanceMoney amount={row.allocated_amount} currency={row.currency} />
        ),
      },
      {
        key: 'unallocated',
        header: t('admin.finance.creditBalances.sources.unallocated'),
        render: (row) => (
          <FinanceMoney amount={row.unallocated_amount} currency={row.currency} />
        ),
      },
      {
        key: 'settlement',
        header: t('admin.finance.creditBalances.sources.settlement'),
        render: (row) => <SettlementStatusLabel code={row.settlement_status} />,
      },
      {
        key: 'available',
        header: t('admin.finance.creditBalances.metrics.available'),
        render: (row) => (
          <FinanceMoney amount={row.available_credit_amount} currency={row.currency} />
        ),
      },
      {
        key: 'blocked',
        header: t('admin.finance.creditBalances.metrics.blocked'),
        render: (row) => (
          <FinanceMoney amount={row.blocked_unallocated_amount} currency={row.currency} />
        ),
      },
      {
        key: 'block_reason',
        header: t('admin.finance.creditBalances.sources.blockReason'),
        render: (row) => <BlockReasonLabel code={row.block_reason} />,
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => <span dir="auto">{row.student_name ?? t('common.dash')}</span>,
      },
      {
        key: 'actions',
        header: t('admin.finance.creditBalances.columns.actions'),
        render: (row) => (
          <div className="finance-credit-source-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onOpenSource(row.collection_id)}
            >
              {t('admin.finance.creditBalances.openSourceCredit')}
            </button>
            <Link
              href={`/admin/finance/collections/${row.collection_id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.finance.creditBalances.openCollection')}
            </Link>
            {row.receipt_id ? (
              <Link
                href={`/admin/finance/receipts/${row.receipt_id}?returnTo=${encodeURIComponent(returnTo)}`}
                className="btn btn--ghost btn--sm"
              >
                {t('admin.finance.creditBalances.openReceipt')}
              </Link>
            ) : null}
          </div>
        ),
      },
    ],
    [t, formatDate, returnTo, onOpenSource],
  );

  if (loading) return <LoadingState label={t('common.loading')} />;

  if (!sources.length) {
    return <p className="muted">{t('admin.finance.creditBalances.emptySources')}</p>;
  }

  return (
    <section className="finance-billing-section">
      <h2>{t('admin.finance.creditBalances.sources.title')}</h2>
      <div className="finance-credit-sources-desktop">
        <DataTable columns={columns} rows={sources} rowKey={(row) => row.collection_id} />
      </div>
      <div className="finance-credit-sources-mobile">
        {sources.map((source) => (
          <article key={source.collection_id} className="card finance-credit-source-card">
            <div className="finance-credit-source-card__head">
              <strong className="mono">#{source.collection_id}</strong>
              <CreditBalanceStatusBadge
                state={
                  source.lifecycle_state ?? deriveCreditLifecycleState(source)
                }
              />
            </div>
            <dl className="finance-credit-source-card__metrics">
              <div>
                <dt>{t('admin.finance.creditBalances.sources.unallocated')}</dt>
                <dd>
                  <FinanceMoney
                    amount={source.unallocated_amount}
                    currency={source.currency}
                  />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.creditBalances.metrics.available')}</dt>
                <dd>
                  <FinanceMoney
                    amount={source.available_credit_amount}
                    currency={source.currency}
                  />
                </dd>
              </div>
              {source.block_reason ? (
                <div>
                  <dt>{t('admin.finance.creditBalances.sources.blockReason')}</dt>
                  <dd>
                    <BlockReasonLabel code={source.block_reason} />
                  </dd>
                </div>
              ) : null}
            </dl>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => onOpenSource(source.collection_id)}
            >
              {t('admin.finance.creditBalances.openSourceCredit')}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CreditBalanceApplicationsSection({
  applications,
  currency,
}: {
  applications: CreditBalanceApplication[];
  currency?: unknown;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (!applications.length) {
    return (
      <section className="finance-billing-section">
        <h2>{t('admin.finance.creditBalances.applicationsTitle')}</h2>
        <p className="muted">{t('admin.finance.creditBalances.noApplications')}</p>
      </section>
    );
  }

  const columns: Column<CreditBalanceApplication>[] = [
    {
      key: 'student',
      header: t('nav.students'),
      render: (row) => <span dir="auto">{row.student_name ?? t('common.dash')}</span>,
    },
    {
      key: 'service',
      header: t('admin.finance.collections.columns.service'),
      render: (row) => <span dir="auto">{row.service_name ?? t('common.dash')}</span>,
    },
    {
      key: 'amount',
      header: t('admin.finance.allocationAmount'),
      render: (row) => <FinanceMoney amount={row.amount} currency={currency} />,
    },
    {
      key: 'date',
      header: t('common.date'),
      render: (row) => (row.date ? formatDate(row.date) : t('common.dash')),
    },
    {
      key: 'reference',
      header: t('admin.finance.reference'),
      render: (row) => <span className="mono">{row.reference ?? t('common.dash')}</span>,
    },
  ];

  return (
    <section className="finance-billing-section">
      <h2>{t('admin.finance.creditBalances.applicationsTitle')}</h2>
      <DataTable
        columns={columns}
        rows={applications}
        rowKey={(row) => String(row.id ?? `${row.installment_id ?? 0}-${row.amount ?? 0}`)}
      />
    </section>
  );
}

export function BillingAccountCreditSection({
  grossUnallocated,
  credit,
  currency,
  billingPartnerId,
  returnTo,
}: {
  grossUnallocated?: number | null;
  credit?: CreditBalanceAmounts | null;
  currency?: unknown;
  billingPartnerId: number;
  returnTo: string;
}) {
  const t = useT();
  const hasCredit =
    (credit?.gross_unallocated_amount ?? grossUnallocated ?? 0) > 0 ||
    (credit?.applied_credit_amount ?? 0) > 0;

  if (!hasCredit) return null;

  return (
    <section className="finance-billing-section finance-credit-family-section">
      <div className="finance-credit-family-section__head">
        <h2>{t('admin.finance.creditBalances.familySectionTitle')}</h2>
        <Link
          href={`/admin/finance/billing-accounts/${billingPartnerId}/credit-balance?returnTo=${encodeURIComponent(returnTo)}`}
          className="btn btn--ghost btn--sm"
        >
          {t('admin.finance.creditBalances.openCreditDetails')}
        </Link>
      </div>
      <div className="finance-credit-family-metrics">
        <div>
          <span className="muted">{t('admin.finance.creditBalances.familyGross')}</span>
          <strong>
            <FinanceMoney
              amount={credit?.gross_unallocated_amount ?? grossUnallocated}
              currency={currency}
            />
          </strong>
        </div>
        <div>
          <span className="muted">{t('admin.finance.creditBalances.metrics.available')}</span>
          <strong>
            <FinanceMoney amount={credit?.available_credit_amount} currency={currency} />
          </strong>
        </div>
        <div>
          <span className="muted">{t('admin.finance.creditBalances.metrics.pending')}</span>
          <strong>
            <FinanceMoney amount={credit?.pending_unallocated_amount} currency={currency} />
          </strong>
        </div>
        <div>
          <span className="muted">{t('admin.finance.creditBalances.metrics.blocked')}</span>
          <strong>
            <FinanceMoney amount={credit?.blocked_unallocated_amount} currency={currency} />
          </strong>
        </div>
        {(credit?.applied_credit_amount ?? 0) > 0 ? (
          <div>
            <span className="muted">{t('admin.finance.creditBalances.metrics.applied')}</span>
            <strong>
              <FinanceMoney amount={credit?.applied_credit_amount} currency={currency} />
            </strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CreditBalanceDetailSkeleton() {
  return (
    <div className="finance-metrics-grid finance-billing-summary-grid" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="card finance-metric-card">
          <span className="finance-skeleton finance-skeleton--label" />
          <span className="finance-skeleton finance-skeleton--metric" />
        </div>
      ))}
    </div>
  );
}
