'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {useLocale} from '@/features/i18n/locale-context';
import {copy as cashBoxCopy} from '@/features/admin/finance/cash-boxes/copy';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { readRecords, readTotal, type CashRecord } from '@/features/admin/finance/cash-boxes/model';
import { ApiErrorView } from '@/components/states/states';
import { InfoBanner } from '@/components/ui/primitives';
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
import {
  cashDeskHasOpenSession,
  cashSessionCashierName,
  cashSessionOwnedByUser,
} from '@/lib/utils/cash-session-access';
import { cashSessionDisplayNumber } from '@/lib/utils/cash-session-normalize';
import { refName } from '@/lib/utils/finance';
import { appendReturnTo, isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';
import type { CashSession } from '@/types/finance-cash-desk';

export function CashDeskWorkspace({ returnTo }: { returnTo?: string | null }) {
  const t = useT();
  const {locale} = useLocale();
  const cbText = cashBoxCopy[locale==='en'||locale==='fr'?locale:'ar'];
  const router = useRouter();
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const { journals, loading: journalsLoading, error: journalsError, reload: reloadJournals } =
    useCashJournals();

  const [journalId, setJournalId] = useState('');
  const [boxId, setBoxId] = useState('');
  const [cashBoxes, setCashBoxes] = useState<CashRecord[]>([]);
  const [boxScopeId, setBoxScopeId] = useState<number | null>(null);
  const [boxLookupError, setBoxLookupError] = useState<string | null>(null);
  const requestEpoch = useRef(0);
  const scopedBoxes = boxScopeId===activeSchoolId ? cashBoxes : [];
  const eligibleBoxes = scopedBoxes.filter(b=>String(b.journal_id)===journalId);
  const selectedBoxId = eligibleBoxes.length===1?String(eligibleBoxes[0].id):eligibleBoxes.some(b=>String(b.id)===boxId)?boxId:'';
  const boxSelectionMissing = eligibleBoxes.length>1 && !selectedBoxId;
  const boxesReady = boxScopeId===activeSchoolId && !boxLookupError;
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const safeReturnTo =
    returnTo && isSafeInternalReturnPath(returnTo) ? returnTo : null;
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const selectedJournal = journals.find((j) => String(j.id) === journalId);
  const hasOpenSession = cashDeskHasOpenSession(session);
  const sharedSession =
    hasOpenSession && session != null && !cashSessionOwnedByUser(session, user?.id);
  const sharedCashierName = sharedSession ? cashSessionCashierName(session) : undefined;

  useEffect(() => {
    requestEpoch.current++;
    setJournalId('');setBoxId('');setSession(null);setCashBoxes([]);setBoxScopeId(null);setBoxLookupError(null);
    if(!activeSchoolId)return;
    let canceled=false;
    void api.get<unknown>(endpoints.admin.financeCashBoxes,{active_school_id:activeSchoolId,limit:100}).then(res=>{
      if(canceled)return;
      const items=res.success?readRecords(res.data):[];
      if(!res.success||readTotal(res.meta,items.length)>items.length){setBoxLookupError(cbText.failed);}else{setCashBoxes(items);setBoxLookupError(null);}
      setBoxScopeId(activeSchoolId);
    }).catch(()=>{if(!canceled){setBoxLookupError(cbText.failed);setBoxScopeId(activeSchoolId);}});
    return()=>{canceled=true;};
  },[activeSchoolId,cbText.failed]);
  useEffect(() => {
    if (!journals.length) return;
    setJournalId((current) => current || String(journals[0].id));
  }, [journals]);

  const loadSession = useCallback(async () => {
    const epoch=++requestEpoch.current;
    if (!journalId || !boxesReady || boxSelectionMissing) {
      setSession(null);setLoading(!boxesReady && !boxLookupError);setRefreshing(false);
      return;
    }
    setRefreshing(true);
    setError(null);
    const current = await fetchCurrentCashSession(journalId,selectedBoxId||undefined);
    if(epoch!==requestEpoch.current)return;
    if (!current) {
      setSession(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const detail = await fetchCashSession(current.id);
    if(epoch!==requestEpoch.current)return;
    setRefreshing(false);
    setLoading(false);
    if (!detail.success) {
      setError(detail.error.message);
      setSession(current);
      return;
    }
    setSession(detail.data);
  }, [journalId,selectedBoxId,boxesReady,boxSelectionMissing,boxLookupError]);

  useEffect(() => {
    if (journalsLoading) return;
    setLoading(true);
    void loadSession();
  }, [journalId, journalsLoading, loadSession, activeSchoolId]);

  const canOpen = useMemo(
    () => !hasOpenSession && !!journalId && boxesReady && !boxSelectionMissing && canOpenCashSession(user),
    [hasOpenSession,journalId,boxesReady,boxSelectionMissing,user],
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
      <nav className="cb-actions" aria-label={cbText.boxes}><Link className="btn btn--ghost" href="/admin/finance/cash-boxes">{cbText.boxes}</Link><Link className="btn btn--ghost" href="/admin/finance/cash-transfers">{cbText.transfers}</Link><Link className="btn btn--ghost" href="/admin/finance/cash-handovers">{cbText.handovers}</Link></nav>
      <CashDeskPageHeader
        schoolName={activeSchool?.name ?? refName(activeSchool) ?? null}
        sessionState={hasOpenSession ? session?.state ?? null : null}
        sessionLabel={hasOpenSession && session ? cashSessionDisplayNumber(session) : null}
        onRefresh={() => void loadSession()}
        refreshing={refreshing}
        returnTo={safeReturnTo}
      />

      {sharedSession ? (
        <InfoBanner
          tone="amber"
          icon="!"
          title={t('admin.finance.cashDesk.sharedSessionBannerTitle')}
          description={t('admin.finance.cashDesk.sharedSessionBannerDesc', {
            cashierName: sharedCashierName ?? t('common.dash'),
          })}
        />
      ) : null}

      {journals.length > 1 ? (
        <label className="field cash-desk-journal-picker">
          <span className="muted">{t('admin.finance.cashDesk.fields.journal')}</span>
          <select
            className="input input--inline"
            value={journalId}
            onChange={(e) => {setJournalId(e.target.value);setBoxId('');setSession(null);}}
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

      {boxLookupError ? <p role="alert" className="form-error">{boxLookupError}</p> : null}
      {eligibleBoxes.length>0 ? <label className="field cash-desk-journal-picker"><span className="muted">{cbText.boxRequired}</span><select className="input input--inline" value={selectedBoxId} onChange={e=>{setBoxId(e.target.value);setSession(null);}} disabled={!boxesReady||refreshing}>{eligibleBoxes.length>1?<option value="">—</option>:null}{eligibleBoxes.map(b=><option key={b.id} value={b.id}>{b.name} · #{b.id}</option>)}</select></label> : null}
      {boxSelectionMissing?<p role="status">{cbText.boxRequired}</p>:null}
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

      {!loading && !hasOpenSession ? (
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

      {hasOpenSession && session ? (
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
        existingSession={hasOpenSession ? session : null}
        cashBoxes={scopedBoxes}
        defaultCashBoxId={selectedBoxId||undefined}
        onClose={() => setOpenDialog(false)}
        onSuccess={handleOpenSuccess}
      />
    </div>
  );
}
