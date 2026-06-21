'use client';

import { useEffect, useId, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import { resetStaffAccountPassword } from '../hooks/use-staff';
import {
  clearStaffPasswordState,
  computeStaffPasswordStrength,
  generateStaffPassword,
  normalizeStaffPasswordPolicy,
  validateStaffPasswordForm,
} from '../utils/staff-password-utils';
import type { StaffPasswordPolicy } from '@/types/academic-setup';

export function StaffResetPasswordDialog({
  open,
  staffId,
  policy,
  onClose,
  onSuccess,
}: {
  open: boolean;
  staffId: number | null;
  policy?: StaffPasswordPolicy | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const formId = useId();
  const normalizedPolicy = normalizeStaffPasswordPolicy(policy);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      clearStaffPasswordState({ setPassword, setConfirmPassword, setShowPassword });
      setFieldErrors({});
    }
  }, [open]);

  if (!open || staffId == null) return null;

  const strength = computeStaffPasswordStrength(password, normalizedPolicy);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateStaffPasswordForm(
      { password, confirmPassword, requirePassword: true },
      normalizedPolicy,
      t,
    );
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    const res = await resetStaffAccountPassword(staffId!, {
      password,
      password_confirm: confirmPassword,
    });
    setSaving(false);

    clearStaffPasswordState({ setPassword, setConfirmPassword, setShowPassword });
    setFieldErrors({});

    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'staff'));
      return;
    }

    toast.success(t('admin.academicSetup.staffPassword.resetSuccess'));
    onSuccess?.();
    onClose();
  }

  function handleGenerate() {
    const generated = generateStaffPassword(normalizedPolicy);
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  }

  async function handleCopy() {
    if (!password || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="academic-setup-drawer-backdrop" role="presentation" onClick={onClose} />
      <div className="staff-reset-password-dialog" role="dialog" aria-modal="true">
        <div className="staff-reset-password-dialog__head">
          <strong>{t('admin.academicSetup.staffPassword.resetTitle')}</strong>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        <form id={formId} className="staff-reset-password-dialog__body col" style={{ gap: 12 }} onSubmit={handleSubmit}>
          <p className="tiny muted">{t('admin.academicSetup.staffPassword.resetSubtitle')}</p>
          <p className="tiny muted">{t('admin.academicSetup.staffPassword.notShownAfterSave')}</p>

          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.staffPassword.password')}</span>
            <div className="account-password-fields__input-row">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword
                  ? t('admin.academicSetup.staffPassword.hidePassword')
                  : t('admin.academicSetup.staffPassword.showPassword')}
              </button>
            </div>
            {fieldErrors.password ? (
              <span className="tiny account-password-fields__error" role="alert">
                {fieldErrors.password}
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

          <div className="account-password-fields__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleGenerate}>
              {t('admin.academicSetup.staffPassword.generatePassword')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopy} disabled={!password}>
              {t('admin.academicSetup.staffPassword.copyPassword')}
            </button>
          </div>

          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.staffPassword.confirmPassword')}</span>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              dir="ltr"
            />
            {fieldErrors.confirmPassword ? (
              <span className="tiny account-password-fields__error" role="alert">
                {fieldErrors.confirmPassword}
              </span>
            ) : null}
          </label>
        </form>
        <div className="staff-reset-password-dialog__footer row" style={{ gap: 8 }}>
          <button type="submit" form={formId} className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : t('admin.academicSetup.staffPassword.resetSubmit')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </>
  );
}
