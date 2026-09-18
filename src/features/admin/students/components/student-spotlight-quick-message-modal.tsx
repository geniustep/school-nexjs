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
import type {
  StudentBeneficiaryKind,
  StudentRecipientScope,
} from '@/types/recipient-scope';
import type { StudentSearchHit } from '@/types/student-search';
import { studentSpotlightIdentityTitle } from '../utils/student-spotlight-utils';

type DeliverabilityState = 'idle' | 'checking' | 'ready' | 'blocked' | 'failed';

const AUDIENCE_OPTIONS: Array<{
  kind: StudentBeneficiaryKind;
  labelKey: string;
}> = [
  { kind: 'guardians', labelKey: 'communication.general.beneficiary.guardians' },
  { kind: 'students', labelKey: 'communication.general.beneficiary.students' },
  {
    kind: 'students_and_guardians',
    labelKey: 'communication.general.beneficiary.studentsAndGuardians',
  },
];

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
  const audienceLabelId = useId();
  const subjectRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [beneficiaryKind, setBeneficiaryKind] = useState<StudentBeneficiaryKind | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [deliverability, setDeliverability] = useState<DeliverabilityState>('idle');
  const [preview, setPreview] = useState<CommunicationRecipientSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recipientName = studentSpotlightIdentityTitle(student) || String(student.id);
  const scope: StudentRecipientScope | null = beneficiaryKind
    ? buildStudentRecipientScope(beneficiaryKind, student.id)
    : null;

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
    if (!beneficiaryKind) {
      setDeliverability('idle');
      setPreview(null);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    const selectedScope = buildStudentRecipientScope(beneficiaryKind, student.id);
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
  }, [beneficiaryKind, student.id, t]);

  useEffect(() => {
    if (!mounted || deliverability === 'checking' || beneficiaryKind === null) return;
    const focusTimer = window.setTimeout(() => subjectRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [mounted, deliverability, beneficiaryKind]);

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
    scope !== null &&
    deliverability === 'ready' &&
    preview?.can_submit === true &&
    subject.trim().length > 0 &&
    body.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !scope) return;

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
          <div
            className="student-spotlight-message-modal__audience"
            role="radiogroup"
            aria-labelledby={audienceLabelId}
          >
            <span
              id={audienceLabelId}
              className="student-spotlight-message-modal__audience-label"
            >
              {t('communication.audience')}
            </span>
            <div className="student-spotlight-message-modal__audience-options">
              {AUDIENCE_OPTIONS.map((option) => {
                const selected = beneficiaryKind === option.kind;
                return (
                  <button
                    key={option.kind}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className="student-spotlight-message-modal__audience-option"
                    data-selected={selected ? 'true' : 'false'}
                    disabled={submitting}
                    onClick={() => setBeneficiaryKind(option.kind)}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
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

          {beneficiaryKind === null ? (
            <p className="student-spotlight-message-modal__status" aria-live="polite">
              {t('communication.general.incompleteSelection')}
            </p>
          ) : deliverability === 'checking' ? (
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
                {t('communication.recipients.students')}:{' '}
                <bdi>{preview.student_count ?? '—'}</bdi>
                {' · '}
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
