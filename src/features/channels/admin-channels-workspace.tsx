'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Admin channels workspace — lifecycle create/update/delete/archive/restore.
 * Consumes Odoo Runtime 18.0.1.0.254 allowed_actions; no local permission math.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useActiveRole } from '@/features/auth/active-role-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { channelTypeLabel } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { endpoints } from '@/lib/api/endpoints';
import { adminCreateMessageHref } from '@/features/channels/utils/filter-sendable-channels';
import {
  CHANNELS_LIST_PAGE_SIZE,
  channelHasUnread,
  channelTypeAccentClass,
  resolveChannelAccessPresentation,
} from '@/features/channels/utils/channels-list-present';
import { ChannelAudienceSummary } from '@/features/channels/components/channel-audience-summary';
import {
  canCreateAdminChannel,
  channelAllows,
  resolveChannelType,
} from '@/features/channels/utils/admin-channel-actions';
import { channelLifecycleErrorKey } from '@/features/channels/utils/channel-lifecycle-errors';
import {
  archiveAdminChannel,
  restoreAdminChannel,
} from '@/features/channels/api/admin-channels-api';
import { ChannelFormDialog } from '@/features/channels/components/channel-form-dialog';
import { ChannelDeleteDialog } from '@/features/channels/components/channel-delete-dialog';
import {
  ChannelActionsMenu,
  type ChannelLifecycleActionId,
} from '@/features/channels/components/channel-actions-menu';
import type { AdminChannel, AdminChannelListMeta } from '@/types/admin-channel';
import '@/features/channels/channels-list.css';
import '@/features/channels/admin-channels-lifecycle.css';

type FormState =
  | { mode: 'create' }
  | { mode: 'edit'; channel: AdminChannel }
  | null;

export function AdminChannelsWorkspace() {
  const t = useT();
  const toast = useToast();
  const { activeRole } = useActiveRole();
  const { activeSchoolId } = useAdminSession();

  const listQuery = useMemo(
    () => ({
      page_size: CHANNELS_LIST_PAGE_SIZE,
      include_archived: 'true',
      include_family_audience: '1',
    }),
    [],
  );

  const state = useAdminResource<AdminChannel[]>(endpoints.admin.channels, listQuery);
  const meta = (state.meta ?? {}) as AdminChannelListMeta;
  const canCreate = canCreateAdminChannel(meta.allowed_actions);

  const [form, setForm] = useState<FormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminChannel | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminChannel | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);

  function resetLifecycleUiState() {
    setForm(null);
    setDeleteTarget(null);
    setArchiveTarget(null);
    setMutatingId(null);
  }

  // Drop stale dialogs/selection when Active Role or school changes — no mutations.
  useEffect(() => {
    resetLifecycleUiState();
    state.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole, activeSchoolId]);

  async function runArchive(channel: AdminChannel) {
    if (mutatingId != null) return;
    setMutatingId(channel.id);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await archiveAdminChannel(channel.id, query);
    setMutatingId(null);
    if (!res.success) {
      toast.error(t(channelLifecycleErrorKey(res.error.code)));
      return;
    }
    setArchiveTarget(null);
    toast.success(t('channels.lifecycle.toasts.archived'));
    state.reload();
  }

  async function runRestore(channel: AdminChannel) {
    if (mutatingId != null) return;
    setMutatingId(channel.id);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await restoreAdminChannel(channel.id, query);
    setMutatingId(null);
    if (!res.success) {
      toast.error(t(channelLifecycleErrorKey(res.error.code)));
      return;
    }
    toast.success(t('channels.lifecycle.toasts.restored'));
    state.reload();
  }

  function handleCardAction(channel: AdminChannel, action: ChannelLifecycleActionId) {
    if (action === 'update') {
      setForm({ mode: 'edit', channel });
      return;
    }
    if (action === 'delete') {
      setDeleteTarget(channel);
      return;
    }
    if (action === 'archive') {
      setArchiveTarget(channel);
      return;
    }
    if (action === 'restore') {
      void runRestore(channel);
    }
  }

  const headerActions = (
    <div className="channels-lifecycle-toolbar">
      {canCreate ? (
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setForm({ mode: 'create' })}
          aria-label={t('channels.lifecycle.create')}
        >
          {t('channels.lifecycle.create')}
        </button>
      ) : null}
      <Link
        href={adminCreateMessageHref()}
        className="btn btn--ghost"
        aria-label={t('channels.createMessage')}
      >
        {t('channels.createMessage')}
      </Link>
    </div>
  );

  return (
    <div className="admin-workspace channels-lifecycle-workspace">
      <PageHeader
        title={t('channels.schoolCommunicationTitle')}
        subtitle={t('admin.channelsListDesc')}
        actions={headerActions}
      />

      <div className="channels-list-page">
        <ResourceView
          state={state}
          loadingLabel={t('channels.loadingChannels')}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyState
              icon="✉"
              title={t('channels.emptyTitle')}
              description={t('channels.emptyDesc')}
              action={
                canCreate ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => setForm({ mode: 'create' })}
                  >
                    {t('channels.lifecycle.create')}
                  </button>
                ) : undefined
              }
            />
          }
        >
          {(channels) => (
            <div
              className={cn(
                'channels-list__grid',
                state.fetching && 'channels-list__grid--refetching',
              )}
              aria-busy={state.fetching || undefined}
            >
              {channels.map((channel) => {
                const channelType = resolveChannelType(channel);
                const access = resolveChannelAccessPresentation(channel);
                const archived = channel.is_archived === true;
                const systemManaged = channel.is_system_managed === true;
                const hasActions =
                  channelAllows(channel.allowed_actions, 'update') ||
                  channelAllows(channel.allowed_actions, 'archive') ||
                  channelAllows(channel.allowed_actions, 'restore') ||
                  channelAllows(channel.allowed_actions, 'delete');

                return (
                  <article
                    key={channel.id}
                    className={cn(
                      'card',
                      'card--pad',
                      'channels-list__card',
                      'channels-lifecycle-card',
                      channelTypeAccentClass(channelType),
                      archived && 'channels-lifecycle-card--archived',
                    )}
                    data-testid={`admin-channel-card-${channel.id}`}
                  >
                    <div className="channels-list__head">
                      <Link
                        href={`/admin/channels/${channel.id}`}
                        className="channels-lifecycle-card__title-link"
                      >
                        <strong className="channels-list__name" dir="auto" title={channel.name}>
                          {channel.name}
                        </strong>
                      </Link>
                      <div className="channels-lifecycle-card__head-end">
                        {channelHasUnread(channel) ? (
                          <Badge tone="blue">
                            <span dir="ltr">
                              {t('channels.newCount', { count: channel.unread_count })}
                            </span>
                          </Badge>
                        ) : null}
                        {hasActions ? (
                          <ChannelActionsMenu
                            channel={channel}
                            onAction={(action) => handleCardAction(channel, action)}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="channels-list__badges">
                      <Badge tone="slate">{channelTypeLabel(t, channelType)}</Badge>
                      {systemManaged ? (
                        <Badge tone="blue">{t('channels.lifecycle.badges.system')}</Badge>
                      ) : (
                        <Badge tone="slate">{t('channels.lifecycle.badges.manual')}</Badge>
                      )}
                      {channelType === 'class_staff' ? (
                        <Badge tone="slate">{t('channels.lifecycle.badges.staff')}</Badge>
                      ) : null}
                      {channelType === 'class_family' ? (
                        <Badge tone="slate">{t('channels.lifecycle.badges.family')}</Badge>
                      ) : null}
                      {archived ? (
                        <Badge tone="amber">{t('channels.lifecycle.badges.archived')}</Badge>
                      ) : null}
                      {access === 'read-only' ? (
                        <Badge tone="amber">{t('channels.readOnly')}</Badge>
                      ) : null}
                      {access === 'view-only' ? (
                        <Badge tone="slate">{t('channels.viewOnly')}</Badge>
                      ) : null}
                    </div>

                    {channel.description ? (
                      <p
                        className="channels-list__description muted tiny"
                        dir="auto"
                        title={channel.description}
                      >
                        {channel.description}
                      </p>
                    ) : null}

                    <div className="channels-list__meta tiny faint">
                      {channel.class?.name ? (
                        <>
                          <span dir="auto">{channel.class.name}</span>
                          <span className="channels-list__meta-sep" aria-hidden="true">
                            ·
                          </span>
                        </>
                      ) : null}
                      {channel.academic_year?.name ? (
                        <>
                          <span dir="auto">{channel.academic_year.name}</span>
                          <span className="channels-list__meta-sep" aria-hidden="true">
                            ·
                          </span>
                        </>
                      ) : null}
                      <ChannelAudienceSummary channel={channel} compact />
                      <span className="channels-list__meta-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="channels-list__meta-activity" dir="auto">
                        {channel.last_message_date
                          ? t('channels.activeAt', {
                              date: formatDateTime(channel.last_message_date),
                            })
                          : t('channels.noMessagesYet')}
                      </span>
                    </div>

                    <div className="channels-lifecycle-card__footer">
                      <Link
                        href={`/admin/channels/${channel.id}`}
                        className="btn btn--ghost btn--sm"
                      >
                        {t('channels.lifecycle.openChannel')}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ResourceView>
      </div>

      <ChannelFormDialog
        open={form != null}
        mode={form?.mode === 'edit' ? 'edit' : 'create'}
        channel={form?.mode === 'edit' ? form.channel : null}
        onClose={() => setForm(null)}
        onSuccess={() => {
          toast.success(
            form?.mode === 'edit'
              ? t('channels.lifecycle.toasts.updated')
              : t('channels.lifecycle.toasts.created'),
          );
          state.reload();
        }}
      />

      <ChannelDeleteDialog
        open={deleteTarget != null}
        channel={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          setDeleteTarget(null);
          state.reload();
        }}
      />

      <ConfirmationDialog
        open={archiveTarget != null}
        closeOnBackdrop={mutatingId == null}
        loading={mutatingId != null}
        title={t('channels.lifecycle.archive')}
        confirmLabel={t('channels.lifecycle.archive')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (archiveTarget) void runArchive(archiveTarget);
        }}
        onClose={() => {
          if (mutatingId == null) setArchiveTarget(null);
        }}
        body={
          <div>
            {archiveTarget ? (
              <p dir="auto">
                <strong>{archiveTarget.name}</strong>
              </p>
            ) : null}
            <p>{t('channels.lifecycle.archiveWarning')}</p>
          </div>
        }
      />
    </div>
  );
}
