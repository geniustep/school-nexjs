'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { isCashJournal, paymentMethodRequiresCashSession } from '@/lib/utils/cash-payment';
import { cashSessionIsActive } from '@/lib/utils/cash-session-normalize';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type { PaymentJournal } from '@/types/finance';

export function CollectionCashSessionGate({
  journal,
  paymentMethod,
  collectionPath,
}: {
  journal: PaymentJournal | null | undefined;
  paymentMethod: string;
  collectionPath: string;
}) {
  const t = useT();
  const [checking, setChecking] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const requiresSession =
    !!journal &&
    isCashJournal(journal) &&
    paymentMethodRequiresCashSession(paymentMethod);

  useEffect(() => {
    if (!requiresSession || !journal?.id) {
      setHasSession(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void fetchCurrentCashSession(journal.id).then((session) => {
      if (cancelled) return;
      setHasSession(!!session && cashSessionIsActive(session.state));
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [journal?.id, requiresSession]);

  if (!requiresSession) return null;
  if (checking || hasSession === null) {
    return <p className="muted">{t('admin.finance.cashDesk.checkingSession')}</p>;
  }
  if (hasSession) return null;

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

export function collectionBlockedByCashSession(input: {
  journal: PaymentJournal | null | undefined;
  paymentMethod: string;
  hasOpenSession: boolean | null;
}): boolean {
  if (
    !input.journal ||
    !isCashJournal(input.journal) ||
    !paymentMethodRequiresCashSession(input.paymentMethod)
  ) {
    return false;
  }
  return input.hasOpenSession === false;
}
