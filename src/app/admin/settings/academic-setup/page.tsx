'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicSetupHero } from '@/features/admin/academic-setup/components/academic-setup-hero';
import { GuidedFlowJourney } from '@/features/admin/academic-setup/components/guided-flow-journey';
import {
  SetupIssuesList,
  SetupQuickActionsList,
} from '@/features/admin/academic-setup/components/setup-issues-list';
import { SetupDomainCards } from '@/features/admin/academic-setup/components/setup-summary-card';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { useTrackOptions } from '@/features/admin/academic-setup/hooks/use-tracks';
import {
  buildGuidedSteps,
  primaryCtaFromSteps,
  type GuidedStepContext,
} from '@/features/admin/academic-setup/utils/guided-flow';
import {
  canManageClasses,
  canManageStaff,
  canManageTeachers,
  canManageTeachingAssignments,
} from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupOverviewPage() {
  const t = useT();
  const user = useSession();
  const readinessState = useSetupReadiness();
  const lists = useAcademicSetupLists();
  const trackOptionsState = useTrackOptions();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const issuesSectionRef = useRef<HTMLElement>(null);

  const loading = readinessState.loading || lists.loading || trackOptionsState.loading;
  const error = readinessState.error ?? lists.error ?? trackOptionsState.error;

  const guidedContext = useMemo((): GuidedStepContext | null => {
    if (!readinessState.data) return null;
    const domains = readinessState.data.domains;
    return {
      levels: lists.levels,
      classesCount: Number(domains.levels_classes?.summary?.classes ?? lists.classes.length),
      subjectsCount: Number(domains.subjects_tracks?.summary?.subjects ?? lists.subjects.length),
      tracksCount: Number(domains.subjects_tracks?.summary?.tracks ?? 0),
      teachersCount: Number(domains.teachers?.summary?.teachers ?? lists.teachers.length),
      staffCount: Number(domains.staff?.summary?.staff ?? lists.staff.length),
      trackLevels: trackOptionsState.options?.levels ?? [],
      canManageClasses: canManageClasses(user),
      canManageTeachers: canManageTeachers(user),
      canManageStaff: canManageStaff(user),
      canManageAssignments: canManageTeachingAssignments(user),
      readiness: readinessState.data,
    };
  }, [readinessState.data, lists, trackOptionsState.options, user]);

  const steps = useMemo(
    () => (guidedContext ? buildGuidedSteps(guidedContext) : []),
    [guidedContext],
  );
  const nextStep = useMemo(() => primaryCtaFromSteps(steps), [steps]);

  if (loading) {
    return (
      <>
        <div className="academic-setup-hero academic-setup-hero--skeleton" aria-busy="true">
          <div className="academic-setup-skeleton academic-setup-skeleton--title" />
          <div className="academic-setup-skeleton academic-setup-skeleton--bar" />
        </div>
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (error || !readinessState.data) {
    return (
      <>
        <div className="academic-setup-hero">
          <h1 className="academic-setup-hero__title">{t('admin.academicSetup.title')}</h1>
        </div>
        <ErrorState
          error={error ?? { code: 'server_error', message: t('admin.academicSetup.loadError'), details: {} }}
          onRetry={() => {
            readinessState.reload();
            lists.reload();
            trackOptionsState.reload();
          }}
        />
      </>
    );
  }

  const data = readinessState.data;
  const topIssues = data.issues.slice(0, 5);

  return (
    <>
      <AcademicSetupHero
        data={data}
        nextStep={nextStep}
        onViewIssues={() => issuesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

      <GuidedFlowJourney steps={steps} />

      {topIssues.length > 0 && (
        <section ref={issuesSectionRef} className="academic-setup-alerts">
          <h2 className="admin-section__title">{t('admin.alerts')}</h2>
          <SetupIssuesList issues={topIssues} limit={5} />
        </section>
      )}

      <section className="academic-setup-details">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((v) => !v)}
        >
          {detailsOpen
            ? t('admin.academicSetup.guided.hideDetails')
            : t('admin.academicSetup.guided.showAllDetails')}
        </button>
        {detailsOpen && (
          <div className="academic-setup-details__panel">
            {(data.quick_actions?.length ?? 0) > 0 && (
              <section>
                <h2 className="admin-section__title">{t('admin.academicSetup.quickActionsTitle')}</h2>
                <SetupQuickActionsList actions={data.quick_actions ?? []} />
              </section>
            )}
            {data.readiness.ready_for_timetable_setup && (
              <div className="academic-setup-gap-banner academic-setup-gap-banner--success">
                <p>{t('admin.academicSetup.readyForTimetable')}</p>
                <Link href="/admin/timetable" className="btn btn--ghost btn--sm mt-2">
                  {t('admin.academicSetup.guided.openTimetable')}
                </Link>
              </div>
            )}
            <SetupDomainCards data={data} />
          </div>
        )}
      </section>
    </>
  );
}
