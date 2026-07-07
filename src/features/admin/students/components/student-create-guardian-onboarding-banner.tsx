'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  clearStudentCreateGuardianOnboarding,
  readStudentCreateGuardianOnboarding,
  type GuardianAccountPresentation,
} from '../utils/resolve-guardian-account-presentation';
import { GuardianAccountOnboardingPanel } from './guardian-account-onboarding-panel';

export function StudentCreateGuardianOnboardingBanner({ studentId }: { studentId: number }) {
  const t = useT();
  const [guardians, setGuardians] = useState<
    Array<{ name: string; presentation: GuardianAccountPresentation }> | null
  >(null);

  useEffect(() => {
    setGuardians(readStudentCreateGuardianOnboarding(studentId));
  }, [studentId]);

  if (!guardians?.length) return null;

  function dismiss() {
    clearStudentCreateGuardianOnboarding();
    setGuardians(null);
  }

  return (
    <section className="student-create-guardian-onboarding-banner" role="status">
      <div className="student-create-guardian-onboarding-banner__head">
        <h3 className="student-create-guardian-onboarding-banner__title">
          {t('admin.guardianAccount.createSuccessTitle')}
        </h3>
        <p className="student-create-guardian-onboarding-banner__lead">
          {t('admin.guardianAccount.createSuccessLead')}
        </p>
      </div>
      <div className="student-create-guardian-onboarding-banner__cards">
        {guardians.map((entry) => (
          <article key={`${entry.name}-${entry.presentation.code ?? entry.presentation.login ?? 'guardian'}`} className="student-create-guardian-account-card">
            <p className="student-create-guardian-account-card__name" dir="auto">
              {entry.name}
            </p>
            <GuardianAccountOnboardingPanel presentation={entry.presentation} compact />
          </article>
        ))}
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={dismiss}>
        {t('admin.guardianAccount.dismissOnboarding')}
      </button>
    </section>
  );
}
