'use client';

/**
 * Quick governed message from Student Spotlight.
 * Odoo resolves the selected student / guardian audience and freezes recipients on submit.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/toast';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import {
  previewStudentAudienceCommunication,
  submitStudentAudienceCommunication,
} from '@/features/communication/api/admin-communication-api';
import { buildStudentRecipientScope } from '@/features/communication/utils/recipient-scope';
import { useT } from '@/features/i18n/locale-context';
import type { CommunicationRecipientSummary } from '@/types/communication';
import type { StudentRecipientScope } from '@/types/recipient-scope';
import type { StudentSearchHit } from '@/types/student-search';
import { studentSpotlightIdentityTitle } from '../utils/student-spotlight-utils';

type DeliverabilityState = 'idle' | 'checking' | 'ready' | 'blocked' | 'failed';

export function StudentSpotlightQuickMessageModal({
  student,
  onClose,
}: {
  student: StudentSearchHit;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [deliverability, setDeliverability] = useState<DeliverabilityState>('idle');
  const [preview, setPreview] = useState<CommunicationRecipientSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recipientName = studentSpotlightIdentityTitle(student) || String(student.id);
  const scope: StudentRecipientScope = buildStudentRecipientScope('guardians', student.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      openerRef.current?.focus();
    };
  }, [mounted]);

  useEffect(() => {
    let cancelled = false;
    const selectedScope = buildStudentRecipientScope('guardians', student.id);
    setDeliverability('checking');
    setPreview(null);
    setErrorMessage(null);

    void previewStudentAudienceCommunication({
      recipient_scope: selectedScope,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setDeliverability('failed');
        const key = communicationErrorMessageKey(result.error.code);
        setErrorMessage(
          key ? t(key) : result.error.message || t('communication.general.previewFailed'),
        );
        return;
      }

      const summary = result.preview.recipient_summary;
      setPreview(summary);
      if (summary.can_submit === true) {
        setDeliverability('ready');
        return;
      }

      setDeliverability('blocked');
      const blockingCode = summary.blocking_reasons?.[0];
      const key = communicationErrorMessageKey(blockingCode);
      setErrorMessage(key ? t(key) : t('communication.recipients.cannotSubmit'));
    });

    return () => {
      cancelled = true;
    };
  }, [student.id, t]);

  useEffect(() => {
    if (!mounted || deliverability === 'idle' || deliverability === 'checking') return;
    const focusTimer = window.setTimeout(() => subjectRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [mounted, deliverability]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (submitting) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), ' +
            'a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [onClose, submitting]);

  const canSubmit =
    !submitting &&
    deliverability === 'ready' &&
    preview?.can_submit === true &&
    subject.trim().length > 0 &&
    body.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMessage(null);
    const result = await submitStudentAudienceCommunication({
      subject: subject.trim(),
      body: body.trim(),
      recipient_scope: scope,
    });

    if (!result.success) {
      setSubmitting(false);
      const key = communicationErrorMessageKey(result.error.code);
      const message = key
        ? t(key)
        : result.error.message || t('communication.general.submitFailed');
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    toast.success(
      result.data?.pending_review
        ? t('communication.general.pendingReviewSuccess')
        : t('communication.general.acceptedSuccess'),
    );
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="student-spotlight-message-modal__backdrop"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="student-spotlight-message-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="student-spotlight-message-modal__header">
          <h3 id={titleId}>{t('communication.general.messageTitle')}</h3>
          <button
            type="button"
            className="student-spotlight-message-modal__close"
            aria-label={t('common.close')}
            disabled={submitting}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="student-spotlight-message-modal__recipient">
          <span>{t('admin.spotlight.studentType')}</span>
          <strong dir="auto">{recipientName}</strong>
        </div>

        <form className="student-spotlight-message-modal__form" onSubmit={handleSubmit}>
          <div className="student-spotlight-message-modal__audience">
            <span className="student-spotlight-message-modal__audience-label">
              {t('communication.audience')}
            </span>
            <strong>{t('communication.general.beneficiary.guardians')}</strong>
          </div>

          <label className="student-spotlight-message-modal__field">
            <span>{t('communication.general.subject')}</span>
            <input
              ref={subjectRef}
              className="input"
              value={subject}
              required
              aria-required="true"
              disabled={submitting}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>

          <label className="student-spotlight-message-modal__field">
            <span>{t('communication.body')}</span>
            <textarea
              className="input student-spotlight-message-modal__body"
              value={body}
              required
              aria-required="true"
              disabled={submitting}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>

          {deliverability === 'checking' ? (
            <p className="student-spotlight-message-modal__status" aria-live="polite">
              {t('communication.recipients.previewLoading')}
            </p>
          ) : deliverability === 'ready' && preview ? (
            <div className="student-spotlight-message-modal__preview" aria-live="polite">
              <strong>{t('communication.recipients.ready')}</strong>
              <span>
                {t('communication.recipients.deliverableUsers')}:{' '}
                <bdi>{preview.deliverable_user_count ?? '—'}</bdi>
              </span>
              <span>
                {t('communication.recipients.guardians')}:{' '}
                <bdi>{preview.guardian_count ?? '—'}</bdi>
              </span>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="student-spotlight-message-modal__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="student-spotlight-message-modal__actions">
            <button
              type="submit"
              className="btn btn--primary student-spotlight-message-modal__submit"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
            >
              {submitting ? t('common.submitting') : t('common.submit')}
            </button>
            <button
              type="button"
              className="btn btn--ghost student-spotlight-message-modal__cancel"
              disabled={submitting}
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
