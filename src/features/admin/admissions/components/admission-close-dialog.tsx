'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { executeAdmissionAction } from '../api/admissions-api';
import { mapAdmissionCloseActionError } from '../utils/admission-action-errors';
import { validateClose } from '../utils/admission-action-validation';

export function AdmissionCloseDialog({
  admissionId,
  applicationName,
  open,
  onClose,
  onSuccess,
  /**
   * `delete` = product copy for «حذف الطلب» (still Backend `close` — hard delete
   * is not available on current Runtime).
   */
  variant = 'close',
}: {
  admissionId: number;
  /** Student / application display name for confirmation context. */
  applicationName?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  variant?: 'close' | 'delete';
}) {
  const t = useT();
  const toast = useToast();
  const titleId = useId();
  const descId = useId();
  const errorId = useId();
  const noteId = useId();
  const { activeSchoolId } = useAdminSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitGuardRef = useRef(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const i18nRoot =
    variant === 'delete' ? 'admin.admissions.deleteDialog' : 'admin.admissions.closeDialog';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setFieldError(null);
    setServerError(null);
    setSubmitting(false);
    submitGuardRef.current = false;
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [open, admissionId]);

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

    const validationKey = validateClose({ note });
    if (validationKey) {
      setServerError(null);
      const fieldKey =
        variant === 'delete' && validationKey === 'admin.admissions.closeDialog.noteRequired'
          ? 'admin.admissions.deleteDialog.noteRequired'
          : validationKey;
      setFieldError(t(fieldKey));
      textareaRef.current?.focus();
      return;
    }

    const trimmed = note.trim();
    submitGuardRef.current = true;
    setSubmitting(true);
    setFieldError(null);
    setServerError(null);

    const res = await executeAdmissionAction(
      admissionId,
      {
        action: 'close',
        note: trimmed,
      },
      { active_school_id: activeSchoolId },
    );

    setSubmitting(false);
    submitGuardRef.current = false;

    if (res.success) {
      toast.success(t(`${i18nRoot}.success`));
      onSuccess();
      onClose();
      return;
    }

    const mapped = mapAdmissionCloseActionError(res.error);
    // Prefer delete-specific copy when the mapped key is under closeDialog.
    if (variant === 'delete' && mapped.startsWith('admin.admissions.closeDialog.')) {
      const suffix = mapped.slice('admin.admissions.closeDialog.'.length);
      setServerError(t(`admin.admissions.deleteDialog.${suffix}`));
    } else {
      setServerError(t(mapped));
    }
  }

  const displayName = applicationName?.trim() || null;
  const invalid = Boolean(fieldError);
  const testId = variant === 'delete' ? 'admission-delete-dialog' : 'admission-close-dialog';

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
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        data-testid={testId}
        data-variant={variant}
      >
        <h2 id={titleId}>{t(`${i18nRoot}.title`)}</h2>
        <p id={descId} className="muted">
          {t(`${i18nRoot}.description`)}
        </p>
        {displayName ? (
          <p
            className="admission-close-dialog__subject"
            dir="auto"
            data-testid={`${testId}-name`}
          >
            {displayName}
          </p>
        ) : null}

        <form className="form-stack" onSubmit={(e) => void submit(e)} noValidate>
          <div className="field">
            <label htmlFor={noteId}>{t(`${i18nRoot}.noteLabel`)}</label>
            <textarea
              ref={textareaRef}
              id={noteId}
              className="input"
              rows={4}
              value={note}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              aria-required="true"
              data-testid={`${testId}-note`}
              placeholder={t(`${i18nRoot}.notePlaceholder`)}
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
                data-testid={`${testId}-field-error`}
              >
                {fieldError}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <div
              className="alert alert--error"
              role="alert"
              data-testid={`${testId}-server-error`}
            >
              {serverError}
            </div>
          ) : null}

          <div className="row form-actions confirmation-dialog__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={submitting}
              data-testid={`${testId}-cancel`}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={variant === 'delete' ? 'btn btn--danger' : 'btn btn--primary'}
              disabled={submitting}
              aria-busy={submitting || undefined}
              data-testid={`${testId}-confirm`}
            >
              {submitting ? t(`${i18nRoot}.submitting`) : t(`${i18nRoot}.confirm`)}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
