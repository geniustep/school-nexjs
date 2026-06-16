'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { cashSessionCurrency } from '@/lib/utils/cash-session-currency';
import type { CashSession } from '@/types/finance-cash-desk';

export function CashSessionKpiGrid({ session }: { session: CashSession }) {
  const t = useT();
  const summary = session.summary;
  const currency = cashSessionCurrency(session);

  const financialItems = [
    { key: 'opening', label: t('admin.finance.cashDesk.kpiOpening'), value: summary?.opening_balance ?? session.opening_balance },
    {
      key: 'collections',
      label: t('admin.finance.cashDesk.kpiCollections'),
      value: summary?.cash_collections_total,
    },
    {
      key: 'in',
      label: t('admin.finance.cashDesk.kpiMovementsIn'),
      value: summary?.movements_in_total ?? summary?.total_cash_in,
    },
    {
      key: 'out',
      label: t('admin.finance.cashDesk.kpiMovementsOut'),
      value: summary?.movements_out_total ?? summary?.total_cash_out,
    },
  ];

  const expectedValue = summary?.expected_balance ?? session.expected_balance;
  const collectionsCount = summary?.collections_count ?? 0;
  const receiptsCount = summary?.receipts_count ?? 0;

  return (
    <section className="cash-desk-kpi-section" aria-label={t('admin.finance.cashDesk.kpiSectionLabel')}>
      <div className="cash-desk-kpi-grid">
        {financialItems.map((item) => (
          <div key={item.key} className="cash-desk-kpi-card">
            <span className="cash-desk-kpi-card__label">{item.label}</span>
            <strong className="cash-desk-kpi-card__value">
              <FinanceMoney amount={item.value ?? null} currency={currency} />
            </strong>
          </div>
        ))}
        <div className="cash-desk-kpi-card cash-desk-kpi-card--expected">
          <span className="cash-desk-kpi-card__label">{t('admin.finance.cashDesk.kpiExpected')}</span>
          <strong className="cash-desk-kpi-card__value">
            <FinanceMoney amount={expectedValue ?? null} currency={currency} />
          </strong>
          <p className="cash-desk-kpi-card__hint">{t('admin.finance.cashDesk.kpiExpectedHint')}</p>
        </div>
      </div>
      <div className="cash-desk-kpi-counts">
        <span className="cash-desk-kpi-chip">
          {t('admin.finance.cashDesk.kpiCollectionsCount')}: <strong>{collectionsCount}</strong>
        </span>
        <span className="cash-desk-kpi-chip">
          {t('admin.finance.cashDesk.kpiReceiptsCount')}: <strong>{receiptsCount}</strong>
        </span>
      </div>
    </section>
  );
}

export function CashSessionKpiSkeleton() {
  return (
    <div className="cash-desk-skeleton-kpis" aria-busy="true" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}
