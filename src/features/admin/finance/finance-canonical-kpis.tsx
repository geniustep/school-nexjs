'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_CANONICAL_KEYS, type FinanceCanonicalKey, type FinanceCanonicalMetrics } from '@/types/finance-canonical';

export function FinanceCanonicalKpis({
  metrics,
  keys = FINANCE_CANONICAL_KEYS,
  yearLabel,
}: {
  metrics: FinanceCanonicalMetrics | null;
  keys?: readonly FinanceCanonicalKey[];
  yearLabel?: string | null;
}) {
  const t = useT();
  if (!metrics) {
    return (
      <p className="card finance-canonical__unavailable" role="status">
        {t('admin.finance.canonical.runtimeUnavailable')}
      </p>
    );
  }
  const moneyUnit = metrics.meta.currency?.name;
  return (
    <section className="finance-canonical" aria-label={t('admin.finance.canonical.title')}>
      <div className="finance-canonical__context">
        <strong>{t('admin.finance.canonical.title')}</strong>
        <span>{yearLabel || String(metrics.meta.academic_year_id)} · {t('admin.finance.canonical.asOf')} {metrics.meta.as_of_date}</span>
      </div>
      <div className="finance-canonical__grid">
        {keys.map((key) => {
          const value = metrics.values[key];
          const flag = metrics.availability[key];
          return (
            <article className="card finance-canonical__card" key={key}>
              <span className="muted">{t('admin.finance.canonical.' + key)}</span>
              <strong>
                {value == null || flag?.available === false
                  ? t('admin.finance.canonical.unavailable')
                  : key === 'collection_rate_to_date'
                    ? value.toFixed(1) + '%'
                    : <FinanceMoney amount={value} currency={moneyUnit} />}
              </strong>
              {value == null || flag?.available === false ? (
                <small className="muted">{t('admin.finance.canonical.attributionNote')}</small>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="muted finance-canonical__note">{t('admin.finance.canonical.programmedNote')}</p>
    </section>
  );
}
