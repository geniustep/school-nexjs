'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { InfoBanner } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessPayload } from '@/types/academic-setup';
import type { GuidedStep } from '../utils/guided-flow';
import { nextActionTitleKey } from '../utils/next-action-present';
import { readinessTone } from '../utils/readiness-present';

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
  const progressTone = readiness.blocking_issues > 0 ? 'amber' : tone === 'red' ? 'amber' : 'blue';

  function handleViewIssues() {
    if (onViewIssues) {
      onViewIssues();
      return;
    }
    issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="academic-overview-hero" aria-labelledby="academic-setup-hero-title">
      <div className="academic-overview-hero__top">
        <div className="academic-overview-hero__titles">
          <h1 id="academic-setup-hero-title" className="academic-overview-hero__title">
            {t('admin.academicSetup.title')}
          </h1>
          <p className="academic-overview-hero__subtitle">{t('admin.academicSetup.subtitle')}</p>
        </div>
        <span className="academic-overview-hero__school badge badge--blue">{schoolLabel}</span>
      </div>

      {!scope.is_full_school && (
        <InfoBanner
          tone="amber"
          icon="i"
          title={t('admin.academicSetup.scopedReadinessTitle')}
          description={t('admin.academicSetup.scopedReadinessDesc')}
        />
      )}

      <div className="academic-overview-hero__body">
        <div className="academic-overview-hero__readiness" role="status">
          <p className="academic-overview-hero__headline">
            {t('admin.academicSetup.heroProgressHeadline', { score: readiness.score })}
          </p>
          <p className="academic-overview-hero__subline">
            {readiness.score >= 100
              ? t('admin.academicSetup.heroProgressComplete')
              : t('admin.academicSetup.heroProgressSubline')}
          </p>

          <div
            className={`academic-overview-hero__progress academic-overview-hero__progress--${progressTone}`}
            role="progressbar"
            aria-valuenow={readiness.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('admin.academicSetup.readinessTitle')}
          >
            <span
              className="academic-overview-hero__progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, readiness.score))}%` }}
            />
          </div>

          {hasIssues && (
            <div className="academic-overview-hero__counts-row">
              <span className="academic-overview-hero__counts-text">
                {t('admin.academicSetup.heroIssueCounts', {
                  blocking: readiness.blocking_issues,
                  warnings: readiness.warnings,
                  info: readiness.information,
                })}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm academic-overview-hero__details-btn"
                onClick={handleViewIssues}
              >
                {t('admin.academicSetup.guided.showDetails')}
              </button>
            </div>
          )}
        </div>

        {nextStep && (
          <div className="academic-overview-hero__next">
            <div className="academic-overview-hero__next-copy">
              <span className="academic-overview-hero__next-label">
                {t('admin.academicSetup.guided.nextStepTitle')}
              </span>
              <strong className="academic-overview-hero__next-title">
                {t(nextActionTitleKey(nextStep))}
              </strong>
              {nextStep.lockReasonKey && !nextStep.available && (
                <p className="academic-overview-hero__next-lock">{t(nextStep.lockReasonKey)}</p>
              )}
            </div>
            <div className="academic-overview-hero__next-actions">
              {nextStep.available ? (
                <Link href={nextStep.href} className="btn btn--primary">
                  {t(nextStep.actionKey)}
                </Link>
              ) : (
                <button type="button" className="btn btn--primary" disabled>
                  {t(nextStep.actionKey)}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={issuesRef} className="academic-overview-hero__anchor" aria-hidden />
    </section>
  );
}
