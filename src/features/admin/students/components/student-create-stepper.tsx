'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentCreateWizardStep } from './student-create-wizard';

const STEP_ORDER: StudentCreateWizardStep[] = [
  'identity',
  'billing',
  'enrollment',
  'finance',
  'review',
];

export function StudentCreateStepper({ activeStep }: { activeStep: StudentCreateWizardStep }) {
  const t = useT();
  const labels: Record<StudentCreateWizardStep, string> = {
    identity: t('admin.student360.create.steps.identity'),
    billing: t('admin.student360.create.steps.billing'),
    enrollment: t('admin.student360.create.steps.enrollment'),
    finance: t('admin.student360.create.steps.finance'),
    review: t('admin.student360.create.steps.review'),
  };
  const activeIndex = STEP_ORDER.indexOf(activeStep);
  const progress =
    STEP_ORDER.length > 1 ? (activeIndex / (STEP_ORDER.length - 1)) * 100 : 0;

  return (
    <nav
      className="student-create-steps"
      aria-label={t('admin.student360.create.stepperAria')}
    >
      <div
        className="student-create-steps__progress"
        role="progressbar"
        aria-valuenow={activeIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STEP_ORDER.length}
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
          return (
            <li
              key={step}
              className="student-create-steps__item"
              data-active={active || undefined}
              data-done={done || undefined}
              aria-current={active ? 'step' : undefined}
            >
              <span className="student-create-steps__index" aria-hidden="true">
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className="student-create-steps__label">{labels[step]}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
