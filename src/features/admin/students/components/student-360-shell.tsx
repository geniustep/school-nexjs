'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useStudentDetails } from '../hooks/use-student-details';
import {
  canManageStudentDocuments,
  canManageStudentHealth,
  canViewStudentDocuments,
  canViewStudentFinance,
  canViewStudentHealth,
  resolveStudentCapabilities,
} from '../utils/resolve-capabilities';
import {
  buildAvailableStudent360Tabs,
  buildStudent360TabHref,
  parseStudent360Tab,
  student360PageTitleKey,
  type Student360TabId,
} from '../utils/student-360-tabs';
import { Student360Breadcrumb } from './student-360-breadcrumb';
import { Student360Header } from './student-360-header';
import { Student360QuickActions } from './student-360-quick-actions';
import { Student360TabBar } from './student-360-tab-bar';
import { Student360TabErrorBoundary } from './student-360-tab-error-boundary';
import { Student360TabHeader } from './student-360-tab-header';
import { StudentOverviewTab } from './student-overview-tab';
import { StudentEnrollmentTab } from './student-enrollment-tab';
import { StudentGuardiansTab } from './student-guardians-tab';
import { StudentDocumentsTab } from './student-documents-tab';
import { StudentHealthTab } from './student-health-tab';
import { StudentFinancialAgreementTab } from '@/features/admin/student-finance/components/student-financial-agreement-tab';
import { StudentFinanceOperationsTab } from '@/features/admin/student-finance/components/student-finance-operations-tab';
import { StudentForm } from './student-form';
import { sanitizeReturnTo, isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';
import { buildStudent360TabIndicators } from '../utils/student-360-tab-indicators';
import type { StudentDetailsData } from '@/types/student-360';
import '../student-360.css';
import '@/features/admin/academic-setup/academic-setup-ui.css';

function Student360TabPageHeader({ tab }: { tab: Student360TabId }) {
  const t = useT();
  if (tab === 'documents' || tab === 'finance' || tab === 'financial-agreement') {
    return null;
  }
  return (
    <Student360TabHeader
      title={t(`admin.student360.pages.${tab}.title`)}
      description={t(`admin.student360.pages.${tab}.description`)}
    />
  );
}

export function Student360Shell({ studentId }: { studentId: string }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const state = useStudentDetails(studentId);
  const [editing, setEditing] = useState(false);

  const details = state.data;
  const caps = details ? resolveStudentCapabilities(details.capabilities, user) : null;
  const showDocuments = caps ? canViewStudentDocuments(caps) : false;
  const showHealth = caps ? canViewStudentHealth(caps) : false;
  const showFinance = caps ? canViewStudentFinance(caps) : false;

  const availableTabs = buildAvailableStudent360Tabs({
    showFinance,
    showHealth,
    showDocuments,
  });

  const tabParam = searchParams.get('tab');
  const tab = parseStudent360Tab(tabParam, availableTabs);
  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = isSafeInternalReturnPath(returnTo) ? sanitizeReturnTo(returnTo) : null;
  const studentName = details ? getStudentDisplayName(details.student) : '';

  useEffect(() => {
    if (!details) return;
    if (tabParam && tabParam !== tab) {
      router.replace(buildStudent360TabHref(studentId, tab), { scroll: false });
    }
  }, [tabParam, tab, studentId, router, details]);

  useEffect(() => {
    if (!details) return;
    const tabTitle = t(student360PageTitleKey(tab));
    const brand = t('admin.student360.documentTitle.brand');
    document.title = `${tabTitle} — ${studentName} — ${brand}`;
  }, [tab, studentName, t, details]);

  if (state.loading && !state.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (state.error || !state.data || !caps) {
    return <ApiErrorView error={state.error!} onRetry={state.reload} />;
  }

  const resolvedDetails: StudentDetailsData = state.data;
  const s = resolvedDetails.student;
  const archived = (s.status as string) === 'archived';

  const tabIndicators = buildStudent360TabIndicators(resolvedDetails, {
    showFinance,
    showHealth,
    showDocuments,
    t,
  });

  return (
    <div className="student-360-shell">
      <Student360Breadcrumb studentId={studentId} studentName={studentName} tab={tab} />
      {safeReturnTo ? (
        <Link href={safeReturnTo} className="back-link">
          ‹ {t('admin.finance.hub.backToPrevious')}
        </Link>
      ) : null}

      <div className="student-360-sticky-top">
        <Student360Header
          details={resolvedDetails}
          actions={
            !editing ? (
              <Student360QuickActions
                details={resolvedDetails}
                caps={caps}
                archived={archived}
                onEdit={() => setEditing(true)}
                onOpenTab={(next) =>
                  router.push(buildStudent360TabHref(studentId, next), { scroll: false })
                }
                onArchiveSuccess={() => router.push('/admin/students')}
              />
            ) : null
          }
        />

        {!editing ? (
          <Student360TabBar
            studentId={studentId}
            activeTab={tab}
            tabs={availableTabs}
            ariaLabel={t('admin.student360.tabsAria')}
            indicators={tabIndicators}
          />
        ) : null}
      </div>

      {editing ? (
        <StudentForm
          student={s}
          enrollment={resolvedDetails.current_enrollment}
          guardianRelationships={resolvedDetails.guardian_relationships}
          onSaved={() => {
            setEditing(false);
            state.reload();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <Student360TabPageHeader tab={tab} />

          <Student360TabErrorBoundary studentId={studentId} tab={tab} onRetry={state.reload}>
            {tab === 'overview' && (
              <StudentOverviewTab
                details={resolvedDetails}
                canManage={caps.can_manage}
                showDocuments={showDocuments}
                showHealth={showHealth}
                showFinance={showFinance}
                onOpenTab={(next) =>
                  router.push(buildStudent360TabHref(studentId, next), { scroll: false })
                }
                onEditProfile={() => setEditing(true)}
                onAccountChanged={state.reload}
              />
            )}
            {tab === 'enrollment' && (
              <StudentEnrollmentTab
                details={resolvedDetails}
                canManage={caps.can_manage && !archived}
                onCreateEnrollment={() => setEditing(true)}
              />
            )}
            {tab === 'guardians' && (
              <StudentGuardiansTab
                details={resolvedDetails}
                canManageGuardians={caps.can_manage_guardians}
                onChanged={state.reload}
              />
            )}
            {tab === 'financial-agreement' && showFinance && (
              <StudentFinancialAgreementTab
                studentId={s.id}
                details={resolvedDetails}
                capabilities={caps}
                onChanged={state.reload}
                onOpenGuardians={() =>
                  router.push(buildStudent360TabHref(studentId, 'guardians'), { scroll: false })
                }
              />
            )}
            {tab === 'finance' && showFinance && (
              <StudentFinanceOperationsTab
                studentId={s.id}
                details={resolvedDetails}
                capabilities={caps}
                onChanged={state.reload}
              />
            )}
            {tab === 'health' && showHealth && (
              <StudentHealthTab
                studentId={s.id}
                canManage={canManageStudentHealth(caps)}
                onChanged={state.reload}
              />
            )}
            {tab === 'documents' && showDocuments && (
              <StudentDocumentsTab
                studentId={s.id}
                canManage={canManageStudentDocuments(caps)}
                onChanged={state.reload}
              />
            )}
          </Student360TabErrorBoundary>
        </>
      )}
    </div>
  );
}

export function Student360CreatePage() {
  const t = useT();
  const router = useRouter();

  return (
    <>
      <nav className="student-360-breadcrumb" aria-label={t('admin.student360.breadcrumb.aria')}>
        <ol className="student-360-breadcrumb__list">
          <li className="student-360-breadcrumb__item">
            <Link href="/admin/students">{t('admin.student360.breadcrumb.students')}</Link>
          </li>
        </ol>
      </nav>
      <h1>{t('admin.addStudent')}</h1>
      <StudentForm
        onSaved={(id) => router.push(`/admin/students/${id}`)}
        onCancel={() => router.push('/admin/students')}
      />
    </>
  );
}
