'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiErrorView, LoadingState, PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useStudentDetails } from '../hooks/use-student-details';
import { useStudentOverview } from '../hooks/use-student-overview';
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
  isLegacyFinancialAgreementTab,
  parseStudent360Tab,
  student360PageTitleKey,
  type Student360TabId,
} from '../utils/student-360-tabs';
import {
  LEGACY_FINANCE_AGREEMENT_SECTION,
  parseStudentFinanceSubTab,
} from '@/features/admin/student-finance/utils/student-finance-sub-tab';
import { Student360Breadcrumb } from './student-360-breadcrumb';
import { Student360Header } from './student-360-header';
import { Student360QuickActions } from './student-360-quick-actions';
import { Student360TabBar } from './student-360-tab-bar';
import { Student360TabErrorBoundary } from './student-360-tab-error-boundary';
import { Student360TabHeader } from './student-360-tab-header';
import { StudentOverviewTab } from './student-overview-tab';
import { StudentEnrollmentTab } from './student-enrollment-tab';
import { StudentAcademicResultsTab } from './student-academic-results-tab';
import { StudentGuardiansTab } from './student-guardians-tab';
import { StudentDocumentsTab } from './student-documents-tab';
import { StudentHealthTab } from './student-health-tab';
import { StudentFinanceWorkspaceShell } from '@/features/admin/student-finance/components/student-finance-workspace-shell';
import { StudentCreateForm } from './student-create-form';
import type { StudentCreateSaveMode, StudentCreateSaveOutcome } from './student-create-form';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useToast } from '@/components/ui/toast';
import {
  fetchAdmissionPrefill,
  linkAdmissionStudent,
} from '@/features/admin/admissions/api/admissions-api';
import {
  buildAdmissionRegistrationContext,
  mapAdmissionPrefillToStudentProfile,
  type AdmissionRegistrationContext,
} from '@/features/admin/admissions/utils/admission-prefill-mapper';
import type { StudentProfileFormState } from '../utils/student-profile';
import type { ApiErrorBody } from '@/types/api';
import '@/features/admin/admissions/admissions.css';
import { canCreateStudents, canManageStudentAccounts } from '@/lib/permissions/academic-capabilities';
import { resolveOverviewEditAllowed } from '../utils/resolve-overview-allowed-actions';
import { sanitizeReturnTo, isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';
import { buildStudent360TabIndicators } from '../utils/student-360-tab-indicators';
import type { StudentDetailsData } from '@/types/student-360';
import '../student-360.css';
import '@/features/admin/academic-setup/academic-setup-ui.css';

function Student360TabPageHeader({ tab }: { tab: Student360TabId }) {
  const t = useT();
  if (tab === 'documents' || tab === 'finance' || tab === 'overview') {
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
  const overviewState = useStudentOverview(studentId, Boolean(state.data));

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
  const setupMode = searchParams.get('setup') === '1';
  const studentName = details ? getStudentDisplayName(details.student) : '';

  useEffect(() => {
    if (!details) return;
    if (isLegacyFinancialAgreementTab(tabParam) && showFinance) {
      // Legacy main tab always lands on finance → agreements unless a sub-tab is explicit.
      const sectionParam = searchParams.get('section');
      const financeSubTab = parseStudentFinanceSubTab(
        searchParams.get('financeSubTab') ??
          (sectionParam === LEGACY_FINANCE_AGREEMENT_SECTION || !sectionParam
            ? 'agreements'
            : sectionParam),
      );
      const target = `/admin/students/${studentId}?tab=finance&financeSubTab=${financeSubTab}`;
      router.replace(target, { scroll: false });
      return;
    }
    if (tabParam && tabParam !== tab) {
      router.replace(buildStudent360TabHref(studentId, tab), { scroll: false });
    }
  }, [tabParam, tab, studentId, router, details, showFinance, searchParams]);

  useEffect(() => {
    if (!details) return;
    const tabTitle = t(student360PageTitleKey(tab));
    const brand = t('admin.student360.documentTitle.brand');
    document.title = `${tabTitle} — ${studentName} — ${brand}`;
  }, [tab, studentName, t, details]);

  useEffect(() => {
    if (!setupMode || tab !== 'overview') return;
    const target = document.querySelector('.student-readiness--setup');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setupMode, tab, details]);

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
  });

  return (
    <div className="student-360-shell">
      <Student360Breadcrumb studentId={studentId} studentName={studentName} tab={tab} />
      {safeReturnTo ? (
        <Link href={safeReturnTo} className="back-link">
          ‹ {t('admin.finance.hub.backToPrevious')}
        </Link>
      ) : null}

      <div className="student-360-profile-hero">
        <Student360Header
          details={resolvedDetails}
          overview={overviewState.data}
          overviewLoading={overviewState.loading && !overviewState.data}
          actions={
            <Student360QuickActions
              details={resolvedDetails}
              caps={caps}
              overview={overviewState.data}
              archived={archived}
              editHref={`/admin/students/${studentId}/edit`}
              onEdit={() => router.push(`/admin/students/${studentId}/edit?tab=schooling`)}
              onOpenTab={(next) =>
                router.push(buildStudent360TabHref(studentId, next), { scroll: false })
              }
              onArchiveSuccess={() => router.push('/admin/students')}
              onRecordPayment={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('tab', 'finance');
                params.set('collect', '1');
                router.push(`/admin/students/${studentId}?${params.toString()}`, { scroll: false });
              }}
            />
          }
        />

        <div className="student-360-tabs-sticky">
          <Student360TabBar
            studentId={studentId}
            activeTab={tab}
            tabs={availableTabs}
            ariaLabel={t('admin.student360.tabsAria')}
            indicators={tabIndicators}
          />
        </div>
      </div>

      <Student360TabPageHeader tab={tab} />

      <Student360TabErrorBoundary studentId={studentId} tab={tab} onRetry={state.reload}>
        {tab === 'overview' && (
          <StudentOverviewTab
            studentId={studentId}
            details={resolvedDetails}
            overview={overviewState.data}
            overviewLoading={overviewState.loading}
            overviewEndpointUnavailable={overviewState.endpointUnavailable}
            canManage={resolveOverviewEditAllowed(overviewState.data, caps)}
            canManageAccount={canManageStudentAccounts(user)}
            showDocuments={showDocuments}
            showHealth={showHealth}
            showFinance={showFinance}
            setupMode={setupMode}
            onOpenTab={(next, options) => {
              if (options?.financeSubTab) {
                const base = `/admin/students/${studentId}?tab=finance`;
                const href =
                  options.financeSubTab === 'overview'
                    ? base
                    : `${base}&financeSubTab=${options.financeSubTab}`;
                router.push(href, { scroll: false });
                return;
              }
              router.push(buildStudent360TabHref(studentId, next), { scroll: false });
            }}
            onEditProfile={() => router.push(`/admin/students/${studentId}/edit`)}
            onAccountChanged={state.reload}
          />
        )}
        {tab === 'enrollment' && (
          <StudentEnrollmentTab
            details={resolvedDetails}
            canManage={caps.can_manage && !archived}
            onCreateEnrollment={() => router.push(`/admin/students/${studentId}/edit?tab=schooling`)}
          />
        )}
        {tab === 'academic' && <StudentAcademicResultsTab details={resolvedDetails} />}
        {tab === 'guardians' && (
          <StudentGuardiansTab
            details={resolvedDetails}
            canManageGuardians={caps.can_manage_guardians}
            onChanged={state.reload}
          />
        )}
        {tab === 'finance' && showFinance && (
          <StudentFinanceWorkspaceShell
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
    </div>
  );
}

export function Student360CreatePage() {
  const t = useT();
  const user = useSession();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeSchoolId } = useAdminSession();
  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = isSafeInternalReturnPath(returnTo) ? sanitizeReturnTo(returnTo) : null;
  const admissionIdRaw = searchParams.get('admission_id');
  const admissionId =
    admissionIdRaw && /^\d+$/.test(admissionIdRaw) ? Number(admissionIdRaw) : null;

  const [prefillNonce, setPrefillNonce] = useState(0);
  const [prefillLoading, setPrefillLoading] = useState(Boolean(admissionId));
  const [prefillPatch, setPrefillPatch] = useState<Partial<StudentProfileFormState> | null>(null);
  const [admissionBanner, setAdmissionBanner] = useState<AdmissionRegistrationContext | null>(null);
  const [prefillError, setPrefillError] = useState<ApiErrorBody | null>(null);

  useEffect(() => {
    if (!admissionId || activeSchoolId == null) {
      setPrefillLoading(false);
      return;
    }
    let active = true;
    setPrefillLoading(true);
    setPrefillError(null);
    fetchAdmissionPrefill(admissionId, { active_school_id: activeSchoolId }).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setPrefillPatch(mapAdmissionPrefillToStudentProfile(res.data));
        setAdmissionBanner(buildAdmissionRegistrationContext(admissionId, res.data));
        setPrefillError(null);
      } else if (!res.success) {
        setPrefillPatch(null);
        setAdmissionBanner(null);
        setPrefillError(res.error);
      } else {
        setPrefillPatch(null);
        setAdmissionBanner(null);
        setPrefillError(null);
      }
      setPrefillLoading(false);
    });
    return () => {
      active = false;
    };
  }, [admissionId, activeSchoolId, prefillNonce]);

  function handleCancel() {
    if (safeReturnTo) router.push(safeReturnTo);
    else router.push('/admin/students');
  }

  function handleSaved(
    id: number,
    mode: StudentCreateSaveMode,
    outcome?: StudentCreateSaveOutcome,
  ) {
    void (async () => {
      if (admissionId != null && activeSchoolId != null) {
        const link = await linkAdmissionStudent(admissionId, id, {
          active_school_id: activeSchoolId,
        });
        if (!link.success) {
          toast.error(t('admin.admissions.registration.linkFailed'));
          router.push(`/admin/students/${id}`);
          return;
        }
        toast.success(t('admin.admissions.registration.success'));
        router.push(`/admin/students/${id}`);
        return;
      }

      if (
        outcome?.financeActivation === 'activate' &&
        !outcome.billingResponsibilityUnresolved
      ) {
        router.push(`/admin/students/${id}?tab=finance`);
        return;
      }
      if (mode === 'setup') {
        router.push(`/admin/students/${id}?setup=1`);
        return;
      }
      if (safeReturnTo) router.push(safeReturnTo);
      else router.push(`/admin/students/${id}`);
    })();
  }

  if (!canCreateStudents(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  if (admissionId && prefillLoading) {
    return <LoadingState label={t('admin.admissions.prefill.loading')} />;
  }

  if (admissionId && prefillError) {
    return (
      <ApiErrorView
        error={prefillError}
        onRetry={() => setPrefillNonce((value) => value + 1)}
      />
    );
  }

  return (
    <div className="student-create-page">
      <nav className="student-360-breadcrumb" aria-label={t('admin.student360.breadcrumb.aria')}>
        <ol className="student-360-breadcrumb__list">
          <li className="student-360-breadcrumb__item">
            <Link href="/admin/students">{t('admin.student360.breadcrumb.students')}</Link>
          </li>
        </ol>
      </nav>
      {safeReturnTo ? (
        <Link href={safeReturnTo} className="back-link">
          ‹ {t('admin.finance.hub.backToPrevious')}
        </Link>
      ) : null}
      <StudentCreateForm
        initialProfilePatch={prefillPatch}
        admissionBanner={admissionBanner}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    </div>
  );
}
