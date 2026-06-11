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

export function GuidedFlowJourney({ steps }: { steps: GuidedStep[] }) {
  const t = useT();

  return (
    <section aria-labelledby="guided-flow-title">
      <h2 id="guided-flow-title" className="admin-section__title">
        {t('admin.academicSetup.guided.journeyTitle')}
      </h2>
      <ol className="academic-setup-journey">
        {steps.map((step, index) => (
          <li key={step.id} className="academic-setup-journey__item">
            {index > 0 && <span className="academic-setup-journey__connector" aria-hidden />}
            <Link
              href={step.available ? step.href : '#'}
              className={cn(
                'academic-setup-journey__card',
                !step.available && 'academic-setup-journey__card--locked',
                step.state === 'completed' && 'academic-setup-journey__card--done',
              )}
              aria-disabled={!step.available}
              onClick={(e) => {
                if (!step.available) e.preventDefault();
              }}
            >
              <span className="academic-setup-journey__num" aria-hidden>
                {step.number}
              </span>
              <div className="academic-setup-journey__body">
                <strong>{t(`admin.academicSetup.guided.steps.${step.id}`)}</strong>
                <span className={`badge badge--${STATE_TONE[step.state]}`}>
                  {t(`admin.academicSetup.guided.states.${step.state}`)}
                </span>
                <p className="tiny muted mt-2">
                  {t(step.summaryKey, step.summaryParams)}
                </p>
                {step.missingCount > 0 && step.state !== 'completed' && (
                  <p className="tiny">
                    {t('admin.academicSetup.guided.missingCount', { count: step.missingCount })}
                  </p>
                )}
                {step.lockReasonKey && (
                  <p className="tiny academic-setup-journey__lock">{t(step.lockReasonKey)}</p>
                )}
              </div>
              {step.available && (
                <span className="academic-setup-journey__action tiny">
                  {t(step.actionKey)} →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
