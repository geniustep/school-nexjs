'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Shared family delivery presentation for admin channel list + detail.
 * Never renders PII or raw exclusion codes.
 * Never treats excluded_count as undeliverable guardian count.
 */

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  buildChannelAudienceViewModel,
  resolveFamilyPartialHintKey,
} from '@/features/channels/utils/channel-audience-present';
import { formatChannelMemberCount } from '@/features/channels/utils/channels-list-present';
import type { AdminChannel } from '@/types/admin-channel';

type AudienceChannel = Pick<
  AdminChannel,
  'channel_type' | 'type' | 'member_count' | 'member_summary' | 'family_audience_summary'
>;

export function ChannelAudienceSummary({
  channel,
  compact = false,
  onViewUndeliverable,
}: {
  channel: AudienceChannel;
  /** Compact single-line meta for list cards. */
  compact?: boolean;
  /** On-demand drill-down — parent fetches; never called from list load. */
  onViewUndeliverable?: () => void;
}) {
  const t = useT();
  const view = buildChannelAudienceViewModel(channel);

  if (view.mode === 'staff') {
    return (
      <span className="channel-audience" data-testid="channel-audience-staff">
        {t('channels.audience.staffMembers', { count: view.memberCount })}
      </span>
    );
  }

  if (view.mode === 'members') {
    return (
      <span className="channel-audience" data-testid="channel-audience-members" dir="ltr">
        {formatChannelMemberCount(
          view.memberCount,
          t('channels.member'),
          t('channels.members'),
        )}
      </span>
    );
  }

  if (!view.summary) {
    return (
      <span
        className="channel-audience channel-audience--fallback"
        data-testid="channel-audience-family-fallback"
      >
        <Badge tone={view.badgeTone}>{t(view.badgeKey)}</Badge>
        {!compact ? (
          <span className="channel-audience__hint muted tiny">
            {t('channels.audience.unavailableData')}
          </span>
        ) : (
          <span className="channel-audience__line muted tiny">
            {t('channels.audience.unavailableData')}
          </span>
        )}
      </span>
    );
  }

  const summary = view.summary;
  const hintKey =
    view.hintKey === 'channels.audience.hints.partialAccounts'
      ? resolveFamilyPartialHintKey(summary)
      : view.hintKey;
  const showUndeliverableCta =
    summary.delivery_state === 'partial' && typeof onViewUndeliverable === 'function';

  return (
    <span
      className="channel-audience channel-audience--family"
      data-testid="channel-audience-family"
      data-delivery-state={summary.delivery_state}
    >
      <Badge tone={view.badgeTone}>{t(view.badgeKey)}</Badge>
      <span className="channel-audience__lines">
        <span className="channel-audience__line" dir="auto">
          {t('channels.audience.audienceCounts', {
            students: summary.student_count,
            guardians: summary.guardian_count,
          })}
        </span>
        <span className="channel-audience__line" dir="auto">
          {t('channels.audience.deliverableAccounts', {
            count: summary.deliverable_user_count,
          })}
        </span>
        {hintKey ? (
          <span className="channel-audience__hint muted tiny" dir="auto">
            {t(hintKey)}
          </span>
        ) : null}
        {showUndeliverableCta ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm channel-audience__drilldown"
            data-testid="undeliverable-guardians-cta"
            aria-label={t('channels.audience.undeliverable.viewList')}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onViewUndeliverable();
            }}
          >
            {t('channels.audience.undeliverable.viewList')}
          </button>
        ) : null}
      </span>
    </span>
  );
}
