'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Badge, InfoBanner } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessPayload } from '@/types/academic-setup';
import type { GuidedStep } from '../utils/guided-flow';
import {
  readinessScoreLabel,
  readinessStatusLabel,
  readinessTone,
} from '../utils/readiness-present';

export function AcademicSetupHero({
  data,
  nextStep,
  onViewIssues,
}: {
  data: SetupReadinessPayload;
  nextStep: GuidedStep | null;
  onViewIssues?: () => void;
}) {
  const t = useT();
  const issuesRef = useRef<HTMLDivElement>(null);
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const activeRef = schools.find((s) => s.id === activeSchoolId) ?? user.school ?? data.school ?? null;
  const schoolLabel = formatSchoolLabel(activeRef, t);
  const { readiness, scope } = data;
  const tone = readinessTone(readiness.status, readiness.score);
  const hasIssues =
    readiness.blocking_issues > 0 || readiness.warnings > 0 || readiness.information > 0;

  function handleViewIssues() {
    if (onViewIssues) {
      onViewIssues();
      return;
    }
    issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="academic-setup-hero" aria-labelledby="academic-setup-hero-title">
      <div className="academic-setup-hero__top">
        <div className="academic-setup-hero__titles">
          <h1 id="academic-setup-hero-title" className="academic-setup-hero__title">
            {t('admin.academicSetup.title')}
          </h1>
          <p className="academic-setup-hero__subtitle">{t('admin.academicSetup.subtitle')}</p>
        </div>
        <span className="academic-setup-hero__school badge badge--blue">{schoolLabel}</span>
      </div>

      {!scope.is_full_school && (
        <InfoBanner
          tone="amber"
          icon="ℹ️"
          title={t('admin.academicSetup.scopedReadinessTitle')}
          description={t('admin.academicSetup.scopedReadinessDesc')}
        />
      )}

      <div className="academic-setup-hero__readiness" role="status">
        <div className="academic-setup-hero__readiness-head">
          <div className={`academic-setup-hero__score academic-setup-hero__score--${tone}`}>
            <span className="academic-setup-hero__score-value">{readiness.score}%</span>
            <span className="academic-setup-hero__score-label">
              {t('admin.academicSetup.readinessTitle')}
            </span>
          </div>
          <div className="academic-setup-hero__readiness-meta">
            <Badge tone={tone === 'red' ? 'red' : tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : tone === 'blue' ? 'blue' : 'slate'}>
              {readinessStatusLabel(readiness.status, t)}
            </Badge>
            {readiness.ready_for_timetable_setup && (
              <Badge tone="green">{t('admin.academicSetup.readyForTimetable')}</Badge>
            )}
            <p className="academic-setup-hero__score-desc">{readinessScoreLabel(data, t)}</p>
          </div>
        </div>

        <div
          className={`academic-setup-hero__progress academic-setup-hero__progress--${tone}`}
          role="progressbar"
          aria-valuenow={readiness.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('admin.academicSetup.readinessTitle')}
        >
          <span
            className="academic-setup-hero__progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, readiness.score))}%` }}
          />
        </div>

        {hasIssues && (
          <p className="academic-setup-hero__counts">
            {t('admin.academicSetup.readinessCounts', {
              blocking: readiness.blocking_issues,
              warnings: readiness.warnings,
              info: readiness.information,
            })}
          </p>
        )}
      </div>

      {nextStep && (
        <div className="academic-setup-hero__next">
          <div className="academic-setup-hero__next-copy">
            <span className="academic-setup-hero__next-label">
              {t('admin.academicSetup.guided.nextStepTitle')}
            </span>
            <div className="academic-setup-hero__next-headline">
              <Badge tone="blue">
                {t('admin.academicSetup.guided.stepLabel', { number: nextStep.number })}
              </Badge>
              <strong>{t(`admin.academicSetup.guided.steps.${nextStep.id}`)}</strong>
            </div>
            <p className="academic-setup-hero__next-summary">
              {t(nextStep.summaryKey, nextStep.summaryParams)}
            </p>
            {nextStep.lockReasonKey && !nextStep.available && (
              <p className="academic-setup-hero__next-lock">{t(nextStep.lockReasonKey)}</p>
            )}
          </div>
          <div className="academic-setup-hero__next-actions">
            {nextStep.available ? (
              <Link href={nextStep.href} className="btn btn--primary">
                {t(nextStep.actionKey)}
              </Link>
            ) : (
              <button type="button" className="btn btn--primary" disabled>
                {t(nextStep.actionKey)}
              </button>
            )}
            {hasIssues && (
              <button type="button" className="btn btn--ghost" onClick={handleViewIssues}>
                {t('admin.academicSetup.viewIssues')}
              </button>
            )}
          </div>
        </div>
      )}

      <div ref={issuesRef} className="academic-setup-hero__anchor" aria-hidden />
    </section>
  );
}
