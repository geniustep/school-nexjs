'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail, AdmissionsBulkActionBlocker } from '@/types/admission';
import {
  executeAdmissionAction,
  executeAdmissionsBulkAction,
} from '../api/admissions-api';
import { mapAdmissionChangeStatusActionError } from '../utils/admission-action-errors';
import { validateChangeStatus } from '../utils/admission-action-validation';
import { normalizeAllowedStatusTargets } from '../utils/admission-modern-actions';
import { applicationStatusLabelKey } from '../utils/admission-modern-status';

function noteLabelKey(target: string): string {
  if (target === 'rejected') return 'admin.admissions.changeStatusDialog.noteLabelRejected';
  if (target === 'closed') return 'admin.admissions.changeStatusDialog.noteLabelClosed';
  return 'admin.admissions.changeStatusDialog.noteLabel';
}

export function AdmissionChangeStatusDialog({
  admissionId,
  admissionIds,
  applicationName,
  currentStatus,
  allowedStatusTargets,
  initialTargetStatus,
  open,
  onClose,
  onSuccess,
  onBulkSuccess,
  onBulkFailure,
}: {
  admissionId?: number;
  /** When set (length ≥ 1), uses bulk endpoint once. */
  admissionIds?: number[];
  applicationName?: string | null;
  currentStatus?: string | null;
  allowedStatusTargets?: unknown;
  /** Preselect target (e.g. Kanban drop). */
  initialTargetStatus?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (detail?: AdmissionDetail) => void;
  onBulkSuccess?: (result: {
    changed_count?: number | null;
    [key: string]: unknown;
  }) => void;
  onBulkFailure?: (blockers: AdmissionsBulkActionBlocker[]) => void;
}) {
  const t = useT();
  const toast = useToast();
  const titleId = useId();
  const descId = useId();
  const warningId = useId();
  const errorId = useId();
  const noteId = useId();
  const targetId = useId();
  const familyId = useId();
  const { activeSchoolId } = useAdminSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitGuardRef = useRef(false);
  const targets = useMemo(
    () => normalizeAllowedStatusTargets(allowedStatusTargets),
    [allowedStatusTargets],
  );
  const isBulk = Array.isArray(admissionIds) && admissionIds.length > 0;
  const [targetStatus, setTargetStatus] = useState('');
  const [note, setNote] = useState('');
  const [confirmFamily, setConfirmFamily] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<AdmissionsBulkActionBlocker[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const nextTargets = normalizeAllowedStatusTargets(allowedStatusTargets);
    const preferred =
      initialTargetStatus && nextTargets.includes(initialTargetStatus)
        ? initialTargetStatus
        : (nextTargets[0] ?? '');
    setTargetStatus(preferred);
    setNote('');
    setConfirmFamily(false);
    setFieldError(null);
    setServerError(null);
    setBlockers([]);
    setSubmitting(false);
    submitGuardRef.current = false;
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [open, admissionId, admissionIds, allowedStatusTargets, initialTargetStatus]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitGuardRef.current) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || submitGuardRef.current) return;

    const validationKey = validateChangeStatus({
      target_status: targetStatus,
      note,
      allowedTargets: targets,
      confirmFamilyApproval: confirmFamily,
    });
    if (validationKey) {
      setServerError(null);
      setFieldError(t(validationKey));
      if (validationKey.includes('note') || validationKey.includes('family')) {
        textareaRef.current?.focus();
      }
      return;
    }

    const trimmedNote = note.trim();
    const trimmedTarget = targetStatus.trim();
    const payloadBase = {
      action: 'change_status' as const,
      target_status: trimmedTarget,
      note: trimmedNote,
      ...(trimmedTarget === 'ready_for_registration'
        ? { confirm_family_approval: true }
        : {}),
    };

    submitGuardRef.current = true;
    setSubmitting(true);
    setFieldError(null);
    setServerError(null);
    setBlockers([]);

    if (isBulk) {
      const ids = [...new Set((admissionIds ?? []).filter((id) => id > 0))];
      const res = await executeAdmissionsBulkAction(
        {
          ...payloadBase,
          application_ids: ids,
        },
        { active_school_id: activeSchoolId },
      );
      setSubmitting(false);
      submitGuardRef.current = false;

      if (res.success) {
        const changed = res.data?.changed_count ?? ids.length;
        toast.success(
          t('admin.admissions.changeStatusDialog.bulkSuccess', { count: changed }),
        );
        onBulkSuccess?.(res.data ?? { changed_count: changed });
        onClose();
        return;
      }

      const rawBlockers = Array.isArray(res.data?.blockers)
        ? res.data.blockers
        : Array.isArray((res.error as { blockers?: AdmissionsBulkActionBlocker[] })?.blockers)
          ? ((res.error as { blockers: AdmissionsBulkActionBlocker[] }).blockers)
          : [];
      setBlockers(rawBlockers);
      onBulkFailure?.(rawBlockers);
      const mapped = mapAdmissionChangeStatusActionError(res.error);
      setServerError(mapped.startsWith('admin.') ? t(mapped) : mapped);
      return;
    }

    if (admissionId == null) {
      setSubmitting(false);
      submitGuardRef.current = false;
      return;
    }

    const res = await executeAdmissionAction(admissionId, payloadBase, {
      active_school_id: activeSchoolId,
    });

    setSubmitting(false);
    submitGuardRef.current = false;

    if (res.success) {
      toast.success(t('admin.admissions.changeStatusDialog.success'));
      onSuccess?.(res.data);
      onClose();
      return;
    }

    const mapped = mapAdmissionChangeStatusActionError(res.error);
    setServerError(mapped.startsWith('admin.') ? t(mapped) : mapped);
  }

  const displayName = applicationName?.trim() || null;
  const statusLabel = currentStatus?.trim()
    ? t(applicationStatusLabelKey(currentStatus.trim()))
    : t('common.dash');
  const invalid = Boolean(fieldError);
  const needsFamily = targetStatus === 'ready_for_registration';
  const fromLabel = currentStatus?.trim()
    ? t(applicationStatusLabelKey(currentStatus.trim()))
    : null;
  const toLabel = targetStatus
    ? t(applicationStatusLabelKey(targetStatus))
    : t('common.dash');

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="card modal-panel confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descId} ${warningId}`}
        onClick={(e) => e.stopPropagation()}
        data-testid="admission-change-status-dialog"
        data-bulk={isBulk ? 'true' : undefined}
      >
        <h2 id={titleId}>
          {isBulk
            ? t('admin.admissions.changeStatusDialog.bulkTitle')
            : t('admin.admissions.changeStatusDialog.title')}
        </h2>
        <p id={descId} className="muted">
          {isBulk
            ? t('admin.admissions.changeStatusDialog.bulkDescription', {
                count: admissionIds?.length ?? 0,
              })
            : t('admin.admissions.changeStatusDialog.description')}
        </p>
        <p
          id={warningId}
          className="alert alert--warning"
          role="status"
          data-testid="admission-change-status-warning"
        >
          {isBulk
            ? t('admin.admissions.changeStatusDialog.bulkAtomicWarning')
            : t('admin.admissions.changeStatusDialog.warning')}
        </p>
        {displayName && !isBulk ? (
          <p
            className="admission-close-dialog__subject"
            dir="auto"
            data-testid="admission-change-status-dialog-name"
          >
            {displayName}
          </p>
        ) : null}

        {!isBulk ? (
          <p className="muted tiny" data-testid="admission-change-status-current">
            {t('admin.admissions.changeStatusDialog.currentStatus')}: {statusLabel}
          </p>
        ) : (
          <p className="muted tiny" data-testid="admission-change-status-bulk-count">
            {t('admin.admissions.bulk.selectedCount', { count: admissionIds?.length ?? 0 })}
          </p>
        )}

        {initialTargetStatus && fromLabel ? (
          <p className="muted tiny" data-testid="admission-change-status-transition">
            {fromLabel} → {toLabel}
          </p>
        ) : null}

        <form className="form-stack" onSubmit={(e) => void submit(e)} noValidate>
          <div className="field">
            <label htmlFor={targetId}>{t('admin.admissions.changeStatusDialog.targetLabel')}</label>
            <select
              id={targetId}
              className="input"
              value={targetStatus}
              disabled={submitting || targets.length === 0}
              aria-required="true"
              data-testid="admission-change-status-target"
              onChange={(e) => {
                setTargetStatus(e.target.value);
                setConfirmFamily(false);
                if (fieldError) setFieldError(null);
              }}
            >
              {targets.length === 0 ? (
                <option value="">{t('admin.admissions.changeStatusDialog.noTargets')}</option>
              ) : null}
              {targets.map((code) => (
                <option key={code} value={code}>
                  {t(applicationStatusLabelKey(code))}
                </option>
              ))}
            </select>
          </div>

          {needsFamily ? (
            <div className="field">
              <label className="row" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
                <input
                  id={familyId}
                  type="checkbox"
                  checked={confirmFamily}
                  disabled={submitting}
                  data-testid="admission-change-status-family-approval"
                  onChange={(e) => {
                    setConfirmFamily(e.target.checked);
                    if (fieldError) setFieldError(null);
                  }}
                />
                <span>{t('admin.admissions.changeStatusDialog.familyApprovalConfirm')}</span>
              </label>
            </div>
          ) : null}

          <div className="field">
            <label htmlFor={noteId}>{t(noteLabelKey(targetStatus))}</label>
            <textarea
              ref={textareaRef}
              id={noteId}
              className="input"
              rows={4}
              value={note}
              dir="auto"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              aria-required="true"
              data-testid="admission-change-status-note"
              placeholder={t('admin.admissions.changeStatusDialog.notePlaceholder')}
              disabled={submitting}
              onChange={(e) => {
                setNote(e.target.value);
                if (fieldError) setFieldError(null);
              }}
            />
            {fieldError ? (
              <p
                id={errorId}
                className="field-error"
                role="alert"
                data-testid="admission-change-status-field-error"
              >
                {fieldError}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <div
              className="alert alert--error"
              role="alert"
              data-testid="admission-change-status-server-error"
            >
              {serverError}
            </div>
          ) : null}

          {blockers.length > 0 ? (
            <ul
              className="alert alert--error"
              data-testid="admission-change-status-blockers"
            >
              {blockers.map((blocker, index) => (
                <li key={`${blocker.application_id ?? blocker.id ?? index}-${index}`}>
                  {blocker.message ||
                    t('admin.admissions.changeStatusDialog.blockerFallback', {
                      id: blocker.application_id ?? blocker.id ?? '—',
                    })}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="row form-actions confirmation-dialog__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={submitting}
              data-testid="admission-change-status-cancel"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || targets.length === 0}
              aria-busy={submitting || undefined}
              data-testid="admission-change-status-confirm"
            >
              {submitting
                ? t('admin.admissions.changeStatusDialog.submitting')
                : t('admin.admissions.changeStatusDialog.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
