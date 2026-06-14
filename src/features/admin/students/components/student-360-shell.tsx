'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { AcademicSegmentedControl } from '@/features/admin/academic-setup/components/academic-segmented-control';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useStudentDetails } from '../hooks/use-student-details';
import {
  canManageStudentDocuments,
  canManageStudentHealth,
  canViewStudentDocuments,
  canViewStudentFinance,
  canViewStudentHealth,
  resolveStudentCapabilities,
} from '../utils/resolve-capabilities';
import { Student360Header } from './student-360-header';
import { StudentOverviewTab } from './student-overview-tab';
import { StudentEnrollmentTab } from './student-enrollment-tab';
import { StudentGuardiansTab } from './student-guardians-tab';
import { StudentDocumentsTab } from './student-documents-tab';
import { StudentHealthTab } from './student-health-tab';
import { StudentFinanceTab } from './student-finance-tab';
import { StudentForm } from './student-form';
import type { StudentDetailsData } from '@/types/student-360';
import '../student-360.css';

type TabId = 'overview' | 'enrollment' | 'guardians' | 'documents' | 'health' | 'finance';

export function Student360Shell({ studentId }: { studentId: string }) {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const state = useStudentDetails(studentId);
  const [tab, setTab] = useState<TabId>('overview');
  const [editing, setEditing] = useState(false);

  if (state.loading && !state.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (state.error || !state.data) {
    return <ApiErrorView error={state.error!} onRetry={state.reload} />;
  }

  const details: StudentDetailsData = state.data;
  const caps = resolveStudentCapabilities(details.capabilities, user);
  const s = details.student;
  const archived = (s.status as string) === 'archived';
  const showDocuments = canViewStudentDocuments(caps);
  const showHealth = canViewStudentHealth(caps);
  const showFinance = canViewStudentFinance(caps);

  const tabOptions: { value: TabId; label: string }[] = [
    { value: 'overview', label: t('admin.student360.tabs.overview') },
    { value: 'enrollment', label: t('admin.student360.tabs.enrollment') },
    { value: 'guardians', label: t('admin.student360.tabs.guardians') },
  ];
  if (showDocuments) {
    tabOptions.push({ value: 'documents', label: t('admin.student360.tabs.documents') });
  }
  if (showHealth) {
    tabOptions.push({ value: 'health', label: t('admin.student360.tabs.health') });
  }
  if (showFinance) {
    tabOptions.push({ value: 'finance', label: t('admin.student360.tabs.finance') });
  }

  return (
    <>
      <Link href="/admin/students" className="back-link">
        ‹ {t('nav.students')}
      </Link>

      <Student360Header
        details={details}
        canManage={caps.can_manage && !archived}
        onEdit={editing ? undefined : () => setEditing(true)}
        extraActions={
          caps.can_manage && !archived && !editing ? (
            <ConfirmActionButton
              label={t('admin.archive')}
              confirmMessage={t('admin.confirmArchive')}
              path={endpoints.admin.studentArchive(s.id)}
              variant="danger"
              onSuccess={() => router.push('/admin/students')}
            />
          ) : null
        }
      />

      {editing ? (
        <StudentForm
          student={s}
          enrollment={details.current_enrollment}
          guardianRelationships={details.guardian_relationships}
          onSaved={() => {
            setEditing(false);
            state.reload();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <AcademicSegmentedControl
            className="student-360-tabs"
            ariaLabel={t('admin.student360.tabsAria')}
            value={tab}
            onChange={setTab}
            options={tabOptions}
          />

          {tab === 'overview' && (
            <StudentOverviewTab
              details={details}
              canManage={caps.can_manage}
              showDocuments={showDocuments}
              showHealth={showHealth}
              showFinance={showFinance}
              onOpenTab={setTab}
              onAccountChanged={state.reload}
            />
          )}
          {tab === 'enrollment' && <StudentEnrollmentTab details={details} />}
          {tab === 'guardians' && (
            <StudentGuardiansTab
              details={details}
              canManageGuardians={caps.can_manage_guardians}
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
          {tab === 'health' && showHealth && (
            <StudentHealthTab
              studentId={s.id}
              canManage={canManageStudentHealth(caps)}
              onChanged={state.reload}
            />
          )}
          {tab === 'finance' && showFinance && (
            <StudentFinanceTab
              studentId={s.id}
              details={details}
              capabilities={caps}
              onChanged={state.reload}
              onOpenGuardians={() => setTab('guardians')}
            />
          )}
        </>
      )}
    </>
  );
}

export function Student360CreatePage() {
  const t = useT();
  const router = useRouter();

  return (
    <>
      <Link href="/admin/students" className="back-link">
        ‹ {t('nav.students')}
      </Link>
      <h1>{t('admin.addStudent')}</h1>
      <StudentForm
        onSaved={(id) => router.push(`/admin/students/${id}`)}
        onCancel={() => router.push('/admin/students')}
      />
    </>
  );
}
