'use client';

import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import {
  resolveAdmissionJourneySteps,
  type AdmissionJourneyInput,
  type AdmissionJourneyStepStatus,
} from '../utils/admission-journey-steps';

function statusClass(status: AdmissionJourneyStepStatus): string {
  switch (status) {
    case 'complete':
      return 'admission-journey-strip__step--complete';
    case 'current':
      return 'admission-journey-strip__step--current';
    case 'pending':
      return 'admission-journey-strip__step--pending';
    case 'blocked':
      return 'admission-journey-strip__step--blocked';
    case 'closed':
      return 'admission-journey-strip__step--closed';
    case 'not_applicable':
      return 'admission-journey-strip__step--na';
    default:
      return '';
  }
}

export function AdmissionJourneyStrip({
  record,
  className,
}: {
  record: AdmissionJourneyInput;
  className?: string;
}) {
  const t = useT();
  const steps = resolveAdmissionJourneySteps(record);

  return (
    <nav
      className={cn('admission-journey-strip', className)}
      aria-label={t('admin.admissions.journey.title')}
      data-testid="admission-journey-strip"
    >
      <ol className="admission-journey-strip__list">
        {steps.map((step, index) => {
          const valueLabel = t(step.valueLabelKey);
          const statusLabel = t(`admin.admissions.journey.status.${step.status}`);
          return (
            <li
              key={step.id}
              className={cn('admission-journey-strip__step', statusClass(step.status))}
              data-testid={`admission-journey-step-${step.id}`}
              data-status={step.status}
            >
              {index > 0 ? (
                <span className="admission-journey-strip__connector" aria-hidden="true" />
              ) : null}
              <div className="admission-journey-strip__card">
                <span className="admission-journey-strip__label">{t(step.labelKey)}</span>
                <strong className="admission-journey-strip__value" title={statusLabel}>
                  {valueLabel !== step.valueLabelKey ? valueLabel : statusLabel}
                </strong>
                <span className="admission-journey-strip__status sr-only">{statusLabel}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
