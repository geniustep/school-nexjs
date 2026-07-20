'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useT } from '@/features/i18n/locale-context';
import {
  presentLastStatusReason,
  type AdmissionLastStatusReasonSource,
} from '../utils/admission-last-status-reason';

export function AdmissionLastStatusReason({
  record,
  layout = 'block',
  empty = false,
}: {
  record: AdmissionLastStatusReasonSource | null | undefined;
  /** `card` matches kanban section rhythm; `block` for detail aside. */
  layout?: 'card' | 'block';
  /** When true, show empty placeholder if no reason is recorded. */
  empty?: boolean;
}) {
  const t = useT();
  const reason = presentLastStatusReason(record, { t });

  if (!reason && !empty) return null;

  if (layout === 'card') {
    return (
      <div
        className="admission-card__status-reason"
        data-testid="admission-last-status-reason"
      >
        <span className="admission-card__section-label">
          {t('admin.admissions.lastStatusReason.label')}
        </span>
        <p
          className={
            reason
              ? 'admission-card__status-reason-value'
              : 'admission-card__status-reason-value muted'
          }
          dir="auto"
          title={reason || undefined}
        >
          {reason || t('admin.admissions.lastStatusReason.empty')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="admission-detail-aside-card__block"
      data-testid="admission-last-status-reason"
    >
      <span className="admission-detail-aside-card__label">
        {t('admin.admissions.lastStatusReason.label')}
      </span>
      <p
        className={reason ? 'admission-detail-aside-reason' : 'admission-detail-aside-reason muted'}
        dir="auto"
      >
        {reason || t('admin.admissions.lastStatusReason.empty')}
      </p>
    </div>
  );
}
