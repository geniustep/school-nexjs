'use client';

import { useId } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  computeStaffPasswordStrength,
  generateStaffPassword,
  normalizeStaffPasswordPolicy,
  type StaffPasswordFieldErrors,
} from '../utils/staff-password-utils';
import type { StaffPasswordPolicy } from '@/types/academic-setup';

export function StaffPasswordSection({
  password,
  confirmPassword,
  showPassword,
  assignPasswordNow,
  policy,
  errors,
  disabled = false,
  onPasswordChange,
  onConfirmPasswordChange,
  onShowPasswordChange,
  onAssignPasswordNowChange,
}: {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  assignPasswordNow: boolean;
  policy?: StaffPasswordPolicy | null;
  errors: StaffPasswordFieldErrors;
  disabled?: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onShowPasswordChange: (value: boolean) => void;
  onAssignPasswordNowChange: (value: boolean) => void;
}) {
  const t = useT();
  const formId = useId();
  const passwordId = `${formId}-password`;
  const confirmId = `${formId}-confirm`;
  const normalizedPolicy = normalizeStaffPasswordPolicy(policy);
  const strength = computeStaffPasswordStrength(password, normalizedPolicy);

  function handleGenerate() {
    const generated = generateStaffPassword(normalizedPolicy);
    onPasswordChange(generated);
    onConfirmPasswordChange(generated);
    onShowPasswordChange(true);
  }

  async function handleCopyPassword() {
    if (!password || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <fieldset className="staff-password-section" disabled={disabled}>
      <legend className="staff-password-section__legend">
        {t('admin.academicSetup.staffPassword.sectionTitle')}
      </legend>
      <p className="tiny muted">{t('admin.academicSetup.staffPassword.sectionSubtitle')}</p>

      <label className="row staff-password-section__toggle" style={{ gap: 8 }}>
        <input
          type="checkbox"
          checked={assignPasswordNow}
          onChange={(e) => onAssignPasswordNowChange(e.target.checked)}
        />
        <span className="tiny">{t('admin.academicSetup.staffPassword.assignNow')}</span>
      </label>

      {!assignPasswordNow ? (
        <p className="tiny staff-password-section__warn" role="note">
          {t('admin.academicSetup.staffPassword.withoutManualPasswordWarning')}
        </p>
      ) : (
        <>
          <label className="account-password-fields__label" htmlFor={passwordId}>
            <span className="tiny muted">{t('admin.academicSetup.staffPassword.password')}</span>
            <div className="account-password-fields__input-row">
              <input
                id={passwordId}
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                aria-invalid={errors.password ? true : undefined}
                dir="ltr"
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onShowPasswordChange(!showPassword)}
                aria-pressed={showPassword}
              >
                {showPassword
                  ? t('admin.academicSetup.staffPassword.hidePassword')
                  : t('admin.academicSetup.staffPassword.showPassword')}
              </button>
            </div>
            {errors.password ? (
              <span className="tiny account-password-fields__error" role="alert">
                {errors.password}
              </span>
            ) : null}
          </label>

          {strength !== 'empty' ? (
            <div className={`account-password-strength account-password-strength--${strength}`}>
              <span className="account-password-strength__bar" aria-hidden="true" />
              <span className="tiny">
                {t(`admin.academicSetup.staffPassword.strength.${strength}`)}
              </span>
            </div>
          ) : null}

          <p className="tiny muted">
            {t('admin.academicSetup.staffPassword.policyHint', {
              min: normalizedPolicy.min_length,
            })}
          </p>
          <p className="tiny muted">{t('admin.academicSetup.staffPassword.notShownAfterSave')}</p>

          <div className="account-password-fields__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleGenerate}>
              {t('admin.academicSetup.staffPassword.generatePassword')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleCopyPassword}
              disabled={!password}
            >
              {t('admin.academicSetup.staffPassword.copyPassword')}
            </button>
          </div>

          <label className="account-password-fields__label" htmlFor={confirmId}>
            <span className="tiny muted">{t('admin.academicSetup.staffPassword.confirmPassword')}</span>
            <input
              id={confirmId}
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              aria-invalid={errors.confirmPassword ? true : undefined}
              dir="ltr"
            />
            {errors.confirmPassword ? (
              <span className="tiny account-password-fields__error" role="alert">
                {errors.confirmPassword}
              </span>
            ) : null}
          </label>
        </>
      )}
    </fieldset>
  );
}
