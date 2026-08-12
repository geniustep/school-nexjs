'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useState } from 'react';
import Link from 'next/link';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Badge, Card, PageHeader } from '@/components/ui/primitives';
import {
  downloadAnnouncementAttachment,
} from '@/features/announcements/api/announcements-api';
import { useAnnouncementDetail } from '@/features/announcements/hooks/use-announcement-detail';
import { useT } from '@/features/i18n/locale-context';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { formatDateTime, stripHtml } from '@/lib/utils/format';
import type { AnnouncementDelivery } from '@/types/announcement-delivery';
import { SmartLinkCards } from '@/components/attachments/smart-link-cards';
import '@/features/attachments/secure-materials/secure-materials.css';

function priorityTone(priority: string): 'red' | 'amber' | 'slate' {
  const p = priority.toLowerCase();
  if (p === 'urgent') return 'red';
  if (p === 'important') return 'amber';
  return 'slate';
}

export function AnnouncementRecipientDetail({
  messageId,
  studentId,
  backHref,
  backLabel,
}: {
  messageId: number;
  studentId?: number;
  backHref: string;
  backLabel?: string;
}) {
  const t = useT();
  const detail = useAnnouncementDetail(messageId, { studentId, autoMarkRead: true });
  const [attachMsg, setAttachMsg] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState<number | null>(null);

  const resourceState: ResourceState<AnnouncementDelivery> = {
    loading: detail.loading,
    initialLoading: detail.initialLoading,
    fetching: detail.loading && detail.data !== null,
    data: detail.data,
    meta: null,
    error: detail.error,
    reload: detail.reload,
  };

  async function onDownload(attId: number, name: string | null) {
    if (attachBusy != null) return;
    setAttachBusy(attId);
    setAttachMsg(null);
    const result = await downloadAnnouncementAttachment(
      messageId,
      attId,
      name || 'file',
      studentId,
    );
    if (!result.ok) {
      setAttachMsg(t(result.messageKey));
    }
    setAttachBusy(null);
  }

  return (
    <>
      <Link href={backHref} className="back-link">
        ‹ {backLabel ?? t('common.back')}
      </Link>
      <ResourceView
        state={resourceState}
        loadingLabel={t('announcements.loadingDetail')}
        empty={
          <EmptyState
            icon="📣"
            title={t('announcements.notFoundTitle')}
            description={t('announcements.notFoundDesc')}
          />
        }
      >
        {(item) => {
          const title = item.subject?.trim() || t('announcements.untitled');
          const priorityLabel =
            item.priority === 'urgent'
              ? t('announcements.priorityUrgent')
              : item.priority === 'important'
                ? t('announcements.priorityImportant')
                : t('announcements.priorityNormal');
          const bodyText = stripHtml(item.body ?? '');

          return (
            <>
              <PageHeader
                title={title}
                subtitle={item.sender?.name ?? t('announcements.unknownSender')}
                actions={
                  <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                    {item.is_pinned && (
                      <Badge tone="blue">
                        <span aria-hidden="true">📌 </span>
                        {t('announcements.pinned')}
                      </Badge>
                    )}
                    {item.priority !== 'normal' && (
                      <Badge tone={priorityTone(item.priority)}>{priorityLabel}</Badge>
                    )}
                    <Badge tone={item.is_read ? 'slate' : 'blue'}>
                      {item.is_read ? t('announcements.read') : t('announcements.unread')}
                    </Badge>
                  </div>
                }
              />

              <Card>
                <dl className="stack gap-2 tiny muted">
                  <div className="between">
                    <dt>{t('announcements.publishedAt')}</dt>
                    <dd dir="ltr">{formatDateTime(item.published_at ?? item.sent_date)}</dd>
                  </div>
                  {item.expires_at && (
                    <div className="between">
                      <dt>{t('announcements.expiresAt')}</dt>
                      <dd dir="ltr">{formatDateTime(item.expires_at)}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-3" dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
                  {bodyText || t('announcements.emptyBody')}
                </div>

                {detail.markReadError && (
                  <p className="tiny mt-2" role="alert" style={{ color: 'var(--c-red)' }}>
                    {t('announcements.markReadFailed')}
                    {' '}
                    <button
                      type="button"
                      className="btn btn--ghost tiny"
                      onClick={() => void detail.markRead()}
                      disabled={detail.markingRead}
                      aria-label={t('announcements.markReadRetry')}
                    >
                      {t('common.retry')}
                    </button>
                  </p>
                )}

                {!item.is_read && !detail.markReadError && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => void detail.markRead()}
                      disabled={detail.markingRead}
                      aria-busy={detail.markingRead}
                    >
                      {detail.markingRead
                        ? t('announcements.markingRead')
                        : t('announcements.markRead')}
                    </button>
                  </div>
                )}
              </Card>

              {(item.attachments?.length ?? 0) > 0 && (
                <Card className="mt-3">
                  <h2 className="tiny" style={{ marginBlockEnd: '0.75rem' }}>
                    {t('announcements.attachments')}
                  </h2>
                  <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {item.attachments!.map((att) => (
                      <li key={att.id} className="between gap-2">
                        <div className="stack gap-1" style={{ minInlineSize: 0 }}>
                          <span dir="auto">{att.name || t('announcements.attachmentFallback')}</span>
                          <span className="tiny faint" dir="ltr">
                            {[att.mimetype, att.file_size ? `${att.file_size} B` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={attachBusy === att.id}
                          aria-busy={attachBusy === att.id}
                          aria-label={`${t('announcements.downloadAttachment')}: ${att.name || att.id}`}
                          onClick={() => void onDownload(att.id, att.name)}
                        >
                          {t('announcements.download')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {attachMsg && (
                    <p className="tiny mt-2" role="alert" style={{ color: 'var(--c-red)' }}>
                      {attachMsg}
                    </p>
                  )}
                </Card>
              )}
              {(item.links?.length ?? 0) > 0 ? (
                <Card className="mt-3">
                  <h2 className="tiny" style={{ marginBlockEnd: '0.75rem' }}>{t('secureMaterials.title')}</h2>
                  <SmartLinkCards links={item.links} />
                </Card>
              ) : null}
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
