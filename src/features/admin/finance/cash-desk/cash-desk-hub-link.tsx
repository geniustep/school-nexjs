'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconLayers } from '@/components/icons/admin-icons';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { CashDeskHubBadge } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { useCashJournals } from '@/features/admin/finance/cash-desk/use-cash-journals';
import { fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { canViewCashSessions } from '@/lib/permissions/finance';

export function CashDeskHubLink() {
  const user = useSession();
  const t = useT();
  const { journals } = useCashJournals();
  const [sessionState, setSessionState] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!canViewCashSessions(user) || !journals[0]?.id) {
      setSessionState(null);
      return;
    }
    let active = true;
    void fetchCurrentCashSession(journals[0].id).then((session) => {
      if (!active) return;
      setSessionState(session?.state ?? null);
    });
    return () => {
      active = false;
    };
  }, [journals, user]);

  if (!canViewCashSessions(user)) return null;

  return (
    <Link href="/admin/finance/cash-desk" className="card finance-hub-card">
      <span className="finance-hub-icon" aria-hidden>
        <IconLayers size={22} />
      </span>
      <div className="finance-hub-card-body">
        <div className="finance-hub-card-title-row">
          <strong>{t('admin.finance.cashDesk.hubTitle')}</strong>
          {sessionState !== undefined ? <CashDeskHubBadge state={sessionState} /> : null}
        </div>
        <p className="muted">{t('admin.finance.cashDesk.hubDesc')}</p>
      </div>
    </Link>
  );
}
