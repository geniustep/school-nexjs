'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useAcademicYearOptions, useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan } from '@/types/finance';
import type { Level } from '@/types/class';
import { formValuesFromFeePlan } from './fee-plan-normalizer';
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

export function FeePlanDrawer({
  open,
  mode,
  planId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: FeePlanDrawerMode;
  planId?: number | null;
  onClose: () => void;
  onSaved: (planId: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId, schools } = useAdminSession();
  const activeSchoolName = schools.find((s) => s.id === activeSchoolId)?.name;
  const [values, setValues] = useState<FeePlanFormValues>(createEmptyFeePlanFormValues());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FeePlanValidationError | null>(null);

  const planState = useAdminResource<FeePlan>(
    open && mode !== 'create' && planId ? endpoints.admin.financeFeePlan(planId) : null,
  );
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions();
  const { feeTypes, loading: typesLoading } = useFeeTypeOptions();
  const levelsState = useAdminResource<Level[]>(open ? endpoints.admin.levels : null, {
    page_size: 200,
  });
  const levels = levelsState.data ?? [];
  const plan = planState.data;
  const planStatus = plan ? feePlanState(plan) : 'draft';
  const readOnly = mode === 'view' || (mode === 'edit' && planStatus !== 'draft');

  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      setValues(createEmptyFeePlanFormValues());
      setFormError(null);
      setFieldErrors(null);
      return;
    }
    if (plan && feeTypes.length) {
      setValues(formValuesFromFeePlan(plan, feeTypes));
    }
  }, [open, mode, plan, feeTypes]);

  const title = useMemo(() => {
    if (mode === 'create') return t('admin.finance.feePlansWorkspace.createTitle');
    if (mode === 'edit') return t('admin.finance.feePlansWorkspace.editTitle');
    return t('admin.finance.feePlansWorkspace.viewTitle');
  }, [mode, t]);

  async function persist(confirmAfterSave: boolean) {
    if (submitting || readOnly || activeSchoolId == null) return;
    const validation = validateFeePlanForm(values, { requireLevel: true });
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
      const payload = buildCreateFeePlanPayload(values, activeSchoolId);
      const res = await api.post<FeePlan>(endpoints.admin.financeFeePlans, payload);
      if (!res.success) {
        setSubmitting(false);
        setFormError(res.error.message);
        return;
      }
      savedId = res.data.id;
    } else if (planId) {
      const payload = buildUpdateFeePlanPayload(values);
      const res = await api.put<FeePlan>(endpoints.admin.financeFeePlan(planId), payload);
      if (!res.success) {
        setSubmitting(false);
        setFormError(res.error.message);
        return;
      }
      savedId = res.data.id;
    }

    if (confirmAfterSave && savedId) {
      const confirmRes = await api.post(endpoints.admin.financeFeePlanConfirm(savedId));
      if (!confirmRes.success) {
        setSubmitting(false);
        setFormError(confirmRes.error.message);
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
      <p className="muted fee-plan-drawer__desc">{t('admin.finance.feePlansWorkspace.createDesc')}</p>
      {readOnly && (
        <p className="form-error">{t('admin.finance.feePlansWorkspace.confirmedReadOnly')}</p>
      )}
      {formError && <p className="form-error">{formError}</p>}

      {mode !== 'create' && planState.loading && !plan ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <form
          className="fee-plan-form form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void persist(false);
          }}
        >
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
              <p className="muted">
                {t('admin.finance.feePlansWorkspace.activeSchool')}: <strong>{activeSchoolName}</strong>
              </p>
            )}
            <div className="fee-plan-form__grid">
              <label>
                {t('admin.finance.academicYear')}
                <select
                  className="input"
                  required
                  disabled={readOnly || yearsLoading || mode === 'edit'}
                  value={values.academicYearId}
                  onChange={(e) => patchValues({ academicYearId: e.target.value })}
                >
                  <option value="">
                    {yearsLoading ? t('common.loading') : t('admin.finance.selectAcademicYear')}
                  </option>
                  {yearOptions.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
                {fieldErrors?.field === 'academicYearId' && (
                  <span className="form-error">{t(fieldErrors.messageKey)}</span>
                )}
              </label>
              <label>
                {t('nav.levels')}
                <select
                  className="input"
                  required
                  disabled={readOnly || levelsState.loading}
                  value={values.levelId}
                  onChange={(e) => patchValues({ levelId: e.target.value })}
                >
                  <option value="">
                    {levelsState.loading ? t('common.loading') : t('admin.finance.feePlansWorkspace.selectLevel')}
                  </option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
                {fieldErrors?.field === 'levelId' && (
                  <span className="form-error">{t(fieldErrors.messageKey)}</span>
                )}
              </label>
            </div>
            {yearOptions.length === 0 && !yearsLoading && (
              <p className="muted">{t('admin.finance.academicYearHintFromPlans')}</p>
            )}
            {levels.length === 0 && !levelsState.loading && (
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
              onChange={(lines) => patchValues({ lines })}
              error={fieldErrors?.field === 'lines' ? t(fieldErrors.messageKey) : null}
            />
            {typesLoading && <p className="muted">{t('common.loading')}</p>}
            {!typesLoading && feeTypes.length === 0 && (
              <p className="muted">
                {t('admin.finance.feePlansWorkspace.noFeeTypesHint')}{' '}
                <a href="/admin/finance/fee-types">{t('admin.finance.hubFeeTypes')}</a>
              </p>
            )}
          </section>

          <FeePlanSummaryCard lines={values.lines} currency={plan?.currency} />

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
                disabled={submitting}
                onClick={() => void persist(true)}
              >
                {submitting ? t('common.saving') : t('admin.finance.feePlansWorkspace.saveAndConfirm')}
              </button>
            </div>
          )}
        </form>
      )}
    </SetupDrawer>
  );
}
