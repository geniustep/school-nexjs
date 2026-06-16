'use client';

import Link from 'next/link';
import { IconAlertTriangle, IconCheckCircle } from '@/components/icons/admin-icons';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceHubSection } from '@/features/admin/finance/finance-hub-header';
import { buildFinanceHubAttentionItems } from '@/features/admin/finance/finance-hub-attention-utils';
import { formatFinancePlural } from '@/features/admin/finance/finance-hub-plural';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { resolveFinanceCurrency } from '@/lib/i18n/format-money';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview } from '@/types/finance';

export function FinanceHubAlerts({
  data,
  currency,
}: {
  data: AdminFinanceOverview | null;
  currency?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const resolvedCurrency = resolveFinanceCurrency(currency);
  const overview = normalizeFinanceOverview(data);

  const alerts = buildFinanceHubAttentionItems({ overview });
  const chequesDueSoon = overview?.attention?.cheques_due_soon;

  return (
    <FinanceHubSection title={t('admin.finance.hub.attentionTitle')}>
      {!alerts.length ? (
        <div className="finance-hub-attention-empty card">
          <IconCheckCircle size={20} className="finance-hub-attention-empty__icon" />
          <p>
            {chequesDueSoon && chequesDueSoon.count === 0
              ? t('admin.finance.hub.chequesDueSoonClear')
              : t('admin.finance.hub.attentionEmpty')}
          </p>
        </div>
      ) : (
        <div className="finance-hub-attention-grid">
          {alerts.map((alert) => {
            const title = alert.pluralKind
              ? formatFinancePlural(t, locale, alert.pluralKind, alert.count)
              : t(alert.titleKey ?? '');
            return (
              <article
                key={alert.key}
                className={`finance-hub-attention-item card finance-hub-attention-item--${alert.severity}`}
              >
                <div className="finance-hub-attention-item__head">
                  <IconAlertTriangle size={16} aria-hidden />
                  <h3 className="finance-hub-attention-item__title">{title}</h3>
                </div>
                {alert.amount != null ? (
                  <p className="finance-hub-attention-item__amount">
                    <span className="muted">{t('admin.finance.hub.attentionTotalValue')}</span>{' '}
                    <FinanceMoney amount={alert.amount} currency={resolvedCurrency} />
                  </p>
                ) : null}
                {alert.href ? (
                  <Link href={alert.href} className="btn btn--ghost btn--sm finance-hub-attention-item__action">
                    {t(alert.actionKey)}
                  </Link>
                ) : (
                  <span className="tiny muted">{t(alert.actionKey)}</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </FinanceHubSection>
  );
}
