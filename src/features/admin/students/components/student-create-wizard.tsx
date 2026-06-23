'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { InfoBanner } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionRegistrationContext } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import {
  formatPrefillFieldValue,
  formatPrefillMessage,
} from '@/features/admin/admissions/utils/admission-prefill-display';
import { endpoints } from '@/lib/api/endpoints';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useStudentOptions } from '../hooks/use-student-options';
import { useFeePlanSuggest } from '../hooks/use-fee-plan-suggest';
import { useEnrollmentPlanPreview } from '../hooks/use-enrollment-plan-preview';
import { useStudentCreateIdentifierChecks } from '../hooks/use-student-create-identifier-checks';
import { mapStudentApiError } from '../utils/student-api-errors';
import { filterClassesForEnrollment } from '../utils/student-options';
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
  validateStudentCreateForm,
  validateStudentCreateIdentityStep,
  validateStudentCreateIdentifier,
  hasStudentCreateIdentifier,
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
  resolveStudentCreateIdentifierCheckErrors,
  validateStudentCreateIdentifierDuplicateChecks,
} from '../utils/student-identifier-check';
import {
  StudentCreateAdditionalFields,
  StudentCreateEnrollmentFields,
  StudentCreateIdentityFields,
  StudentAdmissionAndSiblingsFields,
} from './student-form-fields';
import { StudentCreateStepper } from './student-create-stepper';
import { StudentCreateBillingStep } from './student-create-billing-step';
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
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const options = optionsState.options;
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<StudentCreateWizardStep>('identity');
  const [state, setState] = useState<StudentProfileFormState>(() =>
    defaultStudentProfileFormState(null),
  );
  const [billingState, setBillingState] = useState<StudentCreateBillingFormState>({
    billingPartnerType: 'guardian',
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
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [classClearedNotice, setClassClearedNotice] = useState(false);
  const [cycleChangedNotice, setCycleChangedNotice] = useState(false);
  const [planChangeWarning, setPlanChangeWarning] = useState(false);
  const financeTouchedRef = useRef(false);
  const lastSuggestFingerprintRef = useRef('');
  const lastFeePlanIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (optionsState.loading) return;
    const base = defaultStudentProfileFormState(options);
    let merged: StudentProfileFormState = initialProfilePatch
      ? { ...base, ...initialProfilePatch }
      : base;

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

  const enrollmentCycles = useMemo(
    () =>
      buildEnrollmentCycleOptions(
        options?.levels ?? [],
        levelOptionsState.options?.reference_levels ?? [],
        levelOptionsState.options?.cycles ?? [],
      ),
    [options?.levels, levelOptionsState.options],
  );

  const filteredLevels = useMemo(
    () =>
      filterLevelsByCycleId(
        options?.levels ?? [],
        state.cycleId,
        levelOptionsState.options?.reference_levels ?? [],
        levelOptionsState.options?.cycles ?? [],
      ),
    [options?.levels, state.cycleId, levelOptionsState.options],
  );

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
    () => filterClassesForEnrollment(options?.classes ?? [], state.levelId),
    [options?.classes, state.levelId],
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
      classId: '',
    });
    resetFinancePlan();

    if (cycleChanged && hadCustomization) {
      setCycleChangedNotice(true);
    }
  }

  function handleLevelChange(levelId: string) {
    const compatible = filterClassesForEnrollment(options?.classes ?? [], levelId);
    const classStillValid = compatible.some((c) => String(c.id) === state.classId);
    const levelChanged = Boolean(state.levelId) && state.levelId !== levelId;
    const hadCustomization = financeTouchedRef.current || financeState.customizePlan;

    patch({
      levelId,
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
    if (result.openAdditional) setAdditionalOpen(true);
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
    const identifierValidation = validateStudentCreateIdentifier(state, t);
    if (!identifierValidation.valid) {
      setFieldErrors((prev) => ({ ...prev, ...identifierValidation.errors }));
      const identifierMessage =
        identifierValidation.errors.massarCode ?? t('admin.student360.create.errors.studentIdentifierRequired');
      toast.error(identifierMessage);
      if (current !== 'identity') {
        setStep('identity');
      }
      focusFirstError(identifierValidation.errors);
      return false;
    }

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
      }
      if (Boolean(suggestState.suggest)) {
        const financeReason = getStudentCreateFinanceBlockReason(state, resolvedSchoolId);
        if (financeReason !== 'ok') {
          return applyFinancePrerequisiteFailure(financeReason, 'step');
        }
      }
      if (!levelSelected) {
        toast.error(t('admin.student360.create.finance.selectLevelForPlan'));
        return false;
      }
      if (suggestState.loading) {
        toast.error(t('admin.student360.create.finance.loading'));
        return false;
      }
      if (financeBlocked) {
        const message = resolveNoDefaultFeePlanMessage(suggestState.error, t);
        setFinanceError(message);
        toast.error(message);
        return false;
      }
      if (!suggestState.suggest) {
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

    if (suggestState.suggest) {
      const financeReason = getStudentCreateFinanceBlockReason(state, resolvedSchoolId);
      if (financeReason !== 'ok') {
        applyFinancePrerequisiteFailure(financeReason, 'save');
        return;
      }
    }

    if (activation === 'activate' && suggestState.suggest) {
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
    const payload = buildStudentCreatePayload(state, {
      suggest: suggestState.suggest,
      financeState,
      schoolId: resolvedSchoolId,
      activationMode: activation === 'activate' ? 'activate' : undefined,
    });

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
    setSaving(false);

    if (res.success && res.data) {
      const data =
        typeof res.data === 'object' && res.data !== null
          ? (res.data as Record<string, unknown>)
          : null;
      const id = data && 'id' in data ? Number(data.id) : 0;
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
  const identifierMissing = !hasStudentCreateIdentifier(state);
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

  const canActivateFinanceAgreement = canOfferFinanceAgreementActivation({
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
    financeBlocked ||
    identifierMissing ||
    financePrerequisitesMissing ||
    massarDuplicate ||
    identifierChecksState.identifierChecksBlockProgress;

  return (
    <form ref={formRef} className="student-create-form" onSubmit={(e) => e.preventDefault()}>
      {admissionBanner ? (
        <div className="admissions-admission-prefill-banner">
          <InfoBanner
            tone="blue"
            title={t('admin.admissions.registration.prefillBannerTitle', {
              reference: admissionBanner.reference,
            })}
            description={t('admin.admissions.registration.prefillBannerDescription')}
          />
          <dl className="admissions-dl admissions-dl--compact">
            {admissionBanner.decision ? (
              <>
                <dt>{t('admin.admissions.registration.prefillDecision')}</dt>
                <dd>{formatPrefillFieldValue('decision', admissionBanner.decision, t)}</dd>
              </>
            ) : null}
            {admissionBanner.offerState ? (
              <>
                <dt>{t('admin.admissions.registration.prefillOfferState')}</dt>
                <dd>{formatPrefillFieldValue('offer_state', admissionBanner.offerState, t)}</dd>
              </>
            ) : null}
          </dl>
          {(admissionBanner.warnings?.length ?? 0) > 0 ? (
            <div className="alert alert--warning">
              <strong>{t('admin.admissions.prefill.warnings')}</strong>
              <ul>
                {admissionBanner.warnings!.map((item, index) => (
                  <li key={index}>{formatPrefillMessage(item, t)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(admissionBanner.blockingIssues?.length ?? 0) > 0 ? (
            <div className="alert alert--error">
              <strong>{t('admin.admissions.prefill.blockingIssues')}</strong>
              <ul>
                {admissionBanner.blockingIssues!.map((item, index) => (
                  <li key={index}>{formatPrefillMessage(item, t)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <StudentCreateStepper activeStep={step} />

      {step === 'identity' ? (
        <section className="student-create-form__section">
          <h2 className="student-create-form__section-title">
            {t('admin.student360.sections.identity')}
          </h2>
          <div data-field="firstName">
            <StudentCreateIdentityFields
              state={state}
              errors={displayFieldErrors}
              fieldHints={identityFieldHints()}
              optionsLoading={optionsState.loading}
              genders={options?.genders ?? []}
              onChange={patch}
            />
          </div>
          <details
            className="student-create-form__collapsible"
            open={additionalOpen}
            onToggle={(e) => setAdditionalOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="student-create-form__collapsible-summary">
              {t('admin.student360.create.additionalInfo')}
            </summary>
            <StudentCreateAdditionalFields
              state={state}
              errors={displayFieldErrors}
              fieldHints={identityFieldHints()}
              optionsLoading={optionsState.loading}
              nationalities={options?.nationalities ?? []}
              onChange={patch}
            />
          </details>
        </section>
      ) : null}

      {step === 'billing' ? (
        <StudentCreateBillingStep state={billingState} onChange={(patch) => setBillingState((prev) => ({ ...prev, ...patch }))} />
      ) : null}

      {step === 'enrollment' ? (
        <section className="student-create-form__section">
          <h2 className="student-create-form__section-title">
            {t('admin.student360.sections.enrollment')}
          </h2>
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
          <div data-field="academicYearId">
            <StudentCreateEnrollmentFields
              state={state}
              errors={fieldErrors}
              optionsLoading={optionsState.loading}
              optionsError={!!optionsState.error}
              years={options?.academicYears ?? []}
              cycles={enrollmentCycles}
              cyclesLoading={levelOptionsState.loading}
              levels={filteredLevels}
              classes={filteredClasses}
              registrationTypes={options?.registrationTypes ?? []}
              onChange={patch}
              onCycleChange={handleCycleChange}
              onLevelChange={handleLevelChange}
              onRetryOptions={optionsState.reload}
            />
          </div>
          <div className="student-create-form__subsection">
            <h3 className="student-create-form__subsection-title">
              {t('admin.student360.admissionData.sectionTitle')}
            </h3>
            <StudentAdmissionAndSiblingsFields state={state} onChange={patch} />
          </div>
        </section>
      ) : null}

      {step === 'finance' ? (
        <>
          {financeError ? (
            <p className="student-create-form__notice" role="alert">
              {financeError}
            </p>
          ) : null}
          <StudentCreateFeePlanSection
            suggest={suggestState.suggest}
            loading={suggestState.loading}
            error={suggestState.error}
            levelSelected={levelSelected}
            financeState={financeState}
            planChangeWarning={planChangeWarning}
            preview={previewState.preview}
            previewLoading={previewState.loading}
            previewError={previewState.error}
            onFinanceChange={patchFinance}
            onSelectPlan={handleSelectFeePlan}
            onRetry={suggestState.reload}
          />
        </>
      ) : null}

      {step === 'review' ? (
        <>
          {financeError ? (
            <p className="student-create-form__notice" role="alert">
              {financeError}
            </p>
          ) : null}
          <StudentCreateReviewSection
            profileState={state}
            billingState={billingState}
            suggest={suggestState.suggest}
            financeState={financeState}
            preview={previewState.preview}
            previewLoading={previewState.loading}
            previewError={previewState.error}
            financeBlocked={financeBlocked}
            massarDuplicate={massarDuplicate}
            classMissingForFinance={classMissingForFinance}
            enrollmentClassLabel={enrollmentClassLabel}
          />
        </>
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
  );
}
