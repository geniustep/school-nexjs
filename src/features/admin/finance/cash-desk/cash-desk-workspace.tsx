'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { CashDeskPageHeader } from '@/features/admin/finance/cash-desk/cash-desk-page-header';
import { CashSessionDetailView } from '@/features/admin/finance/cash-desk/cash-session-detail-view';
import { CashSessionKpiSkeleton } from '@/features/admin/finance/cash-desk/cash-session-kpi-grid';
import { OpenCashSessionDialog } from '@/features/admin/finance/cash-desk/open-session-dialog';
import { useCashJournals } from '@/features/admin/finance/cash-desk/use-cash-journals';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/finance/cash-desk/cash-desk-ui.css';
import { fetchCashSession, fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { canOpenCashSession } from '@/lib/permissions/finance';
import { cashSessionDisplayNumber } from '@/lib/utils/cash-session-normalize';
import { refName } from '@/lib/utils/finance';
import { appendReturnTo, isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';
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

  const safeReturnTo =
    returnTo && isSafeInternalReturnPath(returnTo) ? returnTo : null;
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const selectedJournal = journals.find((j) => String(j.id) === journalId);

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

  const journalContext = selectedJournal
    ? `${selectedJournal.name}${selectedJournal.code ? ` (${selectedJournal.code})` : ''}`
    : null;

  return (
    <div className="cash-desk-workspace">
      <CashDeskPageHeader
        schoolName={activeSchool?.name ?? refName(activeSchool) ?? null}
        sessionState={session?.state ?? null}
        sessionLabel={session ? cashSessionDisplayNumber(session) : null}
        onRefresh={() => void loadSession()}
        refreshing={refreshing}
        returnTo={safeReturnTo}
      />

      {journals.length > 1 ? (
        <label className="field cash-desk-journal-picker">
          <span className="muted">{t('admin.finance.cashDesk.fields.journal')}</span>
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
        </label>
      ) : null}

      {loading && !session ? (
        <div className="skeleton-stack" aria-busy="true">
          <div className="skeleton skeleton--card" />
          <CashSessionKpiSkeleton />
        </div>
      ) : null}

      {error ? (
        <div className="card card--pad">
          <p className="form-error">{error}</p>
          <button type="button" className="btn btn--ghost" onClick={() => void loadSession()}>
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {!loading && !session ? (
        <article className="card cash-desk-no-session">
          <div className="cash-desk-no-session__content">
            <h2 className="cash-desk-no-session__title">{t('admin.finance.cashDesk.noSessionTitle')}</h2>
            <p className="cash-desk-no-session__desc">{t('admin.finance.cashDesk.noSessionDesc')}</p>
            {activeSchool?.name || journalContext ? (
              <p className="cash-desk-no-session__context">
                {[activeSchool?.name ?? refName(activeSchool), journalContext].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
          {canOpen ? (
            <div className="cash-desk-no-session__actions">
              <button type="button" className="btn btn--primary" onClick={() => setOpenDialog(true)}>
                {t('admin.finance.cashDesk.openAction')}
              </button>
            </div>
          ) : null}
        </article>
      ) : null}

      {session ? (
        <CashSessionDetailView
          session={session}
          onReload={() => void loadSession()}
          returnTo={appendReturnTo('/admin/finance/cash-desk', safeReturnTo ?? undefined)}
          showOverview
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
