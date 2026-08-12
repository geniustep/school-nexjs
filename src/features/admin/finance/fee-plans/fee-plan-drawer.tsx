'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan } from '@/types/finance';
import { formValuesFromFeePlan } from './fee-plan-normalizer';
import { FeePlanLevelScopeSelector } from './fee-plan-level-scope-selector';
import { feePlanErrorMessageKey } from './fee-plan-errors';
import {
  buildFeePlanScopeGroups,
  reconcileLevelIdsWithGroups,
  resolveFeePlanLevelErrorCode,
  feePlanLevelErrorMessageKey,
} from './fee-plan-level-scope';
import {
  buildCreateFeePlanPayload,
  buildUpdateFeePlanPayload,
  validateFeePlanForm,
  type FeePlanValidationError,
} from './fee-plan-payload';
import { FeePlanLinesEditor } from './fee-plan-lines-editor';
import { FeePlanSummaryCard } from './fee-plan-summary-card';
import { createEmptyFeePlanFormValues, type FeePlanDrawerMode, type FeePlanFormValues } from './fee-plan-types';
import '@/features/admin/finance/finance-ui.css';
import './fee-plan-ui.css';

export function FeePlanDrawer({
  open,
  mode,
  planId,
  onClose,
  onSaved,
  onOpenCatalog,
}: {
  open: boolean;
  mode: FeePlanDrawerMode;
  planId?: number | null;
  onClose: () => void;
  onSaved: (planId: number) => void;
  onOpenCatalog?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId, schools, activeAcademicYearId, academicYears } = useAdminSession();
  const activeSchoolName = schools.find((s) => s.id === activeSchoolId)?.name;
  const activeAcademicYearName = academicYears.find((y) => y.id === activeAcademicYearId)?.name;
  const [values, setValues] = useState<FeePlanFormValues>(createEmptyFeePlanFormValues());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FeePlanValidationError | null>(null);

  const planState = useAdminResource<FeePlan>(
    open && mode !== 'create' && planId ? endpoints.admin.financeFeePlan(planId) : null,
  );
  const { feeTypes, loading: typesLoading, reload: reloadFeeTypes } = useFeeTypeOptions();
  const levelOptionsState = useLevelOptions(open, { include_enabled: 'true' });
  const scopeGroups = useMemo(
    () => buildFeePlanScopeGroups(levelOptionsState.options),
    [levelOptionsState.options],
  );

  const plan = planState.data;
  const planStatus = plan ? feePlanState(plan) : 'draft';
  const readOnly = mode === 'view' || (mode === 'edit' && planStatus !== 'draft');
  const hasLevelScope = values.levelIds.length > 0;

  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      setValues({
        ...createEmptyFeePlanFormValues(),
        academicYearId: activeAcademicYearId != null ? String(activeAcademicYearId) : '',
      });
      setFormError(null);
      setFieldErrors(null);
      return;
    }
    if (plan && feeTypes.length) {
      setValues(formValuesFromFeePlan(plan, feeTypes));
    }
  }, [open, mode, plan, feeTypes, activeAcademicYearId]);

  useEffect(() => {
    if (!open || scopeGroups.length === 0) return;
    setValues((prev) => ({
      ...prev,
      levelIds: reconcileLevelIdsWithGroups(prev.levelIds, scopeGroups),
    }));
  }, [open, activeSchoolId, scopeGroups]);

  const title = useMemo(() => {
    if (mode === 'create') return t('admin.finance.feePlansWorkspace.createTitle');
    if (mode === 'edit') return t('admin.finance.feePlansWorkspace.editTitle');
    return t('admin.finance.feePlansWorkspace.viewTitle');
  }, [mode, t]);

  function resolveApiErrorMessage(message: string, code?: string): string {
    const mapped = feePlanErrorMessageKey(code);
    if (mapped) return t(mapped);
    const levelCode = resolveFeePlanLevelErrorCode(code);
    if (levelCode) return t(feePlanLevelErrorMessageKey(levelCode));
    return message;
  }

  async function persist(confirmAfterSave: boolean) {
    if (submitting || readOnly || activeSchoolId == null) return;
    if (confirmAfterSave && !hasLevelScope) {
      setFormError(t('admin.finance.feePlansWorkspace.errors.confirmLevelRequired'));
      return;
    }

    const effectiveValues =
      mode === 'create' && activeAcademicYearId != null
        ? { ...values, academicYearId: String(activeAcademicYearId) }
        : values;
    const validation = validateFeePlanForm(effectiveValues, { requireLevel: true });
    if (validation) {
      setFieldErrors(validation);
      setFormError(t(validation.messageKey));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldErrors(null);

    let savedId = planId ?? null;
    if (mode === 'create') {
      const payload = buildCreateFeePlanPayload(effectiveValues, activeSchoolId, scopeGroups);
      const res = await api.post<FeePlan>(endpoints.admin.financeFeePlans, payload);
      if (!res.success) {
        setSubmitting(false);
        setFormError(resolveApiErrorMessage(res.error.message, res.error.code));
        return;
      }
      savedId = res.data.id;
    } else if (planId) {
      const payload = buildUpdateFeePlanPayload(effectiveValues, scopeGroups);
      const res = await api.put<FeePlan>(endpoints.admin.financeFeePlan(planId), payload);
      if (!res.success) {
        setSubmitting(false);
        setFormError(resolveApiErrorMessage(res.error.message, res.error.code));
        return;
      }
      savedId = res.data.id;
      planState.reload();
    }

    if (confirmAfterSave && savedId) {
      const confirmRes = await api.post(endpoints.admin.financeFeePlanConfirm(savedId));
      if (!confirmRes.success) {
        setSubmitting(false);
        setFormError(resolveApiErrorMessage(confirmRes.error.message, confirmRes.error.code));
        toast.show(t('admin.finance.feePlansWorkspace.savedDraftConfirmFailed'), 'info');
        onSaved(savedId);
        onClose();
        return;
      }
      toast.success(t('admin.finance.feePlansWorkspace.savedAndConfirmed'));
    } else {
      toast.success(t('admin.finance.feePlansWorkspace.savedDraft'));
    }

    setSubmitting(false);
    if (savedId) onSaved(savedId);
    onClose();
  }

  function patchValues(patch: Partial<FeePlanFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  if (!open) return null;

  return (
    <SetupDrawer open={open} title={title} onClose={onClose} size="wide">
      <div className="fee-plan-drawer">
        {mode !== 'create' && planState.loading && !plan ? (
          <p className="muted fee-plan-drawer__loading">{t('common.loading')}</p>
        ) : (
        <form
          className="fee-plan-form"
          onSubmit={(e) => {
            e.preventDefault();
            void persist(false);
          }}
        >
          <div className="fee-plan-form__content">
            <p className="muted fee-plan-drawer__desc">{t('admin.finance.feePlansWorkspace.createDesc')}</p>
            {readOnly && (
              <p className="form-error">{t('admin.finance.feePlansWorkspace.confirmedReadOnly')}</p>
            )}
            {formError && <p className="form-error">{formError}</p>}
            <section className="fee-plan-form__section">
              <h4>{t('admin.finance.feePlansWorkspace.sectionPlanInfo')}</h4>
              <div className="fee-plan-form__grid">
                <label>
                  {t('admin.finance.planName')}
                  <input
                    className="input"
                    required
                    disabled={readOnly}
                    value={values.name}
                    onChange={(e) => patchValues({ name: e.target.value })}
                  />
                  {fieldErrors?.field === 'name' && (
                    <span className="form-error">{t(fieldErrors.messageKey)}</span>
                  )}
                </label>
                <label>
                  {t('admin.finance.feeTypeCode')}
                  <input
                    className="input"
                    required
                    disabled={readOnly}
                    value={values.code}
                    onChange={(e) => patchValues({ code: e.target.value })}
                  />
                  {fieldErrors?.field === 'code' && (
                    <span className="form-error">{t(fieldErrors.messageKey)}</span>
                  )}
                </label>
                <label className="fee-plan-form__full">
                  {t('common.note')}
                  <textarea
                    className="input"
                    rows={2}
                    disabled={readOnly}
                    value={values.notes}
                    onChange={(e) => patchValues({ notes: e.target.value })}
                  />
                </label>
              </div>
            </section>

            <section className="fee-plan-form__section">
              <h4>{t('admin.finance.feePlansWorkspace.sectionScope')}</h4>
              {activeSchoolName && (
                <p className="muted fee-plan-form__school">
                  {t('admin.finance.feePlansWorkspace.activeSchool')}: <strong>{activeSchoolName}</strong>
                </p>
              )}
              {mode === 'create' ? (
                <p className="muted fee-plan-form__school">
                  {t('admin.finance.academicYear')}: <strong>{activeAcademicYearName ?? t('common.dash')}</strong>
                </p>
              ) : null}
              <div className="fee-plan-form__grid">
                <label className="fee-plan-form__full">
                  {t('nav.levels')}
                  <FeePlanLevelScopeSelector
                    groups={scopeGroups}
                    selectedIds={values.levelIds}
                    onChange={(levelIds) => patchValues({ levelIds })}
                    disabled={readOnly}
                    loading={levelOptionsState.loading}
                    error={
                      fieldErrors?.field === 'levelIds' ? t(fieldErrors.messageKey) : null
                    }
                  />
                </label>
              </div>
              {fieldErrors?.field === 'academicYearId' && (
                <p className="form-error">{t(fieldErrors.messageKey)}</p>
              )}
              {scopeGroups.length === 0 && !levelOptionsState.loading && (
                <p className="muted">
                  {t('admin.finance.feePlansWorkspace.noLevelsHint')}{' '}
                  <a href="/admin/settings/academic-setup/levels">{t('nav.levels')}</a>
                </p>
              )}
            </section>

            <section className="fee-plan-form__section">
              <FeePlanLinesEditor
                lines={values.lines}
                feeTypes={feeTypes}
                planLevelIds={values.levelIds}
                scopeGroups={scopeGroups}
                currency={plan?.currency}
                onChange={(lines) => patchValues({ lines })}
                onFeeTypeCreated={() => reloadFeeTypes()}
                error={fieldErrors?.field === 'lines' ? t(fieldErrors.messageKey) : null}
              />
              {typesLoading && <p className="muted">{t('common.loading')}</p>}
              {!typesLoading && feeTypes.length === 0 && (
                <p className="muted">
                  {t('admin.finance.feePlansWorkspace.noFeeTypesHint')}{' '}
                  {onOpenCatalog ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenCatalog}>
                      {t('admin.finance.feePlansWorkspace.manageFeeTypes')}
                    </button>
                  ) : null}
                </p>
              )}
            </section>

            <FeePlanSummaryCard lines={values.lines} currency={plan?.currency} />
          </div>

          {!readOnly && (
            <div className="fee-plan-form__actions row">
              <button type="button" className="btn btn--ghost" disabled={submitting} onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? t('common.saving') : t('admin.finance.feePlansWorkspace.saveDraft')}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting || !hasLevelScope}
                title={
                  !hasLevelScope
                    ? t('admin.finance.feePlansWorkspace.errors.confirmLevelRequired')
                    : undefined
                }
                onClick={() => void persist(true)}
              >
                {submitting ? t('common.saving') : t('admin.finance.feePlansWorkspace.saveAndConfirm')}
              </button>
            </div>
          )}
        </form>
      )}
      </div>
    </SetupDrawer>
  );
}
