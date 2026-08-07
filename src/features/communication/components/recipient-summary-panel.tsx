'use client';

/**
 * Displays Backend recipient_summary counts/labels/exclusions only.
 * Never computes guardians/students/staff locally.
 */

import { useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/utils/format';
import { shortSnapshotFingerprint } from '@/features/communication/utils/normalize-recipient-summary';
import type { CommunicationRecipientSummary } from '@/types/communication';
import './recipient-summary-panel.css';

function CountCard({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="recipient-summary__count" role="group" aria-label={`${label}: ${value}`}>
      <span className="recipient-summary__count-value">{value}</span>
      <span className="recipient-summary__count-label">{label}</span>
    </div>
  );
}

export function RecipientSummaryPanel({
  summary,
  presentation,
  showAdminSnapshotRef = false,
  compact = false,
  terminology = 'default',
}: {
  summary: CommunicationRecipientSummary | null | undefined;
  /** preview = advisory; frozen = Submit/Detail authoritative. */
  presentation: 'preview' | 'frozen';
  /** Short fingerprint for admin audit only — never full hash for end users. */
  showAdminSnapshotRef?: boolean;
  compact?: boolean;
  /**
   * beneficiaries — general communication journey (no visible «جمهور» labels).
   * default — channel / review surfaces (legacy keys preserved).
   */
  terminology?: 'default' | 'beneficiaries';
}) {
  const t = useT();
  const beneficiaries = terminology === 'beneficiaries';

  if (!summary) {
    return (
      <p className="recipient-summary__empty tiny" role="status">
        {t('communication.recipients.noSummary')}
      </p>
    );
  }

  const canSubmit = summary.can_submit;
  const blocking = summary.blocking_reasons?.filter(Boolean) ?? [];
  const labels = summary.audience_labels?.filter(Boolean) ?? [];
  const exclusions = summary.exclusion_summary ?? [];
  const fingerprintShort = shortSnapshotFingerprint(summary.snapshot_fingerprint);

  return (
    <div
      className={`recipient-summary${compact ? ' recipient-summary--compact' : ''}`}
      data-presentation={presentation}
      data-terminology={terminology}
    >
      <p className="recipient-summary__badge" role="status">
        {presentation === 'preview'
          ? beneficiaries
            ? t('communication.recipients.deliveryStatusTitle')
            : t('communication.recipients.previewBadge')
          : t('communication.recipients.frozenBadge')}
      </p>
      {presentation === 'preview' ? (
        <p className="recipient-summary__hint tiny">
          {t('communication.recipients.previewHint')}
        </p>
      ) : null}

      {summary.audience_changed === true ? (
        <p className="recipient-summary__warning" role="alert">
          {beneficiaries
            ? t('communication.recipients.beneficiariesChanged')
            : t('communication.recipients.audienceChanged')}
        </p>
      ) : null}

      {canSubmit === false ? (
        <p className="recipient-summary__warning" role="alert">
          {t('communication.recipients.cannotSubmit')}
        </p>
      ) : null}

      {blocking.length > 0 ? (
        <ul className="recipient-summary__blocking" aria-label={t('communication.recipients.blockingReasons')}>
          {blocking.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <div className="recipient-summary__counts">
        {beneficiaries ? (
          <>
            <CountCard
              label={t('communication.recipients.studentsConcerned')}
              value={summary.student_count}
            />
            <CountCard
              label={t('communication.recipients.guardiansLinked')}
              value={summary.guardian_count}
            />
            <CountCard
              label={t('communication.recipients.teachersConcerned')}
              value={summary.teacher_count}
            />
            <CountCard
              label={t('communication.recipients.staffConcerned')}
              value={summary.staff_count}
            />
            <CountCard
              label={t('communication.recipients.deliverableUsers')}
              value={summary.deliverable_user_count}
            />
          </>
        ) : (
          <>
            <CountCard
              label={t('communication.recipients.totalPeople')}
              value={summary.total_people_count}
            />
            <CountCard
              label={t('communication.recipients.deliverable')}
              value={summary.deliverable_user_count}
            />
            <CountCard
              label={t('communication.recipients.students')}
              value={summary.student_count}
            />
            <CountCard
              label={t('communication.recipients.guardians')}
              value={summary.guardian_count}
            />
            <CountCard
              label={t('communication.recipients.staff')}
              value={summary.staff_count}
            />
            <CountCard
              label={t('communication.recipients.teachers')}
              value={summary.teacher_count}
            />
            <CountCard
              label={t('communication.recipients.excluded')}
              value={summary.excluded_count}
            />
          </>
        )}
      </div>

      {labels.length > 0 ? (
        <div className="recipient-summary__labels">
          <span className="tiny">
            {beneficiaries
              ? t('communication.recipients.beneficiaryLabels')
              : t('communication.recipients.audienceLabels')}
          </span>
          <ul>
            {labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {exclusions.length > 0 ? (
        <div className="recipient-summary__exclusions">
          <span className="tiny">
            {beneficiaries
              ? t('communication.recipients.deliveryNotes')
              : t('communication.recipients.exclusionSummary')}
          </span>
          <ul>
            {exclusions.map((item, index) => {
              const text = item.reason || item.label || item.code || t('common.dash');
              const countPart =
                item.count != null ? ` (${item.count})` : '';
              return (
                <li key={`${text}-${index}`}>
                  {text}
                  {countPart}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {summary.resolved_at ? (
        <p className="tiny recipient-summary__meta">
          {t('communication.recipients.resolvedAt')}: {formatDateTime(summary.resolved_at)}
        </p>
      ) : null}

      {showAdminSnapshotRef && (summary.snapshot_id != null || fingerprintShort) ? (
        <p className="tiny recipient-summary__meta" aria-label={t('communication.recipients.snapshotRef')}>
          {summary.snapshot_id != null
            ? `${t('communication.recipients.snapshotId')}: ${summary.snapshot_id}`
            : null}
          {fingerprintShort
            ? ` · ${t('communication.recipients.fingerprintShort')}: ${fingerprintShort}`
            : null}
        </p>
      ) : null}
    </div>
  );
}
