'use client';

import Link from 'next/link';
import { IconAlertTriangle } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  rejectedChequeQuickHref,
  totalRejectedChequeCount,
} from '@/lib/utils/cheque-status';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview, FinanceCheque } from '@/types/finance';

function useChequeTotal(params: Record<string, string>) {
  const state = useAdminResource<FinanceCheque[]>(endpoints.admin.financeCheques, {
    ...params,
    page: 1,
    page_size: 1,
  });
  return state.meta?.pagination?.total ?? null;
}

export function FinanceHubAlerts({ data }: { data: AdminFinanceOverview | null }) {
  const t = useT();
  const overview = normalizeFinanceOverview(data);
  const totals = overview?.totals;
  const cheques = overview?.cheques;

  const rejectedListCount = useChequeTotal({ state: 'rejected' });
  const bouncedListCount = useChequeTotal({ state: 'bounced' });
  const verifiedRejectedCount = totalRejectedChequeCount(rejectedListCount, bouncedListCount);
  const overviewRejectedCount = totals?.cheques_rejected_count ?? cheques?.bounced ?? cheques?.rejected ?? 0;
  const rejectedCountMismatch =
    verifiedRejectedCount !== overviewRejectedCount &&
    rejectedListCount != null &&
    bouncedListCount != null;

  const alerts: Array<{ key: string; message: string; href?: string }> = [];

  if ((totals?.overdue_installments_count ?? 0) > 0) {
    alerts.push({
      key: 'overdue_installments',
      message: t('admin.finance.hub.alertOverdueInstallments', {
        count: String(totals?.overdue_installments_count),
      }),
      href: '/admin/finance/installments?quick=overdue_unpaid',
    });
  }

  const overdueCheques = cheques?.overdue ?? 0;
  if (overdueCheques > 0) {
    alerts.push({
      key: 'overdue_cheques',
      message: t('admin.finance.hub.alertOverdueCheques', { count: String(overdueCheques) }),
      href: '/admin/finance/cheques?quick=overdue',
    });
  }

  if (rejectedCountMismatch) {
    alerts.push({
      key: 'rejected_cheques_unverified',
      message: t('admin.finance.hub.alertRejectedChequesUnverified'),
    });
  } else if (verifiedRejectedCount > 0) {
    alerts.push({
      key: 'rejected_cheques',
      message: t('admin.finance.hub.alertRejectedChequesFollowUp', {
        count: String(verifiedRejectedCount),
      }),
      href: rejectedChequeQuickHref(),
    });
  } else if (overviewRejectedCount > 0 && rejectedListCount == null) {
    alerts.push({
      key: 'rejected_cheques_loading',
      message: t('admin.finance.hub.alertRejectedChequesUnverified'),
    });
  }

  if ((totals?.draft_agreements_count ?? 0) > 0) {
    alerts.push({
      key: 'draft_agreements',
      message: t('admin.finance.hub.alertDraftAgreements', {
        count: String(totals?.draft_agreements_count),
      }),
      href: '/admin/finance/agreements?state=draft',
    });
  }

  if (!alerts.length) return null;

  return (
    <div className="finance-hub-alerts" role="status">
      {alerts.map((alert) => (
        <div key={alert.key} className="finance-hub-alert card">
          <IconAlertTriangle size={16} className="finance-hub-alert-icon" />
          {alert.href ? (
            <Link href={alert.href} className="finance-hub-alert-link">
              {alert.message}
            </Link>
          ) : (
            <span>{alert.message}</span>
          )}
        </div>
      ))}
    </div>
  );
}
