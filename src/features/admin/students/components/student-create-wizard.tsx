'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionRegistrationContext } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import { useAdmissionOptions } from '@/features/admin/admissions/hooks/use-admission-options';
import {
  filterStreamsByLevel,
  findAdmissionLevel,
} from '@/features/admin/admissions/utils/admission-options';
import {
  EnrollmentIntakeAcademicFields,
  EnrollmentIntakeAdmissionExtrasFields,
  EnrollmentIntakeIdentityFields,
  EnrollmentIntakeRegistrationFields,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import {
  intakeErrorsFromStudentProfile,
  intakeFromStudentProfile,
  patchStudentProfileFromIntake,
} from '@/features/admin/enrollment-intake/mappers';
import type { EnrollmentIntakePatch } from '@/features/admin/enrollment-intake/types';
import { endpoints } from '@/lib/api/endpoints';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useStudentOptions } from '../hooks/use-student-options';
import { useFeePlanSuggest } from '../hooks/use-fee-plan-suggest';
import { useEnrollmentPlanPreview } from '../hooks/use-enrollment-plan-preview';
import { useStudentCreateIdentifierChecks } from '../hooks/use-student-create-identifier-checks';
import { mapStudentApiError } from '../utils/student-api-errors';
import {
  filterClassesForEnrollment,
  buildEnrollmentClassScope,
  isEnrollmentClassIdInScope,
} from '../utils/student-options';
import {
  buildEnrollmentCycleOptions,
  filterLevelsByCycleId,
  levelBelongsToCycle,
  resolveStudentLevelCycleId,
  buildReferenceLevelCycleMap,
} from '../utils/student-enrollment-cycle';
import {
  buildStudentCreatePayload,
  defaultStudentProfileFormState,
  getStudentCreateFinanceBlockReason,
  localizeStudentGenderOptions,
  resolveDefaultAcademicYearId,
  resolveDefaultNationalityId,
  syncActualJoinDateFromAdmission,
  todayIsoDate,
  validateStudentCreateEnrollmentClass,
  validateStudentCreateForm,
  validateStudentCreateIdentityStep,
  type StudentProfileFieldErrors,
  type StudentProfileFormState,
} from '../utils/student-profile';
import {
  buildFeePlanSuggestQuery,
  canSkipFinanceOnCreate,
  defaultStudentCreateFinanceFormState,
  financePlanFingerprint,
  mergeFinanceStateWithSuggest,
  resolveNoDefaultFeePlanMessage,
} from '../utils/student-enrollment-finance';
import { validateEnrollmentFinanceSave } from '../utils/enrollment-finance-review';
import {
  canOfferFinanceAgreementActivation,
  resolveStudentCreateAgreementState,
  type StudentCreateFinanceActivationMode,
} from '../utils/student-create-finance-activation';
import { resolveStudentCreateFinanceStepGate } from '../utils/student-create-finance-skip';
import {
  resolveStudentCreateIdentifierCheckErrors,
  validateStudentCreateIdentifierDuplicateChecks,
} from '../utils/student-identifier-check';
import { StudentCreatePrefillBanner } from './student-create-prefill-banner';
import { StudentCreatePageHeader } from './student-create-page-header';
import { StudentCreateStepper } from './student-create-stepper';
import { StudentCreateStyledSection } from './student-create-section-header';
import { StudentCreateBillingStep } from './student-create-billing-step';
import { linkExistingPersonAsGuardian } from '../utils/guardian-link-person';
import type { PersonSearchResult, RelationshipType } from '@/types/student-360';
import { StudentCreateFeePlanSection } from './student-create-fee-plan-section';
import { StudentCreateReviewSection } from './student-create-review-section';
import type {
  StudentCreateBillingFormState,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';

export type StudentCreateSaveMode = 'setup' | 'list';

export interface StudentCreateSaveOutcome {
  financeActivation?: 'draft' | 'activate';
  agreementState?: string | null;
}
export type StudentCreateWizardStep = 'identity' | 'billing' | 'enrollment' | 'finance' | 'review';

const STEP_ORDER: StudentCreateWizardStep[] = [
  'identity',
  'billing',
  'enrollment',
  'finance',
  'review',
];

const FIELD_ORDER: (keyof StudentProfileFieldErrors)[] = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'massarCode',
  'academicYearId',
  'cycleId',
  'levelId',
  'classId',
  'actualJoinDate',
  'previousSchool',
  'schoolNumber',
  'code',
];

function stepIndex(step: StudentCreateWizardStep): number {
  return STEP_ORDER.indexOf(step);
}

export function StudentCreateForm({
  onSaved,
  onCancel,
  initialProfilePatch,
  admissionBanner,
}: {
  onSaved: (id: number, mode: StudentCreateSaveMode, outcome?: StudentCreateSaveOutcome) => void;
  onCancel: () => void;
  initialProfilePatch?: Partial<StudentProfileFormState> | null;
  admissionBanner?: AdmissionRegistrationContext | null;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const optionsState = useStudentOptions();
  const admissionOptionsState = useAdmissionOptions();
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const options = optionsState.options;
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<StudentCreateWizardStep>('identity');
  const [state, setState] = useState<StudentProfileFormState>(() =>
    defaultStudentProfileFormState(null),
  );
  const [billingState, setBillingState] = useState<StudentCreateBillingFormState>({
    billingPartnerType: 'guardian',
    guardianSourceMode: 'new',
    linkedGuardianPartnerId: null,
  });
  const [financeState, setFinanceState] = useState<StudentCreateFinanceFormState>(
    defaultStudentCreateFinanceFormState(null),
  );
  const [fieldErrors, setFieldErrors] = useState<StudentProfileFieldErrors>({});
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<StudentCreateSaveMode>('setup');
  const [financeActivationMode, setFinanceActivationMode] =
    useState<StudentCreateFinanceActivationMode>('draft');
  const [classClearedNotice, setClassClearedNotice] = useState(false);
  const [cycleChangedNotice, setCycleChangedNotice] = useState(false);
  const [planChangeWarning, setPlanChangeWarning] = useState(false);
  const [skipFinance, setSkipFinance] = useState(false);
  const financeTouchedRef = useRef(false);
  const lastSuggestFingerprintRef = useRef('');
  const lastFeePlanIdRef = useRef<number | null>(null);
  const admissionPrefillHadClassRef = useRef(Boolean(initialProfilePatch?.classId?.trim()));
  const skipGuardianLinkClearRef = useRef(false);

  useEffect(() => {
    if (optionsState.loading) return;
    const base = defaultStudentProfileFormState(options);
    let merged: StudentProfileFormState = initialProfilePatch
      ? { ...base, ...initialProfilePatch }
      : base;

    const defaultNationalityId = resolveDefaultNationalityId(options?.nationalities);
    if (!merged.nationalityId.trim() && defaultNationalityId) {
      merged = { ...merged, nationalityId: defaultNationalityId };
    }

    if (!merged.admissionDate.trim()) {
      merged = { ...merged, admissionDate: todayIsoDate() };
    }

    if (!merged.academicYearId.trim()) {
      merged = {
        ...merged,
        academicYearId: resolveDefaultAcademicYearId(options?.academicYears ?? []),
      };
    }

    if (!merged.actualJoinDate.trim() && merged.admissionDate.trim()) {
      merged = { ...merged, actualJoinDate: merged.admissionDate };
    }

    if (!merged.emergencyRelationship.trim()) {
      merged = { ...merged, emergencyRelationship: 'father' };
    }

    if (merged.levelId && !merged.cycleId && options?.levels?.length) {
      const level = options.levels.find((item) => String(item.id) === merged.levelId);
      const refLevels = levelOptionsState.options?.reference_levels ?? [];
      const cycles = levelOptionsState.options?.cycles ?? [];
      if (level && refLevels.length && cycles.length) {
        const cycleByCode = buildReferenceLevelCycleMap(refLevels);
        const cycleId = resolveStudentLevelCycleId(level, cycleByCode, cycles);
        if (cycleId != null) {
          merged = { ...merged, cycleId: String(cycleId) };
        }
      }
    }

    setState(merged);
  }, [optionsState.loading, options, initialProfilePatch, levelOptionsState.options]);

  const resolvedSchoolId = useMemo(() => {
    const fromState = Number(state.schoolId);
    if (Number.isFinite(fromState) && fromState > 0) return fromState;
    if (activeSchoolId != null) return activeSchoolId;
    if (options?.schools.length === 1) return options.schools[0].id;
    return null;
  }, [state.schoolId, activeSchoolId, options?.schools]);

  const enrollmentClassScope = useMemo(
    () => buildEnrollmentClassScope(state.levelId, state.academicYearId, resolvedSchoolId),
    [state.levelId, state.academicYearId, resolvedSchoolId],
  );

  useEffect(() => {
    if (optionsState.loading || !options?.classes?.length) return;
    const classId = state.classId.trim();
    if (!classId || !state.levelId.trim()) return;

    const inScope = isEnrollmentClassIdInScope(classId, options.classes, enrollmentClassScope);
    if (inScope) return;

    const fromPrefill = admissionPrefillHadClassRef.current;
    admissionPrefillHadClassRef.current = false;

    setState((prev) => ({ ...prev, classId: '' }));
    if (fromPrefill) {
      setFieldErrors((prev) => ({
        ...prev,
        classId: t('admin.student360.create.prefillClassUnavailable'),
      }));
    } else {
      setClassClearedNotice(true);
    }
  }, [
    optionsState.loading,
    options?.classes,
    state.classId,
    state.levelId,
    enrollmentClassScope,
    t,
  ]);

  const levelsForEnrollment = useMemo(() => {
    const levels = options?.levels ?? [];
    const yearId = state.academicYearId.trim();
    if (!yearId) return levels;
    return levels.filter(
      (level) => level.academic_year_id == null || String(level.academic_year_id) === yearId,
    );
  }, [options?.levels, state.academicYearId]);

  const enrollmentCycles = useMemo(
    () =>
      buildEnrollmentCycleOptions(
        levelsForEnrollment,
        levelOptionsState.options?.reference_levels ?? [],
        levelOptionsState.options?.cycles ?? [],
      ),
    [levelsForEnrollment, levelOptionsState.options],
  );

  const filteredLevels = useMemo(
    () =>
      filterLevelsByCycleId(
        levelsForEnrollment,
        state.cycleId,
        levelOptionsState.options?.reference_levels ?? [],
        levelOptionsState.options?.cycles ?? [],
      ),
    [levelsForEnrollment, state.cycleId, levelOptionsState.options],
  );

  const intakeValues = useMemo(() => intakeFromStudentProfile(state), [state]);

  const suggestQuery = useMemo(
    () => buildFeePlanSuggestQuery(state, resolvedSchoolId, financeState.selectedFeePlanId),
    [state, resolvedSchoolId, financeState.selectedFeePlanId],
  );
  const suggestState = useFeePlanSuggest(suggestQuery);
  const suggestFingerprint = financePlanFingerprint(suggestQuery);
  const previewState = useEnrollmentPlanPreview({
    enabled: step === 'finance' || step === 'review',
    query: suggestQuery,
    profileState: state,
    schoolId: resolvedSchoolId,
    suggest: suggestState.suggest,
    financeState,
    t,
  });
  const identifierChecksState = useStudentCreateIdentifierChecks({
    massarCode: state.massarCode,
    schoolNumber: state.schoolNumber,
    code: state.code,
    schoolId: resolvedSchoolId,
  });
  const levelSelected = Boolean(state.levelId.trim());

  useEffect(() => {
    if (!suggestFingerprint) {
      lastSuggestFingerprintRef.current = '';
      setPlanChangeWarning(false);
      setFinanceState(defaultStudentCreateFinanceFormState(null));
      return;
    }
    if (!suggestState.suggest) return;

    const planChanged =
      lastFeePlanIdRef.current != null &&
      lastFeePlanIdRef.current !== suggestState.suggest.fee_plan_id;

    const fingerprintChanged =
      lastSuggestFingerprintRef.current !== '' &&
      lastSuggestFingerprintRef.current !== suggestFingerprint;

    if (fingerprintChanged && financeTouchedRef.current) {
      setPlanChangeWarning(true);
      financeTouchedRef.current = false;
    }

    if (fingerprintChanged || lastSuggestFingerprintRef.current === '' || planChanged) {
      setFinanceState((prev) =>
        mergeFinanceStateWithSuggest(
          prev,
          suggestState.suggest,
          fingerprintChanged || planChanged,
        ),
      );
    }

    lastSuggestFingerprintRef.current = suggestFingerprint;
    lastFeePlanIdRef.current = suggestState.suggest.fee_plan_id;
  }, [suggestFingerprint, suggestState.suggest]);

  const filteredClasses = useMemo(
    () => filterClassesForEnrollment(options?.classes ?? [], enrollmentClassScope),
    [options?.classes, enrollmentClassScope],
  );

  const admissionLevels = admissionOptionsState.options?.levels ?? [];
  const admissionStreams = admissionOptionsState.options?.streams ?? [];

  const selectedAdmissionLevel = useMemo(
    () => findAdmissionLevel(admissionLevels, state.levelId ? Number(state.levelId) : undefined),
    [admissionLevels, state.levelId],
  );

  const showStreamField = Boolean(selectedAdmissionLevel?.requires_stream);

  const filteredStreams = useMemo(
    () => filterStreamsByLevel(admissionStreams, state.levelId ? Number(state.levelId) : undefined),
    [admissionStreams, state.levelId],
  );

  const intakeCycles = useMemo(
    () =>
      enrollmentCycles.map((cycle) => ({
        mode: 'id' as const,
        id: cycle.id,
        name: cycle.name,
      })),
    [enrollmentCycles],
  );

  const localizedGenders = useMemo(
    () => localizeStudentGenderOptions(options?.genders ?? [], t),
    [options?.genders, t],
  );

  const relationshipLoadFailed =
    !admissionOptionsState.loading &&
    (admissionOptionsState.error != null ||
      (admissionOptionsState.options != null &&
        admissionOptionsState.options.relationships.length === 0));

  function finishGuardianLinkState(intakePatch: EnrollmentIntakePatch) {
    const touchesGuardianContact =
      intakePatch.guardianName != null ||
      intakePatch.guardianPhone != null ||
      intakePatch.guardianEmail != null;

    if (touchesGuardianContact && !skipGuardianLinkClearRef.current) {
      setBillingState((prev) =>
        prev.linkedGuardianPartnerId != null ? { ...prev, linkedGuardianPartnerId: null } : prev,
      );
    }
    skipGuardianLinkClearRef.current = false;
  }

  function handleIntakePatch(intakePatch: EnrollmentIntakePatch) {
    if (intakePatch.cycleId != null && intakePatch.cycleId !== state.cycleId) {
      handleCycleChange(intakePatch.cycleId);
      const profilePatch = patchStudentProfileFromIntake(intakePatch);
      const { cycleId: _cycleId, levelId: _levelId, streamId: _streamId, classId: _classId, ...rest } =
        profilePatch;
      if (Object.keys(rest).length > 0) patch(rest);
      finishGuardianLinkState(intakePatch);
      return;
    }

    if (intakePatch.academicYearId != null && intakePatch.academicYearId !== state.academicYearId) {
      handleAcademicYearChange(intakePatch.academicYearId);
      const profilePatch = patchStudentProfileFromIntake(intakePatch);
      const {
        academicYearId: _academicYearId,
        cycleId: _cycleId,
        levelId: _levelId,
        streamId: _streamId,
        classId: _classId,
        ...rest
      } = profilePatch;
      if (Object.keys(rest).length > 0) patch(rest);
      finishGuardianLinkState(intakePatch);
      return;
    }

    if (intakePatch.levelId != null && intakePatch.levelId !== state.levelId) {
      handleLevelChange(intakePatch.levelId);
      const profilePatch = patchStudentProfileFromIntake(intakePatch);
      const { levelId: _levelId, streamId: _streamId, classId: _classId, ...rest } = profilePatch;
      if (Object.keys(rest).length > 0) patch(rest);
      finishGuardianLinkState(intakePatch);
      return;
    }

    const profilePatch = patchStudentProfileFromIntake(intakePatch);
    const syncedJoinDate =
      intakePatch.admissionDate != null
        ? syncActualJoinDateFromAdmission(
            intakePatch.admissionDate,
            state.admissionDate,
            state.actualJoinDate,
          )
        : undefined;
    patch(
      syncedJoinDate != null ? { ...profilePatch, actualJoinDate: syncedJoinDate } : profilePatch,
    );
    finishGuardianLinkState(intakePatch);
  }

  function clearGuardianIntakeFields() {
    skipGuardianLinkClearRef.current = true;
    patch(
      patchStudentProfileFromIntake({
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
      }),
    );
    skipGuardianLinkClearRef.current = false;
  }

  function handleLinkExistingGuardian(person: PersonSearchResult) {
    skipGuardianLinkClearRef.current = true;
    setBillingState((prev) => ({
      ...prev,
      guardianSourceMode: 'existing',
      linkedGuardianPartnerId: person.partner_id,
    }));
    patch(
      patchStudentProfileFromIntake({
        guardianName: person.name,
        guardianPhone: person.phone ?? '',
        guardianEmail: person.email ?? '',
      }),
    );
    skipGuardianLinkClearRef.current = false;
  }

  function handleClearLinkedGuardian() {
    setBillingState((prev) => ({ ...prev, linkedGuardianPartnerId: null }));
    clearGuardianIntakeFields();
  }

  function handleGuardianSourceModeChange(mode: StudentCreateBillingFormState['guardianSourceMode']) {
    if (mode === 'existing') {
      clearGuardianIntakeFields();
    }
    setBillingState((prev) => ({
      ...prev,
      guardianSourceMode: mode,
      linkedGuardianPartnerId: null,
    }));
  }

  const financeBlocked =
    suggestState.error?.code === 'no_default_fee_plan_for_level' &&
    !canSkipFinanceOnCreate(suggestState.error, suggestState.suggest?.allowed_actions);

  function patch(next: Partial<StudentProfileFormState>) {
    setState((prev) => ({ ...prev, ...next }));
    setFieldErrors({});
    setClassClearedNotice(false);
    setCycleChangedNotice(false);
  }

  function patchFinance(next: Partial<StudentCreateFinanceFormState>) {
    financeTouchedRef.current = true;
    setFinanceState((prev) => ({ ...prev, ...next }));
    setFinanceError(null);
  }

  function handleSelectFeePlan(planId: number) {
    const currentId = financeState.selectedFeePlanId ?? suggestState.suggest?.fee_plan_id;
    if (planId === currentId) return;
    financeTouchedRef.current = true;
    setPlanChangeWarning(false);
    setFinanceState((prev) => ({
      ...prev,
      selectedFeePlanId: planId,
      customizePlan: false,
      customizationReason: '',
      customizationNotes: '',
    }));
  }

  function resetFinancePlan() {
    lastSuggestFingerprintRef.current = '';
    setPlanChangeWarning(false);
    financeTouchedRef.current = false;
    setFinanceState(defaultStudentCreateFinanceFormState(null));
  }

  function handleCycleChange(cycleId: string) {
    const cycleChanged = Boolean(state.cycleId) && state.cycleId !== cycleId;
    const hadCustomization = financeTouchedRef.current || financeState.customizePlan;

    patch({
      cycleId,
      levelId: '',
      streamId: '',
      classId: '',
    });
    resetFinancePlan();

    if (cycleChanged && hadCustomization) {
      setCycleChangedNotice(true);
    }
  }

  function handleLevelChange(levelId: string) {
    const scope = buildEnrollmentClassScope(levelId, state.academicYearId, resolvedSchoolId);
    const compatible = filterClassesForEnrollment(options?.classes ?? [], scope);
    const classStillValid = compatible.some((c) => String(c.id) === state.classId);
    const levelChanged = Boolean(state.levelId) && state.levelId !== levelId;
    const hadCustomization = financeTouchedRef.current || financeState.customizePlan;

    patch({
      levelId,
      streamId: '',
      classId: classStillValid ? state.classId : '',
    });

    if (state.classId && !classStillValid) {
      setClassClearedNotice(true);
    }

    if (levelChanged) {
      resetFinancePlan();
      if (hadCustomization) {
        setPlanChangeWarning(true);
      }
    }
  }

  function handleAcademicYearChange(academicYearId: string) {
    const yearChanged = Boolean(state.academicYearId) && state.academicYearId !== academicYearId;
    const levelsAfterYear = (options?.levels ?? []).filter(
      (level) => level.academic_year_id == null || String(level.academic_year_id) === academicYearId,
    );
    const levelStillValid = levelsAfterYear.some((level) => String(level.id) === state.levelId);
    let nextClassId = '';
    if (levelStillValid && state.classId) {
      const scope = buildEnrollmentClassScope(state.levelId, academicYearId, resolvedSchoolId);
      const compatible = filterClassesForEnrollment(options?.classes ?? [], scope);
      nextClassId = compatible.some((c) => String(c.id) === state.classId) ? state.classId : '';
    }

    patch({
      academicYearId,
      cycleId: levelStillValid ? state.cycleId : '',
      levelId: levelStillValid ? state.levelId : '',
      streamId: '',
      classId: nextClassId,
    });

    if (state.classId && !nextClassId) {
      setClassClearedNotice(true);
    }

    if (yearChanged) {
      resetFinancePlan();
    }
  }

  function applyEnrollmentClassScopeFailure(context: 'save' | 'step'): boolean {
    const validation = validateStudentCreateEnrollmentClass(
      state,
      options?.classes ?? [],
      resolvedSchoolId,
      t,
    );
    if (validation.valid) return true;

    setFieldErrors((prev) => ({ ...prev, ...validation.errors }));
    setStep('enrollment');
    if (context === 'save') {
      toast.error(validation.errors.classId ?? t('admin.studentClassForbidden'));
    }
    focusFirstError(validation.errors);
    return false;
  }

  useEffect(() => {
    if (!state.cycleId || !state.levelId) return;
    const levels = options?.levels ?? [];
    const referenceLevels = levelOptionsState.options?.reference_levels ?? [];
    const cycles = levelOptionsState.options?.cycles ?? [];
    if (!levelBelongsToCycle(state.levelId, state.cycleId, levels, referenceLevels, cycles)) {
      setState((prev) => ({ ...prev, levelId: '', classId: '' }));
      resetFinancePlan();
    }
  }, [state.cycleId, state.levelId, options?.levels, levelOptionsState.options]);

  function resolveIdentifierCheckFieldErrors(
    checks = identifierChecksState.checks,
  ): StudentProfileFieldErrors {
    return resolveStudentCreateIdentifierCheckErrors(checks, t);
  }

  function applyIdentifierDuplicateValidation(
    current: StudentCreateWizardStep,
    checks = identifierChecksState.checks,
  ): boolean {
    const result = validateStudentCreateIdentifierDuplicateChecks({
      checks,
      massarCode: state.massarCode,
      schoolNumber: state.schoolNumber,
      code: state.code,
      t,
      current,
    });
    if (result.valid) return true;

    setFieldErrors((prev) => ({ ...prev, ...result.errors }));
    toast.error(result.toastMessage);
    if (result.focusIdentity && current !== 'identity') setStep('identity');
    focusFirstError(result.errors);
    return false;
  }

  function validateIdentifierDuplicateChecks(
    current: StudentCreateWizardStep,
    checks = identifierChecksState.checks,
  ): boolean {
    return applyIdentifierDuplicateValidation(current, checks);
  }

  function identityFieldHints() {
    const { checks } = identifierChecksState;
    return {
      massarCode:
        checks.massarCode.status === 'checking'
          ? t('admin.student360.create.errors.checkingMassar')
          : undefined,
      schoolNumber:
        checks.schoolNumber.status === 'checking'
          ? t('admin.student360.create.errors.checkingSchoolNumber')
          : undefined,
      code:
        checks.code.status === 'checking'
          ? t('admin.student360.create.errors.checkingCode')
          : undefined,
    };
  }

  const displayFieldErrors = {
    ...fieldErrors,
    ...resolveIdentifierCheckFieldErrors(),
  };

  const intakeFieldErrors = useMemo(
    () => intakeErrorsFromStudentProfile(displayFieldErrors),
    [displayFieldErrors],
  );

  function focusFirstError(errors: StudentProfileFieldErrors) {
    const firstKey = FIELD_ORDER.find((key) => errors[key]);
    if (!firstKey || !formRef.current) return;
    const el = formRef.current.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function financePrerequisiteMessage(
    reason: ReturnType<typeof getStudentCreateFinanceBlockReason>,
    context: 'step' | 'save',
  ): string | null {
    if (reason === 'ok') return null;
    if (reason === 'academic_year') {
      return t('admin.student360.create.errors.academicYearRequiredForFinance');
    }
    if (reason === 'class') {
      return context === 'save'
        ? t('admin.student360.create.errors.classRequiredForFinanceSave')
        : t('admin.student360.create.errors.classRequiredBeforeFinance');
    }
    if (reason === 'level') return t('admin.student360.create.errors.levelRequired');
    if (reason === 'join_date') return t('admin.student360.errors.invalidEnrollmentDate');
    return t('admin.student360.create.errors.academicYearRequiredForFinance');
  }

  function applyFinancePrerequisiteFailure(
    reason: ReturnType<typeof getStudentCreateFinanceBlockReason>,
    context: 'step' | 'save',
  ): boolean {
    const message = financePrerequisiteMessage(reason, context);
    if (!message) return true;
    const fieldErrors: StudentProfileFieldErrors =
      reason === 'class'
        ? { classId: message }
        : reason === 'academic_year'
          ? { academicYearId: message }
          : reason === 'level'
            ? { levelId: message }
            : reason === 'join_date'
              ? { actualJoinDate: message }
              : { academicYearId: message };
    setFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
    toast.error(message);
    setStep('enrollment');
    focusFirstError(fieldErrors);
    return false;
  }

  function financeSaveValidationMessage(
    reason: ReturnType<typeof validateEnrollmentFinanceSave>,
  ): string | null {
    if (reason === 'ok') return null;
    if (reason === 'reason_required') return t('admin.student360.create.finance.reasonRequired');
    if (reason === 'academic_year_required') {
      return t('admin.student360.create.errors.academicYearRequiredForFinance');
    }
    if (reason === 'periods_required') {
      return t('admin.student360.create.finance.errors.billingPeriodsRequired');
    }
    return t('admin.student360.create.review.reviewFinanceBeforeSave');
  }

  function validateFinanceStep(): boolean {
    const saveCheck = validateEnrollmentFinanceSave({
      customizePlan: financeState.customizePlan,
      customizationReason: financeState.customizationReason,
      previewLoading: previewState.loading,
      previewError: previewState.error,
      preview: previewState.preview,
      academicYearId: state.academicYearId,
      hasFinanceBlock: Boolean(suggestState.suggest),
      suggest: suggestState.suggest,
      financeState,
    });
    const message = financeSaveValidationMessage(saveCheck);
    if (message) {
      setFinanceError(message);
      toast.error(message);
      if (saveCheck === 'academic_year_required') {
        setStep('enrollment');
        focusFirstError({ academicYearId: message });
      }
      return false;
    }
    return true;
  }

  function validateStep(
    current: StudentCreateWizardStep,
    identifierChecks = identifierChecksState.checks,
  ): boolean {
    if (!validateIdentifierDuplicateChecks(current, identifierChecks)) {
      return false;
    }

    if (current === 'identity') {
      const validation = validateStudentCreateIdentityStep(state, t);
      if (!validation.valid) {
        setFieldErrors(validation.errors);
        const firstError = FIELD_ORDER.map((key) => validation.errors[key]).find(Boolean);
        toast.error(firstError ?? t('errors.validationFailed'));
        focusFirstError(validation.errors);
        return false;
      }
    }
    if (current === 'enrollment') {
      const validation = validateStudentCreateForm(state, t);
      if (!validation.valid) {
        setFieldErrors(validation.errors);
        const firstError = FIELD_ORDER.map((key) => validation.errors[key]).find(Boolean);
        toast.error(firstError ?? t('errors.validationFailed'));
        focusFirstError(validation.errors);
        return false;
      }
      if (state.levelId.trim()) {
        const classReason = getStudentCreateFinanceBlockReason(state, resolvedSchoolId);
        if (classReason === 'class') {
          return applyFinancePrerequisiteFailure('class', 'step');
        }
      }
      if (state.classId.trim() && !applyEnrollmentClassScopeFailure('step')) {
        return false;
      }
    }
    if (current === 'finance' || current === 'review') {
      if (current === 'review') {
        const profileValidation = validateStudentCreateForm(state, t);
        if (!profileValidation.valid) {
          setFieldErrors(profileValidation.errors);
          const firstError = FIELD_ORDER.map((key) => profileValidation.errors[key]).find(Boolean);
          toast.error(firstError ?? t('errors.validationFailed'));
          focusFirstError(profileValidation.errors);
          return false;
        }
        if (state.classId.trim() && !applyEnrollmentClassScopeFailure('save')) {
          return false;
        }
      }
      const gate = resolveStudentCreateFinanceStepGate({
        skipFinance,
        levelSelected,
        suggestLoading: suggestState.loading,
        financeBlocked,
        suggest: suggestState.suggest,
        prerequisiteReason: getStudentCreateFinanceBlockReason(state, resolvedSchoolId),
      });
      if (gate.status === 'skip') {
        setFinanceError(null);
        return true;
      }
      if (gate.status === 'prerequisite') {
        return applyFinancePrerequisiteFailure(gate.prerequisiteReason ?? 'class', 'step');
      }
      if (gate.status === 'select_level') {
        toast.error(t('admin.student360.create.finance.selectLevelForPlan'));
        return false;
      }
      if (gate.status === 'loading') {
        toast.error(t('admin.student360.create.finance.loading'));
        return false;
      }
      if (gate.status === 'blocked') {
        const message = resolveNoDefaultFeePlanMessage(suggestState.error, t);
        setFinanceError(message);
        toast.error(message);
        return false;
      }
      if (gate.status === 'no_plan') {
        toast.error(t('admin.student360.create.finance.required'));
        return false;
      }
      if (!validateFinanceStep()) return false;
    }
    setFinanceError(null);
    return true;
  }

  async function goNext() {
    const current = step;
    const flushed = await identifierChecksState.flushChecks();
    if (!applyIdentifierDuplicateValidation(current, flushed.checks)) {
      return;
    }
    if (!validateStep(current, flushed.checks)) return;
    const next = STEP_ORDER[stepIndex(current) + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const prev = STEP_ORDER[stepIndex(step) - 1];
    if (prev) setStep(prev);
  }

  async function submit(
    mode: StudentCreateSaveMode,
    activation: StudentCreateFinanceActivationMode = 'draft',
  ) {
    const flushed = await identifierChecksState.flushChecks();
    if (!applyIdentifierDuplicateValidation('review', flushed.checks)) {
      return;
    }
    if (!validateStep('review', flushed.checks)) return;

    if (state.classId.trim() && !applyEnrollmentClassScopeFailure('save')) {
      return;
    }

    const attachFinance = !skipFinance && Boolean(suggestState.suggest);

    if (attachFinance) {
      const financeReason = getStudentCreateFinanceBlockReason(state, resolvedSchoolId);
      if (financeReason !== 'ok') {
        applyFinancePrerequisiteFailure(financeReason, 'save');
        return;
      }
    }

    if (activation === 'activate' && attachFinance) {
      if (
        !canOfferFinanceAgreementActivation({
          suggest: suggestState.suggest,
          financeBlocked,
          state,
          schoolId: resolvedSchoolId,
          financeState,
          previewLoading: previewState.loading,
          previewError: previewState.error,
          preview: previewState.preview,
        })
      ) {
        validateFinanceStep();
        return;
      }
    }

    setSaveMode(mode);
    setFinanceActivationMode(activation);
    setSaving(true);
    const payload = buildStudentCreatePayload(
      state,
      {
        suggest: attachFinance ? suggestState.suggest : null,
        financeState,
        schoolId: resolvedSchoolId,
        activationMode: activation === 'activate' ? 'activate' : undefined,
      },
      {
        schoolId: resolvedSchoolId,
        classes: options?.classes ?? [],
        deferGuardianContact: true,
      },
    );

    if (payload.finance && payload.academic?.academic_year_id == null) {
      applyFinancePrerequisiteFailure('academic_year', 'save');
      setSaving(false);
      return;
    }
    if (payload.finance && payload.academic?.class_id == null) {
      applyFinancePrerequisiteFailure('class', 'save');
      setSaving(false);
      return;
    }
    const res = await api.post(endpoints.admin.students, payload);

    if (res.success && res.data) {
      const data =
        typeof res.data === 'object' && res.data !== null
          ? (res.data as Record<string, unknown>)
          : null;
      const id = data && 'id' in data ? Number(data.id) : 0;

      if (
        id > 0 &&
        billingState.guardianSourceMode === 'existing' &&
        billingState.linkedGuardianPartnerId != null
      ) {
        const relationshipType = (state.emergencyRelationship.trim() || 'father') as RelationshipType;
        const linkRes = await linkExistingPersonAsGuardian(id, {
          partner_id: billingState.linkedGuardianPartnerId,
          relationship_type: relationshipType,
          is_primary_contact: true,
          is_emergency_contact: true,
          is_financial_responsible: billingState.billingPartnerType === 'guardian',
          receives_notifications: true,
        });
        if (!linkRes.success) {
          toast.error(t('admin.student360.create.billing.guardianLinkFailed'));
        }
      }

      setSaving(false);
      const agreementState = resolveStudentCreateAgreementState(
        data as { id?: number; agreement_state?: string; finance?: { agreement_state?: string } },
      );

      if (activation === 'activate' && agreementState === 'active') {
        toast.success(t('admin.student360.create.financeActivation.activateSuccess'));
      } else if (payload.finance && activation === 'draft') {
        toast.success(t('admin.student360.create.financeActivation.draftSuccess'));
      } else {
        toast.success(t('admin.student360.create.success'));
      }

      onSaved(id, mode, {
        financeActivation: payload.finance ? activation : undefined,
        agreementState,
      });
      return;
    }

    setSaving(false);

    if (!res.success) {
      const mapped = mapStudentApiError(res.error, t);
      if (mapped.fieldErrors) {
        setFieldErrors(mapped.fieldErrors);
        focusFirstError(mapped.fieldErrors);
      }
      toast.error(mapped.message);
    }
  }

  const onLastStep = step === 'review';
  const financeBlockReason =
    levelSelected && Boolean(suggestState.suggest)
      ? getStudentCreateFinanceBlockReason(state, resolvedSchoolId)
      : 'ok';
  const financePrerequisitesMissing = financeBlockReason !== 'ok';
  const classMissingForFinance = financeBlockReason === 'class';
  const academicYearMissingForFinance = financeBlockReason === 'academic_year';

  const enrollmentClassLabel = useMemo(() => {
    const cls = filteredClasses.find((c) => String(c.id) === state.classId);
    return cls?.display_name ?? cls?.name ?? null;
  }, [filteredClasses, state.classId]);

  const massarDuplicate =
    identifierChecksState.checks.massarCode.status === 'duplicate' ||
    displayFieldErrors.massarCode === t('admin.student360.errors.duplicateMassar');

  const canActivateFinanceAgreement =
    !skipFinance &&
    canOfferFinanceAgreementActivation({
      suggest: suggestState.suggest,
      financeBlocked,
      state,
      schoolId: resolvedSchoolId,
      financeState,
      previewLoading: previewState.loading,
      previewError: previewState.error,
      preview: previewState.preview,
    });

  const saveDisabled =
    saving ||
    (!skipFinance && (financeBlocked || financePrerequisitesMissing)) ||
    massarDuplicate ||
    identifierChecksState.identifierChecksBlockProgress;

  return (
    <>
      <StudentCreatePageHeader state={state} />
      <form ref={formRef} className="student-create-form" onSubmit={(e) => e.preventDefault()}>
      {admissionBanner ? <StudentCreatePrefillBanner banner={admissionBanner} /> : null}
      <StudentCreateStepper activeStep={step} />

      {step === 'identity' ? (
        <StudentCreateStyledSection
          icon="identity"
          title={t('admin.student360.sections.identity')}
          lead={t('admin.student360.create.identityStepLead')}
          className="student-create-form__section--identity"
        >
          <EnrollmentIntakeIdentityFields
            values={intakeValues}
            errors={intakeFieldErrors}
            fieldHints={identityFieldHints()}
            onPatch={handleIntakePatch}
            optionsLoading={optionsState.loading}
            genders={localizedGenders}
            nationalities={options?.nationalities ?? []}
            variant="studentCreate"
          />
          <EnrollmentIntakeAdmissionExtrasFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            variant="studentCreate"
          />
        </StudentCreateStyledSection>
      ) : null}

      {step === 'billing' ? (
        <StudentCreateBillingStep
          billingState={billingState}
          onBillingChange={(patch) => setBillingState((prev) => ({ ...prev, ...patch }))}
          intakeValues={intakeValues}
          intakeErrors={intakeFieldErrors}
          onIntakePatch={handleIntakePatch}
          onLinkExistingGuardian={handleLinkExistingGuardian}
          onClearLinkedGuardian={handleClearLinkedGuardian}
          onGuardianSourceModeChange={handleGuardianSourceModeChange}
          guardian={{
            relationships: admissionOptionsState.options?.relationships ?? [],
            relationshipsLoading: admissionOptionsState.loading,
            relationshipLoadFailed,
          }}
        />
      ) : null}

      {step === 'enrollment' ? (
        <StudentCreateStyledSection
          icon="enrollment"
          title={t('admin.student360.sections.enrollment')}
          lead={t('admin.student360.create.enrollmentStepLead')}
        >
          {cycleChangedNotice ? (
            <p className="student-create-form__notice" role="status">
              {t('admin.student360.cycleChangedOnEnrollment')}
            </p>
          ) : null}
          {classClearedNotice ? (
            <p className="student-create-form__notice" role="status">
              {t('admin.student360.classClearedOnLevelChange')}
            </p>
          ) : null}
          {state.levelId.trim() && !state.classId.trim() ? (
            <p className="student-create-form__notice" role="status">
              {t('admin.student360.create.errors.classOptionalWithoutFinanceHint')}
            </p>
          ) : null}
          <div className="student-create-enrollment">
          <EnrollmentIntakeAcademicFields
            variant="studentCreate"
            values={intakeValues}
            errors={intakeErrorsFromStudentProfile(fieldErrors)}
            onPatch={handleIntakePatch}
            academic={{
              cycleMode: 'id',
              years: options?.academicYears ?? [],
              cycles: intakeCycles,
              levels: filteredLevels,
              streams: filteredStreams,
              classes: filteredClasses,
              registrationTypes: options?.registrationTypes ?? [],
              levelRequiresStream: showStreamField,
              optionsLoading: optionsState.loading,
              cyclesLoading: levelOptionsState.loading,
              optionsError: !!optionsState.error,
              onRetryOptions: optionsState.reload,
              levelPlaceholder: !state.cycleId.trim()
                ? t('admin.student360.create.selectCycleFirst')
                : levelOptionsState.loading
                  ? t('admin.student360.create.loadingLevels')
                  : filteredLevels.length === 0
                    ? t('admin.student360.create.noLevelsForCycle')
                    : undefined,
              classPlaceholder: !state.levelId.trim()
                ? t('admin.student360.create.selectLevelFirst')
                : optionsState.loading
                  ? t('admin.student360.create.loadingClasses')
                  : filteredClasses.length === 0
                    ? t('admin.student360.create.noClassesForLevel')
                    : undefined,
              streamRequired: showStreamField,
              activeSchoolId: resolvedSchoolId,
              showClassSummary: true,
            }}
          />
          <EnrollmentIntakeRegistrationFields
            variant="studentCreate"
            values={intakeValues}
            errors={intakeErrorsFromStudentProfile(fieldErrors)}
            onPatch={handleIntakePatch}
            registrationTypes={options?.registrationTypes ?? []}
            optionsLoading={optionsState.loading}
          />
          </div>
        </StudentCreateStyledSection>
      ) : null}

      {step === 'finance' ? (
        <div className="student-create-finance-flow">
          {financeError && !skipFinance ? (
            <p className="student-create-form__notice student-create-finance-flow__alert" role="alert">
              {financeError}
            </p>
          ) : null}
          <div className="student-create-finance-skip-card">
            <label className="student-create-form__checkbox">
              <input
                type="checkbox"
                checked={skipFinance}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSkipFinance(checked);
                  if (checked) setFinanceError(null);
                }}
              />
              <span className="student-create-form__checkbox-text">
                <span>{t('admin.student360.create.finance.skipFinanceToggle')}</span>
                <span className="student-create-field__hint">
                  {t('admin.student360.create.finance.skipFinanceHint')}
                </span>
              </span>
            </label>
          </div>
          {skipFinance ? (
            <p className="student-create-form__notice student-create-finance-flow__skipped" role="status">
              {t('admin.student360.create.finance.skipFinanceActive')}
            </p>
          ) : (
            <StudentCreateFeePlanSection
              suggest={suggestState.suggest}
              loading={suggestState.loading}
              error={suggestState.error}
              levelSelected={levelSelected}
              profileState={state}
              schoolId={resolvedSchoolId}
              financeState={financeState}
              planChangeWarning={planChangeWarning}
              preview={previewState.preview}
              previewLoading={previewState.loading}
              previewError={previewState.error}
              onFinanceChange={patchFinance}
              onSelectPlan={handleSelectFeePlan}
              onSkipFinance={() => {
                setSkipFinance(true);
                setFinanceError(null);
              }}
              onRetry={suggestState.reload}
            />
          )}
        </div>
      ) : null}

      {step === 'review' ? (
        <div className="student-create-review-flow-wrap">
          {financeError ? (
            <p className="student-create-form__notice student-create-review-flow-wrap__alert" role="alert">
              {financeError}
            </p>
          ) : null}
          <StudentCreateReviewSection
            profileState={state}
            billingState={billingState}
            suggest={skipFinance ? null : suggestState.suggest}
            financeState={financeState}
            preview={previewState.preview}
            previewLoading={previewState.loading}
            previewError={previewState.error}
            financeBlocked={!skipFinance && financeBlocked}
            financeSkipped={skipFinance}
            massarDuplicate={massarDuplicate}
            classMissingForFinance={!skipFinance && classMissingForFinance}
            enrollmentClassLabel={enrollmentClassLabel}
            schoolId={resolvedSchoolId}
          />
        </div>
      ) : null}

      <div className="student-create-form__actions">
        {stepIndex(step) > 0 ? (
          <button type="button" className="btn btn--ghost" disabled={saving} onClick={goBack}>
            {t('common.back')}
          </button>
        ) : null}

        {!onLastStep ? (
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving || identifierChecksState.identifierChecksBlockProgress}
            onClick={() => void goNext()}
          >
            {t('common.next')}
          </button>
        ) : (
          <>
            {canActivateFinanceAgreement ? (
              <p className="student-create-form__notice student-create-form__finance-activation-hint">
                {t('admin.student360.create.financeActivation.activateHint')}
              </p>
            ) : null}
            {canActivateFinanceAgreement ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={saveDisabled}
                  onClick={() => void submit('setup', 'activate')}
                >
                  {saving && financeActivationMode === 'activate'
                    ? t('admin.student360.create.financeActivation.savingActivate')
                    : t('admin.student360.create.financeActivation.createAndActivate')}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={saveDisabled}
                  onClick={() => void submit('list', 'draft')}
                >
                  {saving && financeActivationMode === 'draft' && saveMode === 'list'
                    ? t('admin.student360.create.saving')
                    : t('admin.student360.create.financeActivation.saveDraft')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={saveDisabled}
                  onClick={() => void submit('setup', 'draft')}
                >
                  {saving && saveMode === 'setup' && financeActivationMode === 'draft'
                    ? t('admin.student360.create.saving')
                    : t('admin.student360.create.saveAndSetup')}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={saveDisabled}
                  onClick={() => void submit('list', 'draft')}
                >
                  {saving && saveMode === 'list' && financeActivationMode === 'draft'
                    ? t('admin.student360.create.saving')
                    : t('admin.student360.create.saveOnly')}
                </button>
              </>
            )}
          </>
        )}

        <button type="button" className="btn btn--ghost" disabled={saving} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
    </>
  );
}
