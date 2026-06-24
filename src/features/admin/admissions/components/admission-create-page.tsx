'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { localizeStudentGenderOptions, resolveDefaultNationalityId, todayIsoDate } from '@/features/admin/students/utils/student-profile';
import { filterClassesForEnrollment } from '@/features/admin/students/utils/student-options';
import { StudentCreateStyledSection } from '@/features/admin/students/components/student-create-section-header';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  EnrollmentIntakeAcademicFields,
  EnrollmentIntakeAdmissionExtrasFields,
  EnrollmentIntakeFollowUpFields,
  EnrollmentIntakeGuardianFields,
  EnrollmentIntakeIdentityFields,
  EnrollmentIntakeRegistrationFields,
  EnrollmentIntakeSiblingsFields,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import {
  intakeFromAdmissionForm,
  patchAdmissionFormFromIntake,
} from '@/features/admin/enrollment-intake/mappers';
import type { EnrollmentIntakePatch } from '@/features/admin/enrollment-intake/types';
import { createAdmission } from '../api/admissions-api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import {
  admissionOptionId,
  filterAdmissionCyclesByLevels,
  filterLevelsByCycle,
  filterStreamsByLevel,
  findAdmissionLevel,
  resolveDefaultAdmissionSourceId,
} from '../utils/admission-options';
import {
  buildCreateAdmissionPayload,
  emptyAdmissionCreateForm,
  type AdmissionCreateFormState,
} from '../utils/admission-create-payload';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { validateSiblingLinesLinkedStudents } from '../utils/sibling-lines';
import '@/features/admin/students/student-360.css';
import '../admissions.css';

export function AdmissionCreatePage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const today = useMemo(() => todayIsoDate(), []);
  const [form, setForm] = useState<AdmissionCreateFormState>(() => emptyAdmissionCreateForm(today));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const studentOptionsState = useStudentOptions();
  const admissionOptionsState = useAdmissionOptions();
  const admissionOptions = admissionOptionsState.options;

  const academicYears = admissionOptions?.academic_years ?? [];
  const cycles = admissionOptions?.cycles ?? [];
  const allLevels = admissionOptions?.levels ?? [];
  const allStreams = admissionOptions?.streams ?? [];

  const filteredLevels = useMemo(
    () => filterLevelsByCycle(allLevels, form.requested_cycle_code),
    [allLevels, form.requested_cycle_code],
  );

  const filteredCycles = useMemo(
    () => filterAdmissionCyclesByLevels(cycles, allLevels),
    [cycles, allLevels],
  );

  const selectedLevel = useMemo(
    () => findAdmissionLevel(allLevels, form.requested_level_id),
    [allLevels, form.requested_level_id],
  );

  const showStreamField = Boolean(selectedLevel?.requires_stream);
  const filteredStreams = useMemo(
    () => filterStreamsByLevel(allStreams, form.requested_level_id),
    [allStreams, form.requested_level_id],
  );
  const filteredClasses = useMemo(
    () =>
      filterClassesForEnrollment(
        studentOptionsState.options?.classes ?? [],
        form.requested_level_id != null ? String(form.requested_level_id) : '',
      ),
    [studentOptionsState.options?.classes, form.requested_level_id],
  );
  const intakeValues = useMemo(() => intakeFromAdmissionForm(form), [form]);
  const genders = useMemo(
    () => localizeStudentGenderOptions(studentOptionsState.options?.genders ?? [], t),
    [studentOptionsState.options?.genders, t],
  );

  function handleIntakePatch(patch: EnrollmentIntakePatch) {
    setForm((prev) => ({ ...prev, ...patchAdmissionFormFromIntake(patch) }));
  }

  useEffect(() => {
    if (defaultsApplied || !admissionOptionsState.options?.sources.length) return;
    const sourceId = resolveDefaultAdmissionSourceId(admissionOptionsState.options.sources);
    if (sourceId == null) {
      setDefaultsApplied(true);
      return;
    }
    setForm((prev) => ({ ...prev, source_id: sourceId }));
    setDefaultsApplied(true);
  }, [admissionOptionsState.options?.sources, defaultsApplied]);

  useEffect(() => {
    if (studentOptionsState.loading || !studentOptionsState.options?.nationalities.length) return;
    const defaultNationality = resolveDefaultNationalityId(studentOptionsState.options.nationalities);
    if (!defaultNationality) return;
    setForm((prev) =>
      prev.nationality_id != null && prev.nationality_id > 0
        ? prev
        : { ...prev, nationality_id: Number(defaultNationality) },
    );
  }, [studentOptionsState.loading, studentOptionsState.options?.nationalities]);

  const lookupError =
    studentOptionsState.error?.message ?? admissionOptionsState.error?.message ?? null;

  const relationshipLoadFailed =
    !admissionOptionsState.loading &&
    (admissionOptionsState.error != null ||
      (admissionOptionsState.options != null &&
        admissionOptionsState.options.relationships.length === 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null) return;

    if (form.has_siblings) {
      const siblingError = validateSiblingLinesLinkedStudents(form.sibling_lines, t);
      if (siblingError) {
        setError(siblingError);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const payload = buildCreateAdmissionPayload(form, activeSchoolId, allLevels);
    const res = await createAdmission(payload, { active_school_id: activeSchoolId });
    setSubmitting(false);

    if (res.success) {
      router.push(`/admin/admissions/${res.data.id}`);
      return;
    }

    const message = admissionApiErrorMessage(res.error, t);
    setError(
      message === t('errors.serverError') ? t('admin.admissions.create.submitError') : message,
    );
  }

  return (
    <div className="admissions-page admissions-create-page student-create-page">
      <nav className="student-360-breadcrumb" aria-label={t('admin.admissions.breadcrumb.aria')}>
        <ol className="student-360-breadcrumb__list">
          <li className="student-360-breadcrumb__item">
            <Link href="/admin/admissions">{t('admin.admissions.breadcrumb.list')}</Link>
          </li>
          <li className="student-360-breadcrumb__item">
            <span aria-current="page">{t('admin.admissions.create.title')}</span>
          </li>
        </ol>
      </nav>

      <Link href="/admin/admissions" className="admissions-create-header__back back-link">
        ‹ {t('common.back')}
      </Link>

      <header className="student-create-page__header admissions-create-page__hero">
        <h1 className="student-create-page__title">{t('admin.admissions.create.title')}</h1>
        <p className="student-create-page__desc">{t('admin.admissions.create.subtitle')}</p>
      </header>

      <form className="student-create-form admissions-create-form" onSubmit={handleSubmit} lang={locale}>
        {lookupError ? (
          <div className="alert alert--warning" role="status">
            {lookupError}
          </div>
        ) : null}
        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <StudentCreateStyledSection
          icon="identity"
          title={t('admin.admissions.create.studentSection')}
          lead={t('admin.admissions.create.studentSectionLead')}
          className="student-create-form__section--identity"
        >
          <EnrollmentIntakeIdentityFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            optionsLoading={studentOptionsState.loading}
            genders={genders}
            nationalities={studentOptionsState.options?.nationalities ?? []}
            requireArabicNames
          />
          <EnrollmentIntakeAdmissionExtrasFields values={intakeValues} onPatch={handleIntakePatch} />
        </StudentCreateStyledSection>

        <StudentCreateStyledSection
          icon="siblings"
          title={t('admin.siblings.sectionTitle')}
          lead={t('admin.admissions.create.siblingsSectionLead')}
          className="student-create-form__section--siblings"
        >
          <EnrollmentIntakeSiblingsFields values={intakeValues} onPatch={handleIntakePatch} />
        </StudentCreateStyledSection>

        <StudentCreateStyledSection
          icon="enrollment"
          title={t('admin.admissions.create.studySection')}
          lead={t('admin.admissions.create.studySectionLead')}
          className="student-create-form__section--enrollment"
        >
          <EnrollmentIntakeAcademicFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            academic={{
              cycleMode: 'code',
              years: academicYears,
              cycles: filteredCycles.map((c) => ({ mode: 'code' as const, code: c.code, name: c.name })),
              levels: filteredLevels,
              streams: filteredStreams,
              classes: filteredClasses,
              registrationTypes: studentOptionsState.options?.registrationTypes ?? [],
              levelRequiresStream: showStreamField,
              optionsLoading: admissionOptionsState.loading || studentOptionsState.loading,
              cyclesLoading: admissionOptionsState.loading,
              streamRequired: showStreamField,
            }}
          />
          <EnrollmentIntakeRegistrationFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            registrationTypes={studentOptionsState.options?.registrationTypes ?? []}
            optionsLoading={studentOptionsState.loading}
          />
        </StudentCreateStyledSection>

        <StudentCreateStyledSection
          icon="guardian"
          title={t('admin.admissions.create.guardianSection')}
          lead={t('admin.admissions.create.guardianSectionLead')}
          className="student-create-form__section--guardian"
        >
          <EnrollmentIntakeGuardianFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            guardian={{
              relationships: admissionOptionsState.options?.relationships ?? [],
              relationshipsLoading: admissionOptionsState.loading,
              relationshipLoadFailed,
            }}
          />
        </StudentCreateStyledSection>

        <StudentCreateStyledSection
          icon="followUp"
          title={t('admin.admissions.create.followUpSection')}
          lead={t('admin.admissions.create.followUpSectionLead')}
          className="student-create-form__section--followUp"
        >
          <EnrollmentIntakeFollowUpFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            followUp={{
              sources: (admissionOptionsState.options?.sources ?? []).map((s) => ({
                id: admissionOptionId(s) ?? undefined,
                label: s.label,
              })),
              sourcesLoading: admissionOptionsState.loading,
            }}
          />
        </StudentCreateStyledSection>

        <div className="student-create-form__actions admissions-create-actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('admin.admissions.create.submitting') : t('admin.admissions.create.submit')}
          </button>
          <Link href="/admin/admissions" className="btn btn--ghost">
            {t('admin.admissions.create.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
