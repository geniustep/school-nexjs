'use client';

import { InfoBanner } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import { normalizeAdmissionDecision } from '../utils/normalize-admission-decision';
import {
  formatOfferStateLabelKey,
  normalizeStatusWarnings,
  resolveIsSchoolRejected,
  resolveOfferStateValue,
  resolveRegistrationDisplayLabelKey,
  resolveRegistrationStatus,
  statusWarningLabelKey,
} from '../utils/admission-status-display';
import { refName } from '../utils/admission-labels';

export function AdmissionOutcomeSummary({ detail }: { detail: AdmissionDetail }) {
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const decision = normalizeAdmissionDecision(detail);
  const registration = resolveRegistrationStatus(detail);
  const schoolRejected = resolveIsSchoolRejected(detail);
  const offer = resolveOfferStateValue(detail);
  const offerKey = formatOfferStateLabelKey(offer);
  const warnings = normalizeStatusWarnings(detail.status_warnings);
  const registrationLabel = t(resolveRegistrationDisplayLabelKey(detail));
  const isReady =
    registration.status !== 'registered' && String(detail.state) === 'confirmed';
  const isAwaiting =
    registration.status === 'awaiting_registration' && !isReady;

  let decisionLabel = t('admin.admissions.schoolDecision.pending');
  if (schoolRejected) {
    decisionLabel = t('admin.admissions.schoolDecision.rejected');
  } else if (decision?.decision) {
    const key = `admin.admissions.decisions.${decision.decision}`;
    const translated = t(key);
    decisionLabel = translated !== key ? translated : decision.decision;
  }

  return (
    <section
      className="admission-outcome-summary"
      aria-label={t('admin.admissions.outcomeSummary.title')}
      data-testid="admission-outcome-summary"
    >
      <div className="admission-outcome-summary__grid">
        <div className="admission-outcome-summary__cell">
          <span className="tiny muted">{t('admin.admissions.outcomeSummary.schoolDecision')}</span>
          <strong data-testid="outcome-school-decision">{decisionLabel}</strong>
          {decision?.decision_date ? (
            <span className="tiny muted">{formatDate(decision.decision_date)}</span>
          ) : null}
          {decision?.decision_user ? (
            <span className="tiny muted">{refName(decision.decision_user)}</span>
          ) : null}
        </div>
        <div className="admission-outcome-summary__cell">
          <span className="tiny muted">{t('admin.admissions.outcomeSummary.registration')}</span>
          <strong data-testid="outcome-registration">{registrationLabel}</strong>
          {detail.converted_at ? (
            <span className="tiny muted">
              {t('admin.admissions.registration.convertedAt', {
                date: formatDateTime(String(detail.converted_at)),
              })}
            </span>
          ) : null}
        </div>
        <div className="admission-outcome-summary__cell">
          <span className="tiny muted">{t('admin.admissions.outcomeSummary.offer')}</span>
          <strong data-testid="outcome-offer">
            {offerKey ? t(offerKey) : t('admin.admissions.outcomeSummary.offerNone')}
          </strong>
        </div>
      </div>

      {isReady ? (
        <InfoBanner
          tone="green"
          title={t('admin.admissions.registrationStatus.ready_for_registration')}
          description={t('admin.admissions.registration.readyMessage')}
        />
      ) : null}

      {isAwaiting ? (
        <InfoBanner
          tone="amber"
          title={t('admin.admissions.registrationStatus.awaiting_registration')}
          description={t('admin.admissions.registration.awaitingMessage')}
        />
      ) : null}

      {warnings.length > 0 ? (
        <div className="admission-outcome-summary__warnings" role="status">
          <p className="tiny muted">{t('admin.admissions.statusWarnings.sectionTitle')}</p>
          <ul>
            {warnings.map((code) => {
              const key = statusWarningLabelKey(code);
              const label = t(key);
              return <li key={code}>{label !== key ? label : code}</li>;
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
