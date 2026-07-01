'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { pickStudentEditSectionPayload } from '../utils/student-edit-payload';
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
  studentProfileFormStateFromStudent,
  validateStudentProfileForm,
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
import { resolveStudentPhotoCandidates } from '../utils/resolve-student-photo-url';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import type { SiblingLine } from '@/types/sibling-line';
import type { StudentEnrollment, StudentSummary } from '@/types/student-360';
import '../student-360.css';

function refName(value: { name?: string } | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name ?? '';
}

function StudentEditTabBar({
  studentId,
  activeTab,
  tabs,
  onSelect,
}: {
  studentId: string;
  activeTab: StudentEditTabId;
  tabs: StudentEditTabId[];
  onSelect: (tab: StudentEditTabId) => void;
}) {
  const t = useT();

  return (
    <nav className="student-edit-tabs" aria-label={t('admin.student360.editPage.tabsAria')}>
      <ul className="student-edit-tabs__list" role="tablist">
        {tabs.map((tab) => (
          <li key={tab} role="presentation">
            <button
              type="button"
              role="tab"
              id={`student-edit-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={`student-edit-panel-${tab}`}
              className={`student-edit-tabs__btn${activeTab === tab ? ' student-edit-tabs__btn--active' : ''}`}
              onClick={() => onSelect(tab)}
            >
              {t(`admin.student360.editPage.tabs.${tab}`)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
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

function StudentEditPhotoPreview({
  student,
  overviewPhoto,
}: {
  student: StudentSummary;
  overviewPhoto?: { image_url?: string | null; thumbnail_url?: string | null } | null;
}) {
  const t = useT();
  const candidates = resolveStudentPhotoCandidates(overviewPhoto, student.image_url);
  const src = candidates[0] ?? null;

  return (
    <div className="student-edit-photo">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="student-edit-photo__img" />
      ) : (
        <div className="student-edit-photo__placeholder" aria-hidden="true">
          {t('admin.student360.editPage.noPhoto')}
        </div>
      )}
      <p className="tiny muted">{t('admin.student360.editPage.photoHint')}</p>
    </div>
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
    setState(next);
    setBaseline(next);
    setOriginalSiblingLines(next.siblingLines);
  }, [details?.student.id, enrollment?.id, optionsState.loading, options]);

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

    const validation = validateStudentProfileForm(state, t);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(t('errors.validationFailed'));
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
      if (mapped.fieldErrors) setFieldErrors(mapped.fieldErrors);
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

      <header className="student-edit-page__header">
        <div>
          <h1 className="student-edit-page__title">{t('admin.student360.editPage.title')}</h1>
          <p className="student-edit-page__subtitle">{getStudentDisplayName(student)}</p>
        </div>
        <Link href={`/admin/students/${studentId}`} className="btn btn--ghost btn--sm">
          {t('admin.student360.editPage.backToProfile')}
        </Link>
      </header>

      <StudentEditTabBar
        studentId={studentId}
        activeTab={tab}
        tabs={availableTabs}
        onSelect={(next) => router.push(buildStudentEditTabHref(studentId, next), { scroll: false })}
      />

      <div
        className="student-edit-page__panel"
        role="tabpanel"
        id={`student-edit-panel-${tab}`}
        aria-labelledby={`student-edit-tab-${tab}`}
      >
        {tab === 'personal' ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.personal')} />
            <div className="col" style={{ gap: 16 }}>
              <StudentPersonalNameFields
                state={state}
                errors={fieldErrors}
                optionsLoading={optionsState.loading}
                genders={options?.genders ?? []}
                nationalities={options?.nationalities ?? []}
                onChange={patch}
              />
              <SectionHead title={t('admin.student360.sections.contact')} />
              <StudentContactFields state={state} errors={fieldErrors} onChange={patch} />
              <SectionHead title={t('admin.student360.editPage.locationReadonly')} />
              <StudentEditReadonlyLocationFields
                stateLabel={location.stateLabel}
                countryLabel={location.countryLabel}
                displayAge={displayAge}
              />
              <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
            </div>
          </Card>
        ) : null}

        {tab === 'identity' ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.identity')} />
            <StudentIdentityCodeFields state={state} errors={fieldErrors} onChange={patch} />
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'schooling' ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.schooling')} />
            <div className="col" style={{ gap: 16 }}>
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
              <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
            </div>
          </Card>
        ) : null}

        {tab === 'admin' ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.admin')} />
            <StudentAdminStatusFields
              state={state}
              errors={fieldErrors}
              optionsLoading={optionsState.loading}
              statuses={options?.studentStatuses ?? []}
              onChange={patch}
            />
            <StudentEditSectionSave saving={saving} onSave={saveCurrentSection} />
          </Card>
        ) : null}

        {tab === 'emergency' ? (
          <Card>
            <SectionHead title={t('admin.student360.editPage.tabs.emergency')} />
            <StudentEmergencyFields
              state={state}
              errors={fieldErrors}
              emergencyRelationships={options?.emergencyRelationships ?? []}
              optionsLoading={optionsState.loading}
              onChange={patch}
              onFillFromPrimary={fillEmergencyFromPrimary}
              canFillFromPrimary={!!primaryHasPhone}
            />
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
            <StudentEditPhotoPreview student={student} overviewPhoto={overviewState.data?.photo} />
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
