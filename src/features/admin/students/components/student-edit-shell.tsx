'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useStudentDetails } from '../hooks/use-student-details';
import { useStudentOptions } from '../hooks/use-student-options';
import { useStudentOverview } from '../hooks/use-student-overview';
import { StudentGuardiansTab } from './student-guardians-tab';
import { StudentDocumentsTab } from './student-documents-tab';
import { StudentHealthTab } from './student-health-tab';
import { StudentEditSiblingsPanel } from './student-edit-siblings-panel';
import {
  StudentAdminStatusFields,
  StudentContactFields,
  StudentEditReadonlyLocationFields,
  StudentEmergencyFields,
  StudentEnrollmentEditFields,
  StudentIdentityCodeFields,
  StudentPersonalNameFields,
  studentLocationLabels,
} from './student-form-fields';
import { mapStudentApiError } from '../utils/student-api-errors';
import { pickStudentEditSectionPayload, validateStudentEditSection, firstStudentEditFieldError, focusStudentEditFieldError } from '../utils/student-edit-payload';
import {
  buildStudentEditTabHref,
  parseStudentEditTab,
  studentEditTabToSaveSection,
  studentEditTabUsesProfileSave,
  STUDENT_EDIT_TABS,
  type StudentEditTabId,
} from '../utils/student-edit-tabs';
import {
  defaultStudentProfileFormState,
  resolveDefaultNationalityId,
  studentProfileFormStateFromStudent,
  type StudentProfileFieldErrors,
  type StudentProfileFormState,
} from '../utils/student-profile';
import { filterClassesForEnrollment } from '../utils/student-options';
import {
  canManageStudentDocuments,
  canManageStudentHealth,
  canViewStudentDocuments,
  canViewStudentHealth,
  resolveStudentCapabilities,
} from '../utils/resolve-capabilities';
import { resolveOverviewEditAllowed } from '../utils/resolve-overview-allowed-actions';
import { StudentEditPhotoSection } from './student-edit-photo-section';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import type { SiblingLine } from '@/types/sibling-line';
import type { StudentEnrollment } from '@/types/student-360';
import '../student-360.css';

function refName(value: { name?: string } | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name ?? '';
}

function StudentEditTabBar({
  activeTab,
  tabs,
  onSelect,
}: {
  activeTab: StudentEditTabId;
  tabs: StudentEditTabId[];
  onSelect: (tab: StudentEditTabId) => void;
}) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [activeTab]);

  return (
    <nav className="student-edit-tabs student-edit-tabs--sticky" aria-label={t('admin.student360.editPage.tabsAria')}>
      <div ref={scrollRef} className="student-edit-tabs__scroll" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`student-edit-tab-${tab}`}
              aria-selected={isActive}
              aria-controls={`student-edit-panel-${tab}`}
              className={`student-edit-tabs__btn${isActive ? ' student-edit-tabs__btn--active' : ''}`}
              onClick={() => onSelect(tab)}
            >
              {t(`admin.student360.editPage.tabs.${tab}`)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StudentEditValidationAlert({ errors }: { errors: StudentProfileFieldErrors }) {
  const t = useT();
  const messages = Object.values(errors).filter(Boolean);
  if (!messages.length) return null;

  return (
    <div className="student-edit-validation-alert" role="alert">
      <p className="student-edit-validation-alert__title">{t('admin.student360.editPage.validationTitle')}</p>
      <ul className="student-edit-validation-alert__list">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function StudentEditSectionSave({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: () => void;
}) {
  const t = useT();
  return (
    <div className="student-edit-section__actions row" style={{ gap: 8 }}>
      <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={onSave}>
        {saving ? t('common.saving') : t('admin.student360.editPage.saveSection')}
      </button>
    </div>
  );
}

function EnrollmentHistoryList({
  items,
}: {
  items: StudentEnrollment[];
}) {
  const t = useT();
  if (!items.length) return null;

  return (
    <section className="student-edit-enrollment-history">
      <h3 className="student-edit-section__title">{t('admin.student360.editPage.enrollmentHistory')}</h3>
      <ul className="student-edit-enrollment-history__list">
        {items.map((item) => (
          <li key={item.id} className="student-edit-enrollment-history__item">
            <span>{refName(item.academic_year)}</span>
            <span>{studentLevelLabel(item.level)}</span>
            <span>{studentClassLabel(item.class)}</span>
            <span className="tiny muted">{item.state}</span>
          </li>
        ))}
      </ul>
      <p className="tiny muted">{t('admin.student360.editPage.enrollmentHistoryHint')}</p>
    </section>
  );
}

export function StudentEditShell({ studentId }: { studentId: string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const detailsState = useStudentDetails(studentId);
  const overviewState = useStudentOverview(studentId, Boolean(detailsState.data));
  const optionsState = useStudentOptions();

  const [state, setState] = useState<StudentProfileFormState>(() => defaultStudentProfileFormState(null));
  const [baseline, setBaseline] = useState<StudentProfileFormState>(() => defaultStudentProfileFormState(null));
  const [originalSiblingLines, setOriginalSiblingLines] = useState<SiblingLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<StudentProfileFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const details = detailsState.data;
  const caps = details ? resolveStudentCapabilities(details.capabilities, user) : null;
  const canEdit = caps ? resolveOverviewEditAllowed(overviewState.data, caps) : false;
  const showHealth = caps ? canViewStudentHealth(caps) : false;
  const showDocuments = caps ? canViewStudentDocuments(caps) : false;
  const canManageHealth = caps ? canManageStudentHealth(caps) : false;
  const canManageDocuments = caps ? canManageStudentDocuments(caps) : false;

  const availableTabs = useMemo(() => {
    return STUDENT_EDIT_TABS.filter((tab) => {
      if (tab === 'health') return showHealth;
      if (tab === 'documents') return showDocuments;
      return true;
    });
  }, [showHealth, showDocuments]);

  const tab = parseStudentEditTab(searchParams.get('tab'), availableTabs);
  const options = optionsState.options;
  const student = details?.student;
  const enrollment = details?.current_enrollment ?? null;

  useEffect(() => {
    if (!details || optionsState.loading) return;
    const next = studentProfileFormStateFromStudent(details.student, enrollment, options);
    const defaultNationalityId = resolveDefaultNationalityId(options?.nationalities);
    const studentHasNationality =
      details.student.nationality_id != null || details.student.nationality?.id != null;
    const displayState =
      !studentHasNationality && defaultNationalityId && !next.nationalityId.trim()
        ? { ...next, nationalityId: defaultNationalityId }
        : next;

    setState(displayState);
    setBaseline(next);
    setOriginalSiblingLines(next.siblingLines);
  }, [details?.student.id, details?.student.write_date, enrollment?.id, optionsState.loading, options]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== tab) {
      router.replace(buildStudentEditTabHref(studentId, tab), { scroll: false });
    }
  }, [tab, studentId, router, searchParams]);

  useEffect(() => {
    if (!student) return;
    const title = t('admin.student360.editPage.title');
    const name = getStudentDisplayName(student);
    document.title = `${title} — ${name} — ${t('admin.student360.documentTitle.brand')}`;
  }, [student, t]);

  const filteredClasses = useMemo(
    () => filterClassesForEnrollment(options?.classes ?? [], state.levelId),
    [options?.classes, state.levelId],
  );

  const location = student ? studentLocationLabels(student) : { stateLabel: '', countryLabel: '' };
  const displayAge =
    (overviewState.data?.profile as { display_age?: string | null } | null | undefined)?.display_age ??
    null;

  function patch(next: Partial<StudentProfileFormState>) {
    setState((prev) => ({ ...prev, ...next }));
    setFieldErrors({});
  }

  function fillEmergencyFromPrimary() {
    const primary = details?.guardian_relationships.find((r) => r.is_primary_contact && r.guardian);
    if (!primary?.guardian?.phone && !primary?.guardian?.name) return;
    patch({
      emergencyContactName: primary.guardian.name ?? '',
      emergencyPhone: primary.guardian.phone ?? primary.guardian.secondary_phone ?? '',
      emergencyRelationship: primary.relationship_type ?? '',
    });
  }

  const primaryHasPhone = !!details?.guardian_relationships.find(
    (r) => r.is_primary_contact && (r.guardian.phone || r.guardian.secondary_phone),
  );

  async function saveCurrentSection() {
    const section = studentEditTabToSaveSection(tab);
    if (!section || !student) return;

    const validation = validateStudentEditSection(state, baseline, originalSiblingLines, section, t);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      focusStudentEditFieldError(panelRef.current, validation.errors, section);
      toast.error(firstStudentEditFieldError(validation.errors, section) ?? t('errors.validationFailed'));
      return;
    }

    const payload = pickStudentEditSectionPayload(state, baseline, originalSiblingLines, section);
    if (Object.keys(payload).length === 0) {
      toast.success(t('admin.student360.noChanges'));
      return;
    }

    setSaving(true);
    const res = await api.post(endpoints.admin.studentUpdate(student.id), payload);
    setSaving(false);

    if (res.success) {
      toast.success(t('admin.saveSuccess'));
      detailsState.reload();
      return;
    }

    if (!res.success) {
      const mapped = mapStudentApiError(res.error, t);
      if (mapped.fieldErrors) {
        setFieldErrors(mapped.fieldErrors);
        focusStudentEditFieldError(panelRef.current, mapped.fieldErrors, section);
      }
      toast.error(mapped.message);
    }
  }

  if (detailsState.loading && !details) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (detailsState.error || !details || !caps || !student) {
    return <ApiErrorView error={detailsState.error!} onRetry={detailsState.reload} />;
  }

  if (!canEdit) {
    return (
      <ApiErrorView
        error={{ code: 'forbidden', message: t('admin.studentForbidden') }}
        onRetry={() => router.push(`/admin/students/${studentId}`)}
      />
    );
  }

  const schoolName = refName(enrollment?.school ?? student.school);
  const levelName = studentLevelLabel(enrollment?.level ?? student.level);
  const academicYearName = refName(enrollment?.academic_year);

  return (
    <div className="student-edit-page student-360-shell">
      <nav className="student-360-breadcrumb" aria-label={t('admin.student360.breadcrumb.aria')}>
        <ol className="student-360-breadcrumb__list">
          <li className="student-360-breadcrumb__item">
            <Link href="/admin/students">{t('admin.student360.breadcrumb.students')}</Link>
          </li>
          <li className="student-360-breadcrumb__item">
            <Link href={`/admin/students/${studentId}`}>{getStudentDisplayName(student)}</Link>
          </li>
          <li className="student-360-breadcrumb__item" aria-current="page">
            {t('admin.student360.editPage.title')}
          </li>
        </ol>
      </nav>

      <header className="student-edit-page__hero">
        <div className="student-edit-page__hero-top">
          <div className="student-edit-page__hero-text">
            <p className="student-edit-page__eyebrow">{t('admin.student360.editPage.title')}</p>
            <h1 className="student-edit-page__title">{getStudentDisplayName(student)}</h1>
            {schoolName || levelName || academicYearName ? (
              <p className="student-edit-page__meta">
                {[schoolName, levelName, academicYearName].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
          <Link href={`/admin/students/${studentId}`} className="student-edit-page__back btn btn--ghost btn--sm">
            {t('admin.student360.editPage.backToProfile')}
          </Link>
        </div>

        <StudentEditTabBar
          activeTab={tab}
          tabs={availableTabs}
          onSelect={(next) => router.push(buildStudentEditTabHref(studentId, next), { scroll: false })}
        />
      </header>

      <StudentEditPhotoSection
        studentId={student.id}
        gender={student.gender ?? null}
        displayName={getStudentDisplayName(student)}
        imageUrl={overviewState.data?.photo?.image_url ?? student.image_url}
        thumbnailUrl={overviewState.data?.photo?.thumbnail_url ?? null}
        canManage={canManageDocuments}
        onUploaded={() => {
          detailsState.reload();
          overviewState.reload();
        }}
      />

      <div
        ref={panelRef}
        className="student-edit-page__panel"
        role="tabpanel"
        id={`student-edit-panel-${tab}`}
        aria-labelledby={`student-edit-tab-${tab}`}
      >
        <StudentEditValidationAlert errors={fieldErrors} />
        {tab === 'personal' ? (
          <Card className="student-edit-page__card">
            <div className="student-create-form student-create-identity">
              <StudentPersonalNameFields
                state={state}
                errors={fieldErrors}
                optionsLoading={optionsState.loading}
                genders={options?.genders ?? []}
                nationalities={options?.nationalities ?? []}
                onChange={patch}
              />
              <StudentContactFields state={state} errors={fieldErrors} onChange={patch} />
              <StudentEditReadonlyLocationFields
                stateLabel={location.stateLabel}
                countryLabel={location.countryLabel}
                displayAge={displayAge}
              />
            </div>
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'identity' ? (
          <Card className="student-edit-page__card">
            <div className="student-create-form">
              <StudentIdentityCodeFields state={state} errors={fieldErrors} onChange={patch} />
            </div>
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'schooling' ? (
          <Card className="student-edit-page__card">
            <div className="student-create-form col" style={{ gap: 0 }}>
              <StudentEnrollmentEditFields
                state={state}
                errors={fieldErrors}
                optionsLoading={optionsState.loading}
                schoolName={schoolName}
                levelName={levelName}
                academicYearName={academicYearName}
                classes={filteredClasses}
                registrationTypes={options?.registrationTypes ?? []}
                onChange={patch}
              />
              <EnrollmentHistoryList items={details.enrollment_history} />
            </div>
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'admin' ? (
          <Card className="student-edit-page__card">
            <div className="student-create-form">
              <StudentAdminStatusFields
                state={state}
                errors={fieldErrors}
                optionsLoading={optionsState.loading}
                statuses={options?.studentStatuses ?? []}
                onChange={patch}
              />
            </div>
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'emergency' ? (
          <Card className="student-edit-page__card">
            <div className="student-create-form">
              <StudentEmergencyFields
                state={state}
                errors={fieldErrors}
                emergencyRelationships={options?.emergencyRelationships ?? []}
                optionsLoading={optionsState.loading}
                onChange={patch}
                onFillFromPrimary={fillEmergencyFromPrimary}
                canFillFromPrimary={!!primaryHasPhone}
              />
            </div>
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'siblings' ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.siblings')} />
            <StudentEditSiblingsPanel
              state={state}
              originalSiblingLineCount={originalSiblingLines.length}
              siblingCount={student.sibling_count}
              siblingsSummary={student.siblings_summary}
              onChange={patch}
            />
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'health' && showHealth ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.health')} />
            <p className="tiny muted">{t('admin.student360.editPage.healthHint')}</p>
            <StudentHealthTab
              studentId={student.id}
              canManage={canManageHealth}
              onChanged={detailsState.reload}
            />
          </Card>
        ) : null}

        {tab === 'guardians' ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.guardians')} />
            <p className="tiny muted">{t('admin.student360.editPage.guardiansHint')}</p>
            <StudentGuardiansTab
              details={details}
              canManageGuardians={caps.can_manage_guardians}
              onChanged={detailsState.reload}
            />
          </Card>
        ) : null}

        {tab === 'documents' && showDocuments ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.documents')} />
            <p className="tiny muted">
              <Link href={`#student-photo`}>{t('admin.student360.editPage.photo.manageLink')}</Link>
            </p>
            <StudentDocumentsTab
              studentId={student.id}
              canManage={canManageDocuments}
              onChanged={detailsState.reload}
            />
          </Card>
        ) : null}
      </div>

      {studentEditTabUsesProfileSave(tab) && optionsState.error ? (
        <Card>
          <p className="tiny muted">{t('admin.student360.optionsLoadFailed')}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={optionsState.reload}>
            {t('common.retry')}
          </button>
        </Card>
      ) : null}
    </div>
  );
}
