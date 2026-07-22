'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicSetupHero } from '@/features/admin/academic-setup/components/academic-setup-hero';
import { GuidedFlowJourney } from '@/features/admin/academic-setup/components/guided-flow-journey';
import { GroupedSetupIssues } from '@/features/admin/academic-setup/components/grouped-setup-issues';
import { AcademicQuickActions } from '@/features/admin/academic-setup/components/academic-quick-actions';
import { AutoSetupCtaBanner } from '@/features/admin/academic-setup/components/auto-setup-cta-banner';
import { SetupDomainCards } from '@/features/admin/academic-setup/components/setup-summary-card';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { useTrackOptions } from '@/features/admin/academic-setup/hooks/use-tracks';
import {
  buildGuidedSteps,
  primaryCtaFromSteps,
  type GuidedStepContext,
} from '@/features/admin/academic-setup/utils/guided-flow';
import { isAcademicAutoSetupAvailable } from '@/features/admin/academic-setup/utils/academic-auto-setup-availability';
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
  const [allIssuesOpen, setAllIssuesOpen] = useState(false);
  const issuesSectionRef = useRef<HTMLElement>(null);

  const loading =
    readinessState.initialLoading ||
    lists.initialLoading ||
    trackOptionsState.initialLoading;
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
  const autoSetupAvailable = useMemo(
    () => isAcademicAutoSetupAvailable(readinessState.data),
    [readinessState.data],
  );
  const showAutoSetupCta = autoSetupAvailable && canManageClasses(user);

  if (loading) {
    return (
      <div className="academic-overview">
        <div className="academic-overview-hero academic-overview-hero--skeleton" aria-busy="true">
          <div className="academic-setup-skeleton academic-setup-skeleton--title" />
          <div className="academic-setup-skeleton academic-setup-skeleton--bar" />
          <div className="academic-setup-skeleton academic-setup-skeleton--bar" style={{ width: '70%' }} />
        </div>
        <LoadingState label={t('common.loading')} />
      </div>
    );
  }

  if (error || !readinessState.data) {
    return (
      <div className="academic-overview">
        <div className="academic-overview-hero">
          <h1 className="academic-overview-hero__title">{t('admin.academicSetup.title')}</h1>
        </div>
        <ErrorState
          error={error ?? { code: 'server_error', message: t('admin.academicSetup.loadError'), details: {} }}
          onRetry={() => {
            readinessState.reload();
            lists.reload();
            trackOptionsState.reload();
          }}
        />
      </div>
    );
  }

  const data = readinessState.data;
  const allIssues = data.issues;
  const quickActions = data.quick_actions ?? [];

  return (
    <div className="academic-overview">
      <AcademicSetupHero
        data={data}
        nextStep={nextStep}
        onViewIssues={() => issuesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

      {showAutoSetupCta && <AutoSetupCtaBanner available />}

      <section className="academic-overview-domains" aria-labelledby="academic-domains-title">
        <div className="academic-overview-section__head">
          <h2 id="academic-domains-title" className="admin-section__title">
            {t('admin.academicSetup.readinessTitle')}
          </h2>
          <p className="academic-overview-section__desc">
            {t('admin.academicSetup.subtitle')}
          </p>
        </div>
        <SetupDomainCards data={data} />
      </section>

      <GuidedFlowJourney steps={steps} />

      {allIssues.length > 0 && (
        <section ref={issuesSectionRef} className="academic-issues-groups-section">
          <div className="academic-overview-section__head academic-issues-groups-section__head">
            <div>
              <h2 className="admin-section__title">{t('admin.alerts')}</h2>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-expanded={allIssuesOpen}
              onClick={() => setAllIssuesOpen((v) => !v)}
            >
              {allIssuesOpen
                ? t('admin.academicSetup.guided.hideDetails')
                : t('admin.academicSetup.guided.showAllDetails')}
            </button>
          </div>
          <GroupedSetupIssues issues={allIssues} maxGroups={allIssuesOpen ? 99 : 3} />
        </section>
      )}

      {quickActions.length > 0 && (
        <section className="academic-quick-actions-section">
          <div className="academic-overview-section__head">
            <h2 className="admin-section__title">{t('admin.academicSetup.quickActionsTitle')}</h2>
          </div>
          <AcademicQuickActions actions={quickActions} limit={4} />
        </section>
      )}

      {data.readiness.ready_for_timetable_setup && (
        <div className="academic-setup-gap-banner academic-setup-gap-banner--success">
          <div className="academic-setup-gap-banner__copy">
            <strong>{t('admin.academicSetup.readyForTimetable')}</strong>
          </div>
          <Link href="/admin/timetable" className="btn btn--primary btn--sm">
            {t('admin.academicSetup.guided.openTimetable')}
          </Link>
        </div>
      )}
    </div>
  );
}
