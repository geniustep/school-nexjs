'use client';

import Link from 'next/link';
import { IconAlertTriangle } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview } from '@/types/finance';

type AlertItem = {
  key: string;
  message: string;
  href?: string;
};

export function FinanceHubAlerts({ data }: { data: AdminFinanceOverview | null }) {
  const t = useT();
  const overview = normalizeFinanceOverview(data);
  const totals = overview?.totals;
  const cheques = overview?.cheques;

  const alerts: AlertItem[] = [];

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

  const rejectedCheques = totals?.cheques_rejected_count ?? cheques?.bounced ?? 0;
  if (rejectedCheques > 0) {
    alerts.push({
      key: 'rejected_cheques',
      message: t('admin.finance.hub.alertRejectedCheques', { count: String(rejectedCheques) }),
      href: '/admin/finance/cheques?quick=rejected',
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
