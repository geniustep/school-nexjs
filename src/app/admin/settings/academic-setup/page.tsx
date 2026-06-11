'use client';

import Link from 'next/link';
import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { AcademicSetupHeader } from '@/features/admin/academic-setup/components/academic-setup-header';
import { GlobalSetupSearch } from '@/features/admin/academic-setup/components/global-setup-search';
import { SetupIssuesList } from '@/features/admin/academic-setup/components/setup-issues-list';
import { SetupSummaryCards } from '@/features/admin/academic-setup/components/setup-summary-card';
import { useAcademicSetupData } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import {
  canManageClasses,
  canManageTeachers,
} from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupOverviewPage() {
  const t = useT();
  const user = useSession();
  const data = useAcademicSetupData(t);

  if (data.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.title')} subtitle={t('admin.academicSetup.subtitle')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (data.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.title')} subtitle={t('admin.academicSetup.subtitle')} />
        <ErrorState
          error={{ code: 'server_error', message: t('admin.academicSetup.loadError'), details: {} }}
          onRetry={data.reload}
        />
      </>
    );
  }

  const blockingIssues = data.issues.filter((i) => i.blocksReadiness);

  return (
    <>
      <PageHeader title={t('admin.academicSetup.title')} subtitle={t('admin.academicSetup.subtitle')} />
      <AcademicSetupHeader readiness={data.readiness} blockingCount={blockingIssues.length} />
      <GlobalSetupSearch
        levels={data.levels}
        classes={data.classes}
        subjects={data.subjects}
        teachers={data.teachers}
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
      {data.issues.length > 0 && (
        <section>
          <h2 className="admin-section__title">{t('admin.alerts')}</h2>
          <SetupIssuesList issues={data.issues} limit={6} />
        </section>
      )}
      <SetupSummaryCards summary={data.summary} />
    </>
  );
}
