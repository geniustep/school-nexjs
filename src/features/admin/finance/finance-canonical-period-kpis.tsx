'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useLocale } from '@/features/i18n/locale-context';
import type { FinanceCanonicalPeriodKey, FinanceCanonicalPeriodMetrics } from '@/types/finance-canonical';
import '@/features/admin/finance/finance-canonical.css';

const COPY = {
  ar: {
    title: 'تدفقات الفترة', cash: 'تحصيلات الفترة', confirmed: 'إجمالي التحصيلات المؤكدة',
    due: 'المستحق خلال الفترة', paid: 'المدفوع من مستحقات الفترة',
    rate: 'نسبة أداء مستحقات الفترة', note: 'التحصيل النقدي بحسب تاريخ الأداء، أما المستحق فبحسب تاريخ الاستحقاق؛ ليسا رقمًا واحدًا.',
  },
  en: {
    title: 'Period flows', cash: 'Period cash collected', confirmed: 'All confirmed collections',
    due: 'Due in period', paid: 'Paid on period due cohort',
    rate: 'Due cohort payment rate', note: 'Cash uses payment date; due cohort uses installment due date. They need not match.',
  },
  fr: {
    title: 'Flux de la période', cash: 'Encaissements de la période', confirmed: 'Tous encaissements confirmés',
    due: 'Échéances de la période', paid: 'Payé sur échéances de la période',
    rate: 'Taux de paiement des échéances', note: 'Les encaissements suivent la date de paiement ; les échéances suivent la date d’échéance.',
  },
  es: {
    title: 'Flujos del período', cash: 'Cobros del período', confirmed: 'Todos los cobros confirmados',
    due: 'Vencido en el período', paid: 'Pagado sobre cuotas del período',
    rate: 'Tasa de pago del período', note: 'Los cobros usan fecha de pago y las cuotas fecha de vencimiento.',
  },
} as const;

const DISPLAY: readonly [FinanceCanonicalPeriodKey, 'cash' | 'confirmed' | 'due' | 'paid' | 'rate'][] = [
  ['period_cash_collected', 'cash'],
  ['all_confirmed_collections', 'confirmed'],
  ['period_due_cohort_due', 'due'],
  ['period_due_cohort_paid', 'paid'],
  ['period_due_cohort_collection_rate', 'rate'],
];

export function FinanceCanonicalPeriodKpis({ metrics }: { metrics: FinanceCanonicalPeriodMetrics | null }) {
  const { locale } = useLocale();
  // The period contract has not yet been released on older nibras runtimes.
  if (!metrics) return null;
  const copy = COPY[locale];
  return (
    <section className="finance-canonical" aria-label={copy.title}>
      <div className="finance-canonical__context">
        <strong>{copy.title}</strong>
        <span dir="ltr">{metrics.meta.date_from} — {metrics.meta.date_to}</span>
      </div>
      <div className="finance-canonical__grid">
        {DISPLAY.map(([key, label]) => {
          const value = metrics.values[key];
          return (
            <article className="card finance-canonical__card" key={key}>
              <span className="muted">{copy[label]}</span>
              <strong>{value == null ? '—' : key === 'period_due_cohort_collection_rate'
                ? `${value.toFixed(1)}%`
                : <FinanceMoney amount={value} currency={metrics.meta.currency?.name} />}</strong>
            </article>
          );
        })}
      </div>
      <p className="muted finance-canonical__note">{copy.note}</p>
    </section>
  );
}
