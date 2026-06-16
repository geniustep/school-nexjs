'use client';

import Link from 'next/link';
import { CashSessionStatusBadge } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { useT } from '@/features/i18n/locale-context';
import { isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';

export function CashDeskPageHeader({
  schoolName,
  sessionState,
  sessionLabel,
  onRefresh,
  refreshing,
  returnTo,
}: {
  schoolName?: string | null;
  sessionState?: string | null;
  sessionLabel?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  returnTo?: string | null;
}) {
  const t = useT();
  const showReturnTo = returnTo && isSafeInternalReturnPath(returnTo) && returnTo !== '/admin/finance/cash-desk';

  return (
    <header className="cash-desk-page-header">
      <div className="cash-desk-page-header__main">
        <h1 className="cash-desk-page-header__title">{t('admin.finance.cashDesk.title')}</h1>
        <p className="cash-desk-page-header__subtitle">{t('admin.finance.cashDesk.subtitle')}</p>
        <div className="cash-desk-page-header__meta">
          {schoolName ? (
            <span className="cash-desk-page-header__meta-item">
              <span className="muted">{t('admin.finance.cashDesk.fields.school')}:</span>
              <span>{schoolName}</span>
            </span>
          ) : null}
          <span className="cash-desk-page-header__meta-item">
            <span className="muted">{t('admin.finance.cashDesk.fields.currentSession')}:</span>
            {sessionState ? (
              <>
                {sessionLabel ? <span>{sessionLabel}</span> : null}
                <CashSessionStatusBadge state={sessionState} />
              </>
            ) : (
              <span>{t('admin.finance.cashDesk.noOpenSessionShort')}</span>
            )}
          </span>
        </div>
      </div>
      <div className="cash-desk-page-header__actions">
        {onRefresh ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
          >
            {refreshing ? t('common.refreshing') : t('common.refresh')}
          </button>
        ) : null}
        <Link className="btn btn--ghost" href="/admin/finance/cash-desk/sessions">
          {t('admin.finance.cashDesk.sessionsHistory')}
        </Link>
        {showReturnTo ? (
          <Link className="btn btn--primary" href={returnTo}>
            {t('admin.finance.cashDesk.returnToCollection')}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
