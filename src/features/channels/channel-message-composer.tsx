'use client';

/**
 * Shared channel message composer — single send mutation path for ChannelChat
 * and student-family compose workspace.
 */

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { channelsEndpointsForRole } from '@/lib/api/channel-endpoints';
import { useSession } from '@/features/auth/session-context';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { Message } from '@/types/message';

export function ChannelMessageComposer({
  channelId,
  canSend,
  autofocus = false,
  onSent,
}: {
  channelId: number;
  canSend: boolean;
  autofocus?: boolean;
  onSent?: () => void | Promise<void>;
}) {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const ch = channelsEndpointsForRole(user.role);
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
    if (!canSend) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const res = await api.post<Message>(ch.messages(channelId), {
      body: text,
    });
    setSending(false);
    if (res.success) {
      setBody('');
      await onSent?.();
    } else if (res.error.code === 'permission_denied') {
      toast.error(t('channels.permissionDenied'));
    } else {
      toast.error(res.error.message || t('channels.sendFailed'));
    }
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
