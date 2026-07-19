'use client';

/**
 * Shared channel message composer — Preview (B4) then Confirm Submit.
 * Distinguishes direct publish (201) vs pending_review (202).
 * Never computes recipients locally; Preview is advisory only.
 */

import { useEffect, useRef, useState } from 'react';
import { sendChannelMessage } from '@/features/channels/api/send-channel-message';
import { previewChannelMessageRecipients } from '@/features/channels/api/preview-channel-message-recipients';
import { RecipientPreviewDialog } from '@/features/communication/components/recipient-preview-dialog';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import { useSession } from '@/features/auth/session-context';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type {
  CommunicationRecipientSummary,
  SendChannelMessageOutcome,
} from '@/types/communication';

type ComposerPhase = 'idle' | 'previewing' | 'confirming' | 'submitting';

export function ChannelMessageComposer({
  channelId,
  canSend,
  autofocus = false,
  composeMode = 'unknown',
  onPublished,
  onPending,
}: {
  channelId: number;
  canSend: boolean;
  autofocus?: boolean;
  composeMode?: 'internal' | 'submit' | 'unknown';
  /** Called only when Backend returned a published school.message. */
  onPublished?: (outcome: Extract<SendChannelMessageOutcome, { kind: 'published' }>) => void | Promise<void>;
  /** Called when Backend returned HTTP 202 / pending_review. */
  onPending?: (outcome: Extract<SendChannelMessageOutcome, { kind: 'pending' }>) => void | Promise<void>;
}) {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const [body, setBody] = useState('');
  const [phase, setPhase] = useState<ComposerPhase>('idle');
  const [previewSummary, setPreviewSummary] = useState<CommunicationRecipientSummary | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  /** Body fingerprint that produced the open preview — stale if body changes. */
  const [previewBodyKey, setPreviewBodyKey] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef(false);

  const networkBusy = phase === 'previewing' || phase === 'submitting';
  const composerLocked = phase !== 'idle';

  useEffect(() => {
    setBody('');
    setPhase('idle');
    setPreviewSummary(null);
    setPreviewOpen(false);
    setPreviewBodyKey(null);
    inFlightRef.current = false;
  }, [channelId]);

  useEffect(() => {
    if (!canSend || !autofocus) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [canSend, autofocus, channelId]);

  function invalidatePreview() {
    setPreviewOpen(false);
    setPreviewSummary(null);
    setPreviewBodyKey(null);
    setPhase((current) => (current === 'submitting' ? current : 'idle'));
  }

  function onBodyChange(next: string) {
    setBody(next);
    if (previewOpen && previewBodyKey != null && next.trim() !== previewBodyKey) {
      invalidatePreview();
    }
  }

  async function requestPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || inFlightRef.current || phase !== 'idle') return;
    const text = body.trim();
    if (!text) return;

    inFlightRef.current = true;
    setPhase('previewing');
    const result = await previewChannelMessageRecipients({
      role: user.role,
      channelId,
      body: text,
    });
    inFlightRef.current = false;

    if (!result.ok) {
      setPhase('idle');
      const key = communicationErrorMessageKey(result.error.code);
      toast.error(key ? t(key) : result.error.message || t('channels.sendFailed'));
      // Keep text on preview failure.
      return;
    }

    setPreviewSummary(result.preview.recipient_summary);
    setPreviewBodyKey(text);
    setPreviewOpen(true);
    setPhase('confirming');
  }

  async function confirmSend() {
    if (!canSend || inFlightRef.current || phase !== 'confirming') return;
    const text = body.trim();
    if (!text || text !== previewBodyKey) {
      invalidatePreview();
      setPhase('idle');
      return;
    }
    if (previewSummary?.can_submit === false) return;

    inFlightRef.current = true;
    setPhase('submitting');
    const result = await sendChannelMessage({
      role: user.role,
      channelId,
      body: text,
    });
    inFlightRef.current = false;

    if (!result.ok) {
      setPhase('confirming');
      const key = communicationErrorMessageKey(result.error.code);
      toast.error(key ? t(key) : result.error.message || t('channels.sendFailed'));
      // Keep text; keep dialog open on submit error unless forbidden.
      if (
        result.error.code === 'forbidden' ||
        result.error.code === 'permission_denied' ||
        result.error.code === 'communication_channel_forbidden'
      ) {
        invalidatePreview();
        setPhase('idle');
      }
      return;
    }

    setBody('');
    invalidatePreview();
    setPhase('idle');

    if (result.outcome.kind === 'pending') {
      if (result.outcome.pending.audience_changed) {
        toast.success(t('communication.recipients.audienceChangedAfterSubmit'));
      } else {
        toast.success(t('channels.pendingSubmittedNotice'));
      }
      await onPending?.(result.outcome);
      return;
    }

    await onPublished?.(result.outcome);
  }

  function closePreview() {
    if (phase === 'submitting' || phase === 'previewing') return;
    invalidatePreview();
    setPhase('idle');
  }

  if (!canSend) {
    return (
      <div className="chat__readonly">
        <span className="chat__readonly-icon" aria-hidden="true">
          &#128274;
        </span>
        {t('channels.compose.cannotSendSelected')}
      </div>
    );
  }

  return (
    <>
      <form className="chat__composer" onSubmit={(e) => void requestPreview(e)}>
        <textarea
          ref={textareaRef}
          className="textarea"
          rows={2}
          placeholder={t('channels.writeMessage')}
          value={body}
          aria-label={t('channels.writeMessage')}
          disabled={networkBusy}
          onChange={(e) => onBodyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!composerLocked) void requestPreview(e);
            }
          }}
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={composerLocked || !body.trim()}
        >
          {phase === 'previewing'
            ? t('communication.recipients.previewLoading')
            : phase === 'submitting'
              ? t('channels.sending')
              : t('channels.send')}
        </button>
      </form>
      <RecipientPreviewDialog
        open={previewOpen}
        summary={previewSummary}
        composeMode={composeMode}
        loading={phase === 'previewing'}
        confirming={phase === 'submitting'}
        onConfirm={() => void confirmSend()}
        onClose={closePreview}
      />
    </>
  );
}
