'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { formatGuardianCandidateWarnings } from '../utils/guardian-candidate-presentation';
import {
  buildPersonSchoolIdentityBadges,
  type PersonSchoolIdentityInput,
} from '../utils/person-school-identity';
import type { GuardianCandidateWarning } from '@/types/student-360';

export function PersonSchoolIdentitySection({
  person,
  showLinkNote = false,
  warnings,
}: {
  person: PersonSchoolIdentityInput;
  showLinkNote?: boolean;
  warnings?: GuardianCandidateWarning[];
}) {
  const t = useT();
  const badges = buildPersonSchoolIdentityBadges(t, person);
  const warningMessages = formatGuardianCandidateWarnings(warnings);

  return (
    <section className="person-school-identity" aria-labelledby="person-school-identity-title">
      <h3 id="person-school-identity-title" className="person-school-identity__title">
        {t('admin.student360.personSchoolIdentity')}
      </h3>
      {badges.length > 0 ? (
        <div className="person-school-identity__badges">
          {badges.map((badge) => (
            <Badge key={badge.id} tone="slate">
              {badge.label}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="person-school-identity__empty tiny muted">{t('admin.student360.schoolRoleNoneKnown')}</p>
      )}
      {warningMessages.length > 0 ? (
        <ul className="person-school-identity__warnings">
          {warningMessages.map((message) => (
            <li key={message} className="person-school-identity__warning tiny muted">
              {message}
            </li>
          ))}
        </ul>
      ) : null}
      {showLinkNote ? (
        <p className="person-school-identity__note tiny muted">{t('admin.student360.linkSamePersonNote')}</p>
      ) : null}
    </section>
  );
}
