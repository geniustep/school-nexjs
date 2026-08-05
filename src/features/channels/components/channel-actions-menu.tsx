'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { channelAllows } from '@/features/channels/utils/admin-channel-actions';
import type { AdminChannel } from '@/types/admin-channel';

export type ChannelLifecycleActionId = 'update' | 'archive' | 'restore' | 'delete';

export function ChannelActionsMenu({
  channel,
  onAction,
}: {
  channel: AdminChannel;
  onAction: (action: ChannelLifecycleActionId) => void;
}) {
  const t = useT();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const canUpdate = channelAllows(channel.allowed_actions, 'update');
  const canArchive = channelAllows(channel.allowed_actions, 'archive');
  const canRestore = channelAllows(channel.allowed_actions, 'restore');
  const canDelete = channelAllows(channel.allowed_actions, 'delete');

  const items: { id: ChannelLifecycleActionId; label: string; danger?: boolean }[] = [];
  if (canUpdate) items.push({ id: 'update', label: t('channels.lifecycle.edit') });
  if (canArchive && !canRestore) {
    items.push({ id: 'archive', label: t('channels.lifecycle.archive') });
  }
  if (canRestore && !canArchive) {
    items.push({ id: 'restore', label: t('channels.lifecycle.restore') });
  }
  if (canDelete) {
    items.push({ id: 'delete', label: t('channels.lifecycle.delete'), danger: true });
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="channels-lifecycle-actions" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn--ghost btn--sm channels-lifecycle-actions__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('channels.lifecycle.actionsMenu')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋯
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="channels-lifecycle-actions__menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={
                  item.danger
                    ? 'channels-lifecycle-actions__item channels-lifecycle-actions__item--danger'
                    : 'channels-lifecycle-actions__item'
                }
                onClick={() => {
                  setOpen(false);
                  onAction(item.id);
                  triggerRef.current?.focus();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
