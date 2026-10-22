'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import '@/features/admin/finance/finance-canonical.css';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  FINANCE_CANONICAL_KEYS, FINANCE_CANONICAL_EXTRA_KEYS,
  type FinanceCanonicalKey, type FinanceCanonicalExtraKey, type FinanceCanonicalMetrics,
} from '@/types/finance-canonical';

const STOCK_LABELS = {
  ar: { stock_fee_paid: 'إجمالي المدفوع من رسوم السنة', remaining_balance: 'الرصيد المتبقي', future_due_paid: 'مدفوعات مبكرة لأقساط قادمة' },
  en: { stock_fee_paid: 'Yearly fees paid', remaining_balance: 'Remaining balance', future_due_paid: 'Future installments prepaid' },
  fr: { stock_fee_paid: 'Frais annuels réglés', remaining_balance: 'Solde restant', future_due_paid: 'Échéances futures déjà payées' },
  es: { stock_fee_paid: 'Cuotas anuales pagadas', remaining_balance: 'Saldo pendiente', future_due_paid: 'Cuotas futuras prepagadas' },
} as const;

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
  const { locale } = useLocale();
  if (!metrics) {
    return (
      <p className="card finance-canonical__unavailable" role="status">
        {t('admin.finance.canonical.runtimeUnavailable')}
      </p>
    );
  }
  const moneyUnit = metrics.meta.currency?.name;
  // Old runtime: do not invent or display absent additive metrics.
  const visibleKeys: (FinanceCanonicalKey | FinanceCanonicalExtraKey)[] = [
    ...keys, ...FINANCE_CANONICAL_EXTRA_KEYS.filter((key) => Object.hasOwn(metrics.values, key)),
  ];
  return (
    <section className="finance-canonical" aria-label={t('admin.finance.canonical.title')}>
      <div className="finance-canonical__context">
        <strong>{t('admin.finance.canonical.title')}</strong>
        <span>{yearLabel || String(metrics.meta.academic_year_id)} · {t('admin.finance.canonical.asOf')} {metrics.meta.as_of_date}</span>
      </div>
      <div className="finance-canonical__grid">
        {visibleKeys.map((key) => {
          const value = metrics.values[key];
          const flag = metrics.availability[key];
          return (
            <article className="card finance-canonical__card" key={key}>
              <span className="muted">{key in STOCK_LABELS[locale] ? STOCK_LABELS[locale][key as FinanceCanonicalExtraKey] : t('admin.finance.canonical.' + key)}</span>
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
