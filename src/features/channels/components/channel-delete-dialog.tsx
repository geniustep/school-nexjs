'use client';

import { useEffect, useRef, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  archiveAdminChannel,
  deleteAdminChannel,
} from '@/features/channels/api/admin-channels-api';
import {
  channelBlockingReasonKey,
  channelLifecycleErrorKey,
  deleteConflictAllowsArchive,
  parseChannelLifecycleError,
} from '@/features/channels/utils/channel-lifecycle-errors';
import type { AdminChannel } from '@/types/admin-channel';

export function ChannelDeleteDialog({
  open,
  channel,
  onClose,
  onSuccess,
  onArchiveInstead,
}: {
  open: boolean;
  channel: AdminChannel | null;
  onClose: () => void;
  onSuccess: () => void;
  onArchiveInstead?: (channel: AdminChannel) => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [blockingLines, setBlockingLines] = useState<string[]>([]);
  const [showArchiveFallback, setShowArchiveFallback] = useState(false);
  const submitGuardRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setInlineError(null);
      setBlockingLines([]);
      setShowArchiveFallback(false);
      submitGuardRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  async function confirm() {
    if (!channel || loading || submitGuardRef.current) return;
    submitGuardRef.current = true;
    setLoading(true);
    setInlineError(null);
    setBlockingLines([]);
    setShowArchiveFallback(false);

    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await deleteAdminChannel(channel.id, query);

    if (res.success) {
      toast.success(t('channels.lifecycle.toasts.deleted'));
      onClose();
      onSuccess();
      setLoading(false);
      submitGuardRef.current = false;
      return;
    }

    const parsed = parseChannelLifecycleError(res.error);
    setInlineError(t(channelLifecycleErrorKey(parsed.code)));
    setBlockingLines(
      (parsed.blocking_reasons ?? []).map((reason) => t(channelBlockingReasonKey(reason.code))),
    );
    setShowArchiveFallback(deleteConflictAllowsArchive(parsed));
    // Keep dialog open on 409 / other failures — no optimistic removal.
    setLoading(false);
    submitGuardRef.current = false;
  }

  async function archiveInstead() {
    if (!channel || loading || submitGuardRef.current) return;
    submitGuardRef.current = true;
    setLoading(true);
    setInlineError(null);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await archiveAdminChannel(channel.id, query);
    if (!res.success) {
      setInlineError(t(channelLifecycleErrorKey(res.error.code)));
      setLoading(false);
      submitGuardRef.current = false;
      return;
    }
    toast.success(t('channels.lifecycle.toasts.archived'));
    onClose();
    onArchiveInstead?.(channel);
    onSuccess();
    setLoading(false);
    submitGuardRef.current = false;
  }

  if (!channel) return null;

  return (
    <ConfirmationDialog
      open={open}
      variant="danger"
      closeOnBackdrop={!loading}
      loading={loading}
      title={t('channels.lifecycle.deleteTitle')}
      confirmLabel={
        loading ? t('common.submitting') : t('channels.lifecycle.deleteConfirm')
      }
      cancelLabel={t('common.cancel')}
      onConfirm={() => void confirm()}
      onClose={() => {
        if (!loading) onClose();
      }}
      body={
        <div data-testid="channel-delete-dialog">
          <p className="channels-lifecycle-delete-name" dir="auto">
            <strong>{channel.name}</strong>
          </p>
          <p>{t('channels.lifecycle.deleteWarning')}</p>
          {channel.is_system_managed ? (
            <p className="tiny muted" role="note">
              {t('channels.lifecycle.systemProtected')}
            </p>
          ) : null}
          {inlineError ? (
            <p className="form-error" role="alert" aria-live="assertive">
              {inlineError}
            </p>
          ) : null}
          {blockingLines.length > 0 ? (
            <ul className="channels-lifecycle-blockers" aria-live="polite">
              {blockingLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {showArchiveFallback ? (
            <div className="channels-lifecycle-archive-fallback">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={loading}
                onClick={() => void archiveInstead()}
              >
                {t('channels.lifecycle.archiveInstead')}
              </button>
            </div>
          ) : null}
        </div>
      }
    />
  );
}
