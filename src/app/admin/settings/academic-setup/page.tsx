'use client';

import Link from 'next/link';
import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { AcademicSetupHeader } from '@/features/admin/academic-setup/components/academic-setup-header';
import { GlobalSetupSearch } from '@/features/admin/academic-setup/components/global-setup-search';
import {
  SetupIssuesList,
  SetupQuickActionsList,
} from '@/features/admin/academic-setup/components/setup-issues-list';
import { SetupDomainCards } from '@/features/admin/academic-setup/components/setup-summary-card';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import {
  canManageClasses,
  canManageTeachers,
} from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupOverviewPage() {
  const t = useT();
  const user = useSession();
  const readinessState = useSetupReadiness();
  const lists = useAcademicSetupLists();

  const loading = readinessState.loading || lists.loading;
  const error = readinessState.error ?? lists.error;

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
          }}
        />
      </>
    );
  }

  const data = readinessState.data;
  const blockingIssues = data.issues.filter((i) => i.blocking);

  return (
    <>
      <PageHeader title={t('admin.academicSetup.title')} subtitle={t('admin.academicSetup.subtitle')} />
      <AcademicSetupHeader data={data} />
      <GlobalSetupSearch
        levels={lists.levels}
        classes={lists.classes}
        subjects={lists.subjects}
        teachers={lists.teachers}
        staff={lists.staff}
      />
      <div className="academic-setup-shortcuts">
        {canManageClasses(user) && (
          <Link href="/admin/settings/academic-setup/classes?action=add" className="btn btn--ghost btn--sm">
            + {t('admin.addClass')}
          </Link>
        )}
        {canManageTeachers(user) && (
          <Link href="/admin/settings/academic-setup/teachers?action=add" className="btn btn--ghost btn--sm">
            + {t('admin.addTeacher')}
          </Link>
        )}
        <Link href="/admin/settings/academic-setup/assignments" className="btn btn--primary btn--sm">
          {t('admin.academicSetup.nav.assignments')}
        </Link>
      </div>
      {(data.quick_actions?.length ?? 0) > 0 && (
        <section>
          <h2 className="admin-section__title">{t('admin.academicSetup.quickActionsTitle')}</h2>
          <SetupQuickActionsList actions={data.quick_actions ?? []} />
        </section>
      )}
      {data.issues.length > 0 && (
        <section>
          <h2 className="admin-section__title">{t('admin.alerts')}</h2>
          <SetupIssuesList issues={data.issues} limit={6} />
          {blockingIssues.length > 0 && (
            <p className="tiny muted mt-2">
              {t('admin.academicSetup.readinessRemaining', { count: blockingIssues.length })}
            </p>
          )}
        </section>
      )}
      <SetupDomainCards data={data} />
    </>
  );
}
