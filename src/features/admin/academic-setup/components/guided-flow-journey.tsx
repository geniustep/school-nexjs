'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import { JOURNEY_STEP_ICONS } from '@/components/icons/admin-icons';
import type { GuidedStep } from '../utils/guided-flow';
import {
  JOURNEY_DISPLAY_TONE,
  journeyDisplayState,
  partitionGuidedSteps,
} from '../utils/overview-present';

function JourneyStepCard({ step, displayNumber }: { step: GuidedStep; displayNumber: number }) {
  const t = useT();
  const displayState = journeyDisplayState(step);
  const tone = JOURNEY_DISPLAY_TONE[displayState];
  const Icon = JOURNEY_STEP_ICONS[step.id];

  return (
    <div
      className={cn(
        'academic-journey-step',
        !step.available && 'academic-journey-step--locked',
        step.state === 'completed' && 'academic-journey-step--done',
      )}
    >
      <div className="academic-journey-step__main">
        {displayNumber > 0 && (
          <span className="academic-journey-step__num" aria-hidden>
            {displayNumber}
          </span>
        )}
        <span className="academic-journey-step__icon" aria-hidden>
          <Icon size={16} />
        </span>
        <div className="academic-journey-step__copy">
          <div className="academic-journey-step__title-row">
            <strong>{t(`admin.academicSetup.guided.steps.${step.id}`)}</strong>
            <span className={`academic-setup-badge academic-setup-badge--${tone} academic-setup-badge--status`}>
              {t(`admin.academicSetup.guided.displayStates.${displayState}`)}
            </span>
          </div>
          <p className="academic-journey-step__summary">
            {t(step.summaryKey, step.summaryParams)}
          </p>
          {step.available ? (
            <Link href={step.href} className="btn btn--ghost btn--sm academic-journey-step__cta">
              {t(step.actionKey)}
            </Link>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm academic-journey-step__cta" disabled aria-disabled>
              {step.state === 'locked'
                ? t('admin.academicSetup.guided.displayStates.unavailable')
                : t(step.actionKey)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GuidedFlowJourney({ steps }: { steps: GuidedStep[] }) {
  const t = useT();
  const { core, staff, review } = partitionGuidedSteps(steps);

  return (
    <section className="academic-journey" aria-labelledby="guided-flow-title">
      <h2 id="guided-flow-title" className="admin-section__title">
        {t('admin.academicSetup.guided.journeyTitle')}
      </h2>

      <ol className="academic-journey__list">
        {core.map((step, index) => (
          <li key={step.id}>
            <JourneyStepCard step={step} displayNumber={index + 1} />
          </li>
        ))}
      </ol>

      {staff && (
        <div className="academic-journey__parallel">
          <h3 className="academic-journey__parallel-title">
            {t('admin.academicSetup.parallelSettingsTitle')}
          </h3>
          <JourneyStepCard step={staff} displayNumber={0} />
        </div>
      )}

      {review && (
        <div className="academic-journey__final">
          <h3 className="academic-journey__final-title">
            {t('admin.academicSetup.finalReadinessTitle')}
          </h3>
          <JourneyStepCard step={review} displayNumber={core.length + 1} />
        </div>
      )}
    </section>
  );
}
