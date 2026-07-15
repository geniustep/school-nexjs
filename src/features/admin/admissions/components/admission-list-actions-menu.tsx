'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  executeAdmissionAction,
  fetchAdmission,
} from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { mapAdmissionActionError } from '../utils/admission-action-errors';
import {
  canShowChangeStatusAction,
  filterDailyModernActions,
  hasModernContract,
  isModernActionAllowed,
  resolvePrimaryNextActionCode,
  resolveStudentNavigation,
  shouldShowConvertToStudentAction,
} from '../utils/admission-modern-actions';
import { modernActionLabelKey } from '../utils/admission-operational-labels';
import { resolveApplicationStatus } from '../utils/admission-modern-status';
import { buildContinueRegistrationHref } from '../utils/admission-registration';
import type { AdmissionDetail } from '@/types/admission';
import { cn } from '@/lib/utils/cn';
import { AdmissionQuickFollowUpDialog } from './admission-quick-follow-up-dialog';
import { AdmissionModernDecisionDialog } from './admission-modern-decision-dialogs';
import { AdmissionReopenDialog } from './admission-reopen-dialog';
import { AdmissionCloseDialog } from './admission-close-dialog';
import { AdmissionChangeStatusDialog } from './admission-change-status-dialog';

type MenuCoords = { top: number; left: number };
type DecisionAction =
  | 'accept'
  | 'reject'
  | 'record_family_approval'
  | 'accept_and_record_family_approval';

function computeMenuCoords(trigger: HTMLElement, menuEl?: HTMLElement | null): MenuCoords {
  const rect = trigger.getBoundingClientRect();
  const menuWidth = Math.max(224, menuEl?.offsetWidth ?? 224);
  const menuHeight = Math.max(160, menuEl?.offsetHeight ?? 240);
  const gap = 6;
  const margin = 8;
  const dir = getComputedStyle(trigger).direction;
  const left =
    dir === 'rtl'
      ? Math.max(margin, Math.min(rect.left, window.innerWidth - menuWidth - margin))
      : Math.max(
          margin,
          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - margin),
        );
  const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
  const top = openUpward
    ? Math.max(margin, rect.top - gap - Math.min(menuHeight, spaceAbove))
    : Math.min(rect.bottom + gap, window.innerHeight - margin);
  return { top, left };
}

export function AdmissionListActionsMenu({
  admissionId,
  listItem,
  onUpdated,
  className,
  compact = false,
}: {
  admissionId: number;
  /** Optional list row seed so modern actions can open without waiting for detail fetch. */
  listItem?: {
    application_status?: string | null;
    student_name?: string | null;
    primary_next_action?: AdmissionDetail['primary_next_action'];
    modern_allowed_actions?: AdmissionDetail['modern_allowed_actions'];
    exception_actions?: AdmissionDetail['exception_actions'];
    allowed_return_targets?: AdmissionDetail['allowed_return_targets'];
    allowed_status_targets?: AdmissionDetail['allowed_status_targets'];
    navigation?: AdmissionDetail['navigation'];
    student_id?: number | false | null;
    last_action?: AdmissionDetail['last_action'];
  } | null;
  onUpdated?: (detail?: AdmissionDetail) => void;
  className?: string;
  compact?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const menuId = useId();
  const { activeSchoolId } = useAdminSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdmissionDetail | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<DecisionAction | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
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
    if (!open || !triggerRef.current) {
      setMenuCoords(null);
      return;
    }
    const update = () => {
      if (triggerRef.current) {
        setMenuCoords(computeMenuCoords(triggerRef.current, menuRef.current));
      }
    };
    update();
    const raf = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, detail, loading]);

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

  function afterSuccess(next?: AdmissionDetail) {
    setOpen(false);
    if (next) setDetail(next);
    onUpdated?.(next);
  }

  async function runSimpleAction(action: string) {
    if (activeSchoolId == null || busy) return;
    setBusy(true);
    const needsConfirm =
      action === 'record_family_approval' || action === 'accept_and_record_family_approval';
    const res = await executeAdmissionAction(
      admissionId,
      { action, ...(needsConfirm ? { confirmed: true } : {}) },
      { active_school_id: activeSchoolId },
    );
    setBusy(false);
    if (!res.success) {
      const mapped = mapAdmissionActionError(res.error);
      toast.error(mapped.startsWith('admin.') ? t(mapped) : mapped);
      return;
    }
    toast.success(t('common.saved'));
    afterSuccess(res.data);
    if (action === 'convert_to_student') {
      router.push(buildContinueRegistrationHref(admissionId));
    }
  }

  const seed = (detail ?? listItem) as
    | (Pick<
        AdmissionDetail,
        | 'application_status'
        | 'primary_next_action'
        | 'modern_allowed_actions'
        | 'exception_actions'
        | 'allowed_return_targets'
        | 'allowed_status_targets'
        | 'navigation'
        | 'student_id'
        | 'last_action'
      > &
        Partial<AdmissionDetail>)
    | null;
  const modern = seed ? hasModernContract(seed) : false;
  const status = seed ? resolveApplicationStatus(seed) : null;
  const registered = status === 'registered';
  const primaryCode = seed ? resolvePrimaryNextActionCode(seed.primary_next_action) : null;
  const dailyActions = seed ? filterDailyModernActions(seed.modern_allowed_actions) : [];
  const studentNav = seed
    ? resolveStudentNavigation(seed.navigation, seed.student_id)
    : null;
  const canChangeStatus = Boolean(seed && canShowChangeStatusAction(seed));

  const canLogContact =
    modern &&
    (primaryCode === 'log_contact' || isModernActionAllowed(seed?.modern_allowed_actions, 'log_contact'));
  const canAccept = modern && isModernActionAllowed(seed?.modern_allowed_actions, 'accept');
  const canReject = modern && isModernActionAllowed(seed?.modern_allowed_actions, 'reject');
  const canFamily =
    modern && isModernActionAllowed(seed?.modern_allowed_actions, 'record_family_approval');
  const canCombined =
    modern &&
    isModernActionAllowed(seed?.modern_allowed_actions, 'accept_and_record_family_approval');
  const canConvert =
    modern &&
    (shouldShowConvertToStudentAction(seed ?? {}) || primaryCode === 'convert_to_student');
  const canReopen = modern && isModernActionAllowed(seed?.modern_allowed_actions, 'reopen');
  const canClose = modern && isModernActionAllowed(seed?.modern_allowed_actions, 'close');

  const showPrimaryOnly =
    primaryCode &&
    dailyActions.some((a) => a.code === primaryCode) &&
    !registered;

  const menuContent = open ? (
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      className="admissions-row-actions__menu admissions-row-actions__menu--portal"
      style={
        menuCoords
          ? { top: menuCoords.top, left: menuCoords.left }
          : { top: -9999, left: -9999, visibility: 'hidden' as const }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {loading && !detail ? (
        <div className="admissions-row-actions__item muted">{t('common.loading')}</div>
      ) : null}

      {registered || studentNav?.href ? (
        studentNav?.href ? (
          <Link
            href={studentNav.href}
            role="menuitem"
            className="admissions-row-actions__item"
            data-testid="admission-actions-open-student"
            onClick={() => setOpen(false)}
          >
            {t('admin.admissions.registration.openStudentProfile')}
          </Link>
        ) : null
      ) : null}

      {!registered && modern ? (
        <>
          {showPrimaryOnly && primaryCode === 'log_contact' ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-log-contact"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setFollowUpOpen(true), 0);
              }}
            >
              {t(modernActionLabelKey('log_contact'))}
            </button>
          ) : null}

          {canLogContact && primaryCode !== 'log_contact' ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-log-contact"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setFollowUpOpen(true), 0);
              }}
            >
              {t(modernActionLabelKey('log_contact'))}
            </button>
          ) : null}

          {canAccept ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-accept"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setDecisionAction('accept'), 0);
              }}
            >
              {t(modernActionLabelKey('accept'))}
            </button>
          ) : null}

          {canReject ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-reject"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setDecisionAction('reject'), 0);
              }}
            >
              {t(modernActionLabelKey('reject'))}
            </button>
          ) : null}

          {canFamily ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-family-approval"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setDecisionAction('record_family_approval'), 0);
              }}
            >
              {t(modernActionLabelKey('record_family_approval'))}
            </button>
          ) : null}

          {canCombined ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-accept-and-family"
              disabled={busy}
              onClick={() => void runSimpleAction('accept_and_record_family_approval')}
            >
              {t(modernActionLabelKey('accept_and_record_family_approval'))}
            </button>
          ) : null}

          {canConvert || primaryCode === 'convert_to_student' ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-convert"
              disabled={busy}
              onClick={() => void runSimpleAction('convert_to_student')}
            >
              {t(modernActionLabelKey('convert_to_student'))}
            </button>
          ) : null}

          {canClose ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              disabled={busy}
              data-testid="admission-actions-close"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setCloseOpen(true), 0);
              }}
            >
              {t(modernActionLabelKey('close'))}
            </button>
          ) : null}

          {canChangeStatus ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              disabled={busy}
              data-testid="admission-actions-change-status"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setChangeStatusOpen(true), 0);
              }}
            >
              {t(modernActionLabelKey('change_status'))}
            </button>
          ) : null}

          {canReopen ? (
            <button
              type="button"
              role="menuitem"
              className="admissions-row-actions__item"
              data-testid="admission-actions-reopen"
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setReopenOpen(true), 0);
              }}
            >
              {t(modernActionLabelKey('reopen'))}
            </button>
          ) : null}
        </>
      ) : null}

      <Link
        href={`/admin/admissions/${admissionId}`}
        role="menuitem"
        className="admissions-row-actions__item"
        onClick={() => setOpen(false)}
      >
        {t('admin.admissions.selection.openDetail')}
      </Link>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cn('admissions-row-actions', compact && 'admissions-row-actions--compact', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn('btn btn--ghost btn--sm', compact && 'admissions-row-actions__trigger--icon')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('admin.admissions.table.actions')}
        data-testid="admission-row-actions-trigger"
        onClick={() => void handleToggle()}
      >
        {compact ? '⋮' : t('admin.admissions.table.actions')}
      </button>
      {open && menuCoords && typeof document !== 'undefined'
        ? createPortal(menuContent, document.body)
        : null}

      <AdmissionQuickFollowUpDialog
        admissionId={admissionId}
        open={followUpOpen}
        onClose={() => {
          setFollowUpOpen(false);
          triggerRef.current?.focus();
        }}
        onSuccess={() => {
          afterSuccess();
          void loadDetail();
        }}
      />
      <AdmissionModernDecisionDialog
        admissionId={admissionId}
        action={decisionAction ?? 'accept'}
        open={decisionAction != null}
        onClose={() => {
          setDecisionAction(null);
          triggerRef.current?.focus();
        }}
        onSuccess={() => {
          afterSuccess();
          void loadDetail();
        }}
      />
      <AdmissionReopenDialog
        admissionId={admissionId}
        open={reopenOpen}
        onClose={() => {
          setReopenOpen(false);
          triggerRef.current?.focus();
        }}
        onSuccess={() => {
          afterSuccess();
          void loadDetail();
        }}
      />
      <AdmissionCloseDialog
        admissionId={admissionId}
        applicationName={
          (detail?.student_name as string | undefined) ||
          listItem?.student_name ||
          null
        }
        open={closeOpen}
        onClose={() => {
          setCloseOpen(false);
          triggerRef.current?.focus();
        }}
        onSuccess={() => {
          afterSuccess();
          void loadDetail();
        }}
      />
      <AdmissionChangeStatusDialog
        admissionId={admissionId}
        applicationName={
          (detail?.student_name as string | undefined) ||
          listItem?.student_name ||
          null
        }
        currentStatus={status}
        allowedStatusTargets={
          detail?.allowed_status_targets ?? listItem?.allowed_status_targets ?? []
        }
        open={changeStatusOpen}
        onClose={() => {
          setChangeStatusOpen(false);
          triggerRef.current?.focus();
        }}
        onSuccess={(next) => {
          afterSuccess(next);
          void loadDetail();
        }}
      />
    </div>
  );
}
