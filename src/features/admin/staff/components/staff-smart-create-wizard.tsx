'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountFieldsSection } from '@/features/admin/account/account-fields-section';
import { StaffPasswordSection } from '@/features/admin/academic-setup/components/staff-password-section';
import { useStaffOptions } from '@/features/admin/academic-setup/hooks/use-staff';
import {
  clearStaffPasswordState,
  normalizeStaffPasswordPolicy,
  validateStaffPasswordForm,
  type StaffPasswordFieldErrors,
} from '@/features/admin/academic-setup/utils/staff-password-utils';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { createStaffFromTemplate } from '@/features/admin/staff/api/staff-templates-api';
import { StaffTemplateAssignmentsFields } from '@/features/admin/staff/components/staff-template-assignments-fields';
import { StaffTemplateBundleEditor } from '@/features/admin/staff/components/staff-template-bundle-editor';
import { StaffTemplatePicker } from '@/features/admin/staff/components/staff-template-picker';
import { StaffTemplatePreviewPanel } from '@/features/admin/staff/components/staff-template-preview-panel';
import {
  useStaffCreationTemplates,
  useStaffTemplatePreview,
} from '@/features/admin/staff/hooks/use-staff-templates';
import {
  assignmentsOptionsAvailable,
  buildStaffTemplateCreatePayload,
  buildStaffTemplatePreviewPayload,
  buildStaffAssignmentClassOptions,
  buildStaffAssignmentLevelOptions,
  buildStaffAssignmentSubjectOptions,
  canSubmitStaffTemplateCreate,
  defaultStaffAssignmentPickerState,
  defaultStaffSmartCreateFormState,
  extractStaffAssignmentCycleOptions,
  filterStaffAssignmentClasses,
  filterStaffAssignmentLevels,
  filterStaffAssignmentSubjects,
  isUserFacingStaffTemplateError,
  resolveInitialSelectedBundleCodes,
  resolveStaffTemplateAccountLogin,
  resolveStaffTemplateForBundleEditor,
  templateAllowsCreate,
  templateRequiresAssignments,
  validateStaffTemplateAssignments,
  validateStaffTemplatePersonForm,
  type StaffTemplatePersonFieldErrors,
} from '@/features/admin/staff/utils/staff-template-utils';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { InfoBanner, PageHeader } from '@/components/ui/primitives';
import { ResourceView } from '@/components/states/resource';
import { useToast } from '@/components/ui/toast';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type {
  StaffAssignmentPickerState,
  StaffCreationTemplate,
  StaffSmartCreateWizardStep,
} from '@/types/staff-templates';
import '@/features/admin/staff/staff-center.css';

const STEP_ORDER: StaffSmartCreateWizardStep[] = ['template', 'details', 'review'];

function stepIndex(step: StaffSmartCreateWizardStep): number {
  return STEP_ORDER.indexOf(step);
}

export function StaffSmartCreateWizard() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();

  const templatesState = useStaffCreationTemplates();
  const {
    preview,
    loading: previewLoading,
    error: previewError,
    loadPreview,
    resetPreview,
  } = useStaffTemplatePreview();
  const staffOptionsState = useStaffOptions();
  const studentOptionsState = useStudentOptions();
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects, { page_size: 500 });
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 500 });
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, { page_size: 200 });

  const [step, setStep] = useState<StaffSmartCreateWizardStep>('template');
  const [form, setForm] = useState(defaultStaffSmartCreateFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [personErrors, setPersonErrors] = useState<StaffTemplatePersonFieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<StaffPasswordFieldErrors>({});
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewedTemplateCode, setPreviewedTemplateCode] = useState<string | null>(null);
  const [assignmentPicker, setAssignmentPicker] = useState<StaffAssignmentPickerState>(
    defaultStaffAssignmentPickerState(),
  );

  const selectedBundleKey = form.selectedBundleCodes.join('|');

  const selectedTemplate = useMemo(
    () => templatesState.templates.find((item) => item.code === form.templateCode) ?? null,
    [templatesState.templates, form.templateCode],
  );

  const bundleEditorTemplate = useMemo(
    () => resolveStaffTemplateForBundleEditor(selectedTemplate, preview),
    [selectedTemplate, preview],
  );

  const passwordPolicy = normalizeStaffPasswordPolicy(staffOptionsState.options?.password_policy);

  const subjects = useMemo(
    () => buildStaffAssignmentSubjectOptions(subjectsState.data ?? []),
    [subjectsState.data],
  );
  const allClasses = useMemo(
    () =>
      buildStaffAssignmentClassOptions(
        classesState.data ?? [],
        studentOptionsState.options?.classes ?? [],
      ),
    [classesState.data, studentOptionsState.options?.classes],
  );
  const allLevels = useMemo(
    () => buildStaffAssignmentLevelOptions(levelsState.data ?? []),
    [levelsState.data],
  );
  const assignmentCycles = useMemo(
    () => extractStaffAssignmentCycleOptions(levelsState.data ?? []),
    [levelsState.data],
  );
  const filteredLevels = useMemo(
    () => filterStaffAssignmentLevels(allLevels, assignmentPicker.cycleCode),
    [allLevels, assignmentPicker.cycleCode],
  );
  const filteredSubjects = useMemo(
    () => filterStaffAssignmentSubjects(subjects, assignmentPicker.levelId),
    [subjects, assignmentPicker.levelId],
  );
  const filteredClasses = useMemo(
    () =>
      filterStaffAssignmentClasses(
        allClasses,
        assignmentPicker.levelId,
        form.assignments.academic_year_id ?? null,
      ),
    [allClasses, assignmentPicker.levelId, form.assignments.academic_year_id],
  );
  const academicYears = studentOptionsState.options?.academicYears ?? [];

  const requiredAssignments = selectedTemplate?.required_assignments ?? [];
  const needsAssignments = templateRequiresAssignments(selectedTemplate);
  const assignmentOptionsUnavailable =
    needsAssignments &&
    !assignmentsOptionsAvailable({
      required: requiredAssignments,
      subjects: filteredSubjects,
      classes: filteredClasses,
      academicYears,
    });

  const assignmentClassKey = form.assignments.class_ids?.join(',') ?? '';

  const refreshPreview = useCallback(() => {
    if (!form.templateCode) return Promise.resolve(undefined);
    return loadPreview(
      buildStaffTemplatePreviewPayload(
        form.templateCode,
        activeSchoolId,
        form.assignments,
        form.selectedBundleCodes,
      ),
    );
  }, [
    activeSchoolId,
    assignmentClassKey,
    form.assignments.academic_year_id,
    form.assignments.subject_id,
    form.templateCode,
    selectedBundleKey,
    loadPreview,
  ]);

  useEffect(() => {
    if (!form.templateCode) return;
    if (step !== 'details' && step !== 'review') return;
    void refreshPreview();
  }, [step, form.templateCode, refreshPreview]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setForm((current) => ({
      ...current,
      createAccount: selectedTemplate.requires_user_account ? true : current.createAccount,
    }));
  }, [selectedTemplate]);

  function handleSelectTemplate(template: StaffCreationTemplate) {
    const initialBundles = resolveInitialSelectedBundleCodes(template);
    setForm((current) => ({
      ...defaultStaffSmartCreateFormState(),
      templateCode: template.code,
      selectedBundleCodes: initialBundles,
      createAccount: template.requires_user_account ? true : current.createAccount,
    }));
    setPersonErrors({});
    setPasswordErrors({});
    setAssignmentsError(null);
    setAssignmentPicker(defaultStaffAssignmentPickerState());
    setPreviewedTemplateCode(null);
    resetPreview();
  }

  function handlePreviewTemplate(template: StaffCreationTemplate) {
    const initialBundles = resolveInitialSelectedBundleCodes(template);
    setPreviewedTemplateCode(template.code);
    void loadPreview(
      buildStaffTemplatePreviewPayload(template.code, activeSchoolId, {}, initialBundles),
    );
  }

  function validateDetailsStep(): boolean {
    const personValidation = validateStaffTemplatePersonForm(form.person, t);
    setPersonErrors(personValidation.errors);

    let passwordValid = true;
    const requiresAccount = selectedTemplate?.requires_user_account || form.createAccount;
    if (requiresAccount && form.createAccount && form.assignPasswordNow) {
      const result = validateStaffPasswordForm(
        {
          password: form.password,
          confirmPassword: form.confirmPassword,
          requirePassword: true,
        },
        passwordPolicy,
        t,
      );
      setPasswordErrors(result.errors);
      passwordValid = result.valid;
    } else {
      setPasswordErrors({});
    }

    const login = resolveStaffTemplateAccountLogin(
      form.person,
      form.login,
      form.useDifferentLogin,
    );
    if (requiresAccount && form.createAccount && !login) {
      setPersonErrors((current) => ({
        ...current,
        login: t('admin.staffCenter.smartCreate.errors.loginRequired'),
      }));
      passwordValid = false;
    }

    const assignmentsValidation = validateStaffTemplateAssignments(
      selectedTemplate,
      form.assignments,
      t,
    );
    setAssignmentsError(assignmentsValidation.error ?? null);

    const valid = personValidation.valid && passwordValid && assignmentsValidation.valid;
    if (!valid) {
      requestAnimationFrame(() => {
        document
          .querySelector(
            '.staff-smart-create__details [aria-invalid="true"], .staff-smart-create__details .account-password-fields__error, .staff-smart-create__assignments .staff-smart-create__section-desc--error',
          )
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    return valid;
  }

  function goNext() {
    if (step === 'template') {
      if (!selectedTemplate) {
        toast.show(t('admin.staffCenter.smartCreate.errors.templateRequired'), 'info');
        return;
      }
      if (!templateAllowsCreate(selectedTemplate)) {
        toast.show(t('admin.staffCenter.smartCreate.errors.templateCreateDisabled'), 'info');
        return;
      }
      setStep('details');
      return;
    }

    if (step === 'details') {
      if (!validateDetailsStep()) return;
      setStep('review');
    }
  }

  function goBack() {
    const index = stepIndex(step);
    if (index <= 0) return;
    const nextStep = STEP_ORDER[index - 1]!;
    if (nextStep === 'template') {
      resetPreview();
    }
    setStep(nextStep);
  }

  async function handleCreate() {
    if (!selectedTemplate || !canSubmitStaffTemplateCreate({
      template: selectedTemplate,
      preview,
      form,
      passwordPolicy,
      t,
    })) {
      return;
    }

    setSaving(true);
    const payload = buildStaffTemplateCreatePayload(form, activeSchoolId, selectedTemplate);
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await createStaffFromTemplate(payload, query);
    setSaving(false);

    if (!res.ok) {
      toast.error(t('admin.staffCenter.smartCreate.createFailed'));
      return;
    }

    clearStaffPasswordState({
      setPassword: (value) => setForm((current) => ({ ...current, password: value })),
      setConfirmPassword: (value) => setForm((current) => ({ ...current, confirmPassword: value })),
      setShowPassword,
    });
    toast.success(t('admin.staffCenter.smartCreate.createSuccess'));

    const userId = res.result.staff?.user_id ?? res.result.user_id;
    if (userId) {
      router.push(`/admin/staff/${userId}`);
      return;
    }

    toast.show(t('admin.staffCenter.smartCreate.redirectDetailsFailed'), 'info');
    router.push('/admin/staff');
  }

  const previewErrorMessage =
    previewError && isUserFacingStaffTemplateError(previewError.message)
      ? previewError.message
      : previewError
        ? t('admin.staffCenter.smartCreate.previewErrorDesc')
        : null;
  const canCreate = canSubmitStaffTemplateCreate({
    template: selectedTemplate,
    preview,
    form,
    passwordPolicy,
    t,
  });
  const previewedBundleCodes = useMemo(() => {
    if (!previewedTemplateCode) return [];
    if (previewedTemplateCode === form.templateCode) return form.selectedBundleCodes;
    const template = templatesState.templates.find((item) => item.code === previewedTemplateCode);
    return template ? resolveInitialSelectedBundleCodes(template) : [];
  }, [form.selectedBundleCodes, form.templateCode, previewedTemplateCode, templatesState.templates]);

  const templatesResource = useMemo(
    () => ({
      loading: templatesState.loading,
      initialLoading: templatesState.loading && templatesState.templates.length === 0,
      fetching: templatesState.loading && templatesState.templates.length > 0,
      data: templatesState.templates,
      meta: {},
      error: templatesState.error,
      reload: templatesState.reload,
    }),
    [templatesState],
  );

  const showBundleEditor = !!bundleEditorTemplate;

  return (
    <div className="admin-workspace staff-center-page staff-smart-create">
      <PageHeader
        title={t('admin.staffCenter.smartCreate.pageTitle')}
        subtitle={t('admin.staffCenter.smartCreate.pageSubtitle')}
        actions={
          <Link href="/admin/staff" className="btn btn--ghost btn--sm">
            {t('admin.staffCenter.backToList')}
          </Link>
        }
      />

      <nav className="staff-smart-create__stepper" aria-label={t('admin.staffCenter.smartCreate.stepperLabel')}>
        {STEP_ORDER.map((item, index) => (
          <span
            key={item}
            className={`staff-smart-create__step${stepIndex(step) >= index ? ' is-active' : ''}${step === item ? ' is-current' : ''}`}
          >
            {t(`admin.staffCenter.smartCreate.steps.${item}`)}
          </span>
        ))}
      </nav>

      <>
          {step === 'template' ? (
            <ResourceView
              state={templatesResource}
              loadingLabel={t('common.loading')}
              isEmpty={(rows) => rows.length === 0}
              empty={
                <InfoBanner
                  tone="amber"
                  icon="⚠"
                  title={t('admin.staffCenter.smartCreate.noTemplatesTitle')}
                  description={t('admin.staffCenter.smartCreate.noTemplatesDesc')}
                />
              }
            >
              {(templates) => (
                <>
                  <StaffTemplatePicker
                    templates={templates}
                    selectedCode={form.templateCode}
                    previewedCode={previewedTemplateCode}
                    preview={preview}
                    previewLoading={previewLoading}
                    previewError={previewErrorMessage}
                    previewBundleCodes={previewedBundleCodes}
                    onSelect={handleSelectTemplate}
                    onPreview={handlePreviewTemplate}
                  />
                </>
              )}
            </ResourceView>
          ) : null}

          {step === 'details' && selectedTemplate ? (
            <div className="staff-smart-create__details">
              <InfoBanner
                tone="blue"
                title={selectedTemplate.name}
                description={
                  selectedTemplate.description || t('admin.staffCenter.smartCreate.selectedTemplateHint')
                }
              />

              <section className="staff-smart-create__section-card">
                <div className="staff-smart-create__section-heading">
                  <h3 className="staff-smart-create__section-title">
                    {t('admin.staffCenter.smartCreate.identitySection')}
                  </h3>
                </div>
                <div className="staff-smart-create__field-grid">
                  <label className="staff-smart-create__field">
                    <span className="staff-smart-create__field-label">{t('admin.fullName')}</span>
                    <input
                      className="input"
                      value={form.person.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          person: { ...current.person, name: event.target.value },
                        }))
                      }
                      aria-invalid={personErrors.name ? true : undefined}
                    />
                    {personErrors.name ? (
                      <span className="tiny account-password-fields__error" role="alert">
                        {personErrors.name}
                      </span>
                    ) : null}
                  </label>
                  <label className="staff-smart-create__field">
                    <span className="staff-smart-create__field-label">{t('admin.phone')}</span>
                    <input
                      className="input"
                      value={form.person.phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          person: { ...current.person, phone: event.target.value },
                        }))
                      }
                      dir="ltr"
                    />
                  </label>
                  <label className="staff-smart-create__field">
                    <span className="staff-smart-create__field-label">{t('admin.email')}</span>
                    <input
                      className="input"
                      type="email"
                      value={form.person.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          person: { ...current.person, email: event.target.value },
                        }))
                      }
                      dir="ltr"
                    />
                  </label>
                </div>
              </section>

              {selectedTemplate.requires_user_account || form.createAccount ? (
                <>
                  <section className="staff-smart-create__section-card">
                    <div className="staff-smart-create__section-heading">
                      <h3 className="staff-smart-create__section-title">
                        {t('admin.staffCenter.smartCreate.accountSection')}
                      </h3>
                    </div>
                    <div className="staff-smart-create__account">
                      {!selectedTemplate.requires_user_account ? (
                        <label className="row staff-smart-create__checkbox staff-smart-create__account-toggle">
                          <input
                            type="checkbox"
                            checked={form.createAccount}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, createAccount: event.target.checked }))
                            }
                          />
                          <span className="staff-smart-create__checkbox-label">
                            {t('admin.staffCenter.smartCreate.createAccount')}
                          </span>
                        </label>
                      ) : null}

                      {form.createAccount ? (
                        <>
                          <AccountFieldsSection
                            mode="create"
                            embedded
                            hideEmail
                            email={form.person.email}
                            login={form.login}
                            useDifferentLogin={form.useDifferentLogin}
                            disabled={saving}
                            onEmailChange={(value) =>
                              setForm((current) => ({
                                ...current,
                                person: { ...current.person, email: value },
                              }))
                            }
                            onLoginChange={(value) =>
                              setForm((current) => ({ ...current, login: value }))
                            }
                            onUseDifferentLoginChange={(value) =>
                              setForm((current) => ({ ...current, useDifferentLogin: value }))
                            }
                          />
                          {personErrors.login ? (
                            <span className="tiny account-password-fields__error" role="alert">
                              {personErrors.login}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </section>

                  {form.createAccount ? (
                    <section className="staff-smart-create__section-card">
                      <div className="staff-smart-create__section-heading">
                        <h3 className="staff-smart-create__section-title">
                          {t('admin.staffCenter.smartCreate.passwordSection')}
                        </h3>
                      </div>
                      <StaffPasswordSection
                        embedded
                        password={form.password}
                        confirmPassword={form.confirmPassword}
                        showPassword={showPassword}
                        assignPasswordNow={form.assignPasswordNow}
                        policy={passwordPolicy}
                        errors={passwordErrors}
                        disabled={saving}
                        onPasswordChange={(value) =>
                          setForm((current) => ({ ...current, password: value }))
                        }
                        onConfirmPasswordChange={(value) =>
                          setForm((current) => ({ ...current, confirmPassword: value }))
                        }
                        onShowPasswordChange={setShowPassword}
                        onAssignPasswordNowChange={(value) =>
                          setForm((current) => ({ ...current, assignPasswordNow: value }))
                        }
                      />
                    </section>
                  ) : null}
                </>
              ) : null}

              {showBundleEditor ? (
                <StaffTemplateBundleEditor
                  template={bundleEditorTemplate!}
                  selectedBundleCodes={form.selectedBundleCodes}
                  disabled={previewLoading || saving}
                  onChange={(selectedBundleCodes) =>
                    setForm((current) => ({ ...current, selectedBundleCodes }))
                  }
                />
              ) : null}

              <StaffTemplateAssignmentsFields
                required={requiredAssignments}
                assignments={form.assignments}
                picker={assignmentPicker}
                cycles={assignmentCycles}
                levels={filteredLevels}
                subjects={filteredSubjects}
                classes={filteredClasses}
                academicYears={academicYears}
                optionsLoading={
                  subjectsState.loading ||
                  classesState.loading ||
                  levelsState.loading ||
                  studentOptionsState.loading
                }
                optionsUnavailable={assignmentOptionsUnavailable}
                onPickerChange={setAssignmentPicker}
                onChange={(assignments) => setForm((current) => ({ ...current, assignments }))}
              />
              {assignmentsError ? (
                <InfoBanner
                  tone="amber"
                  icon="⚠"
                  title={t('admin.staffCenter.smartCreate.assignmentsIncompleteTitle')}
                  description={assignmentsError}
                />
              ) : null}

              {showBundleEditor ? (
                <section className="staff-smart-create__section-card staff-smart-create__section-card--preview">
                  <div className="staff-smart-create__section-heading">
                    <h3 className="staff-smart-create__section-title">
                      {t('admin.staffCenter.smartCreate.previewSummaryTitle')}
                    </h3>
                  </div>
                  <StaffTemplatePreviewPanel
                    preview={preview}
                    loading={previewLoading}
                    error={previewErrorMessage}
                    selectedBundleCodes={form.selectedBundleCodes}
                    assignments={form.assignments}
                  />
                </section>
              ) : null}
            </div>
          ) : null}

          {step === 'review' && selectedTemplate ? (
            <div className="staff-smart-create__review">
              {showBundleEditor ? (
                <StaffTemplateBundleEditor
                  template={bundleEditorTemplate!}
                  selectedBundleCodes={form.selectedBundleCodes}
                  disabled={previewLoading || saving}
                  onChange={(selectedBundleCodes) =>
                    setForm((current) => ({ ...current, selectedBundleCodes }))
                  }
                />
              ) : null}
              <StaffTemplatePreviewPanel
                preview={preview}
                loading={previewLoading}
                error={previewErrorMessage}
                selectedBundleCodes={form.selectedBundleCodes}
                assignments={form.assignments}
              />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void refreshPreview()}>
                {t('admin.staffCenter.smartCreate.refreshPreview')}
              </button>
            </div>
          ) : null}

          <div className="staff-smart-create__footer staff-smart-create__footer--sticky">
            {step !== 'template' ? (
              <button type="button" className="btn btn--ghost" onClick={goBack} disabled={saving}>
                {t('common.back')}
              </button>
            ) : (
              <span />
            )}
            {step !== 'review' ? (
              <button type="button" className="btn btn--primary" onClick={goNext}>
                {t('common.next')}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                disabled={!canCreate || saving || previewLoading}
                onClick={() => void handleCreate()}
              >
                {saving ? t('common.saving') : t('admin.staffCenter.smartCreate.createStaff')}
              </button>
            )}
          </div>
        </>
    </div>
  );
}
