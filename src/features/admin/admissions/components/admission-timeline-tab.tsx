'use client';

import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { refName } from '../utils/admission-labels';
import { OverviewEmptyValue } from './admission-overview-primitives';
import { AdmissionQuickFollowUpDialog } from './admission-quick-follow-up-dialog';
import { useState } from 'react';
import type { AdmissionDetail, AdmissionTimelineItem } from '@/types/admission';
import { hasModernContract, isModernActionAllowed } from '../utils/admission-modern-actions';

function actorLabel(item: AdmissionTimelineItem): string | null {
  if (item.actor_name) return item.actor_name;
  if (typeof item.actor === 'string') return item.actor;
  if (item.actor && typeof item.actor === 'object') return refName(item.actor);
  return null;
}

export function AdmissionTimelineTab({
  detail,
  onUpdated,
}: {
  detail: AdmissionDetail;
  onUpdated: () => void;
}) {
  const t = useT();
  const { formatDateTime, formatDate } = useFormat();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const modern = hasModernContract(detail);
  const timeline = Array.isArray(detail.timeline) ? detail.timeline : [];
  const canLogContact = isModernActionAllowed(detail.modern_allowed_actions, 'log_contact');

  return (
    <div className="admissions-timeline-tab" data-testid="admission-timeline-tab">
      {modern && canLogContact ? (
        <div className="admissions-timeline-form__actions" style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            data-testid="admission-timeline-log-contact"
            onClick={() => setFollowUpOpen(true)}
          >
            {t('admin.admissions.actions.logContact')}
          </button>
        </div>
      ) : null}

      {timeline.length === 0 ? (
        <EmptyState compact title={t('admin.admissions.timeline.empty')} />
      ) : (
        <ol className="admissions-timeline" aria-label={t('admin.admissions.tabs.history')}>
          {timeline.map((item, index) => {
            const key = String(item.id ?? `${item.code ?? 'item'}-${item.occurred_at ?? index}`);
            const when = item.occurred_at
              ? formatDateTime(item.occurred_at) || formatDate(item.occurred_at) || item.occurred_at
              : '';
            const actor = actorLabel(item);
            const result = item.result_label ?? item.result;
            return (
              <li
                key={key}
                className={`admissions-timeline__item${item.is_system ? ' admissions-timeline__item--system' : ''}`}
                data-system={item.is_system ? 'true' : 'false'}
              >
                <div className="admissions-timeline__item-marker" aria-hidden="true" />
                <div className="admissions-timeline__item-card">
                  <header className="admissions-timeline__item-head">
                    <span className="admissions-timeline__item-type">
                      {item.label || item.code || t('admin.admissions.timeline.addActivity')}
                      {item.is_system ? (
                        <span className="muted tiny"> · {t('admin.admissions.timeline.system')}</span>
                      ) : null}
                    </span>
                    {when ? (
                      <time className="admissions-timeline__item-date" dateTime={item.occurred_at ?? undefined} dir="ltr">
                        {when}
                      </time>
                    ) : null}
                  </header>
                  {result ? <p className="admissions-timeline__item-note">{result}</p> : null}
                  {item.note ? <p className="admissions-timeline__item-note">{item.note}</p> : null}
                  <footer className="admissions-timeline__item-meta">
                    <span className="admissions-timeline__item-user">
                      {actor || <OverviewEmptyValue />}
                    </span>
                    {item.next_action ? (
                      <span className="admissions-timeline__item-next">
                        {t('admin.admissions.nextAction')}: {item.next_action}
                        {item.next_action_date
                          ? ` — ${formatDate(item.next_action_date) || item.next_action_date}`
                          : ''}
                      </span>
                    ) : null}
                  </footer>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <AdmissionQuickFollowUpDialog
        admissionId={detail.id}
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        onSuccess={onUpdated}
      />
    </div>
  );
}
