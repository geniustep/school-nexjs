'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { AcademicSetupHeader } from '@/features/admin/academic-setup/components/academic-setup-header';
import { GuidedFlowJourney } from '@/features/admin/academic-setup/components/guided-flow-journey';
import { GuidedFlowNextStep } from '@/features/admin/academic-setup/components/guided-flow-next-step';
import { GlobalSetupSearch } from '@/features/admin/academic-setup/components/global-setup-search';
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
        <PageHeader title={t('admin.academicSetup.title')} subtitle={t('admin.academicSetup.subtitle')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (error || !readinessState.data) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.title')} subtitle={t('admin.academicSetup.subtitle')} />
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
      <PageHeader title={t('admin.academicSetup.title')} subtitle={t('admin.academicSetup.subtitle')} />
      <AcademicSetupHeader data={data} />

      {nextStep && (
        <div className="academic-setup-primary-cta">
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
      )}

      <GuidedFlowNextStep step={nextStep} />
      <GuidedFlowJourney steps={steps} />

      <GlobalSetupSearch
        levels={lists.levels}
        classes={lists.classes}
        subjects={lists.subjects}
        teachers={lists.teachers}
        staff={lists.staff}
      />

      {topIssues.length > 0 && (
        <section>
          <h2 className="admin-section__title">{t('admin.alerts')}</h2>
          <SetupIssuesList issues={topIssues} limit={5} />
        </section>
      )}

      <section>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((v) => !v)}
        >
          {detailsOpen
            ? t('admin.academicSetup.guided.hideDetails')
            : t('admin.academicSetup.guided.showDetails')}
        </button>
        {detailsOpen && (
          <div className="col mt-2" style={{ gap: 16 }}>
            {(data.quick_actions?.length ?? 0) > 0 && (
              <section>
                <h2 className="admin-section__title">{t('admin.academicSetup.quickActionsTitle')}</h2>
                <SetupQuickActionsList actions={data.quick_actions ?? []} />
              </section>
            )}
            {data.readiness.ready_for_timetable_setup && (
              <div className="academic-setup-gap-banner" style={{ borderColor: '#15803d', background: '#f0fdf4', color: '#166534' }}>
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
