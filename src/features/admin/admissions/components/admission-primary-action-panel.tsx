'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import { acceptAdmissionOffer } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { buildAdmissionTabHref, type AdmissionTabId } from '../utils/admission-detail-tabs';
import {
  resolveAdmissionPrimaryAction,
  resolveAdmissionSecondaryActions,
  type AdmissionPrimaryAction,
  type AdmissionPrimaryActionInput,
  type AdmissionSecondaryAction,
} from '../utils/admission-primary-action';
import {
  evaluateManualStageChange,
  getAdmissionManualStageOptions,
  admissionManualStageLabelKey,
  type AdmissionManualStage,
} from '../utils/admission-stage-options';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import { AdmissionDecisionDialog } from './admission-decision-dialog';
import { AdmissionReopenDialog } from './admission-reopen-dialog';
import { normalizeAdmissionDecision } from '../utils/normalize-admission-decision';

export function AdmissionPrimaryActionPanel({
  detail,
  admissionId,
  onUpdated,
  onRequestEdit,
  className,
}: {
  detail: AdmissionPrimaryActionInput;
  admissionId: string | number;
  onUpdated: () => void;
  onRequestEdit?: () => void;
  className?: string;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { changeState, isPending } = useAdmissionStateChange(onUpdated);
  const savingStage = isPending(Number(admissionId));

  const primary = resolveAdmissionPrimaryAction(detail);
  const secondary = resolveAdmissionSecondaryActions(detail, primary);
  const currentDecision = normalizeAdmissionDecision(detail);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const goTab = useCallback(
    (tab: string) => {
      router.push(buildAdmissionTabHref(String(admissionId), tab as AdmissionTabId), {
        scroll: false,
      });
    },
    [admissionId, router],
  );

  async function handleAcceptOffer() {
    if (activeSchoolId == null || busy) return;
    const offer = (detail.offers ?? []).find(
      (o) => o.state === 'sent' || o.state === 'pending',
    );
    if (!offer?.id) {
      toast.error(t('admin.admissions.actions.noSentOffer'));
      return;
    }
    setBusy(true);
    const res = await acceptAdmissionOffer(Number(admissionId), offer.id, {
      active_school_id: activeSchoolId,
    });
    setBusy(false);
    if (res.success) {
      toast.success(t('admin.admissions.actions.acceptOfferSuccess'));
      onUpdated();
      return;
    }
    toast.error(admissionApiErrorMessage(res.error, t));
  }

  async function handleSuggestedStage() {
    const target = primary.suggestedState;
    if (!target || busy || savingStage) return;
    const decision = evaluateManualStageChange(detail, target);
    if (!decision.apply || !decision.targetState) return;
    setBusy(true);
    await changeState(Number(admissionId), decision.targetState);
    setBusy(false);
  }

  async function handleManualStage(next: AdmissionManualStage) {
    if (busy || savingStage) return;
    const decision = evaluateManualStageChange(detail, next);
    if (!decision.apply || !decision.targetState) {
      setStageOpen(false);
      return;
    }
    setBusy(true);
    await changeState(Number(admissionId), decision.targetState);
    setBusy(false);
    setStageOpen(false);
    setMenuOpen(false);
  }

  function runTarget(
    target: AdmissionPrimaryAction['target'] | AdmissionSecondaryAction['target'],
    actionKey?: string,
  ) {
    setMenuOpen(false);
    if (actionKey === 'edit' && onRequestEdit) {
      onRequestEdit();
      return;
    }
    if (target.kind === 'href') {
      router.push(target.href);
      return;
    }
    if (target.kind === 'tab') {
      goTab(target.tab);
      return;
    }
    if (target.kind === 'dialog') {
      if (target.dialog === 'decision') setDecisionOpen(true);
      else if (target.dialog === 'reopen') setReopenOpen(true);
      else if (target.dialog === 'accept_offer') void handleAcceptOffer();
      else if (target.dialog === 'change_stage') {
        if (primary.suggestedState && actionKey !== 'change_stage') {
          void handleSuggestedStage();
        } else {
          setStageOpen(true);
        }
      }
    }
  }

  function handlePrimaryClick() {
    if (primary.disabled || busy) return;
    if (
      primary.key.startsWith('follow_up_') &&
      primary.suggestedState &&
      primary.target.kind === 'dialog'
    ) {
      void handleSuggestedStage();
      return;
    }
    runTarget(primary.target, primary.key);
  }

  const intentClass =
    primary.intent === 'success'
      ? 'btn--primary'
      : primary.intent === 'danger'
        ? 'btn--danger'
        : primary.intent === 'warning'
          ? 'btn--secondary'
          : primary.intent === 'neutral'
            ? 'btn--ghost'
            : 'btn--primary';

  return (
    <section
      ref={rootRef}
      className={cn('admission-primary-action-panel', className)}
      aria-label={t('admin.admissions.primaryAction.title')}
      data-testid="admission-primary-action-panel"
    >
      <div className="admission-primary-action-panel__body">
        <div className="admission-primary-action-panel__copy">
          <h2 className="admission-primary-action-panel__title">
            {t('admin.admissions.primaryAction.title')}
          </h2>
          <p className="admission-primary-action-panel__desc muted">
            {t(primary.descriptionKey)}
          </p>
        </div>
        <div className="admission-primary-action-panel__actions">
          {primary.disabled ? (
            <span
              className="admission-primary-action-panel__readonly muted"
              data-testid="admission-primary-action-readonly"
            >
              {t(primary.labelKey)}
            </span>
          ) : primary.target.kind === 'href' ? (
            <Link
              href={primary.target.href}
              className={cn('btn btn--sm', intentClass)}
              data-testid="admission-primary-action-btn"
            >
              {t(primary.labelKey)}
            </Link>
          ) : (
            <button
              type="button"
              className={cn('btn btn--sm', intentClass)}
              data-testid="admission-primary-action-btn"
              disabled={busy || savingStage}
              onClick={handlePrimaryClick}
            >
              {busy || savingStage ? t('common.loading') : t(primary.labelKey)}
            </button>
          )}

          {secondary.length > 0 ? (
            <div className="admission-primary-action-panel__menu-wrap">
              <button
                type="button"
                className="btn btn--ghost btn--sm admission-primary-action-panel__more"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={t('admin.admissions.primaryAction.moreActions')}
                data-testid="admission-secondary-actions-trigger"
                onClick={() => setMenuOpen((v) => !v)}
              >
                ⋮
              </button>
              {menuOpen ? (
                <div
                  id={menuId}
                  role="menu"
                  className="admission-primary-action-panel__menu"
                  data-testid="admission-secondary-actions-menu"
                >
                  {secondary.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      role="menuitem"
                      className="admission-primary-action-panel__menu-item"
                      onClick={() => runTarget(action.target, action.key)}
                    >
                      {t(action.labelKey)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {stageOpen ? (
        <div
          className="admission-primary-action-panel__stage"
          data-testid="admission-change-stage-panel"
        >
          <p className="tiny muted">{t('admin.admissions.primaryAction.changeStage')}</p>
          <div className="admission-primary-action-panel__stage-options">
            {getAdmissionManualStageOptions().map((stage) => (
              <button
                key={stage}
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={busy || savingStage || String(detail.state) === stage}
                onClick={() => void handleManualStage(stage)}
              >
                {t(admissionManualStageLabelKey(stage))}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setStageOpen(false)}
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : null}

      <AdmissionDecisionDialog
        admissionId={Number(admissionId)}
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        onSuccess={() => {
          setDecisionOpen(false);
          onUpdated();
        }}
        initialDecision={currentDecision?.decision}
        initialNotes={currentDecision?.decision_notes}
        initialConditions={currentDecision?.conditions}
      />
      <AdmissionReopenDialog
        admissionId={Number(admissionId)}
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onSuccess={() => {
          setReopenOpen(false);
          onUpdated();
        }}
      />
    </section>
  );
}
