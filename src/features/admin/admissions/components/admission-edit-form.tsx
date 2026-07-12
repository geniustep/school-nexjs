'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '@/components/states/states';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { localizeStudentGenderOptions } from '@/features/admin/students/utils/student-profile';
import {
  buildEnrollmentClassScope,
  filterClassesForEnrollment,
} from '@/features/admin/students/utils/student-options';
import { StudentCreateStyledSection } from '@/features/admin/students/components/student-create-section-header';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  EnrollmentIntakeAcademicFields,
  EnrollmentIntakeAdmissionExtrasFields,
  EnrollmentIntakeFollowUpFields,
  EnrollmentIntakeIdentityFields,
  EnrollmentIntakeSiblingsFields,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import {
  intakeFromAdmissionForm,
  patchAdmissionFormFromIntake,
} from '@/features/admin/enrollment-intake/mappers';
import type { EnrollmentIntakePatch } from '@/features/admin/enrollment-intake/types';
import {
  AdmissionGuardiansSection,
  validateGuardiansDraft,
  type GuardianDraft,
} from '@/features/admin/admissions/guardians';
import { syncLegacyGuardianFieldsFromDrafts } from '../utils/admission-create-payload';
import { hasFamilyBatchLink } from '../utils/family-admission-visibility';
import { patchAdmission } from '../api/admissions-api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import {
  admissionOptionId,
  filterAdmissionCyclesByLevels,
  filterLevelsByCycle,
  filterStreamsByLevel,
  findAdmissionLevel,
} from '../utils/admission-options';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import {
  admissionDetailToEditForm,
  buildPatchAdmissionPayload,
  mergeSelectedAcademicYear,
  mergeSelectedAdmissionCycle,
  mergeSelectedAdmissionLevel,
  mergeSelectedClassOption,
  resolveRefDisplayName,
  type AdmissionEditFormState,
} from '../utils/admission-edit-payload';
import { validateSiblingLinesLinkedStudents } from '../utils/sibling-lines';
import type { AdmissionDetail } from '@/types/admission';
import '@/features/admin/students/student-360.css';

function patchEditFormFromIntake(
  patch: EnrollmentIntakePatch,
): Partial<AdmissionEditFormState> {
  return patchAdmissionFormFromIntake(patch) as Partial<AdmissionEditFormState>;
}

export function AdmissionEditForm({
  detail,
  onSaved,
  onCancel,
}: {
  detail: AdmissionDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { activeSchoolId } = useAdminSession();
  const studentOptionsState = useStudentOptions();
  const admissionOptionsState = useAdmissionOptions();
  const admissionOptions = admissionOptionsState.options;

  const academicYears = admissionOptions?.academic_years ?? [];
  const cycles = admissionOptions?.cycles ?? [];
  const allLevels = admissionOptions?.levels ?? [];
  const allStreams = admissionOptions?.streams ?? [];
  const optionsReady = !admissionOptionsState.loading && !studentOptionsState.loading;
  const [form, setForm] = useState<AdmissionEditFormState | null>(null);
  const [baselineForm, setBaselineForm] = useState<AdmissionEditFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!optionsReady) return;
    const next = admissionDetailToEditForm(detail, allLevels);
    setForm(next);
    setBaselineForm(next);
    setError(null);
  }, [optionsReady, detail.id, detail, allLevels]);

  const selectedYearId = form?.academic_year_id;
  const selectedLevelId = form?.requested_level_id;
  const selectedClassId = form?.requested_class_id;
  const selectedCycleCode = form?.requested_cycle_code ?? '';

  const academicYearsWithSelected = useMemo(
    () =>
      mergeSelectedAcademicYear(
        academicYears,
        selectedYearId,
        resolveRefDisplayName(detail.academic_year),
      ),
    [academicYears, selectedYearId, detail.academic_year],
  );

  const cyclesWithSelected = useMemo(
    () => mergeSelectedAdmissionCycle(cycles, selectedCycleCode),
    [cycles, selectedCycleCode],
  );

  const levelsForCycleFilter = useMemo(
    () =>
      mergeSelectedAdmissionLevel(
        allLevels,
        selectedLevelId,
        resolveRefDisplayName(detail.requested_level),
        selectedCycleCode,
      ),
    [allLevels, selectedLevelId, selectedCycleCode, detail.requested_level],
  );

  const filteredCycles = useMemo(
    () => filterAdmissionCyclesByLevels(cyclesWithSelected, levelsForCycleFilter),
    [cyclesWithSelected, levelsForCycleFilter],
  );

  const filteredLevels = useMemo(() => {
    const scoped = filterLevelsByCycle(allLevels, selectedCycleCode);
    return mergeSelectedAdmissionLevel(
      scoped,
      selectedLevelId,
      resolveRefDisplayName(detail.requested_level),
      selectedCycleCode,
    );
  }, [allLevels, selectedCycleCode, selectedLevelId, detail.requested_level]);

  const selectedLevel = useMemo(
    () => findAdmissionLevel(allLevels, selectedLevelId),
    [allLevels, selectedLevelId],
  );

  const showStreamField = Boolean(selectedLevel?.requires_stream);
  const filteredStreams = useMemo(
    () => filterStreamsByLevel(allStreams, selectedLevelId),
    [allStreams, selectedLevelId],
  );

  const enrollmentClassScope = useMemo(
    () =>
      buildEnrollmentClassScope(
        selectedLevelId != null ? String(selectedLevelId) : '',
        selectedYearId != null ? String(selectedYearId) : '',
        activeSchoolId,
      ),
    [selectedLevelId, selectedYearId, activeSchoolId],
  );

  const filteredClasses = useMemo(() => {
    const scoped = filterClassesForEnrollment(
      studentOptionsState.options?.classes ?? [],
      enrollmentClassScope,
    );
    return mergeSelectedClassOption(
      scoped,
      selectedClassId,
      resolveRefDisplayName(detail.requested_class),
    );
  }, [
    studentOptionsState.options?.classes,
    enrollmentClassScope,
    selectedClassId,
    detail.requested_class,
  ]);

  const intakeValues = useMemo(
    () => (form ? intakeFromAdmissionForm(form) : null),
    [form],
  );
  const genders = useMemo(
    () => localizeStudentGenderOptions(studentOptionsState.options?.genders ?? [], t),
    [studentOptionsState.options?.genders, t],
  );

  const lookupError =
    studentOptionsState.error?.message ?? admissionOptionsState.error?.message ?? null;

  const relationshipLoadFailed =
    !admissionOptionsState.loading &&
    (admissionOptionsState.error != null ||
      (admissionOptionsState.options != null &&
        admissionOptionsState.options.relationships.length === 0));

  function handleIntakePatch(patch: EnrollmentIntakePatch) {
    setForm((prev) => (prev ? { ...prev, ...patchEditFormFromIntake(patch) } : prev));
  }

  function handleGuardiansChange(next: GuardianDraft[]) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            guardians: next,
            ...syncLegacyGuardianFieldsFromDrafts(next),
          }
        : prev,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || !form) return;

    if (!hasFamilyBatchLink(detail)) {
      const guardiansError = validateGuardiansDraft(form.guardians, { mode: 'individual' });
      if (guardiansError) {
        setError(t(guardiansError.messageKey));
        return;
      }
    }

    if (!hasFamilyBatchLink(detail) && form.has_siblings) {
      const siblingError = validateSiblingLinesLinkedStudents(form.sibling_lines, t);
      if (siblingError) {
        setError(siblingError);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const payload = buildPatchAdmissionPayload(form, allLevels, baselineForm ?? undefined);
    if (Object.keys(payload).length === 0) {
      setSubmitting(false);
      setError(t('admin.admissions.edit.noChanges'));
      return;
    }
    const res = await patchAdmission(detail.id, payload, { active_school_id: activeSchoolId });
    setSubmitting(false);

    if (res.success) {
      onSaved();
      return;
    }

    setError(admissionApiErrorMessage(res.error, t));
  }

  if (!optionsReady || !form || !intakeValues) {
    return <LoadingState label={t('common.loading')} />;
  }

  return (
    <form
      className="student-create-form admissions-edit-form"
      onSubmit={handleSubmit}
      lang={locale}
      data-testid="admission-edit-form"
    >
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
          intakeContext="admissionEdit"
        />
        <EnrollmentIntakeAdmissionExtrasFields values={intakeValues} onPatch={handleIntakePatch} />
      </StudentCreateStyledSection>

      {hasFamilyBatchLink(detail) ? null : (
        <StudentCreateStyledSection
          icon="siblings"
          title={t('admin.siblings.sectionTitle')}
          lead={t('admin.admissions.create.siblingsSectionLead')}
          className="student-create-form__section--siblings"
        >
          <EnrollmentIntakeSiblingsFields values={intakeValues} onPatch={handleIntakePatch} />
        </StudentCreateStyledSection>
      )}

      <StudentCreateStyledSection
        icon="enrollment"
        title={t('admin.admissions.create.studySection')}
        lead={t('admin.admissions.create.studySectionLead')}
        className="student-create-form__section--enrollment"
      >
        <EnrollmentIntakeAcademicFields
          values={intakeValues}
          onPatch={handleIntakePatch}
          intakeContext="admissionEdit"
          academic={{
            cycleMode: 'code',
            years: academicYearsWithSelected,
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
      </StudentCreateStyledSection>

      <StudentCreateStyledSection
        icon="guardian"
        title={t('admin.admissions.guardians.sectionTitle')}
        lead={
          hasFamilyBatchLink(detail)
            ? t('admin.admissions.family.guardiansEdit.useFamilyEditor')
            : t('admin.admissions.guardians.sectionLead')
        }
        className="student-create-form__section--guardian"
      >
        {hasFamilyBatchLink(detail) ? null : (
          <AdmissionGuardiansSection
            mode="individual"
            guardians={form.guardians}
            onChange={handleGuardiansChange}
            relationships={admissionOptionsState.options?.relationships ?? []}
            relationshipsLoading={admissionOptionsState.loading}
            relationshipLoadFailed={relationshipLoadFailed}
            warnings={detail.warning_details ?? null}
          />
        )}
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
          intakeContext="admissionEdit"
          followUp={{
            sources: (admissionOptionsState.options?.sources ?? []).map((s) => ({
              id: admissionOptionId(s) ?? undefined,
              label: s.label,
            })),
            sourcesLoading: admissionOptionsState.loading,
          }}
        />
      </StudentCreateStyledSection>

      <div className="student-create-form__actions admissions-edit-form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" disabled={submitting} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
