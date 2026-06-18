'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  formatGuardianCandidateWarnings,
  resolveGuardianLinkBlockerMessage,
} from '../utils/guardian-candidate-presentation';
import {
  buildPersonSchoolIdentityBadges,
  resolvePersonSchoolIdentityCopy,
  type PersonSchoolIdentityInput,
} from '../utils/person-school-identity';
import type { GuardianCandidateWarning } from '@/types/student-360';

export function PersonSchoolIdentitySection({
  person,
  canLink = true,
  warnings,
}: {
  person: PersonSchoolIdentityInput & {
    can_link_as_guardian?: boolean;
    warnings?: GuardianCandidateWarning[];
  };
  canLink?: boolean;
  warnings?: GuardianCandidateWarning[];
}) {
  const t = useT();
  const badges = buildPersonSchoolIdentityBadges(t, person);
  const copy = resolvePersonSchoolIdentityCopy(t, person);
  const resolvedWarnings = warnings ?? person.warnings;
  const warningMessages =
    canLink && resolvedWarnings?.length
      ? formatGuardianCandidateWarnings(t, resolvedWarnings)
      : [];
  const blockerMessage = !canLink
    ? resolveGuardianLinkBlockerMessage(t, {
        can_link_as_guardian: person.can_link_as_guardian ?? false,
        warnings: resolvedWarnings,
      })
    : null;

  const sectionClass = [
    'person-school-identity',
    canLink ? 'person-school-identity--active' : 'person-school-identity--blocked',
  ].join(' ');

  return (
    <section className={sectionClass} aria-labelledby="person-school-identity-title">
      <div className="person-school-identity__head">
        <span className="person-school-identity__icon" aria-hidden="true">
          {canLink ? '◉' : '!'}
        </span>
        <h3 id="person-school-identity-title" className="person-school-identity__title">
          {t('admin.student360.personSchoolIdentity')}
        </h3>
      </div>

      {badges.length > 0 ? (
        <div className="person-school-identity__badges">
          {badges.map((badge) => (
            <Badge key={badge.id} tone={badge.tone}>
              {badge.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {!canLink && blockerMessage ? (
        <p className="person-school-identity__blocker" role="alert">
          {blockerMessage}
        </p>
      ) : null}

      {copy.lead ? <p className="person-school-identity__lead">{copy.lead}</p> : null}
      {copy.detail ? <p className="person-school-identity__detail">{copy.detail}</p> : null}

      {warningMessages.length > 0 ? (
        <ul className="person-school-identity__warnings">
          {warningMessages.map((message) => (
            <li key={message} className="person-school-identity__warning">
              {message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
