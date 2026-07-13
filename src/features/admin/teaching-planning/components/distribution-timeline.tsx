'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Combined distribution timeline. Instructional Item ≠ Calendar Marker: the two
 * kinds are distinguished by icon + text label + badge (never colour alone).
 */

import { Badge } from '@/components/ui/primitives';
import { EmptyState } from '@/components/states/states';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  distributionItemTypeLabelKey,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import type { AnnualDistributionTimeline, TimelineEntry } from '@/types/teaching-planning';

function EntryRow({ entry }: { entry: TimelineEntry }) {
  const t = useT();
  const { formatDate } = useFormat();
  const isInstructional = entry.kind === 'instructional_item';
  const dateRange = [entry.date_start, entry.date_end]
    .filter(Boolean)
    .map((d) => formatDate(d as string))
    .join(' → ');

  return (
    <li
      className={`tp-timeline__item tp-timeline__item--${
        isInstructional ? 'instructional' : 'marker'
      }`}
    >
      <span className="tp-timeline__icon" aria-hidden="true">
        {isInstructional ? '📘' : '📅'}
      </span>
      <div className="tp-timeline__body">
        <div className="tp-timeline__head">
          <Badge tone={isInstructional ? 'blue' : 'amber'}>
            {isInstructional
              ? t('admin.teachingPlanning.timeline.instructionalItem')
              : t('admin.teachingPlanning.timeline.calendarMarker')}
          </Badge>
          <strong dir="auto">{entry.name || t('common.dash')}</strong>
        </div>
        <div className="tp-timeline__meta muted tiny">
          {isInstructional ? (
            <span>{t(distributionItemTypeLabelKey(entry.item_type))}</span>
          ) : (
            <span>
              {entry.is_instructional_break
                ? t('admin.teachingPlanning.timeline.instructionalBreak')
                : t('admin.teachingPlanning.timeline.marker')}
            </span>
          )}
          {dateRange ? <span dir="ltr">{dateRange}</span> : null}
          {isInstructional && entry.session_count != null ? (
            <span>
              <bdi dir="ltr">{entry.session_count}</bdi>{' '}
              {t('admin.teachingPlanning.sequences.templates.sessionsShort')}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function DistributionTimeline({
  timeline,
}: {
  timeline: AnnualDistributionTimeline;
}) {
  const t = useT();
  const entries = timeline.combined_timeline;

  if (entries.length === 0) {
    return (
      <EmptyState
        compact
        icon="🗓️"
        title={t('admin.teachingPlanning.timeline.emptyTitle')}
        description={t('admin.teachingPlanning.timeline.emptyDesc')}
      />
    );
  }

  return (
    <div className="tp-timeline">
      <div className="tp-timeline__legend">
        <span className="tp-timeline__legend-item">
          <span aria-hidden="true">📘</span>
          {t('admin.teachingPlanning.timeline.instructionalItem')}
        </span>
        <span className="tp-timeline__legend-item">
          <span aria-hidden="true">📅</span>
          {t('admin.teachingPlanning.timeline.calendarMarker')}
        </span>
      </div>
      <ol className="tp-timeline__list">
        {entries.map((entry) => (
          <EntryRow key={`${entry.kind}-${entry.id}`} entry={entry} />
        ))}
      </ol>
    </div>
  );
}
