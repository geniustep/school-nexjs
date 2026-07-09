'use client';

import { CopyValueButton } from '@/components/ui/copy-value-button';
import { useT } from '@/features/i18n/locale-context';
import {
  resolveGuardianAccountPresentation,
  type GuardianAccountPresentation,
  type GuardianAccountPresentationSource,
} from '../utils/resolve-guardian-account-presentation';

export function GuardianAccountOnboardingPanel({
  source,
  presentation: presentationOverride,
  title,
  compact = false,
}: {
  source?: GuardianAccountPresentationSource;
  presentation?: GuardianAccountPresentation;
  title?: string;
  compact?: boolean;
}) {
  const t = useT();
  const presentation = presentationOverride ?? resolveGuardianAccountPresentation(source);
  if (!presentation.hasVisibleAccountInfo) return null;

  return (
    <div
      className={`guardian-account-onboarding${compact ? ' guardian-account-onboarding--compact' : ''}`}
      role="region"
      aria-label={title ?? t('admin.guardianAccount.sectionTitle')}
    >
      {title ? <p className="guardian-account-onboarding__title">{title}</p> : null}
      <dl className="guardian-account-onboarding__list">
        {presentation.code ? (
          <div className="guardian-account-onboarding__row">
            <dt>{t('admin.guardianAccount.codeLabel')}</dt>
            <dd className="guardian-account-onboarding__value-row">
              <span className="mono" dir="ltr">
                {presentation.code}
              </span>
              <CopyValueButton
                value={presentation.code}
                label={t('admin.guardianAccount.copyCode')}
                copiedLabel={t('admin.guardianAccount.copied')}
              />
            </dd>
          </div>
        ) : null}
        {presentation.login ? (
          <div className="guardian-account-onboarding__row">
            <dt>{t('admin.account.loginName')}</dt>
            <dd className="guardian-account-onboarding__value-row">
              <span className="mono" dir="ltr">
                {presentation.login}
              </span>
              <CopyValueButton
                value={presentation.login}
                label={t('admin.guardianAccount.copyLogin')}
                copiedLabel={t('admin.guardianAccount.copied')}
              />
            </dd>
          </div>
        ) : null}
        <div className="guardian-account-onboarding__row">
          <dt>{t('admin.guardianAccount.statusLabel')}</dt>
          <dd>{t(presentation.statusLabelKey)}</dd>
        </div>
        {presentation.accessProvisioningLabelKey ? (
          <div className="guardian-account-onboarding__row">
            <dt>{t('admin.guardianAccount.provisioningOutcomeLabel')}</dt>
            <dd>{t(presentation.accessProvisioningLabelKey)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
