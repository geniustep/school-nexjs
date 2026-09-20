'use client';

/**
 * Quick governed message from Student Spotlight.
 * Odoo resolves student / guardian deliverability and freezes recipients on submit.
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

type AudienceDiscoveryState = 'checking' | 'ready' | 'empty' | 'failed';

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

function isDeliverable(summary: CommunicationRecipientSummary | null | undefined): boolean {
  return (
    (summary?.deliverable_user_count ?? 0) > 0 &&
    summary?.can_submit === true
  );
}

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstAudienceRef = useRef<HTMLButtonElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [discoveryState, setDiscoveryState] = useState<AudienceDiscoveryState>('checking');
  const [availableKinds, setAvailableKinds] = useState<StudentBeneficiaryKind[]>([]);
  const [selectedKind, setSelectedKind] = useState<StudentBeneficiaryKind | null>(null);
  const [previews, setPreviews] = useState<
    Partial<Record<StudentBeneficiaryKind, CommunicationRecipientSummary>>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recipientName = studentSpotlightIdentityTitle(student) || String(student.id);
  const selectedPreview = selectedKind ? previews[selectedKind] ?? null : null;
  const scope: StudentRecipientScope | null = selectedKind
    ? buildStudentRecipientScope(selectedKind, student.id)
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
    let cancelled = false;

    setDiscoveryState('checking');
    setAvailableKinds([]);
    setSelectedKind(null);
    setPreviews({});
    setErrorMessage(null);

    const preview = (kind: StudentBeneficiaryKind) =>
      previewStudentAudienceCommunication({
        recipient_scope: buildStudentRecipientScope(kind, student.id),
      });

    void Promise.all([
      preview('guardians'),
      preview('students'),
      preview('students_and_guardians'),
    ]).then(([guardiansResult, studentsResult, combinedResult]) => {
      if (cancelled) return;

      const baseFailure = !guardiansResult.ok
        ? guardiansResult
        : !studentsResult.ok
          ? studentsResult
          : null;
      if (baseFailure && !baseFailure.ok) {
        setDiscoveryState('failed');
        const key = communicationErrorMessageKey(baseFailure.error.code);
        setErrorMessage(
          key ? t(key) : baseFailure.error.message || t('communication.general.previewFailed'),
        );
        return;
      }

      if (!guardiansResult.ok || !studentsResult.ok) return;

      const guardianSummary = guardiansResult.preview.recipient_summary;
      const studentSummary = studentsResult.preview.recipient_summary;
      const combinedSummary = combinedResult.ok
        ? combinedResult.preview.recipient_summary
        : undefined;

      const nextPreviews: Partial<
        Record<StudentBeneficiaryKind, CommunicationRecipientSummary>
      > = {
        guardians: guardianSummary,
        students: studentSummary,
      };
      if (combinedSummary) {
        nextPreviews.students_and_guardians = combinedSummary;
      }

      const guardianReady = isDeliverable(guardianSummary);
      const studentReady = isDeliverable(studentSummary);
      const nextKinds: StudentBeneficiaryKind[] = [];

      if (guardianReady) nextKinds.push('guardians');
      if (studentReady) nextKinds.push('students');
      if (
        guardianReady &&
        studentReady &&
        combinedResult.ok &&
        isDeliverable(combinedSummary)
      ) {
        nextKinds.push('students_and_guardians');
      }

      setPreviews(nextPreviews);
      setAvailableKinds(nextKinds);
      setSelectedKind(nextKinds.length === 1 ? nextKinds[0] : null);
      setDiscoveryState(nextKinds.length > 0 ? 'ready' : 'empty');
    });

    return () => {
      cancelled = true;
    };
  }, [student.id, t]);

  useEffect(() => {
    if (!mounted || discoveryState !== 'ready') return;

    const focusTimer = window.setTimeout(() => {
      if (availableKinds.length > 1 && !selectedKind) {
        firstAudienceRef.current?.focus();
        return;
      }
      if (selectedKind) {
        subjectRef.current?.focus();
      }
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [availableKinds.length, discoveryState, mounted, selectedKind]);

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
    discoveryState === 'ready' &&
    scope !== null &&
    isDeliverable(selectedPreview) &&
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
          {discoveryState === 'checking' ? (
            <p className="student-spotlight-message-modal__status" aria-live="polite">
              {t('communication.recipients.previewLoading')}
            </p>
          ) : null}

          {discoveryState === 'failed' && errorMessage ? (
            <p className="student-spotlight-message-modal__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {discoveryState === 'empty' ? (
            <p className="student-spotlight-message-modal__status" aria-live="polite">
              {t('communication.recipients.empty')}
            </p>
          ) : null}

          {discoveryState === 'ready' ? (
            <>
              <div
                className="student-spotlight-message-modal__audience"
                aria-labelledby={audienceLabelId}
              >
                <span
                  id={audienceLabelId}
                  className="student-spotlight-message-modal__audience-label"
                >
                  {t('communication.audience')}
                </span>

                {availableKinds.length === 1 ? (
                  <strong>
                    {t(
                      AUDIENCE_OPTIONS.find((option) => option.kind === availableKinds[0])
                        ?.labelKey ?? 'communication.general.beneficiary.unknown',
                    )}
                  </strong>
                ) : (
                  <div
                    className="student-spotlight-message-modal__audience-options"
                    role="radiogroup"
                    aria-labelledby={audienceLabelId}
                  >
                    {AUDIENCE_OPTIONS.filter((option) =>
                      availableKinds.includes(option.kind),
                    ).map((option, index) => {
                      const selected = selectedKind === option.kind;
                      return (
                        <button
                          key={option.kind}
                          ref={index === 0 ? firstAudienceRef : undefined}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className="student-spotlight-message-modal__audience-option"
                          data-selected={selected ? 'true' : 'false'}
                          disabled={submitting}
                          onClick={() => {
                            setSelectedKind(option.kind);
                            setErrorMessage(null);
                          }}
                        >
                          {t(option.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                )}
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

              {selectedKind === null ? (
                <p className="student-spotlight-message-modal__status" aria-live="polite">
                  {t('communication.general.incompleteSelection')}
                </p>
              ) : selectedPreview ? (
                <div className="student-spotlight-message-modal__preview" aria-live="polite">
                  <strong>{t('communication.recipients.ready')}</strong>
                  <span>
                    {t('communication.recipients.deliverableUsers')}:{' '}
                    <bdi>{selectedPreview.deliverable_user_count ?? '—'}</bdi>
                  </span>
                  {(selectedPreview.student_count ?? 0) > 0 ? (
                    <span>
                      {t('communication.recipients.students')}:{' '}
                      <bdi>{selectedPreview.student_count}</bdi>
                    </span>
                  ) : null}
                  {(selectedPreview.guardian_count ?? 0) > 0 ? (
                    <span>
                      {t('communication.recipients.guardians')}:{' '}
                      <bdi>{selectedPreview.guardian_count}</bdi>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {errorMessage ? (
                <p className="student-spotlight-message-modal__error" role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </>
          ) : null}

          <div className="student-spotlight-message-modal__actions">
            {discoveryState === 'ready' ? (
              <button
                type="submit"
                className="btn btn--primary student-spotlight-message-modal__submit"
                disabled={!canSubmit}
                aria-disabled={!canSubmit}
              >
                {submitting ? t('common.submitting') : t('common.submit')}
              </button>
            ) : null}
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
