'use client';

import { useT } from '@/features/i18n/locale-context';
import type { AdmissionRegistrationContext } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import {
  formatPrefillFieldValue,
  formatPrefillMessage,
} from '@/features/admin/admissions/utils/admission-prefill-display';
import { formatMoroccanPhoneDisplay } from '@/features/admin/students/utils/normalize-moroccan-phone';

export function StudentCreatePrefillBanner({
  banner,
}: {
  banner: AdmissionRegistrationContext;
}) {
  const t = useT();
  const warnings = banner.warnings ?? [];
  const blockingIssues = banner.blockingIssues ?? [];
  const hasFlags = warnings.length > 0 || blockingIssues.length > 0;
  const selection = banner.guardianSelection;
  const snapshot = banner.guardianPrefillText;
  const showGuardianTextNotice =
    selection.selectionRequired &&
    !selection.isExistingGuardianSelected &&
    Boolean(snapshot.name.trim() || snapshot.phone.trim());

  return (
    <section className="student-create-prefill" aria-label={t('admin.admissions.registration.prefillBannerTitle', { reference: banner.reference })}>
      <div className="student-create-prefill__row">
        <div className="student-create-prefill__lead">
          <span className="student-create-prefill__badge">{banner.reference}</span>
          <p className="student-create-prefill__note">
            {t('admin.admissions.registration.prefillBannerDescription')}
          </p>
          <p className="student-create-prefill__note student-create-prefill__note--secondary muted">
            {t('admin.admissions.registration.prefillMultiGuardianHint')}
          </p>
        </div>

        {(banner.decision || banner.offerState) ? (
          <ul className="student-create-prefill__status">
            {banner.decision ? (
              <li className="student-create-prefill__status-item student-create-prefill__status-item--success">
                <span className="student-create-prefill__status-label">
                  {t('admin.admissions.registration.prefillDecision')}
                </span>
                <span className="student-create-prefill__status-value">
                  {formatPrefillFieldValue('decision', banner.decision, t)}
                </span>
              </li>
            ) : null}
            {banner.offerState ? (
              <li className="student-create-prefill__status-item">
                <span className="student-create-prefill__status-label">
                  {t('admin.admissions.registration.prefillOfferState')}
                </span>
                <span className="student-create-prefill__status-value">
                  {formatPrefillFieldValue('offer_state', banner.offerState, t)}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {showGuardianTextNotice ? (
        <div className="student-create-prefill__flags" role="status">
          <p className="student-create-prefill__flag student-create-prefill__flag--warn">
            <span className="student-create-prefill__flag-icon" aria-hidden="true">
              !
            </span>
            {t('admin.admissions.registration.guardianTextPrefillNotice')}
          </p>
          <p className="student-create-prefill__note muted" dir="auto">
            {snapshot.name || '—'}
            {snapshot.phone.trim() ? (
              <>
                {' · '}
                <span dir="ltr">{formatMoroccanPhoneDisplay(snapshot.phone)}</span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {hasFlags ? (
        <ul className="student-create-prefill__flags">
          {warnings.map((item, index) => (
            <li key={`w-${index}`} className="student-create-prefill__flag student-create-prefill__flag--warn">
              <span className="student-create-prefill__flag-icon" aria-hidden="true">
                !
              </span>
              {formatPrefillMessage(item, t)}
            </li>
          ))}
          {blockingIssues.map((item, index) => (
            <li key={`b-${index}`} className="student-create-prefill__flag student-create-prefill__flag--block">
              <span className="student-create-prefill__flag-icon" aria-hidden="true">
                ×
              </span>
              {formatPrefillMessage(item, t)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
