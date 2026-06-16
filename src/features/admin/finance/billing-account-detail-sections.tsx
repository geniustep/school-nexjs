'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  billingAccountErrorMessageKey,
  buildBillingAccountCollectHref,
  buildBillingAccountDrillDownHref,
} from '@/lib/utils/normalize-billing-account';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import type {
  BillingAccountActivity,
  BillingAccountAllowedAction,
  BillingAccountPartner,
  BillingAccountStudentRow,
  BillingAccountSummaryMetrics,
} from '@/types/finance-billing-account';

function hasAction(actions: BillingAccountAllowedAction[], action: BillingAccountAllowedAction): boolean {
  return actions.includes(action);
}

function SummaryCard({
  label,
  amount,
  currency,
  hint,
  loading,
}: {
  label: string;
  amount?: number | null;
  currency?: unknown;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="card finance-metric-card finance-billing-summary-card">
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

export function BillingAccountSummaryCards({
  summary,
  currency,
  loading,
}: {
  summary: BillingAccountSummaryMetrics | null;
  currency?: unknown;
  loading?: boolean;
}) {
  const t = useT();
  return (
    <div className="finance-metrics-grid finance-billing-summary-grid">
      <SummaryCard
        label={t('admin.finance.billingAccounts.metrics.totalDue')}
        amount={summary?.total_due}
        currency={currency ?? summary?.currency}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.billingAccounts.metrics.confirmedPaid')}
        amount={summary?.confirmed_paid}
        currency={currency ?? summary?.currency}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.billingAccounts.metrics.remaining')}
        amount={summary?.total_remaining}
        currency={currency ?? summary?.currency}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.billingAccounts.metrics.overdue')}
        amount={summary?.total_overdue}
        currency={currency ?? summary?.currency}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.billingAccounts.metrics.pendingCheque')}
        amount={summary?.pending_cheque_amount}
        currency={currency ?? summary?.currency}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.billingAccounts.metrics.confirmedCollections')}
        amount={summary?.confirmed_collection_amount}
        currency={currency ?? summary?.currency}
        hint={t('admin.finance.billingAccounts.metrics.collectionsHint')}
        loading={loading}
      />
      <SummaryCard
        label={t('admin.finance.billingAccounts.metrics.unallocated')}
        amount={summary?.unallocated_collection_amount}
        currency={currency ?? summary?.currency}
        hint={t('admin.finance.billingAccounts.metrics.unallocatedHint')}
        loading={loading}
      />
    </div>
  );
}

export function BillingAccountStudentsSection({
  students,
  returnTo,
}: {
  students: BillingAccountStudentRow[];
  returnTo: string;
  allowedActions?: BillingAccountAllowedAction[];
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const columns: Column<BillingAccountStudentRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('nav.students'),
        render: (row) => (
          <Link
            href={buildStudentFinanceLink(row.student_id, 'finance', returnTo)}
            onClick={(e) => e.stopPropagation()}
            dir="auto"
          >
            {row.student_name ?? `#${row.student_id}`}
          </Link>
        ),
      },
      {
        key: 'code',
        header: t('admin.finance.billingAccounts.students.code'),
        render: (row) => <span className="mono">{row.student_code ?? t('common.dash')}</span>,
      },
      {
        key: 'class',
        header: t('admin.finance.billingAccounts.students.class'),
        render: (row) => <span dir="auto">{row.class_name ?? t('common.dash')}</span>,
      },
      {
        key: 'level',
        header: t('admin.finance.billingAccounts.students.level'),
        render: (row) => <span dir="auto">{row.level_name ?? t('common.dash')}</span>,
      },
      {
        key: 'agreements',
        header: t('admin.finance.billingAccounts.students.activeAgreements'),
        render: (row) => (
          <span className="mono">{row.active_agreements_count ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'due',
        header: t('admin.finance.billingAccounts.metrics.totalDue'),
        render: (row) => <FinanceMoney amount={row.total_due} currency={row.currency} />,
      },
      {
        key: 'paid',
        header: t('admin.finance.billingAccounts.metrics.confirmedPaid'),
        render: (row) => <FinanceMoney amount={row.confirmed_paid} currency={row.currency} />,
      },
      {
        key: 'remaining',
        header: t('admin.finance.billingAccounts.metrics.remaining'),
        render: (row) => <FinanceMoney amount={row.total_remaining} currency={row.currency} />,
      },
      {
        key: 'overdue',
        header: t('admin.finance.billingAccounts.metrics.overdue'),
        render: (row) => <FinanceMoney amount={row.total_overdue} currency={row.currency} />,
      },
      {
        key: 'cheque',
        header: t('admin.finance.billingAccounts.metrics.pendingCheque'),
        render: (row) => (
          <FinanceMoney amount={row.pending_cheque_amount} currency={row.currency} />
        ),
      },
      {
        key: 'next_due',
        header: t('admin.finance.billingAccounts.students.nextInstallment'),
        render: (row) =>
          row.next_installment_date ? formatDate(row.next_installment_date) : t('common.dash'),
      },
      {
        key: 'receipts',
        header: t('admin.finance.billingAccounts.students.receiptCount'),
        render: (row) => <span className="mono">{row.receipt_count ?? t('common.dash')}</span>,
      },
      {
        key: 'actions',
        header: t('admin.finance.billingAccounts.columns.actions'),
        render: (row) => (
          <Link
            href={buildStudentFinanceLink(row.student_id, 'finance', returnTo)}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.finance.billingAccounts.openStudentFile')}
          </Link>
        ),
      },
    ],
    [t, formatDate, returnTo],
  );

  if (!students.length) {
    return (
      <section className="finance-billing-section">
        <h2>{t('admin.finance.billingAccounts.students.title')}</h2>
        <EmptyState
          title={t('admin.finance.billingAccounts.students.emptyTitle')}
          description={t('admin.finance.billingAccounts.students.emptyDesc')}
        />
      </section>
    );
  }

  return (
    <section className="finance-billing-section">
      <h2>{t('admin.finance.billingAccounts.students.title')}</h2>
      <div className="finance-billing-students-desktop">
        <DataTable columns={columns} rows={students} rowKey={(row) => row.student_id} />
      </div>
      <div className="finance-billing-students-mobile">
        {students.map((student) => (
          <article key={student.student_id} className="card finance-billing-student-card">
            <div className="finance-billing-student-card__head">
              <strong dir="auto">{student.student_name ?? `#${student.student_id}`}</strong>
              <span className="mono tiny muted">{student.student_code ?? t('common.dash')}</span>
            </div>
            <dl className="finance-billing-student-card__metrics">
              <div>
                <dt>{t('admin.finance.billingAccounts.metrics.remaining')}</dt>
                <dd>
                  <FinanceMoney amount={student.total_remaining} currency={student.currency} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.metrics.overdue')}</dt>
                <dd>
                  <FinanceMoney amount={student.total_overdue} currency={student.currency} />
                </dd>
              </div>
            </dl>
            <Link
              href={buildStudentFinanceLink(student.student_id, 'finance', returnTo)}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.finance.billingAccounts.openStudentFile')}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function resolveActivityHref(
  activity: BillingAccountActivity,
  billingPartnerId: number,
  returnTo: string,
): string | null {
  if (activity.collection_id) {
    return `/admin/finance/collections/${activity.collection_id}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  if (activity.receipt_id) {
    return `/admin/finance/receipts/${activity.receipt_id}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  if (activity.cheque_id) {
    return `/admin/finance/cheques?search=${activity.cheque_id}&billing_partner_id=${billingPartnerId}&returnTo=${encodeURIComponent(returnTo)}`;
  }
  if (activity.installment_id && activity.student_id) {
    return buildStudentFinanceLink(activity.student_id, 'finance', returnTo);
  }
  return null;
}

export function BillingAccountActivitySection({
  activities,
  billingPartnerId,
  returnTo,
}: {
  activities: BillingAccountActivity[];
  billingPartnerId: number;
  returnTo: string;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (!activities.length) {
    return (
      <section className="finance-billing-section">
        <h2>{t('admin.finance.billingAccounts.activity.title')}</h2>
        <p className="muted">{t('admin.finance.billingAccounts.activity.empty')}</p>
      </section>
    );
  }

  return (
    <section className="finance-billing-section">
      <h2>{t('admin.finance.billingAccounts.activity.title')}</h2>
      <ul className="finance-billing-activity-list">
        {activities.map((activity, index) => {
          const href = resolveActivityHref(activity, billingPartnerId, returnTo);
          const typeLabel =
            activity.label ??
            t(`admin.finance.billingAccounts.activity.types.${activity.activity_type ?? activity.type ?? 'generic'}`);
          const content = (
            <>
              <div className="finance-billing-activity-list__main">
                <strong dir="auto">{typeLabel}</strong>
                {activity.amount != null ? (
                  <FinanceMoney amount={activity.amount} currency={activity.currency} />
                ) : null}
              </div>
              <div className="finance-billing-activity-list__meta muted tiny">
                <span>{activity.date ? formatDate(activity.date) : t('common.dash')}</span>
                {activity.student_name ? <span dir="auto">{activity.student_name}</span> : null}
                {activity.reference ? <span className="mono">{activity.reference}</span> : null}
                {activity.state_label ?? activity.state ? (
                  <span>{activity.state_label ?? activity.state}</span>
                ) : null}
              </div>
            </>
          );
          return (
            <li key={`${activity.id ?? index}-${activity.reference ?? ''}`}>
              {href ? (
                <Link href={href} className="finance-billing-activity-item">
                  {content}
                </Link>
              ) : (
                <div className="finance-billing-activity-item">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function BillingAccountActionsBar({
  billingPartnerId,
  allowedActions,
  returnTo,
  academicYearId,
  account,
}: {
  billingPartnerId: number;
  allowedActions: BillingAccountAllowedAction[];
  returnTo: string;
  academicYearId?: string;
  account: BillingAccountPartner;
}) {
  const t = useT();
  const links = [
    hasAction(allowedActions, 'view_agreements')
      ? {
          href: buildBillingAccountDrillDownHref('agreements', billingPartnerId, returnTo),
          label: t('admin.finance.billingAccounts.actions.agreements'),
        }
      : null,
    hasAction(allowedActions, 'view_summary')
      ? {
          href: buildBillingAccountDrillDownHref('installments', billingPartnerId, returnTo),
          label: t('admin.finance.billingAccounts.actions.installments'),
        }
      : null,
    hasAction(allowedActions, 'view_collections')
      ? {
          href: buildBillingAccountDrillDownHref('collections', billingPartnerId, returnTo),
          label: t('admin.finance.billingAccounts.actions.collections'),
        }
      : null,
    hasAction(allowedActions, 'view_receipts')
      ? {
          href: buildBillingAccountDrillDownHref('receipts', billingPartnerId, returnTo),
          label: t('admin.finance.billingAccounts.actions.receipts'),
        }
      : null,
    hasAction(allowedActions, 'view_cheques')
      ? {
          href: buildBillingAccountDrillDownHref('cheques', billingPartnerId, returnTo),
          label: t('admin.finance.billingAccounts.actions.cheques'),
        }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div className="finance-billing-actions">
      <div className="finance-billing-actions__links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="btn btn--ghost btn--sm">
            {link.label}
          </Link>
        ))}
      </div>
      {hasAction(allowedActions, 'collect_payment') ? (
        <Link
          href={buildBillingAccountCollectHref(billingPartnerId, returnTo, academicYearId)}
          className="btn btn--primary btn--sm"
        >
          {t('admin.finance.billingAccounts.actions.collect')}
        </Link>
      ) : null}
      <span className="sr-only">{account.display_name ?? account.name}</span>
    </div>
  );
}

export function BillingAccountDetailSkeleton() {
  return (
    <div className="finance-metrics-grid finance-billing-summary-grid" aria-hidden>
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="card finance-metric-card">
          <span className="finance-skeleton finance-skeleton--label" />
          <span className="finance-skeleton finance-skeleton--metric" />
        </div>
      ))}
    </div>
  );
}

export function BillingAccountDetailError({
  code,
  onRetry,
}: {
  code?: string;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <ApiErrorView
      error={{
        code: code ?? 'unknown',
        message: t(billingAccountErrorMessageKey(code)),
      }}
      onRetry={onRetry}
    />
  );
}
