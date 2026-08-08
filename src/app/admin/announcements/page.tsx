'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Admin school-communication workspace.
 * - Full communication viewers see channel-less announcements + messages across their workflow states.
 * - Limited users keep the recipient-facing published announcement feed.
 * - Channel messages remain in /admin/channels and moderation remains governed by Odoo.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { useSession } from '@/features/auth/session-context';
import { fetchCommunicationContentList } from '@/features/communication/api/admin-communication-api';
import {
  communicationContentTypeMessageKey,
  communicationStateMessageKey,
  stripHtmlPreview,
} from '@/features/communication/utils/communication-labels';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import {
  COMMUNICATION_CAPABILITIES,
  canComposeGeneralCommunication,
  hasCommunicationCapability,
} from '@/lib/permissions/communication';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent, CommunicationContentState } from '@/types/communication';
import './announcements.css';

type CommunicationFilter = 'all' | 'announcement' | 'message';

const COMMUNICATION_FILTERS: ReadonlyArray<{
  id: CommunicationFilter;
  labelKey: string;
}> = [
  { id: 'all', labelKey: 'communication.filter.all' },
  { id: 'announcement', labelKey: 'communication.contentType.announcement' },
  { id: 'message', labelKey: 'communication.contentType.message' },
];

function isGeneralCommunication(item: CommunicationContent): boolean {
  return (
    item.channel_id == null &&
    item.source_summary?.model !== 'school.channel' &&
    item.state !== 'archived' &&
    (item.content_type === 'announcement' || item.content_type === 'message')
  );
}

function activityTimestamp(item: CommunicationContent): number {
  const raw =
    item.published_at ??
    item.scheduled_at ??
    item.approved_at ??
    item.submitted_at ??
    item.created_at;
  if (!raw) return 0;
  const value = Date.parse(raw);
  return Number.isFinite(value) ? value : 0;
}

function displayTimestamp(item: CommunicationContent): string | null | undefined {
  return (
    item.published_at ??
    item.scheduled_at ??
    item.approved_at ??
    item.submitted_at ??
    item.created_at
  );
}

function stateTone(state: CommunicationContentState): 'green' | 'red' | 'amber' | 'blue' | 'slate' {
  switch (state) {
    case 'published':
      return 'green';
    case 'changes_requested':
    case 'delivery_failed':
      return 'red';
    case 'submitted':
    case 'partially_delivered':
      return 'amber';
    case 'approved':
    case 'scheduled':
    case 'publishing':
      return 'blue';
    default:
      return 'slate';
  }
}

function communicationBody(item: CommunicationContent): string | null | undefined {
  return item.body ?? item.current_version?.body ?? item.approved_version?.body;
}

function canOfferEdit(item: CommunicationContent): boolean {
  return (
    (item.allowed_actions ?? []).includes('edit') ||
    item.state === 'draft' ||
    item.state === 'changes_requested'
  );
}

function AdminCommunicationWorkspace({ actions }: { actions?: React.ReactNode }) {
  const t = useT();
  const format = useFormat();
  const [items, setItems] = useState<CommunicationContent[]>([]);
  const [filter, setFilter] = useState<CommunicationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [announcements, messages] = await Promise.all([
      fetchCommunicationContentList({
        page: 1,
        page_size: 100,
        content_type: 'announcement',
      }),
      fetchCommunicationContentList({
        page: 1,
        page_size: 100,
        content_type: 'message',
      }),
    ]);

    if (!announcements.success) {
      setError(announcements.error);
      setItems([]);
      setLoading(false);
      return;
    }
    if (!messages.success) {
      setError(messages.error);
      setItems([]);
      setLoading(false);
      return;
    }

    const next = [...announcements.data, ...messages.data]
      .filter(isGeneralCommunication)
      .sort((a, b) => activityTimestamp(b) - activityTimestamp(a));
    setItems(next);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.content_type === filter)),
    [filter, items],
  );

  const counts = useMemo<Record<CommunicationFilter, number>>(
    () => ({
      all: items.length,
      announcement: items.filter((item) => item.content_type === 'announcement').length,
      message: items.filter((item) => item.content_type === 'message').length,
    }),
    [items],
  );

  const columns = useMemo<Column<CommunicationContent>[]>(
    () => [
      {
        key: 'content',
        header: t('nav.content'),
        width: '42%',
        render: (item) => {
          const preview = stripHtmlPreview(communicationBody(item), 150);
          return (
            <div style={{ minWidth: 0 }}>
              <Link
                href={`/admin/communication/${item.id}`}
                className="communication-list__title"
                dir="auto"
              >
                <span aria-hidden="true">
                  {item.content_type === 'announcement' ? '📣' : '✉️'}
                </span>
                <strong>{item.subject || item.name || `#${item.id}`}</strong>
              </Link>
              {preview ? (
                <div className="tiny muted communication-list__preview" dir="auto">
                  {preview}
                </div>
              ) : null}
              <div className="tiny muted" dir="auto">
                {item.author?.name || t('common.dash')}
              </div>
            </div>
          );
        },
      },
      {
        key: 'type',
        header: t('communication.general.chooseMode'),
        width: '9rem',
        render: (item) => (
          <Badge tone={item.content_type === 'announcement' ? 'amber' : 'blue'}>
            {t(communicationContentTypeMessageKey(item.content_type))}
          </Badge>
        ),
      },
      {
        key: 'state',
        header: t('common.status'),
        width: '11rem',
        render: (item) => (
          <Badge tone={stateTone(item.state)}>{t(communicationStateMessageKey(item.state))}</Badge>
        ),
      },
      {
        key: 'audience',
        header: t('communication.general.beneficiaries'),
        width: '16%',
        render: (item) => (
          <span className="tiny" dir="auto">
            {item.audience_summary?.label || t('common.dash')}
          </span>
        ),
      },
      {
        key: 'date',
        header: t('common.date'),
        width: '11rem',
        render: (item) => {
          const value = displayTimestamp(item);
          return <span className="tiny">{value ? format.formatDateTime(value) : t('common.dash')}</span>;
        },
      },
      {
        key: 'actions',
        header: t('common.actions'),
        width: '11rem',
        render: (item) => (
          <div className="wrap-gap">
            <Link href={`/admin/communication/${item.id}`} className="btn btn--ghost btn--sm">
              {t('common.view')}
            </Link>
            {canOfferEdit(item) ? (
              <Link
                href={`/admin/communication/${item.id}/edit`}
                className="btn btn--ghost btn--sm"
              >
                {t('common.edit')}
              </Link>
            ) : null}
          </div>
        ),
      },
    ],
    [format, t],
  );

  return (
    <div className="admin-workspace communication-list" data-testid="published-general-communication-feed">
      <PageHeader
        title={t('channels.schoolCommunicationTitle')}
        subtitle={t('announcements.adminWorkspaceSubtitle')}
        actions={actions}
      />

      {loading ? (
        <LoadingState label={t('communication.loading')} />
      ) : error ? (
        <ApiErrorView error={error} onRetry={() => void load()} />
      ) : (
        <>
          <div className="toolbar communication-list__toolbar" role="tablist" aria-label={t('communication.filters')}>
            {COMMUNICATION_FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={filter === entry.id}
                className={filter === entry.id ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
                onClick={() => setFilter(entry.id)}
              >
                <span>{t(entry.labelKey)}</span>
                <bdi className="numeric-text" dir="ltr">
                  {counts[entry.id]}
                </bdi>
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <EmptyState
              icon="📭"
              title={t('channels.schoolCommunicationTitle')}
              description={t('communication.emptyDesc')}
            />
          ) : (
            <DataTable columns={columns} rows={visibleItems} rowKey={(item) => item.id} />
          )}
        </>
      )}
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const t = useT();
  const user = useSession();
  const canOpenCreate = canComposeGeneralCommunication(user);
  const canViewGeneralCommunication = hasCommunicationCapability(
    user,
    COMMUNICATION_CAPABILITIES.view,
  );

  const createAction = canOpenCreate ? (
    <Link
      href="/admin/communication/compose"
      className="btn btn--primary"
      aria-label={t('communication.general.newCommunication')}
    >
      {t('communication.general.newCommunication')}
    </Link>
  ) : undefined;

  if (!canViewGeneralCommunication) {
    return (
      <div className="admin-workspace">
        <AnnouncementsRecipientFeed
          basePath="/admin/announcements"
          title={t('channels.schoolCommunicationTitle')}
          subtitle={t('announcements.adminWorkspaceSubtitle')}
          actions={createAction}
        />
      </div>
    );
  }

  return <AdminCommunicationWorkspace actions={createAction} />;
}
