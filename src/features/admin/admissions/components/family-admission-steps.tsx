'use client';

import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';

export type FamilyAdmissionWizardStep = 'family' | 'children' | 'review' | 'success';

const STEPS: FamilyAdmissionWizardStep[] = ['family', 'children', 'review', 'success'];

export function FamilyAdmissionSteps({
  activeStep,
}: {
  activeStep: FamilyAdmissionWizardStep;
}) {
  const t = useT();
  const activeIndex = STEPS.indexOf(activeStep);

  if (activeStep === 'success') return null;

  return (
    <nav
      className="family-admission-steps"
      aria-label={t('admin.admissions.family.stepsLabel')}
    >
      <ol className="family-admission-steps__list">
        {STEPS.filter((step) => step !== 'success').map((step, index) => (
          <li
            key={step}
            className={cn(
              'family-admission-steps__item',
              index === activeIndex && 'family-admission-steps__item--active',
              index < activeIndex && 'family-admission-steps__item--done',
            )}
          >
            <span className="family-admission-steps__marker" aria-hidden>
              {index < activeIndex ? '✓' : index + 1}
            </span>
            <span className="family-admission-steps__label">
              {t(`admin.admissions.family.steps.${step}`)}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
