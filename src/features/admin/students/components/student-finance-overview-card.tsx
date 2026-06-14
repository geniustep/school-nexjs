'use client';

import { useMemo } from 'react';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { isFinanceZeroData } from '../utils/normalize-student-finance';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import { StudentFinanceMoney } from './student-finance-money';
import type { StudentFinanceOverviewSummary } from '@/types/student-finance';

export function StudentFinanceOverviewCard({
  summary,
  onOpenFinance,
}: {
  summary: StudentFinanceOverviewSummary;
  onOpenFinance?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const currency = summary.currency;
  const zero = isFinanceZeroData(summary);
  const overdue = (summary.total_overdue ?? 0) > 0;

  const overdueText = useMemo(
    () =>
      t('admin.student360.finance.overdueAlert', {
        amount: formatFinanceCurrency(summary.total_overdue, currency, locale),
      }),
    [t, locale, summary.total_overdue, currency],
  );

  const items = [
    { label: t('admin.student360.finance.totalAssessed'), value: summary.total_assessed },
    { label: t('admin.student360.finance.totalPaid'), value: summary.total_paid },
    { label: t('admin.student360.finance.totalOutstanding'), value: summary.total_outstanding },
    { label: t('admin.student360.finance.totalOverdue'), value: summary.total_overdue },
  ];

  return (
    <Card>
      <SectionHead
        title={t('admin.student360.finance.summaryTitle')}
        action={
          onOpenFinance ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenFinance}>
              {t('admin.student360.finance.viewDetails')}
            </button>
          ) : null
        }
      />
      {overdue && (
        <p className="student-finance-alert" role="alert">
          {overdueText}
        </p>
      )}
      {zero ? (
        <p className="tiny muted">{t('admin.student360.finance.noFeesOrCharges')}</p>
      ) : (
        <div className="student-finance-summary-grid">
          {items.map((item) => (
            <div key={item.label} className="student-finance-summary-card">
              <StudentFinanceMoney amount={item.value} currency={currency} className="student-finance-summary-value" />
              <span className="tiny muted">{item.label}</span>
            </div>
          ))}
          <div className="student-finance-summary-card">
            <span className="student-finance-summary-value">
              {summary.next_due_date ? formatDate(summary.next_due_date) : t('common.dash')}
            </span>
            <span className="tiny muted">{t('admin.student360.finance.nextDueDate')}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
