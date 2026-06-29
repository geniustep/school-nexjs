'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { InfoBanner } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/finance/cash-desk/cash-desk-ui.css';
import { fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import {
  collectionBlockedByCashSession,
  resolveCashSessionCollectionAccess,
} from '@/lib/utils/cash-session-access';
import { isCashJournal, paymentMethodRequiresCashSession } from '@/lib/utils/cash-payment';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type { PaymentJournal } from '@/types/finance';
import type { CashSession } from '@/types/finance-cash-desk';

export function CollectionCashSessionGate({
  journal,
  paymentMethod,
  collectionPath,
  session: externalSession,
  checking: externalChecking,
}: {
  journal: PaymentJournal | null | undefined;
  paymentMethod: string;
  collectionPath: string;
  session?: CashSession | null;
  checking?: boolean;
}) {
  const t = useT();
  const user = useSession();
  const [checkingInternal, setCheckingInternal] = useState(false);
  const [sessionInternal, setSessionInternal] = useState<CashSession | null>(null);

  const requiresSession =
    !!journal &&
    isCashJournal(journal) &&
    paymentMethodRequiresCashSession(paymentMethod);

  const managesOwnFetch = externalSession === undefined && externalChecking === undefined;

  useEffect(() => {
    if (!requiresSession || !journal?.id || !managesOwnFetch) {
      setSessionInternal(null);
      return;
    }
    let cancelled = false;
    setCheckingInternal(true);
    void fetchCurrentCashSession(journal.id).then((session) => {
      if (cancelled) return;
      setSessionInternal(session);
      setCheckingInternal(false);
    });
    return () => {
      cancelled = true;
    };
  }, [journal?.id, managesOwnFetch, requiresSession]);

  const session = externalSession !== undefined ? externalSession : sessionInternal;
  const checking = externalChecking ?? (managesOwnFetch ? checkingInternal : false);

  const access = useMemo(
    () =>
      resolveCashSessionCollectionAccess({
        requiresSession,
        checking,
        session,
        currentUserId: user?.id,
      }),
    [checking, requiresSession, session, user?.id],
  );

  if (access.kind === 'not_required') return null;
  if (access.kind === 'checking') {
    return <p className="muted">{t('admin.finance.cashDesk.checkingSession')}</p>;
  }
  if (access.kind === 'allowed') {
    if (!access.shared) return null;
    return (
      <p className="cash-desk-collection-shared-note muted">
        {t('admin.finance.cashDesk.collectionSharedSessionNote', {
          cashierName: access.cashierName ?? t('common.dash'),
        })}
      </p>
    );
  }
  if (access.kind === 'blocked_no_permission') {
    return (
      <div className="cash-desk-collection-gate">
        <InfoBanner
          tone="amber"
          icon="!"
          title={t('admin.finance.cashDesk.collectionNoPermissionTitle')}
          description={t('admin.finance.cashDesk.collectionNoPermissionDesc')}
        />
      </div>
    );
  }

  const cashDeskHref = appendReturnTo('/admin/finance/cash-desk', collectionPath);

  return (
    <div className="cash-desk-collection-gate">
      <InfoBanner
        tone="amber"
        icon="!"
        title={t('admin.finance.cashDesk.collectionGateTitle')}
        description={t('admin.finance.cashDesk.collectionGateDesc')}
      />
      <Link href={cashDeskHref} className="btn btn--primary btn--sm">
        {t('admin.finance.cashDesk.openAction')}
      </Link>
    </div>
  );
}

export { collectionBlockedByCashSession, resolveCashSessionCollectionAccess };
