'use client';

import { AdmissionOffersTab } from './admission-offers-tab';
import { AdmissionPrefillTab } from './admission-prefill-tab';
import { AdmissionRegistrationActions } from './admission-registration-actions';
import type { AdmissionDetail } from '@/types/admission';
import { useT } from '@/features/i18n/locale-context';
import { hasAdmissionAllowedAction } from '../utils/admission-allowed-actions';
import {
  resolveAcceptanceRegistrationMode,
  resolveRegistrationSectionState,
  shouldShowOffersList,
  shouldShowRegistrationSection,
} from '../utils/admission-acceptance-registration-ux';
import {
  registrationReadinessLabelKey,
  resolveOfferRequired,
} from '../utils/admission-assessment-workflow-contract';
import {
  formatRegistrationRequirementMessage,
  registrationRequirementListKey,
} from '../utils/admission-prefill-display';
import { normalizeAdmissionDecision } from '../utils/normalize-admission-decision';

export function AdmissionOfferRegistrationTab({
  detail,
  onUpdated,
}: {
  detail: AdmissionDetail;
  onUpdated: () => void;
}) {
  const t = useT();
  const actions = detail.allowed_actions ?? {};
  const mode = resolveAcceptanceRegistrationMode(detail);
  const showPrefill = hasAdmissionAllowedAction(actions, 'get_prefill');
  const offerRequired = resolveOfferRequired(detail);
  const decision = normalizeAdmissionDecision(detail);
  const registration = resolveRegistrationSectionState(detail);

  return (
    <div className="admission-merged-tab" data-testid="admission-tab-offer-registration">
      {mode === 'before_decision' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.tabs.offer_registration')}
          </h3>
          <p className="muted" data-testid="acceptance-before-decision">
            {t('admin.admissions.acceptance.beforeDecision')}
          </p>
        </section>
      ) : null}

      {mode === 'rejected' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.acceptance.rejectedTitle')}
          </h3>
          <p data-testid="acceptance-rejected">
            {t('admin.admissions.acceptance.rejectedBody')}
          </p>
          {decision?.decision_notes ? (
            <p className="muted tiny">{decision.decision_notes}</p>
          ) : null}
          {decision?.decision_date ? (
            <p className="muted tiny" dir="ltr">
              {decision.decision_date}
            </p>
          ) : null}
          {hasAdmissionAllowedAction(actions, 'reopen') ? (
            <p className="muted tiny">{t('admin.admissions.acceptance.reopenHint')}</p>
          ) : null}
        </section>
      ) : null}

      {mode === 'accepted_no_offer' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.acceptance.acceptedDirectTitle')}
          </h3>
          <p data-testid="acceptance-no-offer-required">
            {t('admin.admissions.acceptance.acceptedDirectBody')}
          </p>
          <p className="muted tiny">{t('admin.admissions.journey.offerNotRequired')}</p>
        </section>
      ) : null}

      {mode === 'offer_required_not_created' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.acceptance.offerRequiredTitle')}
          </h3>
          <p data-testid="acceptance-offer-required">
            {t('admin.admissions.acceptance.offerRequiredBody')}
          </p>
          {detail.offer_summary?.policy_note || detail.offer_summary?.reason ? (
            <p className="muted tiny">
              {String(detail.offer_summary.policy_note || detail.offer_summary.reason)}
            </p>
          ) : null}
          {hasAdmissionAllowedAction(actions, 'create_offer') ? (
            <AdmissionOffersTab
              detail={detail}
              allowedActions={actions}
              onUpdated={onUpdated}
              hideEmptyState
            />
          ) : null}
        </section>
      ) : null}

      {mode === 'offer_draft' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.acceptance.offerDraftTitle')}
          </h3>
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={onUpdated}
          />
        </section>
      ) : null}

      {mode === 'offer_sent' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.acceptance.awaitingFamilyTitle')}
          </h3>
          <p className="muted tiny">{t('admin.admissions.acceptance.awaitingFamilyBody')}</p>
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={onUpdated}
          />
        </section>
      ) : null}

      {mode === 'offer_accepted' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.acceptance.familyAcceptedTitle')}
          </h3>
          <p data-testid="acceptance-family-accepted">
            {t('admin.admissions.acceptance.familyAcceptedBody')}
          </p>
          <p className="muted tiny">
            {t('admin.admissions.acceptance.offerAcceptDoesNotRegister')}
          </p>
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={onUpdated}
          />
        </section>
      ) : null}

      {mode === 'offer_declined' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.offerStates.familyDeclined')}
          </h3>
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={onUpdated}
          />
        </section>
      ) : null}

      {mode === 'offer_expired' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.offerStates.familyExpired')}
          </h3>
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={onUpdated}
          />
        </section>
      ) : null}

      {mode === 'offer_withdrawn' ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.offerStates.withdrawn')}
          </h3>
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={onUpdated}
          />
        </section>
      ) : null}

      {mode === 'legacy_fallback' && shouldShowOffersList(mode) ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.tabs.offerSection')}
          </h3>
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={onUpdated}
          />
        </section>
      ) : null}

      {shouldShowRegistrationSection(mode) ? (
        <section className="admission-merged-tab__section">
          <h3 className="admission-merged-tab__heading">
            {t('admin.admissions.tabs.registrationSection')}
          </h3>
          {registration.readiness ? (
            <p className="muted tiny" data-testid="registration-readiness">
              {t(registrationReadinessLabelKey(registration.readiness))}
            </p>
          ) : null}

          {registration.blocking.length > 0 ? (
            <div data-testid="registration-blocking">
              <h4 className="admission-merged-tab__subheading">
                {t('admin.admissions.registrationRequirements.blocking')}
              </h4>
              <ul>
                {registration.blocking.map((req, idx) => (
                  <li key={registrationRequirementListKey(req, idx, 'blocking')}>
                    {formatRegistrationRequirementMessage(req, t)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {registration.warning.length > 0 ? (
            <div data-testid="registration-warning">
              <h4 className="admission-merged-tab__subheading">
                {t('admin.admissions.registrationRequirements.warning')}
              </h4>
              <ul>
                {registration.warning.map((req, idx) => (
                  <li key={registrationRequirementListKey(req, idx, 'warning')}>
                    {formatRegistrationRequirementMessage(req, t)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {registration.information.length > 0 ? (
            <div data-testid="registration-information">
              <h4 className="admission-merged-tab__subheading">
                {t('admin.admissions.registrationRequirements.information')}
              </h4>
              <ul>
                {registration.information.map((req, idx) => (
                  <li key={registrationRequirementListKey(req, idx, 'info')}>
                    {formatRegistrationRequirementMessage(req, t)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {registration.readiness === 'registered' || registration.studentId != null ? (
            <p data-testid="registration-registered">
              {t('admin.admissions.registrationReadiness.registered')}
            </p>
          ) : null}

          {registration.readiness !== 'not_applicable' ? (
            <>
              <AdmissionRegistrationActions detail={detail} />
              {showPrefill &&
              registration.readiness !== 'blocked' &&
              registration.studentId == null ? (
                <div className="admission-merged-tab__prefill">
                  <AdmissionPrefillTab admissionId={String(detail.id)} enabled />
                </div>
              ) : null}
            </>
          ) : null}

          {offerRequired === false && mode === 'accepted_no_offer' ? (
            <p className="muted tiny">{t('admin.admissions.acceptance.directRegistrationHint')}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
