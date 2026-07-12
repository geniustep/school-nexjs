'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  acceptAdmissionOffer,
  fetchAdmission,
  patchAdmission,
} from '../api/admissions-api';
import { hasAdmissionAllowedAction } from '../utils/admission-allowed-actions';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import {
  buildContinueRegistrationHref,
  canContinueStudentRegistration,
} from '../utils/admission-registration';
import { canReopenAdmission } from '../utils/admission-rejection';
import { resolveRegistrationStatus } from '../utils/admission-status-display';
import {
  admissionManualStageLabelKey,
  evaluateManualStageChange,
  getAdmissionManualStageOptions,
  isAdmissionManualStage,
  type AdmissionManualStage,
} from '../utils/admission-stage-options';
import { normalizeAdmissionDecision } from '../utils/normalize-admission-decision';
import type { AdmissionDetail } from '@/types/admission';
import { AdmissionDecisionDialog } from './admission-decision-dialog';
import { AdmissionReopenDialog } from './admission-reopen-dialog';

export function AdmissionListActionsMenu({
  admissionId,
  onUpdated,
  className,
}: {
  admissionId: number;
  onUpdated?: () => void;
  className?: string;
}) {
  const t = useT();
  const toast = useToast();
  const menuId = useId();
  const { activeSchoolId } = useAdminSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdmissionDetail | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadDetail = useCallback(async () => {
    if (activeSchoolId == null) return null;
    setLoading(true);
    const res = await fetchAdmission(admissionId, { active_school_id: activeSchoolId });
    setLoading(false);
    if (!res.success) {
      toast.error(admissionApiErrorMessage(res.error, t));
      return null;
    }
    setDetail(res.data);
    return res.data;
  }, [activeSchoolId, admissionId, t, toast]);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!detail) await loadDetail();
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function afterSuccess() {
    setOpen(false);
    setDetail(null);
    onUpdated?.();
  }

  async function handleAcceptOffer() {
    if (!detail || activeSchoolId == null || busy) return;
    const offer = (detail.offers ?? []).find(
      (o) => o.state === 'sent' || o.state === 'pending',
    );
    if (!offer) {
      toast.error(t('admin.admissions.actions.noSentOffer'));
      return;
    }
    setBusy(true);
    const res = await acceptAdmissionOffer(detail.id, offer.id, {
      active_school_id: activeSchoolId,
    });
    setBusy(false);
    if (res.success) {
      toast.success(t('admin.admissions.actions.acceptOfferSuccess'));
      afterSuccess();
      return;
    }
    toast.error(admissionApiErrorMessage(res.error, t));
  }

  async function handleFollowUpState(state: AdmissionManualStage) {
    if (!detail || activeSchoolId == null || busy) return;
    const decision = evaluateManualStageChange(detail, state);
    if (!decision.apply || !decision.targetState) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const res = await patchAdmission(
      detail.id,
      { state: decision.targetState },
      { active_school_id: activeSchoolId },
    );
    setBusy(false);
    if (res.success) {
      toast.success(t('admin.admissions.stateChange.success'));
      afterSuccess();
      return;
    }
    toast.error(admissionApiErrorMessage(res.error, t));
  }

  const actions = detail?.allowed_actions;
  const canDecide = hasAdmissionAllowedAction(actions, 'decide');
  const canAcceptOffer = hasAdmissionAllowedAction(actions, 'accept_offer');
  const canChangeState =
    (hasAdmissionAllowedAction(actions, 'change_state') ||
      hasAdmissionAllowedAction(actions, 'edit')) &&
    detail != null &&
    isAdmissionManualStage(String(detail.state));
  const stageOptions = getAdmissionManualStageOptions();
  const currentDecision = detail ? normalizeAdmissionDecision(detail) : null;
  const registration = detail ? resolveRegistrationStatus(detail) : null;
  const showContinue =
    detail != null &&
    (registration?.status === 'awaiting_registration' ||
      String(detail.state) === 'confirmed') &&
    canContinueStudentRegistration(detail);
  const showReopen = detail != null && canReopenAdmission(detail);
  const studentId =
    detail && typeof detail.student_id === 'number' ? detail.student_id : null;

  return (
    <div className={className} ref={rootRef} data-testid="admission-list-actions">
      <button
        type="button"
        className="btn btn--ghost btn--sm admissions-row-actions__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleToggle();
        }}
      >
        {t('admin.admissions.actions.menu')}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="admissions-row-actions__menu"
          onClick={(e) => e.stopPropagation()}
        >
          {loading && !detail ? (
            <div className="admissions-row-actions__item muted">{t('common.loading')}</div>
          ) : null}

          {canDecide ? (
            <div className="admissions-row-actions__submenu" role="group">
              <span className="admissions-row-actions__label">
                {t('admin.admissions.actions.makeDecision')}
              </span>
              <button
                type="button"
                role="menuitem"
                className="admissions-row-actions__item"
                data-testid="admission-actions-open-decision"
                onClick={() => {
                  setOpen(false);
                  setDecisionOpen(true);
                }}
              >
                {t('admin.admissions.actions.recordDecision')}
              </button>
            </div>
          ) : null}

          {canChangeState ? (
            <div className="admissions-row-actions__submenu" role="group">
              <span className="admissions-row-actions__label">
                {t('admin.admissions.actions.changeFollowUp')}
              </span>
              {stageOptions.map((state) => (
                <button
                  key={state}
                  type="button"
                  role="menuitem"
                  className="admissions-row-actions__item"
                  disabled={busy || String(detail?.state) === state}
                  onClick={() => void handleFollowUpState(state)}
                >
                  {t(admissionManualStageLabelKey(state))}
                </button>
              ))}
            </div>
          ) : null}

          {canAcceptOffer ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              disabled={busy}
              onClick={() => void handleAcceptOffer()}
            >
              {t('admin.admissions.actions.acceptFamilyOffer')}
            </button>
          ) : null}

          {showContinue ? (
            <>
              <Link
                role="menuitem"
                className="admissions-row-actions__item"
                href={buildContinueRegistrationHref(admissionId)}
                onClick={() => setOpen(false)}
              >
                {t('admin.admissions.actions.continueRegistration')}
              </Link>
              {hasAdmissionAllowedAction(actions, 'get_prefill') ? (
                <Link
                  role="menuitem"
                  className="admissions-row-actions__item"
                  href={buildContinueRegistrationHref(admissionId)}
                  onClick={() => setOpen(false)}
                >
                  {t('admin.admissions.actions.openPrefill')}
                </Link>
              ) : null}
              {hasAdmissionAllowedAction(actions, 'link_student') ? (
                <Link
                  role="menuitem"
                  className="admissions-row-actions__item"
                  href={`/admin/admissions/${admissionId}?tab=registration`}
                  onClick={() => setOpen(false)}
                >
                  {t('admin.admissions.actions.linkExistingStudent')}
                </Link>
              ) : null}
            </>
          ) : null}

          {studentId != null ? (
            <Link
              role="menuitem"
              className="admissions-row-actions__item"
              href={`/admin/students/${studentId}`}
              onClick={() => setOpen(false)}
            >
              {t('admin.admissions.registration.openStudentProfile')}
            </Link>
          ) : null}

          {showReopen ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              onClick={() => {
                setOpen(false);
                setReopenOpen(true);
              }}
            >
              {t('admin.admissions.actions.reopen')}
            </button>
          ) : null}

          <Link
            role="menuitem"
            className="admissions-row-actions__item"
            href={`/admin/admissions/${admissionId}`}
            onClick={() => setOpen(false)}
          >
            {t('admin.admissions.selection.openDetail')}
          </Link>
        </div>
      ) : null}

      <AdmissionDecisionDialog
        admissionId={admissionId}
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        onSuccess={afterSuccess}
        initialDecision={currentDecision?.decision}
        initialNotes={currentDecision?.decision_notes}
        initialConditions={currentDecision?.conditions}
      />
      <AdmissionReopenDialog
        admissionId={admissionId}
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onSuccess={afterSuccess}
      />
    </div>
  );
}
