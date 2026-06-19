'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useStudentOptions } from '../hooks/use-student-options';
import { useFeePlanSuggest } from '../hooks/use-fee-plan-suggest';
import { useEnrollmentPlanPreview } from '../hooks/use-enrollment-plan-preview';
import { mapStudentApiError } from '../utils/student-api-errors';
import { filterClassesForEnrollment } from '../utils/student-options';
import {
  buildEnrollmentCycleOptions,
  filterLevelsByCycleId,
  levelBelongsToCycle,
} from '../utils/student-enrollment-cycle';
import {
  buildStudentCreatePayload,
  defaultStudentProfileFormState,
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
import {
  StudentCreateAdditionalFields,
  StudentCreateEnrollmentFields,
  StudentCreateIdentityFields,
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
];

function stepIndex(step: StudentCreateWizardStep): number {
  return STEP_ORDER.indexOf(step);
}

export function StudentCreateForm({
  onSaved,
  onCancel,
}: {
  onSaved: (id: number, mode: StudentCreateSaveMode) => void;
  onCancel: () => void;
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
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [classClearedNotice, setClassClearedNotice] = useState(false);
  const [cycleChangedNotice, setCycleChangedNotice] = useState(false);
  const [planChangeWarning, setPlanChangeWarning] = useState(false);
  const financeTouchedRef = useRef(false);
  const lastSuggestFingerprintRef = useRef('');
  const lastFeePlanIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (optionsState.loading) return;
    setState(defaultStudentProfileFormState(options));
  }, [optionsState.loading, options]);

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

  function focusFirstError(errors: StudentProfileFieldErrors) {
    const firstKey = FIELD_ORDER.find((key) => errors[key]);
    if (!firstKey || !formRef.current) return;
    const el = formRef.current.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function validateStep(current: StudentCreateWizardStep): boolean {
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
      if (financeState.customizePlan && !financeState.customizationReason) {
        setFinanceError(t('admin.student360.create.finance.reasonRequired'));
        toast.error(t('admin.student360.create.finance.reasonRequired'));
        return false;
      }
      if (financeState.customizePlan && previewState.error) {
        setFinanceError(previewState.error);
        toast.error(previewState.error);
        return false;
      }
    }
    setFinanceError(null);
    return true;
  }

  function goNext() {
    const current = step;
    if (!validateStep(current)) return;
    const next = STEP_ORDER[stepIndex(current) + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const prev = STEP_ORDER[stepIndex(step) - 1];
    if (prev) setStep(prev);
  }

  async function submit(mode: StudentCreateSaveMode) {
    if (!validateStep('review')) return;

    setSaveMode(mode);
    setSaving(true);
    const payload = buildStudentCreatePayload(state, {
      suggest: suggestState.suggest,
      financeState,
    });
    const res = await api.post(endpoints.admin.students, payload);
    setSaving(false);

    if (res.success && res.data) {
      toast.success(t('admin.student360.create.success'));
      const id =
        typeof res.data === 'object' && res.data !== null && 'id' in res.data
          ? Number((res.data as { id: number }).id)
          : 0;
      onSaved(id, mode);
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

  return (
    <form ref={formRef} className="student-create-form" onSubmit={(e) => e.preventDefault()}>
      <StudentCreateStepper activeStep={step} />

      {step === 'identity' ? (
        <section className="student-create-form__section">
          <h2 className="student-create-form__section-title">
            {t('admin.student360.sections.identity')}
          </h2>
          <div data-field="firstName">
            <StudentCreateIdentityFields
              state={state}
              errors={fieldErrors}
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
              errors={fieldErrors}
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
        <StudentCreateReviewSection
          profileState={state}
          billingState={billingState}
          suggest={suggestState.suggest}
          financeState={financeState}
          financeBlocked={financeBlocked}
        />
      ) : null}

      <div className="student-create-form__actions">
        {stepIndex(step) > 0 ? (
          <button type="button" className="btn btn--ghost" disabled={saving} onClick={goBack}>
            {t('common.back')}
          </button>
        ) : null}

        {!onLastStep ? (
          <button type="button" className="btn btn--primary" disabled={saving} onClick={goNext}>
            {t('common.next')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn--primary"
              disabled={saving || financeBlocked}
              onClick={() => submit('setup')}
            >
              {saving && saveMode === 'setup'
                ? t('admin.student360.create.saving')
                : t('admin.student360.create.saveAndSetup')}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={saving || financeBlocked}
              onClick={() => submit('list')}
            >
              {saving && saveMode === 'list'
                ? t('admin.student360.create.saving')
                : t('admin.student360.create.saveOnly')}
            </button>
          </>
        )}

        <button type="button" className="btn btn--ghost" disabled={saving} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
