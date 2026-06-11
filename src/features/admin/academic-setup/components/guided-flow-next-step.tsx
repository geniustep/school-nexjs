'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import type { GuidedStep } from '../utils/guided-flow';

export function GuidedFlowNextStep({ step }: { step: GuidedStep | null }) {
  const t = useT();
  if (!step) return null;

  return (
    <section className="academic-setup-next-step" aria-labelledby="next-step-title">
      <h2 id="next-step-title" className="admin-section__title">
        {t('admin.academicSetup.guided.nextStepTitle')}
      </h2>
      <div className="academic-setup-next-step__card">
        <div>
          <span className="tiny muted">
            {t('admin.academicSetup.guided.stepLabel', { number: step.number })}
          </span>
          <strong className="block mt-2">{t(`admin.academicSetup.guided.steps.${step.id}`)}</strong>
          <p className="muted tiny mt-2">{t(step.summaryKey, step.summaryParams)}</p>
          {step.lockReasonKey && !step.available && (
            <p className="tiny academic-setup-journey__lock mt-2">{t(step.lockReasonKey)}</p>
          )}
        </div>
        {step.available ? (
          <Link href={step.href} className="btn btn--primary">
            {t(step.actionKey)}
          </Link>
        ) : (
          <button type="button" className="btn btn--primary" disabled>
            {t(step.actionKey)}
          </button>
        )}
      </div>
    </section>
  );
}
