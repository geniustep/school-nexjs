'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Admin communication review workspace.
 * The submitted filter is the operational review queue; opening a record never
 * changes workflow state. Backend allowed_actions remains authoritative.
 */

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Badge, Card } from '@/components/ui/primitives';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { RequireCommunicationReviewAccess } from '@/features/admin/communication/components/require-communication-review';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/i18n/format';
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
    labelKey: 'communication.contentType.message',
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

const DASHBOARD_FILTERS = [
  {
    id: 'submitted_messages',
    state: 'submitted',
    contentType: 'message',
    labelKey: 'admin.pedagogicalDashboard.reviewMessages',
  },
  {
    id: 'submitted_homework',
    state: 'submitted',
    contentType: 'homework',
    labelKey: 'admin.pedagogicalDashboard.reviewHomeworks',
  },
] as const;

const DEFAULT_FILTER = FILTERS.find((filter) => filter.id === 'submitted') ?? FILTERS[0];

function stateTone(state: string): 'amber' | 'green' | 'slate' {
  if (state === 'submitted' || state === 'changes_requested' || state === 'approved') {
    return 'amber';
  }
  if (state === 'published') return 'green';
  return 'slate';
}

function audienceLabelParts(item: CommunicationContent): string[] {
  const candidates = [
    item.audience_summary?.class?.name,
    item.audience_summary?.level?.name,
    item.audience_summary?.subject?.name,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return Array.from(new Set(candidates));
}

function AdminCommunicationReviewInner() {
  const t = useT();
  const { locale } = useLocale();
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterId = searchParams.get('filter') || 'submitted';
  const active =
    [...FILTERS, ...DASHBOARD_FILTERS].find((filter) => filter.id === filterId) ?? DEFAULT_FILTER;

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
      setItems([]);
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

  const isReviewQueue = active.state === 'submitted';

  return (
    <div className="admin-workspace communication-review">
      <PageHeader
        title={t('communication.reviewTitle')}
        subtitle={t('communication.reviewSubtitle')}
      />

      {isReviewQueue ? (
        <section className="communication-review__queue-hero" aria-labelledby="review-queue-title">
          <div className="communication-review__queue-copy">
            <span className="communication-review__queue-marker" aria-hidden="true" />
            <div>
              <h2 id="review-queue-title">{t(active.labelKey)}</h2>
              <p>{t('communication.reviewSubtitle')}</p>
            </div>
          </div>
          <Badge tone="amber">{loading ? '…' : String(items.length)}</Badge>
        </section>
      ) : null}

      <div
        className="communication-review__filters"
        role="tablist"
        aria-label={t('communication.filters')}
      >
        {FILTERS.map((filter) => {
          const selected =
            filter.id === active.id || (filter.id === 'submitted' && active.state === 'submitted');
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'
              }
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('filter', filter.id);
                router.replace(`${pathname}?${params.toString()}`);
              }}
            >
              {t(filter.labelKey)}
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
          icon={isReviewQueue ? '✓' : '📣'}
          title={isReviewQueue ? t(active.labelKey) : t('communication.emptyTitle')}
          description={t('communication.emptyDesc')}
        />
      ) : (
        <div className="communication-review__grid">
          {items.map((item) => {
            const submittedAt = item.submitted_at || item.created_at;
            const preview = stripHtmlPreview(item.current_version?.body || item.body || '', 220);
            const audiences = audienceLabelParts(item);
            return (
              <Link
                key={item.id}
                href={`/admin/communication/${item.id}`}
                className="card card--pad communication-review__card row-link"
              >
                <div className="communication-review__card-head">
                  <div className="communication-review__card-title">
                    <div className="communication-review__badges">
                      <Badge tone="slate">
                        {t(communicationContentTypeMessageKey(item.content_type))}
                      </Badge>
                      <Badge tone={stateTone(item.state)}>
                        {t(communicationStateMessageKey(item.state))}
                      </Badge>
                    </div>
                    <strong dir="auto">{item.subject || item.name || `#${item.id}`}</strong>
                  </div>
                  <span className="communication-review__card-cta">
                    {t('common.view')}
                    <span aria-hidden="true">‹</span>
                  </span>
                </div>

                <p className="communication-review__preview" dir="auto">
                  {preview || t('common.dash')}
                </p>

                <dl className="communication-review__meta-grid">
                  <div>
                    <dt>{t('communication.author')}</dt>
                    <dd dir="auto">{item.author?.name || t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('communication.audience')}</dt>
                    <dd dir="auto">{audiences.length > 0 ? audiences.join(' / ') : t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('communication.submittedAt')}</dt>
                    <dd>{submittedAt ? formatDateTime(submittedAt, locale) : t('common.dash')}</dd>
                  </div>
                </dl>
              </Link>
            );
          })}
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
