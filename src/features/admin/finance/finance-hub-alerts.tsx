'use client';

import Link from 'next/link';
import { IconAlertTriangle, IconCheckCircle } from '@/components/icons/admin-icons';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceHubSection } from '@/features/admin/finance/finance-hub-header';
import { buildFinanceHubAttentionItems } from '@/features/admin/finance/finance-hub-attention-utils';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview, FinanceCheque } from '@/types/finance';

function useChequeTotal(params: Record<string, string | number>) {
  const state = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    ...params,
    page: 1,
    page_size: 1,
  });
  return state.meta?.pagination?.total ?? null;
}

function useChequeList(params: Record<string, string | number>) {
  const state = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    ...params,
    page: 1,
    page_size: 100,
  });
  return {
    rows: parseFinanceList<FinanceCheque>(state.data),
    loading: state.loading,
  };
}

export function FinanceHubAlerts({
  data,
  currency,
}: {
  data: AdminFinanceOverview | null;
  currency?: string;
}) {
  const t = useT();
  const overview = normalizeFinanceOverview(data);

  const rejectedListCount = useChequeTotal({ state: 'rejected' });
  const bouncedListCount = useChequeTotal({ state: 'bounced' });
  const draftCollectionsState = useAdminResource<unknown[]>(endpoints.admin.financePaymentCollections, {
    state: 'draft',
    page: 1,
    page_size: 1,
  });
  const draftCount = draftCollectionsState.meta?.pagination?.total ?? null;

  const { rows: dueSoonCheques } = useChequeList({ quick: 'due_today' });
  const chequesDueSoonCount = dueSoonCheques.length || null;
  const chequesDueSoonAmount = dueSoonCheques.reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const alerts = buildFinanceHubAttentionItems({
    overview,
    rejectedChequeCount: rejectedListCount,
    bouncedChequeCount: bouncedListCount,
    draftCollectionsCount: draftCount,
    chequesDueSoonCount,
    chequesDueSoonAmount: chequesDueSoonAmount || null,
  });

  return (
    <FinanceHubSection title={t('admin.finance.hub.attentionTitle')}>
      {!alerts.length ? (
        <div className="finance-hub-attention-empty card">
          <IconCheckCircle size={20} className="finance-hub-attention-empty__icon" />
          <p>{t('admin.finance.hub.attentionEmpty')}</p>
        </div>
      ) : (
        <div className="finance-hub-attention-grid">
          {alerts.map((alert) => (
            <article
              key={alert.key}
              className={`finance-hub-attention-item card finance-hub-attention-item--${alert.severity}`}
            >
              <div className="finance-hub-attention-item__head">
                <IconAlertTriangle size={16} aria-hidden />
                <p>{t(alert.messageKey, alert.messageParams)}</p>
              </div>
              {alert.amount != null ? (
                <p className="finance-hub-attention-item__amount muted">
                  {t('admin.finance.hub.attentionTotalValue')}{' '}
                  <FinanceMoney amount={alert.amount} currency={currency} />
                </p>
              ) : null}
              {alert.href ? (
                <Link href={alert.href} className="btn btn--ghost btn--sm">
                  {t(alert.actionKey)}
                </Link>
              ) : (
                <span className="tiny muted">{t(alert.actionKey)}</span>
              )}
            </article>
          ))}
        </div>
      )}
    </FinanceHubSection>
  );
}
