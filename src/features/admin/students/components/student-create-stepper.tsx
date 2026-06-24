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
    <div className="student-create-stepper-wrap">
      <div
        className="student-create-stepper__track"
        role="progressbar"
        aria-valuenow={activeIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STEP_ORDER.length}
        aria-label={t('admin.student360.create.stepperAria')}
      >
        <div
          className="student-create-stepper__track-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="student-create-stepper" aria-label={t('admin.student360.create.stepperAria')}>
        {STEP_ORDER.map((step, index) => {
          const active = step === activeStep;
          const done = index < activeIndex;
          return (
            <li
              key={step}
              className="student-create-stepper__item"
              data-active={active || undefined}
              data-done={done || undefined}
            >
              <span className="student-create-stepper__badge" aria-hidden="true">
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className="student-create-stepper__label">{labels[step]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
