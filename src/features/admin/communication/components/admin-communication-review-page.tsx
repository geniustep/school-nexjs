'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 *
 * Admin communication review workspace — content list + filters.
 * Actions driven by Backend allowed_actions + communication.* capabilities.
 */

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Badge, Card } from '@/components/ui/primitives';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { RequireCommunicationReviewAccess } from '@/features/admin/communication/components/require-communication-review';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/utils/format';
import { canReviewCommunication } from '@/lib/permissions/communication';
import { fetchCommunicationContentList } from '@/features/communication/api/admin-communication-api';
import {
  communicationContentTypeMessageKey,
  communicationStateMessageKey,
  stripHtmlPreview,
} from '@/features/communication/utils/communication-labels';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent } from '@/types/communication';
import '../communication-review.css';

const FILTERS = [
  { id: 'all', state: '', contentType: '', labelKey: 'communication.filter.all' },
  {
    id: 'announcements',
    state: '',
    contentType: 'announcement',
    labelKey: 'communication.contentType.announcement',
  },
  {
    id: 'messages',
    state: '',
    contentType: 'message',
    labelKey: 'communication.filter.messages',
  },
  {
    id: 'homework',
    state: '',
    contentType: 'homework',
    labelKey: 'communication.filter.homework',
  },
  {
    id: 'resource',
    state: '',
    contentType: 'resource',
    labelKey: 'communication.filter.resource',
  },
  {
    id: 'submitted',
    state: 'submitted',
    contentType: '',
    labelKey: 'communication.filter.submitted',
  },
  {
    id: 'changes_requested',
    state: 'changes_requested',
    contentType: '',
    labelKey: 'communication.filter.changes_requested',
  },
  {
    id: 'approved',
    state: 'approved',
    contentType: '',
    labelKey: 'communication.filter.approved',
  },
  {
    id: 'scheduled',
    state: 'scheduled',
    contentType: '',
    labelKey: 'communication.filter.scheduled',
  },
  {
    id: 'published',
    state: 'published',
    contentType: '',
    labelKey: 'communication.filter.published',
  },
] as const;

function AdminCommunicationReviewInner() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterId = searchParams.get('filter') || 'submitted';
  const active = FILTERS.find((f) => f.id === filterId) ?? FILTERS[5];

  const [items, setItems] = useState<CommunicationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query: Record<string, string | number> = { page_size: 50 };
    if (active.state) query.state = active.state;
    if (active.contentType) query.content_type = active.contentType;
    const res = await fetchCommunicationContentList(query);
    if (res.success) {
      setItems(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [active.contentType, active.state]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canReviewCommunication(user)) {
    return (
      <EmptyState
        icon="🔒"
        title={t('nav.communicationReview')}
        description={t('communication.permissionDeniedDesc')}
      />
    );
  }

  return (
    <div className="admin-workspace communication-review">
      <PageHeader
        title={t('communication.reviewTitle')}
        subtitle={t('communication.reviewSubtitle')}
      />

      <div
        className="communication-review__filters"
        role="tablist"
        aria-label={t('communication.filters')}
      >
        {FILTERS.map((f) => {
          const selected = f.id === active.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('filter', f.id);
                router.replace(`${pathname}?${params.toString()}`);
              }}
            >
              {t(f.labelKey)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState label={t('communication.loading')} />
      ) : error ? (
        <ApiErrorView error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="📣"
          title={t('communication.emptyTitle')}
          description={t('communication.emptyDesc')}
        />
      ) : (
        <div className="communication-review__grid">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/communication/${item.id}`}
              className="card card--pad communication-review__card row-link"
            >
              <div className="between" style={{ gap: 8, flexWrap: 'wrap' }}>
                <strong dir="auto">{item.subject || item.name || `#${item.id}`}</strong>
                <Badge
                  tone={
                    item.state === 'changes_requested'
                      ? 'amber'
                      : item.state === 'published'
                        ? 'green'
                        : 'slate'
                  }
                >
                  {t(communicationStateMessageKey(item.state))}
                </Badge>
              </div>
              <div className="wrap-gap">
                <Badge tone="slate">{t(communicationContentTypeMessageKey(item.content_type))}</Badge>
                {item.message_direction ? (
                  <Badge tone="slate">{item.message_direction}</Badge>
                ) : null}
              </div>
              <p className="tiny muted" dir="auto">
                {stripHtmlPreview(item.current_version?.body || item.body || '') || t('common.dash')}
              </p>
              <div className="tiny faint">
                {item.author?.name || t('common.dash')}
                {' · '}
                {item.audience_summary?.label || t('common.dash')}
                {' · '}
                {item.submitted_at
                  ? formatDateTime(item.submitted_at)
                  : item.created_at
                    ? formatDateTime(item.created_at)
                    : t('common.dash')}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Card className="communication-review__nav-card">
        <Link href="/admin/channels" className="btn btn--ghost btn--sm">
          {t('nav.channels')}
        </Link>
      </Card>
    </div>
  );
}

export function AdminCommunicationReviewPage() {
  return (
    <RequireCommunicationReviewAccess>
      <AdminCommunicationReviewInner />
    </RequireCommunicationReviewAccess>
  );
}
