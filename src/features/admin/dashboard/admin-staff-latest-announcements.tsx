'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { fetchCommunicationContentList } from '@/features/communication/api/admin-communication-api';
import type { CommunicationContent } from '@/types/communication';
import styles from '@/features/announcements/components/recipient-announcements-dashboard-section.module.css';

const LIMIT = 3;

function timestamp(item: CommunicationContent): string | null | undefined {
  return item.published_at ?? item.created_at;
}

function sortValue(item: CommunicationContent): number {
  const raw = timestamp(item);
  if (!raw) return 0;
  const value = Date.parse(raw);
  return Number.isFinite(value) ? value : 0;
}

export function AdminStaffLatestAnnouncements() {
  const t = useT();
  const { formatDateTime } = useFormat();
  const [items, setItems] = useState<CommunicationContent[]>([]);

  useEffect(() => {
    let active = true;
    void fetchCommunicationContentList({
      page: 1,
      page_size: 20,
      content_type: 'announcement',
    }).then((res) => {
      if (!active || !res.success) return;
      setItems(
        res.data
          .filter(
            (item) =>
              item.content_type === 'announcement' &&
              item.state === 'published' &&
              item.channel_id == null,
          )
          .sort((a, b) => sortValue(b) - sortValue(a))
          .slice(0, LIMIT),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="section" data-testid="admin-staff-latest-announcements">
      <SectionHead
        title={t('dashboard.latestMessages')}
        action={
          <Link className="btn btn--ghost btn--sm" href="/admin/announcements">
            {t('common.viewAll')}
          </Link>
        }
      />
      <div className={styles.shell}>
        {items.length > 0 ? (
          <div className={styles.list}>
            {items.map((item) => {
              const title = item.subject?.trim() || item.name?.trim() || t('announcements.untitled');
              const sender = item.author?.name ?? t('announcements.unknownSender');
              const time = timestamp(item);
              return (
                <Link
                  key={item.id}
                  href={`/admin/communication/${item.id}`}
                  className={`${styles.item} ${styles.unread}`}
                >
                  <div className={styles.main}>
                    <div className={styles.titleLine}>
                      <span className={styles.unreadDot} aria-hidden="true" />
                      <strong className={styles.title} dir="auto">
                        {title}
                      </strong>
                    </div>
                    <div className={`${styles.meta} tiny muted`}>
                      <span className={styles.sender} dir="auto">
                        {sender}
                      </span>
                      <span aria-hidden="true">·</span>
                      <time className={styles.time} dir="ltr" dateTime={time ?? undefined}>
                        {formatDateTime(time)}
                      </time>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
