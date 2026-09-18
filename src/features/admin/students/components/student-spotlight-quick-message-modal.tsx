'use client';

/**
 * Lightweight individual message flow for Student Spotlight.
 * Reuses the governed Communication individual preview + submit contract.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/toast';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import { previewIndividualCommunication } from '@/features/communication/api/admin-communication-api';
import { submitIndividualGeneralCommunication } from '@/features/communication/api/submit-general-communication';
import {
  individualDeliverabilityMessageKey,
  isIndividualSubmitAllowed,
} from '@/features/communication/utils/individual-deliverability';
import { useT } from '@/features/i18n/locale-context';
import type { IndividualCommunicationPreview } from '@/types/communication';
import type { IndividualRecipientScope } from '@/types/recipient-scope';
import type { StudentSearchHit } from '@/types/student-search';
import { studentSpotlightIdentityTitle } from '../utils/student-spotlight-utils';

type DeliverabilityState = 'checking' | 'ready' | 'blocked' | 'failed';

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
  const subjectRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [deliverability, setDeliverability] = useState<DeliverabilityState>('checking');
  const [preview, setPreview] = useState<IndividualCommunicationPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recipientName = studentSpotlightIdentityTitle(student) || String(student.id);
  const scope: IndividualRecipientScope = {
    scope_type: 'individual',
    recipient_type: 'student',
    recipient_id: student.id,
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => subjectRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      openerRef.current?.focus();
    };
  }, [mounted]);

  useEffect(() => {
    let cancelled = false;
    setDeliverability('checking');
    setPreview(null);
    setErrorMessage(null);

    void previewIndividualCommunication({
      recipient_type: 'student',
      recipient_id: student.id,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setDeliverability('failed');
        const key = communicationErrorMessageKey(result.error.code);
        setErrorMessage(
          key ? t(key) : result.error.message || t('communication.general.submitFailed'),
        );
        return;
      }

      setPreview(result.preview);
      if (isIndividualSubmitAllowed(result.preview)) {
        setDeliverability('ready');
        return;
      }

      setDeliverability('blocked');
      setErrorMessage(t(individualDeliverabilityMessageKey(result.preview)));
    });

    return () => {
      cancelled = true;
    };
  }, [student.id, t]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || submitting) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [onClose, submitting]);

  const canSubmit =
    !submitting &&
    deliverability === 'ready' &&
    isIndividualSubmitAllowed(preview) &&
    subject.trim().length > 0 &&
    body.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMessage(null);
    const result = await submitIndividualGeneralCommunication({
      scope,
      subject: subject.trim(),
      body: body.trim(),
    });

    if (!result.ok) {
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
      result.outcome.kind === 'pending_review'
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
          <span>{t('communication.audience')}</span>
          <strong dir="auto">{recipientName}</strong>
        </div>

        <form className="student-spotlight-message-modal__form" onSubmit={handleSubmit}>
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
              {t('communication.general.individualDeliverabilityChecking')}
            </p>
          ) : deliverability === 'ready' ? (
            <p className="student-spotlight-message-modal__status" aria-live="polite">
              {t('communication.general.individualDeliverabilityReady')}
            </p>
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
