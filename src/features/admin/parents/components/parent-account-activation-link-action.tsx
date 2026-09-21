'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import type { ParentAccountActivationLinkStatus } from '@/types/parent';
import {
  PARENT_ACCOUNT_ACTIVATION_LINK_PATH,
  buildParentActivationLinkPayload,
  canSendParentActivationLink,
  ensureParentActivationAttemptKey,
  formatParentActivationDateTime,
  parentActivationLinkBlockingCopyKey,
  parentActivationLinkErrorKind,
  parentActivationLinkIsResend,
  parentActivationLinkRequiresConfirmation,
} from '../utils/parent-account-activation-link';

type SendState = 'idle' | 'sending' | 'success' | 'error';

function errorMessageKey(kind: ReturnType<typeof parentActivationLinkErrorKind>): string {
  switch (kind) {
    case 'forbidden':
      return 'admin.parentProfile.activationLink.permissionError';
    case 'blocked':
      return 'admin.parentProfile.activationLink.blockedError';
    case 'conflict':
      return 'admin.parentProfile.activationLink.conflictError';
    case 'unavailable':
      return 'admin.parentProfile.activationLink.unavailableError';
    case 'network':
      return 'admin.parentProfile.activationLink.networkError';
    default:
      return 'admin.parentProfile.activationLink.genericError';
  }
}

export function ParentAccountActivationLinkAction({
  parentId,
  status,
  onSent,
}: {
  parentId: number;
  status: ParentAccountActivationLinkStatus | null | undefined;
  onSent?: () => void;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [state, setState] = useState<SendState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const attemptKeyRef = useRef<string | null>(null);
  const sendingRef = useRef(false);

  const allowed = canSendParentActivationLink(status);
  const isResend = parentActivationLinkIsResend(status);
  const needsConfirmation = parentActivationLinkRequiresConfirmation(status);
  const disabled = state === 'sending' || !allowed;
  const hasSendHistory = typeof status?.sent_before === 'boolean';
  const hasLoginHistory = typeof status?.has_logged_in === 'boolean';
  const lastSent = formatParentActivationDateTime(status?.last_sent_at, locale);
  const lastLogin = formatParentActivationDateTime(status?.last_login_at, locale);
  const blockingMessage = allowed
    ? null
    : t(
        `admin.parentProfile.activationLink.${parentActivationLinkBlockingCopyKey(
          status?.blocking_reason,
        )}`,
      );

  async function performSend() {
    if (!allowed || sendingRef.current) return;

    sendingRef.current = true;
    const wasResend = isResend;
    const idempotencyKey = ensureParentActivationAttemptKey(attemptKeyRef.current);
    attemptKeyRef.current = idempotencyKey;
    setState('sending');
    setMessage(null);

    try {
      const response = await api.post(
        PARENT_ACCOUNT_ACTIVATION_LINK_PATH,
        buildParentActivationLinkPayload({ parentId, idempotencyKey }),
      );

      if (response.success) {
        attemptKeyRef.current = null;
        setState('success');
        setMessage(
          t(
            wasResend
              ? 'admin.parentProfile.activationLink.resentSuccess'
              : 'admin.parentProfile.activationLink.sentSuccess',
          ),
        );
        onSent?.();
        return;
      }

      const errorKind = parentActivationLinkErrorKind(response.error);
      setState('error');
      setMessage(t(errorMessageKey(errorKind)));
      if (errorKind === 'forbidden') router.refresh();
    } finally {
      sendingRef.current = false;
    }
  }

  function requestSend() {
    if (disabled || sendingRef.current) return;
    setMessage(null);
    if (needsConfirmation) {
      setConfirmOpen(true);
      return;
    }
    void performSend();
  }

  async function confirmSend() {
    await performSend();
    setConfirmOpen(false);
  }

  return (
    <div className="parent-profile__activation-link-action">
      <div className="parent-profile__activation-link-status" aria-live="polite">
        {hasSendHistory ? (
          <p className="tiny">
            {status?.sent_before === true
              ? t('admin.parentProfile.activationLink.sentBefore')
              : t('admin.parentProfile.activationLink.neverSent')}
          </p>
        ) : null}
        {status?.sent_before === true && lastSent ? (
          <p className="tiny muted">
            {t('admin.parentProfile.activationLink.lastSent')}{' '}
            <span dir="auto">{lastSent}</span>
          </p>
        ) : null}
        {hasLoginHistory ? (
          <p className="tiny">
            {status?.has_logged_in === true
              ? t('admin.parentProfile.activationLink.loggedIn')
              : t('admin.parentProfile.activationLink.neverLoggedIn')}
          </p>
        ) : null}
        {status?.has_logged_in === true && lastLogin ? (
          <p className="tiny muted">
            {t('admin.parentProfile.activationLink.lastLogin')}{' '}
            <span dir="auto">{lastLogin}</span>
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={requestSend}
        disabled={disabled}
      >
        {state === 'sending'
          ? t('admin.parentProfile.activationLink.sending')
          : t(
              isResend
                ? 'admin.parentProfile.activationLink.resend'
                : 'admin.parentProfile.activationLink.send',
            )}
      </button>

      {blockingMessage ? (
        <p className="tiny muted" role="status">
          {blockingMessage}
        </p>
      ) : null}

      {message ? (
        <span className={state === 'success' ? 'tiny' : 'tiny muted'} role="status">
          {message}
        </span>
      ) : null}

      <ConfirmationDialog
        open={confirmOpen}
        title={t('admin.parentProfile.activationLink.confirmTitle')}
        body={<p>{t('admin.parentProfile.activationLink.confirmBody')}</p>}
        confirmLabel={t('admin.parentProfile.activationLink.confirmAction')}
        loading={state === 'sending'}
        closeOnBackdrop={state !== 'sending'}
        onClose={() => {
          if (state !== 'sending') setConfirmOpen(false);
        }}
        onConfirm={confirmSend}
      />
    </div>
  );
}
