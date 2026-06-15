'use client';

import { useId } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  computePasswordStrength,
  generateSecurePassword,
  type AccountPasswordFieldErrors,
} from '@/lib/account/account-password-utils';

export function AccountPasswordFields({
  password,
  confirmPassword,
  showPassword,
  errors,
  onPasswordChange,
  onConfirmPasswordChange,
  onShowPasswordChange,
}: {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  errors: AccountPasswordFieldErrors;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onShowPasswordChange: (value: boolean) => void;
}) {
  const t = useT();
  const formId = useId();
  const passwordId = `${formId}-password`;
  const confirmId = `${formId}-confirm`;
  const strength = computePasswordStrength(password);

  function handleGenerate() {
    const generated = generateSecurePassword();
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
    <div className="account-password-fields">
      <label className="account-password-fields__label" htmlFor={passwordId}>
        <span className="tiny muted">{t('admin.account.password')}</span>
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
            {showPassword ? t('admin.account.hidePassword') : t('admin.account.showPassword')}
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
          <span className="tiny">{t(`admin.account.passwordStrength.${strength}`)}</span>
        </div>
      ) : null}

      <p className="tiny muted">{t('admin.account.passwordRequirements')}</p>

      <div className="account-password-fields__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleGenerate}>
          {t('admin.account.generatePassword')}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={handleCopyPassword}
          disabled={!password}
        >
          {t('admin.account.copyPassword')}
        </button>
      </div>

      <label className="account-password-fields__label" htmlFor={confirmId}>
        <span className="tiny muted">{t('admin.account.confirmPassword')}</span>
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
    </div>
  );
}
