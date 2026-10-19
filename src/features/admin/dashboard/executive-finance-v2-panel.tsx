'use client';
/** @raqeem-design docs/design/RAQEEM-DESIGN.md */
import type { ReactNode } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import type { Locale } from '@/lib/i18n/config';
import { localeToBcp47 } from '@/lib/i18n/config';
import type {
  ExecutiveFinanceMetric,
  ExecutiveFinancePeriodScope,
  ExecutiveFinanceV2,
} from '@/lib/admin/executive-finance-v2-contract';
import styles from './executive-finance-v2.module.css';

const copy: Record<Locale, Record<string, string>> = {
  ar: {
    title: 'المؤشرات المالية', current_month: 'الشهر الجاري', academic_year: 'الموسم الدراسي',
    due: 'المستحق خلال الفترة', cash: 'التحصيلات الفعلية', cohort: 'المحصّل من مستحقات الفترة',
    cohortRate: 'نسبة تحصيل المستحقات', remaining: 'الرصيد المتبقي', overdue: 'المتأخرات الحالية',
    accounts: 'حسابات الفوترة المتأخرة', flows: 'حركة الفترة', stock: 'الوضع المالي الحالي',
    previous: 'الفترة المقارنة', unavailable: 'غير متاح', noPeriod: 'بيانات الفترة غير متاحة',
    comparisonUnavailable: 'المقارنة غير متاحة', annual: 'المقارنة السنوية غير مدعومة حاليًا',
    span: 'لا يمكن مقارنة فترتين مختلفتي الطول', historical: 'لا توجد أرصدة تاريخية موثوقة',
    attribution: 'تحتاج البيانات التاريخية إلى تسوية', limited: 'بيانات غير مكتملة',
    missing: 'لم تتوفر بيانات مؤكدة لهذا المؤشر', notice: 'المستحقات تختلف عن التحصيلات النقدية؛ ولا تمثل أرصدة اليوم أرصدة الشهر السابق.',
  },
  fr: {
    title: 'Indicateurs financiers', current_month: 'Mois en cours', academic_year: 'Année scolaire',
    due: 'Montant exigible sur la période', cash: 'Encaissements réels', cohort: 'Encaissé sur les échéances de la période',
    cohortRate: 'Taux de recouvrement', remaining: 'Solde restant', overdue: 'Impayés actuels',
    accounts: 'Comptes de facturation en retard', flows: 'Flux de la période', stock: 'Situation actuelle',
    previous: 'Période comparée', unavailable: 'Indisponible', noPeriod: 'Période indisponible',
    comparisonUnavailable: 'Comparaison indisponible', annual: 'Comparaison annuelle non prise en charge',
    span: 'Les périodes ne sont pas de même durée', historical: 'Pas de solde historique fiable',
    attribution: 'Imputation historique à vérifier', limited: 'Données incomplètes',
    missing: 'Aucune donnée confirmée pour cet indicateur', notice: 'Les échéances et les encaissements sont différents. Les soldes actuels ne sont pas des soldes historiques.',
  },
  en: {
    title: 'Financial indicators', current_month: 'Current month', academic_year: 'Academic year',
    due: 'Due during period', cash: 'Actual collections', cohort: 'Collected on period dues',
    cohortRate: 'Due-cohort collection rate', remaining: 'Remaining balance', overdue: 'Current overdue',
    accounts: 'Overdue billing accounts', flows: 'Period activity', stock: 'Current financial position',
    previous: 'Comparison period', unavailable: 'Unavailable', noPeriod: 'Period data unavailable',
    comparisonUnavailable: 'Comparison unavailable', annual: 'Annual comparison is not supported',
    span: 'Periods have different durations', historical: 'No reliable historical balance',
    attribution: 'Historical settlement attribution needed', limited: 'Incomplete data',
    missing: 'No confirmed data for this metric', notice: 'Amounts due differ from cash collected; current balances are not previous-period balances.',
  },
  es: {
    title: 'Indicadores financieros', current_month: 'Mes actual', academic_year: 'Curso escolar',
    due: 'Importe vencido en el período', cash: 'Cobros reales', cohort: 'Cobrado de los vencimientos del período',
    cohortRate: 'Tasa de cobro de vencimientos', remaining: 'Saldo pendiente', overdue: 'Vencidos actuales',
    accounts: 'Cuentas de facturación vencidas', flows: 'Movimientos del período', stock: 'Situación actual',
    previous: 'Período de comparación', unavailable: 'No disponible', noPeriod: 'Período no disponible',
    comparisonUnavailable: 'Comparación no disponible', annual: 'Comparación anual no admitida',
    span: 'Los períodos no tienen la misma duración', historical: 'No hay saldos históricos fiables',
    attribution: 'Falta atribución histórica', limited: 'Datos incompletos',
    missing: 'Sin datos confirmados para este indicador', notice: 'Los vencimientos y los cobros son distintos. Los saldos actuales no son históricos.',
  },
};

type Translations = Record<string, string>;
function reason(code: string | null, t: Translations): string {
  switch (code) {
    case 'academic_year_period_comparison_not_supported': return t.annual;
    case 'previous_period_span_not_symmetric': return t.span;
    case 'historical_stock_snapshot_not_available': return t.historical;
    case 'historical_settlement_attribution_required': return t.attribution;
    case 'academic_year_dates_missing':
    case 'academic_year_not_started': return t.noPeriod;
    default: return t.missing;
  }
}
function renderMoney(value: number | null, currency: string, t: Translations): ReactNode {
  return value === null ? t.unavailable : <FinanceMoney amount={value} currency={currency} />;
}
function formattedPeriod(from: string | null, to: string | null, locale: Locale): string {
  if (!from || !to) return '—';
  const fmt = (date: string) => {
    const day = new Date(`${date}T12:00:00Z`);
    return Number.isNaN(day.getTime()) ? date : new Intl.DateTimeFormat(localeToBcp47(locale), {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(day);
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

function Tile({ label, metric, previous, currency, t, highlighted = false }: {
  label: string; metric: ExecutiveFinanceMetric; previous?: ExecutiveFinanceMetric;
  currency: string; t: Translations; highlighted?: boolean;
}) {
  return (
    <div className={`${styles.tile} ${highlighted ? styles.highlighted : ''}`}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value} dir="auto">
        {metric.available ? renderMoney(metric.amount, currency, t) : t.unavailable}
      </strong>
      {!metric.available ? (
        <span className={styles.note} role="status">{reason(metric.reason_code, t)}</span>
      ) : previous ? (
        <span className={styles.note}>{t.previous}: {previous.available
          ? renderMoney(previous.amount, currency, t)
          : reason(previous.reason_code, t)}</span>
      ) : null}
    </div>
  );
}

/** V2 is deliberately read-only: all financial calculations stay in Odoo. */
export function ExecutiveFinanceV2Panel({ data, locale, selectedScope, onScopeChange }: {
  data: ExecutiveFinanceV2;
  locale: Locale;
  selectedScope: ExecutiveFinancePeriodScope;
  onScopeChange: (next: ExecutiveFinancePeriodScope) => void;
}) {
  const t = copy[locale];
  const p = data.meta.period;
  const currency = data.meta.currency?.name ?? 'MAD';
  const current = data.indicators;
  const comparison = data.comparison_previous_period;
  const prev = comparison?.available === true ? comparison.indicators : null;
  const rate = current?.due_cohort_performance;
  return (
    <section className={styles.root} aria-label={t.title}>
      <div className={styles.toolbar}>
        <div>
          <div className={styles.title}>{t.title}</div>
          <div className={styles.date}>{p.available ? formattedPeriod(p.date_from, p.date_to, locale) : t.noPeriod}</div>
        </div>
        <div className={styles.switcher} role="group" aria-label={t.title}>
          {(['current_month', 'academic_year'] as const).map(scope => (
            <button key={scope} type="button" className={selectedScope === scope ? styles.selected : ''}
              aria-pressed={selectedScope === scope} onClick={() => onScopeChange(scope)}>{t[scope]}</button>
          ))}
        </div>
      </div>
      {p.available && current ? (
        <>
          <div className={styles.groupTitle}>{t.flows}</div>
          <div className={styles.grid}>
            <Tile label={t.due} metric={current.period_net_due} previous={prev?.period_net_due} currency={currency} t={t}/>
            <Tile label={t.cash} metric={current.period_actual_collections} previous={prev?.period_actual_collections} currency={currency} t={t} highlighted/>
            <div className={styles.tile}>
              <span className={styles.label}>{t.cohort}</span>
              <strong className={styles.value} dir="auto">{rate?.available && rate.recognized_collected_amount !== null
                ? renderMoney(rate.recognized_collected_amount, currency, t) : t.unavailable}</strong>
              <span className={styles.note}>{rate?.available && rate.collection_rate !== null
                ? `${t.cohortRate}: ${new Intl.NumberFormat(localeToBcp47(locale), { maximumFractionDigits: 2 }).format(rate.collection_rate)}%`
                : reason(rate?.reason_code ?? null, t)}</span>
              {prev?.due_cohort_performance.available && prev.due_cohort_performance.recognized_collected_amount !== null && (
                <span className={styles.note}>{t.previous}: {renderMoney(prev.due_cohort_performance.recognized_collected_amount, currency, t)}</span>
              )}
            </div>
          </div>
          <div className={styles.groupTitle}>{t.stock}</div>
          <div className={styles.grid}>
            <Tile label={t.remaining} metric={current.remaining_balance} currency={currency} t={t}/>
            <Tile label={t.overdue} metric={current.overdue_outstanding} currency={currency} t={t} highlighted/>
            <div className={styles.tile}>
              <span className={styles.label}>{t.accounts}</span>
              <strong className={styles.value}>{current.overdue_billing_accounts_count.available
                ? new Intl.NumberFormat(localeToBcp47(locale)).format(current.overdue_billing_accounts_count.count ?? 0)
                : t.unavailable}</strong>
              {!current.overdue_billing_accounts_count.available && (
                <span className={styles.note}>{reason(current.overdue_billing_accounts_count.reason_code, t)}</span>
              )}
            </div>
          </div>
          <p className={styles.notice}>{t.notice}</p>
          {comparison && !comparison.available && (
            <p className={styles.comparison} role="status">{t.comparisonUnavailable}: {reason(comparison.reason_code, t)}</p>
          )}
        </>
      ) : <p className={styles.notice} role="status">{reason(p.reason_code, t)}</p>}
    </section>
  );
}
