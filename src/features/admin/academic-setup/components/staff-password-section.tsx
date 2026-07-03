'use client';

import { useId, useState, type RefObject } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  computeStaffPasswordStrength,
  generateStaffPassword,
  normalizeStaffPasswordPolicy,
  type StaffPasswordFieldErrors,
} from '../utils/staff-password-utils';
import type { StaffPasswordPolicy } from '@/types/academic-setup';

function hasLetter(value: string): boolean {
  return /[A-Za-z\u0600-\u06FF]/.test(value);
}

function hasNumber(value: string): boolean {
  return /\d/.test(value);
}

export function StaffPasswordSection({
  password,
  confirmPassword,
  showPassword,
  assignPasswordNow,
  policy,
  errors,
  disabled = false,
  embedded = false,
  onPasswordChange,
  onConfirmPasswordChange,
  onShowPasswordChange,
  onAssignPasswordNowChange,
  confirmInputRef,
}: {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  assignPasswordNow: boolean;
  policy?: StaffPasswordPolicy | null;
  errors: StaffPasswordFieldErrors;
  disabled?: boolean;
  embedded?: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onShowPasswordChange: (value: boolean) => void;
  onAssignPasswordNowChange: (value: boolean) => void;
  confirmInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const t = useT();
  const formId = useId();
  const passwordId = `${formId}-password`;
  const confirmId = `${formId}-confirm`;
  const [copied, setCopied] = useState(false);
  const normalizedPolicy = normalizeStaffPasswordPolicy(policy);
  const strength = computeStaffPasswordStrength(password, normalizedPolicy);
  const passwordsMatch =
    Boolean(password) && Boolean(confirmPassword) && password === confirmPassword;
  const passwordsMismatch =
    Boolean(confirmPassword) && password !== confirmPassword;

  function handleGenerate() {
    const generated = generateStaffPassword(normalizedPolicy);
    onPasswordChange(generated);
    onConfirmPasswordChange(generated);
    onShowPasswordChange(true);
    setCopied(false);
  }

  async function handleCopyPassword() {
    if (!password || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (embedded) {
    return (
      <div className="staff-password-panel">
        <label className="staff-password-panel__toggle staff-smart-create__checkbox">
          <input
            type="checkbox"
            checked={assignPasswordNow}
            onChange={(event) => onAssignPasswordNowChange(event.target.checked)}
            disabled={disabled}
          />
          <span className="staff-smart-create__checkbox-label">
            {t('admin.academicSetup.staffPassword.assignNow')}
          </span>
        </label>

        {!assignPasswordNow ? (
          <p className="staff-password-panel__defer-note" role="note">
            {t('admin.academicSetup.staffPassword.withoutManualPasswordWarning')}
          </p>
        ) : (
          <>
            <div className="staff-password-panel__toolbar">
              <p className="staff-password-panel__toolbar-hint">
                {t('admin.staffCenter.smartCreate.passwordToolbarHint')}
              </p>
              <div className="staff-password-panel__toolbar-actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleGenerate}
                  disabled={disabled}
                >
                  {t('admin.academicSetup.staffPassword.generatePassword')}
                </button>
                <button
                  type="button"
                  className={`btn btn--ghost btn--sm${copied ? ' is-copied' : ''}`}
                  onClick={() => void handleCopyPassword()}
                  disabled={disabled || !password}
                >
                  {copied
                    ? t('admin.staffCenter.smartCreate.passwordCopied')
                    : t('admin.academicSetup.staffPassword.copyPassword')}
                </button>
              </div>
            </div>

            <div className="staff-password-panel__grid">
              <div
                className={`staff-password-panel__field${errors.password ? ' staff-password-panel__field--invalid' : ''}`}
              >
                <label className="staff-password-panel__label" htmlFor={passwordId}>
                  {t('admin.academicSetup.staffPassword.password')}
                </label>
                <div className="staff-password-panel__input-wrap">
                  <input
                    id={passwordId}
                    className="input staff-password-panel__input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                    dir="ltr"
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    className="staff-password-panel__reveal"
                    onClick={() => onShowPasswordChange(!showPassword)}
                    aria-pressed={showPassword}
                    aria-label={
                      showPassword
                        ? t('admin.academicSetup.staffPassword.hidePassword')
                        : t('admin.academicSetup.staffPassword.showPassword')
                    }
                    disabled={disabled}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-2.09 3.5M6.61 6.61A11.8 11.8 0 0 0 1 12.5C2.73 16.39 7 19.5 12 19.5c1.56 0 3.04-.3 4.39-.84"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M2 12.5C3.73 8.11 8 5 13 5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S3.73 16.89 2 12.5Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="13" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.75" />
                      </svg>
                    )}
                  </button>
                </div>
                {strength !== 'empty' ? (
                  <div
                    className={`staff-password-panel__strength staff-password-panel__strength--${strength}`}
                  >
                    <span className="staff-password-panel__strength-bar" aria-hidden="true" />
                    <span className="staff-password-panel__strength-label">
                      {t(`admin.academicSetup.staffPassword.strength.${strength}`)}
                    </span>
                  </div>
                ) : null}
                {errors.password ? (
                  <span className="staff-password-panel__error" role="alert">
                    {errors.password}
                  </span>
                ) : null}
              </div>

              <div
                className={`staff-password-panel__field${errors.confirmPassword || passwordsMismatch ? ' staff-password-panel__field--invalid' : ''}${passwordsMatch ? ' staff-password-panel__field--valid' : ''}`}
              >
                <label className="staff-password-panel__label" htmlFor={confirmId}>
                  {t('admin.academicSetup.staffPassword.confirmPassword')}
                </label>
                <div className="staff-password-panel__input-wrap">
                  <input
                    ref={confirmInputRef}
                    id={confirmId}
                    className="input staff-password-panel__input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                    aria-invalid={errors.confirmPassword || passwordsMismatch ? true : undefined}
                    dir="ltr"
                    disabled={disabled}
                  />
                </div>
                {confirmPassword ? (
                  <p
                    className={`staff-password-panel__match${passwordsMatch ? ' is-ok' : passwordsMismatch ? ' is-bad' : ''}`}
                    role="status"
                  >
                    {passwordsMatch
                      ? t('admin.staffCenter.smartCreate.passwordsMatch')
                      : passwordsMismatch
                        ? t('admin.staffCenter.smartCreate.passwordsMismatch')
                        : t('admin.staffCenter.smartCreate.passwordsMatchPending')}
                  </p>
                ) : null}
                {errors.confirmPassword ? (
                  <span className="staff-password-panel__error" role="alert">
                    {errors.confirmPassword}
                  </span>
                ) : null}
              </div>
            </div>

            <ul className="staff-password-panel__requirements" aria-label={t('admin.staffCenter.smartCreate.passwordRequirementsLabel')}>
              <li
                className={
                  password.length >= normalizedPolicy.min_length ? 'is-met' : ''
                }
              >
                {t('admin.staffCenter.smartCreate.passwordRequirementMin', {
                  min: normalizedPolicy.min_length,
                })}
              </li>
              {normalizedPolicy.requires_letter ? (
                <li className={hasLetter(password) ? 'is-met' : ''}>
                  {t('admin.staffCenter.smartCreate.passwordRequirementLetter')}
                </li>
              ) : null}
              {normalizedPolicy.requires_number ? (
                <li className={hasNumber(password) ? 'is-met' : ''}>
                  {t('admin.staffCenter.smartCreate.passwordRequirementNumber')}
                </li>
              ) : null}
            </ul>

            <p className="staff-password-panel__privacy" role="note">
              {t('admin.academicSetup.staffPassword.notShownAfterSave')}
            </p>
          </>
        )}
      </div>
    );
  }

  const labelClass = 'tiny muted';
  return (
    <fieldset className="staff-password-section" disabled={disabled}>
      <legend className="staff-password-section__legend">
        {t('admin.academicSetup.staffPassword.sectionTitle')}
      </legend>
      <p className="tiny muted">{t('admin.academicSetup.staffPassword.sectionSubtitle')}</p>

      <label className="row staff-password-section__toggle staff-smart-create__checkbox">
        <input
          type="checkbox"
          checked={assignPasswordNow}
          onChange={(event) => onAssignPasswordNowChange(event.target.checked)}
          disabled={disabled}
        />
        <span className="tiny">{t('admin.academicSetup.staffPassword.assignNow')}</span>
      </label>

      {!assignPasswordNow ? (
        <p className="tiny staff-password-section__warn" role="note">
          {t('admin.academicSetup.staffPassword.withoutManualPasswordWarning')}
        </p>
      ) : (
        <div className="staff-password-section__fields">
          <label className="account-password-fields__label" htmlFor={passwordId}>
            <span className={labelClass}>{t('admin.academicSetup.staffPassword.password')}</span>
            <div className="account-password-fields__input-row">
              <input
                id={passwordId}
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                aria-invalid={errors.password ? true : undefined}
                dir="ltr"
                disabled={disabled}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm account-password-fields__toggle-btn"
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

          <div className="staff-password-section__hints">
            <p className="tiny muted">
              {t('admin.academicSetup.staffPassword.policyHint', {
                min: normalizedPolicy.min_length,
              })}
            </p>
            <p className="tiny staff-password-section__warn" role="note">
              {t('admin.academicSetup.staffPassword.notShownAfterSave')}
            </p>
          </div>

          <div className="account-password-fields__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleGenerate}>
              {t('admin.academicSetup.staffPassword.generatePassword')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void handleCopyPassword()}
              disabled={!password}
            >
              {t('admin.academicSetup.staffPassword.copyPassword')}
            </button>
          </div>

          <label className="account-password-fields__label" htmlFor={confirmId}>
            <span className={labelClass}>{t('admin.academicSetup.staffPassword.confirmPassword')}</span>
            <input
              ref={confirmInputRef}
              id={confirmId}
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              aria-invalid={errors.confirmPassword ? true : undefined}
              dir="ltr"
              disabled={disabled}
            />
            {errors.confirmPassword ? (
              <span className="tiny account-password-fields__error" role="alert">
                {errors.confirmPassword}
              </span>
            ) : null}
          </label>
        </div>
      )}
    </fieldset>
  );
}
