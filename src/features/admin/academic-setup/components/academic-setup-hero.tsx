'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { InfoBanner } from '@/components/ui/primitives';
import { IconLayers } from '@/components/icons/admin-icons';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import type { SetupReadinessPayload } from '@/types/academic-setup';
import type { GuidedStep } from '../utils/guided-flow';
import { nextActionTitleKey } from '../utils/next-action-present';
import { readinessStatusLabel, readinessTone } from '../utils/readiness-present';

function ScoreRing({
  score,
  tone,
  label,
}: {
  score: number;
  tone: string;
  label: string;
}) {
  const size = 88;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('academic-overview-hero__ring', `academic-overview-hero__ring--${tone}`)} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="academic-overview-hero__ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="academic-overview-hero__ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="academic-overview-hero__ring-label">
        <strong>{clamped}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

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
  const progressTone = readiness.blocking_issues > 0 ? 'amber' : tone === 'red' ? 'amber' : tone;

  function handleViewIssues() {
    if (onViewIssues) {
      onViewIssues();
      return;
    }
    issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="academic-overview-hero" aria-labelledby="academic-setup-hero-title">
      <div className="academic-overview-hero__backdrop" aria-hidden />

      <div className="academic-overview-hero__top">
        <div className="academic-overview-hero__identity">
          <span className="academic-overview-hero__mark" aria-hidden>
            <IconLayers size={22} />
          </span>
          <div className="academic-overview-hero__titles">
            <h1 id="academic-setup-hero-title" className="academic-overview-hero__title">
              {t('admin.academicSetup.title')}
            </h1>
            <p className="academic-overview-hero__subtitle">{t('admin.academicSetup.subtitle')}</p>
          </div>
        </div>
        <div className="academic-overview-hero__badges">
          <span className="academic-overview-hero__school">{schoolLabel}</span>
          <span className={cn('academic-setup-badge', `academic-setup-badge--${tone}`)}>
            {readinessStatusLabel(readiness.status, t, readiness.score)}
          </span>
        </div>
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
          <ScoreRing
            score={readiness.score}
            tone={progressTone}
            label={t('admin.academicSetup.readinessTitle')}
          />
          <div className="academic-overview-hero__readiness-copy">
            <p className="academic-overview-hero__headline">
              {t('admin.academicSetup.heroProgressHeadline', { score: readiness.score })}
            </p>
            <p className="academic-overview-hero__subline">
              {readiness.score >= 100
                ? t('admin.academicSetup.heroProgressComplete')
                : t('admin.academicSetup.heroProgressSubline')}
            </p>

            <div
              className={cn(
                'academic-overview-hero__progress',
                `academic-overview-hero__progress--${progressTone}`,
              )}
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
              <p className="academic-overview-hero__next-summary">
                {t(nextStep.summaryKey, nextStep.summaryParams)}
              </p>
              {nextStep.lockReasonKey && !nextStep.available && (
                <p className="academic-overview-hero__next-lock">{t(nextStep.lockReasonKey)}</p>
              )}
            </div>
            <div className="academic-overview-hero__next-actions">
              {nextStep.available ? (
                <Link href={nextStep.href} className="btn btn--primary academic-overview-hero__cta">
                  {t(nextStep.actionKey)}
                </Link>
              ) : (
                <button type="button" className="btn btn--primary academic-overview-hero__cta" disabled>
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
