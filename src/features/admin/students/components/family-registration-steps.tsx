'use client';

import { useT } from '@/features/i18n/locale-context';
import type { FamilyRegistrationWizardStep } from '../utils/family-registration-state';

const REGISTRATION_STEPS: FamilyRegistrationWizardStep[] = [
  'guardians',
  'children',
  'review',
  'result',
];

const FINANCE_STEPS: FamilyRegistrationWizardStep[] = ['finance', 'finance_result'];

export function FamilyRegistrationStepper({
  activeStep,
}: {
  activeStep: FamilyRegistrationWizardStep;
}) {
  const t = useT();
  const inFinance = activeStep === 'finance' || activeStep === 'finance_result';
  const STEP_ORDER = inFinance
    ? [...REGISTRATION_STEPS, ...FINANCE_STEPS]
    : REGISTRATION_STEPS;

  const labels: Record<FamilyRegistrationWizardStep, string> = {
    guardians: t('admin.student360.familyRegistration.steps.guardians'),
    children: t('admin.student360.familyRegistration.steps.children'),
    review: t('admin.student360.familyRegistration.steps.review'),
    result: t('admin.student360.familyRegistration.steps.result'),
    finance: t('admin.student360.familyRegistration.steps.finance'),
    finance_result: t('admin.student360.familyRegistration.steps.financeResult'),
  };
  const activeIndex = STEP_ORDER.indexOf(activeStep);
  const progress =
    STEP_ORDER.length > 1 ? (activeIndex / (STEP_ORDER.length - 1)) * 100 : 0;

  return (
    <nav
      className="student-create-steps"
      aria-label={t('admin.student360.familyRegistration.stepperAria')}
    >
      <div
        className="student-create-steps__progress"
        role="progressbar"
        aria-valuenow={activeIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STEP_ORDER.length}
        aria-label={t('admin.student360.familyRegistration.stepperAria')}
      >
        <div
          className="student-create-steps__progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="student-create-steps__list">
        {STEP_ORDER.map((step, index) => {
          const active = step === activeStep;
          const done = index < activeIndex;
          const statusLabel = active
            ? t('admin.student360.create.stepStatus.current')
            : done
              ? t('admin.student360.create.stepStatus.done')
              : t('admin.student360.create.stepStatus.upcoming');
          return (
            <li
              key={step}
              className="student-create-steps__item"
              data-active={active || undefined}
              data-done={done || undefined}
              data-upcoming={!active && !done ? true : undefined}
              aria-current={active ? 'step' : undefined}
              aria-label={`${index + 1}. ${labels[step]} — ${statusLabel}`}
            >
              <span className="student-create-steps__index" aria-hidden="true">
                {done ? '✓' : index + 1}
              </span>
              <span className="student-create-steps__label">{labels[step]}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
