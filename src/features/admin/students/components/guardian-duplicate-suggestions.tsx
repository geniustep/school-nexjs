'use client';

import { useT } from '@/features/i18n/locale-context';
import { formatGuardianCandidateWarnings } from '../utils/guardian-candidate-presentation';
import { canLinkPersonAsGuardian } from '../utils/guardian-profile-contract';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import { formatRoleLabels } from '../utils/person-role-presentation';
import type { PersonSearchResult } from '@/types/student-360';
import { GuardianAccountOnboardingPanel } from './guardian-account-onboarding-panel';

export function GuardianDuplicateSuggestions({
  candidates,
  dismissed,
  onUseExisting,
  onDismiss,
}: {
  candidates: PersonSearchResult[];
  dismissed: boolean;
  onUseExisting: (person: PersonSearchResult) => void;
  onDismiss: () => void;
}) {
  const t = useT();
  if (!candidates.length) return null;

  return (
    <div
      className={`guardian-duplicate-suggestions${dismissed ? ' guardian-duplicate-suggestions--dismissed' : ''}`}
      role="alert"
    >
      <p className="guardian-duplicate-suggestions__title">
        {t('admin.student360.duplicatePersonFoundTitle')}
      </p>
      <ul className="guardian-duplicate-suggestions__list">
        {candidates.map((person) => {
          const canLink = canLinkPersonAsGuardian(person, false);
          const warnings = formatGuardianCandidateWarnings(t, person.warnings);
          return (
            <li key={`${person.partner_id}-${person.guardian_id ?? 'none'}`} className="guardian-duplicate-suggestions__item">
              <div className="guardian-duplicate-suggestions__body">
                <strong dir="auto">{person.name}</strong>
                {person.role_labels?.length ? (
                  <span className="tiny muted">{formatRoleLabels(person.role_labels)}</span>
                ) : null}
                {person.phone ? (
                  <span className="tiny mono" dir="ltr">
                    {formatMoroccanPhoneDisplay(person.phone)}
                  </span>
                ) : null}
                {person.email ? (
                  <span className="tiny" dir="ltr">
                    {person.email}
                  </span>
                ) : null}
                <GuardianAccountOnboardingPanel source={person} compact />
                {warnings.map((message) => (
                  <span key={message} className="tiny muted">
                    {message}
                  </span>
                ))}
              </div>
              <div className="guardian-duplicate-suggestions__actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={!canLink}
                  onClick={() => onUseExisting(person)}
                >
                  {t('admin.student360.useThisPerson')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
        {t('admin.student360.thisIsDifferentPerson')}
      </button>
    </div>
  );
}
