'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { FinanceInstallmentStatusBadges } from '@/features/admin/finance/student-fee-installment-status';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { refName, studentFeeState, feeBalanceAmount } from '@/lib/utils/finance';
import type { FinanceDiscount, FinanceInstallment, StudentFee } from '@/types/finance';

function kpiToneClass(tone: string): string {
  return `finance-student-fee-kpi--${tone}`;
}

export function StudentFeeDetailView({ fee }: { fee: StudentFee }) {
  const t = useT();
  const { formatDate } = useFormat();
  const currency = fee.currency;
  const feeState = studentFeeState(fee);
  const installments = fee.installments ?? fee.lines ?? [];
  const title = refName(fee.fee_plan) ?? refName(fee.fee_type) ?? fee.name ?? t('admin.finance.studentFeeDetail');
  const studentLabel = refName(fee.student);
  const serviceLabel = refName(fee.service) ?? fee.fee_type_name ?? null;

  const kpis = useMemo(
    () => [
      {
        key: 'original',
        label: t('admin.finance.originalAmount'),
        value: <FinanceMoney amount={fee.original_amount ?? fee.amount} currency={currency} />,
        tone: 'slate' as const,
      },
      ...(fee.discount_amount ?? 0) > 0
        ? [
            {
              key: 'discount',
              label: t('admin.finance.discountAmount'),
              value: <FinanceMoney amount={fee.discount_amount} currency={currency} />,
              tone: 'amber' as const,
            },
          ]
        : [],
      {
        key: 'net',
        label: t('admin.finance.netAmount'),
        value: <FinanceMoney amount={fee.net_amount ?? fee.amount} currency={currency} />,
        tone: 'blue' as const,
      },
      {
        key: 'paid',
        label: t('admin.finance.paidAmount'),
        value: <FinanceMoney amount={fee.paid_amount} currency={currency} />,
        tone: 'green' as const,
      },
      {
        key: 'remaining',
        label: t('admin.finance.remainingAmount'),
        value: <FinanceMoney amount={feeBalanceAmount(fee)} currency={currency} />,
        tone: (feeBalanceAmount(fee) ?? 0) > 0 ? ('red' as const) : ('green' as const),
      },
    ],
    [fee, currency, t],
  );

  const installmentColumns: Column<FinanceInstallment>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.finance.installment'),
        render: (row) => (
          <span dir="auto">{row.installment_description ?? row.name ?? row.sequence ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'due',
        header: t('admin.finance.dueDate'),
        render: (row) => formatDate(row.due_date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.finance.lineAmount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency} />,
      },
      {
        key: 'paid',
        header: t('admin.finance.paidAmount'),
        render: (row) => <FinanceMoney amount={row.paid_amount} currency={currency} />,
      },
      {
        key: 'remaining',
        header: t('admin.finance.remainingAmount'),
        render: (row) => <FinanceMoney amount={row.remaining_amount} currency={currency} />,
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceInstallmentStatusBadges row={row} />,
      },
    ],
    [t, formatDate, currency],
  );

  const discountColumns: Column<FinanceDiscount>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.finance.discount'),
        render: (row) => <span dir="auto">{row.name ?? row.type ?? t('common.dash')}</span>,
      },
      {
        key: 'value',
        header: t('admin.finance.discountValue'),
        render: (row) =>
          row.percent != null ? `${row.percent}%` : <FinanceMoney amount={row.amount} currency={currency} />,
      },
      {
        key: 'reason',
        header: t('admin.finance.discountReason'),
        render: (row) => <span dir="auto">{row.reason ?? t('common.dash')}</span>,
      },
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
    [t, formatDate, currency],
  );

  return (
    <div className="finance-student-fee">
      <header className="finance-student-fee-hero">
        <div className="finance-student-fee-hero__main">
          <span className="finance-student-fee-hero__glyph" aria-hidden="true">
            ▤
          </span>
          <div>
            <p className="finance-student-fee-hero__eyebrow">{t('admin.finance.studentFeeDetail')}</p>
            <h1 className="finance-student-fee-hero__title" dir="auto">
              {title}
            </h1>
            {studentLabel ? (
              <p className="finance-student-fee-hero__subtitle" dir="auto">
                {studentLabel}
                {serviceLabel ? ` · ${serviceLabel}` : ''}
              </p>
            ) : null}
          </div>
        </div>
        <div className="finance-student-fee-hero__meta">
          <FinanceStatusBadge state={feeState} />
          {fee.due_date ? (
            <span className="finance-student-fee-hero__chip">
              {t('admin.finance.dueDate')}: {formatDate(fee.due_date)}
            </span>
          ) : null}
        </div>
        <div className="finance-student-fee-hero__actions">
          {fee.student_id ? (
            <Link className="finance-student-fee-hero__btn" href={`/admin/finance/students/${fee.student_id}`}>
              {t('admin.finance.openFinanceProfile')}
            </Link>
          ) : null}
          {fee.student_id ? (
            <Link
              className="finance-student-fee-hero__btn finance-student-fee-hero__btn--primary"
              href={`/admin/students/${fee.student_id}?tab=finance`}
            >
              {t('admin.finance.openStudent360Finance')}
            </Link>
          ) : null}
        </div>
      </header>

      {(fee.cheque || fee.paid_by_cheque) && (
        <div className="finance-student-fee-cheque" role="note">
          <ChequePaymentMarker fee={fee} />
        </div>
      )}

      <section className="finance-student-fee-kpis" aria-label={t('admin.finance.summary')}>
        {kpis.map((item) => (
          <article key={item.key} className={`finance-student-fee-kpi ${kpiToneClass(item.tone)}`}>
            <span className="finance-student-fee-kpi__label">{item.label}</span>
            <span className="finance-student-fee-kpi__value">{item.value}</span>
          </article>
        ))}
      </section>

      {installments.length > 0 ? (
        <section className="finance-student-fee-section card">
          <header className="finance-student-fee-section__head">
            <div>
              <h2 className="finance-student-fee-section__title">{t('admin.finance.installmentsHeading')}</h2>
              <p className="finance-student-fee-section__desc">{t('admin.finance.studentFeeInstallmentsDesc')}</p>
            </div>
            <span className="finance-student-fee-section__count tiny muted">
              {t('admin.finance.studentFeeInstallmentCount', { count: installments.length })}
            </span>
          </header>
          <DataTable
            columns={installmentColumns}
            rows={installments}
            rowKey={(row) => row.id ?? `${row.sequence ?? 0}-${row.due_date ?? ''}`}
          />
        </section>
      ) : null}

      {(fee.discounts?.length ?? 0) > 0 ? (
        <section className="finance-student-fee-section card">
          <header className="finance-student-fee-section__head">
            <div>
              <h2 className="finance-student-fee-section__title">{t('admin.finance.discounts')}</h2>
              <p className="finance-student-fee-section__desc">{t('admin.finance.studentFeeDiscountsDesc')}</p>
            </div>
          </header>
          <DataTable
            columns={discountColumns}
            rows={fee.discounts ?? []}
            rowKey={(row) => row.id ?? `${row.name ?? 'd'}-${row.effective_date ?? ''}`}
          />
        </section>
      ) : null}
    </div>
  );
}
