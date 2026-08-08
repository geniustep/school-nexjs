'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * Admin school-communication workspace.
 * - Full communication viewers see published channel-less announcements + messages.
 * - Limited users keep the recipient-facing announcement feed.
 * Channel messages remain in /admin/channels and review remains in /admin/communication.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { Badge, PageHeader, StatCard } from '@/components/ui/primitives';
import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { useSession } from '@/features/auth/session-context';
import { fetchCommunicationContentList } from '@/features/communication/api/admin-communication-api';
import {
  communicationContentTypeMessageKey,
  stripHtmlPreview,
} from '@/features/communication/utils/communication-labels';
import { useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/utils/format';
import {
  COMMUNICATION_CAPABILITIES,
  canComposeGeneralCommunication,
  hasCommunicationCapability,
} from '@/lib/permissions/communication';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent } from '@/types/communication';

type PublishedFilter = 'all' | 'announcement' | 'message';

const PUBLISHED_FILTERS: ReadonlyArray<{
  id: PublishedFilter;
  labelKey: string;
}> = [
  { id: 'all', labelKey: 'communication.filter.all' },
  { id: 'announcement', labelKey: 'communication.contentType.announcement' },
  { id: 'message', labelKey: 'communication.contentType.message' },
];

function isPublishedGeneralCommunication(item: CommunicationContent): boolean {
  return (
    item.state === 'published' &&
    item.channel_id == null &&
    item.source_summary?.model !== 'school.channel' &&
    (item.content_type === 'announcement' || item.content_type === 'message')
  );
}

function publishedTimestamp(item: CommunicationContent): number {
  const raw = item.published_at ?? item.approved_at ?? item.created_at;
  if (!raw) return 0;
  const value = Date.parse(raw);
  return Number.isFinite(value) ? value : 0;
}

function communicationIcon(item: CommunicationContent): string {
  return item.content_type === 'announcement' ? '📣' : '✉️';
}

function AdminPublishedCommunicationFeed({ actions }: { actions?: React.ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<CommunicationContent[]>([]);
  const [filter, setFilter] = useState<PublishedFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [announcements, messages] = await Promise.all([
      fetchCommunicationContentList({
        page: 1,
        page_size: 100,
        state: 'published',
        content_type: 'announcement',
      }),
      fetchCommunicationContentList({
        page: 1,
        page_size: 100,
        state: 'published',
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
      .filter(isPublishedGeneralCommunication)
      .sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
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

  const counts = useMemo<Record<PublishedFilter, number>>(
    () => ({
      all: items.length,
      announcement: items.filter((item) => item.content_type === 'announcement').length,
      message: items.filter((item) => item.content_type === 'message').length,
    }),
    [items],
  );

  return (
    <div className="admin-workspace" data-testid="published-general-communication-feed">
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
          <div className="grid grid--stats" aria-label={t('communication.filters')}>
            <StatCard
              label={t('communication.filter.all')}
              value={counts.all}
              icon="🗂️"
              tone="slate"
            />
            <StatCard
              label={t('communication.contentType.announcement')}
              value={counts.announcement}
              icon="📣"
              tone="amber"
            />
            <StatCard
              label={t('communication.contentType.message')}
              value={counts.message}
              icon="✉️"
              tone="blue"
            />
          </div>

          <section className="section" aria-label={t('channels.schoolCommunicationTitle')}>
            <div className="tabs" role="tablist" aria-label={t('communication.filters')}>
              {PUBLISHED_FILTERS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === entry.id}
                  className={filter === entry.id ? 'tab tab--active' : 'tab'}
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
              <div className="card">
                <div className="msg-feed">
                  {visibleItems.map((item) => {
                    const publishedAt = item.published_at ?? item.approved_at ?? item.created_at;
                    const preview = stripHtmlPreview(item.body, 220);
                    const audience = item.audience_summary?.label;

                    return (
                      <Link
                        key={item.id}
                        href={`/admin/communication/${item.id}`}
                        className="msg-feed__item block row-link"
                        data-testid={`published-communication-${item.id}`}
                      >
                        <div className="msg-feed__meta">
                          <div className="wrap-gap">
                            <span aria-hidden="true">{communicationIcon(item)}</span>
                            <strong className="msg-feed__channel" dir="auto">
                              {item.subject || item.name || `#${item.id}`}
                            </strong>
                          </div>
                          <span className="msg-feed__time">
                            {publishedAt ? formatDateTime(publishedAt) : t('common.dash')}
                          </span>
                        </div>

                        <div className="msg-feed__sender" dir="auto">
                          {item.author?.name || t('common.dash')}
                          {audience ? ` · ${audience}` : ''}
                        </div>

                        {preview ? (
                          <div className="msg-feed__body" dir="auto">
                            {preview}
                          </div>
                        ) : null}

                        <div className="wrap-gap">
                          <Badge tone={item.content_type === 'announcement' ? 'amber' : 'blue'}>
                            {t(communicationContentTypeMessageKey(item.content_type))}
                          </Badge>
                          <Badge tone="green">{t('communication.state.published')}</Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const t = useT();
  const user = useSession();
  const canOpenCreate = canComposeGeneralCommunication(user);
  const canViewPublishedGeneralCommunication = hasCommunicationCapability(
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

  if (!canViewPublishedGeneralCommunication) {
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

  return <AdminPublishedCommunicationFeed actions={createAction} />;
}
