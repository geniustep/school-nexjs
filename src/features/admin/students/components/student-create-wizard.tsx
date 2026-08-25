'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionRegistrationContext } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import { guardianPrefillTextToProfilePatch } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import {
  parseAdmissionConversionFromCreateResponse,
  type AdmissionConversionSnapshot,
} from '@/features/admin/admissions/utils/admission-atomic-conversion';
import { fetchAdmission } from '@/features/admin/admissions/api/admissions-api';
import { notifyAdmissionsQueriesInvalidated } from '@/features/admin/admissions/utils/admission-list-invalidate';
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
import {
  isOptionalFinanceGateStatus,
  resolveStudentCreateFinanceStepGate,
} from '../utils/student-create-finance-skip';
import {
  resolveStudentCreateIdentifierCheckErrors,
  validateStudentCreateIdentifierDuplicateChecks,
} from '../utils/student-identifier-check';
import { StudentCreatePrefillBanner } from './student-create-prefill-banner';
import { StudentCreatePageHeader } from './student-create-page-header';
import { StudentCreateStepper } from './student-create-stepper';
import { StudentCreateStyledSection } from './student-create-section-header';
import { StudentCreateBillingStep } from './student-create-billing-step';
import type { PersonSearchResult } from '@/types/student-360';
import { StudentCreateFeePlanSection } from './student-create-fee-plan-section';
import { StudentCreateReviewSection } from './student-create-review-section';
import {
  StudentCreateResultSection,
  type StudentCreateResultModel,
} from './student-create-result-section';
import type { BillingResponsibilityMetadata } from '@/types/billing-responsibility';
import {
  defaultStudentCreateBillingFormState,
  parseBillingResponsibilityOutcome,
  validateBillingResponsibilityForm,
  type BillingResponsibilityFieldErrors,
} from '../utils/student-create-billing-responsibility';
import { resolveBillingResponsibilityAutoPatch } from '../utils/student-create-billing-auto-select';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  collectStudentCreateGuardianEntries,
  derivePrimaryStudentCreateGuardianEntry,
  resolvePersonSchoolParentId,
  validateStudentCreateGuardianContract,
} from '../utils/student-create-guardian-payload';
import {
  collectUsedGuardianIds,
  createEmptyAdditionalGuardianEntry,
  entryFromLinkedExistingGuardian,
  isCompleteStudentCreateGuardianEntry,
} from '../utils/student-create-additional-guardians';
import {
  extractGuardianAccountPresentationsFromCreateResponse,
  persistStudentCreateGuardianOnboarding,
} from '../utils/resolve-guardian-account-presentation';
import { resolvePostCreateBillingOutcome } from '../utils/resolve-post-create-billing-outcome';
import {
  canOfferCreateAgreementActivationUi,
  resolveStudentCreateJourneyCapabilities,
  shouldForceSkipFinanceOnCreate,
} from '../utils/student-create-journey-rbac';
import type {
  StudentCreateBillingFormState,
  StudentCreateFinanceFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';

export type StudentCreateSaveMode = 'setup' | 'list';

export interface StudentCreateSaveOutcome {
  financeActivation?: 'draft' | 'activate';
  agreementState?: string | null;
  billingResponsibility?: BillingResponsibilityMetadata | null;
  collectionAllowed?: boolean | null;
  billingResponsibilityUnresolved?: boolean;
  /** Evidence from atomic create (detail.admission) or post-create refetch. */
  admissionConversion?: AdmissionConversionSnapshot | null;
  /** Create returned admission_already_converted — open linked student, no blind retry. */
  admissionAlreadyConverted?: boolean;
}
export type StudentCreateWizardStep =
  | 'identity'
  | 'billing'
  | 'enrollment'
  | 'finance'
  | 'review'
  | 'result';

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
  const user = useSession();
  const { activeSchoolId } = useAdminSession();
  const journeyCapabilities = useMemo(
    () => resolveStudentCreateJourneyCapabilities(user),
    [user],
  );
  const forceSkipFinance = shouldForceSkipFinanceOnCreate(journeyCapabilities);
  const optionsState = useStudentOptions();
  const admissionOptionsState = useAdmissionOptions();
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const options = optionsState.options;
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<StudentCreateWizardStep>('identity');
  const [state, setState] = useState<StudentProfileFormState>(() =>
    defaultStudentProfileFormState(null),
  );
  const [billingState, setBillingState] = useState<StudentCreateBillingFormState>(() =>
    defaultStudentCreateBillingFormState(),
  );
  const [billingErrors, setBillingErrors] = useState<BillingResponsibilityFieldErrors>({});
  const [financeState, setFinanceState] = useState<StudentCreateFinanceFormState>(
    defaultStudentCreateFinanceFormState(null),
  );
  const [fieldErrors, setFieldErrors] = useState<StudentProfileFieldErrors>({});
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitInFlightRef = useRef(false);
  const [saveMode, setSaveMode] = useState<StudentCreateSaveMode>('setup');
  const [financeActivationMode, setFinanceActivationMode] =
    useState<StudentCreateFinanceActivationMode>('draft');
  const [classClearedNotice, setClassClearedNotice] = useState(false);
  const [cycleChangedNotice, setCycleChangedNotice] = useState(false);
  const [planChangeWarning, setPlanChangeWarning] = useState(false);
  const [skipFinance, setSkipFinance] = useState(forceSkipFinance);
  const [createResult, setCreateResult] = useState<StudentCreateResultModel | null>(null);
  const [pendingSaveOutcome, setPendingSaveOutcome] = useState<{
    id: number;
    mode: StudentCreateSaveMode;
    outcome?: StudentCreateSaveOutcome;
  } | null>(null);
  const financeTouchedRef = useRef(false);
  const lastSuggestFingerprintRef = useRef('');
  const lastFeePlanIdRef = useRef<number | null>(null);
  const admissionPrefillHadClassRef = useRef(Boolean(initialProfilePatch?.classId?.trim()));
  const skipGuardianLinkClearRef = useRef(false);
  const profileOptionsInitRef = useRef(false);
  const profilePrefillAppliedRef = useRef(false);
  const [linkedGuardianPerson, setLinkedGuardianPerson] = useState<PersonSearchResult | null>(null);
  const [linkedGuardianPersonsByEntryKey, setLinkedGuardianPersonsByEntryKey] = useState<
    Record<string, PersonSearchResult>
  >({});

  const admissionBoundGuardianAppliedRef = useRef(false);
  useEffect(() => {
    if (!admissionBanner || admissionBoundGuardianAppliedRef.current) return;
    const selection = admissionBanner.guardianSelection;
    if (!selection.isExistingGuardianSelected || selection.guardianId == null) return;
    admissionBoundGuardianAppliedRef.current = true;
    setBillingState((prev) => ({
      ...prev,
      guardianSourceMode: 'existing',
      linkedGuardianId: selection.guardianId,
      billingGuardianEntryKey: `existing-${selection.guardianId}`,
    }));
  }, [admissionBanner]);

  useEffect(() => {
    if (optionsState.loading) return;

    function applySoftCreateDefaults(prev: StudentProfileFormState): StudentProfileFormState {
      let merged = prev;
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
      return merged;
    }

    setState((prev) => {
      // Hard reset only on first options readiness. Later option refreshes must not wipe
      // in-progress registration fields (identity / guardians contact) after step navigation.
      if (!profileOptionsInitRef.current) {
        profileOptionsInitRef.current = true;
        const base = defaultStudentProfileFormState(options);
        // The identity inputs are usable while the asynchronous options are still loading.
        // Preserve anything the director has already entered before those options become
        // available; otherwise moving to a later step can appear to erase the student.
        let merged: StudentProfileFormState = {
          ...base,
          ...prev,
          ...(initialProfilePatch ?? {}),
        };
        if (initialProfilePatch) profilePrefillAppliedRef.current = true;
        return applySoftCreateDefaults(merged);
      }

      if (initialProfilePatch && !profilePrefillAppliedRef.current) {
        profilePrefillAppliedRef.current = true;
        return applySoftCreateDefaults({ ...prev, ...initialProfilePatch });
      }

      return applySoftCreateDefaults(prev);
    });
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
        prev.linkedGuardianId != null || prev.billingGuardianEntryKey != null
          ? { ...prev, linkedGuardianId: null, billingGuardianEntryKey: null }
          : prev,
      );
      setLinkedGuardianPerson(null);
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

  function guardianIdAlreadyUsedInWizard(
    guardianId: number,
    excludeEntryKey?: string,
  ): boolean {
    const used = collectUsedGuardianIds(state, billingState);
    if (excludeEntryKey) {
      const excluded = billingState.guardianEntries.find((entry) => entry.entryKey === excludeEntryKey);
      if (excluded?.kind === 'existing') {
        used.delete(excluded.guardian_id);
      }
    }
    return used.has(guardianId);
  }

  function handleLinkExistingGuardian(person: PersonSearchResult) {
    const guardianId = resolvePersonSchoolParentId(person);
    if (guardianId == null) {
      toast.error(t('admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked'));
      return;
    }
    if (guardianIdAlreadyUsedInWizard(guardianId)) {
      toast.error(t('admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard'));
      return;
    }
    skipGuardianLinkClearRef.current = true;
    setBillingState((prev) => ({
      ...prev,
      guardianSourceMode: 'existing',
      linkedGuardianId: guardianId,
      billingGuardianEntryKey: `existing-${guardianId}`,
    }));
    setLinkedGuardianPerson(person);
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
    setBillingState((prev) => ({
      ...prev,
      linkedGuardianId: null,
      billingGuardianEntryKey: null,
    }));
    setLinkedGuardianPerson(null);
    clearGuardianIntakeFields();
  }

  function handleGuardianSourceModeChange(mode: StudentCreateBillingFormState['guardianSourceMode']) {
    if (mode === 'existing') {
      clearGuardianIntakeFields();
    }
    if (mode === 'new' && admissionBanner?.guardianPrefillText) {
      const snapshot = admissionBanner.guardianPrefillText;
      const hasSnapshot = Boolean(snapshot.name.trim() || snapshot.phone.trim());
      if (hasSnapshot) {
        patch(guardianPrefillTextToProfilePatch(snapshot));
      }
    }
    setLinkedGuardianPerson(null);
    setBillingState((prev) => ({
      ...prev,
      guardianSourceMode: mode,
      linkedGuardianId: null,
      billingGuardianEntryKey: null,
    }));
  }

  function handleProvisionAccessChange(entryKey: string, enabled: boolean) {
    setBillingState((prev) => {
      const provisionAccessByEntryKey = { ...prev.provisionAccessByEntryKey };
      if (enabled) {
        provisionAccessByEntryKey[entryKey] = true;
      } else {
        delete provisionAccessByEntryKey[entryKey];
      }
      return { ...prev, provisionAccessByEntryKey };
    });
  }

  function handleAddAdditionalGuardian() {
    const primaryGuardian = derivePrimaryStudentCreateGuardianEntry(state, billingState);
    if (!primaryGuardian || !isCompleteStudentCreateGuardianEntry(primaryGuardian)) {
      toast.error(t('admin.student360.create.billing.additionalRequiresPrimary'));
      return;
    }
    const entry = createEmptyAdditionalGuardianEntry();
    setBillingState((prev) => ({
      ...prev,
      guardianEntries: [...prev.guardianEntries, entry],
      additionalGuardianSourceModeByEntryKey: {
        ...prev.additionalGuardianSourceModeByEntryKey,
        [entry.entryKey]: 'new',
      },
    }));
  }

  function handleAdditionalGuardianSourceModeChange(
    entryKey: string,
    mode: StudentCreateBillingFormState['guardianSourceMode'],
  ) {
    setBillingState((prev) => {
      const entry = prev.guardianEntries.find((item) => item.entryKey === entryKey);
      if (!entry) return prev;

      const nextEntry: StudentCreateGuardianEntry =
        mode === 'new'
          ? {
              kind: 'new',
              entryKey,
              full_name: entry.kind === 'new' ? entry.full_name : entry.displayName,
              phone: entry.phone,
              email: entry.email,
              relationship_type: entry.relationship_type,
              is_primary_contact: false,
            }
          : {
              kind: 'new',
              entryKey,
              full_name: '',
              relationship_type: entry.relationship_type,
              is_primary_contact: false,
            };

      return {
        ...prev,
        guardianEntries: prev.guardianEntries.map((item) =>
          item.entryKey === entryKey ? nextEntry : item,
        ),
        additionalGuardianSourceModeByEntryKey: {
          ...prev.additionalGuardianSourceModeByEntryKey,
          [entryKey]: mode,
        },
        billingGuardianEntryKey:
          prev.billingGuardianEntryKey === entryKey && mode === 'existing'
            ? null
            : prev.billingGuardianEntryKey,
      };
    });

    if (mode === 'new') {
      setLinkedGuardianPersonsByEntryKey((prev) => {
        const next = { ...prev };
        delete next[entryKey];
        return next;
      });
    }
  }

  function handleUpdateAdditionalGuardian(entryKey: string, next: StudentCreateGuardianEntry) {
    setBillingState((prev) => ({
      ...prev,
      guardianEntries: prev.guardianEntries.map((item) =>
        item.entryKey === entryKey ? next : item,
      ),
    }));
  }

  function handleLinkAdditionalGuardian(entryKey: string, person: PersonSearchResult) {
    const guardianId = resolvePersonSchoolParentId(person);
    if (guardianId == null) {
      toast.error(t('admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked'));
      return;
    }
    if (guardianIdAlreadyUsedInWizard(guardianId, entryKey)) {
      toast.error(t('admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard'));
      return;
    }

    setBillingState((prev) => {
      const entry = prev.guardianEntries.find((item) => item.entryKey === entryKey);
      if (!entry) return prev;
      return {
        ...prev,
        guardianEntries: prev.guardianEntries.map((item) =>
          item.entryKey === entryKey
            ? entryFromLinkedExistingGuardian(
                entryKey,
                guardianId,
                person.name,
                entry.relationship_type,
                person.phone ?? undefined,
                person.email ?? undefined,
              )
            : item,
        ),
        additionalGuardianSourceModeByEntryKey: {
          ...prev.additionalGuardianSourceModeByEntryKey,
          [entryKey]: 'existing',
        },
      };
    });
    setLinkedGuardianPersonsByEntryKey((prev) => ({ ...prev, [entryKey]: person }));
    setBillingErrors((prev) => {
      const additionalGuardianErrorsByEntryKey = {
        ...prev.additionalGuardianErrorsByEntryKey,
      };
      delete additionalGuardianErrorsByEntryKey[entryKey];
      return {
        ...prev,
        duplicateGuardianId: undefined,
        additionalGuardianErrorsByEntryKey:
          Object.keys(additionalGuardianErrorsByEntryKey).length > 0
            ? additionalGuardianErrorsByEntryKey
            : undefined,
      };
    });
  }

  function handleClearAdditionalGuardian(entryKey: string) {
    setLinkedGuardianPersonsByEntryKey((prev) => {
      const next = { ...prev };
      delete next[entryKey];
      return next;
    });
    setBillingState((prev) => {
      const entry = prev.guardianEntries.find((item) => item.entryKey === entryKey);
      if (!entry) return prev;
      return {
        ...prev,
        guardianEntries: prev.guardianEntries.map((item) =>
          item.entryKey === entryKey
            ? {
                kind: 'new' as const,
                entryKey,
                full_name: '',
                relationship_type: item.relationship_type,
                is_primary_contact: false,
              }
            : item,
        ),
        additionalGuardianSourceModeByEntryKey: {
          ...prev.additionalGuardianSourceModeByEntryKey,
          [entryKey]: 'existing',
        },
        billingGuardianEntryKey:
          prev.billingGuardianEntryKey === entryKey ? null : prev.billingGuardianEntryKey,
      };
    });
  }

  function handleRemoveAdditionalGuardian(entryKey: string) {
    setLinkedGuardianPersonsByEntryKey((prev) => {
      const next = { ...prev };
      delete next[entryKey];
      return next;
    });
    setBillingState((prev) => {
      const provisionAccessByEntryKey = { ...prev.provisionAccessByEntryKey };
      delete provisionAccessByEntryKey[entryKey];
      const additionalGuardianSourceModeByEntryKey = {
        ...prev.additionalGuardianSourceModeByEntryKey,
      };
      delete additionalGuardianSourceModeByEntryKey[entryKey];
      const remainingEntries = prev.guardianEntries.filter((item) => item.entryKey !== entryKey);
      const completeEntries = collectStudentCreateGuardianEntries(
        state,
        { ...prev, guardianEntries: remainingEntries },
        { completeOnly: true },
      );
      let billingGuardianEntryKey = prev.billingGuardianEntryKey;
      if (billingGuardianEntryKey === entryKey) {
        billingGuardianEntryKey =
          completeEntries.length === 1 ? completeEntries[0].entryKey : null;
      }
      return {
        ...prev,
        guardianEntries: remainingEntries,
        provisionAccessByEntryKey,
        additionalGuardianSourceModeByEntryKey,
        billingGuardianEntryKey,
      };
    });
  }

  const usedGuardianIds = useMemo(
    () => collectUsedGuardianIds(state, billingState),
    [state, billingState],
  );

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
    current: Exclude<StudentCreateWizardStep, 'result'>,
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
    current: Exclude<StudentCreateWizardStep, 'result'>,
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

  const guardianEntriesForBilling = useMemo(
    () => collectStudentCreateGuardianEntries(state, billingState),
    [state, billingState],
  );

  useEffect(() => {
    if (forceSkipFinance && !skipFinance) {
      setSkipFinance(true);
      setFinanceError(null);
    }
  }, [forceSkipFinance, skipFinance]);

  useEffect(() => {
    if (!journeyCapabilities.canCreateNewGuardian && billingState.guardianSourceMode === 'new') {
      setBillingState((prev) => ({
        ...prev,
        guardianSourceMode: 'existing',
        linkedGuardianId: null,
        billingGuardianEntryKey: null,
      }));
      setLinkedGuardianPerson(null);
    }
  }, [journeyCapabilities.canCreateNewGuardian, billingState.guardianSourceMode]);

  useEffect(() => {
    setBillingState((prev) => {
      const patch = resolveBillingResponsibilityAutoPatch(guardianEntriesForBilling, prev);
      if (!patch) return prev;
      return { ...prev, ...patch };
    });
  }, [guardianEntriesForBilling]);

  function focusFirstError(errors: StudentProfileFieldErrors) {
    const firstKey = FIELD_ORDER.find((key) => errors[key]);
    if (!firstKey || !formRef.current) return;
    const host = formRef.current.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
    const control = host?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])',
    );
    const el = control ?? host;
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function focusGuardianStepError(errors: BillingResponsibilityFieldErrors) {
    if (!formRef.current) return;
    const fieldOrder = [
      errors.guardianRequired ? 'guardianName' : null,
      errors.billingResponsibilitySelection ? 'billingResponsibilitySelection' : null,
      errors.billingGuardianSelection ? 'billingGuardianSelection' : null,
      errors.billingStudentConfirmed ? 'billingStudentConfirmed' : null,
      errors.billingStudentReason ? 'billingStudentReason' : null,
    ].filter(Boolean) as string[];

    for (const key of fieldOrder) {
      if (key === 'guardianName') {
        const host = formRef.current.querySelector<HTMLElement>('[data-field="guardianName"]');
        const control = host?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
        );
        const el = control ?? host;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      if (key === 'billingGuardianSelection') {
        const radio = formRef.current.querySelector<HTMLElement>(
          'input[name="student-create-billing-guardian"]',
        );
        if (radio) {
          radio.focus();
          radio.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      if (key === 'billingResponsibilitySelection') {
        const select = formRef.current.querySelector<HTMLElement>(
          '.student-create-guardian-billing select',
        );
        if (select) {
          select.focus();
          select.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }
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
    current: Exclude<StudentCreateWizardStep, 'result'>,
    identifierChecks = identifierChecksState.checks,
  ): boolean {
    if (!validateIdentifierDuplicateChecks(current, identifierChecks)) {
      return false;
    }

    if (current === 'billing' || current === 'review') {
      const billingValidation = validateBillingResponsibilityForm(billingState, t);
      const guardianValidation = validateStudentCreateGuardianContract(state, billingState, t, {
        requireExistingGuardianSelection: Boolean(
          admissionBanner?.guardianSelection.selectionRequired,
        ),
      });
      if (!billingValidation.valid || !guardianValidation.valid) {
        const nextErrors = {
          ...billingValidation.errors,
          ...guardianValidation.errors,
        };
        setBillingErrors(nextErrors);
        toast.error(
          billingValidation.message ??
            guardianValidation.message ??
            t('errors.validationFailed'),
        );
        if (current !== 'billing') setStep('billing');
        focusGuardianStepError(nextErrors);
        return false;
      }
      setBillingErrors({});
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
      // Plan is optional: blocked / missing plans do not prevent registration.
      if (isOptionalFinanceGateStatus(gate.status)) {
        setFinanceError(null);
        return true;
      }
      if (!validateFinanceStep()) return false;
    }
    setFinanceError(null);
    return true;
  }

  async function goNext() {
    if (step === 'result') return;
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
    if (step === 'result') return;
    const prev = STEP_ORDER[stepIndex(step) - 1];
    if (prev) setStep(prev);
  }

  async function submit(
    mode: StudentCreateSaveMode,
    activation: StudentCreateFinanceActivationMode = 'draft',
  ) {
    if (submitInFlightRef.current || saving) return;

    const flushed = await identifierChecksState.flushChecks();
    if (!applyIdentifierDuplicateValidation('review', flushed.checks)) {
      return;
    }
    if (!validateStep('review', flushed.checks)) return;

    const billingValidation = validateBillingResponsibilityForm(billingState, t);
    if (!billingValidation.valid) {
      setBillingErrors(billingValidation.errors);
      toast.error(billingValidation.message ?? t('errors.validationFailed'));
      setStep('billing');
      return;
    }
    setBillingErrors({});

    if (state.classId.trim() && !applyEnrollmentClassScopeFailure('save')) {
      return;
    }

    const effectiveSkipFinance = skipFinance || forceSkipFinance;
    const attachFinance =
      !effectiveSkipFinance &&
      journeyCapabilities.canAssignFeePlan &&
      Boolean(suggestState.suggest);

    if (attachFinance) {
      const financeReason = getStudentCreateFinanceBlockReason(state, resolvedSchoolId);
      if (financeReason !== 'ok') {
        applyFinancePrerequisiteFailure(financeReason, 'save');
        return;
      }
    }

    if (activation === 'activate' && attachFinance) {
      if (
        !canOfferCreateAgreementActivationUi(
          journeyCapabilities,
          canOfferFinanceAgreementActivation({
            suggest: suggestState.suggest,
            financeBlocked,
            state,
            schoolId: resolvedSchoolId,
            financeState,
            previewLoading: previewState.loading,
            previewError: previewState.error,
            preview: previewState.preview,
          }),
        )
      ) {
        validateFinanceStep();
        return;
      }
    }

    submitInFlightRef.current = true;
    setSaveMode(mode);
    setFinanceActivationMode(activation);
    setSaving(true);
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(
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
          admissionId: admissionBanner?.admissionId ?? null,
        },
      ),
      state,
      billingState,
    );

    if (payload.finance && payload.academic?.academic_year_id == null) {
      applyFinancePrerequisiteFailure('academic_year', 'save');
      submitInFlightRef.current = false;
      setSaving(false);
      return;
    }
    if (payload.finance && payload.academic?.class_id == null) {
      applyFinancePrerequisiteFailure('class', 'save');
      submitInFlightRef.current = false;
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
      const studentCode =
        data && typeof data.code === 'string'
          ? data.code
          : data && typeof data.school_number === 'string'
            ? data.school_number
            : null;

      const initialBillingOutcome = parseBillingResponsibilityOutcome(data);

      const billingResolution = await resolvePostCreateBillingOutcome({
        studentId: id,
        initialOutcome: initialBillingOutcome,
        guardianLinkSucceeded: false,
        activeSchoolId: resolvedSchoolId,
      });
      const billingOutcome = billingResolution.finalOutcome;
      const billingUnresolved = billingResolution.billingResponsibilityUnresolved;

      submitInFlightRef.current = false;
      setSaving(false);
      const agreementState = resolveStudentCreateAgreementState(
        data as { id?: number; agreement_state?: string; finance?: { agreement_state?: string } },
      );

      if (billingResolution.showRefreshVerificationToast) {
        toast.show(
          t('admin.student360.create.billingResponsibility.refreshVerificationWarning'),
          'info',
        );
      }
      if (billingResolution.showUnresolvedWarningToast) {
        toast.show(t('admin.student360.create.billingResponsibility.unresolvedWarning'), 'info');
      }
      if (activation === 'activate' && agreementState === 'active' && !billingUnresolved) {
        toast.success(t('admin.student360.create.financeActivation.activateSuccess'));
      } else if (payload.finance && activation === 'draft') {
        toast.success(t('admin.student360.create.financeActivation.draftSuccess'));
      } else if (!admissionBanner) {
        toast.success(t('admin.student360.create.success'));
      }

      const createdGuardianAccounts = extractGuardianAccountPresentationsFromCreateResponse(data);
      if (createdGuardianAccounts.length > 0) {
        persistStudentCreateGuardianOnboarding(id, createdGuardianAccounts);
      }

      const admissionConversion = admissionBanner
        ? parseAdmissionConversionFromCreateResponse(data)
        : null;

      if (admissionBanner) {
        notifyAdmissionsQueriesInvalidated({
          reason: 'atomic_student_create',
          admissionId: admissionBanner.admissionId,
        });
      }

      const outcome: StudentCreateSaveOutcome = {
        financeActivation: payload.finance ? activation : undefined,
        agreementState,
        billingResponsibility: billingOutcome.metadata,
        collectionAllowed: billingOutcome.collectionAllowed,
        billingResponsibilityUnresolved: billingUnresolved,
        admissionConversion,
      };

      setCreateResult({
        studentId: id,
        studentCode,
        financeAttached: Boolean(payload.finance),
        financeActivation: payload.finance ? activation : undefined,
        agreementState,
        billingUnresolved,
        collectionAllowed: billingOutcome.collectionAllowed,
        billingPartnerId: billingOutcome.metadata?.billing_partner_id ?? null,
      });
      setPendingSaveOutcome({ id, mode, outcome });
      setStep('result');
      return;
    }

    submitInFlightRef.current = false;
    setSaving(false);

      if (!res.success) {
      const mapped = mapStudentApiError(res.error, t);

      if (mapped.admissionAlreadyConverted && admissionBanner) {
        notifyAdmissionsQueriesInvalidated({
          reason: 'admission_already_converted',
          admissionId: admissionBanner.admissionId,
        });
        const detailRes = await fetchAdmission(admissionBanner.admissionId, {
          active_school_id: resolvedSchoolId ?? undefined,
        });
        const admissionDetail =
          detailRes.success && detailRes.data ? detailRes.data : null;
        const studentIdFromAdmission =
          admissionDetail &&
          typeof admissionDetail.student_id === 'number' &&
          admissionDetail.student_id > 0
            ? admissionDetail.student_id
            : null;
        toast.show(mapped.message, 'info');
        if (studentIdFromAdmission != null) {
          const conversion: AdmissionConversionSnapshot = {
            id: admissionDetail?.id ?? admissionBanner.admissionId,
            student_id: studentIdFromAdmission,
            application_status: admissionDetail?.application_status ?? 'registered',
            registration_flow_state:
              typeof admissionDetail?.registration_flow_state === 'string'
                ? admissionDetail.registration_flow_state
                : 'linked',
            converted_at:
              typeof admissionDetail?.converted_at === 'string'
                ? admissionDetail.converted_at
                : null,
          };
          setPendingSaveOutcome({
            id: studentIdFromAdmission,
            mode,
            outcome: {
              admissionAlreadyConverted: true,
              admissionConversion: conversion,
            },
          });
        }
        return;
      }

      if (mapped.fieldErrors) {
        const billingFieldErrors: BillingResponsibilityFieldErrors = {};
        if (mapped.fieldErrors.billingResponsibilitySelection) {
          billingFieldErrors.billingResponsibilitySelection = mapped.fieldErrors.billingResponsibilitySelection;
        }
        if (mapped.fieldErrors.billingStudentConfirmed) {
          billingFieldErrors.billingStudentConfirmed = mapped.fieldErrors.billingStudentConfirmed;
        }
        if (mapped.fieldErrors.billingStudentReason) {
          billingFieldErrors.billingStudentReason = mapped.fieldErrors.billingStudentReason;
        }
        if (mapped.fieldErrors.billingGuardianSelection) {
          billingFieldErrors.billingGuardianSelection = mapped.fieldErrors.billingGuardianSelection;
        }
        if (mapped.fieldErrors.guardianRequired) {
          billingFieldErrors.guardianRequired = mapped.fieldErrors.guardianRequired;
        }
        if (mapped.fieldErrors.duplicateGuardianId) {
          billingFieldErrors.duplicateGuardianId = mapped.fieldErrors.duplicateGuardianId;
        }
        if (mapped.fieldErrors.additionalGuardianErrorsByEntryKey) {
          billingFieldErrors.additionalGuardianErrorsByEntryKey =
            mapped.fieldErrors.additionalGuardianErrorsByEntryKey;
        }
        if (Object.keys(billingFieldErrors).length > 0) {
          setBillingErrors(billingFieldErrors);
          setStep('billing');
        }
        if (String(res.error?.code ?? '') === 'guardian_identity_candidate_exists') {
          setBillingState((prev) => ({
            ...prev,
            guardianSourceMode: 'existing',
            linkedGuardianId: null,
            billingGuardianEntryKey: null,
          }));
          setLinkedGuardianPerson(null);
          setStep('billing');
        } else if (mapped.stayOnGuardianStep) {
          setStep('billing');
        }
        setFieldErrors(mapped.fieldErrors);
        focusFirstError(mapped.fieldErrors);
      } else if (mapped.stayOnGuardianStep) {
        setStep('billing');
      }
      toast.error(mapped.message);
    }
  }

  const onLastStep = step === 'review';
  const onResultStep = step === 'result';
  const effectiveSkipFinance = skipFinance || forceSkipFinance;
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

  const canActivateFinanceAgreement = canOfferCreateAgreementActivationUi(
    journeyCapabilities,
    !effectiveSkipFinance &&
      canOfferFinanceAgreementActivation({
        suggest: suggestState.suggest,
        financeBlocked,
        state,
        schoolId: resolvedSchoolId,
        financeState,
        previewLoading: previewState.loading,
        previewError: previewState.error,
        preview: previewState.preview,
      }),
  );

  const saveDisabled =
    saving ||
    submitInFlightRef.current ||
    (!effectiveSkipFinance &&
      Boolean(suggestState.suggest) &&
      financePrerequisitesMissing) ||
    massarDuplicate ||
    identifierChecksState.identifierChecksBlockProgress;

  function handleOpenStudent360() {
    if (!pendingSaveOutcome) return;
    onSaved(pendingSaveOutcome.id, pendingSaveOutcome.mode, pendingSaveOutcome.outcome);
  }

  function handleCreateAnother() {
    window.location.assign('/admin/students/new');
  }

  function handleBackToList() {
    onCancel();
  }

  return (
    <>
      <StudentCreatePageHeader state={state} />
      <form ref={formRef} className="student-create-form" onSubmit={(e) => e.preventDefault()}>
      {admissionBanner ? <StudentCreatePrefillBanner banner={admissionBanner} /> : null}
      {!onResultStep ? (
        <StudentCreateStepper
          activeStep={
            (STEP_ORDER.includes(step) ? step : 'review') as
              | 'identity'
              | 'billing'
              | 'enrollment'
              | 'finance'
              | 'review'
          }
        />
      ) : null}

      {step === 'identity' ? (
        <StudentCreateStyledSection
          icon="identity"
          lead={t('admin.student360.create.identityStepLead')}
          className="student-create-form__section--identity student-create-form__section--identity-quiet"
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
          billingErrors={billingErrors}
          guardianEntries={guardianEntriesForBilling}
          linkedGuardianPerson={linkedGuardianPerson}
          onBillingChange={(patch) => {
            setBillingState((prev) => ({ ...prev, ...patch }));
            setBillingErrors({});
          }}
          intakeValues={intakeValues}
          intakeErrors={intakeFieldErrors}
          onIntakePatch={handleIntakePatch}
          onLinkExistingGuardian={handleLinkExistingGuardian}
          onClearLinkedGuardian={handleClearLinkedGuardian}
          onGuardianSourceModeChange={handleGuardianSourceModeChange}
          onProvisionAccessChange={handleProvisionAccessChange}
          onAddAdditionalGuardian={handleAddAdditionalGuardian}
          onAdditionalGuardianSourceModeChange={handleAdditionalGuardianSourceModeChange}
          onUpdateAdditionalGuardian={handleUpdateAdditionalGuardian}
          onLinkAdditionalGuardian={handleLinkAdditionalGuardian}
          onClearAdditionalGuardian={handleClearAdditionalGuardian}
          onRemoveAdditionalGuardian={handleRemoveAdditionalGuardian}
          usedGuardianIds={usedGuardianIds}
          linkedGuardianPersonsByEntryKey={linkedGuardianPersonsByEntryKey}
          admissionGuardianSnapshot={admissionBanner?.guardianPrefillText ?? null}
          admissionSelectionRequired={
            Boolean(admissionBanner?.guardianSelection.selectionRequired) &&
            billingState.linkedGuardianId == null
          }
          allowCreateNewGuardian={journeyCapabilities.canCreateNewGuardian}
          canManageBillingProfile={journeyCapabilities.canManageBillingProfile}
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
          {financeError && !effectiveSkipFinance ? (
            <p className="student-create-form__notice student-create-finance-flow__alert" role="alert">
              {financeError}
            </p>
          ) : null}
          {!journeyCapabilities.canAssignFeePlan ? (
            <p className="student-create-form__notice" role="status">
              {t('admin.student360.create.finance.assignForbiddenHint')}
            </p>
          ) : null}
          <div className="student-create-finance-skip-card">
            <label className="student-create-form__checkbox">
              <input
                type="checkbox"
                checked={effectiveSkipFinance}
                disabled={forceSkipFinance || saving}
                onChange={(e) => {
                  if (forceSkipFinance) return;
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
          {effectiveSkipFinance ? (
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
              canManageDiscounts={journeyCapabilities.canManageDiscounts}
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
            linkedGuardianPerson={linkedGuardianPerson}
            linkedGuardianPersonsByEntryKey={linkedGuardianPersonsByEntryKey}
            guardianEntries={guardianEntriesForBilling.filter(isCompleteStudentCreateGuardianEntry)}
            billingGuardianEntryKey={billingState.billingGuardianEntryKey}
            suggest={effectiveSkipFinance ? null : suggestState.suggest}
            financeState={financeState}
            preview={previewState.preview}
            previewLoading={previewState.loading}
            previewError={previewState.error}
            financeBlocked={!effectiveSkipFinance && financeBlocked}
            financeSkipped={effectiveSkipFinance}
            massarDuplicate={massarDuplicate}
            classMissingForFinance={!effectiveSkipFinance && classMissingForFinance}
            enrollmentClassLabel={enrollmentClassLabel}
            schoolId={resolvedSchoolId}
          />
        </div>
      ) : null}

      {onResultStep && createResult ? (
        <StudentCreateResultSection
          result={createResult}
          onOpenStudent360={handleOpenStudent360}
          onCreateAnother={handleCreateAnother}
          onBackToList={handleBackToList}
        />
      ) : null}

      {!onResultStep ? (
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
            <button
              type="button"
              className="btn btn--primary"
              disabled={saveDisabled}
              data-testid="student-create-confirm"
              onClick={() => void submit('setup', 'draft')}
            >
              {saving && financeActivationMode === 'draft'
                ? t('admin.student360.create.saving')
                : t('admin.student360.create.confirmRegistration')}
            </button>
            {canActivateFinanceAgreement ? (
              <button
                type="button"
                className="btn btn--secondary"
                disabled={saveDisabled}
                onClick={() => void submit('setup', 'activate')}
              >
                {saving && financeActivationMode === 'activate'
                  ? t('admin.student360.create.financeActivation.savingActivate')
                  : t('admin.student360.create.financeActivation.createAndActivate')}
              </button>
            ) : null}
          </>
        )}

        <button type="button" className="btn btn--ghost" disabled={saving} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
      ) : null}
    </form>
    </>
  );
}
