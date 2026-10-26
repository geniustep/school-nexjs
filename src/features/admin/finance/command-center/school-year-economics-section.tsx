'use client';

import { ApiErrorView, EmptyState } from '@/components/states/states';
import { InfoBanner } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { FinanceSchoolYearEnrollmentEconomics } from './school-year-economics-contract';

function EconomicsMetric({
  label, value, featured = false,
}: { label: string; value: React.ReactNode; featured?: boolean }) {
  return <article className={`card fcc-kpi fcc-kpi--${featured ? 'success' : 'default'}`}>
    <span className="fcc-kpi__label">{label}</span>
    <strong className="fcc-kpi__value">{value}</strong>
  </article>;
}

export function SchoolYearEconomicsSection({
  data, hasResponse, loading, error, reload,
}: {
  data: FinanceSchoolYearEnrollmentEconomics | null;
  hasResponse: boolean;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const heading = <div className="fcc-section__head"><div>
    <h2>{t('admin.finance.economics.title')}</h2>
    <p>{t('admin.finance.economics.description')}</p>
  </div></div>;

  if (loading && !hasResponse) return <section className="fcc-section fcc-economics" aria-busy="true">
    {heading}
    <div className="fcc-kpi-grid fcc-economics__grid">{Array.from({ length: 5 }).map((_, i) =>
      <div key={i} className="card fcc-kpi fcc-skeleton" />)}</div>
  </section>;

  if (error) return <section className="fcc-section fcc-economics">
    {heading}<ApiErrorView error={error} onRetry={reload} />
  </section>;

  if (!data) return <section className="fcc-section fcc-economics">
    {heading}
    {hasResponse
      ? <InfoBanner tone="amber" title={t('admin.finance.economics.unavailable')}
          description={t('admin.finance.economics.contextMismatch')} />
      : <EmptyState compact description={t('admin.finance.economics.unavailable')} />}
  </section>;

  const language = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US', es: 'es-ES' }[locale];
  const students = new Intl.NumberFormat(language).format(data.current_students_count);

  return <section className="fcc-section fcc-economics" aria-label={t('admin.finance.economics.title')}>
    {heading}
    <div className="fcc-kpi-grid fcc-economics__grid">
      <EconomicsMetric label={t('admin.finance.economics.students')}
        value={<bdi dir="ltr" className="numeric-text">{students}</bdi>} />
      <EconomicsMetric label={t('admin.finance.economics.registration')}
        value={<FinanceMoney amount={data.registration_net} currency={data.currency} />} />
      <EconomicsMetric label={t('admin.finance.economics.tuition')}
        value={<FinanceMoney amount={data.tuition_net} currency={data.currency} />} />
      <EconomicsMetric label={t('admin.finance.economics.total')}
        value={<FinanceMoney amount={data.combined_net} currency={data.currency} />} featured />
      <EconomicsMetric label={t('admin.finance.economics.average')}
        value={data.average_per_current_student === null
          ? t('admin.finance.economics.unavailable')
          : <FinanceMoney amount={data.average_per_current_student} currency={data.currency} />} />
    </div>
    <div className="fcc-economics__footer">
      <span>{t('admin.finance.economics.note')}</span>
      <span>{t('admin.finance.economics.asOf')}: <bdi dir="ltr">{data.as_of_date}</bdi></span>
    </div>
  </section>;
}
