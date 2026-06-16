'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { CashSessionDetailView } from '@/features/admin/finance/cash-desk/cash-session-detail-view';
import { CashSessionStatusBadge } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { OpenCashSessionDialog } from '@/features/admin/finance/cash-desk/open-session-dialog';
import { useCashJournals } from '@/features/admin/finance/cash-desk/use-cash-journals';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/finance/finance-ui.css';
import { fetchCashSession, fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { canOpenCashSession } from '@/lib/permissions/finance';
import {
  cashSessionJournalLabel,
} from '@/lib/utils/cash-session-normalize';
import { refName } from '@/lib/utils/finance';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { CashSession } from '@/types/finance-cash-desk';

export function CashDeskWorkspace({ returnTo }: { returnTo?: string | null }) {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const { journals, loading: journalsLoading, error: journalsError, reload: reloadJournals } =
    useCashJournals();

  const [journalId, setJournalId] = useState('');
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const safeReturnTo = sanitizeReturnTo(returnTo, '/admin/finance/collections/new');
  const activeSchool = schools.find((s) => s.id === activeSchoolId);

  useEffect(() => {
    if (!journals.length) return;
    setJournalId((current) => current || String(journals[0].id));
  }, [journals]);

  const loadSession = useCallback(async () => {
    if (!journalId) {
      setSession(null);
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setError(null);
    const current = await fetchCurrentCashSession(journalId);
    if (!current) {
      setSession(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const detail = await fetchCashSession(current.id);
    setRefreshing(false);
    setLoading(false);
    if (!detail.success) {
      setError(detail.error.message);
      setSession(current);
      return;
    }
    setSession(detail.data);
  }, [journalId]);

  useEffect(() => {
    if (journalsLoading) return;
    setLoading(true);
    void loadSession();
  }, [journalId, journalsLoading, loadSession, activeSchoolId]);

  const canOpen = useMemo(
    () => !session && journals.length > 0 && canOpenCashSession(user),
    [session, journals.length, user],
  );

  const handleOpenSuccess = useCallback(
    (sessionId: number) => {
      setOpenDialog(false);
      if (sessionId > 0) {
        void loadSession();
        router.push(`/admin/finance/cash-desk/sessions/${sessionId}`);
        return;
      }
      void loadSession();
    },
    [loadSession, router],
  );

  if (journalsError) {
    return <ApiErrorView error={journalsError} onRetry={reloadJournals} />;
  }

  return (
    <div className="cash-desk-workspace">
      <PageHeader
        title={t('admin.finance.cashDesk.title')}
        subtitle={t('admin.finance.cashDesk.subtitle')}
        actions={
          <div className="row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void loadSession()}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              {refreshing ? t('common.refreshing') : t('common.refresh')}
            </button>
            <Link className="btn btn--ghost" href="/admin/finance/cash-desk/sessions">
              {t('admin.finance.cashDesk.sessionsHistory')}
            </Link>
            {returnTo ? (
              <Link className="btn btn--primary" href={safeReturnTo}>
                {t('admin.finance.cashDesk.returnToCollection')}
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="cash-desk-header-meta card card--pad">
        <dl className="detail-list compact">
          <div>
            <dt>{t('admin.finance.cashDesk.fields.school')}</dt>
            <dd>{activeSchool?.name ?? refName(activeSchool) ?? '—'}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.cashDesk.fields.journal')}</dt>
            <dd>
              {journals.length > 1 ? (
                <select
                  className="input input--inline"
                  value={journalId}
                  onChange={(e) => setJournalId(e.target.value)}
                  disabled={loading || refreshing}
                >
                  {journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.name}
                    </option>
                  ))}
                </select>
              ) : (
                journals[0]?.name ?? '—'
              )}
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.cashDesk.fields.currentSession')}</dt>
            <dd>
              {session ? (
                <>
                  {session.number ?? `#${session.id}`}{' '}
                  <CashSessionStatusBadge state={session.state} />
                </>
              ) : (
                t('admin.finance.cashDesk.noOpenSessionShort')
              )}
            </dd>
          </div>
          {session ? (
            <>
              <div>
                <dt>{t('admin.finance.cashDesk.fields.cashier')}</dt>
                <dd>{session.cashier_name ?? refName(session.cashier) ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.cashDesk.fields.journal')}</dt>
                <dd>{cashSessionJournalLabel(session) ?? '—'}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>

      {loading && !session ? (
        <div className="skeleton-stack" aria-busy="true">
          <div className="skeleton skeleton--card" />
          <div className="skeleton skeleton--card" />
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {!loading && !session ? (
        <EmptyState
          title={t('admin.finance.cashDesk.noSessionTitle')}
          description={t('admin.finance.cashDesk.noSessionDesc')}
          action={
            canOpen ? (
              <button type="button" className="btn btn--primary" onClick={() => setOpenDialog(true)}>
                {t('admin.finance.cashDesk.openAction')}
              </button>
            ) : undefined
          }
        />
      ) : null}

      {session ? (
        <CashSessionDetailView
          session={session}
          onReload={() => void loadSession()}
          returnTo={appendReturnTo('/admin/finance/cash-desk', safeReturnTo)}
        />
      ) : null}

      <OpenCashSessionDialog
        open={openDialog}
        journals={journals}
        defaultJournalId={journalId}
        onClose={() => setOpenDialog(false)}
        onSuccess={handleOpenSuccess}
      />
    </div>
  );
}
