'use client';

import type { GuardianAccountPresentationSource } from '../utils/resolve-guardian-account-presentation';
import { GuardianAccountOnboardingPanel } from './guardian-account-onboarding-panel';

export function StudentCreateGuardianAccountCard({
  name,
  source,
  compact = false,
}: {
  name: string;
  source: GuardianAccountPresentationSource;
  compact?: boolean;
}) {
  return (
    <article className="student-create-guardian-account-card">
      <p className="student-create-guardian-account-card__name" dir="auto">
        {name}
      </p>
      <GuardianAccountOnboardingPanel source={source} compact={compact} />
    </article>
  );
}
