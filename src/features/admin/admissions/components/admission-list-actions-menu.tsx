'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { cn } from '@/lib/utils/cn';
import { AdmissionDecisionDialog } from './admission-decision-dialog';
import { AdmissionReopenDialog } from './admission-reopen-dialog';

type MenuCoords = { top: number; left: number };

function computeMenuCoords(trigger: HTMLElement): MenuCoords {
  const rect = trigger.getBoundingClientRect();
  const menuWidth = 224;
  const gap = 6;
  const dir = getComputedStyle(trigger).direction;
  const left =
    dir === 'rtl'
      ? Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))
      : Math.max(
          8,
          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
        );
  const top = Math.min(rect.bottom + gap, window.innerHeight - 24);
  return { top, left };
}

export function AdmissionListActionsMenu({
  admissionId,
  onUpdated,
  className,
  compact = false,
}: {
  admissionId: number;
  onUpdated?: () => void;
  className?: string;
  /** Icon-only trigger for dense Kanban cards. */
  compact?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const menuId = useId();
  const { activeSchoolId } = useAdminSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
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

  useLayoutEffect(() => {
    if (!open || !compact || !triggerRef.current) {
      setMenuCoords(null);
      return;
    }
    const update = () => {
      if (triggerRef.current) setMenuCoords(computeMenuCoords(triggerRef.current));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, compact]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const menuContent = open ? (
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      className={cn(
        'admissions-row-actions__menu',
        compact && 'admissions-row-actions__menu--portal',
      )}
      style={
        compact && menuCoords
          ? { top: menuCoords.top, left: menuCoords.left }
          : undefined
      }
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
              href={`/admin/admissions/${admissionId}?tab=offer_registration`}
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
  ) : null;

  return (
    <div
      className={cn(className, open && 'admissions-row-actions--open')}
      ref={rootRef}
      data-testid="admission-list-actions"
    >
      <button
        ref={triggerRef}
        type="button"
        className={
          compact
            ? 'btn btn--ghost btn--sm admissions-row-actions__trigger admissions-row-actions__trigger--compact'
            : 'btn btn--ghost btn--sm admissions-row-actions__trigger'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('admin.admissions.actions.menu')}
        title={t('admin.admissions.actions.menu')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleToggle();
        }}
      >
        {compact ? '⋮' : t('admin.admissions.actions.menu')}
      </button>

      {compact
        ? open && menuCoords && typeof document !== 'undefined'
          ? createPortal(menuContent, document.body)
          : null
        : menuContent}

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
