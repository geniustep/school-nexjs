'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { GuidedStep, GuidedStepState } from '../utils/guided-flow';

const STATE_TONE: Record<GuidedStepState, string> = {
  not_started: 'slate',
  in_progress: 'blue',
  needs_attention: 'amber',
  completed: 'green',
  blocked: 'red',
  locked: 'slate',
};

const STATE_ICON: Record<GuidedStepState, string> = {
  not_started: '○',
  in_progress: '◐',
  needs_attention: '!',
  completed: '✓',
  blocked: '✕',
  locked: '🔒',
};

export function GuidedFlowJourney({ steps }: { steps: GuidedStep[] }) {
  const t = useT();

  return (
    <section className="academic-setup-journey-section" aria-labelledby="guided-flow-title">
      <h2 id="guided-flow-title" className="admin-section__title">
        {t('admin.academicSetup.guided.journeyTitle')}
      </h2>
      <ol className="academic-setup-journey academic-setup-journey--timeline">
        {steps.map((step, index) => (
          <li key={step.id} className="academic-setup-journey__item">
            <div className="academic-setup-journey__rail" aria-hidden>
              <span
                className={cn(
                  'academic-setup-journey__num',
                  step.state === 'completed' && 'academic-setup-journey__num--done',
                  step.state === 'blocked' && 'academic-setup-journey__num--blocked',
                  !step.available && step.state === 'locked' && 'academic-setup-journey__num--locked',
                )}
              >
                {step.number}
              </span>
              {index < steps.length - 1 && <span className="academic-setup-journey__line" />}
            </div>
            <div
              className={cn(
                'academic-setup-journey__card',
                !step.available && 'academic-setup-journey__card--locked',
                step.state === 'completed' && 'academic-setup-journey__card--done',
              )}
            >
              <div className="academic-setup-journey__body">
                <div className="academic-setup-journey__title-row">
                  <strong>{t(`admin.academicSetup.guided.steps.${step.id}`)}</strong>
                  <span className={`badge badge--${STATE_TONE[step.state]}`}>
                    <span aria-hidden>{STATE_ICON[step.state]} </span>
                    {t(`admin.academicSetup.guided.states.${step.state}`)}
                  </span>
                </div>
                <p className="academic-setup-journey__summary">
                  {t(step.summaryKey, step.summaryParams)}
                </p>
                {step.missingCount > 0 && step.state !== 'completed' && (
                  <p className="academic-setup-journey__missing">
                    {t('admin.academicSetup.guided.missingCount', { count: step.missingCount })}
                  </p>
                )}
                {step.lockReasonKey && (
                  <p className="academic-setup-journey__lock">{t(step.lockReasonKey)}</p>
                )}
              </div>
              {step.available ? (
                <Link href={step.href} className="btn btn--ghost btn--sm academic-setup-journey__cta">
                  {t(step.actionKey)}
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled
                  aria-disabled
                >
                  {step.state === 'locked'
                    ? t('admin.academicSetup.guided.states.locked')
                    : t(step.actionKey)}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
