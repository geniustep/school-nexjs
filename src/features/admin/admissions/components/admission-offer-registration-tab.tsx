'use client';

import { AdmissionOffersTab } from './admission-offers-tab';
import { AdmissionPrefillTab } from './admission-prefill-tab';
import { AdmissionRegistrationActions } from './admission-registration-actions';
import type { AdmissionDetail } from '@/types/admission';
import { useT } from '@/features/i18n/locale-context';
import { hasAdmissionAllowedAction } from '../utils/admission-allowed-actions';
import {
  resolveOfferStateValue,
  resolveRegistrationStatus,
  formatOfferStateLabelKey,
  resolveRegistrationDisplayLabelKey,
} from '../utils/admission-status-display';

export function AdmissionOfferRegistrationTab({
  detail,
  onUpdated,
}: {
  detail: AdmissionDetail;
  onUpdated: () => void;
}) {
  const t = useT();
  const actions = detail.allowed_actions ?? {};
  const showPrefill = hasAdmissionAllowedAction(actions, 'get_prefill');
  const offer = resolveOfferStateValue(detail);
  const offerKey = formatOfferStateLabelKey(offer);
  const registration = resolveRegistrationStatus(detail);

  return (
    <div className="admission-merged-tab" data-testid="admission-tab-offer-registration">
      <section className="admission-merged-tab__section">
        <h3 className="admission-merged-tab__heading">
          {t('admin.admissions.tabs.offerSection')}
        </h3>
        <p className="muted tiny admission-merged-tab__meta">
          {t('admin.admissions.outcomeSummary.offer')}:{' '}
          {offerKey ? t(offerKey) : t('admin.admissions.outcomeSummary.offerNone')}
        </p>
        <AdmissionOffersTab
          detail={detail}
          allowedActions={actions}
          onUpdated={onUpdated}
        />
      </section>

      <section className="admission-merged-tab__section">
        <h3 className="admission-merged-tab__heading">
          {t('admin.admissions.tabs.registrationSection')}
        </h3>
        <p className="muted tiny admission-merged-tab__meta">
          {t(resolveRegistrationDisplayLabelKey(detail))}
          {registration.status === 'awaiting_registration' &&
          String(detail.state) !== 'confirmed'
            ? ` — ${t('admin.admissions.registrationStatus.awaiting_registration')}`
            : null}
        </p>
        <AdmissionRegistrationActions detail={detail} />
        {showPrefill ? (
          <div className="admission-merged-tab__prefill">
            <AdmissionPrefillTab admissionId={String(detail.id)} enabled />
          </div>
        ) : null}
      </section>
    </div>
  );
}
