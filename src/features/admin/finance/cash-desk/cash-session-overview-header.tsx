'use client';

import { CashSessionStatusBadge } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { cashSessionCurrency, cashSessionHasCurrency } from '@/lib/utils/cash-session-currency';
import {
  cashSessionDisplayNumber,
  cashSessionJournalLabel,
} from '@/lib/utils/cash-session-normalize';
import { refName } from '@/lib/utils/finance';
import type { CashSession } from '@/types/finance-cash-desk';

export function CashSessionOverviewHeader({ session }: { session: CashSession }) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const currency = cashSessionCurrency(session);
  const schoolName = refName(session.school);
  const journalLabel = cashSessionJournalLabel(session);
  const cashierName = session.cashier_name ?? refName(session.cashier);

  return (
    <article className="card cash-desk-overview" aria-label={t('admin.finance.cashDesk.sessionOverviewLabel')}>
      <div className="cash-desk-overview__head">
        <span className="cash-desk-overview__number">{cashSessionDisplayNumber(session)}</span>
        <CashSessionStatusBadge state={session.state} />
      </div>
      <dl className="cash-desk-overview__meta">
        {schoolName ? (
          <div>
            <dt>{t('admin.finance.cashDesk.fields.school')}</dt>
            <dd>{schoolName}</dd>
          </div>
        ) : null}
        {journalLabel ? (
          <div>
            <dt>{t('admin.finance.cashDesk.fields.journal')}</dt>
            <dd dir="auto">{journalLabel}</dd>
          </div>
        ) : null}
        {cashierName ? (
          <div>
            <dt>{t('admin.finance.cashDesk.fields.cashier')}</dt>
            <dd>{cashierName}</dd>
          </div>
        ) : null}
        {session.opened_at ? (
          <div>
            <dt>{t('admin.finance.cashDesk.fields.openedAt')}</dt>
            <dd>{formatDateTime(session.opened_at)}</dd>
          </div>
        ) : null}
        {cashSessionHasCurrency(session) && currency ? (
          <div>
            <dt>{t('admin.finance.cashDesk.fields.currency')}</dt>
            <dd>{currency}</dd>
          </div>
        ) : null}
        {session.reopen_count != null && session.reopen_count > 0 ? (
          <div>
            <dt>{t('admin.finance.cashDesk.fields.reopenCount')}</dt>
            <dd>{session.reopen_count}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
