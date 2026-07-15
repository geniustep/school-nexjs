'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import {
  resolveDefaultNationalityId,
  resolveDefaultAcademicYearId,
  todayIsoDate,
} from '@/features/admin/students/utils/student-profile';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { createFamilyBatch } from '../api/family-admissions-api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import {
  resolveDefaultAdmissionSourceId,
} from '../utils/admission-options';
import {
  addFamilyChild,
  emptyFamilyAdmissionFormState,
  removeFamilyChild,
  toggleFamilyChildCollapsed,
  updateFamilyChild,
  type FamilyAdmissionFormState,
} from '../utils/family-admission-form-state';
import { FamilyAdmissionIdempotencySession } from '../utils/family-admission-idempotency';
import {
  buildCreateFamilyBatchPayload,
  validateFamilyAdmissionForm,
} from '../utils/family-admission-payload';
import { familyAdmissionApiErrorMessage } from '../utils/family-admission-errors';
import {
  createFamilyAdmissionWizardAnalyticsGuards,
  mapFamilyAdmissionSubmitResult,
  resetFamilyAdmissionWizardAnalyticsGuards,
  trackFamilyAdmissionStarted,
  trackFamilyAdmissionStepCompleted,
  trackFamilyAdmissionSubmitResult,
} from '../utils/family-admissions-analytics';
import { normalizeFamilyBatchCreateResponse } from '../utils/family-admission-response';
import { FamilyAdmissionSteps, type FamilyAdmissionWizardStep } from './family-admission-steps';
import { FamilyAdmissionFamilyStep } from './family-admission-family-step';
import { FamilyAdmissionChildrenStep } from './family-admission-children-step';
import { FamilyAdmissionReviewStep } from './family-admission-review-step';
import { FamilyAdmissionSuccessStep } from './family-admission-success-step';
import type { FamilyBatchCreateResponse } from '@/types/admission';
import '@/features/admin/students/student-360.css';
import '../admissions.css';

export function FamilyAdmissionCreatePage() {
  const t = useT();
  const { locale } = useLocale();
  const { activeSchoolId } = useAdminSession();
  const today = useMemo(() => todayIsoDate(), []);
  const [step, setStep] = useState<FamilyAdmissionWizardStep>('family');
  const [form, setForm] = useState<FamilyAdmissionFormState>(() =>
    emptyFamilyAdmissionFormState(today),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyConflict, setIdempotencyConflict] = useState(false);
  const [successResult, setSuccessResult] = useState<FamilyBatchCreateResponse | null>(null);
  const [successReplay, setSuccessReplay] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const idempotencySession = useRef(new FamilyAdmissionIdempotencySession());
  const analyticsGuards = useRef(createFamilyAdmissionWizardAnalyticsGuards());

  useEffect(() => {
    trackFamilyAdmissionStarted(analyticsGuards.current);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const studentOptionsState = useStudentOptions();
  const admissionOptionsState = useAdmissionOptions();
  const admissionOptions = admissionOptionsState.options;
  const allLevels = admissionOptions?.levels ?? [];
  const allStreams = admissionOptions?.streams ?? [];
  const cycles = admissionOptions?.cycles ?? [];

  useEffect(() => {
    if (defaultsApplied || !admissionOptionsState.options) return;
    const sourceId = resolveDefaultAdmissionSourceId(admissionOptionsState.options.sources);
    const yearIdRaw = resolveDefaultAcademicYearId(admissionOptionsState.options.academic_years);
    const yearId = yearIdRaw ? Number(yearIdRaw) : undefined;
    setForm((prev) => ({
      ...prev,
      family: {
        ...prev.family,
        source_id: sourceId ?? prev.family.source_id,
        academic_year_id:
          prev.family.academic_year_id != null && prev.family.academic_year_id > 0
            ? prev.family.academic_year_id
            : yearId && Number.isFinite(yearId)
              ? yearId
              : prev.family.academic_year_id,
      },
    }));
    setDefaultsApplied(true);
  }, [admissionOptionsState.options, defaultsApplied]);

  useEffect(() => {
    if (studentOptionsState.loading || !studentOptionsState.options?.nationalities.length) return;
    resolveDefaultNationalityId(studentOptionsState.options.nationalities);
  }, [studentOptionsState.loading, studentOptionsState.options?.nationalities]);

  const lookupError =
    studentOptionsState.error?.message ?? admissionOptionsState.error?.message ?? null;

  const relationshipLoadFailed =
    !admissionOptionsState.loading &&
    (admissionOptionsState.error != null ||
      (admissionOptionsState.options != null &&
        admissionOptionsState.options.relationships.length === 0));

  function patchFamily(patch: Partial<FamilyAdmissionFormState['family']>) {
    setForm((prev) => ({ ...prev, family: { ...prev.family, ...patch } }));
  }

  function patchGuardians(next: FamilyAdmissionFormState['guardians']) {
    setForm((prev) => ({ ...prev, guardians: next }));
  }

  function handleAddChild() {
    setForm((prev) => addFamilyChild(prev));
  }

  function handleRemoveChild(localId: string) {
    setForm((prev) => removeFamilyChild(prev, localId));
  }

  function handlePatchChild(localId: string, patch: Parameters<typeof updateFamilyChild>[2]) {
    setForm((prev) => updateFamilyChild(prev, localId, patch));
  }

  function handleToggleChild(localId: string) {
    setForm((prev) => toggleFamilyChildCollapsed(prev, localId));
  }

  function handleEditChild(localId: string) {
    setForm((prev) => ({
      ...prev,
      children: prev.children.map((child) =>
        child.localId === localId ? { ...child, collapsed: false } : child,
      ),
    }));
    setStep('children');
  }

  function validateCurrentStep(): string | null {
    if (step === 'family') {
      const validationError = validateFamilyAdmissionForm({
        ...form,
        // Only enforce family/guardian rules on this step; children may still be empty-ish.
        children: form.children,
      });
      if (validationError?.code === 'family_missing_fields' || validationError?.code === 'guardians_invalid') {
        return t(validationError.messageKey);
      }
      if (!form.family.academic_year_id) {
        return t('admin.admissions.family.errors.familyMissingFields');
      }
      return null;
    }

    if (step === 'children' || step === 'review') {
      const validationError = validateFamilyAdmissionForm(form);
      if (validationError) {
        if (
          validationError.code === 'child_missing_fields' &&
          validationError.childIndex != null
        ) {
          return t(validationError.messageKey, {
            index: validationError.childIndex + 1,
          });
        }
        return t(validationError.messageKey);
      }
    }

    return null;
  }

  function goNext() {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError(null);
    if (step === 'family') {
      trackFamilyAdmissionStepCompleted(
        analyticsGuards.current,
        'family',
        form.children.length,
      );
      setStep('children');
    } else if (step === 'children') {
      trackFamilyAdmissionStepCompleted(
        analyticsGuards.current,
        'children',
        form.children.length,
      );
      setStep('review');
    }
  }

  function goBack() {
    setError(null);
    if (step === 'children') setStep('family');
    else if (step === 'review') setStep('children');
  }

  async function handleSubmit() {
    if (activeSchoolId == null) return;

    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setError(validationMessage);
      trackFamilyAdmissionSubmitResult('validation_error', form.children.length);
      return;
    }

    trackFamilyAdmissionStepCompleted(
      analyticsGuards.current,
      'review',
      form.children.length,
    );

    setSubmitting(true);
    setError(null);
    setIdempotencyConflict(false);

    const idempotencyKey = idempotencySession.current.ensureKey();
    const payload = buildCreateFamilyBatchPayload(
      form,
      activeSchoolId,
      idempotencyKey,
      allLevels,
    );

    const { response, httpStatus } = await createFamilyBatch(payload, {
      active_school_id: activeSchoolId,
    });

    setSubmitting(false);

    const outcome = normalizeFamilyBatchCreateResponse(response, httpStatus);

    if (outcome.kind === 'success') {
      trackFamilyAdmissionSubmitResult('success', form.children.length);
      setSuccessResult(outcome.data);
      setSuccessReplay(outcome.replay);
      setStep('success');
      return;
    }

    if (outcome.kind === 'idempotency_conflict') {
      trackFamilyAdmissionSubmitResult('conflict', form.children.length);
      setIdempotencyConflict(true);
      setError(t('admin.admissions.family.errors.idempotencyConflict'));
      return;
    }

    if (outcome.kind === 'error' && !response.success) {
      trackFamilyAdmissionSubmitResult(
        mapFamilyAdmissionSubmitResult(outcome),
        form.children.length,
      );
      setError(familyAdmissionApiErrorMessage(response.error, t));
      return;
    }

    trackFamilyAdmissionSubmitResult('server_error', form.children.length);
    setError(t('admin.admissions.family.errors.submitFailed'));
  }

  function handleCreateAnother() {
    resetFamilyAdmissionWizardAnalyticsGuards(analyticsGuards.current);
    idempotencySession.current.reset();
    setForm(emptyFamilyAdmissionFormState(today));
    setSuccessResult(null);
    setSuccessReplay(false);
    setError(null);
    setIdempotencyConflict(false);
    setDefaultsApplied(false);
    setStep('family');
    trackFamilyAdmissionStarted(analyticsGuards.current);
  }

  return (
    <div className="admissions-page family-admission-page student-create-page">
      <nav className="student-360-breadcrumb" aria-label={t('admin.admissions.breadcrumb.aria')}>
        <ol className="student-360-breadcrumb__list">
          <li className="student-360-breadcrumb__item">
            <Link href="/admin/admissions">{t('admin.admissions.breadcrumb.list')}</Link>
          </li>
          <li className="student-360-breadcrumb__item">
            <span aria-current="page">{t('admin.admissions.family.title')}</span>
          </li>
        </ol>
      </nav>

      <Link href="/admin/admissions" className="admissions-create-header__back back-link">
        ‹ {t('common.back')}
      </Link>

      <header className="student-create-page__header admissions-create-page__hero">
        <h1 className="student-create-page__title">{t('admin.admissions.family.title')}</h1>
        <p className="student-create-page__desc">{t('admin.admissions.family.subtitle')}</p>
      </header>

      <FamilyAdmissionSteps activeStep={step} />

      {lookupError ? (
        <div className="alert alert--warning family-admission-alert" role="status">
          {lookupError}
        </div>
      ) : null}

      {error ? (
        <div className="alert alert--error family-admission-alert family-admission-alert--error" role="alert">
          <span className="family-admission-alert__text">{error}</span>
          {idempotencyConflict ? (
            <p className="family-admission-idempotency-hint">
              {t('admin.admissions.family.errors.idempotencyConflictHint')}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 'family' ? (
        <FamilyAdmissionFamilyStep
          family={form.family}
          guardians={form.guardians}
          children={form.children}
          onChangeFamily={patchFamily}
          onChangeGuardians={patchGuardians}
          academicYears={admissionOptions?.academic_years ?? []}
          sources={admissionOptions?.sources ?? []}
          relationships={admissionOptions?.relationships ?? []}
          relationshipLoadFailed={relationshipLoadFailed}
          relationshipsLoading={admissionOptionsState.loading}
        />
      ) : null}

      {step === 'children' ? (
        <FamilyAdmissionChildrenStep
          children={form.children}
          sharedAddress={form.family.shared_address}
          genders={studentOptionsState.options?.genders ?? []}
          nationalities={studentOptionsState.options?.nationalities ?? []}
          allLevels={allLevels}
          allStreams={allStreams}
          cycles={cycles}
          optionsLoading={admissionOptionsState.loading}
          onPatchChild={handlePatchChild}
          onToggleChild={handleToggleChild}
          onRemoveChild={handleRemoveChild}
          onAddChild={handleAddChild}
        />
      ) : null}

      {step === 'review' ? (
        <FamilyAdmissionReviewStep
          form={form}
          levels={allLevels}
          sources={admissionOptions?.sources ?? []}
          academicYears={admissionOptions?.academic_years ?? []}
          onEditFamily={() => setStep('family')}
          onEditChild={handleEditChild}
          onAddChild={() => {
            handleAddChild();
            setStep('children');
          }}
        />
      ) : null}

      {step === 'success' && successResult ? (
        <FamilyAdmissionSuccessStep
          result={successResult}
          replay={successReplay}
          onCreateAnother={handleCreateAnother}
        />
      ) : null}

      {step !== 'success' ? (
        <footer className="family-admission-footer" lang={locale}>
          {step !== 'family' ? (
            <button type="button" className="btn btn--ghost" onClick={goBack} disabled={submitting}>
              {t('common.back')}
            </button>
          ) : (
            <span />
          )}

          {step === 'review' ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSubmit}
              disabled={submitting || activeSchoolId == null}
            >
              {submitting
                ? t('admin.admissions.family.submitting')
                : t('admin.admissions.family.submit')}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={goNext}>
              {t('common.continue')}
            </button>
          )}
        </footer>
      ) : null}
    </div>
  );
}
