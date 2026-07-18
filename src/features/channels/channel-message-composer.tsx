'use client';

/**
 * Shared channel message composer — single send mutation path for ChannelChat
 * and student-family compose workspace. Distinguishes direct publish vs pending_review.
 */

import { useEffect, useRef, useState } from 'react';
import { sendChannelMessage } from '@/features/channels/api/send-channel-message';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import { useSession } from '@/features/auth/session-context';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { SendChannelMessageOutcome } from '@/types/communication';

export function ChannelMessageComposer({
  channelId,
  canSend,
  autofocus = false,
  onPublished,
  onPending,
}: {
  channelId: number;
  canSend: boolean;
  autofocus?: boolean;
  /** Called only when Backend returned a published school.message. */
  onPublished?: (outcome: Extract<SendChannelMessageOutcome, { kind: 'published' }>) => void | Promise<void>;
  /** Called when Backend returned HTTP 202 / pending_review. */
  onPending?: (outcome: Extract<SendChannelMessageOutcome, { kind: 'pending' }>) => void | Promise<void>;
}) {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setBody('');
    setSending(false);
  }, [channelId]);

  useEffect(() => {
    if (!canSend || !autofocus) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [canSend, autofocus, channelId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || sending) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const result = await sendChannelMessage({
      role: user.role,
      channelId,
      body: text,
    });
    setSending(false);

    if (!result.ok) {
      const key = communicationErrorMessageKey(result.error.code);
      toast.error(key ? t(key) : result.error.message || t('channels.sendFailed'));
      // Keep text on failure.
      return;
    }

    setBody('');
    if (result.outcome.kind === 'pending') {
      toast.success(t('channels.pendingSubmittedNotice'));
      await onPending?.(result.outcome);
      return;
    }

    await onPublished?.(result.outcome);
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
    <form className="chat__composer" onSubmit={send}>
      <textarea
        ref={textareaRef}
        className="textarea"
        rows={2}
        placeholder={t('channels.writeMessage')}
        value={body}
        aria-label={t('channels.writeMessage')}
        disabled={sending}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send(e);
          }
        }}
      />
      <button className="btn btn--primary" type="submit" disabled={sending || !body.trim()}>
        {sending ? t('channels.sending') : t('channels.send')}
      </button>
    </form>
  );
}
